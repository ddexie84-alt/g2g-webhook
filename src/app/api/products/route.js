import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

export async function GET() {
  try {
    const mappings = await redis.hgetall('g2g_smm_mappings') || {};
    const names = await redis.hgetall('g2g_smm_names') || {};
    return NextResponse.json({ mappings, names });
  } catch (error) {
    console.error("KV GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch mappings" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { g2gId, smmId, smmName } = await request.json();
    if (!g2gId || !smmId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    
    await redis.hset('g2g_smm_mappings', { [g2gId]: smmId });
    if (smmName) {
      await redis.hset('g2g_smm_names', { [g2gId]: smmName });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("KV POST Error:", error);
    return NextResponse.json({ error: "Failed to save mapping" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    
    await redis.hdel('g2g_smm_mappings', id);
    await redis.hdel('g2g_smm_names', id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("KV DELETE Error:", error);
    return NextResponse.json({ error: "Failed to delete mapping" }, { status: 500 });
  }
}
