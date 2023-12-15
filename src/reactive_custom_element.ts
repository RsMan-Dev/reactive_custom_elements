import {
  tag,
  ChildrenInitializer,
  ElementTagName,
  AttributeMap,
  Initializer,
  ArrayOr,
  TagDescriptorWithKey
} from "./tag_helper";
import "./jsx"
import { currEffect, effect } from "./classes/effect";
import Signal, {signal, SignalIdentifier} from "./classes/signal";

export type EffectCallback = () => (void | (() => void));

declare global{
  interface Node{
    // bound effects
    _be?: EffectCallback[];
  }
}

// noinspection JSUnusedLocalSymbols, JSUnusedGlobalSymbols used when overriding, or by browser
export default abstract class ReactiveCustomElement extends HTMLElement{
  // observed attributes
  private observedAttributes?: string[];
  // connected callback called
  private _ccc = false;
  // signals to init when connected callback is called
  private _sti: (() => void)[] = [];
  // disposed
  private _d = false;
  // mutation observer to clear effects when node is removed, and track attribute changes
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
    if(currEffect()) {
      node._be ||= []
      node._be.push(currEffect()!)
    }
  }

  effect(cb: EffectCallback){
    effect(() => {
      this._beia(this);
      cb();
    });
  }

  signal<T>(value: Initializer<Signal<T, ReactiveCustomElement> | T>) : Signal<T, typeof this> {
    const _signal = signal(value, this);

    this._scea.push(_signal.forgetDep.bind(_signal));
    this._sti.push(_signal.init.bind(_signal));

    return _signal;
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

  //used to map multiple children without loosing data from closure #test version
  map<T, R>(arr: () => T[], cb: (v: () => T, i: number) => R) : () => R[]{
    return () => {
      const tr: R[] = []
      for(let i = 0; i < arr().length; i++){
        tr.push(cb(() => arr()[i], i))
      }
      return tr
    }
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
      effect(_eff);
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
            effect(_attr_eff)
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