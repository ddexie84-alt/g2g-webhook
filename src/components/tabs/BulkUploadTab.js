import { useState } from "react";

export default function BulkUploadTab() {
  const [offerId, setOfferId] = useState('');
  const [fetchedTitle, setFetchedTitle] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authKey, setAuthKey] = useState('');
  const [backupCodes, setBackupCodes] = useState('');

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

  const fetchOfferDetails = async () => {
    if (!offerId) return alert("Masukkan Offer ID terlebih dahulu!");
    setIsFetching(true);
    setFetchedTitle("");
    try {
      // Kita meminjam API g2g-offers yang sudah ada untuk mengambil data semua etalase
      const res = await fetch("/api/g2g-offers");
      const data = await res.json();
      if (data.success && data.offers) {
        const found = data.offers.find(o => o.offer_id === offerId || o.id === offerId);
        if (found) {
          setFetchedTitle(found.offer_title || found.title || "Judul tidak ditemukan");
        } else {
          setFetchedTitle("Offer ID tidak ditemukan di daftar aktif Anda.");
        }
      }
    } catch (e) {
      console.error(e);
      setFetchedTitle("Gagal memuat data dari API.");
    }
    setIsFetching(false);
  };

  const handleInject = async (e) => {
    e.preventDefault();
    if (!offerId || !email || !password || !authKey) {
      alert("Harap lengkapi Offer ID, Email, Password, dan 2FA Key!");
      return;
    }

    setUploading(true);

    try {
      const res = await fetch('/api/g2g-bulk-upload', {
        method: 'POST', // We use POST but backend will do PATCH
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId,
          email,
          password,
          authKey,
          backupCodes,
          descriptionTemplate
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(`Berhasil! Data akun telah disuntikkan ke Offer ID: ${offerId}`);
        // Reset form
        setEmail('');
        setPassword('');
        setAuthKey('');
        setBackupCodes('');
      } else {
        alert("Gagal melakukan injeksi: " + data.error);
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
        <h2 style={{margin: 0}}>💉 Injector Akun ke Etalase G2G</h2>
        <p style={{color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem'}}>
          Suntikkan detail akun secara langsung ke **Etalase (Offer ID) yang sudah ada**. Harga dan Judul tidak akan terpengaruh. Sistem akan otomatis memperbarui Deskripsi etalase agar memuat instruksi rahasia dan Auth Key Anda.
        </p>
      </div>

      <div className="card" style={{backgroundColor: 'var(--bg-dark)', marginBottom: '1.5rem', border: '1px solid var(--border)'}}>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap'}}>
          <div className="form-group" style={{flex: 1, minWidth: '200px'}}>
            <label>Offer ID (G2G) <span style={{color: 'red'}}>*</span></label>
            <input 
              type="text" 
              placeholder="Contoh: 15481..." 
              value={offerId} 
              onChange={e => setOfferId(e.target.value)} 
            />
          </div>
          <button onClick={fetchOfferDetails} disabled={isFetching} className="secondary" style={{padding: '0.6rem 1rem'}}>
            {isFetching ? '⏳ Mencari...' : '🔄 Sinkronkan (Cek Judul)'}
          </button>
        </div>
        
        {fetchedTitle && (
          <div style={{marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(79, 70, 229, 0.1)', borderLeft: '4px solid var(--accent)', borderRadius: '4px'}}>
            <p style={{margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)'}}>Judul Etalase Target:</p>
            <h4 style={{margin: '0.25rem 0 0 0', color: 'var(--text-light)'}}>{fetchedTitle}</h4>
          </div>
        )}
      </div>

      <form onSubmit={handleInject} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
        
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem'}}>
          <div className="form-group">
            <label>User ID / Email Address <span style={{color: 'red'}}>*</span></label>
            <input 
              type="email" 
              placeholder="user123@gmail.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label>Password <span style={{color: 'red'}}>*</span></label>
            <input 
              type="text" 
              placeholder="P@ssw0rd123" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
        </div>

        <div className="form-group">
          <label>First Secret Answer (Key 2FA) <span style={{color: 'red'}}>*</span></label>
          <input 
            type="text" 
            placeholder="2mvq fvcu scib vci2 fptr 2gjo mkvw ordq" 
            value={authKey} 
            onChange={e => setAuthKey(e.target.value)} 
            required 
          />
        </div>

        <div className="form-group">
          <label>Second Secret Answer (Backup Codes 8 digit)</label>
          <textarea 
            rows="5" 
            placeholder={"0242 9782 3543 7132 5265 7402 1010 0893 1979 6339"}
            value={backupCodes} 
            onChange={e => setBackupCodes(e.target.value)} 
            style={{whiteSpace: 'pre'}}
          ></textarea>
        </div>

        <div className="form-group">
          <label>Template Deskripsi (Smart Description) <span style={{color: 'red'}}>*</span></label>
          <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 0}}>
            Sistem otomatis mengganti tag <code>[EMAIL]</code> <code>[PASSWORD]</code> <code>[2FA_CODE]</code> <code>[BACKUP_CODES]</code> dengan data di atas saat dikirim ke G2G.
          </p>
          <textarea 
            rows="10" 
            value={descriptionTemplate} 
            onChange={e => setDescriptionTemplate(e.target.value)} 
            style={{fontFamily: 'monospace', fontSize: '0.85rem'}}
            required
          ></textarea>
        </div>

        <button type="submit" className="primary" style={{padding: '1rem', fontSize: '1.1rem'}} disabled={uploading}>
          {uploading ? '⏳ Menyuntikkan Data ke G2G...' : '🚀 Inject Data ke Etalase'}
        </button>
      </form>
    </div>
  );
}
