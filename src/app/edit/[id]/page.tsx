// ======================================================
// EDIT ORDER PAGE
// Edit an existing order — includes seller name + commission
// FIX: ensures saved seller/marketplace always shows in dropdown
// ======================================================
'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';

// ----- Default marketplace list -----
const DEFAULT_MARKETPLACES = ['Amazon', 'Walmart'];

export default function EditPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  // ----- Form state -----
  const [productName, setProductName] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [marketplace, setMarketplace] = useState('Amazon');
  const [newMarketplace, setNewMarketplace] = useState('');
  const [price, setPrice] = useState('');
  const [commissionAmount, setCommissionAmount] = useState('');
  const [reviewType, setReviewType] = useState<'text' | 'text+pic'>('text');
  const [paypalAccount, setPaypalAccount] = useState<'Shanu PP' | 'Jisa PP'>('Shanu PP');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ----- Seller name state -----
  const [sellerName, setSellerName] = useState('');
  const [newSellerName, setNewSellerName] = useState('');
  const [sellers, setSellers] = useState<string[]>([]);

  // ----- Marketplace list state -----
  const [marketplaces, setMarketplaces] = useState<string[]>(DEFAULT_MARKETPLACES);

  // ----- Load order + dropdowns on mount -----
  useEffect(() => {
    if (!user || !id) return;
    const load = async () => {
      try {
        // ----- Step 1: Load saved marketplaces -----
        const mpSnap = await getDocs(query(collection(db, 'marketplaces'), orderBy('name')));
        const savedMp = mpSnap.docs.map(d => d.data().name as string);
        let mergedMp = Array.from(new Set([...DEFAULT_MARKETPLACES, ...savedMp]));

        // ----- Step 2: Load saved sellers -----
        const sellerSnap = await getDocs(query(collection(db, 'sellers'), orderBy('name')));
        let savedSellers = sellerSnap.docs.map(d => d.data().name as string);

        // ----- Step 3: Load existing order doc -----
        const snap = await getDoc(doc(db, 'orders', id));
        if (snap.exists()) {
          const d = snap.data();

          // If saved marketplace not in list, add it so dropdown shows it
          const savedMpVal = d.marketplace || 'Amazon';
          if (savedMpVal && !mergedMp.includes(savedMpVal)) {
            mergedMp = [...mergedMp, savedMpVal];
          }

          // If saved seller not in list, add it so dropdown shows it
          const savedSeller = d.sellerName || '';
          if (savedSeller && !savedSellers.includes(savedSeller)) {
            savedSellers = [...savedSellers, savedSeller];
          }

          // Now update all dropdown lists before setting values
          setMarketplaces(mergedMp);
          setSellers(savedSellers);

          // Populate all form fields from Firestore data
          setProductName(d.productName || '');
          setOrderNumber(d.orderNumber || '');
          setMarketplace(savedMpVal);
          setSellerName(savedSeller);
          setPrice(String(d.price ?? ''));
          setCommissionAmount(String(d.commissionAmount ?? ''));
          setReviewType(d.reviewType || 'text');
          setPaypalAccount(d.paypalAccount || 'Shanu PP');
        } else {
          setMarketplaces(mergedMp);
          setSellers(savedSellers);
        }
      } catch (e) {
        console.error(e);
        setError('Failed to load order.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, id]);

  // ----- Handle save -----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      // Save new marketplace if selected
      let finalMarketplace = marketplace;
      if (marketplace === '__new__') {
        if (!newMarketplace.trim()) {
          setError('Please enter a marketplace name.');
          setSaving(false);
          return;
        }
        finalMarketplace = newMarketplace.trim();
        await addDoc(collection(db, 'marketplaces'), { name: finalMarketplace });
      }

      // Save new seller if selected
      let finalSeller = sellerName;
      if (sellerName === '__new__') {
        if (!newSellerName.trim()) {
          setError('Please enter a seller name.');
          setSaving(false);
          return;
        }
        finalSeller = newSellerName.trim();
        await addDoc(collection(db, 'sellers'), { name: finalSeller });
      }

      // Update the order
      await updateDoc(doc(db, 'orders', id), {
        productName: productName.trim(),
        orderNumber: orderNumber.trim(),
        marketplace: finalMarketplace,
        sellerName: finalSeller,
        price: parseFloat(price) || 0,
        commissionAmount: parseFloat(commissionAmount) || 0,
        reviewType,
        paypalAccount,
      });
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Failed to update order.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64 text-gray-400">Loading...</div>;

  // ----- Render -----
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4">
      <div className="max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">

        {/* Page title */}
        <div className="flex justify-between items-center mb-5">
          <h1 className="text-xl font-bold text-indigo-600">Edit Order</h1>
          <button onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-500 hover:underline">Cancel</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* ----- Product Name ----- */}
          <div>
            <label className="block text-sm font-medium mb-1">Product Name *</label>
            <input type="text" value={productName}
              onChange={e => setProductName(e.target.value)} required
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>

          {/* ----- Order Number ----- */}
          <div>
            <label className="block text-sm font-medium mb-1">Order Number *</label>
            <input type="text" value={orderNumber}
              onChange={e => setOrderNumber(e.target.value)} required
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>

          {/* ----- Marketplace Dropdown ----- */}
          <div>
            <label className="block text-sm font-medium mb-1">Marketplace *</label>
            <select value={marketplace} onChange={e => setMarketplace(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400">
              {marketplaces.map(m => <option key={m} value={m}>{m}</option>)}
              <option value="__new__">+ Add New Marketplace</option>
            </select>
          </div>

          {/* ----- New Marketplace Input (shown only when __new__ selected) ----- */}
          {marketplace === '__new__' && (
            <div>
              <label className="block text-sm font-medium mb-1">New Marketplace Name *</label>
              <input type="text" value={newMarketplace}
                onChange={e => setNewMarketplace(e.target.value)} placeholder="e.g. eBay"
                className="w-full border border-indigo-300 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          )}

          {/* ----- Seller Name Dropdown ----- */}
          <div>
            <label className="block text-sm font-medium mb-1">Seller Name</label>
            <select value={sellerName} onChange={e => setSellerName(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">-- Select Seller --</option>
              {sellers.map(s => <option key={s} value={s}>{s}</option>)}
              <option value="__new__">+ Add New Seller</option>
            </select>
          </div>

          {/* ----- New Seller Input (shown only when __new__ selected) ----- */}
          {sellerName === '__new__' && (
            <div>
              <label className="block text-sm font-medium mb-1">New Seller Name *</label>
              <input type="text" value={newSellerName}
                onChange={e => setNewSellerName(e.target.value)} placeholder="e.g. TechStore123"
                className="w-full border border-indigo-300 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          )}

          {/* ----- Product Price ----- */}
          <div>
            <label className="block text-sm font-medium mb-1">Product Amount ($) *</label>
            <input type="number" step="0.01" min="0" value={price}
              onChange={e => setPrice(e.target.value)} required placeholder="0.00"
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>

          {/* ----- Commission Amount (optional) ----- */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Commission Amount ($) <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <input type="number" step="0.01" min="0" value={commissionAmount}
              onChange={e => setCommissionAmount(e.target.value)} placeholder="0.00"
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>

          {/* ----- Review Type ----- */}
          <div>
            <label className="block text-sm font-medium mb-1">Review Type *</label>
            <select value={reviewType} onChange={e => setReviewType(e.target.value as 'text' | 'text+pic')}
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="text">Text only</option>
              <option value="text+pic">Text + Picture</option>
            </select>
          </div>

          {/* ----- PayPal Account ----- */}
          <div>
            <label className="block text-sm font-medium mb-1">PayPal Account *</label>
            <select value={paypalAccount} onChange={e => setPaypalAccount(e.target.value as 'Shanu PP' | 'Jisa PP')}
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="Shanu PP">Shanu PP</option>
              <option value="Jisa PP">Jisa PP</option>
            </select>
          </div>

          {/* ----- Error ----- */}
          {error && <p className="text-red-500 text-sm">{error}</p>}

          {/* ----- Save button ----- */}
          <button type="submit" disabled={saving}
            className="bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

        </form>
      </div>
    </div>
  );
}
