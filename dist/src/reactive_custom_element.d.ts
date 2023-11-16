type EffectCallback = () => (void | (() => void));
export default class ReactiveCustomElement extends HTMLElement {
    __currentEffectCallback?: EffectCallback;
    effect(callback: EffectCallback): void;
    signal<T>(value: T): {
        val: T;
    };
}
export {};
