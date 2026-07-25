"use client";
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import KatalogTab from "../components/tabs/KatalogTab";
import ChatTab from "../components/tabs/ChatTab";
import FinanceTab from "../components/tabs/FinanceTab";
import BulkUploadTab from "../components/tabs/BulkUploadTab";

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState("pesanan");

  // Pemetaan
  const [mappings, setMappings] = useState({});
  const [newG2gId, setNewG2gId] = useState("");
  const [newSmmId, setNewSmmId] = useState("");
  const [loadingMappings, setLoadingMappings] = useState(true);

  // Pesanan
  const [orders, setOrders] = useState([]);
  const [isFetchingOrders, setIsFetchingOrders] = useState(true);

  // Webhook Logs
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [isFetchingWebhookLogs, setIsFetchingWebhookLogs] = useState(false);

  // Offers (Etalase)
  const [g2gOffers, setG2gOffers] = useState([]);
  const [isFetchingOffers, setIsFetchingOffers] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [editOfferPrice, setEditOfferPrice] = useState("");
  const [editOfferStock, setEditOfferStock] = useState("");
  const [updatingOfferId, setUpdatingOfferId] = useState(null);

  // SMM Services
  const [smmServices, setSmmServices] = useState([]);
  
  // Katalog
  const [g2gProducts, setG2gProducts] = useState([]);
  const [isFetchingProducts, setIsFetchingProducts] = useState(false);
  const [bulkStockStatus, setBulkStockStatus] = useState("");

  const [categoryFilter, setCategoryFilter] = useState('All');

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === "admin123") {
      setIsAuthenticated(true);
      fetchMappings();
      fetchOrders();
    } else {
      alert("Password salah!");
    }
  };

  const fetchMappings = async () => {
    setLoadingMappings(true);
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setMappings(data.mappings || {});
    } catch (error) {
      console.error("Failed to fetch mappings");
    }
    setLoadingMappings(false);
  };

  const fetchOrders = async () => {
    setIsFetchingOrders(true);
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error("Failed to fetch orders");
    }
    setIsFetchingOrders(false);
  };

  const fetchG2gOffers = async () => {
    setIsFetchingOffers(true);
    try {
      const res = await fetch("/api/g2g-offers");
      const data = await res.json();
      if (data.success) {
        setG2gOffers(data.offers || []);
      }
    } catch (e) {
      console.error("Failed to fetch offers", e);
    }
    setIsFetchingOffers(false);
  };

  const fetchSmmServices = async () => {
    try {
      const res = await fetch("/api/smm-services");
      const data = await res.json();
      if (data.success) {
        setSmmServices(data.services || []);
      }
    } catch(e) { console.error(e); }
  };

  const fetchWebhookLogs = async () => {
    setIsFetchingWebhookLogs(true);
    try {
      const res = await fetch('/api/g2g-webhook-logs');
      const data = await res.json();
      if (data.success) {
        setWebhookLogs(data.logs || []);
      }
    } catch(e) { console.error(e); }
    setIsFetchingWebhookLogs(false);
  };

  const fetchG2gProducts = async () => {
    setIsFetchingProducts(true);
    try {
      const res = await fetch('/api/g2g-products');
      const data = await res.json();
      if (data.success) {
        setG2gProducts(data.products || []);
      }
    } catch(e) { console.error(e); }
    setIsFetchingProducts(false);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === 'etalase') {
      if (!Array.isArray(g2gOffers) || g2gOffers.length === 0) fetchG2gOffers();
      if (!Array.isArray(smmServices) || smmServices.length === 0) fetchSmmServices();
    }
    if (activeTab === 'keamanan' && (!Array.isArray(webhookLogs) || webhookLogs.length === 0)) {
      fetchWebhookLogs();
    }
    if (activeTab === 'pesanan' && (!Array.isArray(orders) || orders.length === 0)) {
      fetchOrders();
    }
    if (activeTab === 'katalog' && (!Array.isArray(g2gProducts) || g2gProducts.length === 0)) {
      fetchG2gProducts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAuthenticated]);

  const addMapping = async (e) => {
    e.preventDefault();
    if (!newG2gId || !newSmmId) return;
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ g2gId: newG2gId, smmId: newSmmId })
      });
      if (res.ok) {
        setNewG2gId("");
        setNewSmmId("");
        fetchMappings();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const deleteMapping = async (g2gId) => {
    if (!confirm("Hapus produk ini?")) return;
    try {
      const res = await fetch(`/api/products?id=${g2gId}`, { method: "DELETE" });
      if (res.ok) fetchMappings();
    } catch (error) {
      console.error(error);
    }
  };

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

  if (!isAuthenticated) {
    return (
      <div className="auth-overlay">
        <div className="auth-card">
          <h2 style={{justifyContent: 'center', marginBottom: '2rem'}}>🔒 Area Rahasia</h2>
          <form onSubmit={handleLogin} className="form-group">
            <input 
              type="password" 
              placeholder="Masukkan Kata Sandi" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{marginBottom: '1rem', textAlign: 'center'}}
            />
            <button type="submit" style={{width: '100%'}}>Masuk Dashboard</button>
          </form>
          <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem', textAlign: 'center'}}>
            (Hint: admin123)
          </p>
        </div>
      </div>
    );
  }

  let dailyData = {};
  if (Array.isArray(orders)) {
    orders.forEach(orderStr => {
      let order; 
      try { order = typeof orderStr === 'string' ? JSON.parse(orderStr) : orderStr; } catch(e) { return; } 
      if (!order) return;
      const status = order.rawG2G?.payload?.order_status || order.rawG2G?.event || order.rawG2G?.event_type || order.rawG2G?.type;
      const isPaid = status === 'order.api_delivery' || status === 'order.confirmed' || status === 'paid' || status === 'delivering' || status === 'delivered';
      
      if (isPaid) {
         let g2gPrice = order.rawG2G?.payload?.unit_price || 0;
         const rev = parseFloat(g2gPrice) * (parseInt(order.quantity) || 1);
         const cost = parseFloat(order.smmCost || 0);
         const date = order.timestamp ? new Date(order.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
         
         if (!dailyData[date]) dailyData[date] = { rev: 0, profit: 0 };
         dailyData[date].rev += rev;
         dailyData[date].profit += (rev - cost);
      }
    });
  }
  const chartData = Object.keys(dailyData).sort().map(d => ({ date: d, ...dailyData[d] }));
  const maxVal = Math.max(...chartData.map(d => d.rev), 10);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-dark)' }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', background: 'linear-gradient(90deg, #fff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Vercel G2G CommandCenter
            </h1>
            <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>Sistem Manajemen Toko Otomatis Tingkat Lanjut</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
             <button className="secondary" onClick={handleLogin}>🔄 Sinkronisasi Paksa</button>
          </div>
        </header>

        {activeTab === 'pemetaan' && (
          <div className="card">
            <h2>📦 Pemetaan Produk G2G ke SMM Panel</h2>
            <p style={{color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem'}}>
              Kaitkan ID Produk G2G dengan ID Layanan SMM Panel agar pesanan diproses otomatis.
            </p>
            
            <form onSubmit={addMapping} style={{display: 'flex', gap: '0.5rem', marginBottom: '1.5rem'}}>
              <input type="text" placeholder="ID Produk G2G" value={newG2gId} onChange={(e) => setNewG2gId(e.target.value)} required />
              <input type="text" placeholder="ID SMM Panel" value={newSmmId} onChange={(e) => setNewSmmId(e.target.value)} required />
              <button type="submit">Tambah Pemetaan</button>
            </form>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID G2G</th>
                    <th>ID SMM</th>
                    <th style={{textAlign: 'right'}}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingMappings ? (
                    <tr><td colSpan="3" className="empty-state">Memuat data...</td></tr>
                  ) : Object.keys(mappings).length === 0 ? (
                    <tr><td colSpan="3" className="empty-state">Belum ada produk yang dipetakan.</td></tr>
                  ) : (
                    Object.entries(mappings).map(([g2g, smm]) => (
                      <tr key={g2g}>
                        <td style={{fontFamily: 'monospace', color: 'var(--accent)'}}>{g2g}</td>
                        <td><strong>{smm}</strong></td>
                        <td style={{textAlign: 'right'}}>
                          <button className="danger" onClick={() => deleteMapping(g2g)}>Hapus</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'pesanan' && (
          <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
            <div className="card">
              <h2>📈 Tren Pendapatan Harian (G2G)</h2>
              <div style={{display: 'flex', alignItems: 'flex-end', gap: '10px', height: '150px', padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', overflowX: 'auto'}}>
                 {chartData.length === 0 ? (
                    <div style={{width: '100%', textAlign: 'center', color: 'var(--text-muted)', alignSelf: 'center'}}>Belum ada data pendapatan.</div>
                 ) : chartData.map((d, i) => (
                    <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px'}}>
                       <div style={{height: '100px', width: '30px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', position: 'relative', display: 'flex', alignItems: 'flex-end'}}>
                          <div style={{width: '100%', backgroundColor: 'var(--accent)', height: `${(d.rev/maxVal)*100}%`, borderRadius: '4px', position: 'absolute', opacity: 0.8}}></div>
                          <div style={{width: '100%', backgroundColor: 'var(--success)', height: `${(Math.max(d.profit, 0)/maxVal)*100}%`, borderRadius: '4px', position: 'absolute', opacity: 0.9, zIndex: 1}}></div>
                       </div>
                       <div style={{fontSize: '0.65rem', color: 'var(--text-muted)'}}>{d.date}</div>
                    </div>
                 ))}
              </div>
              <div style={{display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '0.8rem'}}>
                 <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}><div style={{width: '12px', height: '12px', backgroundColor: 'var(--accent)', borderRadius: '2px'}}></div> Pendapatan Kotor</div>
                 <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}><div style={{width: '12px', height: '12px', backgroundColor: 'var(--success)', borderRadius: '2px'}}></div> Estimasi Laba Bersih</div>
              </div>
            </div>

            <div className="card">
              <h2>📋 Riwayat Pesanan SMM Panel</h2>
              <div className="table-container" style={{maxHeight: '400px', overflowY: 'auto'}}>
                <table>
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Order ID G2G</th>
                      <th>Target Link</th>
                      <th>SMM Order ID</th>
                      <th>Status SMM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isFetchingOrders ? (
                      <tr><td colSpan="5" className="empty-state">Memuat pesanan...</td></tr>
                    ) : (!Array.isArray(orders) || orders.length === 0) ? (
                      <tr><td colSpan="5" className="empty-state">Belum ada pesanan masuk.</td></tr>
                    ) : (
                      orders.map((orderStr, i) => {
                        let order; try { order = typeof orderStr === 'string' ? JSON.parse(orderStr) : orderStr; } catch(e) { return null; }
                        if (!order) return null;
                        return (
                          <tr key={i}>
                            <td style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>
                              {new Date(order.timestamp || Date.now()).toLocaleString('id-ID')}
                            </td>
                            <td style={{fontFamily: 'monospace', color: 'var(--accent)'}}>{order.g2gOrderId}</td>
                            <td>
                              <div style={{maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                                {order.targetLink}
                              </div>
                              <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>Qty: {order.quantity}</div>
                            </td>
                            <td style={{fontFamily: 'monospace'}}>{order.smmOrderId || '-'}</td>
                            <td>
                              <span className={`badge ${order.success ? 'success' : 'error'}`}>
                                {order.success ? 'SUKSES' : 'ERROR'}
                              </span>
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
        )}

        {activeTab === 'etalase' && (
          <div className="card">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem'}}>
              <div>
                <h2 style={{margin: 0}}>🏪 Manajemen Etalase (Live G2G)</h2>
                <p style={{color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem'}}>
                  Pantau, Ubah Harga, Ubah Stok, Pause/Play etalase Anda yang sedang tayang di G2G.
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
                            <span style={{
                              padding: '0.2rem 0.5rem', 
                              borderRadius: '4px', 
                              fontSize: '0.8rem',
                              backgroundColor: isActive ? '#d1fae5' : '#fee2e2',
                              color: isActive ? '#047857' : '#b91c1c'
                            }}>
                              {isActive ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td style={{textAlign: 'right'}}>
                            {editingOffer === id ? (
                              <div style={{display: 'flex', gap: '4px', justifyContent: 'flex-end'}}>
                                <button onClick={() => updateOffer(id, { price: editOfferPrice, stock: editOfferStock })} disabled={updatingOfferId === id} style={{padding: '0.3rem', fontSize: '0.8rem'}}>
                                  {updatingOfferId === id ? '⏳' : 'Simpan'}
                                </button>
                                <button onClick={() => setEditingOffer(null)} className="danger" style={{padding: '0.3rem', fontSize: '0.8rem'}}>Batal</button>
                              </div>
                            ) : (
                              <div style={{display: 'flex', gap: '4px', justifyContent: 'flex-end'}}>
                                <button onClick={() => updateOffer(id, { status: isActive ? 0 : 1 })} disabled={updatingOfferId === id} style={{padding: '0.3rem', fontSize: '0.8rem', backgroundColor: isActive ? '#f59e0b' : '#10b981', color: 'white', border: 'none'}}>
                                  {updatingOfferId === id ? '...' : (isActive ? '⏸️ Pause' : '▶️ Play')}
                                </button>
                                <button onClick={() => { setEditingOffer(id); setEditOfferPrice(o.unit_price || o.price); setEditOfferStock(o.available_qty || o.api_qty || o.stock || 0); }} style={{padding: '0.3rem', fontSize: '0.8rem'}} className="secondary">Ubah</button>
                              </div>
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
        )}

        {activeTab === 'katalog' && <KatalogTab g2gProducts={g2gProducts} isFetchingProducts={isFetchingProducts} fetchG2gProducts={fetchG2gProducts} />}
        {activeTab === 'bulk' && <BulkUploadTab />}
        {activeTab === 'chat' && <ChatTab />}
        {activeTab === 'finance' && <FinanceTab />}

        {activeTab === 'keamanan' && (
          <div className="card">
            <h2 style={{marginBottom: '1rem'}}>📡 Log Webhook G2G yang Gagal</h2>
            <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem'}}>
              Menampilkan log dari server G2G untuk webhook yang gagal terkirim ke Vercel Anda dalam 7 hari terakhir.
            </p>
            <div className="table-container" style={{maxHeight: '400px', overflowY: 'auto'}}>
              <table>
                <thead>
                  <tr>
                    <th>Tanggal (UTC)</th>
                    <th>Order ID</th>
                    <th>Tipe Event</th>
                    <th>Status</th>
                    <th>Detail Kegagalan</th>
                  </tr>
                </thead>
                <tbody>
                  {isFetchingWebhookLogs ? (
                    <tr><td colSpan="5" className="empty-state">Menganalisis...</td></tr>
                  ) : (!Array.isArray(webhookLogs) || webhookLogs.length === 0) ? (
                    <tr><td colSpan="5" className="empty-state">🎉 Bersih! Tidak ada webhook gagal.</td></tr>
                  ) : (
                    webhookLogs.map((log, index) => (
                      <tr key={log.id || index} style={{ backgroundColor: 'rgba(185, 28, 28, 0.05)' }}>
                        <td style={{fontFamily: 'monospace'}}>{log.created_at || log.timestamp || 'N/A'}</td>
                        <td>{log.order_id || log.payload?.order_id || 'N/A'}</td>
                        <td><span className="badge warning">{log.event || log.type || 'Unknown'}</span></td>
                        <td><span className="badge danger">GAGAL</span></td>
                        <td style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>{log.response_error || log.error || 'Timeout'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
