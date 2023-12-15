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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _Signal_instances, _Signal_d, _Signal_p, _Signal_i, _Signal_dfd, _Signal_initializer, _Signal_debug_get, _Signal_nie;
Object.defineProperty(exports, "__esModule", { value: true });
exports.signal = void 0;
const stacktrace_js_1 = __importDefault(require("stacktrace-js"));
const effect_1 = require("./effect");
class Signal {
    spe() { throw new Error("Signal parent must contain or be the signal child to avoid memory leaks"); }
    get val() {
        if (!__classPrivateFieldGet(this, _Signal_d, "f"))
            __classPrivateFieldGet(this, _Signal_instances, "m", _Signal_nie).call(this);
        if ((0, effect_1.currEffect)())
            this.addDep((0, effect_1.currEffect)());
        return __classPrivateFieldGet(this, _Signal_d, "f").v;
    }
    set val(val) {
        if (!__classPrivateFieldGet(this, _Signal_d, "f"))
            __classPrivateFieldGet(this, _Signal_instances, "m", _Signal_nie).call(this);
        __classPrivateFieldGet(this, _Signal_d, "f").v = val;
        this.callDeps();
    }
    callDeps() {
        if (!__classPrivateFieldGet(this, _Signal_d, "f"))
            __classPrivateFieldGet(this, _Signal_instances, "m", _Signal_nie).call(this);
        __classPrivateFieldGet(this, _Signal_d, "f").d.forEach(d => d());
        if (__classPrivateFieldGet(this, _Signal_instances, "a", _Signal_debug_get))
            console.log(__classPrivateFieldGet(this, _Signal_i, "f").component, "=>", __classPrivateFieldGet(this, _Signal_i, "f").var_name, "[Called deps, total:", __classPrivateFieldGet(this, _Signal_d, "f").d.size, "omitted:", __classPrivateFieldGet(this, _Signal_d, "f").o.size, "] (data:", __classPrivateFieldGet(this, _Signal_d, "f"), ")");
    }
    addDep(dep) {
        if (!__classPrivateFieldGet(this, _Signal_d, "f"))
            __classPrivateFieldGet(this, _Signal_instances, "m", _Signal_nie).call(this);
        __classPrivateFieldGet(this, _Signal_d, "f").d.add(dep);
        if (__classPrivateFieldGet(this, _Signal_instances, "a", _Signal_debug_get))
            console.log(__classPrivateFieldGet(this, _Signal_i, "f").component, "=>", __classPrivateFieldGet(this, _Signal_i, "f").var_name, "[Added dep, total:", __classPrivateFieldGet(this, _Signal_d, "f").d.size, "omitted:", __classPrivateFieldGet(this, _Signal_d, "f").o.size, "] (data:", __classPrivateFieldGet(this, _Signal_d, "f"), ")");
    }
    forgetDep(dep) {
        if (!__classPrivateFieldGet(this, _Signal_d, "f"))
            __classPrivateFieldGet(this, _Signal_instances, "m", _Signal_nie).call(this);
        __classPrivateFieldGet(this, _Signal_d, "f").d.delete(dep);
        __classPrivateFieldGet(this, _Signal_d, "f").o.delete(dep);
        if (__classPrivateFieldGet(this, _Signal_instances, "a", _Signal_debug_get))
            console.log(__classPrivateFieldGet(this, _Signal_i, "f").component, "=>", __classPrivateFieldGet(this, _Signal_i, "f").var_name, "[Forgot dep, total:", __classPrivateFieldGet(this, _Signal_d, "f").d.size, "omitted:", __classPrivateFieldGet(this, _Signal_d, "f").o.size, "] (data:", __classPrivateFieldGet(this, _Signal_d, "f"), ")");
        if (__classPrivateFieldGet(this, _Signal_dfd, "f"))
            __classPrivateFieldGet(this, _Signal_dfd, "f").call(this, dep);
    }
    omitDep(dep) {
        if (!__classPrivateFieldGet(this, _Signal_d, "f"))
            __classPrivateFieldGet(this, _Signal_instances, "m", _Signal_nie).call(this);
        __classPrivateFieldGet(this, _Signal_d, "f").o.add(dep);
        if (__classPrivateFieldGet(this, _Signal_instances, "a", _Signal_debug_get))
            console.log(__classPrivateFieldGet(this, _Signal_i, "f").component, "=>", __classPrivateFieldGet(this, _Signal_i, "f").var_name, "[Omitted dep, total:", __classPrivateFieldGet(this, _Signal_d, "f").d.size, "omitted:", __classPrivateFieldGet(this, _Signal_d, "f").o.size, "] (data:", __classPrivateFieldGet(this, _Signal_d, "f"), ")");
    }
    unOmitDep(dep) {
        if (!__classPrivateFieldGet(this, _Signal_d, "f"))
            __classPrivateFieldGet(this, _Signal_instances, "m", _Signal_nie).call(this);
        __classPrivateFieldGet(this, _Signal_d, "f").o.delete(dep);
        if (__classPrivateFieldGet(this, _Signal_instances, "a", _Signal_debug_get))
            console.log(__classPrivateFieldGet(this, _Signal_i, "f").component, "=>", __classPrivateFieldGet(this, _Signal_i, "f").var_name, "[Unomitted dep, total:", __classPrivateFieldGet(this, _Signal_d, "f").d.size, "omitted:", __classPrivateFieldGet(this, _Signal_d, "f").o.size, "] (data:", __classPrivateFieldGet(this, _Signal_d, "f"), ")");
    }
    get parent() { return __classPrivateFieldGet(this, _Signal_p, "f"); }
    constructor(init, parent) {
        _Signal_instances.add(this);
        // data {value, deps, omitted}
        _Signal_d.set(this, void 0);
        // parent
        _Signal_p.set(this, void 0);
        // identifier
        _Signal_i.set(this, void 0);
        // dependant forget dep
        _Signal_dfd.set(this, void 0);
        _Signal_initializer.set(this, void 0);
        __classPrivateFieldSet(this, _Signal_p, parent, "f");
        __classPrivateFieldSet(this, _Signal_i, { message: "debug is disabled on component, set debug to true to enable it" }, "f");
        this.initIdentifier();
        if (typeof init == "function") {
            __classPrivateFieldSet(this, _Signal_initializer, init, "f");
        }
        else {
            this.initUsingValue(init);
        }
    }
    init() {
        if (__classPrivateFieldGet(this, _Signal_d, "f"))
            return;
        if (!__classPrivateFieldGet(this, _Signal_initializer, "f"))
            throw new Error("Signal cannot be initialized");
        (0, effect_1.effect)(() => {
            const v = __classPrivateFieldGet(this, _Signal_initializer, "f")();
            if (v instanceof Signal)
                this.initUsingValue(v);
            else {
                if (__classPrivateFieldGet(this, _Signal_d, "f"))
                    this.val = v;
                else
                    this.initUsingValue(v);
            }
        });
    }
    initUsingValue(_v) {
        let v;
        if (_v instanceof Signal) {
            if (_v.parent != __classPrivateFieldGet(this, _Signal_p, "f") && !_v.parent.contains(__classPrivateFieldGet(this, _Signal_p, "f")))
                this.spe();
            v = _v.val;
            const cb = () => {
                this.omitDep(rcb);
                this.val = _v.val;
                this.unOmitDep(rcb);
            };
            const rcb = () => {
                _v.omitDep(cb);
                _v.val = this.val;
                _v.unOmitDep(cb);
            };
            _v.addDep(cb);
            this.addDep(rcb);
            __classPrivateFieldSet(this, _Signal_dfd, (cb) => {
                _v.forgetDep(cb);
            }, "f");
        }
        else
            v = _v;
        __classPrivateFieldSet(this, _Signal_d, { v, d: new Set(), o: new Set() }, "f");
    }
    initIdentifier() {
        if (__classPrivateFieldGet(this, _Signal_instances, "a", _Signal_debug_get)) {
            // line 0 is this function, line 1 is the constructor, line 2 is the component's signal(), line 3 is the caller
            const { lineNumber: line, fileName: file, columnNumber: col } = stacktrace_js_1.default.getSync()[3];
            if (!file || !line || !col)
                __classPrivateFieldGet(this, _Signal_i, "f").message = "could not get file or line number";
            else {
                __classPrivateFieldGet(this, _Signal_i, "f").fromFile = file;
                __classPrivateFieldGet(this, _Signal_i, "f").fromLine = line;
                __classPrivateFieldGet(this, _Signal_i, "f").fromColumn = col;
                __classPrivateFieldGet(this, _Signal_i, "f").message = `signal called at ${file}:${line}:${col}`;
                __classPrivateFieldGet(this, _Signal_i, "f").component = __classPrivateFieldGet(this, _Signal_p, "f")?.constructor.name;
                __classPrivateFieldGet(this, _Signal_i, "f").var_name = "fetching var name...";
                fetch(file).then(res => res.text()).then(text => {
                    const lines = text.split("\n");
                    const lineText = lines[line - 1].substring(0, col);
                    let spl = lineText.split("=");
                    if (spl.length >= 2)
                        __classPrivateFieldGet(this, _Signal_i, "f").var_name = /^.*?(?<var>\w+)$/.exec(spl[spl.length - 2].trim())?.groups?.var;
                    else
                        __classPrivateFieldGet(this, _Signal_i, "f").var_name = "could not get var name";
                });
            }
        }
    }
}
_Signal_d = new WeakMap(), _Signal_p = new WeakMap(), _Signal_i = new WeakMap(), _Signal_dfd = new WeakMap(), _Signal_initializer = new WeakMap(), _Signal_instances = new WeakSet(), _Signal_debug_get = function _Signal_debug_get() { return __classPrivateFieldGet(this, _Signal_p, "f")?.debug || window["rce_debug"] || false; }, _Signal_nie = function _Signal_nie() { throw new Error("signal not initialized yet"); };
exports.default = Signal;
function signal(init, parent) {
    return new Signal(init, parent);
}
exports.signal = signal;
