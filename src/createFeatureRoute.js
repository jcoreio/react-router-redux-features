// @flow

import wrapRoute from './wrapRoute'

import type {PlainRoute} from 'react-router'
import type {FirstOptions, SecondOptions} from './createFeatureRoute'
import optionsDefaults from './optionsDefaults'

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

