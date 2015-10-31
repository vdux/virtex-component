/**
 * Imports
 */

import {actions} from 'virtex'
import {objectEqual, arrayEqual} from './shallowEqual'

/**
 * Constants
 */

const {RENDER_THUNK} = actions.types

/**
 * virtex-component
 */

function middleware ({dispatch}) {
  return next => action =>
    action.type === RENDER_THUNK
      ? component(a => a && dispatch(a), action)
      : next(action)
}

function component (dispatch, {thunk, prev}) {
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
    thunk.vnode = prev.vnode
    return prev.vnode
  }
}

function shouldUpdate (component, prevProps, nextProps) {
  if (arrayEqual(prevProps.children, nextProps.children)) {
    nextProps.children = prevProps.children
  }

  return component.shouldUpdate
    ? component.shouldUpdate(prevProps, nextProps)
    : !objectEqual(prevProps, nextProps)
}

function render (thunk) {
  thunk.vnode = thunk.component.render(thunk.props)

  return thunk.vnode
}

function applyHooks (vnode, {key, component, props}) {
  const attrs = vnode.attrs = vnode.attrs || {}

  // In the case of beforeMount, we only wish to patch in our hook
  // on the first run so it runs once on creation
  if (component.afterMount && !attrs[key + ':afterMount']) {
    attrs[key + ':afterMount'] = (node, name, remove) => remove || dispatch(afterMount(props))
  }

  // In the case of beforeUnmount, we want to patch it in each time,
  // so that whenever the component is unmounted, it'll have the
  // latest props
  if (component.beforeUnmount) {
    attrs[key + ':beforeUnmount'] = (node, name, remove) => remove && dispatch(beforeUnmount(props))
  }

  return vnode
}

function isSameThunk (a, b) {
  return a.component === b.component
}

/**
 * Exports
 */

export default middleware
