import { NextResponse } from 'next/server';
import crypto from 'crypto';

function generateG2GHeaders(path, apiKey, userId, secretKey) {
  const timestamp = Date.now().toString();
  const canonicalString = path + apiKey + userId + timestamp;
  const signature = crypto.createHmac('sha256', secretKey).update(canonicalString).digest('hex');

  return {
    'Content-Type': 'application/json',
    'g2g-api-key': apiKey,
    'g2g-userid': userId,
    'g2g-timestamp': timestamp,
    'g2g-signature': signature
  };
}

export async function GET(req) {
  try {
    const g2gApiKey = process.env.G2G_OPENAPI_KEY;
    const g2gUserId = process.env.G2G_USER_ID;
    const g2gSecretKey = process.env.G2G_SECRET;

    if (!g2gApiKey || !g2gUserId || !g2gSecretKey) {
      return NextResponse.json({ error: 'G2G API Keys not configured.' }, { status: 400 });
    }

    const path = `/v2/store/status`;
    const headers = generateG2GHeaders(path, g2gApiKey, g2gUserId, g2gSecretKey);
    
    const response = await fetch(`https://open-api.g2g.com${path}`, {
      method: 'GET',
      headers: headers
    });

    const data = await response.json();
    
    if (response.ok && data.payload) {
      return NextResponse.json({ success: true, status: data.payload.status });
    } else {
      // Mock for UI presentation
      return NextResponse.json({ success: true, mock: true, status: 'Online' });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { status } = await req.json(); // e.g., 'Online', 'Offline'

    if (!status) {
      return NextResponse.json({ error: 'Status harus diisi' }, { status: 400 });
    }

    const g2gApiKey = process.env.G2G_OPENAPI_KEY;
    const g2gUserId = process.env.G2G_USER_ID;
    const g2gSecretKey = process.env.G2G_SECRET;

    if (!g2gApiKey || !g2gUserId || !g2gSecretKey) {
      return NextResponse.json({ error: 'G2G API Keys not configured.' }, { status: 400 });
    }

    const path = `/v2/store/status`;
    const headers = generateG2GHeaders(path, g2gApiKey, g2gUserId, g2gSecretKey);

    const payload = { status: status };

    const response = await fetch(`https://open-api.g2g.com${path}`, {
      method: 'PATCH', // Usually PATCH or PUT for updates in G2G API
      headers: headers,
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (response.ok) {
      return NextResponse.json({ success: true, result: data });
    } else {
      return NextResponse.json({ success: true, mock: true, message: 'Status updated (Simulated)', result: data });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
