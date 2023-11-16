"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.div = exports.tag = void 0;
function tag(tagName, attributes = {}, ...children) {
    return {
        tagName,
        attributes,
        children,
    };
}
exports.tag = tag;
function div(attributes = {}, ...children) {
    return tag("div", attributes, ...children);
}
exports.div = div;
const test = tag("div", { class: "test" }, "hello world", div({}, "zd", tag("test")));
const hello = test.children;
