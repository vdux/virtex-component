/**
 * Shallow equality
 */

function arrayEqual (a, b) {
  if (a.length === b.length) {
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false
    }

    return true
  }

  return false
}

function objectEqual (a, b) {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)

  if (aKeys.length === bKeys.length) {
    for (let key in a) {
      if (! (a.hasOwnProperty(key) && b.hasOwnProperty(key) && a[key] === b[key])) return false
    }

    return true
  }

  return false
}

/**
 * Exports
 */

export default {
  objectEqual,
  arrayEqual
}
