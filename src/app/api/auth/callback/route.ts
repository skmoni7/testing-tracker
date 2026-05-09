// GET /api/auth/callback
// Exchanges OAuth code for tokens, stores refresh token in Firestore
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID!;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;
  const tenantId = process.env.MICROSOFT_TENANT_ID!;
  const redirectUri = 'https://protrack.sj26.info/api/auth/callback';

  // Exchange code for tokens
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: 'https://graph.microsoft.com/Mail.Read offline_access',
      }),
    }
  );

  const tokens = await tokenRes.json();

  if (!tokens.refresh_token) {
    return NextResponse.json({ error: 'Token exchange failed', details: tokens }, { status: 500 });
  }

  // Store refresh token in Firestore (keyed to the user email)
  await setDoc(doc(db, 'msTokens', 'default'), {
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token,
    updatedAt: new Date().toISOString(),
  });

  // Redirect back to dashboard
  return NextResponse.redirect('https://protrack.sj26.info/dashboard?ms_connected=1');
}
