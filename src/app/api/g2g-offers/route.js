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

// GET all offers from G2G
export async function GET() {
  const g2gApiKey = process.env.G2G_OPENAPI_KEY;
  const g2gUserId = process.env.G2G_USER_ID;
  const g2gSecretKey = process.env.G2G_SECRET;

  if (!g2gApiKey || !g2gUserId || !g2gSecretKey) {
    return NextResponse.json({ error: "G2G API Keys not configured." }, { status: 400 });
  }

  try {
    const postHeaders = generateG2GHeaders('/v2/offers/search', g2gApiKey, g2gUserId, g2gSecretKey);
    // Note: status 'all' might not be supported if they only support 'active' and 'inactive'. Let's just omit status to get all, or just use active. 
    // G2G docs usually say we can omit it or use an empty query.
    const response = await fetch('https://open-api.g2g.com/v2/offers/search', {
      method: 'POST',
      headers: postHeaders,
      body: JSON.stringify({})
    });

    const data = await response.json();
    let offers = [];
    if (data.payload && Array.isArray(data.payload.results)) {
      offers = data.payload.results;
    } else if (data.payload && Array.isArray(data.payload)) {
      offers = data.payload;
    } else if (Array.isArray(data)) {
      offers = data;
    } else if (data.data && Array.isArray(data.data)) {
      offers = data.data;
    }

    return NextResponse.json({ success: true, offers });
  } catch (error) {
    console.error("G2G Offers GET Error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH to update offer price, stock, or status
export async function PATCH(req) {
  const g2gApiKey = process.env.G2G_OPENAPI_KEY;
  const g2gUserId = process.env.G2G_USER_ID;
  const g2gSecretKey = process.env.G2G_SECRET;

  if (!g2gApiKey || !g2gUserId || !g2gSecretKey) {
    return NextResponse.json({ error: "G2G API Keys not configured." }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { offerId, price, stock, active, status } = body;

    if (!offerId) {
      return NextResponse.json({ error: "Offer ID is required" }, { status: 400 });
    }

    const payload = {};
    if (price !== undefined) payload.unit_price = Number(price);
    if (stock !== undefined) payload.api_qty = Number(stock);
    if (active !== undefined) payload.offer_status = active ? 'live' : 'offline';
    if (status !== undefined) payload.status = status; // allow explicit status string like 'live', 'offline', 'inactive'

    const path = `/v2/offers/${offerId}`;
    const patchHeaders = generateG2GHeaders(path, g2gApiKey, g2gUserId, g2gSecretKey);
    
    const response = await fetch(`https://open-api.g2g.com${path}`, {
      method: 'PATCH',
      headers: patchHeaders,
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    // G2G uses 20000001 for success
    if (!response.ok || (data.code !== undefined && String(data.code) !== "20000001")) {
       console.error("G2G API Error Response:", data);
       return NextResponse.json({ error: `Gagal mengubah data penawaran: ${JSON.stringify(data)}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Offer updated successfully", data });
  } catch (error) {
    console.error("G2G Offers PATCH Error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
