// GET /api/cron/fetch-emails
// Called by Vercel Cron every 6 hours
// Fetches last 10 Amazon order emails from Outlook, saves suggestions to Firestore
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';

const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID!;
const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET!;
const TENANT_ID = process.env.MICROSOFT_TENANT_ID!;

// Get a fresh access token using stored refresh token
async function getAccessToken(): Promise<string | null> {
  const snap = await getDoc(doc(db, 'msTokens', 'default'));
  if (!snap.exists()) return null;
  const { refreshToken } = snap.data();

  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'https://graph.microsoft.com/Mail.Read offline_access',
      }),
    }
  );

  const data = await res.json();
  if (!data.access_token) return null;

  // Update stored tokens
  await setDoc(doc(db, 'msTokens', 'default'), {
    refreshToken: data.refresh_token || refreshToken,
    accessToken: data.access_token,
    updatedAt: new Date().toISOString(),
  });

  return data.access_token;
}

// Parse order number from Amazon email body
function extractOrderNumber(body: string): string {
  const match = body.match(/\b(\d{3}-\d{7}-\d{7})\b/);
  return match ? match[1] : '';
}

// Parse price from Amazon email body
function extractPrice(body: string): number {
  const match = body.match(/\$([\d,]+\.\d{2})/);
  return match ? parseFloat(match[1].replace(',', '')) : 0;
}

export async function GET(req: Request) {
  // Basic cron secret check
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: 'Not connected to Outlook. Visit /api/auth/microsoft to connect.' }, { status: 400 });
  }

  // Fetch last 10 Amazon emails
  const emailRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?$filter=from/emailAddress/address eq 'auto-confirm@amazon.com'&$top=10&$orderby=receivedDateTime desc&$select=subject,body,receivedDateTime`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const emailData = await emailRes.json();
  if (!emailData.value) {
    return NextResponse.json({ error: 'Could not fetch emails', details: emailData }, { status: 500 });
  }

  // Load existing orders to avoid duplicates
  const ordersSnap = await getDocs(collection(db, 'orders'));
  const existingOrderNumbers = new Set(
    ordersSnap.docs.map(d => d.data().orderNumber).filter(Boolean)
  );

  // Load existing suggestions to avoid duplicates
  const suggestionsSnap = await getDocs(collection(db, 'suggestions'));
  const existingSuggestionIds = new Set(
    suggestionsSnap.docs.map(d => d.data().orderNumber).filter(Boolean)
  );

  let added = 0;

  for (const email of emailData.value) {
    const bodyText = email.body?.content || '';
    const orderNumber = extractOrderNumber(bodyText);
    const price = extractPrice(bodyText);

    if (!orderNumber) continue;
    if (existingOrderNumbers.has(orderNumber)) continue;
    if (existingSuggestionIds.has(orderNumber)) continue;

    // Extract product name from subject line
    // Amazon subjects: "Your Amazon.com order of ProductName has shipped" etc.
    let productName = email.subject || 'Amazon Order';
    productName = productName
      .replace(/^Your Amazon\.com order of /i, '')
      .replace(/ has shipped\.?$/i, '')
      .replace(/ is on the way\.?$/i, '')
      .replace(/ has been delivered\.?$/i, '')
      .replace(/ - Order Confirmation$/i, '')
      .trim();

    const orderedAt = email.receivedDateTime || new Date().toISOString();

    await setDoc(doc(collection(db, 'suggestions')), {
      orderNumber,
      productName,
      price,
      orderedAt,
      emailSubject: email.subject,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    added++;
  }

  return NextResponse.json({ success: true, added, total: emailData.value.length });
}
