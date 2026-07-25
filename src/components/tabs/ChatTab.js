import { useState, useEffect } from 'react';

export default function ChatTab() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null);

  // Default Quick Reply Templates
  const [quickReplies, setQuickReplies] = useState([
    { id: 1, title: 'Ready Stock', text: 'Hello! Yes, the stock is ready and delivery is instant. Please place your order! 🚀' },
    { id: 2, title: 'Processing', text: 'Hello! I have received your order. Please wait a few minutes while I process it. ⏳' },
    { id: 3, title: 'Done / Thanks', text: 'Your order has been delivered! Please confirm the delivery and leave a good review. Thank you! ⭐' },
    { id: 4, title: 'AFK / Sleep', text: 'Hello! Im currently away or sleeping. I will process your order as soon as I wake up. 💤' }
  ]);
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateText, setNewTemplateText] = useState('');

  const fetchChats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/g2g-chat');
      const data = await res.json();
      if (data.success) {
        setMessages(data.chats || []);
      }
    } catch (error) {
      console.error("Failed to fetch chats");
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchChats();
  }, []);


  const sendReply = async (textToSend, e = null) => {
    if (e) e.preventDefault();
    if (!textToSend.trim() || !selectedConversation) return;

    try {
       const res = await fetch('/api/g2g-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
             conversation_id: selectedConversation.id,
             message: textToSend
          })
       });
       const data = await res.json();
       
       if (data.success) {
          // Update local state to show the sent message immediately
          setMessages(prev => prev.map(chat => 
             chat.id === selectedConversation.id 
               ? { ...chat, last_message: textToSend } 
               : chat
          ));
          setSelectedConversation(prev => ({ ...prev, last_message: textToSend }));
          setReplyText('');
       } else {
          alert('Gagal mengirim pesan: ' + data.error);
       }
    } catch (err) {
       alert('Gagal mengirim pesan. Cek koneksi.');
    }
  };

  const addTemplate = (e) => {
    e.preventDefault();
    if (!newTemplateTitle.trim() || !newTemplateText.trim()) return;
    setQuickReplies([...quickReplies, { 
      id: Date.now(), 
      title: newTemplateTitle, 
      text: newTemplateText 
    }]);
    setNewTemplateTitle('');
    setNewTemplateText('');
  };

  const deleteTemplate = (id) => {
    setQuickReplies(quickReplies.filter(qr => qr.id !== id));
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{margin: 0}}>💬 Pesan & Auto-Reply Bot</h2>
          <p style={{color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem'}}>
            Pusat layanan pelanggan. Gunakan Quick Reply untuk membalas pembeli dalam hitungan detik.
          </p>
        </div>
        <button onClick={fetchChats} disabled={loading} className="secondary">
          {loading ? '⏳ Memuat...' : '🔄 Segarkan'}
        </button>
      </div>
      
      <div style={{ display: 'flex', gap: '1.5rem', height: '650px' }}>
        {/* Chat List (Left Column) */}
        <div style={{ width: '300px', borderRight: '1px solid var(--border)', overflowY: 'auto', paddingRight: '1rem' }}>
           <h3 style={{fontSize: '1rem', marginBottom: '1rem'}}>Inbox</h3>
           {(!Array.isArray(messages) || messages.length === 0) ? (
             <div className="empty-state" style={{ padding: '2rem 1rem' }}>
               Belum ada pesan masuk hari ini.
             </div>
           ) : (
             (Array.isArray(messages) ? messages : []).map((chat, idx) => (
               <div 
                 key={idx} 
                 onClick={() => setSelectedConversation(chat)}
                 style={{ 
                   padding: '1rem', 
                   borderBottom: '1px solid rgba(255,255,255,0.05)', 
                   cursor: 'pointer',
                   backgroundColor: selectedConversation?.id === chat.id ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                   borderRadius: '8px',
                   marginBottom: '0.5rem',
                   borderLeft: selectedConversation?.id === chat.id ? '3px solid var(--accent)' : '3px solid transparent'
                 }}
               >
                 <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{chat.sender_name || 'Pembeli'}</div>
                 <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                   {chat.last_message || 'Pesan terenkripsi...'}
                 </div>
               </div>
             ))
           )}
        </div>

        {/* Chat Area (Center Column) */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', paddingRight: '1rem' }}>
           {selectedConversation ? (
             <>
               <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontWeight: 'bold' }}>
                 Percakapan dengan <span style={{color: 'var(--accent)'}}>{selectedConversation.sender_name}</span>
               </div>
               <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 <div style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.75rem 1rem', borderRadius: '1rem', borderBottomLeftRadius: 0, maxWidth: '85%', lineHeight: '1.5' }}>
                   {selectedConversation.last_message}
                 </div>
               </div>
               <form onSubmit={(e) => sendReply(replyText, e)} style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem' }}>
                 <input 
                   type="text" 
                   value={replyText}
                   onChange={e => setReplyText(e.target.value)}
                   placeholder="Tulis balasan manual..." 
                   style={{ flex: 1 }}
                 />
                 <button type="submit" style={{width: '100px'}}>Kirim</button>
               </form>
             </>
           ) : (
             <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
               Pilih percakapan di sebelah kiri untuk melihat detail.
             </div>
           )}
        </div>
        
        {/* Quick Reply Area (Right Column) */}
        <div style={{ width: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
           <div>
             <h3 style={{fontSize: '1rem', marginBottom: '1rem', color: 'var(--success)'}}>⚡ Quick Reply (Balas Cepat)</h3>
             <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>
               Klik tombol <b>Kirim ⚡</b> pada template di bawah ini untuk merespons <i>customer</i> secara instan tanpa perlu mengetik panjang.
             </p>
             
             {quickReplies.map((qr) => (
               <div key={qr.id} style={{
                 backgroundColor: 'rgba(16, 185, 129, 0.05)', 
                 border: '1px solid rgba(16, 185, 129, 0.2)', 
                 padding: '1rem', 
                 borderRadius: '8px', 
                 marginBottom: '0.75rem',
                 position: 'relative'
               }}>
                 <div style={{fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--success)', marginBottom: '0.25rem'}}>{qr.title}</div>
                 <div style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>{qr.text}</div>
                 <div style={{display: 'flex', gap: '0.5rem', justifyContent: 'space-between'}}>
                    <button 
                      onClick={() => sendReply(qr.text)} 
                      disabled={!selectedConversation}
                      style={{
                        padding: '0.4rem 1rem', 
                        fontSize: '0.8rem', 
                        backgroundColor: selectedConversation ? 'var(--success)' : '#4b5563',
                        color: 'white',
                        border: 'none',
                        flex: 1
                      }}
                    >
                      {selectedConversation ? '🚀 Kirim Cepat' : 'Pilih Chat Dulu'}
                    </button>
                    <button onClick={() => deleteTemplate(qr.id)} className="danger" style={{padding: '0.4rem', fontSize: '0.8rem'}}>🗑️</button>
                 </div>
               </div>
             ))}
           </div>
           
           <div style={{borderTop: '1px solid var(--border)', paddingTop: '1.5rem'}}>
             <h4 style={{fontSize: '0.9rem', marginBottom: '1rem'}}>+ Tambah Template Baru</h4>
             <form onSubmit={addTemplate} style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                <input 
                  type="text" 
                  placeholder="Judul (Cth: Minta Review)" 
                  value={newTemplateTitle}
                  onChange={(e) => setNewTemplateTitle(e.target.value)}
                  style={{fontSize: '0.8rem', padding: '0.6rem'}}
                />
                <textarea 
                  placeholder="Isi pesan lengkap..." 
                  value={newTemplateText}
                  onChange={(e) => setNewTemplateText(e.target.value)}
                  style={{fontSize: '0.8rem', padding: '0.6rem', height: '80px', resize: 'vertical'}}
                />
                <button type="submit" className="secondary" style={{fontSize: '0.85rem', padding: '0.6rem'}}>Simpan Template</button>
             </form>
           </div>
        </div>
        
      </div>
    </div>
  );
}
