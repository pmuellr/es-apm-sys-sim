'use strict'

module.exports = {
  createRandomMetric
}

function createRandomMetric(params) {
  return new RandomMetric(params)
}

class RandomMetric {
  constructor(params) {
    this.index = 0

    this.min = params.min
    this.max = params.max

    const mid = (this.max + this.min) / 2
    this.rounder = mid <= 1 ? floatRounder : intRounder
    this.step = this.round((this.max - this.min) / 20)
    this.current = this.round(mid)
  }

  next() {
    const rand = Math.random()

    if (rand <= 0.33) this.current -= this.step
    else if (rand >= 0.66) this.current += this.step

    this.current = Math.max(this.current, this.min)
    this.current = Math.min(this.current, this.max)

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

