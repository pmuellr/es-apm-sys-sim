'use strict'

module.exports = {
  createFlapMetric
}

function createFlapMetric(params) {
  return new FlapMetric(params)
}

class FlapMetric {
  constructor(params) {
    this.index = 0

    this.min = params.min
    this.max = params.max

    /** @type { number } */
    this.current = this.min
  }

  next() {
    if (this.current === this.min) {
      this.current = this.max
    } else {
      this.current = this.min
    }

    return this.current
  }

  inc() {}
  dec() {}

  round(value) {
    return this.rounder(value)
  }
}

function intRounder(value) {
  return Math.round(value)
}

function floatRounder(value) {
  return Math.round(value * 100) / 100
}

