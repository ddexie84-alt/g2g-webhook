"use client";
import { useState, useEffect } from "react";

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [mappings, setMappings] = useState({});
  const [names, setNames] = useState({});
  const [quantities, setQuantities] = useState({});
  const [productProviders, setProductProviders] = useState({});
  const [apiProviders, setApiProviders] = useState({});
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [newG2gId, setNewG2gId] = useState("");
  const [newSmmId, setNewSmmId] = useState("");
  const [newSmmQty, setNewSmmQty] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('pemetaan');
  const [g2gStore, setG2gStore] = useState(null);
  const [g2gOffers, setG2gOffers] = useState([]);
  const [isFetchingOffers, setIsFetchingOffers] = useState(false);
  const [marginPercentage, setMarginPercentage] = useState("");
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  const [g2gProducts, setG2gProducts] = useState([]);
  const [isFetchingProducts, setIsFetchingProducts] = useState(false);
  
  const handleBulkSync = async () => {
    if (!marginPercentage || isNaN(marginPercentage)) return;
    if (!confirm(`Apakah Anda yakin ingin melakukan sync massal untuk seluruh etalase dengan margin ${marginPercentage}% dari harga SMM?`)) return;
    
    setIsBulkSyncing(true);
    try {
       const res = await fetch('/api/g2g-bulk-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ marginPercentage: Number(marginPercentage) })
       });
       const data = await res.json();
       if (data.success) {
          alert(`Berhasil sinkronisasi ${data.updatedCount} penawaran.`);
          fetchG2gOffers();
       } else {
          alert(data.error || 'Gagal sinkronisasi massal.');
       }
    } catch(e) {
       alert('Terjadi kesalahan sinkronisasi.');
    }
    setIsBulkSyncing(false);
  };

  const fetchG2gProducts = async () => {
    setIsFetchingProducts(true);
    try {
      const res = await fetch('/api/g2g-products');
      const data = await res.json();
      if (data.success) {
        setG2gProducts(data.products || []);
      }
    } catch(e) {
      console.error(e);
    }
    setIsFetchingProducts(false);
  };

  useEffect(() => {
    if (activeTab === 'katalog' && g2gProducts.length === 0) {
      fetchG2gProducts();
    }
  }, [activeTab]);
  
  // Inline Editing States
  const [editingRow, setEditingRow] = useState(null);
  const [inlineSmmId, setInlineSmmId] = useState("");
  const [inlineSmmQty, setInlineSmmQty] = useState("");
  
  // Etalase Editing States
  const [editingOffer, setEditingOffer] = useState(null);
  const [editOfferPrice, setEditOfferPrice] = useState("");
  const [editOfferStock, setEditOfferStock] = useState("");
  const [searchEtalase, setSearchEtalase] = useState("");
  const [searchPemetaan, setSearchPemetaan] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Semua");
  const [updatingOfferId, setUpdatingOfferId] = useState(null);
  const [manualForceOrderId, setManualForceOrderId] = useState("");
  const [diagnosticsModalOpen, setDiagnosticsModalOpen] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState([]);
  
  // Custom Modal States
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [alertInfo, setAlertInfo] = useState(null); // { type: 'error' | 'success', title: '', message: '' }
  const [confirmInfo, setConfirmInfo] = useState(null); // { g2gId, smmId, smmName, smmPrice, smmQty }

  const fetchG2gOffers = async () => { setIsFetchingOffers(true); try { const res = await fetch('/api/g2g-offers'); const data = await res.json(); if(data.success) setG2gOffers(data.offers); } catch(e){} setIsFetchingOffers(false); };
  const fetchSmmServices = async () => { try { const res = await fetch('/api/smm-services'); const data = await res.json(); if(data.success) setSmmServices(data.services); } catch(e){} };
  
  useEffect(() => { 
    if(activeTab === 'etalase' || activeTab === 'pesanan') {
       if (g2gOffers.length === 0) fetchG2gOffers();
       if (smmServices.length === 0) fetchSmmServices();
    }
  }, [activeTab]);
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
      const [productsRes, ordersRes, profileRes, providersRes, storeRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/orders"),
        fetch("/api/profile"),
        fetch("/api/providers"),
        fetch("/api/g2g-store")
      ]);
      
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setMappings(productsData.mappings || {});
        setNames(productsData.names || {});
        setQuantities(productsData.quantities || {});
        setProductProviders(productsData.providers || {});
      }
      
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData.orders || []);
      }

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData.data || null);
      }

      if (providersRes.ok) {
        const providersData = await providersRes.json();
        setApiProviders(providersData.providers || {});
      }

      if (storeRes.ok) {
        const storeData = await storeRes.json();
        setG2gStore(storeData.store || null);
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

  const initiateAddMapping = async (e, customG2g = null, customSmm = null, customQty = null) => {
    if (e) e.preventDefault();
    
    const targetG2g = customG2g || newG2gId;
    const targetSmm = customSmm || newSmmId;
    const targetQty = customQty || newSmmQty;
    
    if (!targetG2g || !targetSmm || !targetQty) return;
    
    setIsAdding(true);
    
    if (targetSmm.toUpperCase() === 'NON_SMM') {
      setConfirmInfo({
        g2gId: targetG2g,
        smmId: 'NON_SMM',
        smmName: 'Layanan Digital / Akun (Tidak Butuh SMM)',
        smmPrice: '0',
        smmQty: targetQty
      });
      setIsAdding(false);
      return;
    }
    
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

      const matchedService = servicesData.find(s => String(s.service) === String(targetSmm) || String(s.id) === String(targetSmm));
      
      if (!matchedService) {
        setAlertInfo({ 
          type: 'error', 
          title: 'ID Tidak Valid', 
          message: `Layanan SMM dengan ID "${targetSmm}" TIDAK DITEMUKAN di PusatPanelSMM!` 
        });
        setIsAdding(false);
        return;
      }

      const serviceName = matchedService.name || matchedService.judul || "Layanan Tidak Diketahui";
      const servicePrice = matchedService.rate || matchedService.harga || "0";
      
      // Open Confirmation Modal instead of browser confirm()
      setConfirmInfo({
        g2gId: targetG2g,
        smmId: targetSmm,
        smmName: serviceName,
        smmPrice: servicePrice,
        smmQty: targetQty
      });
      
    } catch (error) {
      setAlertInfo({ type: 'error', title: 'Kesalahan Sistem', message: 'Terjadi kesalahan saat proses validasi.' });
    }
    setIsAdding(false);
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
        setG2gOffers(prev => prev.map(o => {
          if ((o.offer_id || o.id) === offerId) {
             return {
                ...o, 
                unit_price: updates.price !== undefined ? updates.price : (o.unit_price || o.price),
                available_qty: updates.stock !== undefined ? updates.stock : (o.available_qty || o.api_qty || o.stock)
             };
          }
          return o;
        }));
        setEditingOffer(null);
      } else {
        alert('Gagal update: ' + (data.error || JSON.stringify(data)));
      }
    } catch(e) {
      alert('Error updating offer: ' + e.message);
    } finally {
      setUpdatingOfferId(null);
    }
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
        // Reset states
        setNewG2gId("");
        setNewSmmId("");
        setNewSmmQty("");
        setEditingRow(null);
        setInlineSmmId("");
        setInlineSmmQty("");
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
          message: (data.message || data.error || 'Terjadi kesalahan sistem.') + (data.debug ? `\n\n[DEBUG G2G]: ${JSON.stringify(data.debug)}` : ''), 
          type: 'error' 
        });
      }
    } catch (error) {
      setAlertInfo({ title: 'Koneksi Gagal', message: 'Tidak dapat menghubungi server Vercel Anda.', type: 'error' });
    }
    setIsSyncing(false);
  };

  const deliverManualG2G = async (orderId, qty) => {
    if (!confirm(`Tandai pesanan ${orderId} sebagai Terkirim di G2G secara manual?`)) return;
    setAlertInfo({ type: 'success', title: 'Memproses...', message: 'Menghubungi G2G API...' });
    try {
      const res = await fetch('/api/g2g-deliver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, qty })
      });
      const data = await res.json();
      if (data.success) {
        setAlertInfo({ type: 'success', title: 'Berhasil', message: 'Pesanan berhasil ditandai Terkirim di G2G!' });
      } else {
        setAlertInfo({ type: 'error', title: 'Gagal', message: data.error || JSON.stringify(data) });
      }
    } catch (error) {
      setAlertInfo({ type: 'error', title: 'Error', message: error.message });
    }
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
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>G2G Auto-Delivery</h1>
          <p style={{color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem'}}>Sistem Manajemen Toko Otomatis</p>
        </div>
        <nav className="nav-menu">
          <button className={`nav-item ${activeTab === 'pemetaan' ? 'active' : ''}`} onClick={() => setActiveTab('pemetaan')}>
            🔗 Pemetaan Produk
          </button>
          <button className={`nav-item ${activeTab === 'etalase' ? 'active' : ''}`} onClick={() => { setActiveTab('etalase'); fetchG2gOffers(); }}>
            🛒 Etalase G2G
          </button>
          <button className={`nav-item ${activeTab === 'pesanan' ? 'active' : ''}`} onClick={() => setActiveTab('pesanan')}>
            📈 Pesanan & Analitik
          </button>
          <button className={`nav-item ${activeTab === 'katalog' ? 'active' : ''}`} onClick={() => setActiveTab('katalog')}>
            📚 Katalog G2G (Beta)
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="top-header">
          {/* Store Widget */}
          <div className="widget">
            <div className="widget-label">Status Toko G2G</div>
            {g2gStore ? (
              <>
                <div className="widget-value" style={{color: 'var(--accent)'}}>⭐ {g2gStore.rating || 'N/A'}</div>
                <div className="widget-sub">
                  🏪 {g2gStore.store_name || g2gStore.name || 'G2G Store'}
                  {g2gStore.status === 'online' && <span style={{color: 'var(--success)', fontSize: '0.6rem'}}>●</span>}
                </div>
              </>
            ) : (
              <div className="widget-sub" style={{color: 'var(--error)'}}>⏳ Memuat data toko...</div>
            )}
          </div>

          {/* Profile Widget */}
          <div className="widget">
            <div className="widget-label">Status SMM Panel</div>
            {profile ? (
              <>
                <div className="widget-value" style={{color: 'var(--success)'}}>Rp {Number(profile.balance || 0).toLocaleString('id-ID')}</div>
                <div className="widget-sub">👤 {profile.username || 'User'}</div>
              </>
            ) : (
              <div className="widget-sub" style={{color: 'var(--error)'}}>⚠️ Gagal mengambil saldo</div>
            )}
          </div>
        </header>

        {activeTab === 'pemetaan' && (
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
            
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h3 style={{ margin: 0, color: '#d97706', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#d97706' }}></span>
                  Menunggu Pemetaan (Belum Siap)
                </h3>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <button onClick={() => setCategoryFilter('Semua')} className={`badge ${categoryFilter === 'Semua' ? 'warning' : ''}`} style={{border: 'none', cursor: 'pointer', background: categoryFilter === 'Semua' ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: categoryFilter === 'Semua' ? '#fbbf24' : 'var(--text-muted)'}}>Semua</button>
                  <button onClick={() => setCategoryFilter('Akun')} className={`badge ${categoryFilter === 'Akun' ? 'warning' : ''}`} style={{border: 'none', cursor: 'pointer', background: categoryFilter === 'Akun' ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: categoryFilter === 'Akun' ? '#fbbf24' : 'var(--text-muted)'}}>Akun</button>
                  <button onClick={() => setCategoryFilter('Top Up')} className={`badge ${categoryFilter === 'Top Up' ? 'warning' : ''}`} style={{border: 'none', cursor: 'pointer', background: categoryFilter === 'Top Up' ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: categoryFilter === 'Top Up' ? '#fbbf24' : 'var(--text-muted)'}}>Top Up</button>
                </div>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>ID G2G</th>
                      <th>Nama / Judul</th>
                      <th style={{textAlign: 'right'}}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="3" className="empty-state">Memuat data...</td></tr>
                    ) : Object.keys(mappings).filter(k => mappings[k] === 'BELUM_DIPETAKAN').length === 0 ? (
                      <tr><td colSpan="3" className="empty-state">Semua produk sudah dipetakan! 🎉</td></tr>
                    ) : (
                      Object.entries(mappings).filter(([g2g, smm]) => smm === 'BELUM_DIPETAKAN').filter(([g2g]) => {
                        const title = (names[g2g] || "").toLowerCase();
                        if (categoryFilter === 'Akun') {
                          return title.includes('account') || title.includes('akun') || title.includes('premium') || title.includes('netflix') || title.includes('spotify');
                        } else if (categoryFilter === 'Top Up') {
                          return title.includes('top up') || title.includes('subscription') || title.includes('vip') || title.includes('uc') || title.includes('diamond');
                        }
                        return true;
                      }).map(([g2g, smm]) => (
                      <tr key={g2g} style={{ backgroundColor: 'rgba(245, 158, 11, 0.05)' }}>
                        <td style={{fontFamily: 'monospace', color: '#fbbf24', fontSize: '1.1rem'}}>{g2g}</td>
                        <td style={{fontSize: '0.85rem', lineHeight: '1.4'}}>
                          {names[g2g] ? (
                            <div style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}} title={names[g2g]}>
                              {names[g2g]}
                            </div>
                          ) : 'Tidak Diketahui'}
                        </td>
                        <td style={{textAlign: 'right'}}>
                          {editingRow === g2g ? (
                            <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                              <input 
                                type="text" 
                                placeholder="ID SMM" 
                                value={inlineSmmId} 
                                onChange={(e) => setInlineSmmId(e.target.value)}
                                style={{padding: '0.3rem', width: '80px', fontSize: '0.8rem'}}
                              />
                              <input 
                                type="number" 
                                placeholder="Qty" 
                                value={inlineSmmQty} 
                                onChange={(e) => setInlineSmmQty(e.target.value)}
                                style={{padding: '0.3rem', width: '80px', fontSize: '0.8rem'}}
                              />
                              <div style={{display: 'flex', gap: '4px'}}>
                                <button style={{padding: '0.3rem', backgroundColor: 'var(--success)', border: 'none', color: 'white', flex: 1, borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem'}} onClick={() => initiateAddMapping(null, g2g, inlineSmmId, inlineSmmQty)}>✔</button>
                                <button style={{padding: '0.3rem', backgroundColor: '#e2e8f0', border: 'none', flex: 1, borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem'}} onClick={() => setEditingRow(null)}>✖</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                              <button 
                                style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px', backgroundColor: 'var(--accent)', border: 'none', color: 'white', cursor: 'pointer'}} 
                                onClick={() => {
                                  setEditingRow(g2g);
                                  setInlineSmmId('');
                                  setInlineSmmQty(1000);
                                }}>
                                ✏️ Edit
                              </button>
                              <button 
                                style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px', backgroundColor: 'var(--text-muted)', border: 'none', color: 'white', cursor: 'pointer'}} 
                                onClick={() => initiateAddMapping(null, g2g, 'NON_SMM', 1)}>
                                Abaikan (Non-SMM)
                              </button>
                              <button className="danger" style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px'}} onClick={() => deleteMapping(g2g)}>Hapus</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 style={{ marginBottom: '1rem', color: '#047857', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#047857' }}></span>
              Siap Pakai (Sudah Dipetakan)
            </h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID G2G</th>
                    <th>Detail SMM</th>
                    <th style={{textAlign: 'right'}}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="3" className="empty-state">Memuat data...</td></tr>
                  ) : Object.keys(mappings).filter(k => mappings[k] !== 'BELUM_DIPETAKAN').length === 0 ? (
                    <tr><td colSpan="3" className="empty-state">Belum ada produk yang dipetakan.</td></tr>
                  ) : (
                    Object.entries(mappings).filter(([g2g, smm]) => smm !== 'BELUM_DIPETAKAN').map(([g2g, smm]) => (
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
                        {editingRow === g2g ? (
                          <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                            <input 
                              type="text" 
                              value={inlineSmmId} 
                              onChange={(e) => setInlineSmmId(e.target.value)}
                              style={{padding: '0.3rem', width: '80px', fontSize: '0.8rem'}}
                            />
                            <input 
                              type="number" 
                              value={inlineSmmQty} 
                              onChange={(e) => setInlineSmmQty(e.target.value)}
                              style={{padding: '0.3rem', width: '80px', fontSize: '0.8rem'}}
                            />
                            <button style={{padding: '0.4rem', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '0.8rem'}} onClick={() => initiateAddMapping(null, g2g, inlineSmmId, inlineSmmQty)}>Simpan</button>
                            <button style={{padding: '0.4rem', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem'}} onClick={() => setEditingRow(null)}>Batal</button>
                          </div>
                        ) : (
                          <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                            <button 
                              style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px', backgroundColor: 'var(--accent)', border: 'none', color: 'white', cursor: 'pointer'}} 
                              onClick={() => {
                                setEditingRow(g2g);
                                setInlineSmmId(smm === 'NON_SMM' ? 'NON_SMM' : smm);
                                setInlineSmmQty(quantities[g2g] || 1000);
                              }}>
                              ✏️ Edit
                            </button>
                            <button className="danger" style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px'}} onClick={() => deleteMapping(g2g)}>Hapus</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
        </div>
      )}

      {activeTab === 'pesanan' && (
      <>
        {/* Analytics Section */}
        {(() => {
           let totalRevenue = 0;
           let totalCost = 0;
           
           orders.forEach(orderStr => {
             const order = typeof orderStr === 'string' ? JSON.parse(orderStr) : orderStr;
             const status = order.rawG2G?.payload?.order_status || order.rawG2G?.event || order.rawG2G?.event_type || order.rawG2G?.type;
             const isPaid = status === 'order.api_delivery' || status === 'order.confirmed' || status === 'paid' || status === 'delivering' || status === 'delivered';
             
             if (isPaid) {
                // Find G2G Price
                let g2gPrice = order.rawG2G?.payload?.unit_price || 0;
                if (!g2gPrice) {
                   const cleanOffer = (order.offerId || "").replace(/^#/, '');
                   const offer = g2gOffers.find(o => (o.offer_id || o.id) === cleanOffer);
                   if (offer) g2gPrice = offer.unit_price || offer.price || 0;
                }
                
                // Find SMM Price (per 1000 usually)
                let smmPrice = 0;
                const service = smmServices.find(s => String(s.service) === String(order.smmServiceId));
                if (service) {
                   smmPrice = (Number(service.rate || service.price || 0) / 1000); 
                }
                
                const revenue = Number(g2gPrice) * Number(order.purchasedQty || 0);
                const cost = smmPrice * Number(order.quantity || 0); // order.quantity is totalSmmQuantity
                
                totalRevenue += revenue;
                totalCost += cost;
             }
           });
           
           const totalProfit = totalRevenue - totalCost;

           return (
             <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', marginBottom: '2rem' }}>
               <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent)' }}>
                 <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total Pendapatan (G2G)</div>
                 <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Rp {totalRevenue.toLocaleString('id-ID')}</div>
               </div>
               <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--error)' }}>
                 <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total Pengeluaran (SMM)</div>
                 <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Rp {totalCost.toLocaleString('id-ID')}</div>
               </div>
               <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--success)' }}>
                 <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Keuntungan Bersih (Profit)</div>
                 <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>Rp {totalProfit.toLocaleString('id-ID')}</div>
               </div>
             </div>
           );
        })()}

        <div className="card">
          <h2>📋 Riwayat Pesanan & Log Keamanan</h2>
          <p style={{color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem'}}>
            Semua transaksi masuk dicatat di sini. Gunakan tombol "Kirim Manual" jika SMM gagal/tertunda.
          </p>
          
          <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap'}}>
             <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center', borderRight: '1px solid var(--border)', paddingRight: '1rem', flex: 1}}>
                 <input 
                   type="text" 
                   placeholder="Order ID Lama (Contoh: 1784...)" 
                   value={manualForceOrderId}
                   onChange={(e) => setManualForceOrderId(e.target.value)}
                   style={{flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.8rem'}}
                 />
                 <button 
                   onClick={() => {
                     if (manualForceOrderId.trim()) {
                        deliverManualG2G(manualForceOrderId.trim(), 1);
                        setManualForceOrderId("");
                     }
                   }}
                   style={{padding: '0.5rem 1rem', fontSize: '0.8rem', backgroundColor: 'var(--success)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap'}}
                 >
                   📦 Kirim Manual
                 </button>
             </div>
             
             <button 
               onClick={async () => {
                 setWebhookLogs(null);
                 setDiagnosticsModalOpen(true);
                 try {
                    const res = await fetch('/api/g2g-webhook-logs');
                    const data = await res.json();
                    setWebhookLogs(data.logs || []);
                 } catch(e) {
                    setWebhookLogs([]);
                 }
               }}
               style={{padding: '0.5rem 1rem', fontSize: '0.8rem', backgroundColor: '#374151', border: '1px solid #4b5563', color: 'white', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap'}}
             >
               📡 Cek Webhook G2G Gagal
             </button>
          </div>
          
          <div className="table-container" style={{maxHeight: '600px', overflowY: 'auto'}}>
            <table>
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Order G2G</th>
                  <th>Layanan SMM & Target</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="empty-state">Memuat data...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan="5" className="empty-state">Belum ada pesanan masuk.</td></tr>
                ) : (
                  orders.map((order, i) => {
                    const parsedOrder = typeof order === 'string' ? JSON.parse(order) : order;
                    return (
                      <tr key={i}>
                        <td style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>
                          {new Date(parsedOrder.timestamp).toLocaleTimeString('id-ID')}
                          <div style={{fontSize: '0.65rem', marginTop: '4px'}}>{new Date(parsedOrder.timestamp).toLocaleDateString('id-ID')}</div>
                        </td>
                        <td style={{fontFamily: 'monospace'}}>
                           {parsedOrder.g2gOrderId}
                           <div style={{fontSize: '0.7rem', color: 'var(--accent)', marginTop: '4px'}}>{parsedOrder.offerId}</div>
                        </td>
                        <td>
                           <div style={{fontSize: '0.8rem', fontWeight: 'bold'}}>{parsedOrder.smmServiceId === 'NON_SMM' ? 'NON-SMM (Digital)' : `ID SMM: ${parsedOrder.smmServiceId}`}</div>
                           <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all', maxWidth: '200px'}}>{parsedOrder.targetLink}</div>
                        </td>
                        <td>
                          {(() => {
                            const statusOrEvent = parsedOrder.rawG2G?.payload?.order_status || parsedOrder.rawG2G?.event || parsedOrder.rawG2G?.event_type || parsedOrder.rawG2G?.type;
                            const badge = getG2gStatusBadge(statusOrEvent);
                            return (
                              <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                                <span style={{ backgroundColor: badge.bg, color: badge.color, padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-block', whiteSpace: 'nowrap' }}>
                                  {badge.label}
                                </span>
                                {parsedOrder.success === false && parsedOrder.rawSMM?.error && (
                                   <span style={{color: 'var(--error)', fontSize: '0.7rem', display: 'block', maxWidth: '150px'}} title={parsedOrder.rawSMM.error}>⚠️ SMM Error</span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td>
                          <div style={{display: 'flex', gap: '4px'}}>
                            <button 
                              style={{padding: '0.25rem 0.5rem', fontSize: '0.75rem', backgroundColor: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: '4px', cursor: 'pointer'}} 
                              onClick={() => setSelectedOrder(parsedOrder)}
                            >
                              Log
                            </button>
                            {(() => {
                              const status = parsedOrder.rawG2G?.payload?.order_status || parsedOrder.rawG2G?.event || parsedOrder.rawG2G?.event_type || parsedOrder.rawG2G?.type;
                              const isPaid = status === 'order.api_delivery' || status === 'order.confirmed' || status === 'paid' || status === 'delivering';
                              
                              if (parsedOrder.g2gOrderId && !parsedOrder.g2gOrderId.startsWith('TEST') && isPaid) {
                                return (
                                  <button 
                                    style={{padding: '0.25rem 0.5rem', fontSize: '0.75rem', backgroundColor: 'var(--success)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer'}} 
                                    onClick={() => deliverManualG2G(parsedOrder.g2gOrderId, parsedOrder.purchasedQty || 1)}
                                  >
                                    Force
                                  </button>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
      )}

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

      {/* Diagnostics Modal */}
      {diagnosticsModalOpen && (
        <div className="modal-overlay" onClick={() => setDiagnosticsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: '800px', width: '90%'}}>
            <h2 style={{marginBottom: '1rem'}}>📡 Log Webhook G2G yang Gagal</h2>
            <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem'}}>
              Menampilkan log dari server G2G untuk webhook yang gagal terkirim ke Vercel Anda dalam 7 hari terakhir. 
              Gunakan ID Pesanan di bawah ini pada fitur "Kirim Manual" jika pesanan terlewat.
            </p>

            <div style={{maxHeight: '400px', overflowY: 'auto'}}>
              {!webhookLogs ? (
                 <p style={{textAlign: 'center', padding: '2rem'}}>⏳ Menarik log dari G2G Server...</p>
              ) : webhookLogs.length === 0 ? (
                 <p style={{textAlign: 'center', padding: '2rem', color: 'var(--success)'}}>✅ Semua sistem lancar! Tidak ada webhook gagal dari G2G.</p>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                  {webhookLogs.map((log, i) => (
                    <div key={i} style={{padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                        <strong style={{color: 'var(--error)'}}>Status: {log.status}</strong>
                        <span style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>{log.created_at || 'Waktu tidak diketahui'}</span>
                      </div>
                      <div style={{fontSize: '0.85rem', marginBottom: '0.5rem'}}>
                        <strong>Event:</strong> <span style={{color: 'var(--accent)'}}>{log.event_type}</span>
                      </div>
                      <div style={{fontSize: '0.85rem', marginBottom: '0.5rem'}}>
                        <strong>Target URL:</strong> <code style={{padding: '2px 4px', backgroundColor: 'rgba(255,255,255,0.1)'}}>{log.target_url}</code>
                      </div>
                      <div style={{fontSize: '0.85rem'}}>
                        <strong>Pesan Error (G2G):</strong> <span style={{color: '#f87171'}}>{log.error_message || log.message || 'Tidak ada respons'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{marginTop: '1.5rem', textAlign: 'right'}}>
              <button className="danger" onClick={() => setDiagnosticsModalOpen(false)}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* Login Style Overlay */}
      {alertInfo && !confirmInfo && (
        <div className="modal-overlay" onClick={() => setAlertInfo(null)}>
          <div className="modal" style={{ maxWidth: '400px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
              {alertInfo.type === 'error' ? '❌' : '✅'}
            </div>
            <h2 style={{ justifyContent: 'center', color: alertInfo.type === 'error' ? 'var(--error)' : 'var(--success)', marginBottom: '1rem' }}>
              {alertInfo.title || 'Pemberitahuan'}
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

      {activeTab === 'etalase' && (
        <div className="card">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem'}}>
            <h2 style={{margin: 0}}>Etalase G2G Aktif</h2>
            <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap', minWidth: '200px'}}>
              <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center', borderRight: '1px solid var(--border)', paddingRight: '1rem'}}>
                 <span style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Auto-Margin:</span>
                 <input 
                    type="number" 
                    placeholder="%" 
                    value={marginPercentage}
                    onChange={(e) => setMarginPercentage(e.target.value)}
                    style={{width: '60px', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)'}}
                 />
                 <button onClick={handleBulkSync} disabled={isBulkSyncing || !marginPercentage} style={{padding: '0.4rem 0.8rem', backgroundColor: 'var(--accent)', border: 'none', color: 'white', borderRadius: '4px'}}>
                    {isBulkSyncing ? '⏳ Sync...' : '⚡ Sync Massal'}
                 </button>
              </div>
              <input 
                type="text" 
                placeholder="🔍 Cari ID atau Nama Penawaran..." 
                value={searchEtalase} 
                onChange={(e) => setSearchEtalase(e.target.value)} 
                style={{ flex: 1, minWidth: '200px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}
              />
              <button onClick={fetchG2gOffers} disabled={isFetchingOffers} style={{padding: '0.5rem 1rem', borderRadius: '4px'}}>
                {isFetchingOffers ? 'Memuat...' : '🔄 Refresh'}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {['Semua', 'Akun', 'Top Up', 'Platform Engagement'].map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)} style={{ padding: '0.4rem 1rem', borderRadius: '20px', border: categoryFilter === cat ? 'none' : '1px solid var(--border)', backgroundColor: categoryFilter === cat ? 'var(--primary)' : 'transparent', color: categoryFilter === cat ? 'white' : 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }}>{cat}</button>
            ))}
          </div>
          {isFetchingOffers && g2gOffers.length === 0 ? <p>Membaca data etalase langsung dari G2G API...</p> : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID Penawaran</th>
                    <th>Nama Penawaran</th>
                    <th>Harga Jual</th>
                    <th>Stok</th>
                    <th>Status</th>
                    <th style={{textAlign: 'right'}}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {g2gOffers.length === 0 ? (
                    <tr><td colSpan="6" className="empty-state">Tidak ada penawaran ditemukan</td></tr>
                  ) : g2gOffers.filter(o => {
                    const title = String(o.offer_title || o.title || '').toLowerCase();
                    const q = searchEtalase.toLowerCase();
                    const matchesSearch = !searchEtalase || String(o.offer_id || o.id || '').toLowerCase().includes(q) || title.includes(q);
                    if (!matchesSearch) return false;
                    
                    if (categoryFilter === 'Akun') {
                      return title.includes('account') || title.includes('akun') || title.includes('premium') || title.includes('netflix') || title.includes('spotify');
                    } else if (categoryFilter === 'Top Up') {
                      return title.includes('top up') || title.includes('subscription') || title.includes('vip') || title.includes('uc') || title.includes('diamond');
                    } else if (categoryFilter === 'Platform Engagement') {
                      return title.includes('followers') || title.includes('likes') || title.includes('views') || title.includes('comments') || title.includes('tiktok') || title.includes('youtube') || title.includes('instagram');
                    }
                    return true;
                  }).map(o => {
                    const rawStatus = o.offer_status ?? o.status ?? o.active ?? o.display ?? 'unknown';
                    const isActive = String(rawStatus).toLowerCase() === 'active' || String(rawStatus).toLowerCase() === 'live' || String(rawStatus).toLowerCase() === 'online' || rawStatus === 1 || rawStatus === true;
                    return (
                    <tr key={o.offer_id || o.id}>
                      <td style={{fontFamily: 'monospace', color: 'var(--accent)'}}>{o.offer_id || o.id}</td>
                      <td>{o.offer_title || o.title || 'Penawaran G2G'}</td>
                      <td>
                        {editingOffer === (o.offer_id || o.id) ? (
                          <input type="number" step="0.01" value={editOfferPrice} onChange={(e) => setEditOfferPrice(e.target.value)} style={{ width: '80px', padding: '0.2rem' }} />
                        ) : (
                          `${o.offer_currency || o.currency} ${o.unit_price || o.price}`
                        )}
                      </td>
                      <td>
                        {editingOffer === (o.offer_id || o.id) ? (
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
                        {editingOffer === (o.offer_id || o.id) ? (
                          <div style={{display: 'flex', gap: '4px', justifyContent: 'flex-end'}}>
                            <button onClick={() => updateOffer(o.offer_id || o.id, { price: editOfferPrice, stock: editOfferStock })} disabled={updatingOfferId === (o.offer_id || o.id)} style={{padding: '0.3rem', fontSize: '0.8rem'}}>
                              {updatingOfferId === (o.offer_id || o.id) ? '⏳ Menyimpan...' : 'Simpan'}
                            </button>
                            <button onClick={() => setEditingOffer(null)} className="danger" style={{padding: '0.3rem', fontSize: '0.8rem'}}>Batal</button>
                          </div>
                        ) : (
                          <div style={{display: 'flex', gap: '4px', justifyContent: 'flex-end'}}>
                            <button onClick={() => updateOffer(o.offer_id || o.id, { status: isActive ? 'offline' : 'live' })} disabled={updatingOfferId === (o.offer_id || o.id)} style={{padding: '0.3rem', fontSize: '0.8rem', backgroundColor: isActive ? '#f59e0b' : '#10b981', color: 'white', border: 'none'}}>
                              {updatingOfferId === (o.offer_id || o.id) ? '...' : (isActive ? 'Matikan' : 'Hidupkan')}
                            </button>
                            <button onClick={() => { setEditingOffer(o.offer_id || o.id); setEditOfferPrice(o.unit_price || o.price); setEditOfferStock(o.available_qty || o.api_qty || o.stock || 0); }} style={{padding: '0.3rem', fontSize: '0.8rem'}}>Ubah</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'katalog' && (
        <div className="card">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
            <h2 style={{margin: 0}}>📚 Katalog Resmi G2G</h2>
            <button onClick={fetchG2gProducts} disabled={isFetchingProducts} className="secondary">
              {isFetchingProducts ? '⏳ Menarik Data...' : '🔄 Refresh Katalog'}
            </button>
          </div>
          <p style={{color: 'var(--text-muted)', marginBottom: '1.5rem'}}>
            Gunakan katalog ini untuk melakukan riset game atau layanan yang paling banyak tersedia di G2G sebelum Anda memutuskan untuk memetakannya ke SMM Panel.
          </p>
          
          {isFetchingProducts ? (
            <div className="empty-state">Menarik data dari API G2G...</div>
          ) : g2gProducts.length === 0 ? (
            <div className="empty-state">Katalog Kosong. Tekan Refresh.</div>
          ) : (
            <div className="metrics-grid">
              {g2gProducts.map(p => (
                <div key={p.id} className="metric-card" style={{borderLeft: '4px solid var(--accent)'}}>
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
              ))}
            </div>
          )}
        </div>
      )}

      </main>
    </div>
  );
}
