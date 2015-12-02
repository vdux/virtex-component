/**
 * Imports
 */

import uid from 'get-uid'
import {actions} from 'virtex'
import defaults from 'defaults'
import arrayEqual from 'array-equal'
import objectEqual from 'object-equal'

/**
 * Constants
 */

const {CREATE_THUNK, UPDATE_THUNK, DESTROY_THUNK} = actions.types

/**
 * virtex-component
 */

function middleware ({dispatch}) {
  const maybeDispatch = action => action && dispatch(action)

  return next => action => {
    switch (action.type) {
      case CREATE_THUNK:
        return create(maybeDispatch, action.vnode)
      case UPDATE_THUNK:
        return update(maybeDispatch, action.vnode, action.prev)
      case DESTROY_THUNK:
        return destroy(maybeDispatch, action.vnode)
      default:
        return next(action)
    }
  }
}

function create (dispatch, thunk) {
  const component = thunk.type
  const {beforeMount, afterMount} = component

  thunk.props = thunk.props || {}

  // Setup the default immutable shouldUpdate if this component
  // hasn't exported one
  component.shouldUpdate = component.shouldUpdate || shouldUpdate

  beforeMount && dispatch(beforeMount(thunk))

  const vnode = thunk.vnode = render(component, thunk)

  if (afterMount) {
    vnode.props = vnode.props || {}
    vnode.props[uid() + ':afterMount'] = () => { dispatch(afterMount(thunk)) }
  }

  return vnode
}

function update (dispatch, thunk, prev) {
  const component = thunk.type
  const {beforeUpdate, afterUpdate, shouldUpdate} = component

  thunk.props = thunk.props || {}
  defaults(thunk, prev)

  if (shouldUpdate(prev, thunk)) {
    beforeUpdate && dispatch(beforeUpdate(prev, thunk))
    thunk.vnode = render(component, thunk)
    afterUpdate && dispatch(afterUpdate(prev, thunk))

    return thunk.vnode
  }

  return (thunk.vnode = prev.vnode)
}

function destroy (dispatch, thunk) {
  const {beforeUnmount} = thunk.type
  beforeUnmount && dispatch(beforeUnmount(thunk))
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
