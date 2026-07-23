import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
});

export async function GET() {
  try {
    const mappings = await redis.hgetall("service_map");
    return NextResponse.json({ mappings: mappings || {} });
  } catch (error) {
    console.error("Failed to fetch mappings", error);
    return NextResponse.json({ mappings: {} }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { g2gId, smmId } = await req.json();
    if (!g2gId || !smmId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    await redis.hset("service_map", { [g2gId]: smmId });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    
    await redis.hdel("service_map", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
