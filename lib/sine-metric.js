'use strict'

module.exports = {
  createSineMetric
}

function createSineMetric(params) {
  return new SineMetric(params)
}

class SineMetric {
  constructor(params) {
    this.index = 0

    this.min = params.min
    this.max = params.max
    this.period = params.period 

    const mid = (this.max + this.min) / 2
    this.rounder = mid <= 1 ? floatRounder : intRounder
    this.mid = this.round(mid)
    this.height = this.round((this.max - this.min) / 2)
  }

  next() {
    const x = Math.PI * 2 * this.index / this.period
    const y = Math.sin(x)

    const value = this.round(y * this.height + this.mid)

    this.index++
    if (this.index >= this.period) this.index = 0

    return value
  }

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

