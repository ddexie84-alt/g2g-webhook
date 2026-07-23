"use client";
import { useState, useEffect } from "react";

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [mappings, setMappings] = useState({});
  const [names, setNames] = useState({});
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [newG2gId, setNewG2gId] = useState("");
  const [newSmmId, setNewSmmId] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Modal states
  const [selectedOrder, setSelectedOrder] = useState(null);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === "admin123") {
      setIsAuthenticated(true);
      fetchData();
    } else {
      alert("Password salah!");
    }
  };

  const fetchData = async () => {
    setLoading(true);
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
      setOrders(ordersData.orders || []);
      
      if (profileData.data) {
        setProfile(profileData.data);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    }
    setLoading(false);
  };

  const addMapping = async (e) => {
    e.preventDefault();
    if (!newG2gId || !newSmmId) return;
    
    setIsAdding(true);
    
    try {
      // 1. Fetch ALL services to cross-check the ID
      const servicesRes = await fetch("/api/smm-services");
      let servicesData = await servicesRes.json();
      
      // Some SMM panels wrap the array in { status: true, data: [...] }
      if (servicesData && servicesData.data && Array.isArray(servicesData.data)) {
        servicesData = servicesData.data;
      }
      
      if (!servicesData || !Array.isArray(servicesData)) {
        alert("Gagal membaca daftar layanan SMM Panel.\n\nDetail Respon API: " + JSON.stringify(servicesData).substring(0, 150));
        setIsAdding(false);
        return;
      }

      // 2. Find the service (Some panels use 'id', some use 'service' as key)
      const matchedService = servicesData.find(s => String(s.service) === String(newSmmId) || String(s.id) === String(newSmmId));
      
      if (!matchedService) {
        alert(`❌ ERROR: Layanan SMM dengan ID "${newSmmId}" TIDAK DITEMUKAN di PusatPanelSMM!`);
        setIsAdding(false);
        return;
      }

      // 3. Confirm with the user
      const serviceName = matchedService.name || matchedService.judul || "Layanan Tidak Diketahui";
      const servicePrice = matchedService.rate || matchedService.harga || "0";
      
      const isConfirmed = confirm(`✅ Layanan Ditemukan!\n\nNama: ${serviceName}\nHarga: Rp${servicePrice}/1000\n\nYakin ingin memasangkan G2G ${newG2gId} dengan layanan ini?`);
      
      if (!isConfirmed) {
        setIsAdding(false);
        return;
      }

      // 4. Save to Database
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          g2gId: newG2gId, 
          smmId: newSmmId,
          smmName: serviceName
        })
      });

      if (res.ok) {
        setNewG2gId("");
        setNewSmmId("");
        fetchData();
      }
    } catch (error) {
      console.error("Failed to add mapping", error);
      alert("Terjadi kesalahan saat validasi.");
    }
    
    setIsAdding(false);
  };

  const deleteMapping = async (g2gId) => {
    if (!confirm("Hapus produk ini?")) return;
    try {
      const res = await fetch(`/api/products?id=${g2gId}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (error) {
      console.error("Failed to delete mapping", error);
    }
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
          <h2>📦 Pengelola Produk</h2>
          <p style={{color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem'}}>
            Pasangkan ID Produk G2G dengan ID Layanan SMM Panel di sini.
          </p>
          
          <form onSubmit={addMapping} style={{display: 'flex', gap: '0.5rem', marginBottom: '1.5rem'}}>
            <input 
              type="text" 
              placeholder="ID Produk G2G" 
              value={newG2gId}
              onChange={(e) => setNewG2gId(e.target.value)}
              required
            />
            <input 
              type="text" 
              placeholder="ID SMM Panel" 
              value={newSmmId}
              onChange={(e) => setNewSmmId(e.target.value)}
              style={{width: '150px'}}
              required
            />
            <button type="submit" disabled={isAdding}>
              {isAdding ? '⏳ Mengecek...' : 'Tambah'}
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
                      <td style={{fontFamily: 'monospace', color: 'var(--accent)'}}>{g2g}</td>
                      <td>
                        <strong>ID: {smm}</strong>
                        {names[g2g] && (
                          <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem'}}>
                            {names[g2g]}
                          </div>
                        )}
                      </td>
                      <td style={{textAlign: 'right'}}>
                        <button className="danger" style={{padding: '0.25rem 0.5rem', fontSize: '0.75rem'}} onClick={() => deleteMapping(g2g)}>Hapus</button>
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
            Log transaksi terbaru. Klik "Log" untuk bukti detail.
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
                          <span className={`badge ${parsedOrder.success ? 'success' : 'error'}`}>
                            {parsedOrder.success ? 'SUKSES' : 'ERROR'}
                          </span>
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

      {/* Log Modal */}
      {selectedOrder && (
        <div className="auth-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="auth-card" style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto', textAlign: 'left', cursor: 'default' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ marginBottom: '0' }}>🔍 Detail Log Transaksi</h2>
              <button className="danger" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setSelectedOrder(null)}>Tutup</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
