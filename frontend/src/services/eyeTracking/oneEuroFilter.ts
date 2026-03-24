/**
 * One-Euro Filter — 단일 축 저역통과 필터
 * 참고: http://cristal.univ-lille.fr/~casiez/1euro/
 */

function computeOneEuroAlpha(cutoff: number, timeElapsedSeconds: number) {
  if (timeElapsedSeconds <= 0) {
    return 1
  }

  const tau = 1 / (2 * Math.PI * cutoff)
  return 1 / (1 + tau / timeElapsedSeconds)
}

export class OneEuroAxis {
  private readonly minCutoff: number

  private readonly beta: number

  private previousValue: number | null = null

  private previousDerivative = 0

  constructor(minCutoff: number, beta: number) {
    this.minCutoff = minCutoff
    this.beta = beta
  }

  update(value: number, timeElapsedSeconds: number) {
    const safeTimeElapsed = timeElapsedSeconds > 0 ? timeElapsedSeconds : 0.033

    if (this.previousValue === null) {
      this.previousValue = value
      return value
    }

    const rawDerivative = (value - this.previousValue) / safeTimeElapsed
    const derivativeAlpha = computeOneEuroAlpha(this.minCutoff, safeTimeElapsed)
    const filteredDerivative =
      derivativeAlpha * rawDerivative + (1 - derivativeAlpha) * this.previousDerivative
    const cutoff = this.minCutoff + this.beta * Math.abs(filteredDerivative)
    const valueAlpha = computeOneEuroAlpha(cutoff, safeTimeElapsed)
    const filteredValue = valueAlpha * value + (1 - valueAlpha) * this.previousValue

    this.previousValue = filteredValue
    this.previousDerivative = filteredDerivative

    return filteredValue
  }

  reset() {
    this.previousValue = null
    this.previousDerivative = 0
  }
}
