// @flow

import defaults from 'lodash.defaults'
import memoize from 'lodash.memoize'
import type {Store} from 'redux'
import type {PlainRoute} from 'react-router'
import {createSelector} from 'reselect'
import type {Feature} from 'redux-features'
import wrapRoute from './wrapRoute'

import type {GetRoutes, Options} from './createChildRoutesSelector'

const optionsDefaults = {
  getFeatureStates: state => state.featureStates,
  getFeatures: state => state.features,
  getFeatureName: featureId => featureId,
}

export default function createChildRoutesSelector<S, A>(
  options: Options<S, A>
): (getRoutes: GetRoutes<S, A>) => (store: Store<S, A>) => Array<PlainRoute> {
  options = defaults(options, optionsDefaults)
  const {getFeatures, getFeatureName} = options

  return (getRoutes: GetRoutes<S, A>) => {
    const selectFeatureRoutes: (featureId: string) => (feature: Feature<S, A>, store: Store<S, A>) => ?Array<PlainRoute>
      = memoize((featureId: string) => createSelector(
      (feature, store) => store,
      feature => getFeatureName(featureId, feature),
      getRoutes,
      (store: Store<S, A>, featureName: string, routes: ?(PlainRoute | Array<PlainRoute>)): ?Array<PlainRoute> => {
        function wrapSingleRoute(route: PlainRoute): PlainRoute {
          return wrapRoute({
            ...options,
            store,
            route,
            featureId,
            featureName,
          })
        }

        if (Array.isArray(routes)) return routes.map(wrapSingleRoute)
        else if (routes) return [wrapSingleRoute(routes)]
      }
    ))

    let lastFeatures, lastChildRoutes
    return function selectChildRoutes(store: Store<S, A>): Array<PlainRoute> {
      const features = getFeatures(store.getState())
      if (features === lastFeatures) return lastChildRoutes
      lastFeatures = features

      lastChildRoutes = []
      for (let featureId in features) {
        const featureRoutes = selectFeatureRoutes(featureId)(features[featureId], store)
        if (Array.isArray(featureRoutes)) lastChildRoutes.push(...featureRoutes)
      }
      return lastChildRoutes
    }
  }
}

