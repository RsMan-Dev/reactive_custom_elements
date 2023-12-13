import { ChildrenInitializer, ElementTagName, AttributeMap, Initializer, ArrayOr, TagDescriptor } from "./tag_helper";
import "./jsx";
type EffectCallback = () => (void | (() => void));
export type Signal<T, P extends Element> = {
    val: T;
    callDependants: () => void;
    addDependant: (dep: EffectCallback) => void;
    forgetDependant: (dep: EffectCallback) => void;
    omitCallback: (dep: EffectCallback) => void;
    unOmitCallback: (dep: EffectCallback) => void;
    get parent(): P;
    identifier: SignalIdentifier;
};
declare global {
    interface Node {
        _be?: EffectCallback[];
    }
}
type SignalIdentifier = {
    message: string;
    var_name?: string;
    component?: string;
    fromFile?: string;
    fromLine?: number;
    fromColumn?: number;
};
export default abstract class ReactiveCustomElement extends HTMLElement {
    #private;
    private _cec?;
    private _ccc;
    private _sti;
    private _d;
    _mo: MutationObserver;
    _scea: ((cb: EffectCallback) => void)[];
    debug: boolean;
    static tag<K extends ElementTagName, Children extends ChildrenInitializer<ElementTagName>[]>(tagName: K, attrs?: AttributeMap, ...children: [...Children]): TagDescriptor<K, ChildrenInitializer<string>[]>;
    forgetEffectsRegistration(callbacks: EffectCallback[]): void;
    _beia(node: Node): void;
    effect(callback: EffectCallback): void;
    signal<T>(value: Initializer<Signal<T, Element> | T>, depends_on?: Initializer<Signal<any, Element>[]>): Signal<T, typeof this>;
    private connectedCallback;
    private disconnectedCallback;
    abstract render(): Node[];
    disconnect(): void;
    connect(): void;
    postRender(_rendered: Node[]): void;
    createTree<K extends ElementTagName>(desc: ArrayOr<ChildrenInitializer<K>>, parent?: HTMLElement): typeof parent extends HTMLElement ? undefined : (Text | HTMLElement)[];
    setElAttr(el: HTMLElement, attr: string, value: string | undefined): void;
}
export {};
