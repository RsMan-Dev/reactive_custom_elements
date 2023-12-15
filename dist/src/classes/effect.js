"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _a, _Effect_current;
Object.defineProperty(exports, "__esModule", { value: true });
exports.effect = exports.currEffect = void 0;
class Effect {
    static get current() { return __classPrivateFieldGet(this, _a, "f", _Effect_current); }
    static new(cb) {
        const _old = __classPrivateFieldGet(this, _a, "f", _Effect_current);
        __classPrivateFieldSet(this, _a, cb, "f", _Effect_current);
        cb();
        __classPrivateFieldSet(this, _a, _old, "f", _Effect_current);
    }
    constructor() { }
}
_a = Effect;
_Effect_current = { value: void 0 };
function currEffect() { return Effect.current; }
exports.currEffect = currEffect;
function effect(cb) {
    Effect.new(cb);
}
exports.effect = effect;
