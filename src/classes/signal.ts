import ReactiveCustomElement, {EffectCallback} from "../reactive_custom_element";
import StackTrace from "stacktrace-js";
import {Initializer} from "../tag_helper";
import {currEffect, effect} from "./effect";

export type SignalIdentifier = {
  message: string,
  var_name?: string,
  component?: string,
  fromFile?: string,
  fromLine?: number,
  fromColumn?: number,
}

export default class Signal<T, P extends ReactiveCustomElement>{
  // data {value, deps, omitted}
  #d?: {v: T, d: Set<EffectCallback>, o: Set<EffectCallback>}
  // parent
  readonly #p: P;
  // identifier
  #i: SignalIdentifier;
  // dependant forget dep
  #dfd?: (cb: EffectCallback) => void;

  readonly #initializer?: () => T | Signal<T, ReactiveCustomElement>;

  get #debug(): boolean { return this.#p?.debug || (window as any)["rce_debug"] || false; }
  #nie(): never { throw new Error("signal not initialized yet"); }
  spe():never { throw new Error("Signal parent must contain or be the signal child to avoid memory leaks") }

  get val(): T {
    if(!this.#d) this.#nie();
    if(currEffect()) this.addDep(currEffect()!);
    return this.#d.v
  }
  set val(val: T) {
    if(!this.#d) this.#nie();
    this.#d.v = val;
    this.callDeps();
  }

  callDeps(){
    if(!this.#d) this.#nie();
    this.#d.d.forEach(d => d());
    if(this.#debug) console.log(this.#i.component, "=>", this.#i.var_name, "[Called deps, total:", this.#d.d.size, "omitted:", this.#d.o.size, "] (data:", this.#d, ")");
  }
  
  addDep(dep: EffectCallback){
    if(!this.#d) this.#nie();
    this.#d.d.add(dep);
    if(this.#debug) console.log(this.#i.component, "=>", this.#i.var_name, "[Added dep, total:", this.#d.d.size, "omitted:", this.#d.o.size, "] (data:", this.#d, ")");
  }
  
  forgetDep(dep: EffectCallback){
    if(!this.#d) this.#nie();
    this.#d.d.delete(dep);
    this.#d.o.delete(dep);
    if(this.#debug) console.log(this.#i.component, "=>", this.#i.var_name, "[Forgot dep, total:", this.#d.d.size, "omitted:", this.#d.o.size, "] (data:", this.#d, ")");
    if (this.#dfd) this.#dfd(dep);
  }
  
  omitDep(dep: EffectCallback){
    if(!this.#d) this.#nie();
    this.#d.o.add(dep);
    if(this.#debug) console.log(this.#i.component, "=>", this.#i.var_name, "[Omitted dep, total:", this.#d.d.size, "omitted:", this.#d.o.size, "] (data:", this.#d, ")");
  }
  
  unOmitDep(dep: EffectCallback){
    if(!this.#d) this.#nie();
    this.#d.o.delete(dep);
    if(this.#debug) console.log(this.#i.component, "=>", this.#i.var_name, "[Unomitted dep, total:", this.#d.d.size, "omitted:", this.#d.o.size, "] (data:", this.#d, ")");
  }
  
  get parent(): ReactiveCustomElement { return this.#p }
  
  

  constructor(init: Initializer<T | Signal<T, ReactiveCustomElement>>, parent: P){
    this.#p = parent
    this.#i = {message: "debug is disabled on component, set debug to true to enable it"};
    this.initIdentifier();
    if(typeof init == "function") {
      this.#initializer = init as () => T | Signal<T, ReactiveCustomElement>;
    } else {
      this.initUsingValue(init);
    }
  }
  
  init(){
    if(this.#d) return;
    if(!this.#initializer) throw new Error("Signal cannot be initialized");
    effect(() => {
      const v = this.#initializer!();
      if(v instanceof Signal) this.initUsingValue(v);
      else {
        if(this.#d) this.val = v;
        else this.initUsingValue(v);
      }
    });
  }
  
  initUsingValue(_v: T | Signal<T, ReactiveCustomElement>){
    let v: T;
    if(_v instanceof Signal){
      if(_v.parent != this.#p && !_v.parent.contains(this.#p)) this.spe();
      v = _v.val;
      const cb = () => {
        this.omitDep(rcb);
        this.val = _v.val;
        this.unOmitDep(rcb);
      }
      const rcb = () => {
        _v.omitDep(cb);
        _v.val = this.val;
        _v.unOmitDep(cb);
      }

      _v.addDep(cb);
      this.addDep(rcb);

      this.#dfd = (cb) => {
        _v.forgetDep(cb);
      }
    } else v = _v;
    
    this.#d = {v, d: new Set(), o: new Set()};
  }

  initIdentifier(){
    if(this.#debug){
      // line 0 is this function, line 1 is the constructor, line 2 is the component's signal(), line 3 is the caller
      const {lineNumber: line, fileName: file, columnNumber: col} = StackTrace.getSync()[3];
      if(!file || !line || !col)this.#i.message = "could not get file or line number";
      else {
        this.#i.fromFile = file;
        this.#i.fromLine = line;
        this.#i.fromColumn = col;
        this.#i.message = `signal called at ${file}:${line}:${col}`;
        this.#i.component = this.#p?.constructor.name;
        this.#i.var_name = "fetching var name..."
        fetch(file).then(res => res.text()).then(text => {
          const lines = text.split("\n");
          const lineText = lines[line - 1].substring(0, col);
          let spl = lineText.split("=");
          if (spl.length >= 2)this.#i.var_name = /^.*?(?<var>\w+)$/.exec(spl[spl.length - 2].trim())?.groups?.var;
          else this.#i.var_name = "could not get var name"
        })
      }
    }
  }
}

export function signal<T, P extends ReactiveCustomElement>(init: Initializer<T | Signal<T, ReactiveCustomElement>>, parent: P){
  return new Signal<T, P>(init, parent);
}
