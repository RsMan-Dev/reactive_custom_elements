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
import StackTrace from "stacktrace-js";

type EffectCallback = () => (void | (() => void));


export type Signal<T, P extends Element> = {
  val: T,
  callDeps: () => void,
  addDep: (dep: EffectCallback) => void,
  forgetDep: (dep: EffectCallback) => void,
  omitDep: (dep: EffectCallback) => void,
  unOmitDep: (dep: EffectCallback) => void,
  get parent(): P,
  identifier: SignalIdentifier
}
declare global{
  interface Node{
    // bound effects
    _be?: EffectCallback[];
  }
}

type SignalIdentifier = {
  message: string,
  var_name?: string,
  component?: string,
  fromFile?: string,
  fromLine?: number,
  fromColumn?: number,
}

// noinspection JSUnusedLocalSymbols, JSUnusedGlobalSymbols used when overriding, or by browser
export default abstract class ReactiveCustomElement extends HTMLElement{
  // observed attributes
  private observedAttributes?: string[];
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
  // attribute change callback
  private _acc: { [key: string]: (newValue: string | null) => void } = {};

  debug = false;

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
    identifier: SignalIdentifier,
    _value: Initializer<Signal<T, Element> | T>,
    _depends_on?: Initializer<Signal<any, Element>[]>,
    signal: Signal<T, typeof this> = {} as Signal<T, typeof this>,
  ): Signal<T, typeof this> {
    const value = typeof _value === "function" ? (_value as () => T | Signal<T, Element>)() : _value;
    const depends_on = typeof _depends_on === "function" ? (_depends_on as () => Signal<any, Element>[] | undefined)() : _depends_on;
    const spe = ():never => {throw new Error("Signal parent must contain or be the signal child to avoid memory leaks")}

    // if value is a signal for example, a signal from a parent component
    if(
      value != null &&
      typeof value == 'object' &&
      'val' in value &&
      'callDeps' in value &&
      'addDep' in value &&
      'omitDep' in value &&
      'unOmitDep' in value
    ) {
      if(!value.parent.contains(this) && value.parent != this) return spe();

      const _signal = this.#signal(
        identifier,
        value.val,
        depends_on?.filter(dep => dep != value),
        signal
      );

      const cb = () => {
        _signal.omitDep(rcb);
        _signal.val = value.val;
        _signal.unOmitDep(rcb);
      }
      const rcb = () => {
        value.omitDep(cb);
        value.val = _signal.val;
        value.unOmitDep(cb);
      }
      value.addDep(cb);
      _signal.addDep(rcb);

      this._scea.push((cb: EffectCallback) => {
        value.forgetDep(cb);
        _signal.forgetDep(rcb);
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

      for(const dep of depends_on) dep.addDep(cb);

      this._scea.push((cb: EffectCallback) => {
        for(const dep of depends_on) dep.forgetDep(cb);
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
          if(_d.value === newValue) return;
          _d.value = newValue;
          if(this.debug) console.log(identifier.component, "=>", identifier.var_name, "- data:", _d.omittedCallbacks.size, _d);
          _d.dependants.forEach(dep => {
            if(_d.omittedCallbacks.size == 0 || !_d.omittedCallbacks.has(dep)) dep();
          })
        }.bind(this)
      },
      omitDep: {value: (dep: EffectCallback) => _d.omittedCallbacks.add(dep)},
      unOmitDep: {value: (dep: EffectCallback) => _d.omittedCallbacks.delete(dep)},
      callDeps: {value: () => {
          if(this.debug) console.log(identifier.component, "=>", identifier.var_name, "- data:", _d.omittedCallbacks.size, _d);
          _d.dependants.forEach(dep => {
            if (_d.omittedCallbacks.size == 0 || !_d.omittedCallbacks.has(dep)) dep();
          })
        }},
      addDep: {value: (dep: EffectCallback) => _d.dependants.add(dep)},
      forgetDep: {value: (dep: EffectCallback) => {
          _d.dependants.delete(dep);
          _d.omittedCallbacks.delete(dep);
        }},
      parent: {get: function(this: ReactiveCustomElement){return this}.bind(this)}
    }).forEach(([key, value]) => Object.defineProperty(signal, key, value))

    if(this.debug) console.log(identifier.message);
    return signal;
  }

  signal<T>(value: Initializer<Signal<T, Element> | T>, depends_on?: Initializer<Signal<any, Element>[]>) : Signal<T, typeof this> {
    // want to get line where signal was called, to easily identify it on debug
    let identifier: SignalIdentifier = {message: "debug is disabled on component, set debug to true to enable it"};
    if(this.debug){
      const {lineNumber: line, fileName: file, columnNumber: col} = StackTrace.getSync()[1];
      if(!file || !line || !col) identifier.message = "could not get file or line number";
      else {
        identifier.fromFile = file;
        identifier.fromLine = line;
        identifier.fromColumn = col;
        identifier.message = `signal called at ${file}:${line}:${col}`;
        identifier.component = this.constructor.name;
        identifier.var_name = "fetching var name..."
        fetch(file).then(res => res.text()).then(text => {
          const lines = text.split("\n");
          const lineText = lines[line - 1].substring(0, col);
          let spl = lineText.split("=");
          if (spl.length >= 2) identifier.var_name = /^.*?(?<var>\w+)$/.exec(spl[spl.length - 2].trim())?.groups?.var;
          else identifier.var_name = "could not get var name"
        })
      }
    }

    const e = (): never => {
      throw new Error("Signal not initialized yet, wait for connect() to be called")
    };
    const signal = {
      get val(){return e()},
      set val(_: T) {e()},
      callDeps() {e()},
      addDep(_: EffectCallback) {e()},
      forgetDep(_: EffectCallback) {e()},
      omitDep(_: EffectCallback) {e()},
      unOmitDep(_: EffectCallback) {e()},
      get parent(){return e()},
      identifier: identifier
    } as Signal<T, typeof this>

    if(this._ccc) {
      this.#signal(identifier, value, depends_on, signal);
    } else {
      this._sti.push(() => {
        this.#signal(identifier, value, depends_on, signal);
      })
    }

    return signal;
  }

  attribute<T extends any = string | undefined | null>(
    name: string,
    parse?: (value?: string | null) => T,
    stringify?: (value: T) => string
  ) {
    this.observedAttributes ||= [];
    this.observedAttributes.push(name);
    parse ||= (value?: string | null) => value as T;
    stringify ||= (value: T) => (value as any).toString();
    const s = this.signal<T>(() => parse!(this.getAttribute(name)))

    const _i = () => {
      let justSet = false;
      const cb = () => {
        justSet = true;
        if(s.val === undefined || s.val === null) this.removeAttribute(name)
        else this.setAttribute(name, stringify!(s.val))
      };
      s.addDep(cb);

      const ccb = (value?: string | null) => {
        if(justSet) {
          justSet = false;
          return;
        }
        const r = parse!(value);
        s.omitDep(cb);
        s.val = r;
        s.unOmitDep(cb);
      }
      this._acc[name] = ccb;
    }
    if(this._ccc) { _i() } else { this._sti.push(_i) }

    return s;
  }

  // ts-ignore => this value is used by the browser
  private connectedCallback(){
    if(this.debug) console.warn("Debug is enabled on component", this.constructor.name, "it may slow down the application, and spam the console");
    this._ccc = true;
    this._sti.forEach(signal => signal());
    if(this.debug) console.log("signals initialized for" , this.constructor.name);
    this.connect();
    const els = this.render();
    if(this.debug) console.log("rendered", els.length, "element(s) for", this.constructor.name);
    els.forEach(el => this.appendChild(el));
    this.postRender(els);

    this._mo = new MutationObserver((muts) => {
      for(const mut of muts) {
        switch (mut.type) {
          case "childList":
            if(mut.addedNodes.length > 0)
              for (const node of mut.addedNodes)
                if (node._be) {
                  if (this.debug) console.log("registering effects for: ", node, node._be);
                  node._be.forEach(cb => cb());
                }
            break;
          case "attributes":
            if(mut.attributeName && mut.target == this && this.observedAttributes?.includes(mut.attributeName))
              this._acc[mut.attributeName]?.(this.getAttribute(mut.attributeName));
            break;
        }
      }
    });
    this._mo.observe(this, {childList: true, subtree: true, attributes: true})
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
      else {
        parent._be ||= [];
        parent._be.push(_eff);
      }
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