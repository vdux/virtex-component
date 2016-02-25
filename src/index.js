/**
 * Imports
 */

import defaults from '@f/defaults'
import arrayEqual from '@f/array-equal'
import objectEqual from '@f/object-equal'
import {actions, findDOMNode} from 'virtex'

/**
 * Constants
 */

const {CREATE_THUNK, UPDATE_THUNK, DESTROY_THUNK} = actions.types

/**
 * virtex-component
 */

function middleware (components = {}, postRender = () => {}) {
  return ({dispatch}) => {
    const maybeDispatch = action => action && dispatch(action)

    return next => action => {
      switch (action.type) {
        case CREATE_THUNK:
          components[action.vnode.path] = action.vnode
          return create(maybeDispatch, action.vnode, postRender)
        case UPDATE_THUNK:
          if (action.prev) {
            components[action.vnode.path] = action.vnode
          }
          return update(maybeDispatch, action.vnode, action.prev, postRender)
        case DESTROY_THUNK:
          delete components[action.vnode.path]
          return destroy(maybeDispatch, action.vnode)
        default:
          return next(action)
      }
    }
  }
}

function create (dispatch, thunk, postRender) {
  const component = thunk.type
  const {onCreate, afterRender} = component

  thunk.props = thunk.props || {}

  // Setup the default immutable shouldUpdate if this component
  // hasn't exported one
  component.shouldUpdate = component.shouldUpdate || shouldUpdate

  // Call the onCreate hook
  if (onCreate) dispatch(onCreate(thunk))
  if (afterRender) postRender(() => dispatch(afterRender(thunk, findDOMNode(thunk))))

  return (thunk.vnode = render(component, thunk))
}

function update (dispatch, thunk, prev, postRender) {
  if (thunk.vnode) return thunk.vnode

  const component = thunk.type
  const {onUpdate, shouldUpdate, afterRender} = component

  thunk.props = thunk.props || {}
  defaults(thunk, prev)

  if (shouldUpdate(prev, thunk)) {
    if (onUpdate) dispatch(onUpdate(prev, thunk))
    if (afterRender) postRender(() => dispatch(afterRender(thunk, findDOMNode(thunk))))

    return (thunk.vnode = render(component, thunk))
  }

  return (thunk.vnode = prev.vnode)
}

function destroy (dispatch, thunk) {
  const {onRemove} = thunk.type
  onRemove && dispatch(onRemove(thunk))
}

function render (component, thunk) {
  return typeof component === 'function'
    ? component(thunk)
    : component.render(thunk)
}

function shouldUpdate (prev, next) {
  return !arrayEqual(prev.children, next.children) || !objectEqual(prev.props, next.props)
}

/**
 * Exports
 */

export default middleware
