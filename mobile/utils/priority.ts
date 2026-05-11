// ======================================================
// PRIORITY COLOR LOGIC
// Matches the same logic as the web app
// ======================================================

// ----- Returns a hex color based on order status -----
export function getPriorityColor(
  delivered: boolean,
  reviewWritten: boolean,
  paymentReceived: boolean
): string {
  if (!delivered && !reviewWritten && !paymentReceived) return '#FF4444'; // Red - top priority
  if (delivered && !reviewWritten && !paymentReceived) return '#FF8800';  // Orange
  if (delivered && reviewWritten && !paymentReceived) return '#FFD700';   // Yellow
  return '#4CAF50'; // Green - Done
}

// ----- Returns label text based on order status -----
export function getStatusLabel(
  delivered: boolean,
  reviewWritten: boolean,
  paymentReceived: boolean
): string {
  if (paymentReceived) return 'Done';
  if (delivered && reviewWritten) return 'Pending Pay';
  if (delivered) return 'Need Review';
  return 'Undelivered';
}

// ----- Amt Cr color: green if >= total, red if less -----
export function getAmtCrColor(amtCr: number, total: number): string {
  if (amtCr <= 0) return '#888';
  return amtCr >= total ? '#4CAF50' : '#FF4444';
}
