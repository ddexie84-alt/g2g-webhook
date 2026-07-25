import { useState } from 'react';

export default function KatalogTab({ g2gProducts, isFetchingProducts, fetchG2gProducts }) {
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [offerData, setOfferData] = useState({ title: '', price: '', stock: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openOfferModal = (product) => {
    setSelectedProduct(product);
    setOfferData({ title: `Top Up ${product.name}`, price: '', stock: '1000' });
    setShowOfferModal(true);
  };

  const handleCreateOffer = async (e) => {
    e.preventDefault();
    if (!offerData.title || !offerData.price || !offerData.stock) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/g2g-offers-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          title: offerData.title,
          price: offerData.price,
          stock: offerData.stock
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("Etalase (Offer) berhasil dibuat di G2G!");
        setShowOfferModal(false);
      } else {
        alert("Gagal membuat offer: " + data.error);
      }
    } catch (e) {
      alert("Gagal mengirim ke server.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="card" style={{ position: 'relative' }}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
        <h2 style={{margin: 0}}>📚 Katalog Resmi G2G</h2>
        <button onClick={fetchG2gProducts} disabled={isFetchingProducts} className="secondary">
          {isFetchingProducts ? '⏳ Menarik Data...' : '🔄 Refresh Katalog'}
        </button>
      </div>
      <p style={{color: 'var(--text-muted)', marginBottom: '1.5rem'}}>
        Gunakan katalog ini untuk melihat daftar game G2G. Anda dapat langsung menjual (*Create Offer*) dari daftar di bawah.
      </p>
      
      {isFetchingProducts ? (
        <div className="empty-state">Menarik data dari API G2G...</div>
      ) : g2gProducts.length === 0 ? (
        <div className="empty-state">Katalog Kosong. Tekan Refresh.</div>
      ) : (
        <div className="metrics-grid">
          {g2gProducts.map(p => (
            <div key={p.id} className="metric-card" style={{borderLeft: '4px solid var(--accent)', display: 'flex', flexDirection: 'column'}}>
              <div style={{flex: 1}}>
                <div style={{fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  {p.name}
                  {p.status === 1 && <span className="badge success">Aktif</span>}
                </div>
                <div style={{fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace'}}>
                  ID: {p.id}
                </div>
                {p.description && (
                   <div style={{fontSize: '0.85rem', marginTop: '0.5rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>
                      {p.description}
                   </div>
                )}
              </div>
              <button 
                onClick={() => openOfferModal(p)}
                style={{marginTop: '1rem', padding: '0.5rem', backgroundColor: 'rgba(99, 102, 241, 0.2)', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'}}
              >
                + Jual Produk Ini
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal Buat Offer */}
      {showOfferModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '400px', border: '1px solid var(--accent)', boxShadow: '0 10px 30px rgba(99,102,241,0.2)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'white' }}>Buat Etalase Baru</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Anda akan membuat penawaran baru untuk <strong>{selectedProduct?.name}</strong>.
            </p>
            
            <form onSubmit={handleCreateOffer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Judul Dagangan (Title)</label>
                <input 
                  type="text" 
                  value={offerData.title}
                  onChange={e => setOfferData({...offerData, title: e.target.value})}
                  required
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Harga (USD)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0.01"
                    value={offerData.price}
                    onChange={e => setOfferData({...offerData, price: e.target.value})}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Stok Awal</label>
                  <input 
                    type="number" 
                    min="1"
                    value={offerData.stock}
                    onChange={e => setOfferData({...offerData, stock: e.target.value})}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowOfferModal(false)} className="secondary" style={{ flex: 1 }}>Batal</button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 1 }}>
                  {isSubmitting ? 'Memproses...' : '🚀 Buat Dagangan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
