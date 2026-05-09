// ============================================================
// DATA TYPES
// Defines the structure of an Order and a Marketplace
// ============================================================

export type ReviewType = 'text' | 'text_and_picture'
export type PaypalAccount = 'Shanu PP' | 'Jisa PP'

export interface Order {
  id?: string                      // Firestore document ID
  productName: string              // Required
  orderNumber: string              // Required
  marketplace: string              // Required (Amazon, Walmart, or custom)
  orderDate: string                // Required (date of purchase)
  price: number                    // Required
  reviewType: ReviewType           // Required
  paypalAccount: PaypalAccount     // Required

  // ---- Status booleans (computed into priority color) ----
  isDelivered: boolean
  isReviewWritten: boolean
  isPaymentReceived: boolean

  // ---- Optional timestamps for each status change ----
  deliveredAt?: string | null
  reviewWrittenAt?: string | null
  paymentReceivedAt?: string | null

  // ---- Optional review info ----
  reviewDate?: string
  reviewPostedDate?: string

  createdAt: string
  userId: string                   // Firebase Auth UID
}

export interface Marketplace {
  id?: string
  name: string
  userId: string
}
