export type AllElementTagNameMap = HTMLElementTagNameMap & SVGElementTagNameMap;
export type ElementTagName = keyof AllElementTagNameMap | string;
export type Initializer<T> = T | (() => T);
export type EventAttributeMap = {
    [evName in keyof HTMLElementEventMap as `on${evName}`]?: (ev: HTMLElementEventMap[evName]) => void;
};
export type AttributeMap = EventAttributeMap & {
    [attrName in string]?: Initializer<string | boolean | number | null | undefined> | ((..._: any) => void);
};
export type KeyedAttributeMap<K extends string | undefined> = {
    key?: K;
} & Omit<AttributeMap, "key">;
export type ArrayOr<T> = T | T[];
export type TagDescriptorInitializer<T extends ElementTagName> = () => TagDescriptorWithKey<T, ChildrenInitializer<ElementTagName>[]>[] | TagDescriptor<T, ChildrenInitializer<ElementTagName>[]> | string;
export type TagDescriptor<K extends ElementTagName, Children extends ChildrenInitializer<ElementTagName>[]> = {
    tag: K;
    attrs?: AttributeMap;
    children: Children;
} | false;
export type TagDescriptorWithKey<K extends ElementTagName, Children extends ChildrenInitializer<ElementTagName>[]> = Exclude<TagDescriptor<K, Children>, false> & {
    key: string | number;
} | false;
export type StringOrTagDescriptor<T extends ElementTagName, Children extends ChildrenInitializer<ElementTagName>[]> = TagDescriptor<T, Children> | string;
export type ChildrenInitializer<T extends ElementTagName> = TagDescriptorInitializer<T> | ArrayOr<StringOrTagDescriptor<T, ChildrenInitializer<ElementTagName>[]>>;
export declare function tag<K extends ElementTagName, Children extends ChildrenInitializer<ElementTagName>[], Key extends string | undefined = undefined>(tag: K, attrs?: KeyedAttributeMap<Key> | null, ...children: [...Children]): Key extends string ? TagDescriptorWithKey<K, Children> : TagDescriptor<K, Children>;
export declare function keyedTag<K extends ElementTagName, Children extends ChildrenInitializer<ElementTagName>[], Key extends string | undefined = undefined>(key: Key, tag: K, attrs?: AttributeMap, ...children: [...Children]): {
    key: Key;
    tag: K;
    attrs: AttributeMap;
    children: [...Children];
};
