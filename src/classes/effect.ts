import {EffectCallback} from "../reactive_custom_element";

class Effect{
  static #current?: EffectCallback;

  static get current(): EffectCallback | undefined { return this.#current; }

  static new(cb: EffectCallback){
    const _old = this.#current;
    this.#current = cb;
    cb();
    this.#current = _old;
  }
  private constructor() {}
}
export function currEffect(): EffectCallback | undefined { return Effect.current; }
export function effect(cb: EffectCallback){
  Effect.new(cb);
}