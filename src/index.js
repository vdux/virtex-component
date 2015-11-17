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
        return create(a => a && dispatch(a), action.vnode)
      case UPDATE_THUNK:
        return update(a => a && dispatch(a), action.vnode, action.prev)
      case DESTROY_THUNK:
        return destroy(a => a && dispatch(a), action.vnode)
      default:
        return next(action)
    }
  }
}

function create (dispatch, thunk) {
  const {type: component} = thunk
  const {beforeMount, afterMount} = component

  const model = createModel(thunk)

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

function update (dispatch, thunk, prev) {
  const {type: component} = thunk
  const {beforeUpdate, afterUpdate, shouldUpdate} = component

  // Copy over everything from the old model to the new
  // model, unless the new model has an updated property
  const model = defaults(createModel(thunk), prev.model)

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

function createModel (thunk) {
  const model = thunk.model = thunk.model || {}

  model.children = thunk.children
  model.props = thunk.attrs || {}
  model.path = thunk.path
  model.key = thunk.key

  return model
}

function destroy (dispatch, thunk) {
  const {beforeUnmount} = thunk.type
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

/**
 * Exports
 */

export default middleware
