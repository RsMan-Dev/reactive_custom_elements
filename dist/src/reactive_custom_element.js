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
        this._ccc = false;
        // signals to init when connected callback is called
        this._sti = [];
        // signal clear effect callbacks, used to clear an effect from signal effects
        this._scea = [];
    }
    static tag(tagName, attrs = {}, ...children) { return (0, tag_helper_1.tag)(tagName, attrs, ...children); }
    forgetEffectsRegistration(callbacks) {
        for (const clearEffectCb of this._scea)
            for (const cb of callbacks)
                clearEffectCb(cb);
    }
    // bind effect to node if any
    _beia(node) {
        if (this._cec) {
            node._be || (node._be = []);
            node._be.push(this._cec);
        }
    }
    effect(callback) {
        this._cec = callback;
        callback();
        this._cec = undefined;
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
        if (this._ccc) {
            __classPrivateFieldGet(this, _ReactiveCustomElement_instances, "m", _ReactiveCustomElement_signal).call(this, value, depends_on, signal);
        }
        else {
            this._sti.push(() => {
                __classPrivateFieldGet(this, _ReactiveCustomElement_instances, "m", _ReactiveCustomElement_signal).call(this, value, depends_on, signal);
            });
        }
        return signal;
    }
    // ts-ignore => this value is used by the browser
    connectedCallback() {
        this._ccc = true;
        this._sti.forEach(signal => signal());
        this.connect();
        const els = this.render();
        els.forEach(el => this.appendChild(el));
        this.postRender(els);
        this._mo = new MutationObserver((muts) => {
            for (const mut of muts)
                for (const node of mut.removedNodes)
                    if (node._be) {
                        if (window["rce_verbose"])
                            console.log("forgetting effects registration for: ", node, node._be);
                        this.forgetEffectsRegistration(node._be);
                    }
        });
        this._mo.observe(this, { childList: true, subtree: true });
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
            const _eff = () => {
                const res = desc();
                if (Array.isArray(res)) {
                    for (const el of res) {
                        if (!el.key)
                            throw new Error("Array of elements into a function must have a key as the number of elements may change");
                    }
                    const allKeys = res.map(el => el.key.toString());
                    for (const key of Object.keys(els)) {
                        if (!allKeys.includes(key)) {
                            if (els[key]._be)
                                this.forgetEffectsRegistration(els[key]._be);
                            els[key].remove();
                            delete els[key];
                        }
                    }
                    for (const el of res) {
                        const isBeforeKey = allKeys[allKeys.indexOf(el.key.toString()) + 1];
                        const isAfterKey = allKeys[allKeys.indexOf(el.key.toString()) - 1];
                        if (!els[el.key]) {
                            els[el.key] = this.createTree(el)[0];
                            if (els[el.key]._be) {
                                // removes this effect from the element because if the element is removed, the effect is removed too
                                // and other childs of the element will not be updated
                                els[el.key]._be = els[el.key]._be.filter(cb => cb != _eff);
                            }
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
                                if (els[el.key]._be)
                                    this.forgetEffectsRegistration(els[el.key]._be);
                                els[el.key].replaceWith(this.createTree(el)[0]);
                                if (els[el.key]._be) {
                                    // removes this effect from the element because if the element is removed, the effect is removed too
                                    // and other childs of the element will not be updated
                                    els[el.key]._be = els[el.key]._be.filter(cb => cb != _eff);
                                }
                            }
                        }
                    }
                }
                else if (res === undefined || res === null) {
                    for (const key of Object.keys(els)) {
                        if (els[key]._be)
                            this.forgetEffectsRegistration(els[key]._be);
                        els[key].remove();
                        delete els[key];
                    }
                }
                else if (typeof res !== "object") {
                    if (!els[""]) {
                        els[""] = document.createTextNode(res.toString());
                        if (els[""]._be) {
                            // removes this effect from the element because if the element is removed, the effect is removed too
                            // and other childs of the element will not be updated
                            els[""]._be = els[""]._be.filter(cb => cb != _eff);
                        }
                        parent?.appendChild(els[""]);
                    }
                    else {
                        els[""].textContent = res.toString();
                    }
                }
                else {
                    if (!els[""]) {
                        parent?.appendChild(els[""] = this.createTree(res)[0]);
                        if (els[""]._be) {
                            // removes this effect from the element because if the element is removed, the effect is removed too
                            // and other childs of the element will not be updated
                            els[""]._be = els[""]._be.filter(cb => cb != _eff);
                        }
                    }
                    else {
                        // replaces element only if tag names are different
                        if (els[""].nodeName !== res.tag.toUpperCase()) {
                            if (els[""]._be)
                                this.forgetEffectsRegistration(els[""]._be);
                            els[""].replaceWith(this.createTree(res)[0]);
                            if (els[""]._be) {
                                // removes this effect from the element because if the element is removed, the effect is removed too
                                // and other childs of the element will not be updated
                                els[""]._be = els[""]._be.filter(cb => cb != _eff);
                            }
                        }
                    }
                }
            };
            this.effect(_eff);
            if (!(parent instanceof HTMLElement))
                return Object.values(els);
        }
        else if (desc === undefined || desc === null) {
            // do nothing avoid toString() to be called on undefined
        }
        else if (typeof desc !== "object") {
            const el = document.createTextNode(desc.toString());
            this._beia(el);
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
            this._beia(el);
            if (attrs)
                Object.entries(attrs).forEach(([key, value]) => {
                    if (key.startsWith("on") && typeof value === "function") {
                        const evName = key.replace("on", "").toLowerCase();
                        el.addEventListener(evName, value.bind(this));
                        return;
                    }
                    if (typeof value === "function") {
                        const _attr_eff = () => {
                            el.setAttribute(key, value(undefined)?.toString() || "");
                            el._be || (el._be = []);
                            el._be.push(_attr_eff);
                        };
                        this.effect(_attr_eff);
                    }
                    else
                        el.setAttribute(key, value?.toString() || "");
                });
            parent?.appendChild(el);
            children.forEach(child => {
                this.createTree(child, el);
            });
            if (!(parent instanceof HTMLElement))
                return [el];
        }
    }
}
_ReactiveCustomElement_instances = new WeakSet(), _ReactiveCustomElement_signal = function _ReactiveCustomElement_signal(_value, _depends_on, signal = {}) {
    const value = typeof _value === "function" ? _value() : _value;
    const depends_on = typeof _depends_on === "function" ? _depends_on() : _depends_on;
    const spe = () => { throw new Error("Signal parent must contain or be the signal child to avoid memory leaks"); };
    // if value is a signal for example, a signal from a parent component
    if (value != null &&
        typeof value == 'object' &&
        'val' in value &&
        'callDependants' in value &&
        'addDependant' in value &&
        'omitCallback' in value &&
        'unOmitCallback' in value) {
        if (!value.parent.contains(this) && value.parent != this)
            return spe();
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
        this._be || (this._be = []);
        this._be.push(cb);
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
            if (!dep.parent.contains(this) && dep.parent != this)
                return spe();
        }
        const cb = () => { signal.val = _value(); };
        for (const dep of depends_on)
            dep.addDependant(cb);
        this._be || (this._be = []);
        this._be.push(cb);
    }
    this._scea.push((cb) => {
        _data.dependants.delete(cb);
        _data.omittedCallbacks.delete(cb);
    });
    Object.entries({
        val: {
            get: function () {
                if (this._cec)
                    _data.dependants.add(this._cec);
                return _data.value;
            }.bind(this),
            set: function (newValue) {
                _data.value = newValue;
                _data.dependants.forEach(dep => {
                    if (_data.omittedCallbacks.size == 0 || !_data.omittedCallbacks.has(dep))
                        dep();
                });
            }.bind(this)
        },
        omitCallback: { value: (dep) => _data.omittedCallbacks.add(dep) },
        unOmitCallback: { value: (dep) => _data.omittedCallbacks.delete(dep) },
        callDependants: { value: () => _data.dependants.forEach(dep => {
                if (_data.omittedCallbacks.size == 0 || !_data.omittedCallbacks.has(dep))
                    dep();
            }) },
        addDependant: { value: (dep) => _data.dependants.add(dep) },
        parent: { get: function () { return this; }.bind(this) }
    }).forEach(([key, value]) => Object.defineProperty(signal, key, value));
    return signal;
};
exports.default = ReactiveCustomElement;
