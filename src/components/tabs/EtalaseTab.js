import { useState } from "react";

export default function EtalaseTab({ g2gOffers, isFetchingOffers, fetchG2gOffers }) {
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  // Edit State
  const [editingOffer, setEditingOffer] = useState(null);
  const [editOfferPrice, setEditOfferPrice] = useState('');
  const [editOfferStock, setEditOfferStock] = useState('');
  const [editOfferStatus, setEditOfferStatus] = useState(1);
  const [updatingOfferId, setUpdatingOfferId] = useState(null);

  // Quick Add State
  const [newProductId, setNewProductId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('1');
  const [newDescription, setNewDescription] = useState('Auto-generated offer via Vercel Seller Dashboard');
  const [isAdding, setIsAdding] = useState(false);
  const [addResult, setAddResult] = useState('');

  const updateOffer = async (offerId, updates) => {
    setUpdatingOfferId(offerId);
    try {
      const res = await fetch('/api/g2g-offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId, ...updates })
      });
      const data = await res.json();
      if (data.success) {
        setEditingOffer(null);
        fetchG2gOffers();
      } else {
        alert("Gagal update: " + data.error);
      }
    } catch (e) {
      alert("Gagal update offer");
    }
    setUpdatingOfferId(null);
  };

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!newProductId || !newTitle || !newPrice || !newStock) {
      alert("Harap lengkapi field yang wajib!");
      return;
    }
    setIsAdding(true);
    setAddResult('');

    try {
      const res = await fetch('/api/g2g-offers-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: newProductId,
          title: newTitle,
          price: newPrice,
          stock: newStock,
          description: newDescription
        })
      });
      const data = await res.json();
      if (data.success) {
        setAddResult('✅ Berhasil membuat penawaran baru!');
        setNewTitle('');
        fetchG2gOffers();
      } else {
        setAddResult('❌ Gagal: ' + data.error);
      }
    } catch (e) {
      setAddResult('❌ Terjadi kesalahan jaringan.');
    }
    setIsAdding(false);
  };

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
      {/* SECTION: Tambah Etalase Cepat */}
      <div className="card">
        <h2>⚡ Tambah Etalase Cepat</h2>
        <p style={{color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem'}}>
          Buat etalase baru secara instan sesuai standar G2G OpenAPI V2.
        </p>
        <form onSubmit={handleQuickAdd} style={{display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'var(--bg-dark)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)'}}>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem'}}>
            <div className="form-group">
              <label>Kategori (Product ID) <span style={{color: 'red'}}>*</span></label>
              <input type="text" placeholder="Contoh: 15481" value={newProductId} onChange={(e) => setNewProductId(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Harga per Unit (USD) <span style={{color: 'red'}}>*</span></label>
              <input type="number" step="0.01" placeholder="15.50" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Stok Awal <span style={{color: 'red'}}>*</span></label>
              <input type="number" placeholder="1" value={newStock} onChange={(e) => setNewStock(e.target.value)} required />
            </div>
          </div>
          <div className="form-group">
            <label>Judul Etalase (Title) <span style={{color: 'red'}}>*</span></label>
            <input type="text" placeholder="Masukkan judul..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Deskripsi Etalase (Publik) <span style={{color: 'red'}}>*</span></label>
            <textarea rows="3" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} required style={{fontFamily: 'monospace', fontSize: '0.85rem'}}></textarea>
          </div>
          <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
            <button type="submit" className="primary" disabled={isAdding}>
              {isAdding ? '⏳ Memproses...' : '➕ Buat Etalase Sekarang'}
            </button>
            {addResult && <span style={{fontSize: '0.875rem', color: addResult.startsWith('✅') ? 'var(--success)' : 'var(--danger)'}}>{addResult}</span>}
          </div>
        </form>
      </div>

      {/* SECTION: Manajemen Etalase */}
      <div className="card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem'}}>
          <div>
            <h2 style={{margin: 0}}>🏪 Manajemen Etalase (Live G2G)</h2>
            <p style={{color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem'}}>
              Pantau, Ubah Harga, Ubah Stok, dan Status (Online/Offline) etalase Anda.
            </p>
          </div>
          <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
            <button onClick={fetchG2gOffers} disabled={isFetchingOffers} className="secondary">
              {isFetchingOffers ? '⏳ Sinkronisasi...' : '🔄 Segarkan'}
            </button>
          </div>
        </div>

        <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem'}}>
          {['All', 'Active', 'Inactive'].map(cat => (
             <button key={cat} onClick={() => setCategoryFilter(cat)} className={categoryFilter === cat ? 'primary' : 'secondary'} style={{padding: '0.4rem 1rem', fontSize: '0.85rem', borderRadius: '20px', whiteSpace: 'nowrap'}}>
                {cat}
             </button>
          ))}
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Offer ID</th>
                <th>Judul Etalase</th>
                <th>Harga (USD)</th>
                <th>Stok Tersedia</th>
                <th>Status Live</th>
                <th style={{textAlign: 'right'}}>Aksi Cepat</th>
              </tr>
            </thead>
            <tbody>
              {isFetchingOffers ? (
                <tr><td colSpan="6" className="empty-state">Menarik data etalase dari API G2G...</td></tr>
              ) : (!Array.isArray(g2gOffers) || g2gOffers.length === 0) ? (
                <tr><td colSpan="6" className="empty-state">Etalase kosong atau Gagal menarik data.</td></tr>
              ) : (
                g2gOffers.filter(o => {
                  if (!o) return false;
                  const rawStatus = o.offer_status ?? o.status ?? o.active ?? o.display ?? 'unknown';
                  const isActive = String(rawStatus).toLowerCase() === 'active' || String(rawStatus).toLowerCase() === 'live' || String(rawStatus).toLowerCase() === 'online' || rawStatus === 1 || rawStatus === true;
                  
                  if (categoryFilter === 'Active') return isActive;
                  if (categoryFilter === 'Inactive') return !isActive;
                  return true;
                }).map((o, idx) => {
                  const id = o.offer_id || o.id;
                  const rawStatus = o.offer_status ?? o.status ?? o.active ?? o.display ?? 'unknown';
                  const isActive = String(rawStatus).toLowerCase() === 'active' || String(rawStatus).toLowerCase() === 'live' || String(rawStatus).toLowerCase() === 'online' || rawStatus === 1 || rawStatus === true;
                  
                  return (
                    <tr key={id || idx}>
                      <td style={{fontFamily: 'monospace', color: 'var(--accent)'}}>{id}</td>
                      <td>{o.offer_title || o.title || 'Penawaran G2G'}</td>
                      <td>
                        {editingOffer === id ? (
                          <input type="number" step="0.01" value={editOfferPrice} onChange={(e) => setEditOfferPrice(e.target.value)} style={{ width: '80px', padding: '0.2rem' }} />
                        ) : (
                          `${o.offer_currency || o.currency || 'USD'} ${o.unit_price || o.price}`
                        )}
                      </td>
                      <td>
                        {editingOffer === id ? (
                          <input type="number" value={editOfferStock} onChange={(e) => setEditOfferStock(e.target.value)} style={{ width: '60px', padding: '0.2rem' }} />
                        ) : (
                          o.available_qty || o.api_qty || o.stock || 0
                        )}
                      </td>
                      <td>
                        {editingOffer === id ? (
                          <select value={editOfferStatus} onChange={e => setEditOfferStatus(parseInt(e.target.value))} style={{padding: '0.2rem'}}>
                            <option value={1}>Active</option>
                            <option value={0}>Inactive</option>
                          </select>
                        ) : (
                          <span className={`badge ${isActive ? 'success' : 'danger'}`}>
                            {isActive ? 'Aktif' : 'Non-aktif'}
                          </span>
                        )}
                      </td>
                      <td style={{textAlign: 'right'}}>
                        {editingOffer === id ? (
                          <div style={{display: 'flex', gap: '0.5rem', justifyContent: 'flex-end'}}>
                            <button className="success" onClick={() => updateOffer(id, { price: editOfferPrice, stock: editOfferStock, status: editOfferStatus })} disabled={updatingOfferId === id}>
                              Simpan
                            </button>
                            <button className="secondary" onClick={() => setEditingOffer(null)}>Batal</button>
                          </div>
                        ) : (
                          <button className="primary" onClick={() => {
                            setEditingOffer(id);
                            setEditOfferPrice(o.unit_price || o.price || 0);
                            setEditOfferStock(o.available_qty || o.api_qty || o.stock || 0);
                            setEditOfferStatus(isActive ? 1 : 0);
                          }}>
                            Ubah
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
