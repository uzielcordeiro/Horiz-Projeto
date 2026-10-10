/**
 * Label shown for a launch inside the compact month list.
 *
 * Recurrences already carry their installment text (e.g. "Salário · 1/12"), so they
 * stay untouched. A single, non-repeating launch has no installment count, so it is
 * marked "1/1" — the same one-of-one shape the recurrences use.
 */
export function monthItemLabel(detail: string, isRecurring: boolean): string {
  return isRecurring ? detail : `${detail} · 1/1`;
}
