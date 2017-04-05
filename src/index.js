/**
 * Imports
 */

import {createEphemeral, destroyEphemeral, toEphemeral, isEphemeral, lookup} from 'redux-ephemeral'
import {actions, findDOMNode} from 'virtex'
import curry from '@f/curry-transparently'
import compose from 'redux/lib/compose'
import arrayEqual from '@f/equal-array'
import identity from '@f/identity'
import t from 'tcomb-validation'
import multi from 'redux-multi'
import falsy from 'redux-falsy'
import reduce from '@f/reduce'
import flo from 'redux-flo'

/**
 * Constants
 */

const {CREATE_THUNK, UPDATE_THUNK, DESTROY_THUNK} = actions.types
const FORCE_UPDATE = 'VIRTEX_COMPONENT/FORCE_UPDATE'

/**
 * virtex-component
 */

function middleware (config = {}) {
  const {components = {}, dirty = {}, postRender = () => {}, forceRerender} = config
  let currentContext = {}
  let forceUpdate = false

  return ({dispatch, getState}) => next => action => {
    switch (action.type) {
      case CREATE_THUNK: {
        const thunk = action.vnode
        components[thunk.path] = thunk
        delete dirty[thunk.path]

        const component = thunk.type
        const {initialState = returnObject, onCreate, afterRender, getProps = identity} = component

        thunk.actions = createActions(thunk.type.actions, thunk)
        thunk.middleware = createMiddleware(thunk, () => lookup(getState(), thunk.path), () => currentContext, thunkGetter(thunk.path), forceRerender, dispatch)

        const priorState = lookup(getState(), thunk.path)

        thunk.context = currentContext
        thunk.props = thunk.props || {}
        thunk.state = priorState || decorateErrors(thunk, 'initialState', () => initialState(thunk))

        validate(thunk)

        if (thunk.type.getContext && isRoot(thunk)) {
          updateContext(thunk)
          thunk.context = currentContext
        }

        // If a component does not have a reducer, it does not
        // get any local state
        if ((component.initialState || component.reducer) && !priorState) {
          dispatch(createEphemeral(thunk.path, thunk.state))
        }

        // Call the onCreate hook
        if (onCreate) thunk.middleware(decorateErrors(thunk, 'onCreate', () => onCreate(thunk)))
        if (afterRender) postRender(() => thunk.middleware(decorateErrors(thunk, 'afterRender', () => afterRender(thunk, findDOMNode(thunk)))))

        thunk.vnode = decorateErrors(thunk, 'render', () => render(component, thunk))
        return thunk.vnode
      }
      case UPDATE_THUNK: {
        const thunk = action.vnode
        const prev = action.prev

        if (prev) components[thunk.path] = thunk
        if (thunk.vnode) return thunk.vnode

        const component = thunk.type
        const {onUpdate, afterRender, getProps = identity} = component

        thunk.props = thunk.props || {}
        delete dirty[thunk.path]
        thunk.actions = prev.actions
        thunk.middleware = prev.middleware
        thunk.state = lookup(getState(), thunk.path)

        validate(thunk)

        if (thunk.type.getContext && isRoot(thunk)) {
          updateContext(thunk)
        }

        thunk.context = currentContext

        if (prev.context !== thunk.context || shouldUpdate(prev, thunk)) {
          if (onUpdate) thunk.middleware(decorateErrors(thunk, 'onUpdate', () => onUpdate(prev, thunk)))
          if (afterRender) postRender(() => thunk.middleware(decorateErrors(thunk, 'afterRender', () => afterRender(thunk, findDOMNode(thunk)))))

          thunk.vnode = decorateErrors(thunk, 'render', () => render(component, thunk))
        } else {
          thunk.vnode = prev.vnode
        }

        return thunk.vnode
      }
      case DESTROY_THUNK: {
        const thunk = action.vnode

        delete dirty[action.vnode.path]
        delete components[thunk.path]

        const {onRemove, reducer, initialState, getProps = identity} = thunk.type

        thunk.props = thunk.props || {}

        validate(thunk)

        if (onRemove) thunk.middleware(decorateErrors(thunk, 'onRemove', () => onRemove(thunk)))
        if (reducer || initialState) dispatch(destroyEphemeral(thunk.path))

        return
      }
      case FORCE_UPDATE: {
        forceUpdate = true
        return
      }
      default: {
        if (isLocalAction(action)) {
          return action.$$fn.model.middleware(action)
        } else if (isEphemeral(action)) {
          const prevState = getState()
          const result = next(action)
          const nextState = getState()

          if (prevState !== nextState) {
            dirty[action.meta.ephemeral.key] = true
          }

          return result
        }

        return next(action)
      }
    }
  }

  function updateContext (thunk) {
    const {getContext = () => ({})} = thunk.type
    const nextContext = thunk.type.getContext(thunk) || {}

    if (!propsEqual(currentContext, nextContext)) {
      currentContext = nextContext
    }

    if (forceUpdate) {
      currentContext = {...currentContext}
      forceUpdate = false
    }
  }

  function thunkGetter (path) {
    let lastThunk
    return () => (lastThunk = components[path] || lastThunk)
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

function isRoot (thunk) {
  return /^[^\.]+$/.test(thunk.path)
}

function forceUpdate () {
  return {
    type: FORCE_UPDATE
  }
}

function returnObject () {
  return {}
}

function defaultShouldUpdate (prev, next) {
  return prev.state !== next.state || !arrayEqual(prev.children, next.children) || !propsEqual(prev.props, next.props)
}

function createMiddleware ({path, context, actions, type}, getState, getContext, getThunk, forceRerender, globalDispatch) {
  const {reducer, middleware = [], controller} = type
  if (!middleware.length && !controller && !reducer) return globalDispatch

  const ctx = {
    path,
    actions,
    getState,
    getContext,
    getThunk,
    forceRerender,
    dispatch: action => composed(action)
  }

  const chain = setupDefaultMiddleware(middleware, controller).map(fn => fn(ctx))
  const composed = compose(...chain)(action =>
    action.meta && action.meta.localAction
      ? globalDispatch(toEphemeral(path, reducer, action))
      : globalDispatch(action))

  return composed
}

function setupDefaultMiddleware (middleware, controller) {
  const mw = [transformLocal, falsy, flo(), promisifyArray, multi, ...middleware]
  if (controller) mw.push(controller)
  return mw
}

function promisifyArray () {
  return next => action => {
    const result = next(action)
    return Array.isArray(result)
      ? Promise.all(result)
      : result
  }
}

const NODE_ENV = typeof process !== 'undefined' ? process.env.NODE_ENV : 'development'

function validate (thunk) {
  if (NODE_ENV !== 'development') return

  if (thunk.type.propTypes) {
    const res = t.validate(thunk.props, thunk.type.propTypes)
    if (!res.isValid()) {

      res.errors.forEach(({message}) => console.error(`<${thunk.type.name}/> propTypes: ${message}`))
    }
  }

  if (thunk.type.stateTypes) {
    const res = t.validate(thunk.state, thunk.type.stateTypes)
    if (!res.isValid()) {
      res.errors.forEach(({message}) => console.error(`<${thunk.type.name}/> stateTypes: ${message}`))
    }
  }
}

/**
 * Local action creation/handling
 */

function propsEqual (a, b) {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  const aLen = aKeys.length
  const bLen = bKeys.length

  if (aLen === bLen) {
    for (let i = 0; i < aLen; ++i) {
      const key = aKeys[i]
      const aVal = a[key]
      const bVal = b[key]

      if (!a.hasOwnProperty(key) || !b.hasOwnProperty(key) || aVal !== bVal) {
        if (!equalActions(aVal, bVal)) {
          return false
        }
      }
    }

    return true
  }

  return false
}

function equalActions (a, b) {
  if (isLocalAction(a) && isLocalAction(b)) {
    return a.$$fn.type === b.$$fn.type && a.$$fn.path === b.$$fn.path && arrayEqual(a.$$args, b.$$args)
  }

  return false
}

function equalArgs (a, b) {
  const aLen = a.length
  if (aLen !== b.length) return false

  for (let i = 0; i < aLen; i++) {
    const aVal = a[i]
    const bVal = b[i]

    if (aVal !== bVal && !equalActions(aVal, bVal)) {
      return false
    }
  }

  return true
}

function createActions (actions = [], thunk) {
  return reduce((acc, action) => {
    acc[action] = curry(new LocalAction(action, thunk), Infinity)
    return acc
  }, {}, actions)
}

function isLocalAction (a) {
  return a && a.$$fn instanceof LocalAction
}

function LocalAction (type, model) {
  this.type = type
  this.model = model
  this.path = model.path
  this.$$vduxAllowedHandler = true
}

LocalAction.prototype.isEqual = function (action) {
  return equalActions(this, action)
}

function transformLocal (ctx) {
  return next => action => isLocalAction(action) && action.$$fn.model.path === ctx.path
    ? next({type: action.$$fn.type, payload: action.$$args, meta: {localAction: true}})
    : next(action)
}

function decorateErrors (thunk, name, fn) {
  try  {
    return fn()
  } catch (err) {
    err.message = `<${thunk.type.name || 'UnknownComponent'}/> ${name}: ${err.message}`
    throw err
  }
}

/**
 * Exports
 */

export default middleware
export {
  forceUpdate,
  t
}
