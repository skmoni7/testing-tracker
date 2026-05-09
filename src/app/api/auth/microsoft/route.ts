// GET /api/auth/microsoft
// Redirects user to Microsoft OAuth consent screen
import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.MICROSOFT_CLIENT_ID!;
  const tenantId = process.env.MICROSOFT_TENANT_ID!;
  const redirectUri = 'https://protrack.sj26.info/api/auth/callback';

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: 'https://graph.microsoft.com/Mail.Read offline_access',
    prompt: 'select_account',
  });

  const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;

  return NextResponse.redirect(authUrl);
}
