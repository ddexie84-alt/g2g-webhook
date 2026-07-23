import crypto from 'crypto';

// Ganti dengan Webhook Secret dari dashboard G2G Anda nanti
const G2G_WEBHOOK_SECRET = process.env.G2G_WEBHOOK_SECRET || 'ganti-dengan-secret-anda';

export default async function handler(req, res) {
  // Pastikan request menggunakan metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const signature = req.headers['x-g2g-signature'] || req.headers['authorization'];
    const payload = req.body;
    const rawPayload = JSON.stringify(payload);

    // 4. Proses data berdasarkan event
    const eventType = payload.event || payload.type; 
    
    console.log(`Menerima webhook event: ${eventType}`);
    console.log("Data pesanan:", payload);

    if (eventType === 'order.created') {
      console.log('Pesanan baru telah dibuat!');
      // Anda bisa log data atau skip
    } else if (eventType === 'order.confirmed') {
      console.log('Pesanan dikonfirmasi oleh pembeli/pembayaran berhasil!');
      
      // 1. Ekstrak Target Link/Username dari Data G2G
      const targetLink = payload.buyer_note || 'LINK_TIDAK_DITEMUKAN'; 
      const quantity = payload.quantity || 100;

      console.log(`Mencoba order SMM Panel untuk link: ${targetLink} sebanyak ${quantity}`);

      // 2. Tembak API Pusat Panel SMM
      // Mendukung nama variabel SMM_API_KEY atau PUSATPANELSMM_API_KEY
      const smmApiKey = process.env.SMM_API_KEY || process.env.PUSATPANELSMM_API_KEY || 'API_KEY_SMM_ANDA';
      const smmServiceId = process.env.SMM_SERVICE_ID || '1234'; // Ganti dengan Service ID Followers TikTok

      if (targetLink !== 'LINK_TIDAK_DITEMUKAN') {
        try {
          const smmResponse = await fetch('https://pusatpanelsmm.com/api/v2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              key: smmApiKey,
              action: 'add',
              service: smmServiceId,
              link: targetLink,
              quantity: quantity.toString()
            })
          });

          const smmResult = await smmResponse.json();
          console.log("Respon dari SMM Panel:", smmResult);

          if (smmResult.order) {
            console.log(`Sukses order ke SMM Panel dengan Order ID: ${smmResult.order}`);
            // (Opsional) Tembak API G2G untuk Deliver Code bisa ditambahkan di sini nanti
          } else {
            console.error("Gagal order SMM Panel:", smmResult);
          }
        } catch (smmError) {
          console.error("Error saat menghubungi SMM Panel:", smmError);
        }
      } else {
        console.log("Link target tidak ditemukan di pesanan G2G. Melewati order SMM.");
      }
    }

    // 5. Beri tahu G2G bahwa server kita sukses memproses datanya (HTTP 200 OK)
    return res.status(200).json({ 
      success: true, 
      message: 'Webhook processed successfully' 
    });

  } catch (error) {
    console.error("Gagal memproses webhook:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
