// @flow

import type {Store} from 'redux'
import type {PlainRoute} from 'react-router'
import type {Features, FeatureStates} from 'redux-features'

import type {FeatureStateAlert as _FeatureStateAlert} from './index'
import optionsDefaults from './optionsDefaults'
import wrapRoute from './wrapRoute'
import type {GetRoute} from './wrapRoute'

export type FirstOptions<S, A> = {
  isServer?: boolean,
  getFeatureStates?: (state: S) => FeatureStates,
  getFeatures?: (state: S) => Features<S, A>,
  rematchRoutes?: (store: Store<S, A>) => any,
  FeatureStateAlert?: _FeatureStateAlert,
}

export type SecondOptions<S, A> = {
  store: Store<S, A>,
  featureId: string,
  featureName: string,
  getRoute: GetRoute<S, A>,
}

export default function createFeatureRoute<S, A>(firstOptions: FirstOptions<S, A>): (options: SecondOptions<S, A>) => PlainRoute {
  firstOptions = optionsDefaults(firstOptions)
  const {getFeatures} = firstOptions
  return (secondOptions: SecondOptions<S, A>): PlainRoute => {
    const {store, featureId, featureName, getRoute, ...props} = secondOptions
    const feature = getFeatures(store.getState())[featureId]
    let route = feature && getRoute(feature) || {}
    if (typeof route === 'function') route = route(store)
    return wrapRoute({
      ...firstOptions,
      store,
      featureId,
      featureName,
      getRoute,
      route: {...route, ...props},
    })
  }
}

