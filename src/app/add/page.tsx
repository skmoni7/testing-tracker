// ======================================================
// ADD ORDER PAGE
// Form to create a new free testing product order
// Includes: marketplace, seller name, commission amount, amount credited
// ======================================================
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import Link from 'next/link';

// ----- Default marketplace list -----
const DEFAULT_MARKETPLACES = ['Amazon', 'Walmart'];

export default function AddPage() {
  const { user } = useAuth();
  const router = useRouter();

  // ----- Form state -----
  const [productName, setProductName] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [marketplace, setMarketplace] = useState('Amazon');
  const [newMarketplace, setNewMarketplace] = useState('');
  const [price, setPrice] = useState('');
  const [commissionAmount, setCommissionAmount] = useState('');
  const [amountCredited, setAmountCredited] = useState('');
  const [reviewType, setReviewType] = useState<'text' | 'text+pic'>('text');
  const [paypalAccount, setPaypalAccount] = useState<'Shanu PP' | 'Jisa PP'>('Shanu PP');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ----- Seller name dropdown state -----
  const [sellerName, setSellerName] = useState('');
  const [newSellerName, setNewSellerName] = useState('');
  const [sellers, setSellers] = useState<string[]>([]);

  // ----- Marketplace dropdown state -----
  const [marketplaces, setMarketplaces] = useState<string[]>(DEFAULT_MARKETPLACES);

  // ----- Load saved marketplaces and sellers from Firestore on mount -----
  useEffect(() => {
    if (!user) return;
    const loadDropdowns = async () => {
      try {
        // Load marketplaces
        const mpSnap = await getDocs(query(collection(db, 'marketplaces'), orderBy('name')));
        const saved = mpSnap.docs.map(d => d.data().name as string);
        const merged = Array.from(new Set([...DEFAULT_MARKETPLACES, ...saved]));
        setMarketplaces(merged);

        // Load sellers
        const sellerSnap = await getDocs(query(collection(db, 'sellers'), orderBy('name')));
        const savedSellers = sellerSnap.docs.map(d => d.data().name as string);
        setSellers(savedSellers);
        if (savedSellers.length > 0) setSellerName(savedSellers[0]);
      } catch (e) {
        console.error('Failed to load dropdowns', e);
      }
    };
    loadDropdowns();
  }, [user]);

  // ----- Handle form submission -----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError('');

    try {
      // ----- Save new marketplace if selected -----
      let finalMarketplace = marketplace;
      if (marketplace === '__new__') {
        if (!newMarketplace.trim()) { setError('Please enter a marketplace name.'); setLoading(false); return; }
        finalMarketplace = newMarketplace.trim();
        await addDoc(collection(db, 'marketplaces'), { name: finalMarketplace });
      }

      // ----- Save new seller if selected -----
      let finalSeller = sellerName;
      if (sellerName === '__new__') {
        if (!newSellerName.trim()) { setError('Please enter a seller name.'); setLoading(false); return; }
        finalSeller = newSellerName.trim();
        await addDoc(collection(db, 'sellers'), { name: finalSeller });
      }

      // ----- Save the order -----
      await addDoc(collection(db, 'orders'), {
        userId: user.uid,
        productName: productName.trim(),
        orderNumber: orderNumber.trim(),
        marketplace: finalMarketplace,
        sellerName: finalSeller,
        price: parseFloat(price) || 0,
        commissionAmount: parseFloat(commissionAmount) || 0,
        amountCredited: parseFloat(amountCredited) || 0,
        reviewType,
        paypalAccount,
        delivered: false,
        reviewWritten: false,
        paymentReceived: false,
        deliveredAt: null,
        reviewWrittenAt: null,
        paymentReceivedAt: null,
        createdAt: Timestamp.now(),
      });

      router.push('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Failed to save order.');
    } finally {
      setLoading(false);
    }
  };

  // ----- Render -----
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">

        {/* Page title */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Add New Order</h1>
          <Link href="/dashboard" className="text-sm text-indigo-500 hover:underline">Cancel</Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ----- Product Name ----- */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Name *</label>
            <input
              type="text"
              value={productName}
              onChange={e => setProductName(e.target.value)}
              required
              placeholder="e.g. Wireless Charger"
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* ----- Order Number ----- */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Order Number *</label>
            <input
              type="text"
              value={orderNumber}
              onChange={e => setOrderNumber(e.target.value)}
              required
              placeholder="e.g. 111-1234567-8901234"
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* ----- Marketplace Dropdown ----- */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marketplace *</label>
            <select
              value={marketplace}
              onChange={e => setMarketplace(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {marketplaces.map(m => <option key={m} value={m}>{m}</option>)}
              <option value="__new__">+ Add New Marketplace</option>
            </select>
          </div>

          {/* ----- New Marketplace Input (shown only when __new__ selected) ----- */}
          {marketplace === '__new__' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Marketplace Name *</label>
              <input
                type="text"
                value={newMarketplace}
                onChange={e => setNewMarketplace(e.target.value)}
                placeholder="e.g. eBay"
                className="w-full border border-indigo-300 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          )}

          {/* ----- Seller Name Dropdown ----- */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seller Name</label>
            <select
              value={sellerName}
              onChange={e => setSellerName(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {sellers.length === 0 && <option value="">-- No sellers yet --</option>}
              {sellers.map(s => <option key={s} value={s}>{s}</option>)}
              <option value="__new__">+ Add New Seller</option>
            </select>
          </div>

          {/* ----- New Seller Input (shown only when __new__ selected) ----- */}
          {sellerName === '__new__' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Seller Name *</label>
              <input
                type="text"
                value={newSellerName}
                onChange={e => setNewSellerName(e.target.value)}
                placeholder="e.g. TechStore123"
                className="w-full border border-indigo-300 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          )}

          {/* ----- Product Price ----- */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Amount ($) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={e => setPrice(e.target.value)}
              required
              placeholder="0.00"
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* ----- Commission Amount (optional, defaults to 0) ----- */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Commission Amount ($) <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={commissionAmount}
              onChange={e => setCommissionAmount(e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* ----- Amount Credited (actual amount received) ----- */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amt Cr ($) <span className="text-gray-400 font-normal">(amount credited/received)</span></label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amountCredited}
              onChange={e => setAmountCredited(e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* ----- Review Type ----- */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Review Type *</label>
            <select
              value={reviewType}
              onChange={e => setReviewType(e.target.value as 'text' | 'text+pic')}
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="text">Text only</option>
              <option value="text+pic">Text + Picture</option>
            </select>
          </div>

          {/* ----- PayPal Account ----- */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PayPal Account *</label>
            <select
              value={paypalAccount}
              onChange={e => setPaypalAccount(e.target.value as 'Shanu PP' | 'Jisa PP')}
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="Shanu PP">Shanu PP</option>
              <option value="Jisa PP">Jisa PP</option>
            </select>
          </div>

          {/* ----- Error message ----- */}
          {error && <p className="text-red-500 text-sm">{error}</p>}

          {/* ----- Submit button ----- */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Order'}
          </button>

        </form>
      </div>
    </div>
  );
}
