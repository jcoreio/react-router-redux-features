// @flow

import type {PlainRoute, RouterState, RouteComponent} from 'react-router'
import {connect} from 'react-redux'
import {loadFeature} from 'redux-features'
import type {FeatureState} from 'redux-features'
import {createSelector} from 'reselect'
import type {Options} from './wrapRoute'

export default function wrapRoute<S, A>(
  options: Options<S, A>
): PlainRoute {
  const {store, featureId, featureName, getFeatureStates, rematchRoutes, isServer} = options
  const route = typeof options.route === 'function' ? options.route(store) : options.route
  const result = {...route}

  const selectFeatureState: (state: S) => FeatureState = createSelector(
    getFeatureStates,
    featureStates => featureStates[featureId]
  )

  const FeatureStateAlert = options.FeatureStateAlert && connect(createSelector(
    selectFeatureState,
    featureState => ({featureId, featureName, featureState})
  ))(options.FeatureStateAlert)

  delete result.component

  result.getComponent = (nextState: RouterState, callback: (error: ?Error, component?: ?RouteComponent) => any) => {
    const featureState = selectFeatureState(store.getState())

    if (featureState !== 'LOADED') {
      callback(null, FeatureStateAlert)
    } else if (route.getComponent) {
      route.getComponent(nextState, callback)
    } else if (route.component) {
      callback(null, route.component)
    } else {
      callback(null, null)
    }
  }

  result.onEnter = (nextState: any, replace: any, callback: (error: ?Error) => any) => {
    let promise = Promise.resolve()
    if (selectFeatureState(store.getState()) === 'NOT_LOADED') {
      promise = (store.dispatch(loadFeature(featureId)): any)
      if (rematchRoutes) promise.then(() => rematchRoutes(store))
    }
    const waitOnServerOnly = isServer ? promise : Promise.resolve()
    waitOnServerOnly.then(() => route.onEnter
      ? route.onEnter(nextState, replace, callback)
      : callback(null)
    ).catch(error => callback(error))
  }

  return result
}

