import {ChildrenInitializer, ElementTagName} from "./tag_helper";

type EffectCallback = () => (void | (() => void));


export type Signal<T> = { val: T, callDependants: () => void, addDependant: (dep: EffectCallback) => void }

// noinspection JSUnusedLocalSymbols, JSUnusedGlobalSymbols used when overriding, or by browser
export default abstract class ReactiveCustomElement extends HTMLElement{
  private __currentEffectCallback?: EffectCallback;

  effect(callback: EffectCallback){
    this.__currentEffectCallback = callback;
    callback();
    this.__currentEffectCallback = undefined;
  }

  signal<T>(value: T){
    let _value = value;
    const _deps = new Set<EffectCallback>();

    const signal = {} as Signal<T>;
    Object.defineProperty(signal, "val", {
      get: function(this: ReactiveCustomElement){
        if (this.__currentEffectCallback)
          _deps.add(this.__currentEffectCallback);
        return _value
      }.bind(this),
      set: function(this: ReactiveCustomElement, newValue: T){
        _value = newValue;
        _deps.forEach(dep => dep());
      }.bind(this)
    })
    Object.defineProperty(signal, "callDependants", {
      value: function(){ _deps.forEach(dep => dep()); }
    })
    Object.defineProperty(signal, "addDependant", {
      value: function(dep: EffectCallback){ _deps.add(dep); }
    })
    return signal;
  }

  private connectedCallback(){
    this.init();
    const els = this.render();
    els.forEach(el => this.appendChild(el));
    this.postRender(els);
  }

  private disconnectedCallback(){
    this.disconnect()
  }

  abstract render(): Node[];
  disconnect() {}
  init() {}

  postRender(_rendered: Node[]) {};

  createTree<K extends ElementTagName>(desc: ChildrenInitializer<K>, parent?: HTMLElement) : typeof parent extends HTMLElement ? undefined : (Text | HTMLElement)[]
  createTree<K extends ElementTagName>(desc: ChildrenInitializer<K>, parent?: HTMLElement) : undefined | (Text | HTMLElement)[] {
    if(typeof desc === "function") {
      let els: Record<string | number, Text | HTMLElement> = {};
      this.effect(() => {
        const res = desc();
        if(Array.isArray(res)){
          const allKeys = res.map(el => el.key.toString());
          for(const key of Object.keys(els)){
            if(!allKeys.includes(key)) {
              els[key].remove();
              delete els[key];
            }
          }

          for (const el of res) {
            if(!els[el.key]){
              els[el.key] = this.createTree(el)[0];
              parent?.appendChild(els[el.key]);
            }
          }
        } else if(typeof res === "string") {
          if(!els[""]){
            els[""] = document.createTextNode(res);
            parent?.appendChild(els[""]);
          } else {
            els[""].textContent = res;
          }
        } else {
          for (const key of Object.keys(els)) {
            if (key !== res.key) {
              els[key].remove();
              delete els[key];
            }
          }
          if(!els[res.key]){
            els[res.key] = this.createTree(res)[0];
            parent?.appendChild(els[res.key]);
          }
        }
      })
      if(!(parent instanceof HTMLElement)) return Object.values(els);
    }else if(typeof desc === "string"){
      const el = document.createTextNode(desc);
      parent?.appendChild(el);
      if(!(parent instanceof HTMLElement)) return [el];
    }else if(Array.isArray(desc)){
      const els = desc.map(child => this.createTree(child, parent)).flat()
      if(!(parent instanceof HTMLElement)) return els;
    } else {
      const {tag, attrs, children} = desc;
      const el = document.createElement(tag);
      parent?.appendChild(el);

      if(attrs)
        Object.entries(attrs).forEach(([key, value]) => {
          if(key.startsWith("on")){
            const evName = key.replace("on", "").toLowerCase();
            el.addEventListener(evName, value as EventListener);
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