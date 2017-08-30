/* @flow */

import _createChildRoutesSelector from './createChildRoutesSelector'
import createGetChildRoutes from './createGetChildRoutes'
import createFeatureRoute from './createFeatureRoute'

import type {Options} from './createChildRoutesSelector'

export {
  _createChildRoutesSelector as createChildRoutesSelector,
  createGetChildRoutes,
  createFeatureRoute,
}

export default function create<S, A>(options: Options<S, A>): {
} {
  const createChildRoutesSelector = _createChildRoutesSelector(options)
  const getChildRoutes = createGetChildRoutes(createChildRoutesSelector)
  const featureRoute = createFeatureRoute(options)
  return {
    createChildRoutesSelector,
    getChildRoutes,
    featureRoute,
  }
}

