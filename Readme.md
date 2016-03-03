
# virtex-component

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)

Component rendering middleware for virtex

## Installation

    $ npm install virtex-component

## Usage

Install it in your middleware stack like this:

`applyMiddleware(component(), dom(document), ...others)`

Then export components like this:

```javascript
function onCreate ({props}) {
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
  onCreate,
  render
}
```

### Model

Components are passed an object that contains (at least) 3 things:

  * `props` - An object of the properties passed in by the calling component
  * `children` - An array of the children specified by the calling component
  * `path` - The numerical (e.g. `0.1.3`) path in the *component* tree.  This will be used to store your local state if you don't specify a key (by [virtex-local](https://github.com/ashaffer/virtex-local)).
  * `key` - The key specified by your parent in props (optional).

These are all of the things that virtex-component will put into your model.  But other effect, such as [virtex-local](https://github.com/ashaffer/virtex-local) processors may add additional properties.

### Lifecycle hooks

All lifecycle hooks receive `model` (and possibly `prevModel`) and may return an action.  That action will be dispatched back into redux - this and only this is how your lifecyle hooks may effect the outside world.

  * `onCreate` - When the component is created. Receives `model`.
  * `onUpdate` - When the model changes. Receives `prev` and `next` models.
  * `onRemove` - When the component is removed. Receives `model`.

## shouldUpdate

By default, your component will only update if a shallow equality check fails for your children or prev/next props.  However, by exporting a custom `shouldUpdate` function, you can control this yourself.

## getProps

Use this to transform props before they're passed into any of your component's other methods. It receives only props, and should return a new props object.  E.g.

```javascript
function getProps (props) {
  return {
    ...props,
    timeout: props.timeout || 0
  }
}
```

## Component map

If you pass an object to virtex-component when you install it, it will maintain a map for you of components to paths. E.g.

```javascript
const map = {}
applyMiddleware(component(map), ...)
```

Here, `map` will contain a mapping between components and paths. This can be useful for implementing fast sub-tree re-rendering.


## License

The MIT License

Copyright &copy; 2015, Weo.io &lt;info@weo.io&gt;

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
