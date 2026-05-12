// ======================================================
// DASHBOARD PAGE
// Orders sorted by priority: most urgent on top, Done at bottom
// Full row color highlight based on status
// PC: horizontal table | Mobile: card layout
// Navbar: 5 summary boxes (Total / Comm / Amt Cr / Received / Pending)
// Amt Cr: inline live input on dashboard, green if >= total, red if < total
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

// ----- Priority score -----
function getPriorityScore(order: Order): number {
  if (order.paymentReceived) return 3;
  if (order.delivered && order.reviewWritten) return 2;
  if (order.delivered) return 1;
  return 0;
}

// ----- Full row background color -----
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

// ----- Amt Cr color -----
function getAmtCrColor(amtCr: number, total: number): string {
  if (amtCr <= 0) return 'text-gray-400';
  return amtCr >= total
    ? 'text-green-600 dark:text-green-400 font-semibold'
    : 'text-red-500 dark:text-red-400 font-semibold';
}

// ----- Format timestamp, guard against epoch (Dec 31 1969) -----
function fmtTs(ts: Timestamp | null | undefined): string {
  if (!ts) return '';
  const d = ts.toDate();
  // Reject epoch/zero timestamps (shows as Dec 31 1969)
  if (d.getFullYear() < 2000) return '';
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(true);
  const [amtCrDraft, setAmtCrDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      raw.sort((a, b) => getPriorityScore(a) - getPriorityScore(b));
      setOrders(raw);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const totalAmount = orders.reduce((sum, o) => sum + (o.price || 0), 0);
  const commAmount = orders.reduce((sum, o) => sum + (o.commissionAmount || 0), 0);
  const amtCrTotal = orders.reduce((sum, o) => sum + (o.amountCredited || 0), 0);
  const receivedAmount = orders
    .filter(o => o.paymentReceived)
    .reduce((sum, o) => sum + (o.price || 0) + (o.commissionAmount || 0), 0);
  const pendingAmount = (totalAmount + commAmount) - receivedAmount;

  // ----- Toggle field + timestamp. Always write null (not Timestamp(0,0)) when unchecking -----
  const toggleField = async (
    orderId: string,
    field: 'delivered' | 'reviewWritten' | 'paymentReceived',
    current: boolean
  ) => {
    const tsField =
      field === 'delivered' ? 'deliveredAt'
      : field === 'reviewWritten' ? 'reviewWrittenAt'
      : 'paymentReceivedAt';
    await updateDoc(doc(db, 'orders', orderId), {
      [field]: !current,
      [tsField]: !current ? Timestamp.now() : null,
    });
  };

  const saveAmtCr = async (orderId: string, value: string) => {
    const parsed = parseFloat(value);
    const amount = isNaN(parsed) ? 0 : parsed;
    await updateDoc(doc(db, 'orders', orderId), { amountCredited: amount });
    setAmtCrDraft(prev => { const n = { ...prev }; delete n[orderId]; return n; });
  };

  const getAmtCrValue = (order: Order): string => {
    if (order.id in amtCrDraft) return amtCrDraft[order.id];
    return (order.amountCredited || 0) > 0 ? String(order.amountCredited) : '';
  };

  const deleteOrder = async (id: string) => {
    if (!confirm('Delete this order?')) return;
    await deleteDoc(doc(db, 'orders', id));
  };

  // ----- Colored status box component (matches mobile app) -----
  const StatusBox = ({
    label, checked, ts, field, orderId
  }: {
    label: string;
    checked: boolean;
    ts: Timestamp | null | undefined;
    field: 'delivered' | 'reviewWritten' | 'paymentReceived';
    orderId: string;
  }) => {
    const timestamp = fmtTs(ts);
    return (
      <div
        onClick={() => toggleField(orderId, field, checked)}
        className={`flex flex-col items-center justify-between cursor-pointer select-none rounded-lg border px-2 py-1.5 w-[72px] min-h-[64px] transition-colors ${
          checked
            ? 'bg-green-100 border-green-400 dark:bg-green-900/40 dark:border-green-500'
            : 'bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-400'
        }`}
      >
        {/* Label top */}
        <span className={`text-[10px] font-semibold text-center leading-tight ${
          checked ? 'text-green-700 dark:text-green-300' : 'text-red-500 dark:text-red-300'
        }`}>{label}</span>

        {/* Checkbox middle */}
        <input
          type="checkbox"
          checked={checked}
          onChange={() => toggleField(orderId, field, checked)}
          onClick={e => e.stopPropagation()}
          className={`w-4 h-4 cursor-pointer my-1 ${
            checked ? 'accent-green-600' : 'accent-red-500'
          }`}
        />

        {/* Timestamp bottom */}
        <span className="text-[8px] text-gray-400 dark:text-gray-500 text-center leading-tight min-h-[12px]">
          {timestamp || '—'}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">

      {/* Navbar */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-2 flex items-center justify-between gap-2">
        <span className="text-indigo-600 font-bold text-lg whitespace-nowrap">ProTrack</span>

        {!loading && (
          <div className="flex items-center gap-1.5">
            <div className="flex flex-col items-center px-2 py-1 rounded-lg border border-blue-400 bg-blue-600 text-white min-w-[64px]">
              <span className="text-[9px] font-semibold uppercase tracking-wide opacity-80">Total</span>
              <span className="text-sm font-bold">${totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex flex-col items-center px-2 py-1 rounded-lg border border-purple-400 bg-purple-600 text-white min-w-[64px]">
              <span className="text-[9px] font-semibold uppercase tracking-wide opacity-80">Comm</span>
              <span className="text-sm font-bold">${commAmount.toFixed(2)}</span>
            </div>
            <div className="flex flex-col items-center px-2 py-1 rounded-lg border border-teal-400 bg-teal-600 text-white min-w-[64px]">
              <span className="text-[9px] font-semibold uppercase tracking-wide opacity-80">Amt Cr</span>
              <span className="text-sm font-bold">${amtCrTotal.toFixed(2)}</span>
            </div>
            <div className="flex flex-col items-center px-2 py-1 rounded-lg border border-green-400 bg-green-600 text-white min-w-[64px]">
              <span className="text-[9px] font-semibold uppercase tracking-wide opacity-80">Received</span>
              <span className="text-sm font-bold">${receivedAmount.toFixed(2)}</span>
            </div>
            <div className="flex flex-col items-center px-2 py-1 rounded-lg border border-red-400 bg-red-600 text-white min-w-[64px]">
              <span className="text-[9px] font-semibold uppercase tracking-wide opacity-80">Pending</span>
              <span className="text-sm font-bold">${pendingAmount.toFixed(2)}</span>
            </div>
          </div>
        )}

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
          <button onClick={logout} className="text-red-500 hover:underline text-sm">Logout</button>
        </div>
      </nav>

      {loading && <p className="text-center mt-10 text-gray-500">Loading...</p>}
      {!loading && orders.length === 0 && (
        <p className="text-center mt-10 text-gray-500">No records yet. Click + Add to start.</p>
      )}

      {/* ===== PC TABLE ===== */}
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
                <th className="px-3 py-2 text-right">Amt Cr</th>
                <th className="px-3 py-2 text-center">Delivery</th>
                <th className="px-3 py-2 text-center">Receive</th>
                <th className="px-3 py-2 text-center">Pay</th>
                <th className="px-3 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => {
                const commission = order.commissionAmount || 0;
                const total = order.price + commission;
                const amtCr = order.amountCredited || 0;
                const amtCrColorClass = getAmtCrColor(amtCr, total);
                return (
                  <tr key={order.id} className={`border-b border-gray-200 dark:border-gray-700 ${getRowBg(order)}`}>
                    <td className="px-3 py-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getBadge(order)}`}>
                        {getLabel(order)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{order.productName}</div>
                      <div className="text-[10px] text-gray-400">{order.orderNumber}</div>
                    </td>
                    <td className="px-3 py-2">{order.marketplace}</td>
                    <td className="px-3 py-2">
                      <div>{order.sellerName || '\u2014'}</div>
                      <div className="text-[10px] text-gray-400">
                        {order.reviewType === 'text+pic' ? 'Txt+Pic' : 'Text'}
                      </div>
                    </td>
                    <td className="px-3 py-2">{order.paypalAccount}</td>
                    <td className="px-3 py-2 text-right">
                      <div>${order.price.toFixed(2)}</div>
                      {commission > 0 && (
                        <div className="text-[10px] text-gray-400">+${commission.toFixed(2)} comm</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-bold">${total.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number" step="0.01" min="0" placeholder="0.00"
                        value={getAmtCrValue(order)}
                        onChange={e => setAmtCrDraft(prev => ({ ...prev, [order.id]: e.target.value }))}
                        onBlur={e => saveAmtCr(order.id, e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        className={`w-20 text-right bg-transparent border-b border-dashed border-gray-400 dark:border-gray-500 focus:outline-none focus:border-indigo-400 text-sm ${amtCrColorClass}`}
                      />
                    </td>
                    {/* Colored status boxes — table cells */}
                    <td className="px-2 py-2 text-center">
                      <StatusBox label="Delivery" checked={order.delivered} ts={order.deliveredAt} field="delivered" orderId={order.id} />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <StatusBox label="Receive" checked={order.reviewWritten} ts={order.reviewWrittenAt} field="reviewWritten" orderId={order.id} />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <StatusBox label="Pay" checked={order.paymentReceived} ts={order.paymentReceivedAt} field="paymentReceived" orderId={order.id} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex gap-3">
                        <button onClick={() => router.push(`/edit/${order.id}`)}
                          className="text-indigo-600 hover:underline text-sm font-medium">Edit</button>
                        <button onClick={() => deleteOrder(order.id)}
                          className="text-red-500 hover:underline text-sm">Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== MOBILE CARDS ===== */}
      {!loading && orders.length > 0 && (
        <div className="md:hidden flex flex-col gap-3 p-3">
          {orders.map(order => {
            const commission = order.commissionAmount || 0;
            const total = order.price + commission;
            const amtCr = order.amountCredited || 0;
            const amtCrColorClass = getAmtCrColor(amtCr, total);
            return (
              <div key={order.id} className={`rounded-xl p-3 shadow-sm ${getCardBorder(order)}`}>
                <div className="flex flex-row gap-2">
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
                    <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                      <span className="font-bold text-sm">${total.toFixed(2)}</span>
                      <span className="text-xs text-gray-500">Prod: ${order.price.toFixed(2)}</span>
                      {commission > 0 && <span className="text-xs text-gray-400">Comm: ${commission.toFixed(2)}</span>}
                      <span className="flex items-baseline gap-1">
                        <span className="text-xs text-gray-400">Cr:</span>
                        <input
                          type="number" step="0.01" min="0" placeholder="0.00"
                          value={getAmtCrValue(order)}
                          onChange={e => setAmtCrDraft(prev => ({ ...prev, [order.id]: e.target.value }))}
                          onBlur={e => saveAmtCr(order.id, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                          className={`w-16 text-xs bg-transparent border-b border-dashed border-gray-400 dark:border-gray-500 focus:outline-none focus:border-indigo-400 ${amtCrColorClass}`}
                        />
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {order.reviewType === 'text+pic' ? 'Text + Pic' : 'Text only'} &middot; {order.paypalAccount}
                    </div>
                  </div>

                  {/* Colored status boxes — mobile right column */}
                  <div className="flex flex-col items-center gap-2 pl-2 border-l border-gray-300 dark:border-gray-600 shrink-0">
                    <StatusBox label="Delivery" checked={order.delivered} ts={order.deliveredAt} field="delivered" orderId={order.id} />
                    <StatusBox label="Receive" checked={order.reviewWritten} ts={order.reviewWrittenAt} field="reviewWritten" orderId={order.id} />
                    <StatusBox label="Pay" checked={order.paymentReceived} ts={order.paymentReceivedAt} field="paymentReceived" orderId={order.id} />
                  </div>
                </div>

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

      {/* Footer */}
      <p className="text-center text-[10px] text-gray-300 dark:text-gray-700 pb-4 mt-4">developed by skm</p>

    </div>
  );
}
