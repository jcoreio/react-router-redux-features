// @flow

import type {GetChildRoutes} from 'react-router'
import type {Store} from 'redux'
import type {PlainRoute} from 'react-router'

import type {GetRoutes} from './wrapRoute'

export default function createGetChildRoutes<S, A>(
  createChildRoutesSelector: (getRoutes: GetRoutes<S, A>) => (store: Store<S, A>) => Array<PlainRoute>
): (store: Store<S, A>, getRoutes: GetRoutes<S, A>) => GetChildRoutes {
  return (store: Store<S, A>, getRoutes: GetRoutes<S, A>) => {
    const selectChildRoutes = createChildRoutesSelector(getRoutes)
    return (partialNextState: any, callback: (error: ?Error, childRoutes?: ?Array<PlainRoute>) => any) => {
      callback(null, selectChildRoutes(store))
    }
  }
}

