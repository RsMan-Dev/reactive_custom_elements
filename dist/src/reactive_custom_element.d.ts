import { ChildrenInitializer, ElementTagName, AttributeMap, Initializer, ArrayOr } from "./tag_helper";
import "./jsx";
type EffectCallback = () => (void | (() => void));
export type Signal<T, P extends Element> = {
    val: T;
    callDependants: () => void;
    addDependant: (dep: EffectCallback) => void;
    omitCallback: (dep: EffectCallback) => void;
    unOmitCallback: (dep: EffectCallback) => void;
    get parent(): P;
};
declare global {
    interface Node {
        _be?: EffectCallback[];
    }
}
export default abstract class ReactiveCustomElement extends HTMLElement {
    #private;
    private _cec?;
    private _ccc;
    private _sti;
    _mo: MutationObserver;
    _scea: ((cb: EffectCallback) => void)[];
    static tag<K extends ElementTagName, Children extends ChildrenInitializer<ElementTagName>[]>(tagName: K, attrs?: AttributeMap, ...children: [...Children]): import("./tag_helper").TagDescriptor<K, ChildrenInitializer<string>[]>;
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
}
export {};
