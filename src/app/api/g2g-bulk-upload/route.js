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
    const { offerId, email, password, authKey, backupCodes, descriptionTemplate } = await req.json();

    if (!offerId) {
      return NextResponse.json({ error: 'Offer ID is required' }, { status: 400 });
    }

    const g2gApiKey = process.env.G2G_OPENAPI_KEY;
    const g2gUserId = process.env.G2G_USER_ID;
    const g2gSecretKey = process.env.G2G_SECRET;

    if (!g2gApiKey || !g2gUserId || !g2gSecretKey) {
      return NextResponse.json({ error: 'G2G API Keys not configured.' }, { status: 400 });
    }

    // Smart Description Replacement
    let finalDescription = descriptionTemplate
      .replace(/\[EMAIL\]/g, email)
      .replace(/\[PASSWORD\]/g, password)
      .replace(/\[2FA_CODE\]/g, authKey)
      .replace(/\[BACKUP_CODES\]/g, backupCodes);

    const payload = {
      description: finalDescription,
      // Undocumented auto-delivery fields we attempt to inject
      account_username: email,
      account_password: password,
      secret_question_1: "key 2FA",
      secret_answer_1: authKey,
      secret_question_2: "backup codes 8 digit",
      secret_answer_2: backupCodes
    };

    const path = `/v2/offers/${offerId}`;
    const headers = generateG2GHeaders(path, g2gApiKey, g2gUserId, g2gSecretKey);

    const response = await fetch(`https://open-api.g2g.com${path}`, {
      method: 'PATCH',
      headers: headers,
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (response.ok && data.payload) {
      return NextResponse.json({ success: true, payload: data.payload });
    } else {
      return NextResponse.json({ success: false, error: data.error || 'Failed to update offer' });
    }
  } catch (error) {
    console.error("Account Injector Error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
