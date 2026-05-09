'use client';

/* ---- Imports ---- */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { Order } from '@/lib/types';
import { getPriorityColor, getPriorityLabel } from '@/lib/priority';
import Link from 'next/link';

/* ---- Helper: format tiny timestamp ---- */
function fmtTs(ts: Timestamp | null | undefined): string {
  if (!ts) return '';
  const d = ts.toDate();
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/* ---- Dashboard Page ---- */
export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  /* ---- State ---- */
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  /* ---- Redirect if not logged in ---- */
  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  /* ---- Real-time Firestore listener ---- */
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
      setOrders(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  /* ---- Toggle boolean field and save auto-timestamp ---- */
  async function toggleField(
    id: string,
    field: 'delivered' | 'reviewWritten' | 'paymentReceived'
  ) {
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    const newVal = !order[field];
    const tsField =
      field === 'delivered' ? 'deliveredAt'
      : field === 'reviewWritten' ? 'reviewWrittenAt'
      : 'paymentReceivedAt';
    await updateDoc(doc(db, 'orders', id), {
      [field]: newVal,
      [tsField]: newVal ? Timestamp.now() : null,
    });
  }

  /* ---- Delete order ---- */
  async function deleteOrder(id: string) {
    if (!confirm('Delete this record?')) return;
    await deleteDoc(doc(db, 'orders', id));
  }

  if (!user) return null;

  /* ---- Render ---- */
  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">

        {/* ---- Top Nav ---- */}
        <nav className="bg-white dark:bg-gray-800 shadow px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-indigo-600 dark:text-indigo-400">ProTrack</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700"
            >
              {darkMode ? 'Light' : 'Dark'}
            </button>
            <Link href="/add"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-1 rounded">
              + Add
            </Link>
            <button onClick={logout} className="text-sm text-red-400 hover:text-red-500">
              Logout
            </button>
          </div>
        </nav>

        {/* ---- Records List ---- */}
        <main className="max-w-3xl mx-auto px-4 py-6">
          {loading && <p className="text-center text-gray-400">Loading...</p>}
          {!loading && orders.length === 0 && (
            <p className="text-center text-gray-400">No records yet. Click + Add to start.</p>
          )}

          {orders.map((order) => {
            const colorClass = getPriorityColor(order);
            const label = getPriorityLabel(order);
            return (
              <div key={order.id}
                className={`relative mb-3 rounded-lg p-4 shadow border-l-4 bg-white dark:bg-gray-800 ${colorClass}`}
              >
                {/* ---- Done badge ---- */}
                {label === 'Done' && (
                  <span className="absolute top-2 right-2 text-xs font-bold text-green-500">Done</span>
                )}

                {/* ---- Product info ---- */}
                <p className="text-xs text-gray-400 uppercase tracking-wide">{order.productName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-mono">{order.orderNumber}</p>
                <p className="text-sm">{order.marketplace}</p>
                <p className="text-sm font-semibold">${order.price}</p>
                <p className="text-xs text-gray-500">Review: {order.reviewType === 'textAndPic' ? 'Text + Pic' : 'Text only'}</p>
                <p className="text-xs text-gray-500">PayPal: {order.paypalAccount}</p>

                {/* ---- Checkbox row ---- */}
                <div className="flex gap-6 mt-3 flex-wrap">
                  {/* Delivered checkbox */}
                  <label className="flex flex-col items-center cursor-pointer">
                    <input type="checkbox" checked={order.delivered}
                      onChange={() => toggleField(order.id!, 'delivered')}
                      className="w-4 h-4 accent-indigo-500" />
                    <span className="text-xs mt-0.5">Delivered</span>
                    {order.deliveredAt && <span className="text-[9px] text-gray-400">{fmtTs(order.deliveredAt)}</span>}
                  </label>

                  {/* Review Written checkbox */}
                  <label className="flex flex-col items-center cursor-pointer">
                    <input type="checkbox" checked={order.reviewWritten}
                      onChange={() => toggleField(order.id!, 'reviewWritten')}
                      className="w-4 h-4 accent-indigo-500" />
                    <span className="text-xs mt-0.5">Review</span>
                    {order.reviewWrittenAt && <span className="text-[9px] text-gray-400">{fmtTs(order.reviewWrittenAt)}</span>}
                  </label>

                  {/* Payment Received checkbox */}
                  <label className="flex flex-col items-center cursor-pointer">
                    <input type="checkbox" checked={order.paymentReceived}
                      onChange={() => toggleField(order.id!, 'paymentReceived')}
                      className="w-4 h-4 accent-green-500" />
                    <span className="text-xs mt-0.5">Paid</span>
                    {order.paymentReceivedAt && <span className="text-[9px] text-gray-400">{fmtTs(order.paymentReceivedAt)}</span>}
                  </label>
                </div>

                {/* ---- Edit / Delete ---- */}
                <div className="flex gap-3 mt-3">
                  <Link href={`/edit/${order.id}`} className="text-xs text-indigo-400 hover:text-indigo-500">Edit</Link>
                  <button onClick={() => deleteOrder(order.id!)} className="text-xs text-red-400 hover:text-red-500">Delete</button>
                </div>
              </div>
            );
          })}
        </main>
      </div>
    </div>
  );
}
