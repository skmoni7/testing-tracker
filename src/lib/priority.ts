// ====================================================
// PRIORITY CALCULATOR
// Computes card color based on 3 status booleans
// This is NEVER stored in Firestore - calculated on the fly
// ====================================================
import { Order } from './types'

export type PriorityLevel = 'top' | 'second' | 'third' | 'done'

/* ---- Core priority logic from 3 booleans ---- */
export function getPriority(
  isDelivered: boolean,
  isReviewWritten: boolean,
  isPaymentReceived: boolean
): PriorityLevel {
  // Payment received = instant Done (full bypass)
  if (isPaymentReceived) return 'done'
  // Not delivered yet = highest urgency
  if (!isDelivered && !isReviewWritten) return 'top'
  // Delivered but no review yet
  if (isDelivered && !isReviewWritten) return 'second'
  // Delivered + review written, payment pending
  if (isDelivered && isReviewWritten) return 'third'
  return 'top'
}

/* ---- COLOR MAPPING for each priority level ---- */
// Returns a Tailwind border-left color class
export const priorityColors: Record<PriorityLevel, string> = {
  top: 'border-red-500',
  second: 'border-orange-400',
  third: 'border-yellow-400',
  done: 'border-green-400',
}

/* ---- getPriorityColor: returns the border color class for a card ---- */
export function getPriorityColor(order: Order): string {
  const level = getPriority(
    order.delivered,
    order.reviewWritten,
    order.paymentReceived
  )
  return priorityColors[level]
}

/* ---- getPriorityLabel: returns human-readable label for the status ---- */
export function getPriorityLabel(order: Order): string {
  const level = getPriority(
    order.delivered,
    order.reviewWritten,
    order.paymentReceived
  )
  if (level === 'done') return 'Done'
  return ''
}
