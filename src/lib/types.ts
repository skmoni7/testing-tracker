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
  sellerName: string          // seller name (optional, defaults to '')
  price: number
  commissionAmount: number    // commission (optional, defaults to 0)
  amountCredited: number      // new: actual amount credited/received for this order
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
