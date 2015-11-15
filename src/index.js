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
  return next => action => {
    switch (action.type) {
      case CREATE_THUNK:
        return create(a => a && dispatch(a), action)
      case UPDATE_THUNK:
        return update(a => a && dispatch(a), action)
      case DESTROY_THUNK:
        return destroy(a => a && dispatch(a), action)
      default:
        return next(action)
    }
  }
}

function create (dispatch, {thunk}) {
  const {component, model} = thunk
  const {beforeMount, afterMount} = component

  // Setup the default immutable shouldUpdate if this component
  // hasn't exported one
  component.shouldUpdate = component.shouldUpdate || shouldUpdate

  if (beforeMount) {
    dispatch(beforeMount(model))
  }

  const vnode = thunk.vnode = render(component, model)

  if (afterMount) {
    vnode.attrs = vnode.attrs || {}
    vnode.attrs[uid() + ':afterMount'] = () => { dispatch(afterMount(model)) }
  }

  return vnode
}

function update (dispatch, {thunk, prev}) {
  const {component, model} = thunk
  const {beforeUpdate, afterUpdate, shouldUpdate} = component

  // Copy over everything from the old model to the new
  // model, unless the new model has an updated property
  defaults(thunk.model, prev.model)

  if (shouldUpdate(prev.model, model)) {
    if (beforeUpdate) {
      dispatch(beforeUpdate(prev.model, model))
    }

    thunk.vnode = render(component, model)

    if (afterUpdate) {
      dispatch(afterUpdate(prev.model, model))
    }

    return thunk.vnode
  } else {
    return (thunk.vnode = prev.vnode)
  }
}

function destroy (dispatch, {thunk}) {
  const {beforeUnmount} = thunk.component
  if (beforeUnmount) {
    dispatch(beforeUnmount(thunk.model))
  }
}

function render (component, model) {
  return typeof component === 'function'
    ? component(model)
    : component.render(model)
}

function shouldUpdate (prev, next) {
  return !arrayEqual(prev.children, next.children) || !objectEqual(prev.props, next.props)
}

function isSameThunk (a, b) {
  return a.component === b.component
}

/**
 * Exports
 */

export default middleware
