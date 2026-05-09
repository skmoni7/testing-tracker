// ======================================================
// DASHBOARD PAGE
// Orders sorted by priority: most urgent on top, Done at bottom
// Full row color highlight based on status
// PC: horizontal table | Mobile: card layout
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
  if (order.paymentReceived) return 'border-l-4 border-green-500 bg-green-100 dark:bg-green-900';
  if (order.delivered && order.reviewWritten) return 'border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/40';
  if (order.delivered) return 'border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-900/30';
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

  // ----- Toggle boolean field + record timestamp -----
  const toggleField = async (
    orderId: string,
    field: 'delivered' | 'reviewWritten' | 'paymentReceived',
    current: boolean
  ) => {
    const tsField =
      field === 'delivered' ? 'deliveredAt' :
      field === 'reviewWritten' ? 'reviewWrittenAt' : 'paymentReceivedAt';
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
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">

      {/* ----- Navbar ----- */}
      <nav className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 shadow">
        <span className="text-lg font-bold text-indigo-600">ProTrack</span>
        <div className="flex items-center gap-3">
          <button onClick={() => setDark(!dark)} className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            {dark ? 'Light' : 'Dark'}
          </button>
          <button onClick={() => router.push('/add')} className="bg-indigo-600 text-white text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition">
            + Add
          </button>
          <button onClick={logout} className="text-red-500 text-sm hover:underline">Logout</button>
        </div>
      </nav>

      {loading && <div className="flex justify-center items-center h-64 text-gray-400">Loading...</div>}
      {!loading && orders.length === 0 && (
        <div className="flex justify-center items-center h-64 text-gray-400">No records yet. Click + Add to start.</div>
      )}

      {/* ===== PC TABLE (md and up) ===== */}
      {!loading && orders.length > 0 && (
        <div className="hidden md:block overflow-x-auto mt-2">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
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
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => {
                const commission = order.commissionAmount || 0;
                const total = order.price + commission;
                return (
                  <tr key={order.id} className={`${getRowBg(order)} border-b border-gray-200 dark:border-gray-700`}>

                    {/* Status badge */}
                    <td className="px-3 py-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${getBadge(order)}`}>
                        {getLabel(order)}
                      </span>
                    </td>

                    {/* Product name + order number tiny below */}
                    <td className="px-3 py-2">
                      <div className="font-medium">{order.productName}</div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{order.orderNumber}</div>
                    </td>

                    {/* Marketplace */}
                    <td className="px-3 py-2">{order.marketplace}</td>

                    {/* Seller + review type tiny below */}
                    <td className="px-3 py-2">
                      <div>{order.sellerName || '—'}</div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                        {order.reviewType === 'text+pic' ? 'Txt+Pic' : 'Text'}
                      </div>
                    </td>

                    {/* PayPal */}
                    <td className="px-3 py-2">{order.paypalAccount}</td>

                    {/* Prod $ + commission tiny below */}
                    <td className="px-3 py-2 text-right">
                      <div>${order.price.toFixed(2)}</div>
                      {commission > 0 && (
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">+${commission.toFixed(2)} comm</div>
                      )}
                    </td>

                    {/* Total - bold */}
                    <td className="px-3 py-2 text-right font-bold">${total.toFixed(2)}</td>

                    {/* Delivered */}
                    <td className="px-3 py-2 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <input type="checkbox" checked={order.delivered}
                          onChange={() => toggleField(order.id, 'delivered', order.delivered)}
                          className="w-4 h-4 accent-indigo-600 cursor-pointer" />
                        {order.deliveredAt && <span className="text-[9px] text-gray-400">{fmtTs(order.deliveredAt)}</span>}
                      </div>
                    </td>

                    {/* Review written */}
                    <td className="px-3 py-2 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <input type="checkbox" checked={order.reviewWritten}
                          onChange={() => toggleField(order.id, 'reviewWritten', order.reviewWritten)}
                          className="w-4 h-4 accent-indigo-600 cursor-pointer" />
                        {order.reviewWrittenAt && <span className="text-[9px] text-gray-400">{fmtTs(order.reviewWrittenAt)}</span>}
                      </div>
                    </td>

                    {/* Payment received */}
                    <td className="px-3 py-2 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <input type="checkbox" checked={order.paymentReceived}
                          onChange={() => toggleField(order.id, 'paymentReceived', order.paymentReceived)}
                          className="w-4 h-4 accent-green-600 cursor-pointer" />
                        {order.paymentReceivedAt && <span className="text-[9px] text-gray-400">{fmtTs(order.paymentReceivedAt)}</span>}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2">
                      <div className="flex gap-3">
                        <button onClick={() => router.push(`/edit/${order.id}`)}
                          className="text-indigo-600 hover:underline text-xs font-medium">Edit</button>
                        <button onClick={() => deleteOrder(order.id)}
                          className="text-red-500 hover:underline text-xs">Del</button>
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
              <div key={order.id} className={`rounded-lg p-3 shadow ${getCardBorder(order)}`}>

                {/* Top row */}
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-sm">{order.productName}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{order.orderNumber}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{order.marketplace}</div>
                    {order.sellerName && (
                      <div className="text-[10px] text-gray-400">{order.sellerName}</div>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getBadge(order)}`}>
                    {getLabel(order)}
                  </span>
                </div>

                {/* Amount row */}
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-bold text-base">${total.toFixed(2)}</span>
                  <span className="text-[10px] text-gray-400">Prod: ${order.price.toFixed(2)}</span>
                  {commission > 0 && <span className="text-[10px] text-gray-400">Comm: ${commission.toFixed(2)}</span>}
                </div>

                {/* Review type + PayPal */}
                <div className="text-[10px] text-gray-400 mt-1">
                  {order.reviewType === 'text+pic' ? 'Text + Pic' : 'Text only'} · {order.paypalAccount}
                </div>

                {/* Checkboxes */}
                <div className="flex gap-4 mt-2">
                  {(['delivered', 'reviewWritten', 'paymentReceived'] as const).map(field => {
                    const label = field === 'delivered' ? 'Delivered' : field === 'reviewWritten' ? 'Review' : 'Paid';
                    const ts = field === 'delivered' ? order.deliveredAt : field === 'reviewWritten' ? order.reviewWrittenAt : order.paymentReceivedAt;
                    return (
                      <div key={field} className="flex flex-col items-center gap-0.5">
                        <input type="checkbox" checked={order[field]}
                          onChange={() => toggleField(order.id, field, order[field])}
                          className="w-4 h-4 accent-indigo-600 cursor-pointer" />
                        <span className="text-[10px] text-gray-500">{label}</span>
                        {ts && <span className="text-[9px] text-gray-400">{fmtTs(ts)}</span>}
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-2">
                  <button onClick={() => router.push(`/edit/${order.id}`)}
                    className="text-indigo-600 hover:underline text-sm font-medium">Edit</button>
                  <button onClick={() => deleteOrder(order.id)}
                    className="text-red-500 hover:underline text-sm">Delete</button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
