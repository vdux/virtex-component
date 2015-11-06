/**
 * Imports
 */

import {actions} from 'virtex'
import {objectEqual, arrayEqual} from './shallowEqual'
import uid from 'get-uid'

/**
 * Constants
 */

const {RENDER_THUNK, UNRENDER_THUNK} = actions.types

/**
 * virtex-component
 */

function middleware ({dispatch}) {
  return next => action => {
    switch (action.type) {
      case RENDER_THUNK:
        return renderComponent(a => a && dispatch(a), action)
      case UNRENDER_THUNK:
        return unrenderComponent(a => a && dispatch(a), action)
      default:
        return next(action)
    }
  }
}

function unrenderComponent (dispatch, {thunk}) {
  const {beforeUnmount} = thunk.component
  beforeUnmount && dispatch(beforeUnmount(thunk.props))
}

function renderComponent (dispatch, {thunk, prev}) {
  if (thunk.vnode) return thunk.vnode
  const {beforeMount, beforeUpdate, afterUpdate, afterMount} = thunk.component

  if (!prev || !isSameThunk(thunk, prev)) {
    thunk.id = uid()
    if (beforeMount) {
      dispatch(beforeMount(thunk.props))
    }

    const vnode = thunk.vnode = thunk.component.render(thunk.props)

    if (afterMount) {
      vnode.attrs = vnode.attrs || {}
      vnode.attrs[uid() + ':afterMount'] = () => { dispatch(afterMount(thunk.props)) }
    }

    return vnode
  } else if (shouldUpdate(thunk.component, prev.props, thunk.props)) {
    if (beforeUpdate) {
      dispatch(beforeUpdate(prev.props, thunk.props))
    }

    thunk.vnode = thunk.component.render(thunk.props)

    if (afterUpdate) {
      dispatch(afterUpdate(prev.props, thunk.props))
    }

    return thunk.vnode
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

function isSameThunk (a, b) {
  return a.component === b.component
}

/**
 * Exports
 */

export default middleware
