import {
    AllElementTagNameMap,
    ChildrenInitializer,
    ElementTagName,
    KeyedAttributeMap,
    TagDescriptor
} from "./tag_helper";

declare global{
    namespace JSX{
        type IntrinsicElements = {
            [elemName in keyof AllElementTagNameMap]: KeyedAttributeMap<string | undefined>;
        };
        type Element = TagDescriptor<ElementTagName, ChildrenInitializer<ElementTagName>[]>
    }
}

export default {};