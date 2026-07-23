"use client";
import { useState, useEffect } from "react";

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [mappings, setMappings] = useState({});
  const [orders, setOrders] = useState([]);
  const [newG2gId, setNewG2gId] = useState("");
  const [newSmmId, setNewSmmId] = useState("");
  const [loading, setLoading] = useState(true);

  // Simple client-side auth for demonstration
  // In production, use proper authentication (e.g. NextAuth or middleware)
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
      const [mapsRes, ordersRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/orders")
      ]);
      const mapsData = await mapsRes.json();
      const ordersData = await ordersRes.json();
      setMappings(mapsData.mappings || {});
      setOrders(ordersData.orders || []);
    } catch (error) {
      console.error("Failed to fetch data", error);
    }
    setLoading(false);
  };

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
        fetchData();
      }
    } catch (error) {
      console.error("Failed to add mapping", error);
    }
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
      <header>
        <h1>G2G Auto-Delivery</h1>
        <p style={{color: 'var(--text-muted)'}}>Sistem Manajemen Toko Otomatis</p>
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
            <button type="submit">Tambah</button>
          </form>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID Produk G2G</th>
                  <th>ID SMM</th>
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
                      <td><strong>{smm}</strong></td>
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
            Log transaksi terakhir dari webhook.
          </p>
          
          <div className="table-container" style={{maxHeight: '400px', overflowY: 'auto'}}>
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Order ID G2G</th>
                  <th>Target</th>
                  <th>Status SMM</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" className="empty-state">Memuat data...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan="4" className="empty-state">Belum ada pesanan masuk.</td></tr>
                ) : (
                  orders.map((order, i) => (
                    <tr key={i}>
                      <td style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>
                        {new Date(order.timestamp).toLocaleString('id-ID')}
                      </td>
                      <td style={{fontFamily: 'monospace'}}>{order.g2gOrderId}</td>
                      <td>
                        <div style={{maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                          {order.targetLink}
                        </div>
                        <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>Qty: {order.quantity}</div>
                      </td>
                      <td>
                        <span className={`badge ${order.success ? 'success' : 'error'}`}>
                          {order.success ? 'SUKSES' : 'ERROR'}
                        </span>
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
  );
}
