import crypto from 'crypto';

const G2G_WEBHOOK_SECRET = process.env.G2G_WEBHOOK_SECRET || 'ganti-dengan-secret-anda';

// 1. PEMETAAN PRODUK (Mapping G2G Offer ID ke SMM Service ID)
// Di sebelah kiri adalah ID Produk G2G Anda, di sebelah kanan adalah ID Layanan SMM Panel
// Ganti angka "50" dengan ID Layanan SMM Panel yang benar!
const SERVICE_MAP = {
  "#G1784800280993TX": "50", 
  "DEFAULT": "50" 
};

// 2. Fungsi untuk Delivery Otomatis ke G2G
async function deliverG2GOrder(orderId) {
  const g2gApiKey = process.env.G2G_OPENAPI_KEY;
  const g2gUserId = process.env.G2G_USER_ID;
  
  if (!g2gApiKey || !g2gUserId) {
    console.log("Kredensial G2G OpenAPI belum diisi, pengiriman otomatis dilewati.");
    return;
  }

  try {
    const response = await fetch(`https://open-api.g2g.com/v2/orders/${orderId}/delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'g2g-api-key': g2gApiKey,
        'g2g-userid': g2gUserId
      },
      // Payload pengiriman otomatis
      body: JSON.stringify({
         "delivered_quantity": 1, 
         "remarks": "Pesanan Anda sedang diproses dan otomatis terkirim. Terima kasih!"
      })
    });
    
    const result = await response.json();
    console.log("Hasil Auto-Deliver G2G:", result);
  } catch (err) {
    console.error("Gagal Auto-Deliver ke G2G:", err);
  }
}

// 3. Fungsi Utama Webhook
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const payload = req.body;
    const eventType = payload.event || payload.type; 
    
    console.log(`Menerima webhook event: ${eventType}`);
    console.log("Data pesanan:", JSON.stringify(payload, null, 2));

    const orderId = payload.order_id || payload.id;

    if (eventType === 'order.confirmed' || eventType === 'order.api_delivery') {
      console.log('Pesanan siap diproses!');
      
      const targetLink = payload.buyer_note || 'LINK_TIDAK_DITEMUKAN'; 
      const quantity = payload.quantity || 100;
      
      const offerId = payload.offer_id || (payload.products && payload.products[0] && payload.products[0].offer_id) || 'UNKNOWN_OFFER';
      
      const smmServiceId = SERVICE_MAP[offerId] || process.env.SMM_SERVICE_ID || SERVICE_MAP["DEFAULT"];

      console.log(`Mencoba order SMM Panel untuk link: ${targetLink} sebanyak ${quantity} (SMM Service ID: ${smmServiceId})`);

      const smmApiKey = process.env.PUSATPANELSMM_API_KEY || 'API_KEY_SMM_ANDA';
      const smmSecretKey = process.env.PUSATPANELSMM_SECRET_KEY || 'SECRET_KEY_SMM_ANDA';

      if (targetLink !== 'LINK_TIDAK_DITEMUKAN') {
        try {
          const smmResponse = await fetch('https://pusatpanelsmm.com/api/json.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              api_key: smmApiKey,
              secret_key: smmSecretKey,
              action: 'order', 
              service: smmServiceId,
              data: targetLink, 
              quantity: quantity.toString()
            }).toString()
          });

          const smmResult = await smmResponse.json();
          console.log("Respon dari SMM Panel:", smmResult);

          if (smmResult.status === true || smmResult.data?.id) {
            console.log(`Sukses order ke SMM Panel dengan Order ID SMM:`, smmResult);
            
            if (orderId) {
                console.log(`Mencoba auto-deliver pesanan ${orderId} ke G2G...`);
                await deliverG2GOrder(orderId);
            }
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
