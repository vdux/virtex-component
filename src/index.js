/**
 * Imports
 */

import {types} from 'virtex'

/**
 * virtex-component
 */

function middleware ({dispatch}) {
  return next => action =>
    action.type === types.RENDER_THUNK
      ? component(dispatch, action.payload)
      : next(action)
}

function component ({thunk, prev}) {
  if (thunk.vnode) return thunk.vnode
  const {beforeMount, afterMount, beforeUpdate, afterUpdate} = thunk.component

  if (!prev || !isSameThunk(thunk, prev)) {
    beforeMount && dispatch(beforeMount(thunk.props))
    afterMount && setTimeout(() => dispatch(afterMount(thunk.props)))
    return render(thunk)
  } else if (shouldUpdate(thunk.component, prev.props, thunk.props)) {
    beforeUpdate && dispatch(beforeUpdate(prev.props, thunk.props))
    afterUpdate && setTimeout(() => dispatch(afterUpdate(prev.props, thunk.props)))
    return render(thunk)
  } else {
    return prev.vnode
  }
}

function shouldUpdate (component, prevProps, nextProps) {
  if (shallowEqual(prevProps.children, nextProps.children)) {
    nextProps.children = prevProps.children
  }

  return component.shouldUpdate
    ? component.shouldUpdate(prevProps, nextProps)
    : shallowEqual(prevProps, nextProps)
}

function render (thunk) {
  thunk.vnode = thunk.component.render(thunk.props)
  return thunk.vnode
}

function isSameThunk (a, b) {
  return a.component === b.component
}

/**
 * Exports
 */

export default middleware
