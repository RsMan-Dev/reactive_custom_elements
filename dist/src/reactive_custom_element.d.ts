import { ChildrenInitializer, ElementTagName, AttributeMap, Initializer, ArrayOr } from "./tag_helper";
import "./jsx";
import Signal from "./classes/signal";
export type EffectCallback = () => (void | (() => void));
declare global {
    interface Node {
        _be?: EffectCallback[];
    }
}
export default abstract class ReactiveCustomElement extends HTMLElement {
    private observedAttributes?;
    private _ccc;
    private _sti;
    private _d;
    _mo: MutationObserver;
    _scea: ((cb: EffectCallback) => void)[];
    private _acc;
    debug: boolean;
    static tag<K extends ElementTagName, Children extends ChildrenInitializer<ElementTagName>[]>(tagName: K, attrs?: AttributeMap, ...children: [...Children]): import("./tag_helper").TagDescriptor<K, ChildrenInitializer<string>[]>;
    forgetEffectsRegistration(callbacks: EffectCallback[]): void;
    _beia(node: Node): void;
    effect(cb: EffectCallback): void;
    signal<T>(value: Initializer<Signal<T, ReactiveCustomElement> | T>): Signal<T, typeof this>;
    attribute<T extends any = string | undefined | null>(name: string, parse?: (value?: string | null) => T, stringify?: (value: T) => string): Signal<T, this>;
    map<T, R>(arr: () => T[], cb: (v: () => T, i: number) => R): () => R[];
    private connectedCallback;
    private disconnectedCallback;
    abstract render(): Node[];
    disconnect(): void;
    connect(): void;
    postRender(_rendered: Node[]): void;
    createTree<K extends ElementTagName>(desc: ArrayOr<ChildrenInitializer<K>>, parent?: HTMLElement): typeof parent extends HTMLElement ? undefined : (Text | HTMLElement)[];
    setElAttr(el: HTMLElement, attr: string, value: string | undefined): void;
}
