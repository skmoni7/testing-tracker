// ====================================================
// DATA TYPES
// Defines the structure of an Order and a Marketplace
// ====================================================
import { Timestamp } from 'firebase/firestore'

export type ReviewType = 'text' | 'textAndPic'
export type PaypalAccount = 'Shanu PP' | 'Jisa PP'

export interface Order {
  id?: string              // Firestore document ID
  productName: string      // Required
  orderNumber: string      // Required
  marketplace: string      // Required (Amazon, Walmart, or custom)
  price: number            // Required
  reviewType: ReviewType   // Required
  paypalAccount: PaypalAccount // Required
  userId: string           // Firebase Auth UID

  // ---- Status booleans (computed into priority color) ----
  delivered: boolean
  reviewWritten: boolean
  paymentReceived: boolean

  // ---- Optional timestamps for each status change ----
  deliveredAt?: Timestamp | null
  reviewWrittenAt?: Timestamp | null
  paymentReceivedAt?: Timestamp | null

  // ---- When the record was created ----
  createdAt?: Timestamp
}
