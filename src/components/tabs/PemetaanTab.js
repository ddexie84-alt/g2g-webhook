export default function PemetaanTab({ 
  mappings, 
  names, 
  quantities, 
  initiateAddMapping, 
  newG2gId, setNewG2gId, 
  newSmmId, setNewSmmId, 
  newSmmQty, setNewSmmQty, 
  isAdding, 
  deleteMapping,
  isTesting,
  setConfirmInfo
}) {
  return (
    <div className="card">
      <h2>🖇️ Hubungkan Produk G2G dengan SMM</h2>
      <p style={{color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem'}}>
        Pasangkan (Map) ID Game / Produk yang Anda jual di G2G dengan ID Layanan SMM Panel yang bertugas mengirimkannya.
      </p>
      
      <form onSubmit={initiateAddMapping} style={{display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap'}}>
        <input 
          type="text" 
          placeholder="ID G2G (Contoh: df7ce...)" 
          value={newG2gId}
          onChange={(e) => setNewG2gId(e.target.value)}
          required
          style={{flex: 1, minWidth: '200px'}}
        />
        <div style={{display: 'flex', alignItems: 'center', color: 'var(--text-muted)'}}>→</div>
        <input 
          type="text" 
          placeholder="SMM ID / NON_SMM" 
          value={newSmmId}
          onChange={(e) => setNewSmmId(e.target.value)}
          required
          style={{flex: 1, minWidth: '150px'}}
        />
        <input 
          type="number" 
          placeholder="Jumlah SMM / Qty" 
          value={newSmmQty}
          onChange={(e) => setNewSmmQty(e.target.value)}
          min="1"
          required
          style={{width: '120px'}}
        />
        <button type="submit" disabled={isAdding}>
          {isAdding ? 'Menyimpan...' : 'Tambah Pasangan'}
        </button>
      </form>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID G2G Anda</th>
              <th>➔ Sistem Meneruskan Ke</th>
              <th>Nama / Keterangan</th>
              <th style={{textAlign: 'right'}}>Tindakan</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(mappings).length === 0 ? (
              <tr><td colSpan="4" className="empty-state">Belum ada pemetaan aktif.</td></tr>
            ) : (
              Object.keys(mappings).map(g2gId => (
                <tr key={g2gId}>
                  <td style={{fontFamily: 'monospace', fontWeight: '500'}}>{g2gId}</td>
                  <td>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                       <span style={{color: 'var(--accent)', fontWeight: 'bold'}}>{mappings[g2gId]}</span>
                       <span style={{fontSize: '0.75rem', backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px'}}>
                         Qty: {quantities[g2gId] || 1}
                       </span>
                    </div>
                  </td>
                  <td style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>
                    {names[g2gId] || '-'}
                  </td>
                  <td style={{textAlign: 'right'}}>
                    <button onClick={() => deleteMapping(g2gId)} className="danger" style={{padding: '0.35rem 0.75rem', fontSize: '0.8rem'}}>
                      Hapus
                    </button>
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
