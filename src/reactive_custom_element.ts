type EffectCallback = () => (void | (() => void));

export default class ReactiveCustomElement extends HTMLElement{
  __currentEffectCallback?: EffectCallback;

  effect(callback: EffectCallback){
    this.__currentEffectCallback = callback;
    callback();
    this.__currentEffectCallback = undefined;
  }

  signal<T>(value: T){
    let _value = value;
    const _parent = this;
    const _dependencies = new Set<EffectCallback>();

    return {
      get val() {
        if(_parent.__currentEffectCallback) _dependencies.add(_parent.__currentEffectCallback);
        return _value;
      },
      set val(val) {
        _value = val;
        for(const dep of _dependencies) dep();
      },
    };
  }
}