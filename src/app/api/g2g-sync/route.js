import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

export async function POST(req) {
  const g2gApiKey = process.env.G2G_OPENAPI_KEY;
  const g2gUserId = process.env.G2G_USER_ID;

  if (!g2gApiKey || !g2gUserId) {
    return NextResponse.json({ error: "Kunci API G2G (G2G_OPENAPI_KEY) atau User ID (G2G_USER_ID) belum dikonfigurasi di Environment Variables Vercel Anda." }, { status: 400 });
  }

  try {
    // Memanggil API 'Search Offers' dari G2G (Sesuai dokumentasi OpenAPI G2G)
    // Biasanya ini berupa POST ke /v2/offers/search dengan body kosong atau filter tertentu
    const response = await fetch('https://open-api.g2g.com/v2/offers/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'g2g-api-key': g2gApiKey,
        'g2g-userid': g2gUserId
      },
      body: JSON.stringify({
        "status": "active" // Coba filter yang aktif saja (jika API mendukung)
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

    if (offers.length === 0) {
      // Jika POST /search gagal mengembalikan array, kita coba Fallback ke GET /offers
      const fallbackRes = await fetch('https://open-api.g2g.com/v2/offers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'g2g-api-key': g2gApiKey,
          'g2g-userid': g2gUserId
        }
      });
      const fallbackData = await fallbackRes.json();
      if (fallbackData.payload && Array.isArray(fallbackData.payload.results)) offers = fallbackData.payload.results;
      else if (fallbackData.payload && Array.isArray(fallbackData.payload)) offers = fallbackData.payload;
    }

    if (offers.length === 0) {
       return NextResponse.json({ 
         success: true, 
         count: 0, 
         message: "Koneksi sukses, tetapi tidak ada produk yang ditemukan di G2G Anda, atau API G2G mengembalikan format yang tidak didukung." 
       });
    }

    // Ambil mapping lama agar kita tidak menimpa SMM ID yang sudah diisi pengguna
    const existingMappings = (await redis.hgetall("g2g_smm_mappings")) || {};
    const existingQuantities = (await redis.hgetall("g2g_smm_qty")) || {};

    let newCount = 0;

    for (const offer of offers) {
      // G2G menyimpan ID Penawaran sebagai offer_id atau id
      const offerId = offer.offer_id || offer.id;
      if (!offerId) continue;
      
      const cleanOfferId = offerId.replace(/^#/, '');

      // Jika produk belum pernah dipetakan sebelumnya, tambahkan ke Dashboard
      if (!existingMappings[cleanOfferId]) {
        await redis.hset("g2g_smm_mappings", { [cleanOfferId]: "BELUM_DIPETAKAN" });
        newCount++;
      }
      
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
