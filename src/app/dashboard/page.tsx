// ======================================================
// DASHBOARD PAGE
// Orders sorted by priority: most urgent on top, Done at bottom
// Full row color highlight based on status
// PC: horizontal table | Mobile: card layout
// Navbar: 4 summary boxes (Total / Comm / Received / Pending)
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

// ----- Priority score: lower = more urgent (sorted ascending) -----
// 0 = not delivered, no review, no payment  (RED - top)
// 1 = delivered only                        (ORANGE)
// 2 = delivered + review, no payment        (YELLOW)
// 3 = payment received                      (GREEN - bottom)
function getPriorityScore(order: Order): number {
  if (order.paymentReceived) return 3;
  if (order.delivered && order.reviewWritten) return 2;
  if (order.delivered) return 1;
  return 0;
}

// ----- Full row background color (entire row highlight) -----
function getRowBg(order: Order): string {
  if (order.paymentReceived)
    return 'bg-green-100 dark:bg-green-900 border-l-4 border-green-500';
  if (order.delivered && order.reviewWritten)
    return 'bg-yellow-50 dark:bg-yellow-900/40 border-l-4 border-yellow-500';
  if (order.delivered)
    return 'bg-orange-50 dark:bg-orange-900/30 border-l-4 border-orange-500';
  return 'bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500';
}

// ----- Card border color for mobile -----
function getCardBorder(order: Order): string {
  if (order.paymentReceived)
    return 'border-l-4 border-green-500 bg-green-100 dark:bg-green-900';
  if (order.delivered && order.reviewWritten)
    return 'border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/40';
  if (order.delivered)
    return 'border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-900/30';
  return 'border-l-4 border-red-500 bg-red-50 dark:bg-red-900/30';
}

// ----- Status label -----
function getLabel(order: Order): string {
  if (order.paymentReceived) return 'Done';
  if (order.delivered && order.reviewWritten) return 'Pending Pay';
  if (order.delivered) return 'Need Review';
  return 'Undelivered';
}

// ----- Status badge color -----
function getBadge(order: Order): string {
  if (order.paymentReceived) return 'bg-green-200 text-green-900';
  if (order.delivered && order.reviewWritten) return 'bg-yellow-200 text-yellow-900';
  if (order.delivered) return 'bg-orange-200 text-orange-900';
  return 'bg-red-200 text-red-900';
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
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

  // ----- Subscribe to Firestore orders -----
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      // ----- Sort by priority score ascending (0=urgent first, 3=done last) -----
      raw.sort((a, b) => getPriorityScore(a) - getPriorityScore(b));
      setOrders(raw);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // ----- Summary calculations -----
  // Total = sum of product prices only (no commission)
  const totalAmount = orders.reduce((sum, o) => sum + (o.price || 0), 0);
  // Comm = sum of commission amounts only
  const commAmount = orders.reduce((sum, o) => sum + (o.commissionAmount || 0), 0);
  // Received = total paid (product + commission)
  const receivedAmount = orders
    .filter(o => o.paymentReceived)
    .reduce((sum, o) => sum + (o.price || 0) + (o.commissionAmount || 0), 0);
  // Pending = everything not yet paid
  const pendingAmount = (totalAmount + commAmount) - receivedAmount;

  // ----- Toggle boolean field + record timestamp -----
  const toggleField = async (
    orderId: string,
    field: 'delivered' | 'reviewWritten' | 'paymentReceived',
    current: boolean
  ) => {
    const tsField =
      field === 'delivered'
        ? 'deliveredAt'
        : field === 'reviewWritten'
        ? 'reviewWrittenAt'
        : 'paymentReceivedAt';
    await updateDoc(doc(db, 'orders', orderId), {
      [field]: !current,
      [tsField]: !current ? Timestamp.now() : null,
    });
  };

  // ----- Delete order -----
  const deleteOrder = async (id: string) => {
    if (!confirm('Delete this order?')) return;
    await deleteDoc(doc(db, 'orders', id));
  };

  // ----- Format tiny timestamp -----
  const fmtTs = (ts: Timestamp | null) => {
    if (!ts) return '';
    const d = ts.toDate();
    return (
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' ' +
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">

      {/* ----- Navbar ----- */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-2 flex items-center justify-between gap-2">

        {/* Left: Logo */}
        <span className="text-indigo-600 font-bold text-lg whitespace-nowrap">ProTrack</span>

        {/* Center: 4 Summary Boxes */}
        {!loading && (
          <div className="flex items-center gap-2">

            {/* Total box - product $ only */}
            <div className="flex flex-col items-center px-3 py-1 rounded-lg border border-blue-400 bg-blue-600 text-white min-w-[72px]">
              <span className="text-[9px] font-semibold uppercase tracking-wide opacity-80">Total</span>
              <span className="text-sm font-bold">${totalAmount.toFixed(2)}</span>
            </div>

            {/* Comm box - commission only */}
            <div className="flex flex-col items-center px-3 py-1 rounded-lg border border-purple-400 bg-purple-600 text-white min-w-[72px]">
              <span className="text-[9px] font-semibold uppercase tracking-wide opacity-80">Comm</span>
              <span className="text-sm font-bold">${commAmount.toFixed(2)}</span>
            </div>

            {/* Received box */}
            <div className="flex flex-col items-center px-3 py-1 rounded-lg border border-green-400 bg-green-600 text-white min-w-[72px]">
              <span className="text-[9px] font-semibold uppercase tracking-wide opacity-80">Received</span>
              <span className="text-sm font-bold">${receivedAmount.toFixed(2)}</span>
            </div>

            {/* Pending box */}
            <div className="flex flex-col items-center px-3 py-1 rounded-lg border border-red-400 bg-red-600 text-white min-w-[72px]">
              <span className="text-[9px] font-semibold uppercase tracking-wide opacity-80">Pending</span>
              <span className="text-sm font-bold">${pendingAmount.toFixed(2)}</span>
            </div>

          </div>
        )}

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDark(!dark)}
            className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {dark ? 'Light' : 'Dark'}
          </button>
          <button
            onClick={() => router.push('/add')}
            className="bg-indigo-600 text-white text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition"
          >
            + Add
          </button>
          <button
            onClick={logout}
            className="text-red-500 hover:underline text-sm"
          >
            Logout
          </button>
        </div>
      </nav>

      {loading && <p className="text-center mt-10 text-gray-500">Loading...</p>}

      {!loading && orders.length === 0 && (
        <p className="text-center mt-10 text-gray-500">No records yet. Click + Add to start.</p>
      )}

      {/* ===== PC TABLE (md and up) ===== */}
      {!loading && orders.length > 0 && (
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 uppercase">
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Product</th>
                <th className="px-3 py-2 text-left">Market</th>
                <th className="px-3 py-2 text-left">Seller</th>
                <th className="px-3 py-2 text-left">PayPal</th>
                <th className="px-3 py-2 text-right">Prod $</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-center">Delivered</th>
                <th className="px-3 py-2 text-center">Review</th>
                <th className="px-3 py-2 text-center">Paid</th>
                <th className="px-3 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => {
                const commission = order.commissionAmount || 0;
                const total = order.price + commission;
                return (
                  <tr key={order.id} className={`border-b border-gray-200 dark:border-gray-700 ${getRowBg(order)}`}>

                    {/* Status badge */}
                    <td className="px-3 py-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getBadge(order)}`}>
                        {getLabel(order)}
                      </span>
                    </td>

                    {/* Product name + order number tiny below */}
                    <td className="px-3 py-2">
                      <div className="font-medium">{order.productName}</div>
                      <div className="text-[10px] text-gray-400">{order.orderNumber}</div>
                    </td>

                    {/* Marketplace */}
                    <td className="px-3 py-2">{order.marketplace}</td>

                    {/* Seller + review type tiny below */}
                    <td className="px-3 py-2">
                      <div>{order.sellerName || '\u2014'}</div>
                      <div className="text-[10px] text-gray-400">
                        {order.reviewType === 'text+pic' ? 'Txt+Pic' : 'Text'}
                      </div>
                    </td>

                    {/* PayPal */}
                    <td className="px-3 py-2">{order.paypalAccount}</td>

                    {/* Prod $ + commission tiny below */}
                    <td className="px-3 py-2 text-right">
                      <div>${order.price.toFixed(2)}</div>
                      {commission > 0 && (
                        <div className="text-[10px] text-gray-400">+${commission.toFixed(2)} comm</div>
                      )}
                    </td>

                    {/* Total - bold */}
                    <td className="px-3 py-2 text-right font-bold">${total.toFixed(2)}</td>

                    {/* Delivered */}
                    <td className="px-3 py-2 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <input
                          type="checkbox"
                          checked={order.delivered}
                          onChange={() => toggleField(order.id, 'delivered', order.delivered)}
                          className="w-4 h-4 accent-indigo-600 cursor-pointer"
                        />
                        {order.deliveredAt && (
                          <span className="text-[9px] text-gray-400">{fmtTs(order.deliveredAt)}</span>
                        )}
                      </div>
                    </td>

                    {/* Review written */}
                    <td className="px-3 py-2 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <input
                          type="checkbox"
                          checked={order.reviewWritten}
                          onChange={() => toggleField(order.id, 'reviewWritten', order.reviewWritten)}
                          className="w-4 h-4 accent-indigo-600 cursor-pointer"
                        />
                        {order.reviewWrittenAt && (
                          <span className="text-[9px] text-gray-400">{fmtTs(order.reviewWrittenAt)}</span>
                        )}
                      </div>
                    </td>

                    {/* Payment received */}
                    <td className="px-3 py-2 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <input
                          type="checkbox"
                          checked={order.paymentReceived}
                          onChange={() => toggleField(order.id, 'paymentReceived', order.paymentReceived)}
                          className="w-4 h-4 accent-green-600 cursor-pointer"
                        />
                        {order.paymentReceivedAt && (
                          <span className="text-[9px] text-gray-400">{fmtTs(order.paymentReceivedAt)}</span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2 text-center">
                      <div className="flex gap-3 mt-2">
                        <button
                          onClick={() => router.push(`/edit/${order.id}`)}
                          className="text-indigo-600 hover:underline text-sm font-medium"
                        >Edit</button>
                        <button
                          onClick={() => deleteOrder(order.id)}
                          className="text-red-500 hover:underline text-sm"
                        >Del</button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== MOBILE CARDS (below md) ===== */}
      {!loading && orders.length > 0 && (
        <div className="md:hidden flex flex-col gap-3 p-3">
          {orders.map(order => {
            const commission = order.commissionAmount || 0;
            const total = order.price + commission;
            return (
              <div key={order.id} className={`rounded-xl p-3 shadow-sm ${getCardBorder(order)}`}>

                {/* Top row */}
<div className="flex flex-row gap-2">
            {/* Left: info column */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{order.productName}</div>
                  <div className="text-[10px] text-gray-400">{order.orderNumber}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{order.marketplace}</div>
                  {order.sellerName && (
                    <div className="text-xs text-gray-500">{order.sellerName}</div>
                  )}
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${getBadge(order)}`}>
                  {getLabel(order)}
                </span>
              </div>

              {/* Amount row */}
              <div className="mt-1 text-sm">
                <span className="font-bold">${total.toFixed(2)}</span>
                &nbsp;&nbsp;
                <span className="text-xs text-gray-500">Prod: ${order.price.toFixed(2)}</span>
                {commission > 0 && <span className="text-xs text-gray-400"> Comm: ${commission.toFixed(2)}</span>}
              </div>

              {/* Review type + PayPal */}
              <div className="text-xs text-gray-400 mt-0.5">
                {order.reviewType === 'text+pic' ? 'Text + Pic' : 'Text only'} &middot; {order.paypalAccount}
              </div>
            </div>

            {/* Right: checkboxes column */}
            <div className="flex flex-col items-center gap-2 pl-2 border-l border-gray-300 dark:border-gray-600 shrink-0">
              {(['delivered', 'reviewWritten', 'paymentReceived'] as const).map(field => {
                const label = field === 'delivered' ? 'Del' : field === 'reviewWritten' ? 'Rev' : 'Paid';
                const ts = field === 'delivered' ? order.deliveredAt : field === 'reviewWritten' ? order.reviewWrittenAt : order.paymentReceivedAt;
                return (
                  <div key={field} className="flex flex-col items-center gap-0.5">
                    <input
                      type="checkbox"
                      checked={order[field]}
                      onChange={() => toggleField(order.id, field, order[field])}
                      className="w-4 h-4 accent-indigo-600 cursor-pointer"
                    />
                    <span className="text-[9px] text-gray-500 leading-tight">{label}</span>
                    {ts && <span className="text-[8px] text-gray-400 leading-tight">{fmtTs(ts)}</span>}
                  </div>
                );
              })}
            </div>
          </div>
                {/* Actions */}
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => router.push(`/edit/${order.id}`)}
                    className="text-indigo-600 hover:underline text-sm font-medium"
                  >Edit</button>
                  <button
                    onClick={() => deleteOrder(order.id)}
                    className="text-red-500 hover:underline text-sm"
                  >Delete</button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
