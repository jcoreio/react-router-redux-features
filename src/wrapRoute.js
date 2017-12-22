// @flow

import type {PlainRoute, RouterState, RouteComponent} from 'react-router'
import type {Store} from 'redux'
import {connect} from 'react-redux'
import {loadFeature} from 'redux-features'
import type {Feature, Features, FeatureState, FeatureStates} from 'redux-features'
import {createSelector} from 'reselect'

import type {FeatureStateAlert as _FeatureStateAlert} from './index'

export type GetRoute<S, A> = (feature: Feature<S, A>) => ?PlainRoute
export type GetRoutes<S, A> = (feature: Feature<S, A>) => ?(PlainRoute | Array<PlainRoute>)

export type Options<S, A> = {
  route: PlainRoute | (store: Store<S, A>) => PlainRoute,
  getRoute?: GetRoute<S, A>,
  getRoutes?: GetRoutes<S, A>,
  store: Store<S, A>,
  featureId: string,
  featureName: string,
  isServer?: boolean,
  getFeatureStates: (state: S) => FeatureStates,
  getFeatures: (state: S) => Features<S, A>,
  rematchRoutes?: (store: Store<S, A>) => any,
  FeatureStateAlert?: _FeatureStateAlert,
}

export default function wrapRoute<S, A>(
  options: Options<S, A>
): PlainRoute {
  const {store, featureId, featureName, getFeatureStates, getFeatures, isServer, getRoute, getRoutes} = options
  const rematchRoutes = isServer ? null : options.rematchRoutes
  const route = typeof options.route === 'function' ? options.route(store) : options.route
  const result = {...route}

  const selectFeatureState: (state: S) => FeatureState = createSelector(
    getFeatureStates,
    featureStates => featureStates[featureId]
  )
  const selectFeature: (state: S) => Feature<S, A> = createSelector(
    getFeatures,
    features => features[featureId]
  )

  const optionsFeatureStateAlert = options.FeatureStateAlert
  const FeatureStateAlert = optionsFeatureStateAlert && connect(createSelector(
    selectFeatureState,
    featureState => ({featureId, featureName, featureState})
  ))(optionsFeatureStateAlert)

  const selectLoadedRoute: (state: S) => PlainRoute = createSelector(
    selectFeature,
    getRoute
      ? createSelector(
        getRoute,
        (route: ?(PlainRoute | (store: Store<S, A>) => PlainRoute)): PlainRoute =>
          typeof route === 'function' ? route(store) : (route || {})
      )
      : createSelector(
        getRoutes || (() => []),
        (routes: ?(PlainRoute | Array<PlainRoute>)): PlainRoute => {
          if (!routes) return {}
          if (!Array.isArray(routes)) routes = [routes]
          for (let other of routes) {
            if (typeof other === 'function') other = other(store)
            if (other.path === route.path) return other
          }
          return {}
        }
    )
  )

  delete result.component
  result.getComponent = (nextState: RouterState, callback: (error: ?Error, component?: ?RouteComponent) => any) => {
    const featureState = selectFeatureState(store.getState())

    if (featureState !== 'LOADED') {
      callback(null, FeatureStateAlert)
      return
    }
    const loadedRoute = selectLoadedRoute(store.getState())
    if (loadedRoute.getComponent) loadedRoute.getComponent(nextState, callback)
    else if (loadedRoute.component) callback(null, loadedRoute.component)
    else callback(null, null)
  }

  function wrapProperty<T>(valueName: string, getterName: string, defaultValue: T) {
    delete result[valueName]
    result[getterName] = (nextState: RouterState, callback: (error: ?Error, result?: ?T) => any) => {
      const promise: ?Promise<void> = selectFeatureState(store.getState()) === 'NOT_LOADED'
        ? (store.dispatch(loadFeature(featureId)): any)
        : null
      function done(): any {
        const loadedRoute = selectLoadedRoute(store.getState())
        if (loadedRoute[getterName]) return loadedRoute[getterName](nextState, callback)
        else if (loadedRoute[valueName]) callback(null, loadedRoute[valueName])
        else callback(null, isServer ? null : defaultValue)
      }
      if (promise) {
        if (isServer) {
          promise.then(done).catch(callback)
          return
        }
        else if (rematchRoutes) promise.then(() => rematchRoutes(store))
      }
      return done()
    }
  }

  wrapProperty('components', 'getComponents', (null: ?{[name: string]: RouteComponent}))
  wrapProperty('indexRoute', 'getIndexRoute', (null: ?PlainRoute))
  wrapProperty('childRoutes', 'getChildRoutes', ([{path: '*'}]: ?Array<PlainRoute>))

  result.onEnter = (nextState: any, replace: any, callback: (error: ?Error) => any) => {
    const promise: ?Promise<void> = selectFeatureState(store.getState()) === 'NOT_LOADED'
      ? (store.dispatch(loadFeature(featureId)): any)
      : null
    function done(): any {
      const loadedRoute = selectLoadedRoute(store.getState())
      if (loadedRoute.onEnter) return loadedRoute.onEnter(nextState, replace, callback)
      else callback(null)
    }
    if (promise) {
      if (isServer) {
        promise.then(done).catch(callback)
        return
      }
      else if (rematchRoutes) promise.then(() => rematchRoutes(store))
    }
    return done()
  }
  result.onChange = (prevState: any, nextState: any, replace: any, callback: (error: ?Error) => any) => {
    const loadedRoute = selectLoadedRoute(store.getState())
    if (loadedRoute.onChange) return loadedRoute.onChange(prevState, nextState, replace, callback)
    else callback()
  }
  result.onLeave = (prevState: any) => {
    const loadedRoute = selectLoadedRoute(store.getState())
    if (loadedRoute.onLeave) return loadedRoute.onLeave(prevState)
  }

  return result
}

