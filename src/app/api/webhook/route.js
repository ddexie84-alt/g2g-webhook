import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
});

async function saveOrderLog(orderData) {
  try {
    // Save to the left of the list (newest first)
    await redis.lpush("recent_orders", JSON.stringify(orderData));
    // Trim list to keep only the latest 100 orders to save space
    await redis.ltrim("recent_orders", 0, 99);
  } catch (err) {
    console.error("Failed to save log to KV", err);
  }
}

async function deliverG2GOrder(orderId) {
  const g2gApiKey = process.env.G2G_OPENAPI_KEY;
  const g2gUserId = process.env.G2G_USER_ID;
  
  if (!g2gApiKey || !g2gUserId) return;

  try {
    await fetch(`https://open-api.g2g.com/v2/orders/${orderId}/delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'g2g-api-key': g2gApiKey,
        'g2g-userid': g2gUserId
      },
      body: JSON.stringify({
         "delivered_quantity": 1, 
         "remarks": "✅ Pesanan Anda telah diterima oleh sistem server kami dan sedang masuk antrean proses. Estimasi masuknya layanan adalah 1 hingga 24 jam. Mohon bersabar dan jangan membuka komplain sebelum 24 jam. Terima kasih!"
      })
    });
  } catch (err) {
    console.error("Gagal Auto-Deliver ke G2G:", err);
  }
}

export async function POST(req) {
  try {
    const payload = await req.json();
    const eventType = payload.event || payload.type; 
    const orderId = payload.order_id || payload.id;

    if (eventType === 'order.confirmed' || eventType === 'order.api_delivery') {
      const targetLink = payload.buyer_note || 'LINK_TIDAK_DITEMUKAN'; 
      const quantity = payload.quantity || 100;
      const offerId = payload.offer_id || (payload.products && payload.products[0] && payload.products[0].offer_id) || 'UNKNOWN_OFFER';
      
      // Fetch dynamic mappings from KV Database
      const mappings = (await redis.hgetall("service_map")) || {};
      const smmServiceId = mappings[offerId] || process.env.SMM_SERVICE_ID || mappings["DEFAULT"] || "1234";

      const smmApiKey = process.env.PUSATPANELSMM_API_KEY || 'API_KEY_SMM_ANDA';
      const smmSecretKey = process.env.PUSATPANELSMM_SECRET_KEY || 'SECRET_KEY_SMM_ANDA';

      let success = false;

      if (targetLink !== 'LINK_TIDAK_DITEMUKAN') {
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
              quantity: quantity.toString()
            }).toString()
          });

          const smmResult = await smmResponse.json();

          if (smmResult.status === true || smmResult.data?.id) {
            success = true;
            if (orderId) await deliverG2GOrder(orderId);
          }
        } catch (smmError) {
          console.error("SMM Error", smmError);
        }
      }

      // Save order record to KV for the Dashboard
      await saveOrderLog({
        timestamp: new Date().toISOString(),
        g2gOrderId: orderId || 'UNKNOWN',
        targetLink: targetLink,
        quantity: quantity,
        success: success,
        offerId: offerId
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
