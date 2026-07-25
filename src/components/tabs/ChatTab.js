import { useState, useEffect } from "react";

export default function ChatTab() {
  const [templates, setTemplates] = useState([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateText, setNewTemplateText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editText, setEditText] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('g2g_chat_templates');
    if (saved) {
      try {
        setTemplates(JSON.parse(saved));
      } catch(e) {
        setTemplates(defaultTemplates);
      }
    } else {
      setTemplates(defaultTemplates);
    }
  }, []);

  const defaultTemplates = [
    { id: 't1', name: 'Greeting', text: 'Hello! Thanks for your order. We are processing it now.' },
    { id: 't2', name: 'Delivery Info', text: 'Your order has been delivered. Please check and confirm!' },
    { id: 't3', name: 'Review Request', text: 'Thank you for your purchase! If you are satisfied, please leave a 5-star review.' },
    { id: 't4', name: 'Apology (Delay)', text: 'We apologize for the delay. Your order will be processed shortly.' }
  ];

  const saveToStorage = (newTemplates) => {
    setTemplates(newTemplates);
    localStorage.setItem('g2g_chat_templates', JSON.stringify(newTemplates));
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newTemplateName.trim() || !newTemplateText.trim()) return;
    const newT = { id: Date.now().toString(), name: newTemplateName, text: newTemplateText };
    saveToStorage([...templates, newT]);
    setNewTemplateName('');
    setNewTemplateText('');
  };

  const handleDelete = (id) => {
    if (confirm("Hapus template ini?")) {
      saveToStorage(templates.filter(t => t.id !== id));
    }
  };

  const handleEdit = (t) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditText(t.text);
  };

  const handleSaveEdit = () => {
    saveToStorage(templates.map(t => t.id === editingId ? { ...t, name: editName, text: editText } : t));
    setEditingId(null);
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="card">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem'}}>
        <div>
          <h2 style={{margin: 0}}>💬 Clipboard Template Chat</h2>
          <p style={{color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem'}}>
            API G2G belum mendukung fitur Chat Otomatis. Gunakan halaman ini sebagai wadah penyimpanan template pesan yang bisa Anda <b>Copy</b> secara cepat saat melayani pembeli di Web G2G.
          </p>
        </div>
      </div>

      <div className="grid">
        <div className="card" style={{backgroundColor: 'var(--bg-lighter)', border: '1px dashed var(--border)'}}>
          <h3 style={{marginTop: 0}}>➕ Tambah Template Baru</h3>
          <form onSubmit={handleAdd} style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <input 
              type="text" 
              placeholder="Judul Template (Cth: Balasan Keterlambatan)" 
              value={newTemplateName} 
              onChange={e => setNewTemplateName(e.target.value)} 
              required
            />
            <textarea 
              placeholder="Teks Pesan..." 
              value={newTemplateText} 
              onChange={e => setNewTemplateText(e.target.value)} 
              rows="3" 
              style={{resize: 'vertical', minHeight: '80px'}}
              required
            ></textarea>
            <button type="submit" className="primary">Simpan Template</button>
          </form>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto'}}>
          {templates.length === 0 ? (
            <div className="empty-state">Belum ada template tersimpan.</div>
          ) : (
            templates.map(t => (
              <div key={t.id} className="card" style={{padding: '1rem', position: 'relative', borderLeft: '4px solid var(--accent)'}}>
                {editingId === t.id ? (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} />
                    <textarea value={editText} onChange={e => setEditText(e.target.value)} rows="3" />
                    <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.5rem'}}>
                      <button onClick={handleSaveEdit} className="success" style={{flex: 1}}>Simpan</button>
                      <button onClick={() => setEditingId(null)} className="secondary" style={{flex: 1}}>Batal</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem'}}>
                      <h4 style={{margin: 0, color: 'var(--accent)'}}>{t.name}</h4>
                      <div style={{display: 'flex', gap: '4px'}}>
                        <button onClick={() => handleEdit(t)} className="secondary" style={{padding: '0.2rem 0.5rem', fontSize: '0.75rem'}}>Edit</button>
                        <button onClick={() => handleDelete(t.id)} className="danger" style={{padding: '0.2rem 0.5rem', fontSize: '0.75rem'}}>Hapus</button>
                      </div>
                    </div>
                    <div style={{backgroundColor: 'var(--bg-dark)', padding: '0.75rem', borderRadius: '4px', fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '1rem', whiteSpace: 'pre-wrap'}}>
                      {t.text}
                    </div>
                    <button 
                      onClick={() => handleCopy(t.text, t.id)} 
                      style={{
                        width: '100%', 
                        backgroundColor: copiedId === t.id ? 'var(--success)' : 'var(--bg-lighter)',
                        border: copiedId === t.id ? 'none' : '1px solid var(--border)',
                        color: copiedId === t.id ? 'white' : 'var(--text-light)'
                      }}
                    >
                      {copiedId === t.id ? '✅ Tersalin!' : '📋 Copy Teks'}
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
