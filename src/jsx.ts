import {
    AllElementTagNameMap,
    ChildrenInitializer,
    ElementTagName,
    KeyedAttributeMap,
    TagDescriptorWithKey
} from "./tag_helper";

declare global{
    namespace JSX{
        type IntrinsicElements = {
            [elemName in keyof AllElementTagNameMap]: KeyedAttributeMap<string | undefined>;
        };
        type Element = TagDescriptorWithKey<ElementTagName, ChildrenInitializer<ElementTagName>[]>
    }
}

export default {};