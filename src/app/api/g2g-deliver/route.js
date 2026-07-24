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

export async function POST(req) {
  try {
    const g2gApiKey = process.env.G2G_OPENAPI_KEY;
    const g2gUserId = process.env.G2G_USER_ID;
    const g2gSecretKey = process.env.G2G_SECRET;

    if (!g2gApiKey || !g2gUserId || !g2gSecretKey) {
      return NextResponse.json({ error: 'G2G API Keys not configured.' }, { status: 400 });
    }

    const body = await req.json();
    const { orderId, qty, remarks } = body;

    if (!orderId || !qty) {
      return NextResponse.json({ error: 'Order ID and Qty are required.' }, { status: 400 });
    }

    // 1. Dapatkan delivery_id terlebih dahulu
    const getHeaders = generateG2GHeaders(`/v2/orders/${orderId}/delivery`, g2gApiKey, g2gUserId, g2gSecretKey);
    const getResp = await fetch(`https://open-api.g2g.com/v2/orders/${orderId}/delivery`, {
      method: 'GET',
      headers: getHeaders
    });
    
    let deliveryId = '';
    let debugInfo = '';
    let isDirectTopUp = false;
    
    if (getResp.ok) {
      const getRespBody = await getResp.json();
      debugInfo = JSON.stringify(getRespBody);
      
      // Struktur Asli G2G V2
      if (getRespBody && getRespBody.payload && Array.isArray(getRespBody.payload.delivery_list) && getRespBody.payload.delivery_list.length > 0) {
         const firstDelivery = getRespBody.payload.delivery_list[0];
         if (firstDelivery.delivery_summary && firstDelivery.delivery_summary.delivery_id) {
             deliveryId = firstDelivery.delivery_summary.delivery_id;
             if (firstDelivery.delivery_summary.delivery_method_code === "direct_top_up") {
                 isDirectTopUp = true;
             }
         }
      } else if (getRespBody && getRespBody.payload && getRespBody.payload.delivery_id) {
         deliveryId = getRespBody.payload.delivery_id;
      }
    } else {
       const errBody = await getResp.text();
       console.error("Failed to GET delivery info:", errBody);
       return NextResponse.json({ error: `Gagal mendapatkan delivery_id dari pesanan ini: ${errBody}` }, { status: 400 });
    }
    
    if (!deliveryId) {
      return NextResponse.json({ error: `delivery_id tidak ditemukan pada pesanan ini. Respons G2G: ${debugInfo}` }, { status: 400 });
    }

    // 2. Eksekusi Pengiriman
    let response;
    
    if (isDirectTopUp) {
       // Untuk Top Up, gunakan PATCH ke endpoint delivery_id
       const patchPath = `/v2/orders/${orderId}/delivery/${deliveryId}`;
       const patchHeaders = generateG2GHeaders(patchPath, g2gApiKey, g2gUserId, g2gSecretKey);
       response = await fetch(`https://open-api.g2g.com${patchPath}`, {
         method: 'PATCH',
         headers: patchHeaders,
         body: JSON.stringify({
            delivered_qty: parseInt(qty, 10),
            delivered_at: Date.now()
         })
       });
    } else {
       // 2. Lakukan POST Delivery menggunakan delivery_id dan codes
       const postPath = `/v2/orders/${orderId}/delivery`;
       const postHeaders = generateG2GHeaders(postPath, g2gApiKey, g2gUserId, g2gSecretKey);
       response = await fetch(`https://open-api.g2g.com${postPath}`, {
         method: 'POST',
         headers: postHeaders,
         body: JSON.stringify({
           delivery_id: deliveryId,
           codes: [
              {
                 content: remarks || "Pesanan telah diproses secara manual dan terkirim.",
                 content_type: "text/plain",
                 reference_id: "MANUAL-" + Date.now()
              }
           ]
         })
       });
    }

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
