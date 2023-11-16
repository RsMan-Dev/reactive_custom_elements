type AllElementTagNameMap = HTMLElementTagNameMap & SVGElementTagNameMap;
type ElementTagName = keyof AllElementTagNameMap | string;
type Initializer<T> = T | (() => T);
type AttributeMap = {
    [key: string]: Initializer<string>;
};
type TagDescriptor<K extends ElementTagName> = {
    tagName: K;
    attributes?: AttributeMap;
    children: ChildrenInitializer<ElementTagName>[];
};
type StringOrTagDescriptor<T extends ElementTagName> = TagDescriptor<T> | string;
type ChildrenInitializer<T extends ElementTagName> = Initializer<StringOrTagDescriptor<T>>;
export declare function tag<K extends ElementTagName, Children extends ChildrenInitializer<ElementTagName>[]>(tagName: K, attributes?: AttributeMap, ...children: [...Children]): {
    tagName: K;
    attributes: AttributeMap;
    children: [...Children];
};
export declare function div<Children extends ChildrenInitializer<ElementTagName>[]>(attributes?: AttributeMap, ...children: [...Children]): {
    tagName: "div";
    attributes: AttributeMap;
    children: ChildrenInitializer<string>[];
};
export {};
