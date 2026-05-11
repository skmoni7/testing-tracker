// ======================================================
// DASHBOARD SCREEN
// Live order list from Firestore
// Color-coded cards, inline Amt Cr input, checkboxes
// ======================================================
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, TextInput, ScrollView,
} from 'react-native';
import {
  collection, onSnapshot, doc, updateDoc,
  deleteDoc, query, orderBy, where, Timestamp,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../firebaseConfig';
import { getPriorityColor, getStatusLabel, getAmtCrColor } from '../utils/priority';

// ----- Order type -----
interface Order {
  id: string;
  productName: string;
  orderNumber: string;
  marketplace: string;
  sellerName: string;
  price: number;
  commissionAmount: number;
  amountCredited: number;
  reviewType: string;
  paypalAccount: string;
  delivered: boolean;
  reviewWritten: boolean;
  paymentReceived: boolean;
  deliveredAt: Timestamp | null;
  reviewWrittenAt: Timestamp | null;
  paymentReceivedAt: Timestamp | null;
}

export default function DashboardScreen({ navigation }: any) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  // ----- Local draft state for inline Amt Cr editing -----
  const [amtCrDraft, setAmtCrDraft] = useState<Record<string, string>>({});

  // ----- Live Firestore listener -----
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, snap => {
      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      // Sort by priority (urgent first)
      raw.sort((a, b) => getPriorityScore(a) - getPriorityScore(b));
      setOrders(raw);
      setLoading(false);
    });
  }, []);

  // ----- Priority sort score -----
  function getPriorityScore(o: Order): number {
    if (o.paymentReceived) return 3;
    if (o.delivered && o.reviewWritten) return 2;
    if (o.delivered) return 1;
    return 0;
  }

  // ----- Toggle checkbox field -----
  async function toggleField(id: string, field: 'delivered' | 'reviewWritten' | 'paymentReceived', current: boolean) {
    const tsField = field === 'delivered' ? 'deliveredAt' : field === 'reviewWritten' ? 'reviewWrittenAt' : 'paymentReceivedAt';
    await updateDoc(doc(db, 'orders', id), {
      [field]: !current,
      [tsField]: !current ? Timestamp.now() : null,
    });
  }

  // ----- Save Amt Cr inline -----
  async function saveAmtCr(id: string, value: string) {
    const amount = parseFloat(value) || 0;
    await updateDoc(doc(db, 'orders', id), { amountCredited: amount });
    setAmtCrDraft(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  // ----- Delete order -----
  function deleteOrder(id: string) {
    Alert.alert('Delete Order?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteDoc(doc(db, 'orders', id)) },
    ]);
  }

  // ----- Summary totals -----
  const totalAmt = orders.reduce((s, o) => s + (o.price || 0), 0);
  const totalComm = orders.reduce((s, o) => s + (o.commissionAmount || 0), 0);
  const totalAmtCr = orders.reduce((s, o) => s + (o.amountCredited || 0), 0);
  const totalReceived = orders.filter(o => o.paymentReceived).reduce((s, o) => s + (o.price || 0) + (o.commissionAmount || 0), 0);
  const totalPending = (totalAmt + totalComm) - totalReceived;

  // ----- Render each order card -----
  function renderCard({ item }: { item: Order }) {
    const commission = item.commissionAmount || 0;
    const total = item.price + commission;
    const amtCr = item.amountCredited || 0;
    const borderColor = getPriorityColor(item.delivered, item.reviewWritten, item.paymentReceived);
    const label = getStatusLabel(item.delivered, item.reviewWritten, item.paymentReceived);
    const amtCrColor = getAmtCrColor(amtCr, total);
    const draftVal = item.id in amtCrDraft ? amtCrDraft[item.id] : amtCr > 0 ? String(amtCr) : '';

    return (
      <View style={[styles.card, { borderLeftColor: borderColor }]}>

        {/* Top row: product info + status badge */}
        <View style={styles.cardTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName} numberOfLines={1}>{item.productName}</Text>
            <Text style={styles.subText}>{item.orderNumber}</Text>
            <Text style={styles.subText}>{item.marketplace}{item.sellerName ? ` • ${item.sellerName}` : ''}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: borderColor + '33', borderColor }]}>
            <Text style={[styles.badgeText, { color: borderColor }]}>{label}</Text>
          </View>
        </View>

        {/* Amount row: total + prod + comm + Amt Cr inline input */}
        <View style={styles.amountRow}>
          <Text style={styles.totalAmt}>${total.toFixed(2)}</Text>
          <Text style={styles.subAmt}>Prod: ${item.price.toFixed(2)}</Text>
          {commission > 0 && <Text style={styles.subAmt}>Comm: ${commission.toFixed(2)}</Text>}
          <View style={styles.amtCrInline}>
            <Text style={styles.subAmt}>Cr: </Text>
            <TextInput
              style={[styles.amtCrInput, { color: amtCrColor }]}
              value={draftVal}
              onChangeText={v => setAmtCrDraft(prev => ({ ...prev, [item.id]: v }))}
              onBlur={e => saveAmtCr(item.id, e.nativeEvent.text)}
              onSubmitEditing={e => saveAmtCr(item.id, e.nativeEvent.text)}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#555"
              returnKeyType="done"
            />
          </View>
        </View>

        {/* Checkboxes row */}
        <View style={styles.checkRow}>
          {(['delivered', 'reviewWritten', 'paymentReceived'] as const).map(field => {
            const lbl = field === 'delivered' ? 'Del' : field === 'reviewWritten' ? 'Rev' : 'Paid';
            return (
              <TouchableOpacity key={field} onPress={() => toggleField(item.id, field, item[field])} style={styles.checkItem}>
                <Text style={[styles.checkBox, { color: item[field] ? '#4CAF50' : '#555' }]}>
                  {item[field] ? '☑' : '☐'}
                </Text>
                <Text style={styles.checkLabel}>{lbl}</Text>
              </TouchableOpacity>
            );
          })}
          {/* Actions */}
          <TouchableOpacity onPress={() => navigation.navigate('AddEdit', { order: item })} style={styles.actionBtn}>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteOrder(item.id)} style={styles.actionBtn}>
            <Text style={styles.deleteText}>Del</Text>
          </TouchableOpacity>
        </View>

      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* ----- Header ----- */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ProTrack</Text>
        <TouchableOpacity onPress={() => signOut(auth)}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* ----- Summary boxes ----- */}
      {!loading && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
          <View style={[styles.summaryBox, { borderColor: '#3b82f6', backgroundColor: '#1d4ed8' }]}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValue}>${totalAmt.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryBox, { borderColor: '#a855f7', backgroundColor: '#7e22ce' }]}>
            <Text style={styles.summaryLabel}>Comm</Text>
            <Text style={styles.summaryValue}>${totalComm.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryBox, { borderColor: '#14b8a6', backgroundColor: '#0f766e' }]}>
            <Text style={styles.summaryLabel}>Amt Cr</Text>
            <Text style={styles.summaryValue}>${totalAmtCr.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryBox, { borderColor: '#22c55e', backgroundColor: '#15803d' }]}>
            <Text style={styles.summaryLabel}>Received</Text>
            <Text style={styles.summaryValue}>${totalReceived.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryBox, { borderColor: '#ef4444', backgroundColor: '#b91c1c' }]}>
            <Text style={styles.summaryLabel}>Pending</Text>
            <Text style={styles.summaryValue}>${totalPending.toFixed(2)}</Text>
          </View>
        </ScrollView>
      )}

      {/* ----- Order list ----- */}
      {loading && <Text style={styles.loadingText}>Loading...</Text>}
      {!loading && orders.length === 0 && (
        <Text style={styles.emptyText}>No orders yet. Tap + to add one.</Text>
      )}
      <FlatList
        data={orders}
        keyExtractor={i => i.id}
        renderItem={renderCard}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
      />

      {/* ----- Floating Add button ----- */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddEdit', { order: null })}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 10, backgroundColor: '#0f0f1e' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#6366f1' },
  logoutText: { color: '#ef4444', fontSize: 14 },
  summaryRow: { flexGrow: 0, paddingVertical: 10 },
  summaryBox: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center', minWidth: 72 },
  summaryLabel: { color: '#fff', fontSize: 9, fontWeight: '600', opacity: 0.8, textTransform: 'uppercase' },
  summaryValue: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  loadingText: { color: '#888', textAlign: 'center', marginTop: 40 },
  emptyText: { color: '#888', textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: '#16213e', borderRadius: 12, padding: 12, marginBottom: 10, borderLeftWidth: 5 },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  productName: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  subText: { color: '#888', fontSize: 11, marginTop: 1 },
  badge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  amountRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  totalAmt: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  subAmt: { color: '#888', fontSize: 11 },
  amtCrInline: { flexDirection: 'row', alignItems: 'center' },
  amtCrInput: { fontSize: 11, fontWeight: '600', borderBottomWidth: 1, borderBottomColor: '#444', width: 52, paddingVertical: 0 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  checkBox: { fontSize: 18 },
  checkLabel: { color: '#888', fontSize: 11 },
  actionBtn: { marginLeft: 'auto' },
  editText: { color: '#6366f1', fontSize: 13, fontWeight: '600' },
  deleteText: { color: '#ef4444', fontSize: 13 },
  fab: { position: 'absolute', bottom: 28, right: 24, backgroundColor: '#6366f1', width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center', elevation: 6 },
  fabText: { color: '#fff', fontSize: 30, lineHeight: 34 },
});
