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
    const { productId, title, price, csvData, descriptionTemplate } = await req.json();

    const g2gApiKey = process.env.G2G_OPENAPI_KEY;
    const g2gUserId = process.env.G2G_USER_ID;
    const g2gSecretKey = process.env.G2G_SECRET;

    if (!g2gApiKey || !g2gUserId || !g2gSecretKey) {
      return NextResponse.json({ error: 'G2G API Keys not configured.' }, { status: 400 });
    }

    // Parse CSV
    const lines = csvData.split('\n').filter(line => line.trim().length > 0);
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const line of lines) {
      // support tab, comma, or pipe
      let cols = line.split('|');
      if (cols.length < 2) cols = line.split('\t');
      if (cols.length < 2) cols = line.split(',');

      const email = cols[0]?.trim() || '';
      const password = cols[1]?.trim() || '';
      const authKey = cols[2]?.trim() || '';
      const backupCodes = cols[3]?.trim() || '';

      if (!email) continue;

      // Smart Description Replacement
      let finalDescription = descriptionTemplate
        .replace(/\[EMAIL\]/g, email)
        .replace(/\[PASSWORD\]/g, password)
        .replace(/\[2FA_CODE\]/g, authKey)
        .replace(/\[BACKUP_CODES\]/g, backupCodes);

      const payload = {
        product_id: productId,
        title: title,
        unit_price: parseFloat(price),
        currency: "USD",
        stock: 1, // 1 account per offer
        description: finalDescription,
        // We attempt to pass these undocumented fields hoping G2G API accepts them for auto-delivery.
        // If they are ignored, the Smart Description will serve as the fallback for manual delivery.
        account_username: email,
        account_password: password,
        secret_question_1: "key 2FA",
        secret_answer_1: authKey,
        secret_question_2: "backup codes 8 digit",
        secret_answer_2: backupCodes
      };

      const path = '/v2/offers';
      const headers = generateG2GHeaders(path, g2gApiKey, g2gUserId, g2gSecretKey);

      try {
        const response = await fetch(`https://open-api.g2g.com${path}`, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (response.ok && data.payload && data.payload.offer_id) {
          successCount++;
          results.push({ email, success: true, offerId: data.payload.offer_id, message: 'Created successfully' });
        } else {
          errorCount++;
          results.push({ email, success: false, error: data.error || 'Failed to create offer' });
        }
      } catch (err) {
        errorCount++;
        results.push({ email, success: false, error: err.message });
      }

      // Add a 500ms delay to prevent hitting rate limits
      await new Promise(r => setTimeout(r, 500));
    }

    return NextResponse.json({ success: true, successCount, errorCount, results });
  } catch (error) {
    console.error("Bulk Upload Error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
