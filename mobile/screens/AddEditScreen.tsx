// ======================================================
// ADD / EDIT SCREEN
// Create new order or edit existing one
// Same fields as the web app
// ======================================================
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert,
} from 'react-native';
import {
  collection, addDoc, updateDoc, doc,
  serverTimestamp, getDocs,
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

const DEFAULT_MARKETPLACES = ['Amazon', 'Walmart'];
const PAYPAL_OPTIONS = ['Shanu PP', 'Jisa PP'];
const REVIEW_OPTIONS: Array<'text' | 'text+pic'> = ['text', 'text+pic'];

export default function AddEditScreen({ route, navigation }: any) {
  const existing = route.params?.order || null;

  // ----- Form state -----
  const [productName, setProductName] = useState(existing?.productName || '');
  const [orderNumber, setOrderNumber] = useState(existing?.orderNumber || '');
  const [marketplace, setMarketplace] = useState(existing?.marketplace || 'Amazon');
  const [sellerName, setSellerName] = useState(existing?.sellerName || '');
  const [price, setPrice] = useState(existing?.price ? String(existing.price) : '');
  const [commissionAmount, setCommissionAmount] = useState(existing?.commissionAmount ? String(existing.commissionAmount) : '');
  const [amountCredited, setAmountCredited] = useState(existing?.amountCredited ? String(existing.amountCredited) : '');
  const [reviewType, setReviewType] = useState<'text' | 'text+pic'>(existing?.reviewType || 'text');
  const [paypalAccount, setPaypalAccount] = useState(existing?.paypalAccount || 'Shanu PP');
  const [saving, setSaving] = useState(false);

  // ----- Dynamic seller + marketplace lists -----
  const [sellers, setSellers] = useState<string[]>([]);
  const [marketplaces, setMarketplaces] = useState<string[]>(DEFAULT_MARKETPLACES);
  const [newSeller, setNewSeller] = useState('');
  const [newMarketplace, setNewMarketplace] = useState('');

  // ----- Load sellers and marketplaces from Firestore -----
  useEffect(() => {
    async function loadDropdowns() {
      try {
        const mpSnap = await getDocs(collection(db, 'marketplaces'));
        const savedMp = mpSnap.docs.map(d => d.data().name as string);
        setMarketplaces(Array.from(new Set([...DEFAULT_MARKETPLACES, ...savedMp])));

        const selSnap = await getDocs(collection(db, 'sellers'));
        const savedSellers = selSnap.docs.map(d => d.data().name as string);
        setSellers(savedSellers);
      } catch (e) { console.log('Dropdown load error', e); }
    }
    loadDropdowns();
  }, []);

  // ----- Save handler -----
  async function handleSave() {
    if (!productName.trim()) return Alert.alert('Required', 'Product name is required.');
    if (!orderNumber.trim()) return Alert.alert('Required', 'Order number is required.');
    setSaving(true);
    try {
      const user = auth.currentUser;

      // Save new marketplace if typed
      let finalMarketplace = marketplace;
      if (marketplace === '__new__') {
        if (!newMarketplace.trim()) { Alert.alert('Required', 'Enter marketplace name.'); setSaving(false); return; }
        finalMarketplace = newMarketplace.trim();
        await addDoc(collection(db, 'marketplaces'), { name: finalMarketplace });
      }

      // Save new seller if typed
      let finalSeller = sellerName;
      if (sellerName === '__new__') {
        if (!newSeller.trim()) { Alert.alert('Required', 'Enter seller name.'); setSaving(false); return; }
        finalSeller = newSeller.trim();
        await addDoc(collection(db, 'sellers'), { name: finalSeller });
      }

      const data = {
        productName: productName.trim(),
        orderNumber: orderNumber.trim(),
        marketplace: finalMarketplace,
        sellerName: finalSeller,
        price: parseFloat(price) || 0,
        commissionAmount: parseFloat(commissionAmount) || 0,
        amountCredited: parseFloat(amountCredited) || 0,
        reviewType,
        paypalAccount,
        userId: user?.uid,
      };

      if (existing) {
        // ----- Update existing order -----
        await updateDoc(doc(db, 'orders', existing.id), data);
      } else {
        // ----- Create new order -----
        await addDoc(collection(db, 'orders'), {
          ...data,
          delivered: false,
          reviewWritten: false,
          paymentReceived: false,
          deliveredAt: null,
          reviewWrittenAt: null,
          paymentReceivedAt: null,
          createdAt: serverTimestamp(),
        });
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  // ----- Pill selector component -----
  function PillSelect({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
    return (
      <View style={styles.pillRow}>
        {options.map(opt => (
          <TouchableOpacity key={opt} onPress={() => onChange(opt)}
            style={[styles.pill, value === opt && styles.pillActive]}>
            <Text style={[styles.pillText, value === opt && styles.pillTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>

      {/* ----- Header ----- */}
      <View style={styles.topRow}>
        <Text style={styles.title}>{existing ? 'Edit Order' : 'Add Order'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* ----- Product Name ----- */}
      <Text style={styles.label}>Product Name *</Text>
      <TextInput style={styles.input} value={productName} onChangeText={setProductName} placeholder="e.g. Wireless Charger" placeholderTextColor="#555" />

      {/* ----- Order Number ----- */}
      <Text style={styles.label}>Order Number *</Text>
      <TextInput style={styles.input} value={orderNumber} onChangeText={setOrderNumber} placeholder="e.g. 111-1234567" placeholderTextColor="#555" />

      {/* ----- Marketplace pills ----- */}
      <Text style={styles.label}>Marketplace</Text>
      <PillSelect
        options={[...marketplaces, '+ New']}
        value={marketplace === '__new__' ? '+ New' : marketplace}
        onChange={v => setMarketplace(v === '+ New' ? '__new__' : v)}
      />
      {marketplace === '__new__' && (
        <TextInput style={[styles.input, { marginTop: 8 }]} value={newMarketplace} onChangeText={setNewMarketplace} placeholder="New marketplace name" placeholderTextColor="#555" />
      )}

      {/* ----- Seller pills ----- */}
      <Text style={styles.label}>Seller Name</Text>
      <PillSelect
        options={[...sellers, '+ New']}
        value={sellerName === '__new__' ? '+ New' : sellerName}
        onChange={v => setSellerName(v === '+ New' ? '__new__' : v)}
      />
      {sellerName === '__new__' && (
        <TextInput style={[styles.input, { marginTop: 8 }]} value={newSeller} onChangeText={setNewSeller} placeholder="New seller name" placeholderTextColor="#555" />
      )}

      {/* ----- Product Amount ----- */}
      <Text style={styles.label}>Product Amount ($) *</Text>
      <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#555" />

      {/* ----- Commission Amount ----- */}
      <Text style={styles.label}>Commission Amount ($)</Text>
      <TextInput style={styles.input} value={commissionAmount} onChangeText={setCommissionAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#555" />

      {/* ----- Amount Credited ----- */}
      <Text style={styles.label}>Amt Cr ($) — amount credited/received</Text>
      <TextInput style={styles.input} value={amountCredited} onChangeText={setAmountCredited} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#555" />

      {/* ----- Review Type ----- */}
      <Text style={styles.label}>Review Type</Text>
      <PillSelect options={['text', 'text+pic']} value={reviewType} onChange={v => setReviewType(v as 'text' | 'text+pic')} />

      {/* ----- PayPal Account ----- */}
      <Text style={styles.label}>PayPal Account</Text>
      <PillSelect options={PAYPAL_OPTIONS} value={paypalAccount} onChange={setPaypalAccount} />

      {/* ----- Save button ----- */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? 'Saving...' : existing ? 'Update Order' : 'Add Order'}</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  cancelText: { color: '#6366f1', fontSize: 15 },
  label: { color: '#aaa', fontSize: 13, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#16213e', color: '#fff', borderRadius: 10, padding: 13, fontSize: 14, borderWidth: 1, borderColor: '#2a2a4a' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#2a2a4a', backgroundColor: '#16213e' },
  pillActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  pillText: { color: '#888', fontSize: 13 },
  pillTextActive: { color: '#fff', fontWeight: '600' },
  saveBtn: { backgroundColor: '#6366f1', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 32 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
