import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

export async function GET() {
  try {
    const orders = await redis.lrange("recent_orders", 0, 50); // Get last 50 orders
    return NextResponse.json({ orders: orders || [] });
  } catch (error) {
    console.error("Failed to fetch orders", error);
    return NextResponse.json({ orders: [] }, { status: 500 });
  }
}
