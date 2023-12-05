import {tag, ChildrenInitializer, ElementTagName, AttributeMap, Initializer} from "./tag_helper";
import "./jsx"

type EffectCallback = () => (void | (() => void));


export type Signal<T, P extends Element> = {
  val: T,
  callDependants: () => void,
  addDependant: (dep: EffectCallback) => void,
  omitCallback: (dep: EffectCallback) => void,
  unOmitCallback: (dep: EffectCallback) => void,
  get parent(): P
}
declare global{
  interface Node{
    // bound effects
    _be?: EffectCallback[];
  }
}

// noinspection JSUnusedLocalSymbols, JSUnusedGlobalSymbols used when overriding, or by browser
export default abstract class ReactiveCustomElement extends HTMLElement{
  // current effect callback
  private _cec?: EffectCallback;
  // connected callback called
  private _ccc = false;
  // signals to init when connected callback is called
  private _sti: (() => void)[] = [];
  // mutation observer to clear effects when node is removed
  _mo!: MutationObserver;
  // signal clear effect callbacks, used to clear an effect from signal effects
  _scea: ((cb: EffectCallback) => void)[] = [];

  static tag<K extends ElementTagName, Children extends ChildrenInitializer<ElementTagName>[]>
    (tagName: K, attrs: AttributeMap = {}, ...children: [...Children])
  { return tag(tagName, attrs, ...children) }

  forgetEffectsRegistration(callbacks: EffectCallback[]){
    for (const clearEffectCb of this._scea)
      for (const cb of callbacks)
        clearEffectCb(cb);
  }
  
  // bind effect to node if any
  _beia(node: Node){
    if(this._cec)
      (node._be ||= []).push(this._cec)
  }

  effect(callback: EffectCallback){
    this._cec = callback;
    callback();
    this._cec = undefined;
  }

  #signal<T>(
    _value: Initializer<Signal<T, Element> | T>,
    depends_on?: Signal<any, Element>[],
    signal: Signal<T, typeof this> = {} as Signal<T, typeof this>
  ): Signal<T, typeof this> {
    const value = typeof _value === "function" ? (_value as () => T | Signal<T, Element>)() : _value;
    const spe = ():never => {throw new Error("Signal parent must contain or be the signal child to avoid memory leaks")}

    // if value is a signal for example, a signal from a parent component
    if(
      value != null &&
      typeof value == 'object' &&
      'val' in value &&
      'callDependants' in value &&
      'addDependant' in value &&
      'omitCallback' in value &&
      'unOmitCallback' in value
    ) {
      if(!value.parent.contains(this) && value.parent != this) return spe();

      const _signal = this.#signal(
        value.val,
        depends_on?.filter(dep => dep != value),
        signal
      );

      const cb = () => {
        _signal.omitCallback(rcb);
        _signal.val = value.val;
        _signal.unOmitCallback(rcb);
      }
      const rcb = () => {
        value.omitCallback(cb);
        value.val = _signal.val;
        value.unOmitCallback(cb);
      }
      value.addDependant(cb);
      _signal.addDependant(rcb);
      this._be ||= [];
      this._be.push(cb);


      return _signal;
    }

    const _data = {
      value: value,
      dependants: new Set<EffectCallback>(),
      omittedCallbacks: new Set<EffectCallback>(),
    }

    if(depends_on){
      if(typeof _value !== "function") throw new Error("depends_on can only be used with a function initializer")
      for(const dep of depends_on){
        if(!dep.parent.contains(this) && dep.parent != this) return spe();
      }
      const cb = () => {signal.val = (_value as () => T)();}

      for(const dep of depends_on) dep.addDependant(cb);

      this._be ||= [];
      this._be.push(cb);
    }

    this._scea.push((cb: EffectCallback) => {
      _data.dependants.delete(cb);
      _data.omittedCallbacks.delete(cb);
    })

    Object.entries({
      val: {
        get: function(this: ReactiveCustomElement){
          if (this._cec) _data.dependants.add(this._cec);
          return _data.value;
        }.bind(this),
        set: function(this: ReactiveCustomElement, newValue: T){
          _data.value = newValue;
          _data.dependants.forEach(dep => {
            if(_data.omittedCallbacks.size == 0 || !_data.omittedCallbacks.has(dep)) dep();
          })
        }.bind(this)
      },
      omitCallback: {value: (dep: EffectCallback) => _data.omittedCallbacks.add(dep)},
      unOmitCallback: {value: (dep: EffectCallback) => _data.omittedCallbacks.delete(dep)},
      callDependants: {value: () => _data.dependants.forEach(dep => {
        if(_data.omittedCallbacks.size == 0 || !_data.omittedCallbacks.has(dep)) dep();
      })},
      addDependant: {value: (dep: EffectCallback) => _data.dependants.add(dep)},
      parent: {get: function(this: ReactiveCustomElement){return this}.bind(this)}
    }).forEach(([key, value]) => Object.defineProperty(signal, key, value))
    return signal;
  }

  signal<T>(value: Initializer<Signal<T, Element> | T>, depends_on?: Signal<any, Element>[]) {
    const e = (): never => {
      throw new Error("Signal not initialized yet, wait for init() to be called")
    };
    const signal = {
      get val(){return e()},
      set val(_: T) {e()},
      callDependants() {e()},
      addDependant(_: EffectCallback) {e()},
      omitCallback(_: EffectCallback) {e()},
      unOmitCallback(_: EffectCallback) {e()},
      get parent(){return e()}
    } as Signal<T, typeof this>

    if(this._ccc) {
      this.#signal(value, depends_on, signal);
    } else {
      this._sti.push(() => {
        this.#signal(value, depends_on, signal);
      })
    }

    return signal;
  }

  // ts-ignore => this value is used by the browser
  private connectedCallback(){
    this._ccc = true;
    this._sti.forEach(signal => signal());
    this.connect();
    const els = this.render();
    els.forEach(el => this.appendChild(el));
    this.postRender(els);

    this._mo = new MutationObserver((muts) => {
      for(const mut of muts)
        for(const node of mut.removedNodes)
          if (node._be) this.forgetEffectsRegistration(node._be);
    });
    this._mo.observe(this, {childList: true, subtree: true})
  }

  // ts-ignore => this value is used by the browser
  private disconnectedCallback(){
    this.disconnect()
  }

  abstract render(): Node[];
  disconnect() {}
  connect() {}

  postRender(_rendered: Node[]) {};

  createTree<K extends ElementTagName>(desc: ChildrenInitializer<K>, parent?: HTMLElement) : typeof parent extends HTMLElement ? undefined : (Text | HTMLElement)[]
  createTree<K extends ElementTagName>(desc: ChildrenInitializer<K>, parent?: HTMLElement) : undefined | (Text | HTMLElement)[] {
    if(typeof desc === "function") {
      let els: Record<string | number, Text | HTMLElement> = {};
      this.effect(() => {
        const res = desc();
        if(Array.isArray(res)){
          for (const el of res) {
            if(!el.key) throw new Error("Array of elements into a function must have a key as the number of elements may change");
          }

          const allKeys = res.map(el => el.key.toString());
          for(const key of Object.keys(els)){
            if(!allKeys.includes(key)) {
              els[key].remove();
              delete els[key];
            }
          }

          for (const el of res) {
            const isBeforeKey: string | undefined = allKeys[allKeys.indexOf(el.key.toString())+1];
            const isAfterKey: string | undefined = allKeys[allKeys.indexOf(el.key.toString())-1];
            if(!els[el.key]){
              els[el.key] = this.createTree(el)[0];
              if(isBeforeKey){
                const nextEl = els[isBeforeKey];
                if(nextEl) nextEl.before(els[el.key]);
                else parent?.appendChild(els[el.key]);
              } else if(isAfterKey){
                const prevEl = els[isAfterKey];
                if(prevEl) prevEl.after(els[el.key]);
                else parent?.appendChild(els[el.key]);
              } else parent?.appendChild(els[el.key]);
            } else {
              // replaces element only if tag names are different
              if(els[el.key].nodeName !== el.tag.toUpperCase()) {
                els[el.key].replaceWith(this.createTree(el)[0]);
              }
            }
          }
        } else if (res === undefined || res === null) {
          for (const key of Object.keys(els)) {
            els[key].remove();
            delete els[key];
          }
        } else if (typeof res !== "object") {
          if(!els[""]){
            els[""] = document.createTextNode(res.toString());
            this._beia(els[""]);
            parent?.appendChild(els[""]);
          } else {
            els[""].textContent = res.toString();
          }
        } else {
          if(!els[""]){
            parent?.appendChild(els[""] = this.createTree(res)[0]);
          } else {
            // replaces element only if tag names are different
            if(els[""].nodeName !== res.tag.toUpperCase()) {
              els[""].replaceWith(this.createTree(res)[0]);
            }
          }
        }
      })
      if(!(parent instanceof HTMLElement)) return Object.values(els);
    }else if(desc === undefined || desc === null){
      // do nothing avoid toString() to be called on undefined
    }else if(typeof desc !== "object"){
      const el = document.createTextNode(desc.toString());
      this._beia(el);
      parent?.appendChild(el);
      if(!(parent instanceof HTMLElement)) return [el];
    }else if(Array.isArray(desc)){
      const els = desc.map(child => this.createTree(child, parent)).flat()
      if(!(parent instanceof HTMLElement)) return els;
    } else {
      const {tag, attrs, children} = desc;
      const el = document.createElement(tag);
      this._beia(el);
      parent?.appendChild(el);

      if(attrs)
        Object.entries(attrs).forEach(([key, value]) => {
          if(key.startsWith("on") && typeof value === "function") {
            const evName = key.replace("on", "").toLowerCase();
            el.addEventListener(evName, value.bind(this) as EventListener);
            return;
          }

          if(typeof value === "function") {
            this.effect(() => {
              el.setAttribute(key, value(null)?.toString() || "")
            })
          } else el.setAttribute(key, value?.toString() || "")
        })

      children.forEach(child => {
        this.createTree(child, el)
      })

      if(!(parent instanceof HTMLElement)) return [el];
    }
  }
}