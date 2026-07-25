import { useState } from "react";

export default function BulkUploadTab() {
  const [productId, setProductId] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [csvData, setCsvData] = useState('');
  const [descriptionTemplate, setDescriptionTemplate] = useState(
`Recommended to change security after 7 days , because if you change security on new device before 7 days , akun can get deactived, don't complain if you don't follow the rules 

How to login : 
1. Search on google authenticator google and put this code [2FA_CODE]
2. After auth activate, go to Gmail and login use Gmail and password above 
3. If Gmail ask 2FA  click try another and choose use authenticator code
4. Put the code authenticator of you set before 
5. Done login

you can use backupo codes to login too , choose 8 digit codes
[BACKUP_CODES]

if you want use family group but find issue different country , you must to reset country gmail follow this step : 
1. go to detail account and click menu wallet and subscription
2. klik manage payment method
3. after it you can find new page , click settings
4. scroll down and you can find close payment profile 
5. verify and complete close 
6. the country are reset now 

If you got problem login, chat me on g2g I will help you`
  );
  
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!productId || !title || !price || !csvData) {
      alert("Harap lengkapi semua field yang wajib!");
      return;
    }

    setUploading(true);
    setResults([]);

    try {
      const res = await fetch('/api/g2g-bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          title,
          price,
          csvData,
          descriptionTemplate
        })
      });

      const data = await res.json();
      if (data.success) {
        setResults(data.results || []);
        alert(`Upload selesai! ${data.successCount} berhasil, ${data.errorCount} gagal.`);
      } else {
        alert("Gagal melakukan upload: " + data.error);
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan jaringan.");
    }
    setUploading(false);
  };

  return (
    <div className="card">
      <div style={{marginBottom: '1.5rem'}}>
        <h2 style={{margin: 0}}>🚀 Bulk Upload Akun Game</h2>
        <p style={{color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem'}}>
          Upload puluhan akun sekaligus. Sistem akan mencoba menyuntikkan data (Email, Password, 2FA, Backup Codes) ke kolom Secret Question API G2G. Jika API G2G menolak (karena pembatasan fitur untuk akun non-spesial), sistem akan otomatis melakukan *fallback* dengan menaruh semua informasi tersebut secara rapi ke dalam **Deskripsi** pesanan.
        </p>
      </div>

      <form onSubmit={handleUpload} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
        
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem'}}>
          <div className="form-group">
            <label>ID Produk / Kategori G2G <span style={{color: 'red'}}>*</span></label>
            <input 
              type="text" 
              placeholder="Contoh: 15481" 
              value={productId} 
              onChange={e => setProductId(e.target.value)} 
              required 
            />
            <small style={{color: 'var(--text-muted)', fontSize: '0.75rem'}}>ID Kategori Game (Bisa dilihat di menu Katalog)</small>
          </div>
          <div className="form-group">
            <label>Harga per Akun (USD) <span style={{color: 'red'}}>*</span></label>
            <input 
              type="number" 
              step="0.01"
              placeholder="Contoh: 15.50" 
              value={price} 
              onChange={e => setPrice(e.target.value)} 
              required 
            />
          </div>
        </div>

        <div className="form-group">
          <label>Judul Etalase (Sama untuk semua akun) <span style={{color: 'red'}}>*</span></label>
          <input 
            type="text" 
            placeholder="Contoh: Akun Smurf Mythic" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            required 
          />
        </div>

        <div className="form-group">
          <label>Template Deskripsi (Smart Description) <span style={{color: 'red'}}>*</span></label>
          <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 0}}>
            Gunakan variabel berikut agar diisi otomatis oleh sistem: <br/>
            <code>[EMAIL]</code> <code>[PASSWORD]</code> <code>[2FA_CODE]</code> <code>[BACKUP_CODES]</code>
          </p>
          <textarea 
            rows="10" 
            value={descriptionTemplate} 
            onChange={e => setDescriptionTemplate(e.target.value)} 
            style={{fontFamily: 'monospace', fontSize: '0.85rem'}}
            required
          ></textarea>
        </div>

        <div className="form-group">
          <label>Data Akun (Format CSV / Paste dari Excel) <span style={{color: 'red'}}>*</span></label>
          <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 0}}>
            Format per baris: <code>Email | Password | 2FA_Key | Backup_Codes</code> <br/>
            Gunakan garis lurus (<code>|</code>) atau koma (<code>,</code>) atau Tab (Excel) sebagai pemisah.
          </p>
          <textarea 
            rows="8" 
            placeholder={"user1@gmail.com | pass123 | 2mvq fvcu scib vci2 | 0242 9782 3543 7132\nuser2@gmail.com | pass456 | 8xhq zz2a | 1122 3344 5566"}
            value={csvData} 
            onChange={e => setCsvData(e.target.value)} 
            style={{whiteSpace: 'pre'}}
            required
          ></textarea>
        </div>

        <button type="submit" className="primary" style={{padding: '1rem', fontSize: '1.1rem'}} disabled={uploading}>
          {uploading ? '⏳ Sedang Memproses Upload (Mohon Tunggu)...' : '🚀 Mulai Upload Massal'}
        </button>
      </form>

      {results.length > 0 && (
        <div style={{marginTop: '2rem'}}>
          <h3>Hasil Upload</h3>
          <div className="table-container" style={{maxHeight: '400px', overflowY: 'auto'}}>
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Offer ID (G2G)</th>
                  <th>Status</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {results.map((res, i) => (
                  <tr key={i} style={{backgroundColor: res.success ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)'}}>
                    <td>{res.email}</td>
                    <td style={{fontFamily: 'monospace'}}>{res.offerId || '-'}</td>
                    <td>
                      <span className={`badge ${res.success ? 'success' : 'danger'}`}>
                        {res.success ? 'Berhasil' : 'Gagal'}
                      </span>
                    </td>
                    <td style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>{res.message || res.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
