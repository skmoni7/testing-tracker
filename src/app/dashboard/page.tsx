// ======================================================
// DASHBOARD PAGE
// Shows all orders in a horizontal table row on PC
// Mobile: compact card layout
// Color-coded by priority (computed from booleans)
// ======================================================
'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { Order } from '@/lib/types';
import { useRouter } from 'next/navigation';

// ----- Priority color logic (computed, not stored) -----
function getPriorityColor(order: Order): string {
  if (order.paymentReceived) return 'border-green-400 bg-green-50 dark:bg-green-950';
  if (order.delivered && order.reviewWritten) return 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950';
  if (order.delivered) return 'border-orange-400 bg-orange-50 dark:bg-orange-950';
  return 'border-red-400 bg-red-50 dark:bg-red-950';
}

function getPriorityDot(order: Order): string {
  if (order.paymentReceived) return 'bg-green-500';
  if (order.delivered && order.reviewWritten) return 'bg-yellow-500';
  if (order.delivered) return 'bg-orange-500';
  return 'bg-red-500';
}

function getPriorityLabel(order: Order): string {
  if (order.paymentReceived) return 'Done';
  if (order.delivered && order.reviewWritten) return 'Pending Pay';
  if (order.delivered) return 'Need Review';
  return 'Undelivered';
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // ----- State -----
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(true);

  // ----- Dark mode toggle -----
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  // ----- Redirect if not logged in -----
  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  // ----- Subscribe to orders from Firestore -----
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // ----- Toggle a boolean field and record timestamp -----
  const toggleField = async (
    orderId: string,
    field: 'delivered' | 'reviewWritten' | 'paymentReceived',
    current: boolean
  ) => {
    const tsField = field === 'delivered' ? 'deliveredAt'
      : field === 'reviewWritten' ? 'reviewWrittenAt'
      : 'paymentReceivedAt';
    await updateDoc(doc(db, 'orders', orderId), {
      [field]: !current,
      [tsField]: !current ? Timestamp.now() : null,
    });
  };

  // ----- Delete an order -----
  const deleteOrder = async (id: string) => {
    if (!confirm('Delete this order?')) return;
    await deleteDoc(doc(db, 'orders', id));
  };

  // ----- Format timestamp tiny -----
  const fmtTs = (ts: Timestamp | null) => {
    if (!ts) return '';
    const d = ts.toDate();
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // ----- Render -----
  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">

        {/* ----- Navbar ----- */}
        <nav className="bg-white dark:bg-gray-800 shadow px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <span className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">ProTrack</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setDark(!dark)}
              className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              {dark ? 'Light' : 'Dark'}
            </button>
            <button onClick={() => router.push('/add')}
              className="bg-indigo-600 text-white text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition">
              + Add
            </button>
            <button onClick={logout}
              className="text-sm text-red-500 hover:underline">Logout</button>
          </div>
        </nav>

        {/* ----- Content area ----- */}
        <div className="p-4">

          {loading && <p className="text-center text-gray-400 py-10">Loading...</p>}

          {!loading && orders.length === 0 && (
            <p className="text-center text-gray-400 py-10">No records yet. Click + Add to start.</p>
          )}

          {/* ===== PC: Horizontal Table Layout (hidden on mobile) ===== */}
          {!loading && orders.length > 0 && (
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-left">
                    <th className="px-3 py-2 w-3"></th>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Order #</th>
                    <th className="px-3 py-2">Market</th>
                    <th className="px-3 py-2">Seller</th>
                    <th className="px-3 py-2">Review</th>
                    <th className="px-3 py-2">PayPal</th>
                    <th className="px-3 py-2 text-right">Product $</th>
                    <th className="px-3 py-2 text-right">Commission $</th>
                    <th className="px-3 py-2 text-right font-bold">Total $</th>
                    <th className="px-3 py-2 text-center">Delivered</th>
                    <th className="px-3 py-2 text-center">Review</th>
                    <th className="px-3 py-2 text-center">Paid</th>
                    <th className="px-3 py-2 text-center">Status</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => {
                    const commission = order.commissionAmount || 0;
                    const total = order.price + commission;
                    return (
                      <tr key={order.id}
                        className={`border-l-4 ${getPriorityColor(order)} dark:text-gray-200 hover:opacity-90 transition`}>

                        {/* Priority dot */}
                        <td className="px-3 py-2">
                          <span className={`inline-block w-2 h-2 rounded-full ${getPriorityDot(order)}`}></span>
                        </td>

                        {/* Product name */}
                        <td className="px-3 py-2 font-semibold text-gray-800 dark:text-white whitespace-nowrap">{order.productName}</td>

                        {/* Order number */}
                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400 text-xs font-mono whitespace-nowrap">{order.orderNumber}</td>

                        {/* Marketplace */}
                        <td className="px-3 py-2 whitespace-nowrap">{order.marketplace}</td>

                        {/* Seller name - tiny */}
                        <td className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{order.sellerName || '—'}</td>

                        {/* Review type */}
                        <td className="px-3 py-2 text-xs text-gray-500">{order.reviewType === 'text+pic' ? 'Txt+Pic' : 'Text'}</td>

                        {/* PayPal */}
                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{order.paypalAccount}</td>

                        {/* Product amount - tiny */}
                        <td className="px-3 py-2 text-right text-xs text-gray-400">${order.price.toFixed(2)}</td>

                        {/* Commission - tiny */}
                        <td className="px-3 py-2 text-right text-xs text-gray-400">{commission > 0 ? `$${commission.toFixed(2)}` : '—'}</td>

                        {/* Total - bold main display */}
                        <td className="px-3 py-2 text-right font-bold text-gray-800 dark:text-white whitespace-nowrap">${total.toFixed(2)}</td>

                        {/* Delivered checkbox */}
                        <td className="px-3 py-2 text-center">
                          <div className="flex flex-col items-center">
                            <input type="checkbox" checked={order.delivered}
                              onChange={() => toggleField(order.id, 'delivered', order.delivered)}
                              className="w-4 h-4 accent-indigo-600 cursor-pointer" />
                            {order.deliveredAt && <span className="text-[9px] text-gray-400 mt-0.5">{fmtTs(order.deliveredAt)}</span>}
                          </div>
                        </td>

                        {/* Review written checkbox */}
                        <td className="px-3 py-2 text-center">
                          <div className="flex flex-col items-center">
                            <input type="checkbox" checked={order.reviewWritten}
                              onChange={() => toggleField(order.id, 'reviewWritten', order.reviewWritten)}
                              className="w-4 h-4 accent-indigo-600 cursor-pointer" />
                            {order.reviewWrittenAt && <span className="text-[9px] text-gray-400 mt-0.5">{fmtTs(order.reviewWrittenAt)}</span>}
                          </div>
                        </td>

                        {/* Payment received checkbox */}
                        <td className="px-3 py-2 text-center">
                          <div className="flex flex-col items-center">
                            <input type="checkbox" checked={order.paymentReceived}
                              onChange={() => toggleField(order.id, 'paymentReceived', order.paymentReceived)}
                              className="w-4 h-4 accent-green-600 cursor-pointer" />
                            {order.paymentReceivedAt && <span className="text-[9px] text-gray-400 mt-0.5">{fmtTs(order.paymentReceivedAt)}</span>}
                          </div>
                        </td>

                        {/* Status badge */}
                        <td className="px-3 py-2 text-center">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            order.paymentReceived ? 'bg-green-200 text-green-800' :
                            order.delivered && order.reviewWritten ? 'bg-yellow-200 text-yellow-800' :
                            order.delivered ? 'bg-orange-200 text-orange-800' :
                            'bg-red-200 text-red-800'
                          }`}>{getPriorityLabel(order)}</span>
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <button onClick={() => router.push(`/edit/${order.id}`)}
                            className="text-indigo-500 hover:underline text-xs mr-2">Edit</button>
                          <button onClick={() => deleteOrder(order.id)}
                            className="text-red-500 hover:underline text-xs">Del</button>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ===== MOBILE: Card Layout (hidden on PC) ===== */}
          {!loading && orders.length > 0 && (
            <div className="md:hidden space-y-3">
              {orders.map(order => {
                const commission = order.commissionAmount || 0;
                const total = order.price + commission;
                return (
                  <div key={order.id}
                    className={`rounded-xl border-l-4 shadow-sm p-4 ${getPriorityColor(order)}`}>

                    {/* Top row: product name + status */}
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">{order.productName}</p>
                        <p className="text-xs text-gray-500 font-mono">{order.orderNumber}</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{order.marketplace}</p>
                        {order.sellerName && <p className="text-[11px] text-gray-400">{order.sellerName}</p>}
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        order.paymentReceived ? 'bg-green-200 text-green-800' :
                        order.delivered && order.reviewWritten ? 'bg-yellow-200 text-yellow-800' :
                        order.delivered ? 'bg-orange-200 text-orange-800' :
                        'bg-red-200 text-red-800'
                      }`}>{getPriorityLabel(order)}</span>
                    </div>

                    {/* Amount row */}
                    <div className="flex gap-3 items-baseline mb-2">
                      <span className="font-bold text-lg text-gray-800 dark:text-white">${total.toFixed(2)}</span>
                      <span className="text-xs text-gray-400">Prod: ${order.price.toFixed(2)}</span>
                      {commission > 0 && <span className="text-xs text-gray-400">Comm: ${commission.toFixed(2)}</span>}
                    </div>

                    {/* Info row */}
                    <p className="text-xs text-gray-500 mb-2">{order.reviewType === 'text+pic' ? 'Text + Pic' : 'Text only'} · {order.paypalAccount}</p>

                    {/* Checkboxes */}
                    <div className="flex gap-4 mb-3">
                      {(['delivered', 'reviewWritten', 'paymentReceived'] as const).map(field => {
                        const label = field === 'delivered' ? 'Delivered' : field === 'reviewWritten' ? 'Review' : 'Paid';
                        const tsField = field === 'delivered' ? order.deliveredAt : field === 'reviewWritten' ? order.reviewWrittenAt : order.paymentReceivedAt;
                        return (
                          <div key={field} className="flex flex-col items-center gap-0.5">
                            <input type="checkbox" checked={order[field]}
                              onChange={() => toggleField(order.id, field, order[field])}
                              className="w-4 h-4 accent-indigo-600 cursor-pointer" />
                            <span className="text-[10px] text-gray-500">{label}</span>
                            {tsField && <span className="text-[9px] text-gray-400">{fmtTs(tsField)}</span>}
                          </div>
                        );
                      })}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button onClick={() => router.push(`/edit/${order.id}`)}
                        className="text-indigo-500 hover:underline text-sm">Edit</button>
                      <button onClick={() => deleteOrder(order.id)}
                        className="text-red-500 hover:underline text-sm">Delete</button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
