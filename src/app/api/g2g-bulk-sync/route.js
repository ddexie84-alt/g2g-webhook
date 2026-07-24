import { NextResponse } from "next/server";
import crypto from 'crypto';
import { Redis } from '@upstash/redis';

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
    return NextResponse.json({ error: "G2G API Keys not configured." }, { status: 400 });
  }

  try {
    const { marginPercentage } = await req.json();
    if (!marginPercentage || marginPercentage < 0) {
      return NextResponse.json({ error: "Margin percentage tidak valid" }, { status: 400 });
    }

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    const mappings = (await redis.hgetall("g2g_smm_mappings")) || {};
    if (Object.keys(mappings).length === 0) {
      return NextResponse.json({ error: "Tidak ada pemetaan produk." }, { status: 400 });
    }

    // 1. Fetch SMM Services
    const smmRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/smm-services`);
    const smmData = await smmRes.json();
    if (!smmData.success) throw new Error("Gagal mengambil harga SMM");
    const smmServices = smmData.services;

    // 2. Fetch G2G Offers
    const headers = generateG2GHeaders('/v2/offers/search', g2gApiKey, g2gUserId, g2gSecretKey);
    const g2gRes = await fetch('https://open-api.g2g.com/v2/offers/search', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({})
    });
    const g2gData = await g2gRes.json();
    let offers = g2gData.payload?.results || g2gData.payload || g2gData.data || g2gData;

    let updatedCount = 0;
    let errors = [];

    // 3. Process each mapping
    for (const offerId of Object.keys(mappings)) {
       const cleanOfferId = offerId.replace(/^#/, '');
       const smmId = mappings[offerId];
       if (smmId === 'BELUM_DIPETAKAN' || smmId === 'NON_SMM') continue;

       const service = smmServices.find(s => String(s.service) === String(smmId));
       const offer = offers.find(o => String(o.offer_id || o.id) === String(cleanOfferId));

       if (service && offer) {
          const baseCost = Number(service.rate || service.price || 0) / 1000;
          // Calculate target price: baseCost + (baseCost * marginPercentage / 100)
          // Add extra for G2G fee? Let's just use raw margin on SMM cost.
          let targetPrice = baseCost * (1 + (Number(marginPercentage) / 100));
          
          // Minimum price on G2G usually around 0.5 or 1 USD equivalent, but we just set it.
          // Format to 2 decimal places
          targetPrice = Number(targetPrice.toFixed(2));
          
          if (targetPrice > 0 && targetPrice !== Number(offer.unit_price)) {
             const patchPath = `/v2/offers/${cleanOfferId}`;
             const patchHeaders = generateG2GHeaders(patchPath, g2gApiKey, g2gUserId, g2gSecretKey);
             const updateRes = await fetch(`https://open-api.g2g.com${patchPath}`, {
                method: 'PATCH',
                headers: patchHeaders,
                body: JSON.stringify({ unit_price: targetPrice })
             });
             
             if (updateRes.ok) {
                 updatedCount++;
             } else {
                 errors.push(`Gagal update offer ${cleanOfferId}`);
             }
          }
       }
    }

    return NextResponse.json({ success: true, updatedCount, errors });
  } catch (error) {
    console.error("G2G Bulk Sync Error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
