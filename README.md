# react-router-redux-features

[![Build Status](https://travis-ci.org/jcoreio/react-router-redux-features.svg?branch=master)](https://travis-ci.org/jcoreio/react-router-redux-features)
[![Coverage Status](https://coveralls.io/repos/github/jcoreio/react-router-redux-features/badge.svg?branch=master)](https://coveralls.io/github/jcoreio/react-router-redux-features?branch=master)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

react-router v3 integration for redux-features

## Usage

```sh
npm install --save react-router-redux-features
```

### Create a `featureRoutes.js` file in your app

In this file, you call `react-router-redux-features`' `createChildRoutesSelector` with customization that's global to
your app:

```js
import {createChildRoutesSelector, createGetChildRoutes} from 'react-router-redux-features'
import {replace} from 'react-router-redux'

const FeatureStateAlert = ({featureName, featureState}) => (
  featureState instanceof Error
    ? <h1>Failed to load {featureName}: {featureState.message}</h1>
    : featureState === 'LOADING'
      ? <h1>Loading {featureName}...</h1>
      : <h1 />
)

const appCreateChildRoutesSelector = createChildRoutesSelector({
  // These are the default getters; you can customize them if the state lives elsewhere
  getFeatureStates: state => state.featureStates,
  getFeatures: state => state.features,
  getFeatureName: (featureId, feature) => featureId,

  // By providing this function, any time state.features changes, it will replace the location with itself
  // to force Router to rematch the routes to the location.
  rematchRoutes: store => store.dispatch(replace(store.getState().routing.locationBeforeTransitions)),

  // This component renders the feature status if it's loading or failed to load.
  FeatureStateAlert,

  // Set this to true if you're doing server-side rendering to automatically add/wrap onEnter hooks to each
  // feature route that wait until the feature has been loaded
  isServer: false,
})

export {appCreateChildRoutesSelector as createChildRoutesSelector}

export const getChildRoutes = createGetChildRoutes(appCreateChildRoutesSelector)
```

### Create a parent route

In this file, you create a route that gets its child routes from the redux features.

```js
import {getChildRoutes} from './featureRoutes'

export default store => {
  path: '/',
  getChildRoutes: getChildRoutes(store, feature => feature.rootRoutes),
}
```

### Create child routes in features

```js
import {addFeature} from 'redux-features'
import merge from 'lodash.merge'
import store from './store'

const fooFeature = {
  // this can be a single PlainRoute or an array of PlainRoutes, or a function that takes a store and returns either one
  rootRoutes: {
    path: 'foo',
  },
  load: async () => {
    // Load a component and add it to the route
    return merge(fooFeature, {
      rootRoutes: {
        component: (await import('./Foo')).default,
      },
    })
  },
}

store.dispatch(addFeature('foo', fooFeature))
```

Now whenever the user navigates to `/foo`, `react-router-redux-features` will automatically load `fooFeature`.  It wraps
`fooFeature.rootRoutes` to render a `FeatureStatusAlert` while `fooFeature` is loading (or if it fails to load).  Once
`fooFeature` is loaded, it now has `rootRoutes.component` that gets rendered in place of the `FeatureStatusAlert`.

### Accessing the store from feature routes

Your feature routes can be a `(store: Store) => ?(PlainRoute | Array<PlainRoute>)` function:

```js
const fooFeature = {
  rootRoutes: store => {
    path: 'foo',
    onEnter: () => store.dispatch(/* some action */),
  },
  ...
}
```

### Merging feature routes into hardcoded child routes

```js
import {createChildRouteSelector} from './featureRoutes'

// create a selector that looks for a rootRoutes property on each feature.
// (nothing will break if any features lack this property)
const selectRootRoutes = createChildRouteSelector(feature => feature.rootRoutes)

const About = () => <h1>About</h1>

export default store => {
  path: '/',
  getChildRoutes: (nextState, callback) => {
    const featureRoutes = selectRootRoutes(store)
    return [
      ...featureRoutes,
      {
        path: 'about',
        component: About,
      }
    ]
  }
}
```

