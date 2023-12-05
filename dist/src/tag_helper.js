"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.keyedTag = exports.tag = void 0;
function tag(tag, attrs, ...children) {
    if (attrs && typeof attrs.key == "string") {
        return keyedTag(attrs.key, tag, attrs, ...children);
    }
    else if (!attrs || !attrs.key) {
        return { tag, attrs: attrs ?? {}, children };
    }
    else {
        throw new Error("key must be a string");
    }
}
exports.tag = tag;
function keyedTag(key, tag, attrs = {}, ...children) {
    return { key, tag, attrs, children };
}
exports.keyedTag = keyedTag;
