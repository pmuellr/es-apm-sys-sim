'use strict'

module.exports = {
  createStepMetric
}

function createStepMetric(params) {
  return new StepMetric(params)
}

class StepMetric {
  constructor(params) {
    this.index = 0

    this.min = params.min
    this.max = params.max

    const mid = (this.max + this.min) / 2
    this.rounder = mid <= 1 ? floatRounder : intRounder
    this.step = this.round((this.max - this.min) / 20)
    /** @type { number } */
    this.current = this.round(mid)
  }

  inc() {
    this.current += this.step
    this.current = Math.max(this.current, this.min)
    this.current = Math.min(this.current, this.max)
  }

  dec() {
    this.current -= this.step
    this.current = Math.max(this.current, this.min)
    this.current = Math.min(this.current, this.max)
  }

  next() {
    return this.current
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

