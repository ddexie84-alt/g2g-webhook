export default function Sidebar({ activeTab, setActiveTab, fetchG2gOffers }) {
  return (
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
        <button className={`nav-item ${activeTab === 'finance' ? 'active' : ''}`} onClick={() => setActiveTab('finance')}>
          💰 Dompet & Keuangan
        </button>
        <button className={`nav-item ${activeTab === 'katalog' ? 'active' : ''}`} onClick={() => setActiveTab('katalog')}>
          📚 Katalog G2G (Beta)
        </button>
        <button className={`nav-item ${activeTab === 'bulk' ? 'active' : ''}`} onClick={() => setActiveTab('bulk')}>
          🚀 Upload Massal Akun
        </button>
        <button className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
          💬 Pesan Pembeli
        </button>
        <button className={`nav-item ${activeTab === 'keamanan' ? 'active' : ''}`} onClick={() => setActiveTab('keamanan')}>
          🛡️ Audit & Webhook
        </button>
      </nav>
    </aside>
  );
}
