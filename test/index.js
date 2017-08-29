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

import ChangeQueue from './ChangeQueue'

describe('react-router-redux-features', () => {
  let store, featurePromises, history

  const Root = () => <h1>Root</h1>
  const FooComponent = () => <h1>Foo</h1>
  const BarComponent = () => <h1>Bar</h1>
  const BazComponent = () => <h1>Baz</h1>
  const QuxComponent = () => <h1>Qux</h1>

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
            childRoutes: [{
              path: 'qux',
              component: QuxComponent,
            }],
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
        // require('redux-logger').default,
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


    let comp
    const textQueue = new ChangeQueue()
    function handleUpdate() {
      let text
      try {
        text = comp.text()
      } catch (error) {
        // ignore
      }
      if (text) textQueue.add(text)
    }

    const routes = {
      path: '/',
      indexRoute: {
        component: Root,
      },
      getChildRoutes: getChildRoutes(store, feature => feature.rootRoutes),
    }
    comp = mount(
      <Provider store={store}>
        <Router history={history} routes={routes} onUpdate={handleUpdate} />
      </Provider>
    )
    expect(comp.text()).to.equal('Root')

    store.dispatch(push('/redirect'))
    expect(await textQueue.poll()).to.equal('Loading redirect...')
    expect(await textQueue.poll()).to.equal('Loading foo...')
    expect(await textQueue.poll()).to.equal('Foo')

    store.dispatch(push('/baz'))
    expect(await textQueue.poll()).to.equal('Loading bar...')
    expect(await textQueue.poll()).to.equal('Baz')

    store.dispatch(push('/counter'))
    expect(await textQueue.poll()).to.equal('Loading counter...')
    expect(await textQueue.poll()).to.equal('1')
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

    let comp
    const textQueue = new ChangeQueue()
    function handleUpdate() {
      let text
      try {
        text = comp.text()
      } catch (error) {
        // ignore
      }
      if (text) textQueue.add(text)
    }

    const routes = {
      path: '/',
      indexRoute: {
        component: Root,
      },
      getChildRoutes: getChildRoutes(store, feature => feature.rootRoutes),
    }
    comp = mount(
      <Provider store={store}>
        <Router history={history} routes={routes} onUpdate={handleUpdate} />
      </Provider>
    )
    expect(comp.text()).to.equal('Root')

    store.dispatch(push('/foo'))
    expect(await textQueue.poll()).to.equal('Foo')

    store.dispatch(push('/baz'))
    expect(await textQueue.poll()).to.equal('Baz')

    store.dispatch(push('/baz/qux'))
    expect(await textQueue.poll()).to.equal('Qux')

    store.dispatch(push('/counter'))
    expect(await textQueue.poll()).to.equal('1')
  })
})
