import { useState, useEffect } from "react";

export default function FinanceTab() {
  const [financeData, setFinanceData] = useState({ balance: 0, pending: 0, payouts: [] });
  const [loading, setLoading] = useState(true);

  const fetchFinance = async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      
      let totalRevenue = 0;
      let totalProfit = 0;
      let pendingClearance = 0;
      let recentOrders = [];
      
      if (data.orders && Array.isArray(data.orders)) {
        data.orders.forEach(orderStr => {
          let order; 
          try { order = typeof orderStr === 'string' ? JSON.parse(orderStr) : orderStr; } catch(e) { return; } 
          if (!order) return;
          
          const status = order.rawG2G?.payload?.order_status || order.rawG2G?.event || order.rawG2G?.event_type || order.rawG2G?.type;
          
          let g2gPrice = order.rawG2G?.payload?.unit_price || 0;
          const rev = parseFloat(g2gPrice) * (parseInt(order.quantity) || 1);
          const cost = parseFloat(order.smmCost || 0);
          
          // Consider "completed" or "delivered" as contributing to pending clearance
          // Consider "paid" or "delivering" as just gross revenue
          const isPaid = status === 'order.api_delivery' || status === 'order.confirmed' || status === 'paid' || status === 'delivering' || status === 'delivered';
          const isCompleted = status === 'order.completed' || status === 'delivered';
          
          if (isPaid) {
            totalRevenue += rev;
            totalProfit += (rev - cost);
            if (!isCompleted) {
              pendingClearance += rev;
            }
            
            recentOrders.push({
              date: order.timestamp ? new Date(order.timestamp).toISOString() : new Date().toISOString(),
              amount: rev.toFixed(2),
              status: isCompleted ? "Completed" : "Pending"
            });
          }
        });
      }
      
      recentOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setFinanceData({
        balance: totalRevenue.toFixed(2),
        profit: totalProfit.toFixed(2),
        pending: pendingClearance.toFixed(2),
        payouts: recentOrders.slice(0, 10) // Show last 10 contributing orders instead of "payouts"
      });
      
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchFinance();
  }, []);

  if (loading) {
    return <div className="card"><div className="empty-state">Menghitung Estimasi Keuangan Lokal...</div></div>;
  }

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
      <div className="card" style={{background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1), rgba(168, 85, 247, 0.05))'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem'}}>
          <div>
            <h2 style={{margin: 0, color: 'var(--accent)'}}>💳 Estimasi Keuangan (Lokal)</h2>
            <p style={{color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem'}}>
              Data ini dihitung berdasarkan transaksi yang masuk ke webhook. G2G API tidak membuka akses untuk dompet asli.
            </p>
          </div>
          <button onClick={() => { setLoading(true); fetchFinance(); }} className="secondary">🔄 Hitung Ulang</button>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem'}}>
          <div style={{padding: '1.5rem', backgroundColor: 'var(--bg-lighter)', borderRadius: '12px', border: '1px solid var(--border)'}}>
            <p style={{color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 0.5rem 0'}}>Estimasi Pendapatan Kotor</p>
            <h3 style={{margin: 0, fontSize: '1.75rem', color: 'white'}}>USD {financeData.balance}</h3>
          </div>
          <div style={{padding: '1.5rem', backgroundColor: 'var(--bg-lighter)', borderRadius: '12px', border: '1px solid var(--border)'}}>
            <p style={{color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 0.5rem 0'}}>Belum Cair (Pending)</p>
            <h3 style={{margin: 0, fontSize: '1.75rem', color: 'var(--warning)'}}>USD {financeData.pending}</h3>
          </div>
          <div style={{padding: '1.5rem', backgroundColor: 'var(--bg-lighter)', borderRadius: '12px', border: '1px solid var(--border)'}}>
            <p style={{color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 0.5rem 0'}}>Estimasi Laba Bersih</p>
            <h3 style={{margin: 0, fontSize: '1.75rem', color: 'var(--success)'}}>USD {financeData.profit}</h3>
          </div>
        </div>

        <h3 style={{marginBottom: '1rem'}}>Riwayat Kontribusi Transaksi</h3>
        <div className="table-container" style={{maxHeight: '300px', overflowY: 'auto'}}>
          <table>
            <thead>
              <tr>
                <th>Tanggal Transaksi</th>
                <th>Nilai (USD)</th>
                <th>Status (Lokal)</th>
              </tr>
            </thead>
            <tbody>
              {(!Array.isArray(financeData.payouts) || financeData.payouts.length === 0) ? (
                <tr><td colSpan="3" className="empty-state">Belum ada data pendapatan.</td></tr>
              ) : (
                financeData.payouts.map((p, i) => (
                  <tr key={i}>
                    <td>{new Date(p.date).toLocaleString('id-ID')}</td>
                    <td style={{fontFamily: 'monospace', color: 'var(--success)'}}>+ {p.amount}</td>
                    <td><span className={`badge ${p.status === 'Completed' ? 'success' : 'warning'}`}>{p.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
