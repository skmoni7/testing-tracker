'use client';

/* ---- Imports ---- */
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

/* ---- Default marketplaces ---- */
const DEFAULT_MARKETPLACES = ['Amazon', 'Walmart'];

/* ---- Add Order Page ---- */
export default function AddPage() {
  const { user } = useAuth();
  const router = useRouter();

  /* ---- Form state ---- */
  const [productName, setProductName] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [marketplace, setMarketplace] = useState('Amazon');
  const [newMarketplace, setNewMarketplace] = useState('');
  const [price, setPrice] = useState('');
  const [reviewType, setReviewType] = useState<'text' | 'textAndPic'>('text');
  const [paypalAccount, setPaypalAccount] = useState<'Shanu PP' | 'Jisa PP'>('Shanu PP');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* ---- Dynamic marketplace list from Firestore ---- */
  const [marketplaces, setMarketplaces] = useState<string[]>(DEFAULT_MARKETPLACES);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    /* ---- Load custom marketplaces saved previously ---- */
    async function loadMarketplaces() {
      const snap = await getDocs(query(collection(db, 'marketplaces'), orderBy('name')));
      const custom = snap.docs.map((d) => d.data().name as string);
      setMarketplaces([...DEFAULT_MARKETPLACES, ...custom]);
    }
    loadMarketplaces();
  }, [user, router]);

  /* ---- Submit handler ---- */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!productName || !orderNumber || !price) {
      setError('Product name, order number, and price are required.');
      return;
    }

    let finalMarketplace = marketplace;

    /* ---- Save new marketplace to Firestore if entered ---- */
    if (marketplace === '__new__') {
      if (!newMarketplace.trim()) {
        setError('Please enter the new marketplace name.');
        return;
      }
      await addDoc(collection(db, 'marketplaces'), { name: newMarketplace.trim() });
      finalMarketplace = newMarketplace.trim();
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'orders'), {
        productName,
        orderNumber,
        marketplace: finalMarketplace,
        price: parseFloat(price),
        reviewType,
        paypalAccount,
        delivered: false,
        reviewWritten: false,
        paymentReceived: false,
        deliveredAt: null,
        reviewWrittenAt: null,
        paymentReceivedAt: null,
        createdAt: Timestamp.now(),
        userId: user!.uid,
      });
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Failed to save order.');
      setLoading(false);
    }
  }

  /* ---- Render ---- */
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">

      {/* ---- Top Nav ---- */}
      <nav className="bg-white dark:bg-gray-800 shadow px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-indigo-600 dark:text-indigo-400">Add New Order</h1>
        <Link href="/dashboard" className="text-sm text-indigo-400 hover:text-indigo-500">Back</Link>
      </nav>

      {/* ---- Form ---- */}
      <main className="max-w-lg mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">

          {/* Product Name - required */}
          <div>
            <label className="block text-sm font-medium mb-1">Product Name *</label>
            <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)}
              required placeholder="e.g. Wireless Earbuds"
              className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {/* Order Number - required */}
          <div>
            <label className="block text-sm font-medium mb-1">Order Number *</label>
            <input type="text" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)}
              required placeholder="e.g. 114-1234567-1234567"
              className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {/* Marketplace dropdown - required */}
          <div>
            <label className="block text-sm font-medium mb-1">Marketplace *</label>
            <select value={marketplace} onChange={(e) => setMarketplace(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {marketplaces.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
              <option value="__new__">+ Add new marketplace</option>
            </select>
          </div>

          {/* New marketplace field - only shown when __new__ is selected */}
          {marketplace === '__new__' && (
            <div>
              <label className="block text-sm font-medium mb-1">New Marketplace Name *</label>
              <input type="text" value={newMarketplace} onChange={(e) => setNewMarketplace(e.target.value)}
                placeholder="e.g. eBay"
                className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          )}

          {/* Price - required */}
          <div>
            <label className="block text-sm font-medium mb-1">Price ($) *</label>
            <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)}
              required placeholder="0.00"
              className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {/* Review Type - required */}
          <div>
            <label className="block text-sm font-medium mb-1">Review Type *</label>
            <select value={reviewType} onChange={(e) => setReviewType(e.target.value as 'text' | 'textAndPic')}
              className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="text">Text only</option>
              <option value="textAndPic">Text and Picture</option>
            </select>
          </div>

          {/* PayPal Account - required */}
          <div>
            <label className="block text-sm font-medium mb-1">PayPal Account *</label>
            <select value={paypalAccount} onChange={(e) => setPaypalAccount(e.target.value as 'Shanu PP' | 'Jisa PP')}
              className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="Shanu PP">Shanu PP</option>
              <option value="Jisa PP">Jisa PP</option>
            </select>
          </div>

          {/* Error message */}
          {error && <p className="text-red-500 text-sm">{error}</p>}

          {/* Submit button */}
          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition">
            {loading ? 'Saving...' : 'Save Order'}
          </button>
        </form>
      </main>
    </div>
  );
}
