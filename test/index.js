import React from 'react'
import {mount} from 'enzyme'
import {expect} from 'chai'
import {Provider} from 'react-redux'
import {createStore, applyMiddleware, combineReducers} from 'redux'
import {createChildRoutesSelector, createGetChildRoutes} from '../src'
import {createMemoryHistory, Router} from 'react-router'
import {syncHistoryWithStore, routerReducer, routerMiddleware, push, replace} from 'react-router-redux'

import {
  composeReducers, featuresReducer, featureStatesReducer, featureReducersReducer,
  loadFeatureMiddleware, featureMiddlewaresMiddleware, addFeature,
  LOAD_FEATURE,
} from 'redux-features'

describe('react-router-redux-features', () => {
  let store, featurePromises, history

  const Root = () => <h1>Root</h1>
  const FooComponent = () => <h1>Foo</h1>
  const BarComponent = () => <h1>Bar</h1>
  const BazComponent = () => <h1>Baz</h1>

  const fooFeature = {
    rootRoutes: {
      path: 'foo',
    },
    load() {
      return Promise.resolve({
        ...fooFeature,
        rootRoutes: {
          ...fooFeature.rootRoutes,
          component: FooComponent,
        }
      })
    }
  }

  const barFeature = {
    rootRoutes: [
      {
        path: 'bar',
      },
      {
        path: 'baz',
      },
    ],
    load() {
      return Promise.resolve({
        ...barFeature,
        rootRoutes: [
          {
            path: 'bar',
            component: BarComponent,
          },
          {
            path: 'baz',
            indexRoute: {
              component: BazComponent,
            },
          },
        ]
      })
    }
  }

  const counterFeature = {
    rootRoutes: {
      path: 'counter',
    },
    load() {
      const route = store => {
        const Counter = () => <h1>{store.getState().counter}</h1>
        return {
          path: 'counter',
          getComponent: (nextState, callback) => callback(null, Counter),
        }
      }
      return Promise.resolve({
        ...counterFeature,
        rootRoutes: route,
      })
    }
  }

  const redirectFeature = {
    rootRoutes: {
      path: 'redirect',
    },
    load() {
      return Promise.resolve({
        ...redirectFeature,
        rootRoutes: {
          path: 'redirect',
          onEnter: (nextState, replace, callback) => {
            replace('/foo')
            callback()
          }
        },
      })
    }
  }

  beforeEach(() => {
    const reducer = composeReducers(
      combineReducers({
        routing: routerReducer,
        features: featuresReducer(),
        featureStates: featureStatesReducer(),
        counter: () => 1,
      }),
      featureReducersReducer()
    )

    featurePromises = []

    const memoryHistory = createMemoryHistory()

    store = createStore(
      reducer,
      applyMiddleware(
        routerMiddleware(memoryHistory),
        store => next => action => {
          const result = next(action)
          if (action.type === LOAD_FEATURE) featurePromises.push(result)
          return result
        },
        loadFeatureMiddleware(),
        featureMiddlewaresMiddleware(),
        // require('redux-logger'),
      )
    )

    history = syncHistoryWithStore(memoryHistory, store)

    store.dispatch(addFeature('foo', fooFeature))
    store.dispatch(addFeature('bar', barFeature))
    store.dispatch(addFeature('counter', counterFeature))
    store.dispatch(addFeature('redirect', redirectFeature))
  })

  it('with rematchRoutes', async function () {
    const FeatureStateAlert = ({featureName, featureState}) => (
      featureState instanceof Error
        ? <h1>Failed to load {featureName}: {featureState.message}</h1>
        : featureState === 'LOADING'
          ? <h1>Loading {featureName}...</h1>
          : <h1 />
    )

    const selectChildRoutes = createChildRoutesSelector({
      isServer: false,
      FeatureStateAlert,
      rematchRoutes: store => store.dispatch(replace(store.getState().routing.locationBeforeTransitions)),
    })

    const getChildRoutes = createGetChildRoutes(selectChildRoutes)

    const routes = {
      path: '/',
      indexRoute: {
        component: Root,
      },
      getChildRoutes: getChildRoutes(store, feature => feature.rootRoutes),
    }
    const comp = mount(
      <Provider store={store}>
        <Router history={history} routes={routes} />
      </Provider>
    )
    expect(comp.text()).to.equal('Root')

    store.dispatch(push('/redirect'))
    await new Promise(resolve => resolve())
    expect(store.getState().featureStates.redirect).to.equal('LOADING')
    await Promise.all(featurePromises)
    expect(store.getState().featureStates.foo).to.equal('LOADING')
    await new Promise(resolve => resolve())
    expect(comp.text()).to.equal('Loading foo...')
    await Promise.all(featurePromises)
    expect(comp.text()).to.equal('Foo')
    expect(store.getState().featureStates.foo).to.equal('LOADED')
    expect(store.getState().featureStates.bar).to.equal('NOT_LOADED')

    featurePromises = []
    store.dispatch(push('/baz'))
    await new Promise(resolve => resolve())
    expect(store.getState().featureStates.bar).to.equal('LOADING')
    expect(comp.text()).to.equal('Loading bar...')
    await Promise.all(featurePromises)
    expect(comp.text()).to.equal('Baz')
    expect(store.getState().featureStates.bar).to.equal('LOADED')

    featurePromises = []
    store.dispatch(push('/counter'))
    await new Promise(resolve => resolve())
    expect(store.getState().featureStates.counter).to.equal('LOADING')
    expect(comp.text()).to.equal('Loading counter...')
    await Promise.all(featurePromises)
    expect(comp.text()).to.equal('1')
    expect(store.getState().featureStates.counter).to.equal('LOADED')
  })
  it('with isServer', async function () {
    const FeatureStateAlert = ({featureName, featureState}) => (
      featureState instanceof Error
        ? <h1>Failed to load {featureName}: {featureState.message}</h1>
        : featureState === 'LOADING'
        ? <h1>Loading {featureName}...</h1>
        : <h1 />
    )

    const selectChildRoutes = createChildRoutesSelector({
      isServer: true,
      FeatureStateAlert,
    })

    const getChildRoutes = createGetChildRoutes(selectChildRoutes)

    const routes = {
      path: '/',
      indexRoute: {
        component: Root,
      },
      getChildRoutes: getChildRoutes(store, feature => feature.rootRoutes),
    }
    const comp = mount(
      <Provider store={store}>
        <Router history={history} routes={routes} />
      </Provider>
    )
    expect(comp.text()).to.equal('Root')

    store.dispatch(push('/foo'))
    await new Promise(resolve => resolve())
    expect(store.getState().featureStates.foo).to.equal('LOADING')
    await Promise.all(featurePromises)
    expect(store.getState().featureStates.foo).to.equal('LOADED')
    expect(store.getState().featureStates.bar).to.equal('NOT_LOADED')

    featurePromises = []
    store.dispatch(push('/baz'))
    await new Promise(resolve => resolve())
    expect(store.getState().featureStates.bar).to.equal('LOADING')
    await Promise.all(featurePromises)
    expect(store.getState().featureStates.bar).to.equal('LOADED')

    featurePromises = []
    store.dispatch(push('/counter'))
    await new Promise(resolve => resolve())
    expect(store.getState().featureStates.counter).to.equal('LOADING')
    await Promise.all(featurePromises)
    expect(store.getState().featureStates.counter).to.equal('LOADED')
  })
})
