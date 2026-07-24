"use client";
import { useState, useEffect } from "react";

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [mappings, setMappings] = useState({});
  const [names, setNames] = useState({});
  const [quantities, setQuantities] = useState({});
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [newG2gId, setNewG2gId] = useState("");
  const [newSmmId, setNewSmmId] = useState("");
  const [newSmmQty, setNewSmmQty] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Custom Modal States
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [alertInfo, setAlertInfo] = useState(null); // { type: 'error' | 'success', title: '', message: '' }
  const [confirmInfo, setConfirmInfo] = useState(null); // { g2gId, smmId, smmName, smmPrice, smmQty }

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === "admin123") {
      setIsAuthenticated(true);
      fetchData();
    } else {
      setAlertInfo({ type: 'error', title: 'Akses Ditolak', message: 'Password salah!' });
    }
  };

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [mapsRes, ordersRes, profileRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/orders"),
        fetch("/api/profile")
      ]);
      const mapsData = await mapsRes.json();
      const ordersData = await ordersRes.json();
      const profileData = await profileRes.json();
      
      setMappings(mapsData.mappings || {});
      setNames(mapsData.names || {});
      setQuantities(mapsData.quantities || {});
      setOrders(ordersData.orders || []);
      
      if (profileData.data) {
        setProfile(profileData.data);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    }
    if (!silent) setLoading(false);
  };

  // Auto-Refresh (Polling) setiap 15 detik untuk mendapatkan data terbaru tanpa perlu reload manual
  useEffect(() => {
    let interval;
    if (isAuthenticated) {
      interval = setInterval(() => {
        fetchData(true);
      }, 15000);
    }
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Step 1: Validate
  const initiateAddMapping = async (e) => {
    e.preventDefault();
    if (!newG2gId || !newSmmId || !newSmmQty) return;
    
    setIsAdding(true);
    
    try {
      const servicesRes = await fetch("/api/smm-services");
      let servicesData = await servicesRes.json();
      
      if (servicesData && servicesData.data && Array.isArray(servicesData.data)) {
        servicesData = servicesData.data;
      }
      
      if (!servicesData || !Array.isArray(servicesData)) {
        setAlertInfo({ 
          type: 'error', 
          title: 'Koneksi SMM Gagal', 
          message: 'Gagal membaca daftar layanan PusatPanelSMM.' 
        });
        setIsAdding(false);
        return;
      }

      const matchedService = servicesData.find(s => String(s.service) === String(newSmmId) || String(s.id) === String(newSmmId));
      
      if (!matchedService) {
        setAlertInfo({ 
          type: 'error', 
          title: 'ID Tidak Valid', 
          message: `Layanan SMM dengan ID "${newSmmId}" TIDAK DITEMUKAN di PusatPanelSMM!` 
        });
        setIsAdding(false);
        return;
      }

      const serviceName = matchedService.name || matchedService.judul || "Layanan Tidak Diketahui";
      const servicePrice = matchedService.rate || matchedService.harga || "0";
      
      // Open Confirmation Modal instead of browser confirm()
      setConfirmInfo({
        g2gId: newG2gId,
        smmId: newSmmId,
        smmName: serviceName,
        smmPrice: servicePrice,
        smmQty: newSmmQty
      });
      
    } catch (error) {
      setAlertInfo({ type: 'error', title: 'Kesalahan Sistem', message: 'Terjadi kesalahan saat proses validasi.' });
    }
    setIsAdding(false);
  };

  // Step 2: Execute after confirmation
  const executeAddMapping = async () => {
    if (!confirmInfo) return;
    setAlertInfo({ type: 'success', title: 'Menyimpan...', message: 'Mohon tunggu sebentar.' });
    
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          g2gId: confirmInfo.g2gId, 
          smmId: confirmInfo.smmId,
          smmName: confirmInfo.smmName,
          smmQty: confirmInfo.smmQty
        })
      });

      if (res.ok) {
        setNewG2gId("");
        setNewSmmId("");
        setNewSmmQty("");
        setAlertInfo(null);
        setConfirmInfo(null);
        fetchData();
      }
    } catch (error) {
      setAlertInfo({ type: 'error', title: 'Gagal', message: 'Gagal menyimpan ke database.' });
    }
  };

  const deleteMapping = async (g2gId) => {
    if (!confirm("Hapus produk ini?")) return;
    try {
      const res = await fetch(`/api/products?id=${encodeURIComponent(g2gId)}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (error) {
      console.error("Failed to delete mapping", error);
    }
  };

  const syncG2G = async () => {
    setIsSyncing(true);
    setAlertInfo(null);
    try {
      const res = await fetch('/api/g2g-sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setAlertInfo({ 
          title: 'Sinkronisasi Berhasil', 
          message: `Ditemukan total ${data.total} produk di G2G. ${data.count} produk baru berhasil ditarik ke Dashboard!`, 
          type: 'success' 
        });
        fetchData();
      } else {
        setAlertInfo({ 
          title: 'Sinkronisasi Gagal', 
          message: data.message || data.error || 'Terjadi kesalahan sistem.', 
          type: 'error' 
        });
      }
    } catch (error) {
      setAlertInfo({ title: 'Koneksi Gagal', message: 'Tidak dapat menghubungi server Vercel Anda.', type: 'error' });
    }
    setIsSyncing(false);
  };

  const getG2gStatusBadge = (statusOrEvent) => {
    switch(statusOrEvent) {
      case 'unpaid':
      case 'order.created': 
        return { label: 'Belum Dibayar', color: '#d97706', bg: '#fef3c7' };
      case 'paid':
      case 'order.confirmed': 
        return { label: 'Sudah Dibayar', color: '#1d4ed8', bg: '#dbeafe' };
      case 'start_delivering':
        return { label: 'Persiapan Kirim', color: '#4338ca', bg: '#e0e7ff' };
      case 'delivering':
      case 'order.api_delivery': 
        return { label: 'Sedang Dikirim', color: '#6d28d9', bg: '#ede9fe' };
      case 'awaiting_buyer_confirmation':
      case 'order.delivered': 
        return { label: 'Menunggu Konfirmasi', color: '#c2410c', bg: '#ffedd5' };
      case 'delivered':
      case 'partial_delivered':
      case 'order.completed': 
        return { label: 'Terkirim Selesai', color: '#047857', bg: '#d1fae5' };
      case 'cancelled':
      case 'order.cancelled': 
        return { label: 'Dibatalkan', color: '#b91c1c', bg: '#fee2e2' };
      case 'refunded':
        return { label: 'Dana Dikembalikan', color: '#be123c', bg: '#ffe4e6' };
      default: 
        return { label: statusOrEvent || 'Tidak Diketahui', color: '#374151', bg: '#f3f4f6' };
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="auth-overlay">
        {alertInfo && (
          <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--error)', padding: '1rem', borderRadius: '0.5rem', zIndex: 100}}>
            {alertInfo.message}
          </div>
        )}
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
          <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem'}}>
            (Hint: admin123)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', textAlign: 'left' }}>
        <div>
          <h1 style={{ marginBottom: '0' }}>G2G Auto-Delivery</h1>
          <p style={{color: 'var(--text-muted)'}}>Sistem Manajemen Toko Otomatis</p>
        </div>
        
        {/* Profile Widget */}
        <div className="card" style={{ padding: '1rem 1.5rem', minWidth: '250px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Status SMM Panel
          </div>
          {profile ? (
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--success)' }}>
                Rp {Number(profile.balance || 0).toLocaleString('id-ID')}
              </div>
              <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                👤 {profile.username || 'User'}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--error)' }}>
              ⚠️ Gagal mengambil saldo
            </div>
          )}
        </div>
      </header>

      <div className="grid">
        {/* Left Column: Product Mapping */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <h2 style={{ marginBottom: '0.25rem' }}>📦 Pengelola Produk</h2>
              <p style={{color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0}}>
                Pasangkan ID Produk G2G dengan ID Layanan SMM.
              </p>
            </div>
            <button 
              onClick={syncG2G} 
              disabled={isSyncing}
              style={{ backgroundColor: 'var(--success)', border: 'none', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              {isSyncing ? '⏳ Menyinkronkan...' : '🔄 Tarik Data dari G2G'}
            </button>
          </div>
          
          <form onSubmit={initiateAddMapping} style={{display: 'flex', gap: '0.5rem', marginBottom: '1.5rem'}}>
            <input 
              type="text" 
              placeholder="ID G2G" 
              value={newG2gId}
              onChange={(e) => setNewG2gId(e.target.value)}
              style={{flex: 2}}
              required
            />
            <input 
              type="text" 
              placeholder="ID SMM" 
              value={newSmmId}
              onChange={(e) => setNewSmmId(e.target.value)}
              style={{flex: 1}}
              required
            />
            <input 
              type="number" 
              placeholder="Jmlh (Cth: 1000)" 
              value={newSmmQty}
              onChange={(e) => setNewSmmQty(e.target.value)}
              style={{flex: 1}}
              required
            />
            <button type="submit" disabled={isAdding}>
              {isAdding ? '⏳...' : 'Tambah'}
            </button>
          </form>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID Produk G2G</th>
                  <th>Layanan SMM Panel</th>
                  <th style={{textAlign: 'right'}}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="3" className="empty-state">Memuat data...</td></tr>
                ) : Object.keys(mappings).length === 0 ? (
                  <tr><td colSpan="3" className="empty-state">Belum ada produk yang dipetakan.</td></tr>
                ) : (
                  Object.entries(mappings).map(([g2g, smm]) => (
                    <tr key={g2g}>
                      <td style={{fontFamily: 'monospace', color: 'var(--accent)', fontSize: '1.1rem'}}>{g2g}</td>
                      <td>
                        <strong>ID: {smm}</strong> 
                        <span style={{marginLeft: '8px', fontSize: '0.8rem', backgroundColor: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', color: 'white'}}>
                          Qty: {quantities[g2g] || 1000}
                        </span>
                        {names[g2g] && (
                          <div style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', lineHeight: '1.4'}}>
                            {names[g2g]}
                          </div>
                        )}
                      </td>
                      <td style={{textAlign: 'right'}}>
                        <button className="danger" style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px'}} onClick={() => deleteMapping(g2g)}>Hapus</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Order History */}
        <div className="card">
          <h2>📋 Riwayat Pesanan</h2>
          <p style={{color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem'}}>
            Log transaksi terbaru. Klik "Log API" untuk bukti detail.
          </p>
          
          <div className="table-container" style={{maxHeight: '400px', overflowY: 'auto'}}>
            <table>
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Order G2G</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" className="empty-state">Memuat data...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan="4" className="empty-state">Belum ada pesanan masuk.</td></tr>
                ) : (
                  orders.map((order, i) => {
                    const parsedOrder = typeof order === 'string' ? JSON.parse(order) : order;
                    return (
                      <tr key={i}>
                        <td style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>
                          {new Date(parsedOrder.timestamp).toLocaleTimeString('id-ID')}
                        </td>
                        <td style={{fontFamily: 'monospace'}}>{parsedOrder.g2gOrderId}</td>
                        <td>
                          {(() => {
                            const statusOrEvent = parsedOrder.rawG2G?.payload?.order_status || parsedOrder.rawG2G?.event || parsedOrder.rawG2G?.event_type || parsedOrder.rawG2G?.type;
                            const badge = getG2gStatusBadge(statusOrEvent);
                            return (
                              <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                                <span style={{
                                  backgroundColor: badge.bg, 
                                  color: badge.color, 
                                  padding: '4px 8px', 
                                  borderRadius: '12px', 
                                  fontSize: '0.75rem', 
                                  fontWeight: 'bold',
                                  display: 'inline-block',
                                  width: 'fit-content'
                                }}>
                                  {badge.label}
                                </span>
                                <div style={{fontSize: '0.7rem', color: 'var(--text-muted)'}}>
                                  {parsedOrder.success ? '✅ SMM Sukses' : '❌ SMM Dilewati/Gagal'}
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        <td>
                          <button 
                            style={{padding: '0.25rem 0.5rem', fontSize: '0.75rem', backgroundColor: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)'}} 
                            onClick={() => setSelectedOrder(parsedOrder)}
                          >
                            Log API
                          </button>
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

      {/* Confirmation Modal */}
      {confirmInfo && (
        <div className="auth-overlay" onClick={() => setConfirmInfo(null)}>
          <div className="auth-card" style={{ maxWidth: '600px', width: '90%', textAlign: 'center', cursor: 'default' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>Konfirmasi Pasangan</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>Sistem akan mengalikan Qty G2G dengan Jumlah SMM di bawah ini.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              {/* G2G Card */}
              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'left' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Toko G2G</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'monospace', color: 'white' }}>{confirmInfo.g2gId}</div>
              </div>
              
              <div style={{ margin: '-1.5rem auto 0', zIndex: 2, backgroundColor: 'var(--bg)', padding: '0.5rem', borderRadius: '50%', border: '1px solid var(--border)' }}>
                🔗
              </div>

              {/* SMM Card */}
              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'left', marginTop: '-1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Layanan SMM Panel (ID: {confirmInfo.smmId})</div>
                  <div style={{ fontSize: '0.9rem', color: 'white', backgroundColor: 'var(--primary)', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>x {confirmInfo.smmQty}</div>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--success)', marginBottom: '0.5rem', lineHeight: '1.4' }}>{confirmInfo.smmName}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Harga Modal: Rp {confirmInfo.smmPrice} / 1000</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="danger" style={{ flex: 1 }} onClick={() => setConfirmInfo(null)}>Batalkan</button>
              <button style={{ flex: 1 }} onClick={executeAddMapping}>Simpan Pasangan</button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertInfo && !confirmInfo && (
        <div className="auth-overlay" onClick={() => setAlertInfo(null)}>
          <div className="auth-card" style={{ maxWidth: '400px', width: '90%', textAlign: 'center', cursor: 'default' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
              {alertInfo.type === 'error' ? '❌' : '✅'}
            </div>
            <h2 style={{ color: alertInfo.type === 'error' ? 'var(--error)' : 'var(--success)', marginBottom: '1rem' }}>
              {alertInfo.title}
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.5' }}>
              {alertInfo.message}
            </p>
            <button style={{ width: '100%' }} onClick={() => setAlertInfo(null)}>Tutup</button>
          </div>
        </div>
      )}



      {/* Log Modal */}
      {selectedOrder && (
        <div className="auth-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="auth-card" style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto', textAlign: 'left', cursor: 'default' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h2 style={{ marginBottom: '0' }}>🔍 Detail Log</h2>
                {(() => {
                  const statusOrEvent = selectedOrder.rawG2G?.payload?.order_status || selectedOrder.rawG2G?.event || selectedOrder.rawG2G?.event_type || selectedOrder.rawG2G?.type;
                  const badge = getG2gStatusBadge(statusOrEvent);
                  return (
                    <span style={{
                      backgroundColor: badge.bg, 
                      color: badge.color, 
                      padding: '4px 12px', 
                      borderRadius: '12px', 
                      fontSize: '0.8rem', 
                      fontWeight: 'bold',
                    }}>
                      {badge.label}
                    </span>
                  );
                })()}
              </div>
              <button className="danger" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setSelectedOrder(null)}>Tutup</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Papan Rute / Routing Board */}
              {selectedOrder.smmServiceId && (
                <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border)', display: 'flex', gap: '2rem', alignItems: 'center' }}>
                  <div style={{flex: 1}}>
                    <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem'}}>Produk G2G</div>
                    <div style={{fontWeight: 'bold', color: 'white', fontFamily: 'monospace', fontSize: '1.2rem'}}>{selectedOrder.offerId}</div>
                  </div>
                  
                  <div style={{fontSize: '1.5rem'}}>➔</div>
                  
                  <div style={{flex: 1}}>
                    <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem'}}>SMM Panel ID</div>
                    <div style={{fontWeight: 'bold', color: 'var(--success)', fontFamily: 'monospace', fontSize: '1.2rem'}}>{selectedOrder.smmServiceId}</div>
                  </div>
                  
                  <div style={{fontSize: '1.5rem'}}>🧮</div>
                  
                  <div style={{flex: 1}}>
                    <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem'}}>Total Kirim (Qty)</div>
                    <div style={{fontWeight: 'bold', fontFamily: 'monospace', fontSize: '1.2rem'}}>
                      <span style={{color: 'var(--text-muted)'}}>{selectedOrder.purchasedQty || 1} x {selectedOrder.baseSmmQty || '?'} = </span> 
                      <span style={{color: 'var(--primary)'}}>{selectedOrder.quantity}</span>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--accent)' }}>📡 Data Masuk dari G2G (Payload)</h3>
                <pre style={{ fontSize: '0.75rem', overflowX: 'auto', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  {JSON.stringify(selectedOrder.rawG2G || {}, null, 2)}
                </pre>
              </div>

              <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: selectedOrder.success ? 'var(--success)' : 'var(--error)' }}>
                  🤖 Balasan dari SMM Panel
                </h3>
                <pre style={{ fontSize: '0.75rem', overflowX: 'auto', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  {JSON.stringify(selectedOrder.rawSMM || {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
