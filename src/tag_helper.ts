export type AllElementTagNameMap = HTMLElementTagNameMap & SVGElementTagNameMap;
export type ElementTagName = keyof AllElementTagNameMap | string;
export type Initializer<T> = T | (() => T);
export type EventAttributeMap = { [evName in keyof HTMLElementEventMap as `on${evName}`]?: (ev: HTMLElementEventMap[evName]) => void }

export type AttributeMap = EventAttributeMap & {
  [attrName: string]: Initializer<string | boolean | number | null | undefined> | ((..._:any) => void)
}

export type ArrayOr<T> = T | T[];
export type TagDescriptorInitializer<T extends ElementTagName> = () => ArrayOr<(TagDescriptor<T> & {key: string | number})> | string;
export type TagDescriptor<K extends ElementTagName> = {
  tag: K,
  attrs?: AttributeMap,
  children: ChildrenInitializer<ElementTagName>[],
}
export type StringOrTagDescriptor<T extends ElementTagName> = TagDescriptor<T> | string;

export type ChildrenInitializer<T extends ElementTagName> =
  TagDescriptorInitializer<T> | ArrayOr<StringOrTagDescriptor<T>>;

export function tag<K extends ElementTagName, Children extends ChildrenInitializer<ElementTagName>[]>
( tag: K, attrs: AttributeMap = {}, ...children: [...Children]) {return { tag, attrs, children };}
export function keyedTag<K extends ElementTagName, Children extends ChildrenInitializer<ElementTagName>[]>
( key: string | number, tag: K, attrs: AttributeMap = {}, ...children: [...Children]) {return { key, tag, attrs, children };}


const test = tag(
    "div",
  {class: "test"},
  "hello world",
    () => [keyedTag("key", "div")]
);
