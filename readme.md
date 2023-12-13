# Reactive Custom Elements

This library aims to provide a simple way to create reactive custom HTML elements to your HTML/js projects.

All project is made in typescript, but can be used in javascript projects.

It uses signals to handle updates exactly when and where they are needed.

It dont use shadow dom, that make the library pretty simple, and fast.

Lightweight, about 8.55kb, 2.25kb gzipped, 1.94kb brotli compressed actually.

## Installation
Note: This library is not yet published to npm. This is just a placeholder for now.
To use it in your project, you can install it from github:

```bash
npm install https://github.com/RsMan-Dev/reactive_custom_elements
```

```bash
npm install reactive-custom-elements
```

## Usage
### Definition
To get started, you need to import the library and extend the `ReactiveCustomElement` class.
And register your element with `customElements.define()`.

```js
import ReactiveCustomElement from 'reactive_custom_elements';

class MyElement extends ReactiveCustomElement {
}
customElements.define('my-element', MyElement);
```

### Lifecycle
The `ReactiveCustomElement` class provides the following lifecycle methods:
- `connected()` - Called when the element is added to the DOM.
- `disconnected()` - Called when the element is removed from the DOM.
- `render()` - Called after connected(), should only call this.createTree()
   and return the result.
- `postRender()` - Called after render(), if any need to make something 
   after rendering this element.

WARNING: the `ReactiveCustomElement` class extends `HTMLElement`, in typescript,
`connectedCallback()` and `disconnectedCallback()` are made private, but 
still can be overridden in js, DO NOT override them, use the provided 
lifecycle methods instead, connected() will be called instantly when 
`connectedCallback()` is called, and signals are created, and disconnected() will be called
instantly when `disconnectedCallback()` is called.

### Signals
The `ReactiveCustomElement` class provides `this.signal()` to create signals.
Signals are used to handle updates exactly when and where they are needed.
basic usage:
```js
this.signal("initial_value");
```
Example:
```js
import ReactiveCustomElement from 'reactive_custom_elements';
class MyElement extends ReactiveCustomElement {
    count = this.signal(0);
    connected() {
        console.log(this.count.val); // 0
    }
}
```
Signals can work together with other signals, to avoid declaring effects at any time.
using the second argument of `this.signal()` to provide dependencies. dependencies can be
signals from the same element, or signals from parent elements, but not signals from other
elements, to avoid potential memory leaks.

Example:
```js
import ReactiveCustomElement from 'reactive_custom_elements';
class MyElement extends ReactiveCustomElement {
    count = this.signal(0);
    count2 = this.signal(0);
    count3 = this.signal(() => this.count.val + this.count2.val, [this.count, this.count2]);
    connected() {
        console.log(this.count3.val); // 0
        this.count.val = 1;
        console.log(this.count3.val); // 1
        this.count2.val = 2;
        console.log(this.count3.val); // 3
    }
}
```
Signals can be direct dependants of other signals, these signals are synced together.
Example:
```js
import ReactiveCustomElement from 'reactive_custom_elements';
class MyParentElement extends ReactiveCustomElement {
    count = this.signal(0);
}
class MyElement extends ReactiveCustomElement {
    count = this.signal(() => this.parent.count);
    get parent() {
      const el = this.closest("my-parent-element");
      if(!el) throw new Error("parent not found");
     return el;
    }
}
customElements.define('my-parent-element', MyParentElement);
customElements.define('my-element', MyElement);
document.body.innerHTML = "<my-parent-element><my-element></my-element></my-parent-element>";
const parent = document.querySelector("my-parent-element");
const child = document.querySelector("my-element");
console.log(parent.count.val); // 0
console.log(child.count.val); // 0
parent.count.val = 1;
console.log(parent.count.val); // 1
console.log(child.count.val); // 1
child.count.val = 2;
console.log(parent.count.val); // 2
console.log(child.count.val); // 2
```
NOTE: this is recommended to initialize dependant signals with a function,
even if initializing directly with a signal works, because when the signal
is initialized, parent may not be initialized yet, this problem often occurs
when elements are created in javascript, and then added to the DOM.

Signals will call its dependents (explained later) when its value is updated.
note that signals are only updated when its setter is called, so if you want
to update a signal, you need to call its setter, or use `signal.callDependants()`.
so if you want to save performance by not always doing a shallow copy of the
value, you can use `signal.callDependants()` to update dependants without.
Example:
```js
import ReactiveCustomElement from 'reactive_custom_elements';
class MyElement extends ReactiveCustomElement {
    hello = this.signal({hello: "world"});
    count = this.signal(0);
    connected() {
       this.hello.val.hello = "world2"; // this will not update dependants
       this.hello.callDependants(); // this will update dependants
       this.hello.val = {hello: "world3"}; // this will update dependants
       this.count.val; // this will not update dependants
       this.count.val = 1; // this will update dependants
       this.count.val++; // this will update dependants
    }
}
```

### Effects
Effects are used to call a function when a signal used in the function is updated.
Effects are created with `this.effect()`, and are normally destroyed when the main 
class passes into the garbage collector, feel free to make an issue if you find any
memory leaks.

Example:
```js
import ReactiveCustomElement from 'reactive_custom_elements';
class MyElement extends ReactiveCustomElement {
    count = this.signal(0);
    connected() {
        this.effect(() => {
            console.log(this.count.val);
        });
        this.count.val = 1; // console => 1
        this.count.val = 2; // console => 2
    }
}
```

### Attributes
The `ReactiveCustomElement` class provides `this.attribute()` to bind element attributes
as signals.
`this.attribute()` takes 3 arguments:
- `name: string` - The name of the attribute to bind.
- `parse?: (value: string) => any` - A function to parse the attribute value to the signal value.
- `stringify?: (value: any) => string` - A function to stringify the signal value to the attribute value.

Example:
```js
import ReactiveCustomElement from 'reactive_custom_elements';
class MyElement extends ReactiveCustomElement {
    count = this.attribute("count", 
      (value) => parseInt(value), 
      (value) => value.toString()
    );
    connected() {
        console.log(this.count.val); // 0
        this.count.val = 1;
        console.log(this.count.val); // 1
        console.log(this.getAttribute("count")); // "1"
        this.setAttribute("count", "2");
        console.log(this.count.val); // 1 => this way, the attribute value is set 
                                     // asynchronusly, so the signal value is not 
                                     // updated yet, use effect to track attribute
        console.log(this.getAttribute("count")); // "2"
    }
}
```

### Rendering
Rendering will run only one time when the element is added to the DOM, only effects
created during rendering will cause updates. so be sure you understand how signals
and effects work before continuing, make also sure you understand when effects are
created during rendering.

Rendering is done with `this.createTree()`, it takes `TagDescriptor` as argument.
`AttributeMap` is an object with the following properties:
- `key?: string` - The key of the element to create.
- `on<any string>: (event: Event) => void` - Event listeners.
- `<any string>: () => any | any` - Attributes, if the value is a function, it will 
   be wrapped in an effect, and the effect will be destroyed when the element is removed 
   from the custom element children.

`TagDescriptor` is an object with the following properties:
- `tag: string` - The tag name of the element to create.
- `attrs: AttributeMap` - The properties of the element to create. properties starting with `on` are
   considered event listeners.
- `children: (() => TagDescriptorWithKey[] | TagDescriptor | string) | TagDescriptor | string` 
  \- The children of the element to create, if the value is a function, it will be wrapped in an effect, 
   and the effect will be destroyed when the element is removed from the custom element children.
   if the return type of the function is an array, keys will be required for each element, to avoid
   sort of memory leaks, and to be sure we are updating the right element.

`TagDescriptorWithKey` is an object with the following properties:
- `key: string` - The key of the element to create.
- all other properties are the same as `TagDescriptor`.

`TagDescriptor` can be made using the `tag()` helper function, which takes as arguments:
- `tagName: string` - same as `tag` in `TagDescriptor`.
- `attrs: AttributeMap` - same as `attrs` in `TagDescriptor`.
- `...children: (() => TagDescriptorWithKey[] | TagDescriptor | string) | TagDescriptor | string` - The children of the element to create.

`TagDescriptorWithKey` can be made using the `keyedtag()` helper function, which takes as arguments:
- `key: string` - The key of the element to create.
- all other arguments are the same as `tag()`.

`TagDescriptorWithKey` can also be made using the `tag()` helper function, with a `key` property in the `attrs` argument.

Now let's see some examples:
```js
import ReactiveCustomElement, {tag} from 'reactive_custom_elements';
class MyElement extends ReactiveCustomElement {
    count = this.signal(0);
    render(){
      return this.createTree(
        tag(
          "div",                                   // tag name
          {                                        // attributes
             onclick: () => this.count.val++,      // event listener, will increment count when clicked
             "data-count": () => this.count.val,   // attribute, will update when count is updated
             "data-wrong": this.count.val,         // attribute, will not update when count is updated
          },
          "count: ",                               // child, will add a static text node
          () => this.count.val,                    // child, will add a dynamic text node that will update when count is updated
          () => Array(this.count.val % 10)         // child, will add all elements in the array, will update when count is updated
            .fill(0)
            .map((_, i) => tag(                    // child, will add a div for each count % 10
              "div",                               // tag name
              {                                    // attributes
                key: i.toString(),                 // key, required for each element in an array, elements with same key will be replaced only if the tag name is not the same
              },
              "i: " + i + "count: ",               // child, will add a static text node
              () => this.count.val,                // child, will add a dynamic text node that will update when count is updated
            ))
        )
      );
    }
}
```

### Jsx

Jsx is supported, but no fragment support yet, as i wanted to allow using
other libraries like react, solid, etc, the way you use jsx in this library
is telling jsx in each file to use the `tag()` function above import statements.
this works with my personal tests, using --jsx: react | preserve, feel free
to make an issue if you find any problems, or make a pull request if you want
to add fragment support, or any other feature. the above example can be written 
like this:
```js
/** @jsx tag */ // => can be omitted if jsxFactory is set to "tag" into config
import ReactiveCustomElement, {tag} from 'reactive_custom_elements';

class MyElement extends ReactiveCustomElement {
    count = this.signal(0);
    render(){
      return this.createTree(
        <div
          onclick={() => this.count.val++}
          data-count={() => this.count.val}
          data-wrong={this.count.val}
        >
          count: {() => this.count.val}
          {() => Array(this.count.val % 10)
            .fill(0)
            .map((_, i) => (
              <div key={i.toString()}>
                i: {i} count: {() => this.count.val}
              </div>
            ))}
        </div>
      );
    }
}
```
Note: functions are still required to tell the library there is an effect.

Note: You can add custom elements in tag, or jsx, but in typescript, this will need to
register the custom element into `HTMLElementTagNameMap`:
```ts
declare global { interface HTMLElementTagNameMap { "my-element": MyElement } }
```

### Debuging
The `ReactiveCustomElement` class contains a `debug` property, which is a boolean.
as soon as it is set to true, the library will log many debug infos to the console.
it is recommended to set it to true only when needed, as it will slow down the library,
and spam an absurd amount of logs to the console.


