import { NextResponse } from "next/server";

export async function GET() {
  const smmApiKey = process.env.PUSATPANELSMM_API_KEY;
  const smmSecretKey = process.env.PUSATPANELSMM_SECRET_KEY;

  if (!smmApiKey || !smmSecretKey) {
    return NextResponse.json({ error: "API Keys not configured in Vercel" }, { status: 400 });
  }

  try {
    const smmResponse = await fetch('https://pusatpanelsmm.com/api/json.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        api_key: smmApiKey,
        secret_key: smmSecretKey,
        action: 'profile'
      }).toString()
    });

    const smmResult = await smmResponse.json();
    return NextResponse.json(smmResult);
  } catch (error) {
    console.error("SMM Profile Error:", error);
    return NextResponse.json({ error: "Failed to connect to SMM Panel" }, { status: 500 });
  }
}
