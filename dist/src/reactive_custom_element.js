"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _ReactiveCustomElement_instances, _ReactiveCustomElement_signal;
Object.defineProperty(exports, "__esModule", { value: true });
const tag_helper_1 = require("./tag_helper");
require("./jsx");
// noinspection JSUnusedLocalSymbols, JSUnusedGlobalSymbols used when overriding, or by browser
class ReactiveCustomElement extends HTMLElement {
    constructor() {
        super(...arguments);
        _ReactiveCustomElement_instances.add(this);
        // connected callback called
        this.__ccc = false;
        // signals to init when connected callback is called
        this.__sti = [];
        // signal clear effect callbacks, used to clear an effect from signal effects
        this.__scea = [];
    }
    static tag(tagName, attrs = {}, ...children) { return (0, tag_helper_1.tag)(tagName, attrs, ...children); }
    forgetEffectsRegistration(callbacks) {
        for (const clearEffectCb of this.__scea)
            for (const cb of callbacks)
                clearEffectCb(cb);
    }
    bindEffectIfAny(node) {
        if (this.__cec)
            (node.__be || (node.__be = [])).push(this.__cec);
    }
    effect(callback) {
        this.__cec = callback;
        callback();
        this.__cec = undefined;
    }
    signal(value, depends_on) {
        const e = () => {
            throw new Error("Signal not initialized yet, wait for init() to be called");
        };
        const signal = {
            get val() { return e(); },
            set val(_) { e(); },
            callDependants() { e(); },
            addDependant(_) { e(); },
            omitCallback(_) { e(); },
            unOmitCallback(_) { e(); },
            get parent() { return e(); }
        };
        if (this.__ccc) {
            __classPrivateFieldGet(this, _ReactiveCustomElement_instances, "m", _ReactiveCustomElement_signal).call(this, value, depends_on, signal);
        }
        else {
            this.__sti.push(() => {
                __classPrivateFieldGet(this, _ReactiveCustomElement_instances, "m", _ReactiveCustomElement_signal).call(this, value, depends_on, signal);
            });
        }
        return signal;
    }
    // ts-ignore => this value is used by the browser
    connectedCallback() {
        this.__ccc = true;
        this.__sti.forEach(signal => signal());
        this.connect();
        const els = this.render();
        els.forEach(el => this.appendChild(el));
        this.postRender(els);
        this.__mo = new MutationObserver((muts) => {
            for (const mut of muts)
                for (const node of mut.removedNodes)
                    if (node.__be)
                        this.forgetEffectsRegistration(node.__be);
        });
        this.__mo.observe(this, { childList: true, subtree: true });
    }
    // ts-ignore => this value is used by the browser
    disconnectedCallback() {
        this.disconnect();
    }
    disconnect() { }
    connect() { }
    postRender(_rendered) { }
    ;
    createTree(desc, parent) {
        if (typeof desc === "function") {
            let els = {};
            this.effect(() => {
                const res = desc();
                if (Array.isArray(res)) {
                    for (const el of res) {
                        if (!el.key)
                            throw new Error("Array of elements into a function must have a key as the number of elements may change");
                    }
                    const allKeys = res.map(el => el.key.toString());
                    for (const key of Object.keys(els)) {
                        if (!allKeys.includes(key)) {
                            els[key].remove();
                            delete els[key];
                        }
                    }
                    for (const el of res) {
                        const isBeforeKey = allKeys[allKeys.indexOf(el.key.toString()) + 1];
                        const isAfterKey = allKeys[allKeys.indexOf(el.key.toString()) - 1];
                        if (!els[el.key]) {
                            els[el.key] = this.createTree(el)[0];
                            if (isBeforeKey) {
                                const nextEl = els[isBeforeKey];
                                if (nextEl)
                                    nextEl.before(els[el.key]);
                                else
                                    parent?.appendChild(els[el.key]);
                            }
                            else if (isAfterKey) {
                                const prevEl = els[isAfterKey];
                                if (prevEl)
                                    prevEl.after(els[el.key]);
                                else
                                    parent?.appendChild(els[el.key]);
                            }
                            else
                                parent?.appendChild(els[el.key]);
                        }
                        else {
                            // replaces element only if tag names are different
                            if (els[el.key].nodeName !== el.tag.toUpperCase()) {
                                els[el.key].replaceWith(this.createTree(el)[0]);
                            }
                        }
                    }
                }
                else if (res === undefined || res === null) {
                    for (const key of Object.keys(els)) {
                        els[key].remove();
                        delete els[key];
                    }
                }
                else if (typeof res !== "object") {
                    if (!els[""]) {
                        els[""] = document.createTextNode(res.toString());
                        this.bindEffectIfAny(els[""]);
                        parent?.appendChild(els[""]);
                    }
                    else {
                        els[""].textContent = res.toString();
                    }
                }
                else {
                    if (!els[""]) {
                        parent?.appendChild(els[""] = this.createTree(res)[0]);
                    }
                    else {
                        // replaces element only if tag names are different
                        if (els[""].nodeName !== res.tag.toUpperCase()) {
                            els[""].replaceWith(this.createTree(res)[0]);
                        }
                    }
                }
            });
            if (!(parent instanceof HTMLElement))
                return Object.values(els);
        }
        else if (desc === undefined || desc === null) {
            // do nothing avoid toString() to be called on undefined
        }
        else if (typeof desc !== "object") {
            const el = document.createTextNode(desc.toString());
            this.bindEffectIfAny(el);
            parent?.appendChild(el);
            if (!(parent instanceof HTMLElement))
                return [el];
        }
        else if (Array.isArray(desc)) {
            const els = desc.map(child => this.createTree(child, parent)).flat();
            if (!(parent instanceof HTMLElement))
                return els;
        }
        else {
            const { tag, attrs, children } = desc;
            const el = document.createElement(tag);
            this.bindEffectIfAny(el);
            parent?.appendChild(el);
            if (attrs)
                Object.entries(attrs).forEach(([key, value]) => {
                    if (key.startsWith("on") && typeof value === "function") {
                        const evName = key.replace("on", "").toLowerCase();
                        el.addEventListener(evName, value.bind(this));
                        return;
                    }
                    if (typeof value === "function") {
                        this.effect(() => {
                            el.setAttribute(key, value(null)?.toString() || "");
                        });
                    }
                    else
                        el.setAttribute(key, value?.toString() || "");
                });
            children.forEach(child => {
                this.createTree(child, el);
            });
            if (!(parent instanceof HTMLElement))
                return [el];
        }
    }
}
_ReactiveCustomElement_instances = new WeakSet(), _ReactiveCustomElement_signal = function _ReactiveCustomElement_signal(_value, depends_on, signal = {}) {
    const value = typeof _value === "function" ? _value() : _value;
    // if value is a signal for example, a signal from a parent component
    if (value != null &&
        typeof value == 'object' &&
        'val' in value &&
        'callDependants' in value &&
        'addDependant' in value &&
        'omitCallback' in value &&
        'unOmitCallback' in value) {
        if (!value.parent.contains(this) &&
            value.parent != this)
            throw new Error("Signal parent must contain or be the signal child to avoid memory leaks");
        const _signal = __classPrivateFieldGet(this, _ReactiveCustomElement_instances, "m", _ReactiveCustomElement_signal).call(this, value.val, depends_on?.filter(dep => dep != value), signal);
        const cb = () => {
            _signal.omitCallback(rcb);
            _signal.val = value.val;
            _signal.unOmitCallback(rcb);
        };
        const rcb = () => {
            value.omitCallback(cb);
            value.val = _signal.val;
            value.unOmitCallback(cb);
        };
        value.addDependant(cb);
        _signal.addDependant(rcb);
        this.__be || (this.__be = []);
        this.__be.push(cb);
        return _signal;
    }
    const _data = {
        value: value,
        dependants: new Set(),
        omittedCallbacks: new Set(),
    };
    if (depends_on) {
        if (typeof _value !== "function")
            throw new Error("depends_on can only be used with a function initializer");
        for (const dep of depends_on) {
            if (!dep.parent.contains(this) &&
                dep.parent != this)
                throw new Error("Signal parent must contain or be the signal child to avoid memory leaks");
        }
        const cb = () => { signal.val = _value(); };
        for (const dep of depends_on)
            dep.addDependant(cb);
        this.__be || (this.__be = []);
        this.__be.push(cb);
    }
    this.__scea.push((cb) => {
        _data.dependants.delete(cb);
        _data.omittedCallbacks.delete(cb);
    });
    Object.defineProperty(signal, "val", {
        get: function () {
            if (this.__cec)
                _data.dependants.add(this.__cec);
            return _data.value;
        }.bind(this),
        set: function (newValue) {
            _data.value = newValue;
            _data.dependants.forEach(dep => {
                if (_data.omittedCallbacks.size == 0 || !_data.omittedCallbacks.has(dep))
                    dep();
            });
        }.bind(this)
    });
    Object.defineProperty(signal, "omitCallback", {
        value: function (dep) {
            _data.omittedCallbacks.add(dep);
        }
    });
    Object.defineProperty(signal, "unOmitCallback", {
        value: function (dep) {
            _data.omittedCallbacks.delete(dep);
        }
    });
    Object.defineProperty(signal, "callDependants", {
        value: function () {
            _data.dependants.forEach(dep => {
                if (_data.omittedCallbacks.size == 0 || !_data.omittedCallbacks.has(dep))
                    dep();
            });
        }
    });
    Object.defineProperty(signal, "addDependant", {
        value: function (dep) {
            _data.dependants.add(dep);
        }
    });
    Object.defineProperty(signal, "parent", {
        get: function () {
            return this;
        }.bind(this)
    });
    return signal;
};
exports.default = ReactiveCustomElement;
