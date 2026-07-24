import { NextResponse } from 'next/server';
import crypto from 'crypto';

function generateG2GHeaders(path, apiKey, userId, secretKey) {
  const timestamp = Date.now().toString();
  const stringToSign = `${apiKey}${userId}${timestamp}${path}`;
  const signature = crypto.createHmac('sha256', secretKey).update(stringToSign).digest('hex');

  return {
    'Content-Type': 'application/json',
    'g2g-api-key': apiKey,
    'g2g-user-id': userId,
    'g2g-timestamp': timestamp,
    'g2g-signature': signature
  };
}

export async function POST(req) {
  try {
    const g2gApiKey = process.env.G2G_API_KEY;
    const g2gUserId = process.env.G2G_USER_ID;
    const g2gSecretKey = process.env.G2G_SECRET;

    if (!g2gApiKey || !g2gUserId || !g2gSecretKey) {
      return NextResponse.json({ error: 'G2G API Keys not configured.' }, { status: 400 });
    }

    const body = await req.json();
    const { orderId, qty } = body;

    if (!orderId || !qty) {
      return NextResponse.json({ error: 'Order ID and Qty are required.' }, { status: 400 });
    }

    const postHeaders = generateG2GHeaders(`/v2/orders/${orderId}/delivery`, g2gApiKey, g2gUserId, g2gSecretKey);
    const response = await fetch(`https://open-api.g2g.com/v2/orders/${orderId}/delivery`, {
      method: 'POST',
      headers: postHeaders,
      body: JSON.stringify({
         "delivered_quantity": parseInt(qty, 10), 
         "remarks": "✅ Pesanan Anda telah dikonfirmasi secara manual oleh admin. Terima kasih!"
      })
    });

    const data = await response.json();
    
    if (!response.ok || (data.code !== undefined && String(data.code) !== "1")) {
       if (!response.ok) throw new Error(data.message || JSON.stringify(data));
       return NextResponse.json({ error: data.message || "Gagal mengubah status di G2G.", details: data }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("G2G Manual Deliver Error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
