'use strict'

module.exports = {
  createMetric
}

function createMetric(initialValue, increment, min, max) {
  return new Metric(initialValue, increment, min, max)
}

class Metric {
  constructor(initialValue, increment, min, max) {
    this.currentValue = initialValue
    this.increment = increment
    this.min = min
    this.max = max
  }

  up() {
    if ((this.currentValue + this.increment) > this.max) return
    this.currentValue += this.increment
    this._round()
  }

  down() {
    if ((this.currentValue - this.increment) < this.min) return
    this.currentValue -= this.increment
    this._round()
  }
  
  // deal with rounding issues for 0 -> 1 ranges, round to 2 decimals
  _round() {
    if (this.max > 1) return

    this.currentValue = Math.round(100 *this.currentValue) / 100
  }
}