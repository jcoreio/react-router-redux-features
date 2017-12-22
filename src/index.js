/* @flow */

import _createChildRoutesSelector from './createChildRoutesSelector'
import createGetChildRoutes from './createGetChildRoutes'
import createFeatureRoute from './createFeatureRoute'
import type {FeatureState} from 'redux-features'

import type {Options} from './createChildRoutesSelector'

export type FeatureStateAlertProps = {
  featureId: string,
  featureName: string,
  featureState: FeatureState,
}

export type FeatureStateAlert = React$ComponentType<FeatureStateAlertProps>

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

