// @flow

export default class ChangeQueue<T> {
  lastValue: ?T
  values: Array<T>
  callbacks: Array<(value: T) => any> = []

  constructor(values: ?Array<T>) {
    this.values = values || []
  }

  poll(): Promise<T> {
    const result = new Promise(resolve => this.callbacks.push(resolve))
    this.handleCallbacks()
    return result
  }

  handleCallbacks() {
    const {values, callbacks} = this
    while (values.length && callbacks.length) callbacks.shift()(values.shift())
  }

  add(value: T) {
    const {values} = this
    if (value !== this.lastValue) {
      this.lastValue = value
      values.push(value)
      this.handleCallbacks()
    }
  }
}

