import crypto from 'crypto';

const G2G_WEBHOOK_SECRET = process.env.G2G_WEBHOOK_SECRET || 'ganti-dengan-secret-anda';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const payload = req.body;
    const eventType = payload.event || payload.type; 
    
    console.log(`Menerima webhook event: ${eventType}`);
    console.log("Data pesanan:", payload);

    if (eventType === 'order.confirmed') {
      console.log('Pesanan dikonfirmasi oleh pembeli/pembayaran berhasil!');
      
      const targetLink = payload.buyer_note || 'LINK_TIDAK_DITEMUKAN'; 
      const quantity = payload.quantity || 100;

      console.log(`Mencoba order SMM Panel untuk link: ${targetLink} sebanyak ${quantity}`);

      // Kredensial baru khusus untuk pusatpanelsmm.com/api/json.php
      const smmApiKey = process.env.PUSATPANELSMM_API_KEY || 'API_KEY_SMM_ANDA';
      const smmSecretKey = process.env.PUSATPANELSMM_SECRET_KEY || 'SECRET_KEY_SMM_ANDA';
      const smmServiceId = process.env.SMM_SERVICE_ID || '1234'; 

      if (targetLink !== 'LINK_TIDAK_DITEMUKAN') {
        try {
          const smmResponse = await fetch('https://pusatpanelsmm.com/api/json.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              api_key: smmApiKey,
              secret_key: smmSecretKey,
              action: 'order', // atau bisa dicoba 'pesan' jika 'order' tidak bisa
              service: smmServiceId,
              data: targetLink, 
              quantity: quantity.toString()
            }).toString()
          });

          const smmResult = await smmResponse.json();
          console.log("Respon dari SMM Panel:", smmResult);

          if (smmResult.status === true || smmResult.data?.id) {
            console.log(`Sukses order ke SMM Panel dengan Order ID:`, smmResult);
          } else {
            console.error("Gagal order SMM Panel:", smmResult);
          }
        } catch (smmError) {
          console.error("Error saat menghubungi SMM Panel:", smmError);
        }
      }
    }

    return res.status(200).json({ success: true, message: 'Webhook processed' });

  } catch (error) {
    console.error("Gagal memproses webhook:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
