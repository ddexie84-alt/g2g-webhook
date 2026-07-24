import { NextResponse } from "next/server";
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
  const g2gApiKey = process.env.G2G_OPENAPI_KEY;
  const g2gUserId = process.env.G2G_USER_ID;
  const g2gSecretKey = process.env.G2G_SECRET;

  if (!g2gApiKey || !g2gUserId || !g2gSecretKey) {
    return NextResponse.json({ error: "G2G API Keys not configured." }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('id');

  if (!orderId) {
    return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
  }

  try {
    const path = `/v2/orders/${orderId}`;
    const getHeaders = generateG2GHeaders(path, g2gApiKey, g2gUserId, g2gSecretKey);
    
    const response = await fetch(`https://open-api.g2g.com${path}`, {
      method: 'GET',
      headers: getHeaders
    });

    const data = await response.json();
    
    if (!response.ok) {
       throw new Error(data.message || "Failed to fetch order");
    }

    // Usually order details are inside payload
    const orderData = data.payload || data;

    return NextResponse.json({ success: true, order: orderData });
  } catch (error) {
    console.error("G2G Orders GET Error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
