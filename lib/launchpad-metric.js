'use strict'

module.exports = {
  createLaunchpadMetric
}

function createLaunchpadMetric(params) {
  return new LaunchpadMetric(params)
}

class LaunchpadMetric {
  constructor(params) {
    this.launchpad = params.launchpad

    /** @type { number[] } */
    this.history = []

    this.min = params.min
    this.max = params.max
  
    const mid = (this.max + this.min) / 2
    this.rounder = mid <= 1 ? floatRounder : intRounder

    this.current = this.round(mid)
  }

  next() {
    return this.current
  }

  round(value) {
    return this.rounder(value)
  }

  /** @type { (value: number) => void } */
  valueIndexed(value) {
    this.history.push(value)
    while (this.history.length > 8) {
      this.history.shift()
    }
  }
}

/** @type { (value: number) => number} */
function intRounder(value) {
  return Math.round(value)
}

/** @type { (value: number) => number} */
function floatRounder(value) {
  return Math.round(value * 100) / 100
}

