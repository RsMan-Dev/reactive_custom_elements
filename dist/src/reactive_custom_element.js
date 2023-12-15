"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tag_helper_1 = require("./tag_helper");
require("./jsx");
const effect_1 = require("./classes/effect");
const signal_1 = require("./classes/signal");
// noinspection JSUnusedLocalSymbols, JSUnusedGlobalSymbols used when overriding, or by browser
class ReactiveCustomElement extends HTMLElement {
    constructor() {
        super(...arguments);
        // connected callback called
        this._ccc = false;
        // signals to init when connected callback is called
        this._sti = [];
        // disposed
        this._d = false;
        // signal clear effect callbacks, used to clear an effect from signal effects
        this._scea = [];
        // attribute change callback
        this._acc = {};
        this.debug = false;
    }
    static tag(tagName, attrs = {}, ...children) { return (0, tag_helper_1.tag)(tagName, attrs, ...children); }
    forgetEffectsRegistration(callbacks) {
        for (const clearEffectCb of this._scea)
            for (const cb of callbacks)
                clearEffectCb(cb);
    }
    // bind effect to node if any
    _beia(node) {
        if ((0, effect_1.currEffect)()) {
            node._be || (node._be = []);
            node._be.push((0, effect_1.currEffect)());
        }
    }
    effect(cb) {
        (0, effect_1.effect)(() => {
            this._beia(this);
            cb();
        });
    }
    signal(value) {
        const _signal = (0, signal_1.signal)(value, this);
        this._scea.push(_signal.forgetDep.bind(_signal));
        this._sti.push(_signal.init.bind(_signal));
        return _signal;
    }
    attribute(name, parse, stringify) {
        this.observedAttributes || (this.observedAttributes = []);
        this.observedAttributes.push(name);
        parse || (parse = (value) => value);
        stringify || (stringify = (value) => value.toString());
        const s = this.signal(() => parse(this.getAttribute(name)));
        const _i = () => {
            let justSet = false;
            const cb = () => {
                justSet = true;
                if (s.val === undefined || s.val === null)
                    this.removeAttribute(name);
                else
                    this.setAttribute(name, stringify(s.val));
            };
            s.addDep(cb);
            const ccb = (value) => {
                if (justSet) {
                    justSet = false;
                    return;
                }
                const r = parse(value);
                s.omitDep(cb);
                s.val = r;
                s.unOmitDep(cb);
            };
            this._acc[name] = ccb;
        };
        if (this._ccc) {
            _i();
        }
        else {
            this._sti.push(_i);
        }
        return s;
    }
    //used to map multiple children without loosing data from closure #test version
    map(arr, cb) {
        return () => {
            const tr = [];
            for (let i = 0; i < arr().length; i++) {
                tr.push(cb(() => arr()[i], i));
            }
            return tr;
        };
    }
    // ts-ignore => this value is used by the browser
    connectedCallback() {
        if (this.debug)
            console.warn("Debug is enabled on component", this.constructor.name, "it may slow down the application, and spam the console");
        this._ccc = true;
        this._sti.forEach(signal => signal());
        if (this.debug)
            console.log("signals initialized for", this.constructor.name);
        this.connect();
        const els = this.render();
        if (this.debug)
            console.log("rendered", els.length, "element(s) for", this.constructor.name);
        els.forEach(el => this.appendChild(el));
        this.postRender(els);
        this._mo = new MutationObserver((muts) => {
            for (const mut of muts) {
                switch (mut.type) {
                    case "childList":
                        if (mut.addedNodes.length > 0)
                            for (const node of mut.addedNodes)
                                if (node._be) {
                                    if (this.debug)
                                        console.log("registering effects for: ", node, node._be);
                                    node._be.forEach(cb => cb());
                                }
                        break;
                    case "attributes":
                        if (mut.attributeName && mut.target == this && this.observedAttributes?.includes(mut.attributeName))
                            this._acc[mut.attributeName]?.(this.getAttribute(mut.attributeName));
                        break;
                }
            }
        });
        this._mo.observe(this, { childList: true, subtree: true, attributes: true });
    }
    // ts-ignore => this value is used by the browser
    disconnectedCallback() {
        this._d = true;
        this.forgetEffectsRegistration(this._be || []);
        this._mo.disconnect();
        this._scea.length = 0;
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
                    const resNoFalse = res.filter(el => el !== false);
                    for (const el of resNoFalse) {
                        if (!el.key)
                            throw new Error("Array of elements into a function must have a key as the number of elements may change");
                    }
                    const allKeys = resNoFalse.map(el => el.key.toString());
                    for (const key of Object.keys(els)) {
                        if (!allKeys.includes(key)) {
                            if (els[key]._be)
                                this.forgetEffectsRegistration(els[key]._be);
                            els[key].remove();
                            delete els[key];
                        }
                    }
                    for (const el of resNoFalse) {
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
                else if (res === undefined || res === null || res === false) {
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
            (0, effect_1.effect)(_eff);
            if (!(parent instanceof HTMLElement))
                return Object.values(els);
            else {
                parent._be || (parent._be = []);
                parent._be.push(_eff);
            }
        }
        else if (desc === undefined || desc === null || desc === false) {
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
                            this.setElAttr(el, key, value(undefined)?.toString());
                            el._be || (el._be = []);
                            el._be.push(_attr_eff);
                        };
                        (0, effect_1.effect)(_attr_eff);
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
    setElAttr(el, attr, value) {
        if (attr == "checked") {
            const is = ![undefined, "false", "0", "null", "undefined", false, 0, null].includes(value);
            if (is) {
                el.setAttribute(attr, "");
                if (attr in el)
                    el[attr] = true;
            }
            else {
                el.removeAttribute(attr);
                if (attr in el)
                    el[attr] = false;
            }
            return;
        }
        if (value === undefined || value === null)
            el.removeAttribute(attr);
        else
            el.setAttribute(attr, value);
    }
}
exports.default = ReactiveCustomElement;
