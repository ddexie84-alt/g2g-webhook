import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import crypto from 'crypto';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

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

async function saveOrderLog(orderData) {
  try {
    const rawLogs = await redis.lrange("recent_orders", 0, 99);
    let logs = rawLogs.map(l => typeof l === 'string' ? JSON.parse(l) : l);
    
    const existingIndex = logs.findIndex(l => l.g2gOrderId === orderData.g2gOrderId && l.g2gOrderId !== 'UNKNOWN_ORDER' && !String(l.g2gOrderId).startsWith('TEST'));
    
    if (existingIndex >= 0) {
      // Perbarui log yang sudah ada
      logs[existingIndex] = { ...logs[existingIndex], ...orderData, timestamp: orderData.timestamp };
      // Pindahkan ke paling atas (karena baru diupdate)
      const updatedLog = logs.splice(existingIndex, 1)[0];
      logs.unshift(updatedLog);
    } else {
      // Tambahkan log baru
      logs.unshift(orderData);
    }
    
    // Potong agar maksimal 100
    logs = logs.slice(0, 100);
    
    const pipeline = redis.pipeline();
    pipeline.del("recent_orders");
    if (logs.length > 0) {
      // lpush takes multiple arguments, but pipeline.lpush takes an array of arguments, we must reverse so unshift order is kept
      pipeline.rpush("recent_orders", ...logs.map(l => JSON.stringify(l)));
    }
    await pipeline.exec();
  } catch (err) {
    console.error("Failed to save log to KV", err);
  }
}

async function deliverG2GOrder(orderId, deliveryIdFromPayload, qty = 1) {
  const g2gApiKey = process.env.G2G_OPENAPI_KEY;
  const g2gUserId = process.env.G2G_USER_ID;
  const g2gSecretKey = process.env.G2G_SECRET;
  
  if (!g2gApiKey || !g2gUserId || !g2gSecretKey) return;

  try {
    let finalDeliveryId = deliveryIdFromPayload;
    if (!finalDeliveryId) {
      // Coba dapatkan dari API
      const getHeaders = generateG2GHeaders(`/v2/orders/${orderId}/delivery`, g2gApiKey, g2gUserId, g2gSecretKey);
      const getResp = await fetch(`https://open-api.g2g.com/v2/orders/${orderId}/delivery`, { method: 'GET', headers: getHeaders });
      if (getResp.ok) {
        const getRespBody = await getResp.json();
        if (getRespBody && getRespBody.payload && Array.isArray(getRespBody.payload.delivery_list) && getRespBody.payload.delivery_list.length > 0) {
           const firstDelivery = getRespBody.payload.delivery_list[0];
           if (firstDelivery.delivery_summary && firstDelivery.delivery_summary.delivery_id) {
               finalDeliveryId = firstDelivery.delivery_summary.delivery_id;
           }
        } else if (getRespBody && getRespBody.payload && getRespBody.payload.delivery_id) {
           finalDeliveryId = getRespBody.payload.delivery_id;
        }
      }
    }
    
    if (!finalDeliveryId) {
       console.error("Gagal Auto-Deliver: delivery_id tidak ditemukan");
       return;
    }

    const postHeaders = generateG2GHeaders(`/v2/orders/${orderId}/delivery`, g2gApiKey, g2gUserId, g2gSecretKey);
    await fetch(`https://open-api.g2g.com/v2/orders/${orderId}/delivery`, {
      method: 'POST',
      headers: postHeaders,
      body: JSON.stringify({
         delivery_id: finalDeliveryId, 
         codes: [
            {
               content: "✅ Pesanan Anda telah diterima dan diproses oleh sistem.",
               content_type: "text/plain",
               reference_id: "AUTO-" + Date.now()
            }
         ]
      })
    });
  } catch (err) {
    console.error("Gagal Auto-Deliver ke G2G:", err);
  }
}

export async function POST(req) {
  try {
    // === SISTEM KEAMANAN WEBHOOK (WAJIB) ===
    const secretOrder = process.env.G2G_WEBHOOK_SECRET;
    const secretOffer = process.env.G2G_WEBHOOK_SECRET_OFFER;
    const webhookUrl = process.env.G2G_WEBHOOK_URL;
    const userId = process.env.G2G_USER_ID;

    if ((secretOrder || secretOffer) && webhookUrl && userId) {
      const signatureHeader = req.headers.get('g2g-signature');
      const timestampHeader = req.headers.get('g2g-timestamp');
      
      if (!signatureHeader || !timestampHeader) {
        console.error("Webhook Ditolak: Header Keamanan G2G Hilang!");
        return NextResponse.json({ error: "Akses Ditolak: G2G Headers tidak ditemukan!" }, { status: 401 });
      }
      
      const canonicalString = webhookUrl + userId + timestampHeader;
      
      let isValid = false;
      
      // Coba cocokkan dengan Secret Order
      if (secretOrder) {
        const expectedOrder = crypto.createHmac('sha256', secretOrder).update(canonicalString).digest('hex');
        if (expectedOrder === signatureHeader) isValid = true;
      }
      
      // Coba cocokkan dengan Secret Offer (jika Order tidak cocok)
      if (secretOffer && !isValid) {
        const expectedOffer = crypto.createHmac('sha256', secretOffer).update(canonicalString).digest('hex');
        if (expectedOffer === signatureHeader) isValid = true;
      }
      
      if (!isValid) {
        console.error("Webhook Ditolak: Signature Palsu!", { received: signatureHeader });
        return NextResponse.json({ error: "Akses Ditolak: G2G Signature tidak valid (POTENSI SERANGAN)!" }, { status: 401 });
      }
    } else {
      console.warn("⚠️ PERINGATAN KRITIS: G2G_WEBHOOK_SECRET atau G2G_WEBHOOK_URL belum disetel di Environment Variables Vercel! Webhook Anda saat ini terbuka untuk publik tanpa sistem keamanan!");
    }
    // === AKHIR SISTEM KEAMANAN ===

    const rawBody = await req.json();
    const eventType = rawBody.event || rawBody.type || rawBody.event_type || 'UNKNOWN_EVENT'; 
    
    // G2G webhooks often wrap the data inside a 'payload' object
    const payload = rawBody.payload || rawBody;
    const orderId = payload.order_id || payload.id || rawBody.id;

    // 1. Ekstraksi Data dari G2G
    const offerId = payload.offer_id || (payload.products && payload.products[0] && payload.products[0].offer_id) || 'UNKNOWN_OFFER';
    
    // G2G menyimpan link di tempat yang berbeda tergantung eventnya (buyer_note atau delivery_summary)
    let targetLink = payload.buyer_note;
    if (!targetLink && payload.delivery_summary && Array.isArray(payload.delivery_summary.delivery_method_list)) {
      const method = payload.delivery_summary.delivery_method_list[0];
      if (method) {
        targetLink = method.attribute_value || method.value || method.delivery_info_1;
      }
      
      // Jika ada info tambahan (misal Server Name)
      if (payload.delivery_summary.delivery_method_list[1]) {
         const method2 = payload.delivery_summary.delivery_method_list[1];
         targetLink += " " + (method2.attribute_value || method2.value || "");
      }
    }
    targetLink = targetLink ? String(targetLink).trim() : 'LINK_TIDAK_DITEMUKAN';
    
    const purchasedQty = parseInt(payload.purchased_qty || payload.quantity || 1, 10);

    // 2. Lookup Pemetaan di Database
    const mappings = (await redis.hgetall("g2g_smm_mappings")) || {};
    const quantities = (await redis.hgetall("g2g_smm_qty")) || {};
    
    // G2G webhooks kirim ID tanpa "#", tapi user mungkin menyimpan dengan "#" di Dashboard
    const cleanOfferId = offerId.replace(/^#/, '');
    
    const smmServiceId = mappings[cleanOfferId] || mappings[`#${cleanOfferId}`] || process.env.SMM_SERVICE_ID || mappings["DEFAULT"] || "BELUM_DIPETAKAN";
    const baseSmmQty = parseInt(quantities[cleanOfferId] || quantities[`#${cleanOfferId}`] || "1000", 10);
    const totalSmmQuantity = purchasedQty * baseSmmQty;

    let success = false;
    let smmRawResponse = null;

    // 3. Eksekusi jika webhook mengindikasikan siap dikirim (api_delivery memiliki data lengkap pembeli)
    if (eventType === 'order.api_delivery') {
      const smmApiKey = process.env.PUSATPANELSMM_API_KEY || 'API_KEY_SMM_ANDA';
      const smmSecretKey = process.env.PUSATPANELSMM_SECRET_KEY || 'SECRET_KEY_SMM_ANDA';

      if (smmServiceId === 'NON_SMM') {
        smmRawResponse = { message: "✅ NON-SMM: Pesanan ini ditandai sebagai Produk Akun / Digital. Tidak diteruskan ke PusatPanelSMM." };
        success = true; // Anggap sukses agar log riwayat terlihat hijau
        // Note: Untuk produk Akun, G2G biasanya mengurus Auto-Delivery via Upload Code.
      } else if (targetLink !== 'LINK_TIDAK_DITEMUKAN') {
        try {
          const smmResponse = await fetch('https://pusatpanelsmm.com/api/json.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              api_key: smmApiKey,
              secret_key: smmSecretKey,
              action: 'order', 
              service: smmServiceId,
              data: targetLink, 
              quantity: totalSmmQuantity.toString()
            }).toString()
          });

          const smmResult = await smmResponse.json();
          smmRawResponse = smmResult; 

          if (smmResult.status === true || smmResult.data?.id) {
            success = true;
            if (orderId) await deliverG2GOrder(orderId, purchasedQty);
          }
        } catch (smmError) {
          console.error("SMM Error", smmError);
          smmRawResponse = { error: smmError.toString() };
        }
      } else {
        smmRawResponse = { error: "Link Target tidak ditemukan dari G2G (buyer_note kosong)" };
      }
    } else {
      // Event lain seperti order.confirmed atau tes
      if (eventType === 'order.confirmed') {
        smmRawResponse = { message: "Pesanan lunas (order.confirmed) terdeteksi. Menunggu event 'order.api_delivery' dari G2G untuk mendapatkan Link Target pembeli sebelum dikirim ke SMM." };
      } else {
        smmRawResponse = { 
          message: `Event '${eventType}' terdeteksi. Sistem tidak akan memproses pesanan SMM pada event ini. (Jika ini simulasi, koneksi webhook berjalan lancar!)` 
        };
      }
    }

    // 4. Save order record to KV for the Dashboard (Selalu dicatat apapun eventnya)
    await saveOrderLog({
      timestamp: new Date().toISOString(),
      g2gOrderId: orderId || `TEST (${eventType})`,
      targetLink: targetLink,
      quantity: totalSmmQuantity,
      success: success,
      offerId: offerId,
      smmServiceId: smmServiceId,     // <--- DATA BARU UNTUK LOG
      purchasedQty: purchasedQty,     // <--- DATA BARU UNTUK LOG
      baseSmmQty: baseSmmQty,         // <--- DATA BARU UNTUK LOG
      rawG2G: rawBody,                // Store FULL raw G2G Payload
      rawSMM: smmRawResponse          // Store raw SMM Response
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook Error", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
