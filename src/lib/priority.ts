// ============================================================
// PRIORITY CALCULATOR
// Computes card color based on 3 status booleans
// This is NEVER stored in Firestore - calculated on the fly
// ============================================================

export type PriorityLevel = 'top' | 'second' | 'third' | 'done'

export function getPriority(
  isDelivered: boolean,
  isReviewWritten: boolean,
  isPaymentReceived: boolean
): PriorityLevel {
  // Payment received = instant Done (full bypass)
  if (isPaymentReceived) return 'done'

  // All three false = highest urgency
  if (!isDelivered && !isReviewWritten) return 'top'

  // Delivered but no review yet
  if (isDelivered && !isReviewWritten) return 'second'

  // Delivered + review written, payment pending
  if (isDelivered && isReviewWritten) return 'third'

  return 'top'
}

// ============================================================
// COLOR MAPPING for each priority level
// ============================================================
export const priorityColors: Record<PriorityLevel, string> = {
  top: 'border-l-4 border-red-500 bg-red-50 dark:bg-red-950/40',
  second: 'border-l-4 border-orange-400 bg-orange-50 dark:bg-orange-950/40',
  third: 'border-l-4 border-yellow-400 bg-yellow-50 dark:bg-yellow-950/40',
  done: 'border-l-4 border-green-400 bg-green-100 dark:bg-green-900/40',
}
