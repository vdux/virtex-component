/**
 * Imports
 */

import defaults from '@f/defaults'
import identity from '@f/identity'
import arrayEqual from '@f/equal-array'
import objectEqual from '@f/equal-obj'
import {actions, findDOMNode} from 'virtex'

/**
 * Constants
 */

const {CREATE_THUNK, UPDATE_THUNK, DESTROY_THUNK} = actions.types

/**
 * virtex-component
 */

function middleware (config = {}) {
  const {components = {}, postRender = () => {}, ignoreShouldUpdate = () => false, getContext = () => ({})} = config

  return ({dispatch}) => {
    const maybeDispatch = action => action && dispatch(action)

    return next => action => {
      switch (action.type) {
        case CREATE_THUNK:
          components[action.vnode.path] = action.vnode
          return create(action.vnode)
        case UPDATE_THUNK:
          if (action.prev) {
            components[action.vnode.path] = action.vnode
          }
          return update(action.vnode, action.prev)
        case DESTROY_THUNK:
          delete components[action.vnode.path]
          return destroy(action.vnode)
        default:
          return next(action)
      }
    }

    function create (thunk) {
      const component = thunk.type
      const {onCreate, afterRender, getProps = identity} = component

      thunk.props = getProps(thunk.props || {}, getContext())

      // Call the onCreate hook
      if (onCreate) maybeDispatch(onCreate(thunk))
      if (afterRender) postRender(() => maybeDispatch(afterRender(thunk, findDOMNode(thunk))))

      return (thunk.vnode = render(component, thunk))
    }

    function update (thunk, prev) {
      if (thunk.vnode) return thunk.vnode

      const component = thunk.type
      const {onUpdate, afterRender, getProps = identity} = component

      thunk.props = getProps(thunk.props || {}, getContext())
      defaults(thunk, prev)

      if (ignoreShouldUpdate() || shouldUpdate(prev, thunk)) {
        if (onUpdate) maybeDispatch(onUpdate(prev, thunk))
        if (afterRender) postRender(() => maybeDispatch(afterRender(thunk, findDOMNode(thunk))))

        return (thunk.vnode = render(component, thunk))
      }

      return (thunk.vnode = prev.vnode)
    }

    function destroy (thunk) {
      const {onRemove, getProps = identity} = thunk.type

      thunk.props = getProps(thunk.props || {}, getContext())
      onRemove && maybeDispatch(onRemove(thunk))
    }
  }
}

function render (component, thunk) {
  return typeof component === 'function'
    ? component(thunk)
    : component.render(thunk)
}

function shouldUpdate (prev, next) {
  return (next.type.shouldUpdate || defaultShouldUpdate)(prev, next)
}

function defaultShouldUpdate (prev, next) {
  return !arrayEqual(prev.children, next.children) || !objectEqual(prev.props, next.props)
}

/**
 * Exports
 */

export default middleware
