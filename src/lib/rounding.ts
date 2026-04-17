/** Banker's rounding (round-half-to-even) to 2 decimal places. */
export function bankersRound(num: number): number {
  const multiplier = 100;
  const shiftedNumber = num * multiplier;
  const integerPart = Math.floor(shiftedNumber);
  const fractionPart = shiftedNumber - integerPart;
  const errorMargin = 1e-8;

  const isExactlyHalf = fractionPart > 0.5 - errorMargin && fractionPart < 0.5 + errorMargin;
  const isEven = integerPart % 2 === 0;

  const roundedShifted = isExactlyHalf
    ? (isEven ? integerPart : integerPart + 1)
    : Math.round(shiftedNumber);

  return roundedShifted / multiplier;
}
