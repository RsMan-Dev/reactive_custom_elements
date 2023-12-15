import ReactiveCustomElement, { EffectCallback } from "../reactive_custom_element";
import { Initializer } from "../tag_helper";
export type SignalIdentifier = {
    message: string;
    var_name?: string;
    component?: string;
    fromFile?: string;
    fromLine?: number;
    fromColumn?: number;
};
export default class Signal<T, P extends ReactiveCustomElement> {
    #private;
    spe(): never;
    get val(): T;
    set val(val: T);
    callDeps(): void;
    addDep(dep: EffectCallback): void;
    forgetDep(dep: EffectCallback): void;
    omitDep(dep: EffectCallback): void;
    unOmitDep(dep: EffectCallback): void;
    get parent(): ReactiveCustomElement;
    constructor(init: Initializer<T | Signal<T, ReactiveCustomElement>>, parent: P);
    init(): void;
    initUsingValue(_v: T | Signal<T, ReactiveCustomElement>): void;
    initIdentifier(): void;
}
export declare function signal<T, P extends ReactiveCustomElement>(init: Initializer<T | Signal<T, ReactiveCustomElement>>, parent: P): Signal<T, P>;
