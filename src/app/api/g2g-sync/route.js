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

export async function POST(req) {
  const g2gApiKey = process.env.G2G_OPENAPI_KEY;
  const g2gUserId = process.env.G2G_USER_ID;
  const g2gSecretKey = process.env.G2G_SECRET;

  if (!g2gApiKey || !g2gUserId || !g2gSecretKey) {
    return NextResponse.json({ error: "Kunci API G2G (G2G_OPENAPI_KEY, G2G_USER_ID, G2G_SECRET) belum dikonfigurasi di Environment Variables Vercel Anda." }, { status: 400 });
  }

  try {
    const postHeaders = generateG2GHeaders('/v2/offers/search', g2gApiKey, g2gUserId, g2gSecretKey);
    const response = await fetch('https://open-api.g2g.com/v2/offers/search', {
      method: 'POST',
      headers: postHeaders,
      body: JSON.stringify({
        "status": "active" 
      })
    });

    const data = await response.json();
    
    // Parser Cerdas: Karena format respons G2G bervariasi, kita cari di mana letak Array-nya.
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

    let fallbackData = null;
    if (offers.length === 0) {
      const getHeaders = generateG2GHeaders('/v2/offers', g2gApiKey, g2gUserId, g2gSecretKey);
      const fallbackRes = await fetch('https://open-api.g2g.com/v2/offers', {
        method: 'GET',
        headers: getHeaders
      });
      fallbackData = await fallbackRes.json();
      if (fallbackData.payload && Array.isArray(fallbackData.payload.results)) offers = fallbackData.payload.results;
      else if (fallbackData.payload && Array.isArray(fallbackData.payload)) offers = fallbackData.payload;
    }

    if (offers.length === 0) {
       return NextResponse.json({ 
         success: false, 
         count: 0, 
         message: "Gagal menarik data dari G2G.",
         debug: { postResponse: data, getResponse: fallbackData }
       }, { status: 400 });
    }

    // Ambil mapping lama agar kita tidak menimpa SMM ID yang sudah diisi pengguna
    const existingMappings = (await redis.hgetall("g2g_smm_mappings")) || {};
    const existingQuantities = (await redis.hgetall("g2g_smm_qty")) || {};
    const existingNames = (await redis.hgetall("g2g_smm_names")) || {};

    let newCount = 0;

    for (const offer of offers) {
      // G2G menyimpan ID Penawaran sebagai offer_id atau id
      const offerId = offer.offer_id || offer.id;
      if (!offerId) continue;
      
      const cleanOfferId = offerId.replace(/^#/, '');
      
      // Ambil nama dari G2G (bisa berada di berbagai field tergantung versi API)
      const offerName = offer.title || offer.offer_title || offer.product_name || offer.description || offer.brand_name || `Produk G2G (ID: ${cleanOfferId})`;

      // Jika produk belum pernah dipetakan sebelumnya, tambahkan ke Dashboard
      if (!existingMappings[cleanOfferId]) {
        await redis.hset("g2g_smm_mappings", { [cleanOfferId]: "BELUM_DIPETAKAN" });
        newCount++;
      }
      
      // Simpan/Update Namanya agar mudah dikenali di Dashboard
      await redis.hset("g2g_smm_names", { [cleanOfferId]: offerName });
      
      // Berikan nilai Qty default 1000
      if (!existingQuantities[cleanOfferId]) {
        await redis.hset("g2g_smm_qty", { [cleanOfferId]: "1000" });
      }
    }

    return NextResponse.json({ success: true, count: newCount, total: offers.length });
  } catch (error) {
    console.error("G2G Sync Error", error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem saat menghubungi server G2G.' }, { status: 500 });
  }
}
