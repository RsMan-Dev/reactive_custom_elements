import {
  tag,
  ChildrenInitializer,
  ElementTagName,
  AttributeMap,
  Initializer,
  ArrayOr,
  TagDescriptor, TagDescriptorWithKey
} from "./tag_helper";
import "./jsx"

type EffectCallback = () => (void | (() => void));


export type Signal<T, P extends Element> = {
  val: T,
  callDependants: () => void,
  addDependant: (dep: EffectCallback) => void,
  forgetDependant: (dep: EffectCallback) => void,
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
  // disposed
  private _d = false;
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
    if(this._cec) {
      node._be ||= []
      node._be.push(this._cec)
    }
  }

  effect(callback: EffectCallback){
    this._cec = callback;
    callback();
    this._cec = undefined;
  }

  #signal<T>(
    _value: Initializer<Signal<T, Element> | T>,
    _depends_on?: Initializer<Signal<any, Element>[]>,
    signal: Signal<T, typeof this> = {} as Signal<T, typeof this>
  ): Signal<T, typeof this> {
    const value = typeof _value === "function" ? (_value as () => T | Signal<T, Element>)() : _value;
    const depends_on = typeof _depends_on === "function" ? (_depends_on as () => Signal<any, Element>[] | undefined)() : _depends_on;
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

      this._scea.push((cb: EffectCallback) => {
        value.forgetDependant(cb);
        _signal.forgetDependant(rcb);
      })

      this._be ||= [];
      this._be.push(cb);

      return _signal;
    }

    const _d = {
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

      this._scea.push((cb: EffectCallback) => {
        for(const dep of depends_on) dep.forgetDependant(cb);
      })

      this._be ||= [];
      this._be.push(cb);
    }

    this._scea.push((cb: EffectCallback) => {
      _d.dependants.delete(cb);
      _d.omittedCallbacks.delete(cb);
    })

    Object.entries({
      val: {
        get: function(this: ReactiveCustomElement){
          if (this._cec) _d.dependants.add(this._cec);
          return _d.value;
        }.bind(this),
        set: function(this: ReactiveCustomElement, newValue: T){
          _d.value = newValue;
          _d.dependants.forEach(dep => {
            if(_d.omittedCallbacks.size == 0 || !_d.omittedCallbacks.has(dep)) dep();
          })
        }.bind(this)
      },
      omitCallback: {value: (dep: EffectCallback) => _d.omittedCallbacks.add(dep)},
      unOmitCallback: {value: (dep: EffectCallback) => _d.omittedCallbacks.delete(dep)},
      callDependants: {value: () => _d.dependants.forEach(dep => {
        if(_d.omittedCallbacks.size == 0 || !_d.omittedCallbacks.has(dep)) dep();
      })},
      addDependant: {value: (dep: EffectCallback) => _d.dependants.add(dep)},
      forgetDependant: {value: (dep: EffectCallback) => {
          _d.dependants.delete(dep);
          _d.omittedCallbacks.delete(dep);
        }},
      parent: {get: function(this: ReactiveCustomElement){return this}.bind(this)}
    }).forEach(([key, value]) => Object.defineProperty(signal, key, value))
    return signal;
  }

  signal<T>(value: Initializer<Signal<T, Element> | T>, depends_on?: Initializer<Signal<any, Element>[]>) : Signal<T, typeof this> {
    const e = (): never => {
      throw new Error("Signal not initialized yet, wait for init() to be called")
    };
    const signal = {
      get val(){return e()},
      set val(_: T) {e()},
      callDependants() {e()},
      addDependant(_: EffectCallback) {e()},
      forgetDependant(_: EffectCallback) {e()},
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
          if (node._be) {
            if(window["rce_verbose" as any]) console.log("forgetting effects registration for: ", node, node._be);
            this.forgetEffectsRegistration(node._be);
          }
    });
    this._mo.observe(this, {childList: true, subtree: true})
  }

  // ts-ignore => this value is used by the browser
  private disconnectedCallback(){
    this._d = true;
    this.forgetEffectsRegistration(this._be || []);
    this._mo.disconnect();
    this._scea.length = 0;
    this.disconnect()
  }

  abstract render(): Node[];
  disconnect() {}
  connect() {}

  postRender(_rendered: Node[]) {};

  createTree<K extends ElementTagName>(desc: ArrayOr<ChildrenInitializer<K>>, parent?: HTMLElement) : typeof parent extends HTMLElement ? undefined : (Text | HTMLElement)[]
  createTree<K extends ElementTagName>(desc: ArrayOr<ChildrenInitializer<K>>, parent?: HTMLElement) : undefined | (Text | HTMLElement)[] {
    if(typeof desc === "function") {
      let els: Record<string | number, Text | HTMLElement> = {};
      const _eff = () => {
        const res = desc();
        if(Array.isArray(res)){
          const resNoFalse =
            res.filter(el => el !== false) as Exclude<TagDescriptorWithKey<string, ChildrenInitializer<string>[]>, false>[]

          for (const el of resNoFalse) {
            if(!el.key) throw new Error("Array of elements into a function must have a key as the number of elements may change");
          }

          const allKeys = resNoFalse.map(el => el.key.toString());
          for(const key of Object.keys(els)){
            if(!allKeys.includes(key)) {
              if(els[key]._be) this.forgetEffectsRegistration(els[key]._be!)
              els[key].remove();
              delete els[key];
            }
          }

          for (const el of resNoFalse) {
            const isBeforeKey: string | undefined = allKeys[allKeys.indexOf(el.key.toString())+1];
            const isAfterKey: string | undefined = allKeys[allKeys.indexOf(el.key.toString())-1];
            if(!els[el.key]){
              els[el.key] = this.createTree(el)[0];
              if(els[el.key]._be) {
                // removes this effect from the element because if the element is removed, the effect is removed too
                // and other childs of the element will not be updated
                els[el.key]._be = els[el.key]._be!.filter(cb => cb != _eff);
              }
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
                if(els[el.key]._be) this.forgetEffectsRegistration(els[el.key]._be!)
                els[el.key].replaceWith(this.createTree(el)[0]);
                if(els[el.key]._be) {
                  // removes this effect from the element because if the element is removed, the effect is removed too
                  // and other childs of the element will not be updated
                  els[el.key]._be = els[el.key]._be!.filter(cb => cb != _eff);
                }
              }
            }
          }
        } else if (res === undefined || res === null || res === false) {
          for (const key of Object.keys(els)) {
            if(els[key]._be) this.forgetEffectsRegistration(els[key]._be!)
            els[key].remove();
            delete els[key];
          }
        } else if (typeof res !== "object") {
          if(!els[""]){
            els[""] = document.createTextNode(res.toString());
            if(els[""]._be) {
              // removes this effect from the element because if the element is removed, the effect is removed too
              // and other childs of the element will not be updated
              els[""]._be = els[""]._be.filter(cb => cb != _eff);
            }
            parent?.appendChild(els[""]);
          } else {
            els[""].textContent = res.toString();
          }
        } else {
          if(!els[""]){
            parent?.appendChild(els[""] = this.createTree(res)[0]);
            if(els[""]._be) {
              // removes this effect from the element because if the element is removed, the effect is removed too
              // and other childs of the element will not be updated
              els[""]._be = els[""]._be.filter(cb => cb != _eff);
            }
          } else {
            // replaces element only if tag names are different
            if(els[""].nodeName !== res.tag.toUpperCase()) {
              if(els[""]._be) this.forgetEffectsRegistration(els[""]._be)
              els[""].replaceWith(this.createTree(res)[0]);
              if(els[""]._be) {
                // removes this effect from the element because if the element is removed, the effect is removed too
                // and other childs of the element will not be updated
                els[""]._be = els[""]._be.filter(cb => cb != _eff);
              }
            }
          }
        }
      }
      this.effect(_eff);
      if(!(parent instanceof HTMLElement)) return Object.values(els);
    }else if(desc === undefined || desc === null || desc === false){
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

      if(attrs)
        Object.entries(attrs).forEach(([key, value]) => {
          if(key.startsWith("on") && typeof value === "function") {
            const evName = key.replace("on", "").toLowerCase();
            el.addEventListener(evName, value.bind(this) as EventListener);
            return;
          }

          if(typeof value === "function") {
            const _attr_eff = () => {
              this.setElAttr(el, key, value(undefined)?.toString())
              el._be ||= [];
              el._be.push(_attr_eff)
            }
            this.effect(_attr_eff)
          } else el.setAttribute(key, value?.toString() || "")
        })

      parent?.appendChild(el);

      children.forEach(child => {
        this.createTree(child, el)
      })

      if(!(parent instanceof HTMLElement)) return [el];
    }
  }

  setElAttr(el: HTMLElement, attr: string, value: string | undefined){
    if(attr == "checked"){
      const is = ![undefined, "false", "0", "null", "undefined", false, 0, null].includes(value);
      if(is) {
        el.setAttribute(attr, "");
        if(attr in el) el[attr] = true;
      } else {
        el.removeAttribute(attr);
        if(attr in el) el[attr] = false;
      }
      return;
    }

    if(value === undefined || value === null) el.removeAttribute(attr);
    else el.setAttribute(attr, value);
  }
}