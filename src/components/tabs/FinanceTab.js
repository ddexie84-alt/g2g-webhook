import { useState, useEffect } from 'react';

export default function FinanceTab() {
  const [financeData, setFinanceData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinance();
  }, []);

  const fetchFinance = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/g2g-finance');
      const data = await res.json();
      if (data.success) {
        setFinanceData(data.finance);
      }
    } catch (error) {
      console.error("Failed to fetch finance data");
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="card empty-state">⏳ Sedang menghubungi Bank G2G...</div>;
  }

  if (!financeData) {
    return <div className="card empty-state">Gagal memuat data keuangan.</div>;
  }

  return (
    <div className="card" style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>💰 Dompet & Keuangan (G2G Wallet)</h2>
        <button onClick={fetchFinance} className="secondary">🔄 Segarkan Saldo</button>
      </div>

      <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {/* Main Balance Card */}
        <div style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(192, 132, 252, 0.1))', padding: '2rem', borderRadius: '1rem', border: '1px solid rgba(99, 102, 241, 0.3)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Total Saldo Tersedia</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'Outfit', color: 'white' }}>
             <span style={{ fontSize: '1.5rem', marginRight: '0.5rem', color: 'var(--accent)' }}>{financeData.currency || 'USD'}</span>
             {financeData.balance || '0.00'}
          </div>
          <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', fontSize: '8rem', opacity: 0.1, transform: 'rotate(-15deg)' }}>💳</div>
        </div>

        {/* Pending Clearance Card */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Menunggu Pencairan (Pending)</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'Outfit', color: 'var(--warning)' }}>
             <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>{financeData.currency || 'USD'}</span>
             {financeData.pending_clearance || '0.00'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Akan masuk ke saldo tersedia setelah masa garansi G2G selesai.
          </div>
        </div>
      </div>

      <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Riwayat Penarikan (Recent Payouts)</h3>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Jumlah</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(!financeData.recent_payouts || financeData.recent_payouts.length === 0) ? (
              <tr><td colSpan="3" className="empty-state">Belum ada riwayat penarikan.</td></tr>
            ) : (
              financeData.recent_payouts.map((payout, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text-muted)' }}>{new Date(payout.date).toLocaleString('id-ID')}</td>
                  <td style={{ fontWeight: 'bold', fontFamily: 'monospace', fontSize: '1.1rem' }}>{financeData.currency} {payout.amount}</td>
                  <td>
                    <span className="badge success">{payout.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
