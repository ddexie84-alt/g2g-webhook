import crypto from 'crypto';

// Ganti dengan Webhook Secret dari dashboard G2G Anda nanti
const G2G_WEBHOOK_SECRET = process.env.G2G_WEBHOOK_SECRET || 'ganti-dengan-secret-anda';

export default async function handler(req, res) {
  // Pastikan request menggunakan metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Dapatkan signature dari Header HTTP yang dikirim G2G (nama header biasanya x-g2g-signature atau authorization)
    const signature = req.headers['x-g2g-signature'] || req.headers['authorization'];
    
    // 2. Ambil payload / data mentah dari body
    const payload = req.body;
    const rawPayload = JSON.stringify(payload);

    // 3. Verifikasi Signature (Jika diperlukan untuk keamanan)
    // Contoh membuat HMAC SHA256 (Sesuaikan dengan dokumentasi G2G nanti)
    /*
    const expectedSignature = crypto
      .createHmac('sha256', G2G_WEBHOOK_SECRET)
      .update(rawPayload)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'Unauthorized: Invalid signature' });
    }
    */

    // 4. Proses data berdasarkan event
    const eventType = payload.event || payload.type; // Sesuaikan dengan struktur JSON G2G
    
    console.log(`Menerima webhook event: ${eventType}`);
    console.log("Data pesanan:", payload);

    if (eventType === 'order.created') {
      console.log('Pesanan baru telah dibuat!');
      // TODO: Logika kurangi stok di database internal, atau siapkan kode voucher
    } else if (eventType === 'order.confirmed') {
      console.log('Pesanan dikonfirmasi oleh pembeli/pembayaran berhasil!');
      // TODO: Logika mengirimkan API Deliver Code ke G2G
    }

    // 5. Beri tahu G2G bahwa server kita sukses memproses datanya (HTTP 200 OK)
    return res.status(200).json({ 
      success: true, 
      message: 'Webhook processed successfully' 
    });

  } catch (error) {
    console.error("Gagal memproses webhook:", error);
    // Jika ada error internal server, berikan HTTP 500
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
