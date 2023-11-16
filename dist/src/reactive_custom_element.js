"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ReactiveCustomElement extends HTMLElement {
    effect(callback) {
        this.__currentEffectCallback = callback;
        callback();
        this.__currentEffectCallback = undefined;
    }
    signal(value) {
        let _value = value;
        const _parent = this;
        const _dependencies = new Set();
        return {
            get val() {
                if (_parent.__currentEffectCallback)
                    _dependencies.add(_parent.__currentEffectCallback);
                return _value;
            },
            set val(val) {
                _value = val;
                for (const dep of _dependencies)
                    dep();
            },
        };
    }
}
exports.default = ReactiveCustomElement;
