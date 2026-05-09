// ======================================================
// TYPES
// Shared TypeScript interfaces for ProTrack
// ======================================================
import { Timestamp } from 'firebase/firestore'

// ----- Order record structure -----
export interface Order {
  id: string
  userId: string
  productName: string
  orderNumber: string
  marketplace: string
  sellerName: string          // new: seller name (optional, defaults to '')
  price: number
  commissionAmount: number    // new: commission (optional, defaults to 0)
  reviewType: 'text' | 'text+pic'
  paypalAccount: 'Shanu PP' | 'Jisa PP'
  delivered: boolean
  reviewWritten: boolean
  paymentReceived: boolean
  deliveredAt: Timestamp | null
  reviewWrittenAt: Timestamp | null
  paymentReceivedAt: Timestamp | null
  createdAt: Timestamp
}
