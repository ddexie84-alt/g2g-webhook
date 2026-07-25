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
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('id');

    if (!orderId) {
       return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const g2gApiKey = process.env.G2G_OPENAPI_KEY;
    const g2gUserId = process.env.G2G_USER_ID;
    const g2gSecretKey = process.env.G2G_SECRET;

    if (!g2gApiKey || !g2gUserId || !g2gSecretKey) {
      return NextResponse.json({ error: 'G2G API Keys not configured.' }, { status: 400 });
    }

    const path = `/v2/orders/${orderId}`;
    const headers = generateG2GHeaders(path, g2gApiKey, g2gUserId, g2gSecretKey);
    
    const response = await fetch(`https://open-api.g2g.com${path}`, {
      method: 'GET',
      headers: headers
    });

    const data = await response.json();
    
    if (response.ok && data.payload) {
      return NextResponse.json({ success: true, order: data.payload });
    } else {
      return NextResponse.json({ error: 'Gagal menarik data pesanan dari G2G.', data }, { status: 400 });
    }
  } catch (error) {
    console.error("G2G Order Detail Error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
