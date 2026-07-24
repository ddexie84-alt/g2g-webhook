import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Initialize Redis client using environment variables
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export async function GET() {
  try {
    const providers = (await redis.hgetall("api_providers")) || {};
    
    // Parse JSON values
    const parsedProviders = {};
    for (const [key, value] of Object.entries(providers)) {
      parsedProviders[key] = typeof value === 'string' ? JSON.parse(value) : value;
    }

    // Default Fallback for PusatPanelSMM from ENV if not exists
    if (!parsedProviders['PUSATPANELSMM']) {
      parsedProviders['PUSATPANELSMM'] = {
        id: 'PUSATPANELSMM',
        name: 'PusatPanelSMM (Default ENV)',
        type: 'smm_standard',
        url: 'https://pusatpanelsmm.com/api/json.php',
        apiKey: process.env.PUSATPANELSMM_API_KEY || '',
        secretKey: process.env.PUSATPANELSMM_SECRET_KEY || ''
      };
    }

    return NextResponse.json({ success: true, providers: parsedProviders });
  } catch (error) {
    console.error("GET Providers error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { id, name, type, url, apiKey, secretKey, apiId } = body;

    if (!id || !name || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const providerData = { id, name, type, url, apiKey, secretKey, apiId };
    await redis.hset("api_providers", { [id]: JSON.stringify(providerData) });

    return NextResponse.json({ success: true, message: `Provider ${name} saved successfully.` });
  } catch (error) {
    console.error("POST Provider error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Provider ID required" }, { status: 400 });
    }

    await redis.hdel("api_providers", id);
    return NextResponse.json({ success: true, message: `Provider ${id} deleted.` });
  } catch (error) {
    console.error("DELETE Provider error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
