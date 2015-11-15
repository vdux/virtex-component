
# virtex-component

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)

Component rendering middleware for virtex

## Installation

    $ npm install virtex-component

## Usage

Install it in your middleware stack like this:

`applyMiddleware(component, dom(document), ...others)`

Then export components like this:

```javascript
function beforeMount ({props}) {
  return fetchSomeData()
}

function render ({props, children}) {
  return (
    <ul style={{color: props.color}}>
      children.map(child => <li>{child}</li>)
    </ul>
  )
}

export default {
  beforeMount,
  render
}
```

### Model

Components are passed an object that contains (at least) 3 things:

  * `props` - An object of the properties passed in by the calling component
  * `children` - An array of the children specified by the calling component
  * `path` - The numerical (e.g. `0.1.3`) path in the *component* tree.  This will be used to store your local state if you don't specify a key (by [virtex-local](https://github.com/ashaffer/virtex-local)).
  * `key` - The key specified by your parent in props (optional).

These are all of the things that virtex-component will put into your model.  But other effect processors may add additional properties.

### Lifecycle hooks

All lifecycle hooks receive `model` (and possibly `prevModel`) and may return an action.  That action will be dispatched back into redux - this and only this is how your lifecyle hooks may effect the outside world.

  * `beforeMount` - Executes before the component has been rendered into the DOM
  * `beforeUpdate` - Does not execute on the first render, but does so on all subsequent renders. Receives `prev` and `next` models.
  * `render` - Receives model and returns a vnode.
  * `afterUpdate` - Receives `prev` and `next` models like beforeUpdate. Also does not run on initial render.
  * `afterMount` - Runs after the component has been mounted into the DOM
  * `beforeUnmount` - Runs before the component is removed from the DOM

## shouldUpdate

By default, your component will only update if a shallow equality check fails for your children or prev/next props.  However, by exporting a custom `shouldUpdate` function, you can control this yourself.


## License

The MIT License

Copyright &copy; 2015, Weo.io &lt;info@weo.io&gt;

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
