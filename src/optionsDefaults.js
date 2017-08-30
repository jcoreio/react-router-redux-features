import defaults from 'lodash.defaults'

const defaultValues = {
  getFeatureStates: state => state.featureStates,
  getFeatures: state => state.features,
  getFeatureName: featureId => featureId,
}

export default function optionsDefaults(options) {
  return defaults({}, options, defaultValues)
}

