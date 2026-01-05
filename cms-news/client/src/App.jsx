import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, Navigate, useParams, useSearchParams } from 'react-router-dom';

// --- 1. DEFINIZIONE COLORI (Globale) ---
const themeColors = {
  light: {
    bg: '#ffffff',
    text: '#1e293b',
    textSec: '#64748b',
    card: '#ffffff',
    border: '#e2e8f0',
    active: '#2563eb',
    activeText: '#ffffff',
    hover: '#f1f5f9',
    gradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
  },
  dark: {
    bg: '#0f172a',
    text: '#f8fafc',
    textSec: '#94a3b8',
    card: '#1e293b',
    border: '#334155',
    active: '#3b82f6',
    activeText: '#ffffff',
    hover: '#334155',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
  }
};


const ReaderEmail = ({ theme }) => (
  <div style={{padding:'50px', textAlign:'center', color: themeColors[theme].text}}>
    <h1>📧 Invia Newsletter</h1>
    <p>Strumento per inviare email massive agli iscritti.</p>
  </div>
);

// --- 1. ANDAMENTO ABBONAMENTI (CON MODIFICA PREZZI) ---
const ReaderSubs = ({ theme }) => {
  const t = themeColors[theme];
  
  // Dati Utenti
  const [stats, setStats] = useState({ standard: 0, premium: 0, abbonato: 0, total: 0 });
  
  // Dati Prezzi (Default di sicurezza)
  const [prices, setPrices] = useState({ premium: 1.99, full: 5.99 });
  
  // Stato Modifica
  const [isEditing, setIsEditing] = useState(false);
  const [tempPrices, setTempPrices] = useState({ premium: 1.99, full: 5.99 });

  useEffect(() => {
    // 1. Scarica Utenti per i conteggi
    axios.get('https://murthnews-api.onrender.com/api/readers').then(res => {
      const readers = res.data;
      const s = readers.filter(r => r.livello === 'standard').length;
      const p = readers.filter(r => r.livello === 'premium').length;
      const a = readers.filter(r => r.livello === 'abbonato').length;
      setStats({ standard: s, premium: p, abbonato: a, total: readers.length });
    });

    // 2. Scarica Prezzi salvati nelle Settings
    axios.get('https://murthnews-api.onrender.com/api/settings').then(res => {
        if(res.data) {
            const p = res.data.pricePremium || 1.99;
            const f = res.data.priceFull || 5.99;
            setPrices({ premium: p, full: f });
            setTempPrices({ premium: p, full: f });
        }
    });
  }, []);

  const savePrices = async () => {
      try {
          // Salviamo i nuovi prezzi nel DB (usiamo la rotta settings esistente)
          await axios.put('https://murthnews-api.onrender.com/api/settings', { 
              pricePremium: parseFloat(tempPrices.premium), 
              priceFull: parseFloat(tempPrices.full) 
          });
          setPrices(tempPrices); // Aggiorna la vista
          setIsEditing(false);   // Chiudi editor
          alert("✅ Listino prezzi aggiornato!");
      } catch (error) {
          alert("Errore salvataggio prezzi");
      }
  };

  // Calcolo percentuali per le barre
  const getPercent = (val) => stats.total === 0 ? 0 : (val / stats.total) * 100;

  const s = {
    container: { padding: '40px', maxWidth: '1000px', margin: '0 auto', color: t.text },
    card: { background: t.card, borderRadius: '20px', padding: '30px', border: `1px solid ${t.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' },
    row: { marginBottom: '20px' },
    labelRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold', alignItems:'center' },
    barBg: { width: '100%', height: '12px', background: t.hover, borderRadius: '10px', overflow: 'hidden' },
    barFill: (perc, col) => ({ width: `${perc}%`, height: '100%', background: col, borderRadius: '10px', transition: 'width 1s ease' }),
    
    // Stili Editor
    editBtn: { background: t.hover, border: `1px solid ${t.border}`, padding: '5px 15px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: t.textSec },
    saveBtn: { background: '#22c55e', border: 'none', padding: '5px 15px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: '#fff', marginLeft: '10px' },
    priceInput: { width: '60px', padding: '2px 5px', borderRadius: '5px', border: `1px solid ${t.active}`, fontSize: '13px', fontWeight: 'bold', textAlign: 'right', marginRight: '5px' }
  };

  return (
    <div style={s.container}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px'}}>
          <div>
            <h1 style={{fontSize:'32px', margin:0}}>📈 Statistiche Abbonati</h1>
            <p style={{color:t.textSec, marginTop:'5px'}}>Monitoraggio piani e listino prezzi.</p>
          </div>
          
          <div>
              {isEditing ? (
                  <>
                    <button onClick={() => setIsEditing(false)} style={s.editBtn}>ANNULLA</button>
                    <button onClick={savePrices} style={s.saveBtn}>SALVA PREZZI</button>
                  </>
              ) : (
                  <button onClick={() => setIsEditing(true)} style={s.editBtn}>⚙️ GESTISCI PREZZI</button>
              )}
          </div>
      </div>

      <div style={s.card}>
        {/* FREE (Sempre 0€) */}
        <div style={s.row}>
            <div style={s.labelRow}>
                <span>🎧 Free Accounts <small style={{fontWeight:'normal', opacity:0.6}}>(€0.00)</small></span>
                <span>{stats.standard} utenti</span>
            </div>
            <div style={s.barBg}><div style={s.barFill(getPercent(stats.standard), '#94a3b8')}></div></div>
        </div>

        {/* PREMIUM (Modificabile) */}
        <div style={s.row}>
            <div style={s.labelRow}>
                <span style={{color:'#8b5cf6', display:'flex', alignItems:'center'}}>
                    ⭐ Premium 
                    <span style={{marginLeft:'8px', color:t.text, background:t.hover, padding:'2px 8px', borderRadius:'6px'}}>
                        {isEditing ? (
                            <>€ <input type="number" step="0.01" value={tempPrices.premium} onChange={e => setTempPrices({...tempPrices, premium: e.target.value})} style={s.priceInput} /></>
                        ) : (
                            `€${Number(prices.premium).toFixed(2)}`
                        )}
                    </span>
                </span>
                <span>{stats.premium} utenti</span>
            </div>
            <div style={s.barBg}><div style={s.barFill(getPercent(stats.premium), '#8b5cf6')}></div></div>
        </div>

        {/* FULL (Modificabile) */}
        <div style={s.row}>
            <div style={s.labelRow}>
                <span style={{color:'#f59e0b', display:'flex', alignItems:'center'}}>
                    👑 Full Pass 
                    <span style={{marginLeft:'8px', color:t.text, background:t.hover, padding:'2px 8px', borderRadius:'6px'}}>
                        {isEditing ? (
                            <>€ <input type="number" step="0.01" value={tempPrices.full} onChange={e => setTempPrices({...tempPrices, full: e.target.value})} style={s.priceInput} /></>
                        ) : (
                            `€${Number(prices.full).toFixed(2)}`
                        )}
                    </span>
                </span>
                <span>{stats.abbonato} utenti</span>
            </div>
            <div style={s.barBg}><div style={s.barFill(getPercent(stats.abbonato), '#f59e0b')}></div></div>
        </div>

        <div style={{textAlign:'center', marginTop:'30px', paddingTop:'20px', borderTop:`1px solid ${t.border}`}}>
            <div style={{fontSize:'40px', fontWeight:'900', color:t.text}}>{stats.total}</div>
            <div style={{fontSize:'12px', color:t.textSec, textTransform:'uppercase', fontWeight:'bold'}}>Totale Iscritti</div>
        </div>
      </div>
    </div>
  );
};

// --- 2. GUADAGNI (CALCOLO DINAMICO CON PREZZI REALI) ---
const ReaderRevenue = ({ theme }) => {
  const t = themeColors[theme];
  const [revenue, setRevenue] = useState({ month: 0, today: 0, todayCount: 0 });
  const [currentPrices, setCurrentPrices] = useState({ premium: 0, full: 0 });

  useEffect(() => {
    const fetchData = async () => {
        try {
            // 1. Scarichiamo INSIEME sia i Lettori che i Prezzi aggiornati
            const [readersRes, settingsRes] = await Promise.all([
                axios.get('https://murthnews-api.onrender.com/api/readers'),
                axios.get('https://murthnews-api.onrender.com/api/settings')
            ]);

            const readers = readersRes.data;
            const settings = settingsRes.data || {};

            // Recuperiamo i prezzi (o usiamo i default se non trovati)
            const priceP = settings.pricePremium !== undefined ? settings.pricePremium : 1.99;
            const priceF = settings.priceFull !== undefined ? settings.priceFull : 5.99;
            
            setCurrentPrices({ premium: priceP, full: priceF });

            // 2. Calcoli Matematici usando i PREZZI VERI
            let mrr = 0;        // Guadagno Mensile Ricorrente
            let todayRev = 0;   // Incasso di Oggi
            let todayNew = 0;   // Nuovi Iscritti Oggi
            
            const todayStr = new Date().toDateString();

            readers.forEach(r => {
                // Calcolo MRR (Totale abbonamenti attivi)
                if (r.livello === 'premium') mrr += priceP;
                if (r.livello === 'abbonato') mrr += priceF;

                // Calcolo Oggi (Solo chi si è iscritto oggi)
                if (new Date(r.dataIscrizione).toDateString() === todayStr) {
                    todayNew++;
                    if (r.livello === 'premium') todayRev += priceP;
                    if (r.livello === 'abbonato') todayRev += priceF;
                }
            });

            setRevenue({ month: mrr, today: todayRev, todayCount: todayNew });

        } catch (e) {
            console.error("Errore calcolo revenue:", e);
        }
    };

    fetchData();
    // Aggiorna ogni 5 secondi per vedere i cambiamenti in tempo reale
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const s = {
      container: { padding: '40px', maxWidth: '1000px', margin: '0 auto', color: t.text },
      grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
      card: { background: t.card, padding: '30px', borderRadius: '16px', border: `1px solid ${t.border}`, textAlign:'center' },
      money: { fontSize: '42px', fontWeight: '900', color: '#10b981', margin: '10px 0' },
      label: { fontSize: '11px', fontWeight: 'bold', color: t.textSec, textTransform: 'uppercase', letterSpacing:'1px' },
      subInfo: { fontSize: '12px', opacity: 0.7, marginTop:'5px' }
  };

  return (
    <div style={s.container}>
      <h1 style={{fontSize:'32px', marginBottom:'10px'}}>💰 Fatturato Stimato</h1>
      <p style={{color:t.textSec, marginBottom:'30px'}}>
        Calcolato sui prezzi attuali: 
        <strong> Premium €{currentPrices.premium}</strong> / 
        <strong> Full €{currentPrices.full}</strong>
      </p>
      
      <div style={s.grid}>
          <div style={s.card}>
              <div style={s.label}>Ricavi Mensili Attivi (MRR)</div>
              <div style={s.money}>€ {revenue.month.toFixed(2)}</div>
              <div style={s.subInfo}>Valore totale abbonamenti attivi</div>
          </div>
          <div style={s.card}>
              <div style={s.label}>Incasso Oggi</div>
              <div style={{...s.money, color: revenue.today > 0 ? '#10b981' : t.textSec}}>
                  € {revenue.today.toFixed(2)}
              </div>
              <div style={s.subInfo}>{revenue.todayCount} nuove iscrizioni oggi</div>
          </div>
      </div>
    </div>
  );
};

// --- 3. REGISTRO ATTIVITÀ (LISTA REALE ISCRITTI) ---
const ReaderLogs = ({ theme }) => {
  const t = themeColors[theme];
  const [readers, setReaders] = useState([]);

  useEffect(() => {
    // Scarica e inverte (i più recenti in alto)
    axios.get('https://murthnews-api.onrender.com/api/readers').then(res => setReaders(res.data.reverse()));
  }, []);

  const s = {
    container: { padding: '40px', maxWidth: '1000px', margin: '0 auto', color: t.text },
    item: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', borderBottom: `1px solid ${t.border}`, background: t.card, marginBottom: '10px', borderRadius: '12px' },
    avatar: { width: '40px', height: '40px', borderRadius: '50%', background: t.hover, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', marginRight: '15px', fontWeight:'bold' },
    name: { fontWeight: 'bold', fontSize: '15px' },
    email: { color: t.textSec, fontSize: '13px' },
    date: { fontSize: '12px', color: t.textSec, fontWeight: 'bold', textAlign:'right' },
    badge: (lev) => ({ fontSize:'10px', fontWeight:'bold', padding:'3px 8px', borderRadius:'10px', background: lev==='standard'?'#e2e8f0':(lev==='premium'?'#e9d5ff':'#fef3c7'), color: lev==='standard'?'#475569':(lev==='premium'?'#7e22ce':'#b45309') })
  };

  return (
    <div style={s.container}>
      <h1 style={{margin:'0 0 30px 0'}}>📜 Registro Iscrizioni</h1>
      {readers.length === 0 && <p>Nessun iscritto al momento.</p>}
      
      {readers.map(r => (
        <div key={r._id} style={s.item}>
            <div style={{display:'flex', alignItems:'center'}}>
                <div style={s.avatar}>{r.nome.charAt(0)}</div>
                <div>
                    <div style={s.name}>{r.nome} {r.cognome}</div>
                    <div style={s.email}>{r.email}</div>
                </div>
            </div>
            <div>
                <div style={s.date}>{new Date(r.dataIscrizione).toLocaleString()}</div>
                <div style={{textAlign:'right', marginTop:'5px'}}>
                    <span style={s.badge(r.livello)}>{r.livello.toUpperCase()}</span>
                </div>
            </div>
        </div>
      ))}
    </div>
  );
};


// --- PAGINA REGISTRO ATTIVITÀ V2 (Pro Design) ---
const ActivityLogs = ({ theme }) => {
    const t = themeColors[theme];
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Stati per filtri e UI
    const [filter, setFilter] = useState('all'); // all, news, system, users
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedId, setExpandedId] = useState(null);

    const fetchLogs = () => {
        setLoading(true);
        axios.get('https://murthnews-api.onrender.com/api/logs')
             .then(res => setLogs(res.data))
             .finally(() => setLoading(false));
    };

    useEffect(() => { fetchLogs(); }, []);

    const clearLogs = async () => {
        if(!confirm("⚠️ ATTENZIONE: Stai per cancellare la scatola nera del sistema.\n\nProcedere?")) return;
        await axios.delete('https://murthnews-api.onrender.com/api/logs');
        fetchLogs();
    };

    // Logica Filtraggio
    const filteredLogs = logs.filter(log => {
        const matchesSearch = 
            log.user.toLowerCase().includes(searchTerm.toLowerCase()) || 
            log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.action.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (filter === 'all') return true;
        if (filter === 'news' && (log.action.includes('Articolo') || log.action.includes('News'))) return true;
        if (filter === 'users' && (log.action.includes('Utente') || log.action.includes('Login'))) return true;
        if (filter === 'system' && (log.action.includes('Settings') || log.action.includes('Media') || log.action.includes('Pulizia'))) return true;
        return false;
    });

    // Helper Stili e Icone
    const getTypeStyle = (action) => {
        if (action.includes('Elimin')) return { icon: '🗑️', color: '#fee2e2', text: '#b91c1c', border: '#fecaca' };
        if (action.includes('Crea') || action.includes('Upload')) return { icon: '✨', color: '#dcfce7', text: '#15803d', border: '#bbf7d0' };
        if (action.includes('Modifica') || action.includes('Update')) return { icon: '✏️', color: '#e0f2fe', text: '#0369a1', border: '#bae6fd' };
        if (action.includes('Login')) return { icon: '🔑', color: '#fef9c3', text: '#a16207', border: '#fde047' };
        return { icon: '📝', color: t.card, text: t.textSec, border: t.border };
    };

    const s = {
        container: { maxWidth: '1000px', margin: '0 auto', padding: '40px 20px', fontFamily: '-apple-system, sans-serif' },
        header: { marginBottom:'30px', display:'flex', justifyContent:'space-between', alignItems:'end' },
        title: { fontSize: '32px', fontWeight: '900', color: t.text, margin:0, letterSpacing:'-1px' },
        subtitle: { color: t.textSec, fontSize:'14px', marginTop:'5px' },
        
        controls: { display:'flex', gap:'15px', marginBottom:'25px', flexWrap:'wrap' },
        search: { padding:'12px 20px', borderRadius:'30px', border:`1px solid ${t.border}`, background: t.card, color:t.text, outline:'none', minWidth:'250px' },
        filterBtn: (active) => ({
            padding:'8px 16px', borderRadius:'20px', border:'none', cursor:'pointer', fontWeight:'bold', fontSize:'13px',
            background: active ? t.active : 'transparent', color: active ? '#fff' : t.textSec, transition:'all 0.2s'
        }),
        
        list: { display: 'flex', flexDirection: 'column', gap: '10px' },
        card: { background: t.card, borderRadius: '16px', border: `1px solid ${t.border}`, overflow:'hidden', transition:'all 0.2s' },
        row: { padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '20px', cursor:'pointer' },
        
        iconBox: (style) => ({
            width: '45px', height: '45px', borderRadius: '12px', background: style.color, border:`1px solid ${style.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
        }),
        
        mainInfo: { flex: 1 },
        actionTitle: { fontWeight: '800', fontSize: '15px', color: t.text },
        previewDetail: { fontSize: '13px', color: t.textSec, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'400px' },
        
        meta: { textAlign: 'right' },
        userBadge: { background: theme==='dark'?'rgba(255,255,255,0.1)':'#f1f5f9', padding:'4px 10px', borderRadius:'8px', fontWeight:'700', fontSize:'12px', color:t.text },
        time: { fontSize:'11px', color:t.textSec, marginTop:'4px' },

        // Dettagli Espansi
        expandedBox: { background: theme==='dark'?'rgba(0,0,0,0.2)':'#f8fafc', padding:'20px', borderTop:`1px solid ${t.border}`, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', fontSize:'13px' },
        detailLabel: { fontWeight:'bold', color:t.textSec, marginBottom:'5px', textTransform:'uppercase', fontSize:'10px' },
        detailVal: { color:t.text, fontFamily:'monospace', background: theme==='dark'?'rgba(255,255,255,0.05)':'#fff', padding:'8px', borderRadius:'6px', border:`1px solid ${t.border}` }
    };

    return (
        <div style={s.container}>
            <div style={s.header}>
                <div>
                    <h1 style={s.title}>Scatola Nera</h1>
                    <div style={s.subtitle}>Monitoraggio avanzato operazioni editoriali.</div>
                </div>
                <button onClick={clearLogs} style={{background:'#fee2e2', color:'#ef4444', border:'none', padding:'10px 20px', borderRadius:'12px', fontWeight:'bold', cursor:'pointer'}}>🗑️ RESET</button>
            </div>

            <div style={s.controls}>
                <input style={s.search} placeholder="🔍 Cerca utente, articolo..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                <div style={{display:'flex', gap:'5px', alignItems:'center', background: t.card, padding:'5px', borderRadius:'25px', border:`1px solid ${t.border}`}}>
                    {['all', 'news', 'users', 'system'].map(f => (
                        <button key={f} onClick={()=>setFilter(f)} style={s.filterBtn(filter===f)}>
                            {f === 'all' ? 'TUTTI' : f === 'news' ? 'ARTICOLI' : f === 'users' ? 'UTENTI' : 'SISTEMA'}
                        </button>
                    ))}
                </div>
            </div>

            <div style={s.list}>
                {loading && <div style={{textAlign:'center', padding:'20px'}}>Caricamento...</div>}
                {!loading && filteredLogs.length === 0 && <div style={{textAlign:'center', padding:'40px', opacity:0.5}}>Nessun dato trovato.</div>}

                {filteredLogs.map(log => {
                    const style = getTypeStyle(log.action);
                    const isOpen = expandedId === log._id;

                    return (
                        <div key={log._id} style={s.card}>
                            {/* RIGA VISIBILE */}
                            <div style={s.row} onClick={() => setExpandedId(isOpen ? null : log._id)}>
                                <div style={s.iconBox(style)}>{style.icon}</div>
                                <div style={s.mainInfo}>
                                    <div style={s.actionTitle}>{log.action}</div>
                                    <div style={s.previewDetail}>{log.details}</div>
                                </div>
                                <div style={s.meta}>
                                    <div style={s.userBadge}>👤 {log.user}</div>
                                    <div style={s.time}>{new Date(log.createdAt).toLocaleString()}</div>
                                </div>
                                <div style={{opacity:0.5}}>{isOpen ? '▲' : '▼'}</div>
                            </div>

                            {/* DETTAGLI ESPANSI (Accordion) */}
                            {isOpen && (
                                <div style={s.expandedBox}>
                                    <div>
                                        <div style={s.detailLabel}>DESCRIZIONE COMPLETA</div>
                                        <div style={s.detailVal}>{log.details}</div>
                                        <div style={{marginTop:'10px'}}>
                                            <button onClick={()=>{setSearchTerm(log.details.substring(0, 15)); setExpandedId(null)}} style={{cursor:'pointer', border:'none', background:'transparent', color:t.active, fontSize:'12px', fontWeight:'bold', padding:0}}>
                                                🔎 Filtra storico di questo elemento
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <div style={s.detailLabel}>DATI TECNICI</div>
                                        <div style={s.detailVal}>
                                            ID LOG: {log._id}<br/>
                                            IP: {log.ip || 'N/A'}<br/>
                                            USER: {log.user}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- COMPONENTE UTENTI ONLINE (SMART & ELASTIC) ---
const OnlineTicker = ({ theme }) => {
    const [users, setUsers] = useState([]);
    const t = themeColors[theme];

    // Scarica gli utenti online ogni 30 secondi
    useEffect(() => {
        const fetchOnline = async () => {
            try {
                const res = await axios.get('https://murthnews-api.onrender.com/api/users/online');
                setUsers(res.data);
            } catch (e) {}
        };
        fetchOnline();
        const interval = setInterval(fetchOnline, 30000);
        return () => clearInterval(interval);
    }, []);

    if (users.length === 0) return null;

    // LOGICA DI ADATTAMENTO
    const AVATAR_SIZE = 32;
    const GAP = 8;
    const PADDING = 10; 
    
    // Se > 3 utenti, attiviamo lo scroll
    const isScrolling = users.length > 3;

    // Calcoliamo la larghezza
    const boxWidth = isScrolling 
        ? (3 * (AVATAR_SIZE + GAP)) + PADDING 
        : (users.length * (AVATAR_SIZE + GAP)) + PADDING - GAP;

    const displayList = isScrolling ? [...users, ...users] : users;

    return (
        <div style={{
            height: '42px',
            width: `${boxWidth}px`, 
            transition: 'width 0.3s ease-out',
            overflow: 'hidden',
            marginRight: '15px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            background: theme === 'light' ? '#f1f5f9' : '#1e293b',
            borderRadius: '50px',
            border: `1px solid ${t.border}`,
            padding: '0 5px',
            boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.05)'
        }} title="Colleghi Online">
            
            <style>{`
                @keyframes scrollTicker {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); } 
                }
            `}</style>

            <div style={{
                display: 'flex',
                gap: `${GAP}px`,
                alignItems: 'center',
                animation: isScrolling ? `scrollTicker ${users.length * 3}s linear infinite` : 'none',
                width: isScrolling ? 'max-content' : '100%',
                justifyContent: isScrolling ? 'flex-start' : 'center'
            }}>
                {displayList.map((u, i) => {
                    const img = u.profileImage || u.foto;
                    return (
                        <div key={i} style={{position: 'relative', width: `${AVATAR_SIZE}px`, height: `${AVATAR_SIZE}px`, flexShrink: 0}}>
                            {img ? (
                                <img src={img} style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover', border:`1px solid ${t.border}`}} title={u.nome} />
                            ) : (
                                <div style={{
                                    width:'100%', height:'100%', borderRadius:'50%', 
                                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', 
                                    color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', 
                                    fontSize:'12px', fontWeight:'bold', border:`1px solid ${t.border}`
                                }} title={u.nome}>
                                    {u.nome.charAt(0)}
                                </div>
                            )}
                            <div style={{
                                position: 'absolute', bottom: -1, right: -1, 
                                width: '9px', height: '9px', borderRadius: '50%', 
                                background: '#22c55e', border: `2px solid ${theme==='light'?'#f1f5f9':'#1e293b'}`,
                                boxShadow: '0 0 5px rgba(34, 197, 94, 0.6)'
                            }}></div>
                        </div>
                    );
                })}
            </div>

            {isScrolling && (
                <>
                    <div style={{position:'absolute', left:0, top:0, bottom:0, width:'15px', background:`linear-gradient(to right, ${theme==='light'?'#f1f5f9':'#1e293b'}, transparent)`, zIndex:2, borderRadius:'20px 0 0 20px'}}></div>
                    <div style={{position:'absolute', right:0, top:0, bottom:0, width:'15px', background:`linear-gradient(to left, ${theme==='light'?'#f1f5f9':'#1e293b'}, transparent)`, zIndex:2, borderRadius:'0 20px 20px 0'}}></div>
                </>
            )}
        </div>
    );
}; 
// <--- CONTROLLA CHE CI SIANO QUESTE DUE CARATTERI ALLA FINE

// --- PAGINA IA ASSISTANT (V2.1: FIX FOTO AVATAR) ---
const AIChatPage = ({ user, theme }) => {
    const t = themeColors[theme];
    
    // --- FIX: Normalizziamo la foto (prende profileImage O foto) ---
    const userPhoto = user.profileImage || user.foto;

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Stati Timer
    const [timeLeft, setTimeLeft] = useState(null); 
    const [cooldown, setCooldown] = useState(null); 
    const [isLocked, setIsLocked] = useState(true);

    const SESSION = 15 * 60; // 15 minuti
    const COOLDOWN = 2 * 60 * 60; // 2 ore

    // Logica Timer
    useEffect(() => {
        const checkTimer = () => {
            const now = Date.now();
            const storedStart = localStorage.getItem('ai_session_start');

            if (!storedStart) {
                localStorage.setItem('ai_session_start', now);
                setTimeLeft(SESSION);
                setIsLocked(false);
            } else {
                const elapsed = Math.floor((now - parseInt(storedStart)) / 1000);
                if (elapsed < SESSION) {
                    setTimeLeft(SESSION - elapsed);
                    setIsLocked(false);
                    setCooldown(null);
                } else if (elapsed < COOLDOWN) {
                    setCooldown(COOLDOWN - elapsed);
                    setIsLocked(true);
                    setTimeLeft(0);
                } else {
                    localStorage.setItem('ai_session_start', now);
                    setTimeLeft(SESSION);
                    setIsLocked(false);
                    setCooldown(null);
                }
            }
        };
        checkTimer();
        const interval = setInterval(checkTimer, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleSend = async () => {
        if (!input.trim() || isLocked) return;
        
        const newMsg = { role: 'user', content: input };
        const updatedMsgs = [...messages, newMsg];
        setMessages(updatedMsgs);
        setInput('');
        setLoading(true);

        try {
            const res = await axios.post('https://murthnews-api.onrender.com/api/ai/ask', { messages: updatedMsgs });
            setMessages(prev => [...prev, res.data]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ Connessione instabile. Riprova." }]);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (s) => {
        if (!s) return "00:00";
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return h > 0 ? `${h}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}` : `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
    };

    const s = {
        wrapper: {
            maxWidth: '900px', margin: '0 auto', height: 'calc(100vh - 80px)', 
            display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, sans-serif',
            position: 'relative'
        },
        headerCard: {
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '15px 25px', marginBottom: '20px',
            background: isLocked ? 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)' : 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            borderRadius: '20px', color: '#fff', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)'
        },
        statusDot: {
            width: '12px', height: '12px', borderRadius: '50%', 
            background: isLocked ? '#fca5a5' : '#4ade80',
            boxShadow: isLocked ? '0 0 10px #fca5a5' : '0 0 10px #4ade80',
            animation: 'pulse 1.5s infinite'
        },
        timerText: { fontSize: '24px', fontWeight: '800', fontFamily: 'monospace', letterSpacing: '2px' },
        chatArea: {
            flex: 1, background: theme === 'light' ? '#f8fafc' : '#1e293b',
            borderRadius: '20px', border: `1px solid ${t.border}`,
            padding: '25px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.02)'
        },
        bubbleRow: (role) => ({
            display: 'flex', gap: '15px', 
            justifyContent: role === 'user' ? 'flex-end' : 'flex-start',
            alignItems: 'flex-end'
        }),
        avatar: {
            width: '35px', height: '35px', borderRadius: '50%', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
            background: theme === 'light' ? '#fff' : '#334155', border: `1px solid ${t.border}`,
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)', flexShrink: 0 // Importante flexShrink
        },
        bubble: (role) => ({
            background: role === 'user' 
                ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                : (theme === 'light' ? '#ffffff' : '#334155'),
            color: role === 'user' ? '#fff' : t.text,
            padding: '15px 20px', 
            borderRadius: role === 'user' ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
            maxWidth: '70%', lineHeight: '1.6', fontSize: '15px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
            border: role === 'user' ? 'none' : `1px solid ${t.border}`
        }),
        inputWrapper: {
            marginTop: '20px', background: t.card, padding: '10px', borderRadius: '50px',
            border: `1px solid ${t.border}`, display: 'flex', gap: '10px', alignItems: 'center',
            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)'
        },
        input: {
            flex: 1, background: 'transparent', border: 'none', padding: '15px 20px',
            fontSize: '16px', color: t.text, outline: 'none'
        },
        sendBtn: {
            width: '45px', height: '45px', borderRadius: '50%', border: 'none',
            background: isLocked ? '#ccc' : t.active, color: '#fff', fontSize: '18px',
            cursor: isLocked ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.2s'
        },
        overlay: {
            position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.1)', 
            backdropFilter: 'blur(8px)', zIndex: 10, borderRadius: '20px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: t.text, textAlign: 'center'
        }
    };

    return (
        <div style={s.wrapper}>
            <style>{`@keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } 100% { opacity: 1; transform: scale(1); } }`}</style>

            <div style={s.headerCard}>
                <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                    <div style={s.statusDot}></div>
                    <div>
                        <div style={{fontSize:'12px', opacity: 0.8, textTransform:'uppercase', letterSpacing:'1px'}}>Stato Sistema</div>
                        <div style={{fontWeight:'bold'}}>{isLocked ? 'SURRISCALDAMENTO' : 'SISTEMA ONLINE'}</div>
                    </div>
                </div>
                <div style={{textAlign:'right'}}>
                    <div style={{fontSize:'12px', opacity: 0.8, textTransform:'uppercase'}}>Tempo Rimanente</div>
                    <div style={s.timerText}>{isLocked ? formatTime(cooldown) : formatTime(timeLeft)}</div>
                </div>
            </div>

            <div style={s.chatArea}>
                {messages.length === 0 && !isLocked && (
                    <div style={{textAlign:'center', marginTop:'50px', opacity:0.6}}>
                        <div style={{fontSize:'50px', marginBottom:'20px'}}>🤖</div>
                        <h3>Ciao, {user.nome}.</h3>
                        <p>Sono il tuo assistente editoriale. <br/>Chiedimi titoli, riassunti o correzioni.</p>
                    </div>
                )}

                {messages.map((m, i) => (
                    <div key={i} style={s.bubbleRow(m.role)}>
                        {/* Avatar AI */}
                        {m.role === 'assistant' && <div style={s.avatar}>🤖</div>}
                        
                        {/* Messaggio */}
                        <div style={s.bubble(m.role)}>{m.content}</div>
                        
                        {/* Avatar Utente (FIX APPLICATO QUI: usa userPhoto) */}
                        {m.role === 'user' && (
                            userPhoto 
                            ? <img src={userPhoto} style={{...s.avatar, objectFit:'cover'}} alt="Me" /> 
                            : <div style={s.avatar}>👤</div>
                        )}
                    </div>
                ))}
                
                {loading && (
                    <div style={s.bubbleRow('assistant')}>
                        <div style={s.avatar}>🤖</div>
                        <div style={{...s.bubble('assistant'), fontStyle:'italic', color:t.textSec}}>
                            Sto elaborando... 
                        </div>
                    </div>
                )}
                
                {isLocked && (
                    <div style={s.overlay}>
                        <div style={{fontSize:'60px', marginBottom:'20px'}}>❄️</div>
                        <h2 style={{background: t.card, padding:'10px 30px', borderRadius:'30px', boxShadow:'0 10px 30px rgba(0,0,0,0.2)'}}>
                            Raffreddamento in corso
                        </h2>
                        <p style={{background: t.card, padding:'5px 15px', borderRadius:'10px', marginTop:'10px'}}>
                            Torna tra {formatTime(cooldown)}
                        </p>
                    </div>
                )}
            </div>

            <div style={{...s.inputWrapper, opacity: isLocked ? 0.5 : 1}}>
                <input 
                    style={s.input} 
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && !isLocked && handleSend()} 
                    placeholder={isLocked ? "Sistema in pausa..." : "Scrivi un messaggio all'IA..."} 
                    disabled={isLocked}
                    autoFocus
                />
                <button 
                    style={s.sendBtn} 
                    onClick={handleSend}
                    onMouseEnter={e => !isLocked && (e.currentTarget.style.transform = 'scale(1.1)')}
                    onMouseLeave={e => !isLocked && (e.currentTarget.style.transform = 'scale(1)')}
                >
                    ➤
                </button>
            </div>
        </div>
    );
};

// --- GESTIONE UTENTI ESTERNI (CRM) ---
const ExternalUsersManager = ({ theme }) => {
    const t = themeColors[theme];
    return (
        <div style={{padding:'50px', textAlign:'center', color:t.text}}>
            <h1>👥 Gestione Lettori & Abbonati</h1>
            <p>Qui costruiremo la lista degli utenti registrati al sito pubblico.</p>
        </div>
    );
};

// --- CENTRO NOTIFICHE (V2: GESTISCE TUTTO) ---
const NotificationCenter = ({ user, theme }) => {
  const navigate = useNavigate();
  const t = themeColors[theme];
  
  const [notifs, setNotifs] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Scarica notifiche (Messaggi non letti)
  const fetchNotifs = async () => {
      try {
          const res = await axios.get('https://murthnews-api.onrender.com/api/messages', { params: { username: user.username } });
          const all = res.data.filter(m => !m.read); 
          const sorted = all.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
          setNotifs(sorted);
          setUnreadCount(sorted.length);
      } catch(e){}
  };

  useEffect(() => {
      fetchNotifs();
      const interval = setInterval(fetchNotifs, 5000);
      return () => clearInterval(interval);
  }, [user]);

  // Gestione click notifica INTELLIGENTE
  const handleClick = async (n) => {
      // 1. Segna come letta
      try { await axios.put(`https://murthnews-api.onrender.com/api/messages/${n._id}`, { read: true }); } catch(e){}
      
      setIsOpen(false);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifs(prev => prev.filter(x => x._id !== n._id)); 

      // 2. NAVIGAZIONE IN BASE AL TIPO
      if (n.text.includes('|MEDIA|')) {
          navigate('/media'); // Vai alla Gallery
      } 
      else if (n.text.includes('|APPROVATO|') || n.text.includes('|RIFIUTATO|')) {
          navigate('/notifications'); // Vai agli Esiti
      } 
      else {
          navigate('/mail'); // Vai alla Posta
      }
  };

  const getIcon = (txt, isNotice) => {
      if (txt.includes('|MEDIA|')) return '📷'; // Icona Media
      if (txt.includes('|APPROVATO|')) return '🚀'; // Icona Pubblicazione
      if (txt.includes('|RIFIUTATO|')) return '✋'; // Icona Rifiuto
      if (isNotice) return '⚠️';
      return '📩'; // Icona Email
  };

  const parseText = (txt) => {
      // Se è un messaggio di sistema formattato: ##SISTEMA##|TIPO|TITOLO|CORPO
      if (txt.startsWith('##SISTEMA##')) {
          const parts = txt.split('|');
          return { 
              title: parts[2] || 'Avviso', 
              body: parts[3] || '...' 
          };
      }
      // Se è una email normale
      return { title: 'Nuova Email', body: txt };
  };

  const s = {
      wrapper: { position: 'relative', marginRight: '20px' },
      bellBtn: { 
          background: theme==='light'?'#f1f5f9':'#1e293b', border: `1px solid ${t.border}`, 
          width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
          color: t.text, transition: 'all 0.2s'
      },
      badge: {
          position: 'absolute', top: '-2px', right: '-2px', 
          background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 'bold',
          width: '18px', height: '18px', borderRadius: '50%', display: 'flex', 
          alignItems: 'center', justifyContent: 'center', border: '2px solid #fff'
      },
      dropdown: {
          position: 'absolute', top: '50px', right: '-10px', width: '320px',
          background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)', zIndex: 1000, overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out'
      },
      header: { padding: '15px', borderBottom: `1px solid ${t.border}`, fontWeight: 'bold', fontSize: '13px', color: t.textSec, background: t.hover },
      list: { maxHeight: '300px', overflowY: 'auto' },
      item: { 
          padding: '15px', borderBottom: `1px solid ${t.border}`, cursor: 'pointer', 
          display: 'flex', gap: '15px', alignItems: 'start', transition: 'background 0.2s' 
      },
      empty: { padding: '30px', textAlign: 'center', color: t.textSec, fontSize: '13px' },
      itemTitle: { fontWeight: 'bold', color: t.text, fontSize: '13px', marginBottom: '2px' },
      itemBody: { color: t.textSec, fontSize: '12px', lineHeight: '1.4' },
      time: { fontSize: '10px', color: t.active, marginTop: '5px', fontWeight: 'bold' }
  };

  return (
      <div style={s.wrapper}>
          <button style={s.bellBtn} onClick={() => setIsOpen(!isOpen)}>
              🔔
              {unreadCount > 0 && <div style={s.badge}>{unreadCount}</div>}
          </button>

          {isOpen && (
              <div style={s.dropdown}>
                  <div style={s.header}>CENTRO NOTIFICHE</div>
                  <div style={s.list}>
                      {notifs.length === 0 ? (
                          <div style={s.empty}>Nessuna nuova notifica. 💤</div>
                      ) : (
                          notifs.map(n => {
                              const info = parseText(n.text);
                              return (
                                  <div key={n._id} style={s.item} onClick={() => handleClick(n)} onMouseEnter={e => e.currentTarget.style.background = t.hover} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                      <div style={{fontSize: '20px', background: t.hover, width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%'}}>
                                          {getIcon(n.text, n.isNotice)}
                                      </div>
                                      <div>
                                          <div style={s.itemTitle}>{info.title}</div>
                                          <div style={s.itemBody}>{info.body.substring(0, 50)}...</div>
                                          <div style={s.time}>{new Date(n.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                      </div>
                                  </div>
                              );
                          })
                      )}
                  </div>
              </div>
          )}
          
          {isOpen && <div style={{position:'fixed', inset:0, zIndex:999}} onClick={()=>setIsOpen(false)}></div>}
      </div>
  );
};

// --- MURTH MAIL V9 (FIXED & COMPLETE) ---
const MailPage = ({ user, theme }) => {
  const navigate = useNavigate();
  
  // Definizione colori tema
  const themeColors = {
      light: { bg: '#f8fafc', card: '#ffffff', text: '#1e293b', textSec: '#64748b', border: '#e2e8f0', danger: '#ef4444', success: '#10b981' },
      dark: { bg: '#0f172a', card: '#1e293b', text: '#f8fafc', textSec: '#94a3b8', border: '#334155', danger: '#f87171', success: '#34d399' }
  };
  const t = themeColors[theme] || themeColors.light; 

  // --- STATI ---
  const [hasAccount, setHasAccount] = useState(!!user.internalEmail);
  const [internalEmail, setInternalEmail] = useState(user.internalEmail || '');
  const [view, setView] = useState('list'); 
  const [folder, setFolder] = useState('inbox'); 
  const [emails, setEmails] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedMail, setSelectedMail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  // Form Registrazione
  const [regName, setRegName] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regError, setRegError] = useState('');
  
  // Scrittura
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

  // --- EFFETTI ---
  useEffect(() => { 
      if (hasAccount) fetchMailData(); 
      // Refresh automatico ogni 5 secondi
      const interval = setInterval(() => { if(hasAccount) fetchMailData(true); }, 5000);
      return () => clearInterval(interval);
  }, [hasAccount, folder]);

  // --- LOGICA DATI (CORRETTA) ---
  const fetchMailData = async (background = false) => {
    if(!background) setLoading(true);
    try {
        // 1. Carica Utenti (Rubrica)
        const usersRes = await axios.get('https://murthnews-api.onrender.com/api/users');
        setContacts(usersRes.data.filter(u => u.username !== user.username));

        // 2. Carica Messaggi
        const msgRes = await axios.get('https://murthnews-api.onrender.com/api/messages', { params: { username: user.username } });
        
        // Mappatura sicura dei dati
        let mailData = msgRes.data.map(m => ({
            id: m._id,
            from: m.sender || "Sconosciuto",
            fromName: m.senderName || m.sender, 
            fromEmail: m.senderEmail || "",
            to: m.recipient || "Sconosciuto",
            subject: m.subject || m.text.split('|')[0] || '(Nessun oggetto)',
            body: m.subject ? m.text : (m.text.split('|')[1] || m.text),
            date: new Date(m.createdAt),
            read: m.read || false,
            avatar: m.senderImage,
            folderStatus: m.folder || 'inbox' 
        }));

        const myUser = user.username.toLowerCase();

        // 3. Calcolo Unread (Inbox)
        const unread = mailData.filter(e => e.to.toLowerCase().includes(myUser) && !e.read && e.folderStatus === 'inbox').length;
        setUnreadCount(unread);

        // 4. Filtro Cartelle (CORRETTO)
        let filtered = [];
        if (folder === 'inbox') {
            filtered = mailData.filter(e => e.to.toLowerCase().includes(myUser) && e.folderStatus !== 'trash' && e.folderStatus !== 'archive');
        } else if (folder === 'sent') {
            filtered = mailData.filter(e => e.from.toLowerCase() === myUser && e.folderStatus !== 'trash');
        } else if (folder === 'archive') {
            filtered = mailData.filter(e => e.folderStatus === 'archive' && e.to.toLowerCase().includes(myUser));
        } else if (folder === 'trash') {
            filtered = mailData.filter(e => (e.to.toLowerCase().includes(myUser) || e.from.toLowerCase() === myUser) && e.folderStatus === 'trash');
        }

        // Filtro Ricerca
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            filtered = filtered.filter(e => e.subject.toLowerCase().includes(lowerSearch) || e.from.toLowerCase().includes(lowerSearch));
        }

        setEmails(filtered);

    } catch (err) { console.error(err); } finally { if(!background) setLoading(false); }
  };

  // --- AZIONI (SPOSTA / ELIMINA / LEGGI) ---
  
  const updateEmailFolder = async (mailId, newFolder) => {
      try {
          setEmails(prev => prev.filter(e => e.id !== mailId)); // UI Update immediato
          if (view === 'detail') setView('list');
          setSelectedMail(null);
          await axios.put(`https://murthnews-api.onrender.com/api/messages/${mailId}`, { folder: newFolder });
          fetchMailData(true); 
      } catch (error) { alert("Errore Server"); }
  };

  const deleteForever = async (mailId) => {
      if(!window.confirm("Eliminare definitivamente?")) return;
      try {
          setEmails(prev => prev.filter(e => e.id !== mailId));
          if (view === 'detail') setView('list');
          await axios.delete(`https://murthnews-api.onrender.com/api/messages/${mailId}`);
      } catch (err) { alert("Errore eliminazione"); }
  };

  const openEmail = async (mail) => {
    setSelectedMail(mail);
    setView('detail');
    // Segna come letto se necessario
    if (!mail.read && mail.to.toLowerCase().includes(user.username.toLowerCase())) {
        try {
            setEmails(prev => prev.map(e => e.id === mail.id ? { ...e, read: true } : e));
            setUnreadCount(prev => Math.max(0, prev - 1));
            await axios.put(`https://murthnews-api.onrender.com/api/messages/${mail.id}`, { read: true });
        } catch (e) {}
    }
  };

  const handleRegister = async (e) => {
      e.preventDefault();
      if (!regName.match(/^[a-zA-Z0-9.]+$/)) return setRegError("Caratteri non validi.");
      setLoading(true);
      const fullEmail = `${regName.toLowerCase()}@murthcms.it`;
      try {
          await axios.put(`https://murthnews-api.onrender.com/api/users/${user._id}`, { internalEmail: fullEmail });
          user.internalEmail = fullEmail; setInternalEmail(fullEmail); setHasAccount(true);
      } catch (err) { setRegError("Errore server."); } finally { setLoading(false); }
  };

  const startCompose = (to = '', subject = '', body = '') => {
      setComposeTo(to); setComposeSubject(subject); setComposeBody(body);
      setView('compose'); setSelectedMail(null);
  };

  const sendEmail = async () => {
      if(!composeTo || !composeSubject || !composeBody) return alert("Compila tutto.");
      setLoading(true);
      const cleanRecipient = composeTo.replace('@murthcms.it', '').trim().toLowerCase();

      try {
          await axios.post('https://murthnews-api.onrender.com/api/messages', {
              sender: user.username, senderName: user.nome, senderEmail: internalEmail,
              recipient: cleanRecipient, subject: composeSubject, text: composeBody, isEmail: true,
              folder: 'inbox'
          });
          alert("Inviata! 🚀");
          setComposeTo(''); setComposeSubject(''); setComposeBody('');
          setFolder('sent'); setView('list'); fetchMailData();
      } catch(e) { alert("Errore invio."); } finally { setLoading(false); }
  };

  const getAvatarColor = (name) => {
      const colors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'];
      let hash = 0; for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
      return colors[Math.abs(hash) % colors.length];
  };

  // --- STILI (IMMERSIVI & PULITI) ---
  const s = {
    fullScreen: { 
        position: 'fixed', inset: 0, zIndex: 9999, 
        background: theme === 'light' ? '#f8fafc' : '#0f172a',
        display: 'flex', fontFamily: "'Inter', sans-serif"
    },
    sidebar: { 
        width: '260px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px',
        borderRight: theme === 'light' ? '1px solid #e2e8f0' : '1px solid #1e293b',
        background: theme === 'light' ? '#fff' : '#1e293b'
    },
    homeBtn: {
        marginBottom: '20px', padding: '10px 15px', borderRadius: '10px', cursor: 'pointer',
        background: theme === 'light' ? '#f1f5f9' : 'rgba(255,255,255,0.1)',
        color: t.text, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px',
        border: 'none', fontSize: '14px'
    },
    composeBtn: { 
        padding: '16px', borderRadius: '16px', border: 'none', 
        background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', 
        color: '#fff', fontWeight: '700', fontSize: '15px', cursor: 'pointer', 
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', 
        boxShadow: '0 10px 20px -5px rgba(79, 70, 229, 0.3)', marginBottom: '20px', transition: 'transform 0.2s'
    },
    navItem: (isActive) => ({ 
        padding: '12px 18px', borderRadius: '12px', cursor: 'pointer', fontSize: '15px', 
        fontWeight: isActive ? '700' : '500', 
        color: isActive ? '#2563eb' : t.textSec, 
        background: isActive ? '#eff6ff' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', transition: 'all 0.2s'
    }),
    unreadDot: { width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444', boxShadow: '0 0 5px rgba(239, 68, 68, 0.5)' },
    main: { flex: 1, display: 'flex', flexDirection: 'column', background: t.bg },
    toolbar: { 
        height: '70px', padding: '0 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
        borderBottom: `1px solid ${t.border}`, background: t.card
    },
    searchBar: { 
        padding: '12px 20px', borderRadius: '100px', border: 'none', 
        background: theme === 'light' ? '#f1f5f9' : '#334155', color: t.text, width: '350px', outline: 'none'
    },
    scrollArea: { flex: 1, overflowY: 'auto' },
    mailRow: (read) => ({ 
        display: 'grid', gridTemplateColumns: '50px 1fr 120px', alignItems: 'center', 
        padding: '18px 30px', borderBottom: `1px solid ${t.border}`, cursor: 'pointer', 
        background: read ? 'transparent' : (theme === 'light' ? '#fff' : 'rgba(255,255,255,0.03)'),
        borderLeft: read ? '4px solid transparent' : `4px solid #2563eb`, 
        transition: 'background 0.2s', fontWeight: read ? '400' : '700'
    }),
    avatar: (name) => ({ 
        width: '42px', height: '42px', borderRadius: '50%', background: getAvatarColor(name || '?'), 
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', textTransform: 'uppercase'
    }),
    composeBox: { padding: '40px', maxWidth: '800px', margin: '0 auto', width: '100%' },
    inputLine: { display: 'flex', alignItems: 'center', borderBottom: `1px solid ${t.border}`, padding: '15px 0' },
    inputLabel: { width: '80px', color: t.textSec, fontWeight: '600' },
    inputField: { flex: 1, border: 'none', background: 'transparent', fontSize: '16px', color: t.text, outline: 'none' },
    regContainer: { position:'fixed', inset:0, zIndex:9999, background:t.bg, display:'flex', alignItems:'center', justifyContent:'center' },
    regBox: { width:'400px', padding:'40px', background:t.card, borderRadius:'20px', boxShadow:'0 20px 60px rgba(0,0,0,0.1)', textAlign:'center' },
    
    // Nuovi Stili Pulsanti Azione
    actionBtn: (type) => ({
        padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
        background: type === 'delete' ? (theme==='light'?'#fee2e2':'rgba(239,68,68,0.2)') : (theme==='light'?'#f1f5f9':'rgba(255,255,255,0.1)'),
        color: type === 'delete' ? t.danger : t.text,
        transition: 'transform 0.1s'
    })
  };

  // VISTA 1: REGISTRAZIONE
  if (!hasAccount) return (
      <div style={s.regContainer}>
          <div style={s.regBox}>
              <div style={{fontSize:'50px', marginBottom:'20px'}}>📮</div>
              <h1 style={{margin:'0 0 10px 0', color:t.text}}>Crea Account</h1>
              <p style={{color:t.textSec, marginBottom:'30px'}}>Il tuo indirizzo @murthcms.it</p>
              <form onSubmit={handleRegister}>
                  <input style={{...s.inputField, border:`1px solid ${t.border}`, padding:'10px', borderRadius:'8px', width:'100%', marginBottom:'10px'}} placeholder="nome.cognome" value={regName} onChange={e => setRegName(e.target.value.toLowerCase().replace(/\s/g, ''))} required />
                  <input type="password" style={{...s.inputField, border:`1px solid ${t.border}`, padding:'10px', borderRadius:'8px', width:'100%', marginBottom:'20px'}} placeholder="Password login" value={regPass} onChange={e => setRegPass(e.target.value)} required />
                  {regError && <div style={{color:'red', marginBottom:10}}>{regError}</div>}
                  <button type="submit" style={{...s.composeBtn, width:'100%'}} disabled={loading}>ATTIVA</button>
              </form>
          </div>
      </div>
  );

  // VISTA 2: INTERFACCIA MAIL
  return (
    <div style={s.fullScreen}>
        
        {/* SIDEBAR */}
        <div style={s.sidebar}>
            <button onClick={() => navigate('/')} style={s.homeBtn}><span>🏠</span> TORNA ALLA DASHBOARD</button>
            <button onClick={() => startCompose()} style={s.composeBtn}><span>✏️</span> SCRIVI</button>
            
            <div onClick={() => {setFolder('inbox'); setView('list');}} style={s.navItem(folder==='inbox' && view!=='compose')}>
                <div style={{display:'flex', alignItems:'center', gap:'12px'}}><span>📥</span> Inbox</div>
                {unreadCount > 0 && <div style={s.unreadDot}></div>}
            </div>
            
            <div onClick={() => {setFolder('sent'); setView('list');}} style={s.navItem(folder==='sent' && view!=='compose')}><span>📤</span> Inviata</div>
            
            {/* LINK ARCHIVIO E CESTINO AGGIUNTI */}
            <div onClick={() => {setFolder('archive'); setView('list');}} style={s.navItem(folder==='archive' && view!=='compose')}><span>🗃️</span> Archivio</div>
            <div onClick={() => {setFolder('trash'); setView('list');}} style={s.navItem(folder==='trash' && view!=='compose')}><span>🗑️</span> Cestino</div>

            <div onClick={() => {setFolder('contacts'); setView('list');}} style={s.navItem(folder==='contacts' && view!=='compose')}><span>👥</span> Rubrica</div>

            <div style={{marginTop:'auto', fontSize:'12px', color:t.textSec, padding:'10px', borderTop:`1px solid ${t.border}`}}>
                Account: <b>{internalEmail}</b>
            </div>
        </div>

        {/* MAIN */}
        <div style={s.main}>
            {/* Toolbar */}
            <div style={s.toolbar}>
                <h2 style={{margin:0, fontSize:'20px', color:t.text, fontWeight:'800'}}>
                    {view === 'compose' ? 'Nuovo Messaggio' : view === 'detail' ? 'Lettura' : folder === 'archive' ? 'ARCHIVIO' : folder === 'trash' ? 'CESTINO' : folder.toUpperCase()}
                </h2>
                {view === 'list' && (
                    <input style={s.searchBar} placeholder="Cerca..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                )}
            </div>

            {/* Contenuto */}
            <div style={s.scrollArea}>
                
                {/* COMPOSIZIONE (INPUT MANUALE) */}
                {view === 'compose' && (
                    <div style={s.composeBox}>
                        <div style={s.inputLine}>
                            <div style={s.inputLabel}>A:</div>
                            <input style={s.inputField} placeholder="mariorossi (o mariorossi@murthcms.it)" value={composeTo} onChange={e=>setComposeTo(e.target.value)} autoFocus />
                        </div>
                        <div style={s.inputLine}>
                            <div style={s.inputLabel}>Oggetto:</div>
                            <input style={s.inputField} placeholder="Oggetto..." value={composeSubject} onChange={e=>setComposeSubject(e.target.value)} />
                        </div>
                        <textarea style={{...s.inputField, resize:'none', height:'400px', marginTop:'20px', lineHeight:'1.6'}} placeholder="Scrivi qui..." value={composeBody} onChange={e=>setComposeBody(e.target.value)} />
                        <div style={{marginTop:'30px', display:'flex', gap:'15px'}}>
                            <button onClick={sendEmail} style={{...s.composeBtn, width:'auto', padding:'12px 40px', marginBottom:0}}>INVIA ✈️</button>
                            <button onClick={()=>{setView('list'); setFolder('inbox');}} style={{background:'transparent', border:'none', color:t.textSec, cursor:'pointer', fontWeight:'bold'}}>Annulla</button>
                        </div>
                    </div>
                )}

                {/* RUBRICA */}
                {view === 'list' && folder === 'contacts' && (
                    <div style={{padding:'30px', display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(250px, 1fr))', gap:'20px'}}>
                        {contacts.map(c => (
                            <div key={c._id} style={{padding:'20px', background:t.card, border:`1px solid ${t.border}`, borderRadius:'16px', display:'flex', alignItems:'center', gap:'15px', cursor:'pointer', transition:'transform 0.2s'}} onClick={()=>startCompose(c.username)}>
                                <div style={s.avatar(c.nome)}>{c.nome?.charAt(0)}</div>
                                <div>
                                    <div style={{fontWeight:'bold', color:t.text}}>{c.nome} {c.cognome}</div>
                                    <div style={{fontSize:'12px', color:t.textSec}}>@{c.username}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* LISTA MESSAGGI */}
                {view === 'list' && folder !== 'contacts' && (
                    <div>
                        {emails.length === 0 && <div style={{padding:'50px', textAlign:'center', color:t.textSec}}>📭 Nessun messaggio.</div>}
                        {emails.map(m => (
                            <div key={m.id} style={s.mailRow(m.read)} onClick={() => openEmail(m)}>
                                <div style={s.avatar(m.from)}>{m.from.charAt(0)}</div>
                                <div>
                                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px'}}>
                                        <span style={{fontSize:'15px', color:t.text}}>{folder==='inbox' ? m.fromName || m.from : `A: ${m.to}`}</span>
                                        <span style={{fontSize:'12px', color:t.textSec}}>{m.date.toLocaleDateString()}</span>
                                    </div>
                                    <div style={{fontSize:'14px', color:t.text, marginBottom:'2px'}}>{m.subject}</div>
                                    <div style={{fontSize:'13px', color:t.textSec, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{m.body.substring(0, 80)}...</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* DETTAGLIO CON BOTTONI AZIONE FUNZIONANTI */}
                {view === 'detail' && selectedMail && (
                    <div style={s.composeBox}>
                        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:'20px', borderBottom:`1px solid ${t.border}`, marginBottom:'30px'}}>
                            <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                                <button onClick={()=>setView('list')} style={{border:'none', background:'transparent', fontSize:'20px', cursor:'pointer', marginRight:'10px'}}>←</button>
                                <div style={{...s.avatar(selectedMail.from), width:'50px', height:'50px'}}>{selectedMail.from.charAt(0)}</div>
                                <div>
                                    <h1 style={{margin:0, fontSize:'20px', color:t.text}}>{selectedMail.subject}</h1>
                                    <div style={{fontSize:'13px', color:t.textSec}}>Da: {selectedMail.from} ({selectedMail.date.toLocaleString()})</div>
                                </div>
                            </div>
                            
                            {/* PULSANTI ARCHIVIA / ELIMINA */}
                            <div style={{display:'flex', gap:'10px'}}>
                                {folder !== 'trash' && (
                                    <>
                                        {folder !== 'archive' && (
                                            <button onClick={() => updateEmailFolder(selectedMail.id, 'archive')} style={s.actionBtn('archive')}>🗃️ Archivia</button>
                                        )}
                                        <button onClick={() => updateEmailFolder(selectedMail.id, 'trash')} style={s.actionBtn('delete')}>🗑️ Cestina</button>
                                    </>
                                )}
                                {folder === 'trash' && (
                                    <>
                                        <button onClick={() => updateEmailFolder(selectedMail.id, 'inbox')} style={s.actionBtn('archive')}>♻️ Ripristina</button>
                                        <button onClick={() => deleteForever(selectedMail.id)} style={{...s.actionBtn('delete'), background: t.danger, color: '#fff'}}>💥 Elimina</button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div style={{fontSize:'16px', lineHeight:'1.8', color:t.text, whiteSpace:'pre-wrap'}}>{selectedMail.body}</div>
                        
                        <div style={{marginTop:'40px', paddingTop:'20px', borderTop:`1px solid ${t.border}`}}>
                            <button onClick={()=>startCompose(selectedMail.from, `Re: ${selectedMail.subject}`)} style={{padding:'10px 25px', borderRadius:'50px', border:`1px solid ${t.border}`, background:'transparent', fontWeight:'bold', color:t.text, cursor:'pointer'}}>↩ Rispondi</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

// --- PAGINA ESITI REVISIONE (V3: Gestione Completa) ---
const NotificationsPage = ({ user, theme }) => {
  const navigate = useNavigate();
  const t = themeColors[theme];
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    if (!user) return;
    // Scarica tutte le notifiche di sistema
    axios.get('https://murthnews-api.onrender.com/api/messages', { params: { username: user.username } })
      .then(res => {
        const esiti = res.data.filter(m => m.text && m.text.startsWith('##SISTEMA##'));
        setNotifs(esiti.reverse());
      })
      .catch(err => console.error(err));
  }, [user]);

  // FUNZIONE UNICA PER CANCELLARE DAL DB
  const deleteMsg = async (id) => {
      try {
          await axios.delete(`https://murthnews-api.onrender.com/api/messages/${id}`);
          setNotifs(prev => prev.filter(n => n._id !== id));
      } catch (err) { console.error(err); }
  };

  // GESTIONE DEI TASTI
  const handleAction = async (id, action) => {
      // 1. Esegui l'azione specifica
      if (action === 'fix') {
          await deleteMsg(id); // Cancella notifica
          navigate('/news-list'); // Vai alla lista per correggere
      } else {
          // 'delete' o 'ok'
          await deleteMsg(id); // Cancella notifica e basta
      }
  };

  const s = {
    container: { maxWidth: '800px', margin: '0 auto', paddingBottom: '100px', paddingTop: '40px', fontFamily: '-apple-system, sans-serif' },
    header: { marginBottom: '30px', borderBottom: `1px solid ${t.border}`, paddingBottom: '20px', display:'flex', justifyContent:'space-between', alignItems:'center' },
    backBtn: { background: 'transparent', border: `1px solid ${t.textSec}`, padding: '8px 15px', borderRadius: '20px', color: t.text, cursor: 'pointer', fontWeight: 'bold' },
    
    // CARD STYLE
    card: (isRejected) => ({
        background: t.card,
        borderLeft: isRejected ? '5px solid #ef4444' : '5px solid #10b981',
        borderRadius: '12px', padding: '25px', marginBottom: '20px',
        boxShadow: '0 5px 20px rgba(0,0,0,0.05)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px',
        animation: 'fadeIn 0.3s ease'
    }),
    title: { fontWeight:'800', fontSize:'18px', color: t.text, marginBottom:'5px' },
    reason: { fontSize:'14px', color: t.textSec },
    
    // BOTTONI
    btnGroup: { display:'flex', gap:'10px', alignItems:'center' },
    btnDelete: { background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
    btnFix: { background: '#ef4444', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', boxShadow: '0 4px 10px rgba(239,68,68,0.3)' },
    btnOk: { background: '#10b981', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', boxShadow: '0 4px 10px rgba(16,185,129,0.3)' }
  };

  return (
    <div style={s.container}>
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>
      
      <div style={s.header}>
        <h1 style={{margin:0, color:t.text}}>Esito Revisioni</h1>
        <button onClick={() => navigate('/')} style={s.backBtn}>← Dashboard</button>
      </div>

      {notifs.length === 0 && <div style={{textAlign:'center', color:t.textSec, padding:'50px'}}>Nessuna notifica presente.</div>}

      {notifs.map(n => {
          const parts = n.text.split('|'); 
          // Format: ##SISTEMA##|STATO|TITOLO|MOTIVO
          const status = parts[1];
          const title = parts[2];
          const reason = parts[3];
          const isRejected = status === 'RIFIUTATO';

          return (
            <div key={n._id} style={s.card(isRejected)}>
                {/* ICONA E TESTO */}
                <div style={{display:'flex', gap:'20px', alignItems:'center'}}>
                    <div style={{fontSize:'35px'}}>{isRejected ? '✋' : '🚀'}</div>
                    <div>
                        <div style={{fontSize:'11px', fontWeight:'900', color: isRejected?'#ef4444':'#10b981', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'5px'}}>
                            {isRejected ? 'RICHIESTA MODIFICHE' : 'PUBBLICATO ONLINE'}
                        </div>
                        <div style={s.title}>{title}</div>
                        <div style={s.reason}>{reason}</div>
                    </div>
                </div>

                {/* BOTTONI AZIONE */}
                <div style={s.btnGroup}>
                    {isRejected ? (
                        <>
                            <button onClick={() => handleAction(n._id, 'delete')} style={s.btnDelete} title="Cancella notifica">
                                🗑 Elimina
                            </button>
                            <button onClick={() => handleAction(n._id, 'fix')} style={s.btnFix}>
                                ✏️ Correggi
                            </button>
                        </>
                    ) : (
                        <button onClick={() => handleAction(n._id, 'ok')} style={s.btnOk}>
                            👍 Ottimo, Grazie
                        </button>
                    )}
                </div>
            </div>
          );
      })}
    </div>
  );
};

// --- PAGINA REVISIONE ARTICOLI (V4: INVIO NOTIFICHE ALLA CAMPANELLA) ---
const ReviewPage = ({ user, theme }) => {
  const navigate = useNavigate();
  const t = themeColors[theme];
  const [reviews, setReviews] = useState([]);
  const [rejectMode, setRejectMode] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchReviews = () => {
    axios.get('https://murthnews-api.onrender.com/api/news').then(res => {
      setReviews(res.data.filter(n => n.status === 'In Revisione'));
    });
  };

  useEffect(() => { fetchReviews(); }, []);

  // Approva & Notifica
  const handleApprove = async (article) => {
    if(!confirm(`Pubblicare "${article.title}"?`)) return;
    try {
      // 1. Aggiorna lo stato della news
      await axios.put(`https://murthnews-api.onrender.com/api/news/${article._id}`, { status: 'Pubblicato' });
      
      // 2. INVIA NOTIFICA CAMPANELLA ALL'AUTORE
      // Usiamo il formato speciale ##SISTEMA## per far scattare le icone giuste nel NotificationCenter
      await axios.post('https://murthnews-api.onrender.com/api/messages', {
          sender: user.username, 
          senderName: "Redazione", 
          senderRole: user.role,
          recipient: article.author, 
          text: `##SISTEMA##|APPROVATO|${article.title}|Il tuo articolo è online!`,
          isNotice: true, 
          read: false
      });
      
      alert("✅ Articolo Pubblicato!");
      fetchReviews();
    } catch (err) { alert("Errore server."); }
  };

  // Rifiuta & Notifica
  const handleReject = async (article) => {
    if (!rejectReason.trim()) return alert("Scrivi il motivo del rifiuto.");
    try {
      // 1. Rimanda in Bozza
      await axios.put(`https://murthnews-api.onrender.com/api/news/${article._id}`, { status: 'Bozza' });

      // 2. INVIA NOTIFICA CAMPANELLA ALL'AUTORE
      await axios.post('https://murthnews-api.onrender.com/api/messages', {
          sender: user.username, 
          senderName: "Redazione", 
          senderRole: user.role,
          recipient: article.author, 
          text: `##SISTEMA##|RIFIUTATO|${article.title}|Motivo: ${rejectReason}`,
          isNotice: true, 
          read: false
      });

      alert("🚫 Articolo respinto in Bozza.");
      setRejectMode(null); setRejectReason('');
      fetchReviews();
    } catch (err) { alert("Errore server."); }
  };

  const s = {
    container: { maxWidth: '1000px', margin: '0 auto', paddingBottom: '100px' },
    header: { marginBottom: '40px', borderBottom: `1px solid ${t.border}`, paddingBottom: '20px', display:'flex', justifyContent:'space-between', alignItems:'center' },
    card: { background: t.card, borderRadius: '16px', border: `1px solid ${t.border}`, padding: '25px', marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' },
    meta: { fontSize: '12px', color: t.textSec, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' },
    title: { fontSize: '22px', fontWeight: '900', color: t.text, marginBottom: '10px', lineHeight: '1.2' },
    summary: { fontSize: '15px', color: t.textSec, lineHeight: '1.5' },
    actionsCol: { display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px', borderLeft: `1px solid ${t.border}`, paddingLeft: '20px' },
    btnApprove: { background: '#10b981', color: '#fff', border: 'none', padding: '15px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px' },
    btnReject: { background: '#ef4444', color: '#fff', border: 'none', padding: '15px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px' },
    btnRead: { background: 'transparent', border: `1px solid ${t.border}`, color: t.text, padding: '10px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginBottom:'10px' },
    rejectBox: { background: '#fff7ed', padding: '15px', borderRadius: '10px', border: '1px solid #fdba74', marginTop:'10px' },
    rejectInput: { width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #fdba74', marginBottom: '10px', fontSize:'14px' }
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
            <h1 style={{margin:0, color: t.text}}>Revisione Articoli</h1>
            <p style={{color:t.textSec, margin:0}}>Hai {reviews.length} articoli in attesa.</p>
        </div>
        <button onClick={() => navigate('/')} style={s.btnRead}>← Torna alla Dashboard</button>
      </div>

      {reviews.length === 0 && <div style={{textAlign:'center', padding:'50px', color:t.textSec}}>🎉 Nessun articolo da revisionare. Ottimo lavoro!</div>}

      {reviews.map(article => (
        <div key={article._id} style={s.card}>
            {/* Dati Articolo */}
            <div>
                <div style={s.meta}>Autore: {article.author} • {new Date(article.createdAt).toLocaleDateString()}</div>
                <div style={s.title}>{article.title}</div>
                <div style={s.summary}>{article.summary}</div>
                <div style={{marginTop:'15px', display:'flex', gap:'10px'}}>
                    {article.category && <span style={{background:t.active, color:'#fff', padding:'2px 8px', borderRadius:'4px', fontSize:'11px'}}>{article.category}</span>}
                    {article.importance !== 'Normale' && <span style={{background:'#ef4444', color:'#fff', padding:'2px 8px', borderRadius:'4px', fontSize:'11px'}}>{article.importance}</span>}
                </div>
            </div>

            {/* Azioni */}
            <div style={s.actionsCol}>
                <button onClick={() => navigate(`/edit-news/${article._id}`)} style={s.btnRead}>📄 Leggi / Modifica</button>
                
                {rejectMode === article._id ? (
                    <div style={s.rejectBox}>
                        <div style={{fontSize:'12px', fontWeight:'bold', color:'#9a3412', marginBottom:'5px'}}>MOTIVO RIFIUTO:</div>
                        <textarea style={s.rejectInput} rows={2} value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="Es. Titolo troppo lungo..." />
                        <div style={{display:'flex', gap:'5px'}}>
                            <button onClick={() => handleReject(article)} style={{...s.btnReject, flex:1, padding:'8px'}}>CONFERMA</button>
                            <button onClick={() => setRejectMode(null)} style={{...s.btnRead, flex:1, padding:'8px', marginBottom:0}}>ANNULLA</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <button onClick={() => handleApprove(article)} style={s.btnApprove}>✅ APPROVA E PUBBLICA</button>
                        <button onClick={() => { setRejectMode(article._id); setRejectReason(''); }} style={s.btnReject}>🚫 RIFIUTA E RIMANDA</button>
                    </>
                )}
            </div>
        </div>
      ))}
    </div>
  );
};

// --- MEDIA GALLERY AVANZATA (Paginazione + Filtri + Grafica Moderna) ---
const MediaGallery = ({ user, theme }) => {
  const t = themeColors[theme];
  
  // Dati
  const [allImages, setAllImages] = useState([]); // Tutte le immagini scaricate (database locale)
  const [filteredImages, setFilteredImages] = useState([]); // Immagini dopo i filtri
  const [displayedImages, setDisplayedImages] = useState([]); // Quelle visibili a schermo (chunk)
  const [loading, setLoading] = useState(true);
  
  // Paginazione
  const [visibleCount, setVisibleCount] = useState(20); // Numero iniziale di foto
  
  // Filtri
  const [filterAuthor, setFilterAuthor] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  // Modale
  const [selectedImage, setSelectedImage] = useState(null);

  // 1. CARICAMENTO DATI
  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true);
      try {
        const res = await axios.get("https://murthnews-api.onrender.com/api/news");
        // Trasformiamo le news in "Oggetti Galleria"
        const galleryItems = res.data
          .filter((news) => news.coverImage)
          .map((news) => ({
            id: news._id,
            src: news.coverImage,
            title: news.title,
            author: news.author,
            dateObj: new Date(news.createdAt),
            dateStr: new Date(news.createdAt).toLocaleDateString(),
            year: new Date(news.createdAt).getFullYear().toString(),
            month: (new Date(news.createdAt).getMonth() + 1).toString()
          }))
          .sort((a, b) => b.dateObj - a.dateObj); // Ordine cronologico inverso

        setAllImages(galleryItems);
        setFilteredImages(galleryItems);
      } catch (error) {
        console.error("Errore caricamento gallery:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchImages();
  }, []);

  // 2. LOGICA FILTRI (Eseguita ogni volta che cambi un filtro)
  useEffect(() => {
    let result = allImages;

    // Filtro Autore
    if (filterAuthor) {
      result = result.filter(img => img.author.toLowerCase().includes(filterAuthor.toLowerCase()));
    }
    // Filtro Anno
    if (filterYear) {
      result = result.filter(img => img.year === filterYear);
    }
    // Filtro Mese
    if (filterMonth) {
      result = result.filter(img => img.month === filterMonth);
    }

    setFilteredImages(result);
    setVisibleCount(20); // Reset paginazione quando filtri
  }, [filterAuthor, filterYear, filterMonth, allImages]);

  // 3. LOGICA PAGINAZIONE (Taglia l'array filtrato)
  useEffect(() => {
    setDisplayedImages(filteredImages.slice(0, visibleCount));
  }, [visibleCount, filteredImages]);

  const loadMore = () => {
    setVisibleCount(prev => prev + 20);
  };

  // Dati per le Select dei filtri (Anni unici disponibili)
  const availableYears = [...new Set(allImages.map(img => img.year))].sort((a,b)=>b-a);
  const months = [
    {v:'1', l:'Gennaio'}, {v:'2', l:'Febbraio'}, {v:'3', l:'Marzo'}, {v:'4', l:'Aprile'},
    {v:'5', l:'Maggio'}, {v:'6', l:'Giugno'}, {v:'7', l:'Luglio'}, {v:'8', l:'Agosto'},
    {v:'9', l:'Settembre'}, {v:'10', l:'Ottobre'}, {v:'11', l:'Novembre'}, {v:'12', l:'Dicembre'}
  ];

  // STILI
  const s = {
    container: { maxWidth: "1200px", margin: "0 auto", padding: "40px 20px", color: t.text },
    header: { marginBottom: "30px", borderBottom: `1px solid ${t.border}`, paddingBottom: "20px" },
    title: { fontSize: "32px", fontWeight: "900", margin: 0, letterSpacing: "-1px" },
    subtitle: { color: t.textSec, fontSize: "16px", marginTop: "5px" },
    
    // BARRA FILTRI
    filterBar: { display: 'flex', gap: '15px', flexWrap: 'wrap', background: t.card, padding: '20px', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: `1px solid ${t.border}` },
    filterGroup: { flex: 1, minWidth: '150px' },
    label: { display: 'block', marginBottom: '5px', fontSize: '11px', fontWeight: 'bold', color: t.textSec, textTransform: 'uppercase' },
    select: { width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${t.border}`, background: theme === 'dark' ? '#0f172a' : '#f8fafc', color: t.text, outline: 'none', fontSize: '14px' },
    input: { width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${t.border}`, background: theme === 'dark' ? '#0f172a' : '#f8fafc', color: t.text, outline: 'none', fontSize: '14px' },
    resetBtn: { padding: '10px 20px', background: 'transparent', border: `1px solid ${t.border}`, color: t.textSec, borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize:'12px', height:'42px', marginTop:'auto' },

    // GRIGLIA
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "20px" },
    card: { position: "relative", borderRadius: "12px", overflow: "hidden", aspectRatio: "1 / 1", cursor: "zoom-in", border: `1px solid ${t.border}`, boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
    img: { width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" },
    overlay: { position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)", opacity: 0, transition: "opacity 0.2s", display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'15px' },
    
    // LOAD MORE
    loadMoreBox: { textAlign: 'center', marginTop: '50px' },
    loadBtn: { padding: '15px 40px', background: t.active, color: '#fff', border: 'none', borderRadius: '30px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', boxShadow: '0 5px 15px rgba(0,0,0,0.2)' },
    
    // MODALE
    modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' },
    modalImg: { maxWidth: '90%', maxHeight: '85vh', borderRadius: '8px', boxShadow: '0 0 30px rgba(0,0,0,0.5)' },
    modalInfo: { position: 'absolute', bottom: '30px', color: '#fff', textAlign: 'center' },
    closeBtn: { position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', width: '40px', height: '40px', borderRadius: '50%', fontSize: '20px', cursor: 'pointer', backdropFilter: 'blur(5px)' }
  };

  if (loading) return <div style={{padding:'50px', textAlign:'center', color:t.textSec}}>Caricamento archivio...</div>;

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h1 style={s.title}>🖼️ Archivio Media</h1>
        <p style={s.subtitle}>Database visuale della testata ({filteredImages.length} foto trovate)</p>
      </div>

      {/* BARRA DEI FILTRI */}
      <div style={s.filterBar}>
        <div style={s.filterGroup}>
            <label style={s.label}>Cerca Utente</label>
            <input 
                placeholder="Nome redattore..." 
                style={s.input} 
                value={filterAuthor} 
                onChange={e => setFilterAuthor(e.target.value)} 
            />
        </div>
        <div style={s.filterGroup}>
            <label style={s.label}>Anno</label>
            <select style={s.select} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                <option value="">Tutti gli anni</option>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
        </div>
        <div style={s.filterGroup}>
            <label style={s.label}>Mese</label>
            <select style={s.select} value={filterMonth} onChange={e => setFilterMonth(e.target.value)} disabled={!filterYear}>
                <option value="">Tutti i mesi</option>
                {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
        </div>
        <div style={{display:'flex', alignItems:'flex-end'}}>
            <button onClick={() => { setFilterAuthor(''); setFilterYear(''); setFilterMonth(''); }} style={s.resetBtn}>RESET ↺</button>
        </div>
      </div>

      {/* GRIGLIA FOTO */}
      {displayedImages.length === 0 ? (
          <div style={{textAlign:'center', padding:'40px', color:t.textSec, fontStyle:'italic'}}>Nessuna foto corrisponde ai filtri.</div>
      ) : (
          <div style={s.grid}>
            {displayedImages.map(img => (
              <div 
                key={img.id} 
                style={s.card} 
                onClick={() => setSelectedImage(img)}
                onMouseEnter={e => { e.currentTarget.firstChild.style.transform = 'scale(1.1)'; e.currentTarget.lastChild.style.opacity = 1; }}
                onMouseLeave={e => { e.currentTarget.firstChild.style.transform = 'scale(1)'; e.currentTarget.lastChild.style.opacity = 0; }}
              >
                <img src={img.src} style={s.img} loading="lazy" alt="gallery" />
                <div style={s.overlay}>
                    <div style={{color:'#fff', fontWeight:'bold', fontSize:'14px', marginBottom:'2px'}}>{img.title}</div>
                    <div style={{color:'rgba(255,255,255,0.7)', fontSize:'11px'}}>
                        Foto di <b>{img.author}</b> • {img.dateStr}
                    </div>
                </div>
              </div>
            ))}
          </div>
      )}

      {/* BOTTONE LOAD MORE */}
      {displayedImages.length < filteredImages.length && (
          <div style={s.loadMoreBox}>
              <button onClick={loadMore} style={s.loadBtn}>
                  Mostra altre 20 foto ({filteredImages.length - displayedImages.length} rimanenti) 👇
              </button>
          </div>
      )}

      {/* MODALE FULL SCREEN */}
      {selectedImage && (
          <div style={s.modal} onClick={() => setSelectedImage(null)}>
              <button style={s.closeBtn}>✕</button>
              <img src={selectedImage.src} style={s.modalImg} onClick={e => e.stopPropagation()} alt="full" />
              <div style={s.modalInfo} onClick={e => e.stopPropagation()}>
                  <h2 style={{margin:'0 0 5px 0'}}>{selectedImage.title}</h2>
                  <p style={{margin:0, opacity:0.8}}>Caricato da {selectedImage.author} il {selectedImage.dateStr}</p>
              </div>
          </div>
      )}
    </div>
  );
};

// --- 1. TICKER ULTIM'ORA (Con Timer 60min e Auto-Delete) ---
const BreakingNewsTicker = () => {
  const [alerts, setAlerts] = useState([]);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const fetchAlerts = async () => {
      try { const res = await axios.get('https://murthnews-api.onrender.com/api/breaking'); setAlerts(res.data); } catch (e) {}
  };

  const deleteExpired = async (id) => {
      try { await axios.delete(`https://murthnews-api.onrender.com/api/breaking/${id}`); fetchAlerts(); } catch (e) {}
  };

  useEffect(() => {
    fetchAlerts();
    const timer = setInterval(() => {
        setCurrentTime(Date.now());
        fetchAlerts(); 
    }, 1000); 
    return () => clearInterval(timer);
  }, []);

  if (alerts.length === 0) return null; 

  return (
    <div style={{width: '100%', background: '#000', color: '#fff', display: 'flex', alignItems: 'center', height: '40px', overflow: 'hidden', borderBottom: '2px solid #dc2626', fontFamily: 'sans-serif', position: 'relative', zIndex: 999}}>
      <div style={{background: '#dc2626', height: '100%', padding: '0 20px', display: 'flex', alignItems: 'center', fontWeight: '900', fontSize: '12px', zIndex: 10, boxShadow: '5px 0 15px rgba(0,0,0,0.5)'}}>⚡ ULTIM'ORA</div>
      <div style={{flex: 1, overflow: 'hidden', whiteSpace: 'nowrap'}}>
         <div style={{display: 'inline-block', paddingLeft: '100%', animation: 'ticker 30s linear infinite'}}>
             <style>{`@keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }`}</style>
             {alerts.map((item) => {
                 const expiresAt = new Date(item.createdAt).getTime() + 3600000; // 1 Ora
                 const timeLeft = expiresAt - currentTime;
                 if (timeLeft <= 0) { deleteExpired(item._id); return null; }
                 const mins = Math.floor((timeLeft % (3600000)) / 60000);
                 const secs = Math.floor((timeLeft % 60000) / 1000);

                 return (
                     <span key={item._id} style={{marginRight: '60px', fontSize: '13px', fontWeight:'600', display:'inline-flex', alignItems:'center'}}>
                         <span style={{color: '#dc2626', marginRight:'8px'}}>●</span> 
                         {item.link ? <a href={item.link} style={{color:'#fff', textDecoration:'underline'}} target="_blank">{item.text.toUpperCase()}</a> : item.text.toUpperCase()}
                         <span style={{marginLeft:'10px', fontSize:'10px', color:'#ef4444', border:'1px solid #ef4444', padding:'0 4px', borderRadius:'3px'}}>⏳ {mins}:{secs < 10 ? '0'+secs : secs}</span>
                     </span>
                 );
             })}
         </div>
      </div>
    </div>
  );
};

// --- MANAGER ULTIM'ORA (Design Studio "Open Space") ---
const BreakingManager = ({ theme }) => {
    const t = themeColors[theme];
    const [alerts, setAlerts] = useState([]);
    const [recentNews, setRecentNews] = useState([]);
    
    // Stati Form
    const [text, setText] = useState('');
    const [link, setLink] = useState('');
    const [mode, setMode] = useState('manual'); // 'manual' o 'select'

    const fetchAll = async () => {
        try {
            const a = await axios.get('https://murthnews-api.onrender.com/api/breaking'); setAlerts(a.data);
            const n = await axios.get('https://murthnews-api.onrender.com/api/news'); 
            // Prendo le ultime 6 pubblicate
            setRecentNews(n.data.filter(x => x.status === 'Pubblicato').slice(0, 6));
        } catch(e) {}
    };

    useEffect(() => { fetchAll(); const i = setInterval(fetchAll, 5000); return () => clearInterval(i); }, []);

    const publish = async (e) => {
        e.preventDefault();
        if(!text) return;
        await axios.post('https://murthnews-api.onrender.com/api/breaking', { text, link });
        setText(''); setLink(''); fetchAll();
    };

    const deleteAlert = async (id) => {
        if(!confirm("Chiudere questa notizia?")) return;
        await axios.delete(`https://murthnews-api.onrender.com/api/breaking/${id}`);
        fetchAll();
    };

    const selectArticle = (n) => {
        setText(n.title.toUpperCase());
        setLink(`/read-news/${n._id}`);
        // Animazione feedback visivo o switch automatico a manuale per vedere il risultato
        setMode('manual');
    };

    // STILI
    const s = {
        wrapper: { padding: '0', animation: 'fadeIn 0.5s ease' },
        onAirBox: { marginBottom: '40px', padding: '20px', background: alerts.length > 0 ? '#FEF2F2' : '#f8fafc', borderLeft: alerts.length > 0 ? '6px solid #dc2626' : '6px solid #ccc', borderRadius: '4px' },
        statusTitle: { margin: 0, textTransform: 'uppercase', letterSpacing: '2px', fontSize: '14px', fontWeight: 'bold', color: alerts.length > 0 ? '#dc2626' : '#64748b' },
        liveText: { fontSize: '24px', fontWeight: '900', color: '#1e293b', marginTop: '5px' },
        
        tabs: { display: 'flex', gap: '20px', marginBottom: '30px', borderBottom: `2px solid ${t.border}` },
        tab: (active) => ({ padding: '10px 20px', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', color: active ? t.active : t.textSec, borderBottom: active ? `4px solid ${t.active}` : '4px solid transparent', marginBottom: '-4px', transition: 'all 0.2s' }),

        // Input Giganti
        hugeInput: { width: '100%', border: 'none', background: 'transparent', fontSize: '40px', fontWeight: '900', color: t.text, outline: 'none', placeholderColor: t.textSec, marginBottom: '20px' },
        linkInput: { width: '100%', padding: '15px', background: t.card, border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '16px', color: t.text, outline: 'none', marginBottom: '20px' },
        
        // Griglia News
        grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' },
        newsCard: { position: 'relative', height: '180px', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', transition: 'transform 0.2s' },
        newsImg: { width: '100%', height: '100%', objectFit: 'cover' },
        newsOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)', display: 'flex', alignItems: 'flex-end', padding: '15px' },
        newsTitle: { color: '#fff', fontWeight: 'bold', fontSize: '14px', lineHeight: '1.3' },

        bigBtn: { padding: '20px 40px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 10px 25px rgba(220, 38, 38, 0.4)', transition: 'transform 0.2s' },
        
        historyItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: `1px solid ${t.border}`, opacity: 0.7 }
    };

    return (
        <div style={s.wrapper}>
            <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>

            {/* STATUS MONITOR */}
            <div style={s.onAirBox}>
                <div style={s.statusTitle}>{alerts.length > 0 ? '🔴 ORA IN ONDA' : '⚫ NESSUNA NOTIZIA ATTIVA'}</div>
                {alerts.length > 0 ? (
                    alerts.map(a => (
                        <div key={a._id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'10px'}}>
                            <div style={s.liveText}>{a.text}</div>
                            <button onClick={() => deleteAlert(a._id)} style={{background:'transparent', border:'2px solid #dc2626', color:'#dc2626', fontWeight:'bold', padding:'5px 15px', borderRadius:'20px', cursor:'pointer'}}>CHIUDI</button>
                        </div>
                    ))
                ) : (
                    <div style={{fontSize:'18px', color:t.textSec, marginTop:'5px'}}>Il ticker è spento. Pubblica qualcosa per attivare l'alert.</div>
                )}
            </div>

            {/* TABS */}
            <div style={s.tabs}>
                <div onClick={() => setMode('manual')} style={s.tab(mode === 'manual')}>✍️ Scrittura</div>
                <div onClick={() => setMode('select')} style={s.tab(mode === 'select')}>📰 Da Articoli</div>
            </div>

            {/* CONTENUTO */}
            {mode === 'manual' ? (
                <div style={{animation: 'fadeIn 0.3s ease'}}>
                    <input 
                        style={s.hugeInput} 
                        placeholder="TITOLO FLASH QUI..." 
                        value={text} 
                        onChange={e => setText(e.target.value)} 
                        autoFocus
                    />
                    <input 
                        style={s.linkInput} 
                        placeholder="🔗 Incolla link (opzionale) o lascia vuoto" 
                        value={link} 
                        onChange={e => setLink(e.target.value)} 
                    />
                    <div style={{textAlign:'right'}}>
                        <button onClick={publish} style={s.bigBtn}>MANDA IN ONDA 🚀</button>
                    </div>
                </div>
            ) : (
                <div style={s.grid}>
                    {recentNews.map(n => (
                        <div key={n._id} style={s.newsCard} onClick={() => selectArticle(n)} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.03)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                            <img src={n.coverImage || 'https://via.placeholder.com/300'} style={s.newsImg} alt="cover"/>
                            <div style={s.newsOverlay}>
                                <div style={s.newsTitle}>{n.title}</div>
                            </div>
                            {/* Badge "Scegli" */}
                            <div style={{position:'absolute', top:'10px', right:'10px', background:'#2563eb', color:'#fff', padding:'5px 10px', borderRadius:'15px', fontSize:'10px', fontWeight:'bold'}}>SCEGLI</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- PAGINA DEDICATA: REGIA ULTIM'ORA ---
const BreakingPage = ({ theme }) => {
  const t = themeColors[theme];
  return (
    <div style={{maxWidth: '1000px', margin: '0 auto', padding: '60px 20px'}}>
      {/* Intestazione semplice e pulita */}
      <div style={{marginBottom: '50px'}}>
        <h1 style={{margin: 0, color: t.text, fontSize: '48px', fontWeight: '900', letterSpacing: '-2px'}}>
            Regia.
        </h1>
        <p style={{color: t.textSec, fontSize: '20px', marginTop:'5px'}}>
            Gestione flusso notizie urgenti.
        </p>
      </div>

      {/* Il Manager adesso prende theme per i colori giusti */}
      <BreakingManager theme={theme} />
    </div>
  );
};



// --- GESTORE MENU HEADER 2 (CMS) ---
function MenuManager() {
    // Stati
    const [menuItems, setMenuItems] = useState([]);
    const [availablePages, setAvailablePages] = useState([]);
    
    // Stati inserimento
    const [mode, setMode] = useState('page');
    const [selectedPageId, setSelectedPageId] = useState(''); 
    const [customLabel, setCustomLabel] = useState('');
    const [customLink, setCustomLink] = useState('');
    
    // NUOVO: Stato Icona
    const [selectedIcon, setSelectedIcon] = useState('');

    // Lista Icone Disponibili (Minimal & Utili)
    const ICONS = [
        "🏠", "🔥", "⭐", "⚽", "💻", "🌍", "💼", "🎉", 
        "📰", "🎥", "🎙️", "💡", "🚀", "❤️", "💎", "📢",
        "🇮🇹", "🇺🇸", "🇪🇺", "🏀", "🏎️", "🎵", "👗", "🍕"
    ];

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [menuRes, pagesRes] = await Promise.all([
                axios.get('https://murthnews-api.onrender.com/api/menu'),
                axios.get('https://murthnews-api.onrender.com/api/pages')
            ]);
            setMenuItems(menuRes.data);
            setAvailablePages(pagesRes.data);
        } catch (err) { console.error(err); }
    };

    const addItem = async () => {
        if (menuItems.length >= 6) return alert("Massimo 6 elementi!"); 
        let payload = {};

        if (mode === 'page') {
            const page = availablePages.find(p => p._id === selectedPageId);
            if (!page) return alert("Seleziona una pagina");
            
            const finalLabel = customLabel || page.title;

            payload = {
                label: finalLabel,
                
                // 👇 MODIFICA QUI: Usa /p/ invece di /news/
                link: `/p/${page.slug}`, 
                
                type: 'page',
                icon: selectedIcon
            };
        } else {
            if (!customLabel || !customLink) return alert("Compila tutto");
            payload = {
                label: customLabel,
                link: customLink,
                type: 'custom',
                icon: selectedIcon
            };
        }

        try {
            await axios.post('https://murthnews-api.onrender.com/api/menu', payload);
            fetchData();
            // Reset
            setCustomLabel(''); setCustomLink(''); setSelectedPageId(''); setSelectedIcon('');
        } catch (err) { alert("Errore salvataggio"); }
    };

    const removeItem = async (id) => {
        if(!confirm("Eliminare voce?")) return;
        await axios.delete(`https://murthnews-api.onrender.com/api/menu/${id}`);
        fetchData();
    };

    // Stili locali per il CMS
    const s = {
        container: { maxWidth: '800px', margin: '40px auto', padding: '20px', background:'#fff', borderRadius:'12px', boxShadow:'0 4px 20px rgba(0,0,0,0.05)', fontFamily:'sans-serif', color: '#1e293b' },
        header: { marginBottom:'30px', borderBottom:'1px solid #eee', paddingBottom:'15px' },
        sectionTitle: { fontSize:'12px', fontWeight:'bold', color:'#64748b', textTransform:'uppercase', marginBottom:'10px' },
        
        // Grid Icone
        iconGrid: { display:'flex', flexWrap:'wrap', gap:'10px', marginBottom:'20px', background:'#f8fafc', padding:'15px', borderRadius:'10px', border:'1px solid #e2e8f0' },
        iconBtn: (active) => ({
            width:'35px', height:'35px', borderRadius:'8px', border: active ? '2px solid #2563eb' : '1px solid #cbd5e1',
            background: active ? '#eff6ff' : '#fff', cursor:'pointer', fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center',
            transition: 'all 0.2s'
        }),

        input: { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom:'10px' },
        select: { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom:'10px' },
        
        btn: { padding: '12px 30px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
        
        itemRow: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'15px', borderBottom:'1px solid #eee', background:'#fff' },
        itemBadge: { background:'#f1f5f9', padding:'5px 10px', borderRadius:'20px', fontSize:'12px', marginRight:'10px' }
    };

    return (
        <div style={s.container}>
            <div style={s.header}>
                <h2 style={{margin:0}}>Gestione Header 2</h2>
                <p style={{color:'#64748b', fontSize:'14px'}}>Aggiungi link con icone (Max 6)</p>
            </div>

            <div style={{display:'flex', gap:'20px', marginBottom:'20px'}}>
                <button onClick={()=>setMode('page')} style={{fontWeight:'bold', color: mode==='page'?'#2563eb':'#64748b', border:'none', background:'none', cursor:'pointer'}}>📄 Pagina Interna</button>
                <button onClick={()=>setMode('custom')} style={{fontWeight:'bold', color: mode==='custom'?'#2563eb':'#64748b', border:'none', background:'none', cursor:'pointer'}}>🌐 Link Esterno</button>
            </div>

            {/* SELEZIONE ICONA */}
            <div>
                <div style={s.sectionTitle}>1. Scegli un'icona (Opzionale)</div>
                <div style={s.iconGrid}>
                    <button onClick={()=>setSelectedIcon('')} style={s.iconBtn(selectedIcon==='')} title="Nessuna">🚫</button>
                    {ICONS.map(ic => (
                        <button key={ic} onClick={()=>setSelectedIcon(ic)} style={s.iconBtn(selectedIcon===ic)}>{ic}</button>
                    ))}
                </div>
            </div>

            {/* FORM DATI */}
            <div style={{marginBottom:'20px'}}>
                <div style={s.sectionTitle}>2. Dettagli Link</div>
                
                {mode === 'page' ? (
                    <>
                        <select style={s.select} value={selectedPageId} onChange={e=>setSelectedPageId(e.target.value)}>
                            <option value="">-- Seleziona Pagina --</option>
                            {availablePages.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                        </select>
                        <input style={s.input} placeholder="Nome personalizzato (Opzionale)" value={customLabel} onChange={e=>setCustomLabel(e.target.value)} />
                    </>
                ) : (
                    <>
                        <input style={s.input} placeholder="Etichetta (es. Facebook)" value={customLabel} onChange={e=>setCustomLabel(e.target.value)} />
                        <input style={s.input} placeholder="URL (https://...)" value={customLink} onChange={e=>setCustomLink(e.target.value)} />
                    </>
                )}
                
                <button onClick={addItem} style={s.btn}>AGGIUNGI AL MENU +</button>
            </div>

            {/* LISTA ESISTENTE */}
            <div style={{background:'#f8fafc', borderRadius:'12px', padding:'10px'}}>
                <div style={s.sectionTitle}>Anteprima Menu</div>
                {menuItems.map(item => (
                    <div key={item._id} style={s.itemRow}>
                        <div style={{display:'flex', alignItems:'center'}}>
                            {item.icon && <span style={{fontSize:'20px', marginRight:'15px'}}>{item.icon}</span>}
                            <div>
                                <div style={{fontWeight:'bold'}}>{item.label}</div>
                                <div style={{fontSize:'12px', color:'#64748b'}}>{item.link}</div>
                            </div>
                        </div>
                        <button onClick={()=>removeItem(item._id)} style={{color:'#ef4444', border:'1px solid #ef4444', background:'none', borderRadius:'6px', padding:'5px 10px', cursor:'pointer', fontSize:'12px', fontWeight:'bold'}}>ELIMINA</button>
                    </div>
                ))}
                {menuItems.length === 0 && <div style={{padding:'20px', textAlign:'center', color:'#94a3b8'}}>Menu vuoto.</div>}
            </div>
        </div>
    );
}


// --- LISTA PAGINE (Gestione: Design a Card) ---
const PagesList = ({ theme }) => {
    const t = themeColors[theme];
    const [pages, setPages] = useState([]);
    const navigate = useNavigate();

    // 1. Caricamento Dati
    useEffect(() => {
        axios.get('https://murthnews-api.onrender.com/api/pages')
            .then(res => setPages(res.data))
            .catch(err => console.error(err));
    }, []);

    // 2. Eliminazione
    const deletePage = async (id) => {
        if(!confirm("⚠️ Attenzione: eliminare questa pagina? L'azione è irreversibile.")) return;
        try {
            await axios.delete(`https://murthnews-api.onrender.com/api/pages/${id}`);
            setPages(prev => prev.filter(p => p._id !== id));
        } catch(e) { alert("Errore eliminazione"); }
    };

    // --- STILI ---
    const s = {
        container: { maxWidth: '1100px', margin: '0 auto', paddingBottom: '100px', fontFamily: '-apple-system, sans-serif' },
        
        // Header
        topRow: { display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'40px', borderBottom:`1px solid ${t.border}`, paddingBottom:'20px' },
        titleBox: { display:'flex', flexDirection:'column' },
        title: { margin:0, color: t.text, fontSize: '32px', fontWeight:'900', letterSpacing:'-1px' },
        subtitle: { color: t.textSec, fontSize:'14px', marginTop:'5px', fontWeight:'500' },

        // Pulsante "Nuova Pagina"
        createBtn: { 
            background: t.active, color: '#fff', padding: '12px 25px', borderRadius: '30px', 
            border: 'none', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', 
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display:'flex', alignItems:'center', gap:'8px',
            transition: 'transform 0.2s'
        },

        // Griglia Cards
        grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '25px' },

        // Card Stile
        card: { 
            background: t.card, borderRadius: '16px', border: `1px solid ${t.border}`, 
            padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px',
            transition: 'all 0.3s ease', position:'relative', overflow:'hidden',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
        },
        
        // Contenuto Card
        cardIcon: { fontSize:'24px', marginBottom:'5px' },
        cardTitle: { fontSize:'18px', fontWeight:'800', color: t.text, lineHeight:'1.3' },
        
        // Slug Badge (URL)
        slugBox: { 
            background: theme==='dark'?'rgba(255,255,255,0.05)':'#f1f5f9', 
            padding:'8px 12px', borderRadius:'8px', fontSize:'12px', 
            color: t.active, fontFamily:'monospace', fontWeight:'bold',
            display:'inline-flex', alignItems:'center', gap:'5px', width:'fit-content'
        },

        // Footer Card (Azioni)
        cardFooter: { marginTop:'auto', paddingTop:'20px', borderTop:`1px solid ${t.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' },
        
        // Bottoni Azione
        actionGroup: { display:'flex', gap:'8px' },
        btnIcon: (col) => ({ 
            width:'35px', height:'35px', borderRadius:'50%', border:`1px solid ${t.border}`, 
            background:'transparent', color: col, cursor:'pointer', display:'flex', 
            alignItems:'center', justifyContent:'center', fontSize:'16px', transition:'background 0.2s' 
        }),
        btnView: { 
            fontSize:'12px', fontWeight:'bold', color: t.textSec, textDecoration:'none', 
            display:'flex', alignItems:'center', gap:'5px', padding:'5px 10px', borderRadius:'5px',
            background: t.hover
        }
    };

    return (
        <div style={s.container}>
            
            {/* HEADER MODIFICATO */}
            <div style={s.topRow}>
                <div style={s.titleBox}>
                    <h1 style={s.title}>Pagine Statiche</h1>
                    <span style={s.subtitle}>Gestisci contenuti come "Chi Siamo", "Contatti", ecc.</span>
                </div>
                
                <div style={{display:'flex', gap:'10px'}}>
                    {/* --- NUOVO TASTO MENU --- */}
                    <button 
                        onClick={() => navigate('/menu-manager')} 
                        style={{
                            background: theme === 'dark' ? '#334155' : '#e2e8f0', 
                            color: t.text, 
                            padding: '12px 20px', borderRadius: '30px', 
                            border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer',
                            display:'flex', alignItems:'center', gap:'8px'
                        }}
                    >
                        ⚙️ GESTISCI HEADER 2
                    </button>

                    {/* TASTO ESISTENTE */}
                    <button 
                        onClick={() => navigate('/write-page')} 
                        style={s.createBtn}
                        onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
                        onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}
                    >
                        + NUOVA PAGINA
                    </button>
                </div>
            </div>

            {/* GRIGLIA */}
            <div style={s.grid}>
                {pages.map(p => (
                    <div 
                        key={p._id} 
                        style={s.card}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.05)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.02)'; }}
                    >
                        <div style={s.cardIcon}>📑</div>
                        
                        <div style={s.cardTitle}>{p.title}</div>
                        
                        <div style={s.slugBox} title="Indirizzo web">
                            <span>🔗</span> /p/{p.slug}
                        </div>

                        <div style={s.cardFooter}>
                            {/* Link Anteprima Pubblica */}
                            <a href={`/p/${p.slug}`} target="_blank" rel="noopener noreferrer" style={s.btnView}>
                                👁️ Anteprima
                            </a>

                            {/* Azioni Modifica/Elimina */}
                            <div style={s.actionGroup}>
                                <button 
                                    onClick={() => navigate(`/write-page/${p._id}`)} 
                                    style={s.btnIcon(t.text)} 
                                    title="Modifica"
                                    onMouseEnter={e=>e.currentTarget.style.background=t.hover}
                                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                                >
                                    ✏️
                                </button>
                                <button 
                                    onClick={() => deletePage(p._id)} 
                                    style={s.btnIcon('#ef4444')} 
                                    title="Elimina"
                                    onMouseEnter={e=>e.currentTarget.style.background='#fee2e2'}
                                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Stato Vuoto */}
                {pages.length === 0 && (
                    <div style={{gridColumn:'1 / -1', textAlign:'center', padding:'60px', color:t.textSec}}>
                        <div style={{fontSize:'40px', marginBottom:'10px'}}>🕸️</div>
                        Nessuna pagina statica trovata. Creane una nuova!
                    </div>
                )}
            </div>
        </div>
    );
};

// --- SCRIVI PAGINA (Versione Editor Corretta) ---
const WritePage = ({ theme }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const t = themeColors[theme];
    
    // Inizializziamo lo stato con campi vuoti
    const [form, setForm] = useState({ title: '', slug: '', content: '' });
    const [loading, setLoading] = useState(false);

    // Caricamento Dati (SOLO SE C'È UN ID)
    useEffect(() => {
        if(id) {
            setLoading(true);
            // Usiamo la nuova rotta specifica '/edit/'
            axios.get(`https://murthnews-api.onrender.com/api/pages/edit/${id}`)
                 .then(res => {
                     console.log("DATI RICEVUTI PER MODIFICA:", res.data); // Controlla la console del browser (F12)
                     setForm(res.data);
                     setLoading(false);
                 })
                 .catch(err => {
                     console.error("Errore caricamento:", err);
                     alert("Errore nel caricamento della pagina da modificare.");
                     setLoading(false);
                 });
        }
    }, [id]);

    // Gestione intelligente del titolo e dello slug
    const handleTitleChange = (e) => {
        const val = e.target.value;
        setForm(prev => ({
            ...prev, 
            title: val,
            // Modifica lo slug SOLO se stiamo creando una pagina NUOVA (!id)
            // Se stiamo modificando, lo slug non deve cambiare da solo per non rompere i link vecchi
            slug: !id ? val.toLowerCase().trim().replace(/ /g, '-').replace(/[^\w-]+/g, '') : prev.slug
        }));
    };

    const save = async () => {
        if (!form.title.trim()) { alert("Titolo obbligatorio!"); return; }
        if (!form.content.trim()) { alert("Contenuto obbligatorio!"); return; }

        try {
            if(id) {
                // UPDATE
                await axios.put(`https://murthnews-api.onrender.com/api/pages/${id}`, form);
                alert("✅ Pagina Aggiornata Correttamente!");
            } else {
                // CREATE
                await axios.post('https://murthnews-api.onrender.com/api/pages', form);
                alert("✅ Pagina Creata!");
            }
            navigate('/pages');
        } catch(e) { 
            alert("ERRORE SALVATAGGIO: " + (e.response?.data?.message || e.message)); 
        }
    };

    const s = {
        container: { maxWidth: '800px', margin: '0 auto', padding: '40px 20px' },
        inputHuge: { width: '100%', fontSize: '40px', fontWeight: '900', border: 'none', background: 'transparent', outline: 'none', color: t.text, marginBottom: '10px', borderBottom: `2px solid ${t.border}` },
        slugRow: { display:'flex', alignItems:'center', gap:'10px', marginBottom:'30px', background: t.hover, padding: '10px', borderRadius: '8px' },
        inputSlug: { width: '100%', background: 'transparent', border: 'none', color: t.active, fontWeight: 'bold', fontFamily: 'monospace', outline: 'none' },
        area: { width: '100%', height: '500px', padding: '20px', background: t.card, border: `1px solid ${t.border}`, borderRadius: '10px', color: t.text, fontSize: '18px', resize: 'vertical', outline: 'none', lineHeight: '1.6' },
        btnSave: { position: 'fixed', bottom: '30px', right: '30px', padding: '15px 40px', background: t.active, color: '#fff', border: 'none', borderRadius: '30px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', boxShadow: '0 5px 20px rgba(0,0,0,0.2)', zIndex: 100 }
    };

    if (loading) return <div style={{padding:'50px', textAlign:'center', color: t.text}}>Recupero dati pagina...</div>;

    return (
        <div style={s.container}>
            <input 
                placeholder="Titolo Pagina (es. Chi Siamo)" 
                value={form.title} 
                onChange={handleTitleChange} 
                style={s.inputHuge} 
            />
            
            <div style={s.slugRow}>
                <span style={{color:t.textSec, whiteSpace: 'nowrap'}}>URL: miosito.it/p/</span>
                <input 
                    placeholder="chi-siamo" 
                    value={form.slug} 
                    onChange={e=>setForm({...form, slug: e.target.value})} 
                    style={s.inputSlug} 
                />
            </div>

            <textarea 
                placeholder="Scrivi qui il contenuto..." 
                value={form.content} 
                onChange={e=>setForm({...form, content: e.target.value})} 
                style={s.area} 
            />

            <button onClick={save} style={s.btnSave}>
                {id ? 'AGGIORNA MODIFICHE' : 'SALVA PAGINA'}
            </button>
        </div>
    );
};

// --- VISTA PAGINA PUBBLICA (Versione Corretta) ---
const PageView = ({ theme }) => {
    const { slug } = useParams(); // Prende "chi-siamo" dall'URL
    const t = themeColors[theme];
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        setLoading(true);
        // NOTA: Ora usiamo la rotta specifica '/api/pages/slug/...'
        axios.get(`https://murthnews-api.onrender.com/api/pages/slug/${slug}`)
            .then(res => {
                setPage(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Errore visualizzazione:", err);
                setError(true);
                setLoading(false);
            });
    }, [slug]);

    // Schermata di caricamento
    if (loading) return <div style={{padding:'50px', textAlign:'center', color:t.text}}>Caricamento pagina...</div>;

    // Schermata 404 (Pagina non trovata)
    if (error || !page) return (
        <div style={{padding:'80px 20px', textAlign:'center', color:t.text}}>
            <h1 style={{fontSize:'50px', margin:0}}>404</h1>
            <p style={{color:t.textSec, fontSize:'20px'}}>Pagina non trovata.</p>
            <button onClick={() => window.history.back()} style={{marginTop:'20px', padding:'10px 20px', cursor:'pointer'}}>Torna Indietro</button>
        </div>
    );

    // PAGINA TROVATA
    return (
        <div style={{maxWidth: '800px', margin: '0 auto', padding: '60px 20px', color: t.text, fontFamily: 'Georgia, serif'}}>
            {/* Titolo */}
            <h1 style={{
                fontSize: '48px', 
                fontWeight: '900', 
                marginBottom: '30px', 
                borderBottom: `4px solid ${t.active}`, 
                paddingBottom: '20px',
                fontFamily: '-apple-system, sans-serif'
            }}>
                {page.title}
            </h1>

            {/* Contenuto */}
            <div style={{
                fontSize: '20px', 
                lineHeight: '1.8', 
                whiteSpace: 'pre-wrap' // Mantiene gli a capo
            }}>
                {page.content}
            </div>
        </div>
    );
};

// --- LAYOUT INTELLIGENTE V19 (Con Switch Menu Redazione/Lettori) ---
const Layout = ({ user, setUser, onLogout, theme, toggleTheme, children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const t = themeColors[theme];
  const userPhoto = user.profileImage || user.foto;
  
  // STATI
  const [siteName, setSiteName] = useState("MurthEditor");
  const [hasActiveBreaking, setHasActiveBreaking] = useState(false);
  
  // 🔥 NUOVO STATO: Gestisce quale menu mostrare ('main' o 'readers')
  const [menuMode, setMenuMode] = useState('main'); 

  const isEditorPage = location.pathname.startsWith('/write-news') || location.pathname.startsWith('/edit-news');

  // AUTO-REFRESH (Mantenuto identico)
  useEffect(() => {
      axios.get('https://murthnews-api.onrender.com/api/settings')
           .then(res => { if (res.data && res.data.siteName) setSiteName(res.data.siteName); })
           .catch(err => console.log("Errore settings"));

      const checkUpdates = async () => {
          try {
              if (!isEditorPage) {
                  const res = await axios.get('https://murthnews-api.onrender.com/api/breaking');
                  const now = Date.now();
                  const activeOnes = res.data.filter(a => (now - new Date(a.createdAt).getTime()) < 3600000);
                  setHasActiveBreaking(activeOnes.length > 0);
              }
              if (user && user._id) {
                  const userRes = await axios.get(`https://murthnews-api.onrender.com/api/users/${user._id}`);
                  const freshUser = userRes.data;
                  if (freshUser.hasMediaAccess !== user.hasMediaAccess || freshUser.pendingMediaRequest !== user.pendingMediaRequest) {
                      setUser(freshUser);
                      localStorage.setItem('cms_user', JSON.stringify(freshUser));
                  }
              }
          } catch(e){}
      };
      checkUpdates(); 
      const interval = setInterval(checkUpdates, 10000); 
      return () => clearInterval(interval);
  }, [isEditorPage, user, setUser]);

  if (isEditorPage) {
      return <div style={{ background: t.bg, minHeight: '100vh', width: '100%', fontFamily: '-apple-system, sans-serif' }}>{children}</div>;
  }

  const styles = {
    wrapper: { display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: '-apple-system, sans-serif', background: t.bg, color: t.text },
    header: { height: '60px', background: t.card, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', position: 'sticky', top: 0, zIndex: 50 },
    brand: { fontSize: '20px', fontWeight: '900', color: t.text, display: 'flex', alignItems: 'center', gap: '10px' },
    externalBtn: { marginLeft: '30px', textDecoration: 'none', border: `1px solid ${t.active}`, color: t.active, padding: '6px 15px', borderRadius: '8px', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px', background: theme === 'light' ? '#f0fdf4' : 'rgba(34, 197, 94, 0.1)', transition: 'all 0.2s' },
    body: { display: 'flex', flex: 1, overflow: 'hidden' }, 
    headerBtn: { marginLeft: '15px', textDecoration: 'none', background: theme === 'light' ? '#f1f5f9' : '#1e293b', padding: '8px 20px', borderRadius: '30px', color: t.text, fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', border: `1px solid ${t.border}`, transition: 'transform 0.2s', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
    sidebar: { width: '260px', background: t.card, borderRight: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 },
    navLinks: { padding: '20px', flex: 1, overflowY: 'auto' },
    userBox: { padding: '20px', borderTop: `1px solid ${t.border}`, background: theme === 'light' ? '#f8fafc' : '#0f172a' },
    userHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' },
    userAvatar: { width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${t.border}` },
    userInfo: { flex: 1, minWidth: 0 },
    userName: { fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: t.text },
    userRole: { fontSize: '11px', color: t.textSec, fontWeight: '700', textTransform: 'uppercase' },
    actionsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
    actionBtn: { padding: '8px', borderRadius: '8px', border: `1px solid ${t.border}`, background: t.card, color: t.text, cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', transition: 'background 0.2s' },
    logoutBtn: { padding: '8px', borderRadius: '8px', border: 'none', background: '#fee2e2', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    iconBtn: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '4px', opacity: 0.8, transition: 'opacity 0.2s' },
    
    menuSection: { fontSize: '11px', textTransform: 'uppercase', color: t.textSec, fontWeight: '700', margin: '25px 0 10px 10px' },
    link: { display: 'flex', alignItems: 'center', padding: '10px 15px', borderRadius: '8px', color: t.textSec, textDecoration: 'none', fontSize: '14px', fontWeight: '500', marginBottom: '4px', position: 'relative' },
    activeLink: { background: t.active, color: t.activeText },
    content: { flex: 1, padding: '40px', overflowY: 'auto' },
    breakingBadge: { width:'12px', height:'12px', background:'red', borderRadius:'50%', marginLeft:'auto', boxShadow:'0 0 10px red', animation:'pulse 1s infinite' },
    timerBadge: { fontSize:'11px', fontWeight:'800', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '10px', border: '1px solid #166534', minWidth: '40px', textAlign:'center' },

    // 🔥 STILE BOTTONE SWITCH MENU
    switchBtn: (color) => ({
        width:'100%', padding:'12px', marginTop:'20px', borderRadius:'10px', border:'none',
        background: color, color:'#fff', fontWeight:'bold', cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
        boxShadow:'0 4px 10px rgba(0,0,0,0.15)', transition:'transform 0.2s'
    })
  };

  const getLinkStyle = (path) => location.pathname === path ? {...styles.link, ...styles.activeLink} : styles.link;

  return (
    <div style={styles.wrapper}>
      <style>{`@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }`}</style>
      
      <header style={styles.header}>
        <div style={styles.brand}><span>⚡</span> {siteName}</div>
        <div style={{flex: 1}}></div> 
        <OnlineTicker theme={theme} />
        <Link to="/ai-assistant" style={{textDecoration:'none', marginRight:'15px', width:'40px', height:'40px', borderRadius:'50%', background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', boxShadow:'0 4px 10px rgba(139, 92, 246, 0.4)', transition: 'transform 0.2s', border: '2px solid rgba(255,255,255,0.2)'}}>🤖</Link>
        <NotificationCenter user={user} theme={theme} />
        <Link to="/mail" style={styles.headerBtn}><span style={{fontSize:'18px'}}>📧</span> WebMail</Link>
      </header>

      <div style={styles.body}>
        <aside style={styles.sidebar}>
          <div style={styles.navLinks}>
              
              {/* --- MENU 1: REDAZIONE (Standard) --- */}
              {menuMode === 'main' && (
                  <>
                      <div style={styles.menuSection}>Redazione</div>
                      <Link to="/" style={getLinkStyle('/')}>📰 Dashboard</Link>
                      <Link to="/breaking" style={getLinkStyle('/breaking')}>
                          ⚡ Regia Ultim'ora {hasActiveBreaking && <div style={styles.breakingBadge}></div>}
                      </Link>

<Link to="/live" style={getLinkStyle('/live')}>
                          🔴 Gestione Live
                      </Link>

                      {/* Logica Media Gallery */}
                      {(() => {
                          let timeLeft = 0;
                          if (user.mediaAccessExpiresAt) {
                              const diff = new Date(user.mediaAccessExpiresAt) - new Date();
                              timeLeft = Math.ceil(diff / (1000 * 60 * 60)); 
                          }
                          const hasAccess = user.role === 'Redattore' || user.role === 'Grafico' || (user.hasMediaAccess && timeLeft > 0);
                          const isPending = user.pendingMediaRequest;
                          const handleLockedClick = async (e) => {
                              e.preventDefault();
                              if (isPending) { alert("⏳ Richiesta già inviata. Attendi l'approvazione."); } 
                              else { 
                                  if(confirm("🔒 Galleria riservata.\n\nVuoi inviare una richiesta al Redattore per sbloccarla per 24 ore?")) { 
                                      try { 
                                          await axios.post('https://murthnews-api.onrender.com/api/media/request', { userId: user._id }); 
                                          alert("📨 Richiesta inviata! Attendi che un redattore ti abiliti."); 
                                          const fresh = await axios.get(`https://murthnews-api.onrender.com/api/users/${user._id}`);
                                          setUser(fresh.data);
                                      } catch(e) {} 
                                  } 
                              }
                          };
                          return (
                              <Link to={hasAccess ? "/media" : "#"} onClick={!hasAccess ? handleLockedClick : undefined} style={{...getLinkStyle('/media'), opacity: hasAccess ? 1 : 0.7, cursor: hasAccess ? 'pointer' : 'not-allowed'}}>
                                  <div style={{display:'flex', justifyContent:'space-between', width:'100%', alignItems:'center'}}>
                                      <span>🖼️ Media Gallery</span>
                                      {user.role!=='Redattore' && user.role!=='Grafico' && hasAccess ? <span style={styles.timerBadge}>🔓 {timeLeft}h</span> : (hasAccess ? null : <span style={{fontSize:'14px'}}>{isPending ? '⏳' : '🔒'}</span>)}
                                  </div>
                              </Link>
                          );
                      })()}
                      
                      <Link to="/write-news" style={getLinkStyle('/write-news')}>✏️ Scrivi News</Link>
                      <Link to="/news-list" style={getLinkStyle('/news-list')}>🗂️ Lista Articoli</Link>
                      <Link to="/categories" style={getLinkStyle('/categories')}>🏷️ Categorie</Link>
                      <Link to="/pages" style={getLinkStyle('/pages')}>📑 Pagine Statiche</Link>

                      {user.role === 'Redattore' && (
                        <>
                          <div style={{...styles.menuSection, color: 'red', marginTop: 30}}>ADMIN</div>
                          <Link to="/settings" style={getLinkStyle('/settings')}>⚙️ Impostazioni</Link>
                          <Link to="/logs" style={getLinkStyle('/logs')}>🕵️‍♂️ Registro Attività</Link>
                          <Link to="/users" style={getLinkStyle('/users')}>👥 Utenti</Link>
                          <Link to="/users/create" style={getLinkStyle('/users/create')}>➕ Crea Utente</Link>
                          
                          {/* 🔥 TASTO PER PASSARE AL MENU LETTORI 🔥 */}
                          <button onClick={() => setMenuMode('readers')} style={styles.switchBtn('#8b5cf6')}>
                              <span>👥</span> GESTIONE LETTORI
                          </button>
                        </>
                      )}
                  </>
              )}

              {/* --- MENU 2: GESTIONE LETTORI (Nuovo) --- */}
              {menuMode === 'readers' && (
                  <div style={{animation: 'fadeIn 0.3s ease'}}>
                      <div style={{...styles.menuSection, color: '#8b5cf6', fontSize:'13px'}}>AREA LETTORI</div>
                      
                      <Link to="/readers/logs" style={getLinkStyle('/readers/logs')}>📜 Log Utenti</Link>
                      <Link to="/readers/email" style={getLinkStyle('/readers/email')}>📧 Invia Email</Link>
                      <Link to="/readers/subs" style={getLinkStyle('/readers/subs')}>📈 Andamento Abb.</Link>
                      <Link to="/readers/revenue" style={getLinkStyle('/readers/revenue')}>💰 Guadagni</Link>

                      {/* 🔥 TASTO PER TORNARE INDIETRO 🔥 */}
                      <button onClick={() => setMenuMode('main')} style={styles.switchBtn('#3b82f6')}>
                          <span>←</span> TORNA A REDAZIONE
                      </button>
                  </div>
              )}

          </div>

          <div style={styles.userBox}>
              <div style={styles.userHeader}>
                  {userPhoto ? <img src={userPhoto} style={styles.userAvatar} alt="Profile" /> : <div style={{...styles.userAvatar, background: t.active, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold'}}>{user.nome.charAt(0)}</div>}
                  <div style={styles.userInfo}>
                      <div style={styles.userName}>{user.nome}</div>
                      <div style={styles.userRole}>{user.role}</div>
                  </div>
                  <button onClick={toggleTheme} style={styles.iconBtn}>{theme === 'light' ? '🌙' : '☀️'}</button>
              </div>
              <div style={styles.actionsRow}>
                  <button style={styles.actionBtn} onClick={() => navigate(`/users/edit/${user._id}`)}>⚙️ Profilo</button>
                  <button style={styles.logoutBtn} onClick={onLogout}>Esci</button>
              </div>
          </div>
        </aside>
        <main style={styles.content}>{children}</main>
      </div>
    </div>
  );
};

// --- WIDGET METEO DINAMICO (Legge da Settings) ---
const WeatherWidget = ({ theme }) => {
  const [weather, setWeather] = useState(null);
  // Stato per memorizzare il nome della città scaricato dal DB
  const [location, setLocation] = useState({ city: 'Caricamento...', lat: null, lon: null });
  const t = themeColors[theme];

  useEffect(() => {
    const getData = async () => {
        try {
            // 1. Chiede al server: "Quali sono le impostazioni?"
            const settingsRes = await axios.get('https://murthnews-api.onrender.com/api/settings');
            const { weatherCity, weatherLat, weatherLon } = settingsRes.data;
            
            // Aggiorna lo stato locale con i dati ricevuti
            setLocation({ city: weatherCity, lat: weatherLat, lon: weatherLon });

            // 2. Chiede a Open-Meteo il tempo per QUELLE coordinate specifiche
            if (weatherLat && weatherLon) {
                const meteoRes = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${weatherLat}&longitude=${weatherLon}&current_weather=true`);
                setWeather(meteoRes.data.current_weather);
            }
        } catch (err) { console.error(err); }
    };
    getData();
  }, []);

  if (!weather) return <div style={{fontSize:'12px', opacity:0.5, paddingRight:'20px'}}>...</div>;

  const wCodes = { 0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 51: '🌧️', 61: '☔', 71: '❄️', 95: '⛈️' };
  const icon = wCodes[weather.weathercode] || '🌡️';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      color: t.text, paddingRight: '25px', borderRight: `1px solid ${t.border}`
    }}>
      <div style={{fontSize:'34px', lineHeight: 1}}>{icon}</div>
      <div style={{textAlign: 'left'}}>
        {/* Qui appare il nome della città salvato nelle impostazioni (es. MILANO) */}
        <div style={{fontSize:'10px', fontWeight:'bold', color: t.textSec, textTransform:'uppercase', letterSpacing:'1px', maxWidth:'100px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
            {location.city}
        </div>
        <div style={{fontSize:'22px', fontWeight:'900', lineHeight: 1}}>{weather.temperature}°</div>
      </div>
    </div>
  );
};

// --- DASHBOARD V17 (Supporto Sfondo Immagine) ---
const Dashboard = ({ user, theme }) => {
  const navigate = useNavigate();
  const t = themeColors[theme];

  // Stati Dati
  const [news, setNews] = useState([]);
  const [messages, setMessages] = useState([]);
  
  // STATI ASPETTO
  const [dashColor, setDashColor] = useState("linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)");
  const [dashImage, setDashImage] = useState(""); // Nuovo stato immagine

  // Stati Ricerca
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('news');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [note, setNote] = useState(localStorage.getItem('dashboard_note_' + user.username) || '');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchData();
    // SCARICA SETTINGS (Colore e Immagine)
    axios.get('https://murthnews-api.onrender.com/api/settings')
         .then(res => {
             if (res.data) {
                 if(res.data.dashboardColor) setDashColor(res.data.dashboardColor);
                 if(res.data.dashboardImage) setDashImage(res.data.dashboardImage);
             }
         })
         .catch(err => console.log("Uso default"));

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [user.username]);

  const fetchData = () => {
    axios.get('https://murthnews-api.onrender.com/api/news').then(res => setNews(res.data));
    axios.get('https://murthnews-api.onrender.com/api/messages', { params: { username: user.username } }).then(res => setMessages(res.data));
  };

  const handleNoteChange = (e) => {
    const text = e.target.value;
    setNote(text);
    localStorage.setItem('dashboard_note_' + user.username, text);
  };

  const handleOpenNews = (article) => {
      const isEditable = user.role === 'Redattore' || article.author === user.username;
      navigate(isEditable ? `/edit-news/${article._id}` : `/read-news/${article._id}`);
  };

  const handleSearch = async (e) => {
      e.preventDefault();
      if(!searchQuery.trim()) return;
      setIsSearching(true);
      try {
          let results = [];
          if (searchType === 'news') {
              const res = await axios.get('https://murthnews-api.onrender.com/api/search/news', { params: { q: searchQuery } });
              results = res.data.map(n => ({ ...n, type: 'news' }));
          } else {
              const res = await axios.get('https://murthnews-api.onrender.com/api/search/users', { params: { q: searchQuery } });
              results = res.data.map(u => ({ ...u, type: 'user' }));
          }
          setSearchResults(results.slice(0, 4));
          setHasSearched(true);
      } catch(err) { console.error(err); } 
      finally { setIsSearching(false); }
  };

  const handleClearSearch = () => {
      setSearchQuery('');
      setSearchResults([]);
      setHasSearched(false);
  };

  // Calcoli stats...
  const now = new Date();
  const stats = {
    today: news.filter(n => new Date(n.createdAt).toDateString() === now.toDateString()).length,
    week: news.filter(n => (now - new Date(n.createdAt)) / (1000 * 60 * 60 * 24) < 7).length,
    month: news.filter(n => (now - new Date(n.createdAt)) / (1000 * 60 * 60 * 24) < 30).length
  };
  const maxVal = Math.max(stats.today, stats.week, stats.month, 5);
  const myDrafts = news.filter(n => n.author === user.username && n.status === 'Bozza');
  const latestPublished = news.filter(n => n.status === 'Pubblicato').slice(0, 4);
  const isRedattore = user.role === 'Redattore';
  const [isLocked, setIsLocked] = useState(false);
  const [lockedByUser, setLockedByUser] = useState('');
  const pendingReviews = news.filter(n => n.status === 'In Revisione');
  const reviewsCount = pendingReviews.length;
  const systemNotifications = messages.filter(m => m.recipient === user.username && !m.read && m.text.startsWith('##SISTEMA##'));
  const notificationsCount = systemNotifications.length;
  const widgetCount = isRedattore ? reviewsCount : notificationsCount;
  const isWidgetActive = widgetCount > 0;
  const widgetLabel = isRedattore ? "DA REVISIONARE" : "ESITI REVISIONE";
  const widgetLink = isRedattore ? '/reviews' : '/notifications';

  const s = {
    container: { maxWidth: '1200px', margin: '0 auto', paddingBottom:'100px', fontFamily: '-apple-system, sans-serif' },
    
    // HEADER DINAMICO: Se c'è immagine usa url(), altrimenti usa gradiente
    headerBox: { 
        marginBottom:'40px', padding:'40px', 
        background: dashImage ? `url(${dashImage})` : dashColor,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius:'30px', color:'#fff', 
        boxShadow: '0 20px 50px -10px rgba(0,0,0,0.3)', 
        position:'relative', overflow:'hidden',
        transition: 'all 0.5s ease'
    },
    
    // OVERLAY SCURO (Solo se c'è immagine)
    darkOverlay: {
        position: 'absolute', inset: 0, 
        background: 'rgba(0,0,0,0.4)', // Velo nero al 40%
        zIndex: 2 // Sopra l'immagine, sotto il contenuto
    },

    // Le bolle si vedono solo col gradiente
    blob1: { position: 'absolute', top: '-10%', left: '-5%', width: '300px', height: '300px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '50%', filter: 'blur(40px)', animation: 'float1 10s infinite alternate ease-in-out', zIndex: 1, display: dashImage ? 'none' : 'block' },
    blob2: { position: 'absolute', bottom: '-20%', right: '-10%', width: '400px', height: '400px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '50%', filter: 'blur(50px)', animation: 'float2 15s infinite alternate ease-in-out', zIndex: 1, display: dashImage ? 'none' : 'block' },
    blob3: { position: 'absolute', top: '40%', left: '40%', width: '150px', height: '150px', background: 'rgba(255, 255, 255, 0.15)', borderRadius: '50%', filter: 'blur(30px)', animation: 'float3 12s infinite alternate ease-in-out', zIndex: 1, display: dashImage ? 'none' : 'block' },

    heroContent: { position:'relative', zIndex: 10 },
    heroTopRow: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px' },
    welcome: { fontSize: '42px', fontWeight: '900', margin: 0, letterSpacing: '-1.5px', textShadow: '0 2px 10px rgba(0,0,0,0.3)' },
    subWelcome: { fontSize: '18px', opacity: 0.9, marginTop: '5px', fontWeight:'500', textShadow: '0 1px 5px rgba(0,0,0,0.3)' },
    
    // Resto stili uguali...
    widgetPill: { display:'flex', alignItems:'center', gap:'20px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(15px)', padding:'10px 25px', borderRadius:'20px', border:'1px solid rgba(255,255,255,0.2)', boxShadow:'0 4px 15px rgba(0,0,0,0.05)' },
    searchRow: { display:'flex', flexDirection:'column', alignItems:'center', marginTop:'10px' },
    searchPill: { display:'inline-flex', alignItems:'center', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(20px)', padding:'8px', borderRadius:'100px', border: '1px solid rgba(255,255,255,0.3)', width:'100%', maxWidth:'600px', transition:'all 0.3s', boxShadow:'0 8px 32px rgba(0,0,0,0.1)' },
    searchInput: { flex:1, border:'none', outline:'none', background:'transparent', padding:'15px 20px', fontSize:'18px', color:'#fff', fontWeight:'600', placeholderColor:'rgba(255,255,255,0.7)' },
    searchBtn: { width:'50px', height:'50px', borderRadius:'50%', background: '#fff', color: '#4f46e5', border:'none', cursor:'pointer', fontSize:'20px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 5px 15px rgba(0,0,0,0.1)' },
    clearBtn: { background:'transparent', border:'none', color:'rgba(255,255,255,0.8)', fontSize:'20px', cursor:'pointer', padding:'0 15px', fontWeight:'bold' },
    toggleRow: { display:'flex', gap:'15px', marginTop:'20px' },
    toggleOption: (active) => ({ cursor:'pointer', fontSize:'12px', fontWeight:'bold', padding:'6px 16px', borderRadius:'20px', background: active ? '#fff' : 'rgba(255,255,255,0.1)', color: active ? '#4f46e5' : '#fff', transition:'all 0.2s', border: active ? 'none' : '1px solid rgba(255,255,255,0.2)' }),
    actionsGrid: { display:'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap:'25px', marginBottom: '50px' },
    glassBtn: { padding: '25px', borderRadius: '24px', border: theme==='light' ? '1px solid rgba(0,0,0,0.05)' : '1px solid rgba(255,255,255,0.1)', background: theme==='light' ? 'rgba(255,255,255,0.6)' : 'rgba(30,41,59,0.4)', backdropFilter: 'blur(20px)', color: t.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '20px', transition: 'transform 0.2s ease, background 0.2s', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' },
    reviewWidget: { padding: '25px', borderRadius: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '20px', background: isWidgetActive ? '#fef2f2' : (theme==='light' ? 'rgba(255,255,255,0.6)' : 'rgba(30,41,59,0.4)'), border: isWidgetActive ? '2px solid #ef4444' : (theme==='light' ? '1px solid rgba(0,0,0,0.05)' : '1px solid rgba(255,255,255,0.1)'), animation: isWidgetActive ? 'pulse-red 2s infinite' : 'none', color: isWidgetActive ? '#b91c1c' : t.textSec },
    btnIconBox: (c) => ({ width:'50px', height:'50px', borderRadius:'15px', background: c+'20', color: c, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px' }),
    mainGrid: { display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '30px', marginBottom: '60px' },
    glassCard: { background: theme==='light' ? 'rgba(255,255,255,0.5)' : 'rgba(30,41,59,0.3)', backdropFilter: 'blur(20px)', borderRadius: '30px', padding: '30px', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.05)', border: theme==='light' ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)', height:'100%', display:'flex', flexDirection:'column' },
    cardTitle: { margin: '0 0 30px 0', fontSize: '16px', fontWeight: '800', color: t.textSec, letterSpacing:'1px', textTransform:'uppercase', display:'flex', alignItems:'center', gap:'10px' },
    chartContainer: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '200px', flex:1, padding: '0 10px' },
    barCol: { textAlign: 'center', width: '20%', display:'flex', flexDirection:'column', alignItems:'center', gap:'15px', height:'100%', justifyContent:'flex-end' },
    bar: (val, color) => ({ height: `${(val / maxVal) * 100}%`, width: '100%', background: `linear-gradient(to top, ${color}, ${color}80)`, borderRadius: '50px', minHeight: '10px', transition:'height 1s ease' }),
    barVal: { fontSize:'32px', fontWeight:'900', color: t.text, lineHeight:1 },
    noteArea: { width: '100%', height: '150px', padding: '20px', background: theme==='dark'?'rgba(0,0,0,0.2)':'#fff', borderRadius:'20px', color: t.text, border: 'none', fontSize: '15px', resize: 'none', outline: 'none', lineHeight:'1.6', fontFamily:'cursive' },
    minimalItem: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'15px 0', borderBottom: `1px solid ${theme==='light'?'rgba(0,0,0,0.05)':'rgba(255,255,255,0.05)'}`, cursor:'pointer' },
    itemTitle: { fontWeight:'700', color:t.text, fontSize:'15px' },
    itemMeta: { fontSize:'12px', color:t.textSec, fontWeight:'500' }
  };

  return (
    <div style={s.container}>
       <style>{`
         ::placeholder { color: rgba(255,255,255,0.6) !important; opacity: 1; }
         @keyframes slideIn { from { opacity:0; transform:translateY(-20px); } to { opacity:1; transform:translateY(0); } }
         @keyframes pulse-red { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
         @keyframes float1 { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(30px, 40px) scale(1.1); } }
         @keyframes float2 { 0% { transform: translate(0, 0) rotate(0deg); } 100% { transform: translate(-40px, -20px) rotate(10deg); } }
         @keyframes float3 { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(20px, -30px) scale(0.9); } }
       `}</style>

       <div style={s.headerBox}>
          {/* Se c'è l'immagine, metti l'overlay scuro per leggere il testo */}
          {dashImage && <div style={s.darkOverlay}></div>}

          {/* Le bolle si vedono solo se NON c'è immagine */}
          <div style={s.blob1}></div><div style={s.blob2}></div><div style={s.blob3}></div>

          <div style={s.heroContent}>
              <div style={s.heroTopRow}>
                  <div><h1 style={s.welcome}>Ciao, {user.nome}</h1><p style={s.subWelcome}>Il giornale è nelle tue mani.</p></div>
                  <div style={s.widgetPill}>
                     <div style={{transform: 'scale(0.8)', borderRight:'1px solid rgba(255,255,255,0.3)', paddingRight:'20px'}}><WeatherWidget theme={theme} /></div>
                     <div style={{textAlign:'right'}}>
                        <div style={{fontSize:'24px', fontWeight:'900', lineHeight:1}}>{currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        <div style={{fontSize:'11px', textTransform:'uppercase', fontWeight:'700', opacity:0.8}}>{currentTime.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                     </div>
                  </div>
              </div>

              <div style={s.searchRow}>
                  <form onSubmit={handleSearch} style={{width:'100%', display:'flex', justifyContent:'center'}}>
                      <div style={s.searchPill}>
                          <div style={{paddingLeft:'20px', fontSize:'20px'}}>🔍</div>
                          <input style={s.searchInput} placeholder="Cerca..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                          
                          {(searchQuery || hasSearched) && (
                              <button type="button" onClick={handleClearSearch} style={s.clearBtn}>✕</button>
                          )}

                          <button type="submit" style={s.searchBtn}>→</button>
                      </div>
                  </form>
                  <div style={s.toggleRow}>
                      <div onClick={()=>setSearchType('news')} style={s.toggleOption(searchType==='news')}>ARTICOLI</div>
                      <div onClick={()=>setSearchType('users')} style={s.toggleOption(searchType==='users')}>UTENTI</div>
                  </div>
              </div>
          </div>
       </div>

       {hasSearched && (
            <div style={{marginBottom:'50px', ...s.glassCard}}>
                <div style={{...s.cardTitle, justifyContent:'space-between'}}>
                    <span>Risultati {searchType === 'news' ? 'Articoli' : 'Utenti'}</span>
                    <button onClick={handleClearSearch} style={{background:'transparent', border:'none', color:'#ef4444', fontWeight:'bold', cursor:'pointer'}}>CHIUDI ✕</button>
                </div>
                
                {searchResults.length === 0 ? (
                    <div style={{padding:'20px', textAlign:'center', color:t.textSec}}>Nessun risultato trovato.</div>
                ) : (
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                        {searchResults.map(r => (
                            <div key={r._id} style={s.minimalItem} 
                                onClick={() => r.type === 'news' ? handleOpenNews(r) : navigate(`/users/profile/${r._id}`)}
                            >
                                <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                                    <div style={{fontSize:'24px'}}>{r.type==='news' ? '📄' : '👤'}</div>
                                    <div>
                                        <div style={s.itemTitle}>{r.type==='news' ? r.title : r.nome + ' ' + r.cognome}</div>
                                        <div style={s.itemMeta}>{r.type==='news' ? 'Articolo' : 'Utente'}</div>
                                    </div>
                                </div>
                                <div style={{fontSize:'18px', opacity:0.5}}>→</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
       )}

       <div style={s.actionsGrid}>
           <div style={s.glassBtn} onClick={() => navigate('/write-news')} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.02)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
               <div style={s.btnIconBox('#10b981')}>✏️</div>
               <div><div style={{fontWeight:'800', fontSize:'16px'}}>Scrivi</div><div style={{fontSize:'12px', opacity:0.6}}>Nuovo Articolo</div></div>
           </div>
           <div style={s.glassBtn} onClick={() => navigate('/categories')} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.02)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
               <div style={s.btnIconBox('#f59e0b')}>🏷️</div>
               <div><div style={{fontWeight:'800', fontSize:'16px'}}>Categorie</div><div style={{fontSize:'12px', opacity:0.6}}>Gestisci Tag</div></div>
           </div>
           <div style={s.reviewWidget} onClick={() => navigate(widgetLink)}>
               <div style={s.btnIconBox(isWidgetActive ? '#ef4444' : '#64748b')}>{isWidgetActive ? '🔔' : '📫'}</div>
               <div>
                   <div style={{fontWeight:'900', fontSize:'28px', color: isWidgetActive ? '#ef4444' : t.text, lineHeight:1}}>{widgetCount}</div>
                   <div style={{fontSize:'11px', textTransform:'uppercase', fontWeight:'bold', marginTop:'5px'}}>{widgetLabel}</div>
               </div>
           </div>
       </div>

       <div style={s.mainGrid}>
          <div style={s.glassCard}>
              <div style={s.cardTitle}>📊 Andamento Produzione</div>
              <div style={s.chartContainer}>
                  <div style={s.barCol}><div style={s.bar(stats.today, '#10b981')}></div><div><div style={s.barVal}>{stats.today}</div><div style={s.itemMeta}>OGGI</div></div></div>
                  <div style={s.barCol}><div style={s.bar(stats.week, '#3b82f6')}></div><div><div style={s.barVal}>{stats.week}</div><div style={s.itemMeta}>SETTIMANA</div></div></div>
                  <div style={s.barCol}><div style={s.bar(stats.month, '#8b5cf6')}></div><div><div style={s.barVal}>{stats.month}</div><div style={s.itemMeta}>MESE</div></div></div>
              </div>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:'25px'}}>
              <div style={{...s.glassCard, flex: 'none', height:'auto'}}>
                  <div style={s.cardTitle}>📝 Blocco Note</div>
                  <textarea style={s.noteArea} placeholder="Appunti rapidi..." value={note} onChange={handleNoteChange} />
              </div>
              <div style={{...s.glassCard, paddingBottom:'10px'}}>
                  <div style={s.cardTitle}>📂 Bozze in lavorazione</div>
                  {myDrafts.length === 0 ? <div style={{fontStyle:'italic', opacity:0.5}}>Tutto pulito.</div> : (
                      <div>{myDrafts.slice(0, 3).map(n => (
                          <div key={n._id} style={s.minimalItem} onClick={() => navigate(`/edit-news/${n._id}`)}>
                             <div style={s.itemTitle}>{n.title}</div>
                             <div style={{fontSize:'18px'}}>✏️</div>
                          </div>
                      ))}</div>
                  )}
              </div>
          </div>
       </div>

       <div style={{...s.glassCard, marginBottom:'60px'}}>
           <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
               <div style={s.cardTitle}><span style={{fontSize:'20px'}}>🚀</span> ULTIMI PUBBLICATI</div>
               <button onClick={()=>navigate('/news-list')} style={{background:'transparent', border:'none', color:t.active, fontWeight:'bold', cursor:'pointer'}}>VEDI TUTTI →</button>
           </div>
           <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'20px'}}>
               {latestPublished.map(n => (
                   <div key={n._id} onClick={() => handleOpenNews(n)} style={{cursor:'pointer'}}>
                       <img src={n.coverImage || 'https://via.placeholder.com/300x150'} style={{width:'100%', height:'140px', objectFit:'cover', borderRadius:'15px', marginBottom:'10px'}} />
                       <div style={{fontWeight:'bold', color:t.text, lineHeight:'1.3', fontSize:'14px'}}>{n.title}</div>
                       <div style={s.itemMeta}>{n.author} • {new Date(n.createdAt).toLocaleDateString()}</div>
                   </div>
               ))}
           </div>
       </div>
    </div>
  );
};

// --- LISTA UTENTI (V4: DEFINITIVA - MEDIA + STOP + NOTIFICHE) ---
const UsersList = ({ theme }) => {
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();
  const t = themeColors[theme];

  // Carica utenti
  const fetchUsers = () => {
      axios.get('https://murthnews-api.onrender.com/api/users').then(res => setUsers(res.data));
  };

  useEffect(() => { fetchUsers(); }, []);

  const deleteUser = async (id) => { 
      if(confirm("Eliminare definitivamente?")) { 
          try { 
              await axios.delete(`https://murthnews-api.onrender.com/api/users/${id}`); 
              setUsers(prev => prev.filter(u => u._id !== id)); 
          } catch (err) { alert("Errore"); }
      }
  };
  
  const toggleBlockUser = async (id, currentStatus) => { 
      try { 
          const newStatus = !currentStatus; 
          await axios.put(`https://murthnews-api.onrender.com/api/users/${id}`, { isBlocked: newStatus }); 
          setUsers(prev => prev.map(u => u._id === id ? { ...u, isBlocked: newStatus } : u)); 
      } catch (err) { alert("Errore"); }
  };

  // --- GESTIONE MEDIA (Il Server invierà la notifica all'utente) ---
  const handleMediaRequest = async (userId, allow) => {
      try {
          // Questa chiamata al server fa tutto: aggiorna DB e crea il Messaggio per la campanella
          await axios.post('https://murthnews-api.onrender.com/api/media/approve', { userId, allow });
          
          if (allow) alert("✅ Accesso concesso (24h). Notifica inviata.");
          else alert("🚫 Accesso negato/revocato. Notifica inviata.");
          
          fetchUsers(); // Aggiorna la lista per vedere il cambio di stato
      } catch (e) { alert("Errore server"); }
  };

  const s = {
    tableWrapper: { width: '100%', overflowX: 'auto', background: t.card, borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    table: { width: '100%', minWidth: '700px', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '12px 15px', background: theme==='dark' ? '#1e293b' : '#f1f5f9', color: t.textSec, fontSize: '12px', textTransform: 'uppercase', borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap' },
    td: { padding: '12px 15px', borderBottom: `1px solid ${t.border}`, color: t.text, whiteSpace: 'nowrap', verticalAlign: 'middle' },
    actionBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', marginRight: '8px', padding: '5px' },
    
    // Badge Giallo (Richiesta In Attesa)
    reqBadge: {
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        background: '#fef3c7', border: '1px solid #f59e0b', color: '#b45309',
        padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold',
        marginLeft: '10px', animation: 'pulse 1.5s infinite'
    },
    // Badge Verde (Accesso Attivo)
    activeBadge: {
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        background: '#dcfce7', border: '1px solid #166534', color: '#166534',
        padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold',
        marginLeft: '10px'
    },
    reqBtn: { border: 'none', cursor: 'pointer', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '10px' }
  };

  return (
    <div>
      <style>{`@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }`}</style>
      
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
        <h1 style={{fontSize:'24px', margin:0, color: t.text}}>Team Redazione</h1>
      </div>
      
      <div style={s.tableWrapper}>
        <table style={s.table}>
          <thead><tr><th style={s.th}>Utente</th><th style={s.th}>Nickname</th><th style={s.th}>Ruolo</th><th style={s.th}>Nome Completo</th><th style={s.th}>Telefono</th><th style={{...s.th, textAlign:'right'}}>Azioni</th></tr></thead>
          <tbody>
            {users.map(u => {
                // Calcolo scadenza (solo visivo per l'admin)
                const now = new Date();
                const expiry = u.mediaAccessExpiresAt ? new Date(u.mediaAccessExpiresAt) : null;
                const isTempActive = u.hasMediaAccess && expiry && expiry > now;
                
                // Ore rimanenti (per tooltip o info)
                const hoursLeft = isTempActive ? Math.ceil((expiry - now) / (1000 * 60 * 60)) : 0;

                return (
                  <tr key={u._id} style={{ opacity: u.isBlocked ? 0.5 : 1, background: u.isBlocked ? (theme==='dark'?'#1f1f1f':'#f1f1f1') : 'transparent' }}>
                    
                    {/* NOME + BADGE DI STATO */}
                    <td style={s.td}>
                        <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                            {u.foto ? <img src={u.foto} style={{width:30, height:30, borderRadius:'50%'}} alt="user"/> : <div style={{width:30, height:30, borderRadius:'50%', background:t.border}}/>}
                            
                            <div>
                                <b>{u.username}</b>
                                {u.isBlocked && <div style={{fontSize:10, color:'red', fontWeight:'bold'}}>BLOCCATO</div>}
                            </div>

                            {/* CASO A: UTENTE VUOLE ENTRARE */}
                            {u.pendingMediaRequest && (
                                <div style={s.reqBadge}>
                                    📷 Richiesta
                                    <button onClick={() => handleMediaRequest(u._id, true)} style={{...s.reqBtn, background:'#10b981', color:'#fff'}}>✅ SI</button>
                                    <button onClick={() => handleMediaRequest(u._id, false)} style={{...s.reqBtn, background:'#ef4444', color:'#fff'}}>❌ NO</button>
                                </div>
                            )}

                            {/* CASO B: UTENTE HA GIÀ IL PERMESSO (Mostra STOP) */}
                            {isTempActive && !u.pendingMediaRequest && (
                                <div style={s.activeBadge}>
                                    🔓 Attivo ({hoursLeft}h)
                                    <button 
                                        onClick={() => { if(confirm("Revocare l'accesso immediatamente?")) handleMediaRequest(u._id, false); }} 
                                        style={{...s.reqBtn, background:'#ef4444', color:'#fff', marginLeft:'5px'}}
                                        title="Revoca accesso ora"
                                    >
                                        ⛔ STOP
                                    </button>
                                </div>
                            )}
                        </div>
                    </td>

                    <td style={s.td}>{u.username}</td>
                    <td style={s.td}><span style={{background: theme==='dark'?'#1e293b':'#f1f5f9', color: t.text, padding:'3px 8px', borderRadius:'12px', fontSize:'12px', fontWeight:'bold', border:`1px solid ${t.border}`}}>{u.role}</span></td>
                    <td style={s.td}>{u.nome} {u.cognome}</td>
                    <td style={s.td}>{u.telefono || '-'}</td>
                    <td style={{...s.td, textAlign:'right'}}>
                        <button onClick={() => navigate(`/users/edit/${u._id}`)} style={s.actionBtn} title="Modifica">✏️</button>
                        <button onClick={() => toggleBlockUser(u._id, u.isBlocked)} style={s.actionBtn} title={u.isBlocked ? "Sblocca" : "Blocca"}>{u.isBlocked ? '🔓' : '🔒'}</button>
                        <button onClick={() => deleteUser(u._id)} style={{...s.actionBtn, color:'#ef4444'}}>🗑️</button>
                    </td>
                  </tr>
                );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// --- CREA UTENTE ---
const UserCreate = ({ theme }) => {
  const navigate = useNavigate();
  const t = themeColors[theme];

  // 1. Inizializziamo entrambi i campi immagine vuoti
  const [form, setForm] = useState({ 
      nome: '', cognome: '', email: '', role: 'Editore', biography: '', 
      foto: '', profileImage: '', // <--- Entrambi presenti
      telefono: '' 
  });
  
  const [loading, setLoading] = useState(false);
  const [hoverPhoto, setHoverPhoto] = useState(false);
  const [hoverBtn, setHoverBtn] = useState(false);

  // 2. Quando carichi il file, aggiorniamo ENTRAMBI i campi
  const handleFile = (e) => {
    const file = e.target.files[0];
    if(file) {
        if (file.size > 50 * 1024 * 1024) { alert("File troppo grande!"); return; }
        const r = new FileReader();
        r.onloadend = () => {
            setForm(prev => ({
                ...prev,
                foto: r.result,          // Legacy
                profileImage: r.result   // Nuovo
            }));
        };
        r.readAsDataURL(file);
    }
  };

  // 3. Invio "Blindato"
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Per sicurezza, prendiamo l'immagine da uno dei due (sono uguali)
      const imgData = form.profileImage || form.foto;

      const payload = {
          ...form,
          foto: imgData,          // Forza salvataggio su foto
          profileImage: imgData   // Forza salvataggio su profileImage
      };

      const res = await axios.post('https://murthnews-api.onrender.com/api/users/create', payload);
      alert(`Utente creato: ${res.data.username}`);
      navigate('/users');
    } catch(err) { 
        alert("Errore creazione."); 
    } finally { 
        setLoading(false); 
    }
  };

  // STILE "OPEN"
  const containerStyle = { width: '100%', maxWidth: '850px', margin: '0 auto', padding: '20px 0' };
  const inputStyle = { width: '100%', padding: '14px', borderRadius: '10px', border: `1px solid ${t.border}`, marginBottom: '20px', background: t.card, color: t.text, outline:'none', fontSize: '15px', transition: 'border 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' };
  const labelStyle = { display: 'block', marginBottom: '8px', color: t.textSec, fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' };
  
  // Anteprima usa uno dei due campi
  const previewImg = form.profileImage || form.foto;
  
  const photoWrapperStyle = { width: '140px', height: '140px', borderRadius: '50%', background: previewImg ? `url(${previewImg}) center/cover` : t.card, border: `3px dashed ${hoverPhoto ? t.active : t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', margin: '0 auto 10px auto', position: 'relative', transition: 'all 0.3s ease', transform: hoverPhoto ? 'scale(1.05)' : 'scale(1)', boxShadow: hoverPhoto ? '0 10px 25px rgba(0,0,0,0.1)' : 'none' };
  const btnStyle = { width: '100%', padding: '16px', background: t.gradient, color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '16px', cursor: loading ? 'wait' : 'pointer', transform: hoverBtn ? 'translateY(-2px)' : 'translateY(0)', boxShadow: hoverBtn ? '0 10px 20px -5px rgba(37, 99, 235, 0.4)' : '0 4px 6px -1px rgba(0,0,0,0.1)', transition: 'all 0.3s ease', marginTop: '20px', letterSpacing: '0.5px' };

  return (
    <div style={{maxWidth: '850px', margin: '0 auto'}}>
        <div style={{marginBottom: '40px', textAlign: 'center'}}>
            <h1 style={{fontSize:'36px', color: t.text, margin: '0 0 10px 0', letterSpacing: '-1px'}}>Aggiungi Talento</h1>
            <p style={{color: t.textSec, margin: 0, fontSize: '16px'}}>Configura il profilo. Le credenziali verranno inviate via email.</p>
        </div>
        <div style={containerStyle}>
            <form onSubmit={handleSubmit}>
                <div style={{textAlign:'center', marginBottom: '50px'}}>
                    <label htmlFor="p-upload" onMouseEnter={()=>setHoverPhoto(true)} onMouseLeave={()=>setHoverPhoto(false)} style={photoWrapperStyle}>
                        {!previewImg && <span style={{fontSize: '30px', color: t.textSec}}>📷</span>}
                        {hoverPhoto && <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.5)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'12px', fontWeight:'bold'}}>Carica</div>}
                    </label>
                    <input id="p-upload" type="file" onChange={handleFile} style={{display:'none'}} accept="image/*" />
                </div>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'30px'}}><div><label style={labelStyle}>Nome</label><input style={inputStyle} value={form.nome} onChange={e=>setForm({...form, nome: e.target.value})} required placeholder="Es. Mario" /></div><div><label style={labelStyle}>Cognome</label><input style={inputStyle} value={form.cognome} onChange={e=>setForm({...form, cognome: e.target.value})} required placeholder="Es. Rossi" /></div></div>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'30px'}}><div><label style={labelStyle}>Email Ufficiale</label><input type="email" style={inputStyle} value={form.email} onChange={e=>setForm({...form, email: e.target.value})} required placeholder="mail@esempio.com" /></div><div><label style={labelStyle}>Telefono</label><input type="tel" style={inputStyle} value={form.telefono} onChange={e=>setForm({...form, telefono: e.target.value})} placeholder="+39..." /></div></div>
                <label style={labelStyle}>Ruolo Piattaforma</label><select style={inputStyle} value={form.role} onChange={e=>setForm({...form, role: e.target.value})}><option>Editore</option><option>Redattore</option><option>Grafico</option></select>
                <label style={labelStyle}>Biografia</label><textarea style={{...inputStyle, height: '120px', resize: 'vertical'}} value={form.biography} onChange={e=>setForm({...form, biography: e.target.value})} placeholder="Breve storia dell'autore..." />
                <button disabled={loading} style={btnStyle} onMouseEnter={()=>setHoverBtn(true)} onMouseLeave={()=>setHoverBtn(false)}>{loading ? 'ELABORAZIONE IN CORSO...' : 'CREA PROFILO & INVIA ACCESSO →'}</button>
            </form>
        </div>
    </div>
  );
};


// --- MODIFICA UTENTE (V3: Minimal - No Box - Foto Fix) ---
const UserEdit = ({ user, theme }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const t = themeColors[theme] || themeColors['light']; 

  const [form, setForm] = useState({
    username: '', password: '', email: '', nome: '', cognome: '',
    role: 'Editore', biography: '', profileImage: '', telefono: ''
  });
  const [loading, setLoading] = useState(false);
  const [hoverPhoto, setHoverPhoto] = useState(false);

  // 1. CARICAMENTO DATI
  useEffect(() => {
    axios.get(`https://murthnews-api.onrender.com/api/users/${id}`)
      .then(res => {
        const data = res.data;
        if (user.role !== 'Redattore' && user._id !== data._id) {
             alert("⛔ Non hai i permessi!");
             navigate('/'); 
             return;
        }
        setForm({ ...data, password: '' });
      })
      .catch(err => console.error(err));
  }, [id, user, navigate]);

  // 2. SALVA
  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      
      await axios.put(`https://murthnews-api.onrender.com/api/users/${id}`, payload);
      alert("✅ Profilo salvato!");
      
      if (user._id === id) window.location.href = '/'; 
      else navigate('/users');
    } catch (err) { alert("Errore: " + err.message); } 
    finally { setLoading(false); }
  };

  // 3. FOTO
  const handlePhoto = (e) => {
      const file = e.target.files[0];
      if(file) {
          const r = new FileReader();
          r.onloadend = () => setForm({...form, profileImage: r.result});
          r.readAsDataURL(file);
      }
  };

  const canChangeRole = user.role === 'Redattore';

  // --- STILI ---
  const s = {
    container: { maxWidth: '800px', margin: '0 auto', paddingBottom: '100px', fontFamily:'-apple-system, sans-serif' },
    
    // Header Minimal
    topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', borderBottom:`1px solid ${t.border}`, paddingBottom:'20px' },
    title: { fontSize: '32px', fontWeight: '900', color: t.text, margin: 0, letterSpacing:'-1px' },
    backBtn: { background: 'transparent', border: `1px solid ${t.textSec}`, padding: '8px 20px', borderRadius: '30px', cursor: 'pointer', color: t.text, fontWeight: 'bold', fontSize:'13px' },

    // Avatar Section (Senza Box)
    avatarSection: { display:'flex', flexDirection:'column', alignItems:'center', marginBottom:'40px' },
    avatarWrapper: { 
        width: '130px', height: '130px', borderRadius: '50%', 
        overflow:'hidden', position:'relative', cursor:'pointer',
        border: `4px solid ${t.card}`, 
        boxShadow: hoverPhoto ? `0 0 0 4px ${t.active}` : '0 10px 20px rgba(0,0,0,0.1)',
        transition: 'all 0.3s ease'
    },
    // Immagine reale (Fix visibilità)
    realImg: { width:'100%', height:'100%', objectFit:'cover' },
    placeholder: { width:'100%', height:'100%', background: t.active, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'40px', fontWeight:'bold' },
    
    // Overlay "Cambia"
    overlay: { position:'absolute', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:'bold', fontSize:'12px', opacity: hoverPhoto ? 1 : 0, transition:'opacity 0.2s' },

    // Form Layout (Inputs fluttuanti)
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom:'25px' },
    
    // Input Style "Solid" per staccare dallo sfondo
    label: { display: 'block', marginBottom: '8px', fontWeight: '800', fontSize: '11px', color: t.textSec, textTransform: 'uppercase', letterSpacing:'0.5px', marginLeft:'5px' },
    input: { 
        width: '100%', padding: '14px 18px', borderRadius: '12px', 
        border: 'none', // Niente bordo, solo sfondo
        background: t.card, // Sfondo bianco/scuro card
        color: t.text, fontSize: '16px', outline: 'none', 
        boxShadow: '0 2px 5px rgba(0,0,0,0.02)', // Ombra leggerissima
        transition:'transform 0.2s'
    },
    textarea: { 
        width: '100%', padding: '14px 18px', borderRadius: '12px', border: 'none', 
        background: t.card, color: t.text, fontSize: '16px', outline: 'none', 
        minHeight:'120px', resize:'vertical', boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
    },

    saveBtn: { 
        width: '100%', padding: '18px', background: t.active, color: '#fff', 
        border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', 
        cursor: 'pointer', marginTop: '30px', boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
        transform: 'scale(1)', transition: 'transform 0.1s'
    }
  };

  return (
    <div style={s.container}>
      
      <div style={s.topRow}>
          <h1 style={s.title}>Modifica Profilo</h1>
          <button onClick={() => navigate(-1)} style={s.backBtn}>Indietro</button>
      </div>
      
      <form onSubmit={handleSave}>
        
        {/* AVATAR UPLOADER */}
        <div style={s.avatarSection}>
            <label 
                style={s.avatarWrapper} 
                onMouseEnter={()=>setHoverPhoto(true)} 
                onMouseLeave={()=>setHoverPhoto(false)}
            >
                <input type="file" onChange={handlePhoto} style={{display:'none'}} accept="image/*" />
                
                {/* LOGICA VISUALIZZAZIONE FOTO MIGLIORATA */}
                {form.profileImage ? (
                    <img src={form.profileImage} style={s.realImg} alt="Profilo" />
                ) : (
                    <div style={s.placeholder}>{form.nome ? form.nome.charAt(0) : '?'}</div>
                )}
                
                <div style={s.overlay}>📷 CAMBIA</div>
            </label>
            <div style={{color:t.textSec, fontSize:'13px', marginTop:'10px'}}>Clicca sulla foto per cambiarla</div>
        </div>

        {/* INPUTS */}
        <div style={s.grid}>
            <div>
                <label style={s.label}>Nome</label>
                <input style={s.input} value={form.nome} onChange={e=>setForm({...form, nome:e.target.value})} required onFocus={e=>e.target.style.transform='scale(1.01)'} onBlur={e=>e.target.style.transform='scale(1)'} />
            </div>
            <div>
                <label style={s.label}>Cognome</label>
                <input style={s.input} value={form.cognome} onChange={e=>setForm({...form, cognome:e.target.value})} required onFocus={e=>e.target.style.transform='scale(1.01)'} onBlur={e=>e.target.style.transform='scale(1)'} />
            </div>
        </div>

        <div style={s.grid}>
            <div>
                <label style={s.label}>Email</label>
                <input style={s.input} value={form.email} onChange={e=>setForm({...form, email:e.target.value})} required />
            </div>
            <div>
                <label style={s.label}>Telefono</label>
                <input style={s.input} value={form.telefono} onChange={e=>setForm({...form, telefono:e.target.value})} placeholder="+39..." />
            </div>
        </div>

        <div style={{marginBottom:'25px'}}>
            <label style={s.label}>Biografia</label>
            <textarea style={s.textarea} value={form.biography} onChange={e=>setForm({...form, biography:e.target.value})} placeholder="Raccontaci qualcosa..." />
        </div>

        <div style={{borderTop:`1px solid ${t.border}`, margin:'40px 0'}}></div>

        <div style={s.grid}>
            <div>
                <label style={s.label}>Username</label>
                <input style={{...s.input, opacity:0.6, cursor:'not-allowed'}} value={form.username} readOnly />
            </div>
            <div>
                <label style={s.label}>Ruolo</label>
                <select 
                    style={{...s.input, opacity: canChangeRole ? 1 : 0.6, cursor: canChangeRole ? 'pointer' : 'not-allowed'}} 
                    value={form.role} 
                    onChange={e=>setForm({...form, role:e.target.value})} 
                    disabled={!canChangeRole}
                >
                    <option>Redattore</option>
                    <option>Editore</option>
                    <option>Grafico</option>
                </select>
            </div>
        </div>

        <div>
            <label style={s.label}>Nuova Password (Opzionale)</label>
            <input 
                style={s.input} 
                type="password" 
                placeholder="Lascia vuoto per mantenere la vecchia..." 
                value={form.password} 
                onChange={e=>setForm({...form, password:e.target.value})} 
            />
        </div>

        <button type="submit" disabled={loading} style={s.saveBtn}>
            {loading ? 'SALVATAGGIO...' : 'AGGIORNA PROFILO'}
        </button>

      </form>
    </div>
  );
};

// --- PAGINA DI LETTURA (V2: CON PAYWALL & SICUREZZA) ---
const ReadNews = ({ user, theme }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const t = themeColors[theme] || themeColors.light;
  const [article, setArticle] = useState(null);

  useEffect(() => {
    axios.get(`https://murthnews-api.onrender.com/api/news/${id}`)
      .then(res => setArticle(res.data))
      .catch(() => alert("Notizia non trovata"));
  }, [id]);

  if (!article) return <div style={{padding:'50px', color:t.text, textAlign:'center'}}>Caricamento...</div>;

  // --- LOGICA SICUREZZA (PAYWALL) ---
  const isPublic = !article.visibility || article.visibility === 'public';
  // L'utente ha accesso se è l'autore, se è Redattore, oppure se l'articolo è pubblico
  const canRead = isPublic || (user && (user.role === 'Redattore' || user.username === article.author));
  
  // Determinare il tipo di blocco per il messaggio
  const lockType = article.visibility === 'private' ? '🔒 CONTENUTO PRIVATO' : (article.visibility === 'paid' ? '💰 ARTICOLO A PAGAMENTO' : '⭐ RISERVATO AGLI ABBONATI');

  const s = {
    container: { maxWidth: '900px', margin: '0 auto', paddingBottom: '100px', fontFamily: 'Georgia, serif' },
    coverBox: { position: 'relative', width: '100%', height: '400px', borderRadius: '0 0 20px 20px', overflow: 'hidden', marginBottom: '40px' },
    cover: { width: '100%', height: '100%', objectFit: 'cover' },
    meta: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: '30px', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)', color: '#fff' },
    tag: { background: t.active, color: '#fff', padding: '5px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px', display: 'inline-block' },
    title: { fontSize: '42px', fontWeight: '900', margin: '0 0 10px 0', lineHeight: '1.1', fontFamily: '-apple-system, sans-serif' },
    subtitle: { fontSize: '20px', fontStyle: 'italic', opacity: 0.9, lineHeight: '1.4' },
    infoRow: { display: 'flex', justifyContent: 'space-between', color: t.textSec, fontSize: '14px', borderBottom: `1px solid ${t.border}`, paddingBottom: '20px', marginBottom: '30px', fontFamily: '-apple-system, sans-serif' },
    
    // Stile Contenuto (Sfocato se bloccato)
    content: { 
        fontSize: '20px', lineHeight: '1.8', color: t.text, whiteSpace: 'pre-line',
        filter: canRead ? 'none' : 'blur(8px)', // SFOCATURA
        userSelect: canRead ? 'auto' : 'none',   // IMPEDISCE COPIA
        opacity: canRead ? 1 : 0.5,
        maxHeight: canRead ? 'none' : '300px',
        overflow: canRead ? 'visible' : 'hidden'
    },

    // Box Paywall
    paywallBox: {
        position: 'relative', marginTop: '-150px', zIndex: 10,
        background: t.card, border: `1px solid ${t.border}`, borderRadius: '20px',
        padding: '40px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
        maxWidth: '600px', margin: '-100px auto 50px auto'
    },
    lockIcon: { fontSize: '50px', marginBottom: '10px' },
    lockTitle: { fontSize: '24px', fontWeight: 'bold', color: t.text, marginBottom: '10px' },
    lockMsg: { color: t.textSec, marginBottom: '25px' },
    lockBtn: { padding: '12px 30px', background: t.active, color: '#fff', border: 'none', borderRadius: '30px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' },

    gallery: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '40px' },
    galImg: { width: '100%', borderRadius: '10px', cursor: 'pointer', transition: 'transform 0.2s' },
    backBtn: { position: 'fixed', bottom: '30px', right: '30px', padding: '15px 30px', background: t.text, color: t.bg, borderRadius: '30px', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 5px 20px rgba(0,0,0,0.3)', zIndex: 100 }
  };

  return (
    <div style={s.container}>
      {/* COPERTINA */}
      <div style={s.coverBox}>
         <img src={article.coverImage || 'https://via.placeholder.com/800x400'} style={s.cover} alt="Cover" />
         <div style={s.meta}>
            <span style={s.tag}>{article.category || 'News'}</span>
            <h1 style={s.title}>{article.title}</h1>
            {article.subtitle && <p style={s.subtitle}>{article.subtitle}</p>}
         </div>
      </div>

      {/* INFO */}
      <div style={s.infoRow}>
          <div>Scritto da <b>{article.author}</b></div>
          <div>{new Date(article.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>

      {/* TESTO (Offuscato se non autorizzato) */}
      <div style={s.content}>
          {article.content}
          {!canRead && "\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua..."} 
      </div>

      {/* BLOCCO PAYWALL */}
      {!canRead && (
          <div style={s.paywallBox}>
              <div style={s.lockIcon}>{article.visibility === 'paid' ? '💰' : '🔒'}</div>
              <div style={s.lockTitle}>{lockType}</div>
              <div style={s.lockMsg}>
                  {article.visibility === 'private' 
                    ? "Questa è una bozza interna o un contenuto privato." 
                    : "Per continuare a leggere questo articolo, devi essere abbonato o acquistarlo."}
              </div>
              {article.visibility !== 'private' && (
                  <button style={s.lockBtn}>Sblocca Accesso</button>
              )}
          </div>
      )}

      {/* GALLERIA (Visibile solo se autorizzato) */}
      {canRead && article.gallery && article.gallery.length > 0 && (
          <div style={s.gallery}>
              {article.gallery.map((img, i) => <img key={i} src={img} style={s.galImg} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.02)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'} alt="Gallery" />)}
          </div>
      )}

      {/* VIDEO (Visibile solo se autorizzato) */}
      {canRead && article.bodyVideo && (
          <div style={{marginTop: '40px', padding:'20px', background:t.card, borderRadius:'10px', border:`1px solid ${t.border}`}}>
              <strong>Video allegato:</strong> <a href={article.bodyVideo} target="_blank" rel="noopener noreferrer" style={{color: t.active, marginLeft:'5px'}}>{article.bodyVideo}</a>
          </div>
      )}

      <button onClick={() => navigate(-1)} style={s.backBtn}>← Torna Indietro</button>
    </div>
  );
};


const WriteNews = ({ user, theme }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const t = themeColors[theme]; 
  const isRedattore = user.role === 'Redattore'; 
  // --- STATI PER IL BLOCCO (MANCAVANO QUESTI) ---
  const [isLocked, setIsLocked] = useState(false);
  const [lockedByUser, setLockedByUser] = useState('');
  // --- STATI NUOVI PER NOTIZIE CORRELATE ---
  const [allNews, setAllNews] = useState([]); 
  const [searchQuery, setSearchQuery] = useState('');

  // --- STATO DEL FORM ---
  const [form, setForm] = useState({
    title: '', subtitle: '', summary: '', content: '',
    isFirstPage: false,
    isSecondPage: false,
    category: '', importance: 'Normale', source: '', location: '',
    coverImage: '', coverCaption: '', coverCredits: '',
    mediaType: 'image', bodyVideo: '',
    tags: '', isAd: false, status: 'Bozza', gallery: [],
    focusKeyword: '', seoTitle: '', seoDescription: '', seoScore: 0,
    comments: [], ogTitle: '', ogDescription: '',
    scheduledAt: '',
    visibility: 'public', // <--- Assicurati che ci sia la virgola qui
    attachedNews: []      // <--- AGGIUNGI QUESTA RIGA
  });

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [viewMode, setViewMode] = useState('desktop'); 
  const [previewMode, setPreviewMode] = useState(false);
  
  // UX States
  const [isSaving, setIsSaving] = useState(false);
  const [seoAnalysis, setSeoAnalysis] = useState({ score: 0, problems: [], good: [] });
  const [validationErrors, setValidationErrors] = useState([]);
  
  // --- STATO NUOVO PER L'IA ---
  const [aiLoading, setAiLoading] = useState(false);

  // Crash & Commenti
  const [crashData, setCrashData] = useState(null);
  const [selectedText, setSelectedText] = useState('');
  const [newComment, setNewComment] = useState('');

  // Refs
  const textareaRef = useRef(null);
  const backdropRef = useRef(null);

  // --- 0. GESTIONE BLOCCO (DEBUG VERSION) ---
  useEffect(() => {
    if (!id || !user) return; 

    const acquireLock = async () => {
        try {
            console.log("🔒 Chiedo il blocco al server per:", user.username); // <--- DEBUG 1

            const res = await axios.post(`https://murthnews-api.onrender.com/api/news/lock/${id}`, { 
                username: user.username || user.nome 
            });

            console.log("📩 Risposta Server:", res.data); // <--- DEBUG 2

            if (res.data.success === false) {
                console.log("⛔ IL SERVER HA DETTO NO! BLOCCATO DA:", res.data.lockedBy); // <--- DEBUG 3
                setIsLocked(true);
                setLockedByUser(res.data.lockedBy);
            } else {
                console.log("✅ IL SERVER HA DETTO SÌ! ENTRO."); // <--- DEBUG 4
                setIsLocked(false);
            }
        } catch (e) { console.error("Errore Lock", e); }
    };

    acquireLock(); 
    const interval = setInterval(acquireLock, 4 * 60 * 1000);

    return () => {
        clearInterval(interval);
        if (user) {
            axios.post(`https://murthnews-api.onrender.com/api/news/unlock/${id}`, { 
                username: user.username || user.nome 
            }).catch(e => {});
        }
    };
  }, [id, user]);

  // 1. INIT DATI
  useEffect(() => {
    if (isLocked) return;
    axios.get('https://murthnews-api.onrender.com/api/categories').then(res => {
        setCategories(res.data);
        if(!id && res.data.length > 0 && !form.category) setForm(f => ({ ...f, category: res.data[0].name }));
    });

    // --- AGGIUNGI QUESTO BLOCCO QUI SOTTO ---
    axios.get('https://murthnews-api.onrender.com/api/news').then(res => {
        // Scarica tutto, ma escludi la notizia che sto modificando ora (se c'è un id)
        const published = res.data.filter(n => n.status === 'Pubblicato' && n._id !== id);
        setAllNews(published);
    });

    const localKey = id ? `autosave_${id}` : 'autosave_new_article';
    const savedLocal = localStorage.getItem(localKey);
    if (savedLocal) {
        const parsed = JSON.parse(savedLocal);
        if (parsed.content && parsed.content.length > 10) setCrashData(parsed);
    }

    if (id) {
        axios.get(`https://murthnews-api.onrender.com/api/news/${id}`).then(res => {
            const article = res.data;
            if (!isRedattore && article.author !== user.username) {
                alert("⛔ Accesso Negato."); navigate('/'); return;
            }
            if(Array.isArray(article.tags)) article.tags = article.tags.join(', ');
            const cleanData = { ...article, comments: article.comments || [] };
            setForm(prev => ({ ...prev, ...cleanData }));
        });
    }
  }, [id, user]);

  // 2. AUTO-SAVE
  useEffect(() => {
    if (isLocked) return;
      const timer = setInterval(() => {
          if (form.title.length > 2) {
              setIsSaving(true);
              const key = id ? `autosave_${id}` : 'autosave_new_article';
              localStorage.setItem(key, JSON.stringify(form));
              setTimeout(() => setIsSaving(false), 1000);
          }
      }, 5000);
      return () => clearInterval(timer);
  }, [form, id]);

  // 3. SEO ENGINE
  useEffect(() => {
      let score = 0, problems = [], good = [];
      const k = form.focusKeyword ? form.focusKeyword.toLowerCase() : '';
      if (!k) problems.push("Definisci una Focus Keyword.");
      else {
          if (form.title.toLowerCase().includes(k)) { score += 20; good.push("Keyword nel Titolo."); }
          if (form.summary.toLowerCase().includes(k)) { score += 10; good.push("Keyword nel Sommario."); }
          if (form.content.toLowerCase().includes(k)) { score += 10; good.push("Keyword nel Testo."); }
      }
      if (form.title.length >= 10 && form.title.length <= 60) score += 15;
      const words = form.content.split(/\s+/).filter(w=>w.length>0).length;
      if (words > 300) score += 20;
      if (form.coverImage) score += 20;
      setSeoAnalysis({ score: Math.min(score, 100), problems, good });
      setForm(f => ({...f, seoScore: Math.min(score, 100)}));
  }, [form.title, form.summary, form.content, form.focusKeyword, form.coverImage]);

  // --- LOGICA EDITOR ---
  const handleScroll = () => {
      if (textareaRef.current && backdropRef.current) {
          backdropRef.current.scrollTop = textareaRef.current.scrollTop;
          backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
      }
  };

  const insertFormat = (tag) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = form.content;
    
    if (start === end) return; 

    const selected = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    const newText = `${before}<${tag}>${selected}</${tag}>${after}`;
    setForm({ ...form, content: newText });
  };

  const renderBackdrop = () => {
      let textHTML = form.content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

      form.comments.forEach(c => {
          if (c.quote && textHTML.includes(c.quote)) {
              const mark = `<mark style="background-color: rgba(255, 230, 0, 0.5); color: transparent; border-radius: 0; padding: 0;">${c.quote}</mark>`;
              textHTML = textHTML.split(c.quote).join(mark);
          }
      });
      
      if (textHTML.endsWith('\n')) {
          textHTML += ' '; 
      }

      return { __html: textHTML };
  };

  const renderPreview = () => {
      let html = form.content.replace(/\n/g, '<br/>');
      return { __html: html };
  };

  // Handlers
  const handleCover = (e) => { const f=e.target.files[0]; if(f){const r=new FileReader(); r.onloadend=()=>setForm({...form, coverImage:r.result}); r.readAsDataURL(f);} };
  const handleGallery = (e) => { Array.from(e.target.files).forEach(f=>{const r=new FileReader(); r.onloadend=()=>setForm(p=>({...p, gallery:[...p.gallery, r.result]})); r.readAsDataURL(f);}) };
  const removeGalleryImage = (i) => setForm(p=>({...p, gallery: p.gallery.filter((_,x)=>x!==i)}));
  const restoreCrash = () => { setForm(crashData); setCrashData(null); alert("✅ Bozza ripristinata!"); };
  const discardCrash = () => { setCrashData(null); localStorage.removeItem(id ? `autosave_${id}` : 'autosave_new_article'); };
  
  // NOTE
  const handleTextSelect = () => { 
      if (!isRedattore) return; 
      const s = window.getSelection().toString(); 
      if(s.length > 2) setSelectedText(s); 
  };
  
  const addComment = () => {
      if (!isRedattore) return; 
      if (!newComment.trim() || !selectedText) return;
      const c = { id: Date.now().toString(), quote: selectedText, text: newComment, author: user.username, date: new Date(), resolved: false };
      setForm(prev => {
          const updated = { ...prev, comments: [...(prev.comments || []), c] };
          const key = id ? `autosave_${id}` : 'autosave_new_article';
          localStorage.setItem(key, JSON.stringify(updated));
          return updated;
      });
      setNewComment(''); setSelectedText('');
  };
  
  const deleteComment = (cId) => {
      if (!isRedattore) return; 
      setForm(prev => ({ ...prev, comments: prev.comments.filter(c => c.id !== cId) }));
  };

// --- FUNZIONI PER NOTIZIE CORRELATE ---
  const addAttachedNews = (newsItem) => {
      if (form.attachedNews.length >= 4) {
          alert("Puoi allegare massimo 4 notizie!");
          return;
      }
      // Evita duplicati
      if (form.attachedNews.find(n => n._id === newsItem._id)) return;
      
      setForm(prev => ({
          ...prev, 
          attachedNews: [...prev.attachedNews, { _id: newsItem._id, title: newsItem.title, slug: newsItem.slug, coverImage: newsItem.coverImage }] 
      }));
      setSearchQuery(''); // Pulisce la ricerca dopo il click
  };

  const removeAttachedNews = (newsId) => {
      setForm(prev => ({
          ...prev,
          attachedNews: prev.attachedNews.filter(n => n._id !== newsId)
      }));
  };

  // --- FUNZIONE GENERAZIONE IA ---
  const generateAITitle = async () => {
    let textBase = form.summary || form.content || form.title;
    // Rimuoviamo tag HTML per non confondere l'IA
    if (textBase) textBase = textBase.replace(/<[^>]*>?/gm, '');

    if (!textBase || textBase.trim().length < 5) {
      alert("Scrivi almeno un titolo abbozzato o un po' di contenuto per dare all'IA qualcosa su cui lavorare!");
      return;
    }

    setAiLoading(true);
    try {
      const res = await axios.post('https://murthnews-api.onrender.com/api/generate-ai-title', {
        draftText: textBase
      });

      if (res.data && res.data.title) {
        setForm(prev => ({ ...prev, title: res.data.title }));
      }
    } catch (err) {
      console.error("Errore IA:", err);
      alert(err.response?.data?.message || "Errore nella generazione del titolo.");
    } finally {
      setAiLoading(false);
    }
  };

  // --- WORKFLOW AGGIORNATO PER PROGRAMMAZIONE ---
  const getMainButtonLabel = () => {
      if (loading) return 'Attendere...';
      
      if (form.visibility === 'private') return '🔒 SALVA PRIVATO';
      
      if (form.scheduledAt && new Date(form.scheduledAt) > new Date()) return '📅 PROGRAMMA'; 
      if (isRedattore) return form.comments.length > 0 ? 'RICHIEDI CORREZIONI' : 'APPROVA E PUBBLICA';
      return form.status === 'Rifiutato' ? 'REINVIA AL REDATTORE' : 'INVIA A REVISIONE';
  };

  const getMainButtonColor = () => {
      if (form.visibility === 'private') return '#4b5563'; // Grigio
      if (form.visibility === 'paid') return '#059669';    // Verde scuro
      if (form.visibility === 'subscribers') return '#9333ea'; // Viola
      if (form.scheduledAt && new Date(form.scheduledAt) > new Date()) return '#8b5cf6'; // Viola
      if (isRedattore) return form.comments.length > 0 ? '#ef4444' : '#22c55e';
      return '#2563eb'; 
  };

  const handleMainAction = () => {
      let finalStatus = 'In Revisione';
      
      if (form.scheduledAt && new Date(form.scheduledAt) > new Date()) {
          finalStatus = 'Programmato';
      } else if (isRedattore) {
          finalStatus = form.comments.length > 0 ? 'Rifiutato' : 'Pubblicato';
      } else {
          finalStatus = 'In Revisione';
      }
      
      validateAndSave(finalStatus);
  };

  const validateAndSave = async (targetStatus) => {
      if (targetStatus === 'Bozza') { save(targetStatus); return; }
      const errors = [];
      if (!form.title.trim()) errors.push("Manca il Titolo");
      if (!form.summary.trim()) errors.push("Manca il Sommario");
      if (!form.content.trim()) errors.push("Testo troppo breve");
      if (!form.coverImage) errors.push("Manca la Copertina");
      if (!form.category) errors.push("Scegli una Categoria");
      
      if (errors.length > 0) { 
        setValidationErrors(errors); 
        setTimeout(() => setValidationErrors([]), 5000);
        return; 
      }
      setValidationErrors([]); save(targetStatus);
  };

  const save = async (forcedStatus) => {
    setLoading(true);
    try {
      const finalAuthor = (id && form.author) ? form.author : user.username;
      
      let statusToSend = forcedStatus;
      const hasDate = form.scheduledAt && form.scheduledAt !== '' && form.scheduledAt !== null;

      if (hasDate) {
          statusToSend = 'Programmato';
      }

      const payload = { 
          ...form, 
          author: finalAuthor, 
          status: statusToSend, 
          comments: form.comments, 
          tags: Array.isArray(form.tags) ? form.tags : form.tags.split(',').map(tag => tag.trim()) 
      };

      if (!hasDate) {
          delete payload.scheduledAt;
          payload.scheduledAt = null; 
          if (statusToSend === 'Programmato') {
              payload.status = 'Bozza';
          }
      }

      if (id) await axios.put(`https://murthnews-api.onrender.com/api/news/${id}`, payload);
      else await axios.post('https://murthnews-api.onrender.com/api/news', payload);
      
      localStorage.removeItem(id ? `autosave_${id}` : 'autosave_new_article');
      navigate('/news-list');
    } catch(err) { 
        console.error("Errore Salvataggio:", err); 
        alert("Errore Server: " + (err.response?.data?.message || err.message)); 
    } 
    finally { setLoading(false); }
  };
  
  // --- ⛔ SCHERMATA BLOCCO (VERSIONE MINIMAL) ⛔ ---
  if (isLocked) {
    return (
        <div style={{
            height: '100vh', width: '100vw',
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            // Sfondo neutro molto elegante (Slate chiaro/scuro)
            background: theme === 'light' ? '#f8fafc' : '#0f172a', 
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            position: 'fixed', top: 0, left: 0, zIndex: 99999
        }}>
            <div style={{
                // Card centrale stile "Dialog"
                background: theme === 'light' ? '#ffffff' : '#1e293b',
                color: theme === 'light' ? '#1e293b' : '#f8fafc',
                padding: '40px', 
                borderRadius: '24px', 
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                textAlign: 'center', 
                maxWidth: '420px', 
                width: '90%',
                border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid #334155'
            }}>
                <div style={{fontSize: '48px', marginBottom: '20px', opacity: 0.8}}>🔒</div>
                
                <h3 style={{fontSize: '22px', fontWeight: '700', margin: '0 0 10px 0'}}>
                    Modifica in corso
                </h3>
                
                <p style={{fontSize: '15px', color: theme === 'light' ? '#64748b' : '#94a3b8', lineHeight: '1.6', marginBottom: '30px'}}>
                    Questo articolo è attualmente aperto da un altro redattore. L'accesso è limitato per evitare conflitti di salvataggio.
                </p>

                {/* Badge Utente Elegante */}
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '10px',
                    background: theme === 'light' ? '#eff6ff' : '#1e3a8a', // Blu molto chiaro
                    color: theme === 'light' ? '#1d4ed8' : '#bfdbfe',
                    padding: '8px 16px', borderRadius: '50px',
                    fontSize: '14px', fontWeight: '600', marginBottom: '35px'
                }}>
                    <span style={{width:'8px', height:'8px', background: theme === 'light' ? '#3b82f6' : '#60a5fa', borderRadius:'50%', display:'inline-block'}}></span>
                    {lockedByUser} ci sta lavorando
                </div>

                <br/>

                <button 
                    onClick={() => navigate('/news-list')}
                    style={{
                        padding: '12px 28px', 
                        cursor: 'pointer', 
                        border: theme === 'light' ? '1px solid #cbd5e1' : '1px solid #475569', 
                        borderRadius: '12px',
                        background: 'transparent',
                        color: 'inherit',
                        fontWeight: '600', 
                        fontSize: '14px',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = theme === 'light' ? '#f1f5f9' : '#334155'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    ← Torna alla lista
                </button>
            </div>
        </div>
    );
  }

  // --- STILI ---
  const s = {
    fullScreen: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: t.bg, color: t.text, zIndex: 99999, overflowY: 'auto', fontFamily: '"Inter", system-ui, sans-serif' },
    
    mainContainer: { maxWidth: '1400px', margin: '0 auto', padding: '0 40px 120px 40px' },
    gridContainer: { display: 'grid', gridTemplateColumns: '72% 25%', gap: '3%', marginTop: '30px' },
    
    topBar: { 
        position: 'sticky', top: 0, zIndex: 100, 
        background: theme === 'dark' ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)', 
        backdropFilter: 'blur(12px)', padding: '15px 40px', borderBottom: `1px solid ${t.border}`, marginBottom: '20px', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },

    mobileFrame: { 
        width: '400px', height: '820px', margin: '40px auto', 
        background: theme === 'dark' ? '#000' : '#fff', border: '14px solid #1a1a1a', 
        borderRadius: '45px', padding: '25px', 
        boxShadow: '0 50px 100px -20px rgba(0,0,0,0.5)', overflowY: 'auto', 
        position: 'relative', display: 'flex', flexDirection: 'column' 
    },
    desktopFrame: { width: '100%' },
    
    headerInputs: { marginBottom: '20px' },
    inputTitle: { width: '100%', border: 'none', background: 'transparent', fontSize: '50px', fontWeight: '800', color: t.text, outline: 'none', lineHeight: '1.1', fontFamily: '"Playfair Display", serif', padding: '10px 0', letterSpacing: '-1px' },
    inputSub: { width: '100%', border: 'none', background: 'transparent', fontSize: '24px', fontWeight:'300', color: t.textSec, outline: 'none', marginBottom: '10px', lineHeight: '1.4' },
    
    editorWrapper: { 
        position: 'relative', 
        minHeight: '600px', height: '600px', 
        marginTop:'0px', 
        cursor: 'text',
        border: '1px solid transparent'
    },
    
    sharedEditorStyle: {
        position: 'absolute', 
        top: 0, left: 0,
        width: '100%', height: '100%', 
        padding: '20px', 
        margin: '0', border: 'none',
        fontSize: '18px', 
        lineHeight: '28px', 
        fontFamily: 'Georgia, "Times New Roman", serif', 
        whiteSpace: 'pre-wrap', 
        overflowWrap: 'break-word',
        boxSizing: 'border-box',
        letterSpacing: 'normal',
        wordSpacing: 'normal',
        overflowY: 'scroll', 
    },
    
    backdrop: { zIndex: 0, pointerEvents: 'none', color: 'transparent', background: 'transparent' },
    textArea: { zIndex: 1, background: 'transparent', color: t.text, outline: 'none', resize: 'none' },
    previewArea: { width: '100%', minHeight: '600px', padding: '20px', fontSize: '18px', lineHeight: '28px', fontFamily: 'Georgia, serif', color: t.text, border: 'none', outline: 'none' },
    areaSummary: { width: '100%', border: 'none', background: 'transparent', fontSize: '20px', fontWeight: '500', color: t.text, outline: 'none', resize: 'none', lineHeight: '1.6', marginBottom: '20px', fontStyle: 'italic', opacity: 0.9 },

    stickySidebar: { position: 'sticky', top: '100px', alignSelf: 'start', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', paddingRight: '5px', display: 'flex', flexDirection: 'column', gap: '20px' },
    sidebarBox: { background: t.card, padding:'20px', borderRadius:'16px', border:`1px solid ${t.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' },
    label: { display:'block', marginBottom:'8px', fontSize:'10px', fontWeight:'800', color: t.textSec, textTransform:'uppercase', letterSpacing:'1.5px' },
    inputStd: { width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${t.border}`, background: t.bg, color: t.text, fontSize: '14px', outline: 'none', transition: 'border 0.2s' },

    commentCard: { background: theme === 'dark' ? '#3f3f46' : '#fff', border: `1px solid ${t.border}`, borderRadius:'12px', marginBottom:'12px', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
    commentHeader: { background: '#f59e0b', padding: '6px 12px', fontSize: '10px', fontWeight: 'bold', color: '#fff', display: 'flex', justifyContent: 'space-between' },
    commentBody: { padding: '10px 12px', fontSize: '13px', fontWeight: '600', color: t.text },

    btnSec: { padding: '10px 24px', borderRadius: '8px', border: `1px solid ${t.border}`, background: 'transparent', color: t.text, cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
    btnPri: { padding: '10px 32px', borderRadius: '30px', border: 'none', background: getMainButtonColor(), color: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '13px', boxShadow: '0 8px 20px -5px rgba(0,0,0,0.2)' },
    
    uploadBox: { border: `2px dashed ${t.border}`, borderRadius: '16px', padding: '30px', textAlign: 'center', cursor: 'pointer', color: t.textSec, display: 'block', background: t.hover },
    previewImg: { width: '100%', height: '220px', objectFit: 'cover', borderRadius: '10px', marginBottom: '10px' },
    galleryThumb: { width: '70px', height: '70px', objectFit: 'cover', borderRadius: '12px', border: `2px solid ${t.border}` },
    
    errorToast: { position: 'fixed', top: '90px', left: '50%', transform: 'translateX(-50%)', background: '#fee2e2', borderLeft: '6px solid #ef4444', color: '#991b1b', padding: '15px 30px', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', zIndex: 200, display: 'flex', alignItems: 'center', gap: '20px', fontWeight: '500' },
    commentPopup: { position:'absolute', top:'-70px', right:0, background: t.card, padding:'8px', borderRadius:'12px', boxShadow:'0 10px 30px rgba(0,0,0,0.2)', display:'flex', gap:'8px', zIndex:50, border: `1px solid ${t.border}` },
    
    toolbar: { display:'flex', gap:'5px', marginBottom:'10px', padding:'8px', background: theme==='dark'?'#1e293b':'#f1f5f9', borderRadius:'8px', border:`1px solid ${t.border}` },
    toolBtn: { fontWeight:'bold', width:'36px', height:'36px', cursor:'pointer', border:`1px solid ${t.border}`, background: t.card, color: t.text, borderRadius:'6px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px' }
  };

  return (
    <div style={s.fullScreen}>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>

      {crashData && (<div style={{background: '#fff7ed', borderBottom: '1px solid #fdba74', color: '#9a3412', padding: '10px', textAlign:'center', fontSize:'14px'}}>⚠️ <strong>Versione non salvata.</strong> <button onClick={restoreCrash} style={{marginLeft:'10px', background:'#c2410c', color:'#fff', border:'none', padding:'5px 10px', borderRadius:'4px', cursor:'pointer'}}>Ripristina</button><button onClick={discardCrash} style={{marginLeft:'10px', background:'transparent', border:'none', textDecoration:'underline', cursor:'pointer'}}>Ignora</button></div>)}

      {validationErrors.length > 0 && (
          <div style={s.errorToast}>
              <div style={{color:'#ef4444', fontSize:'24px'}}>⚠️</div>
              <div>
                  <div style={{fontWeight:'bold', color:'#ef4444', marginBottom:'2px'}}>Attenzione</div>
                  <div style={{color: '#7f1d1d', fontSize:'13px'}}>{validationErrors.join(', ')}</div>
              </div>
              <button onClick={()=>setValidationErrors([])} style={{marginLeft:'20px', border:'none', background:'transparent', fontSize:'18px', cursor:'pointer', color:'#991b1b'}}>✕</button>
          </div>
      )}

      <div style={s.topBar}>
         <div style={{display:'flex', alignItems:'center', gap:'20px'}}>
             <button onClick={()=>navigate('/')} style={{border:'none', background:'transparent', fontSize:'14px', cursor:'pointer', color:t.text, fontWeight:'bold'}}>← DASHBOARD</button>
             <div style={{fontSize:'18px', fontWeight:'900', color:t.text, borderLeft:`1px solid ${t.border}`, paddingLeft:'20px'}}>⚡ MurthEditor</div>
             <div><span style={{fontSize:'12px', fontWeight:'bold', color: t.textSec, marginLeft:'20px', textTransform:'uppercase'}}>{id ? 'MODIFICA' : 'NUOVO'}</span><span style={{fontSize:'10px', marginLeft:'10px', color: isSaving ? '#eab308' : '#22c55e'}}>{isSaving ? 'Salvataggio...' : '✓ Salvato'}</span></div>
         </div>

         <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
             <div style={{background: t.hover, padding:'4px', borderRadius:'20px', display:'flex'}}>
                <button onClick={()=>setViewMode('desktop')} style={{padding:'6px 12px', border:'none', background: viewMode==='desktop' ? t.active : 'transparent', color: viewMode==='desktop'?'#fff':t.textSec, borderRadius:'16px', cursor:'pointer', fontSize:'16px', transition:'0.2s'}}>💻</button>
                <button onClick={()=>setViewMode('mobile')} style={{padding:'6px 12px', border:'none', background: viewMode==='mobile' ? t.active : 'transparent', color: viewMode==='mobile'?'#fff':t.textSec, borderRadius:'16px', cursor:'pointer', fontSize:'16px', transition:'0.2s'}}>📱</button>
             </div>
             <div style={{height:'20px', width:'1px', background: t.border}}></div>
             <button onClick={()=>save('Bozza')} style={s.btnSec}>SALVA BOZZA</button>
             <button onClick={handleMainAction} disabled={loading} style={s.btnPri}>{getMainButtonLabel()}</button>
         </div>
      </div>

      <div style={s.mainContainer}>
        <div style={s.headerInputs}>
            
            {/* NUOVO: TITOLO CON PULSANTE IA */}
            <div style={{display: 'flex', alignItems: 'center', gap: '15px', position: 'relative'}}>
                <input 
                    style={{...s.inputTitle, flexGrow: 1}} 
                    placeholder="Titolo dell'articolo..." 
                    value={form.title} 
                    maxLength={90} 
                    onChange={e=>setForm({...form, title: e.target.value})} 
                />
                
                <button 
                    onClick={generateAITitle}
                    disabled={aiLoading}
                    title="Genera titolo con IA (Scrivi una bozza o un sommario prima)"
                    style={{
                        background: t.active, 
                        color: '#fff',
                        border: 'none',
                        borderRadius: '12px',
                        width: '50px',
                        height: '50px',
                        fontSize: '24px',
                        cursor: aiLoading ? 'wait' : 'pointer',
                        opacity: aiLoading ? 0.7 : 1,
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                    }}
                    onMouseOver={e => !aiLoading && (e.currentTarget.style.transform = 'scale(1.05)')}
                    onMouseOut={e => !aiLoading && (e.currentTarget.style.transform = 'scale(1)')}
                >
                    {aiLoading ? <span style={{animation: 'spin 1s linear infinite', display: 'inline-block'}}>🔄</span> : '🪄'}
                </button>
            </div>

            <input style={s.inputSub} placeholder="Sottotitolo o occhiello..." value={form.subtitle} onChange={e=>setForm({...form, subtitle: e.target.value})} />
        </div>

        <div style={{...s.gridContainer, display: viewMode === 'mobile' ? 'block' : 'grid'}}>
            {/* SINISTRA: EDITOR */}
            <div style={viewMode === 'mobile' ? s.mobileFrame : s.desktopFrame}>
                <div style={{margin: '30px 0'}}>
                    <label style={s.label}>INTRODUZIONE (LEAD)</label>
                    <textarea style={{...s.areaSummary, minHeight:'120px'}} placeholder="Le prime righe..." value={form.summary} onChange={e=>setForm({...form, summary: e.target.value})} />
                </div>

                <div style={{marginBottom:'20px'}}>
                    <label style={s.label}>CORPO DEL TESTO {isRedattore && "(Seleziona per commentare)"}</label>
                    
                    <div style={s.toolbar}>
                        <button onClick={()=>insertFormat('b')} disabled={previewMode} style={{...s.toolBtn, fontWeight:'900', opacity: previewMode?0.5:1}}>B</button>
                        <button onClick={()=>insertFormat('i')} disabled={previewMode} style={{...s.toolBtn, fontStyle:'italic', fontFamily:'serif', opacity: previewMode?0.5:1}}>I</button>
                        <button onClick={()=>insertFormat('u')} disabled={previewMode} style={{...s.toolBtn, textDecoration:'underline', opacity: previewMode?0.5:1}}>U</button>
                        <div style={{width:'1px', background:t.border, margin:'0 5px'}}></div>
                        <button onClick={()=>insertFormat('h2')} disabled={previewMode} style={{...s.toolBtn, fontSize:'12px', opacity: previewMode?0.5:1}}>H2</button>
                        <button onClick={()=>insertFormat('h3')} disabled={previewMode} style={{...s.toolBtn, fontSize:'11px', opacity: previewMode?0.5:1}}>H3</button>
                        <div style={{flex:1}}></div>
                        <button onClick={()=>setPreviewMode(!previewMode)} style={{...s.toolBtn, background: previewMode ? '#2563eb' : t.card, color: previewMode ? '#fff' : t.text, width:'auto', padding:'0 15px'}}>
                            {previewMode ? '✏️ MODIFICA' : '👁️ ANTEPRIMA'}
                        </button>
                    </div>

                    <div style={s.editorWrapper}>
                        {previewMode ? (
                            <div style={{...s.sharedEditorStyle, ...s.previewArea, position:'absolute', top:0, left:0}} dangerouslySetInnerHTML={renderPreview()} />
                        ) : (
                            <>
                                <div 
                                    ref={backdropRef} 
                                    style={{...s.sharedEditorStyle, ...s.backdrop}} 
                                    dangerouslySetInnerHTML={renderBackdrop()} 
                                />
                                <textarea 
                                    ref={textareaRef} 
                                    style={{...s.sharedEditorStyle, ...s.textArea}} 
                                    placeholder="Inizia a scrivere..." 
                                    value={form.content} 
                                    onChange={e=>setForm({...form, content: e.target.value})} 
                                    onMouseUp={handleTextSelect} 
                                    onScroll={handleScroll} 
                                />
                            </>
                        )}

                        {selectedText && isRedattore && !previewMode && (
                            <div style={s.commentPopup}>
                                <input placeholder="Nota..." value={newComment} onChange={e=>setNewComment(e.target.value)} style={{border:'none', outline:'none', padding:'5px', background:'transparent', color:t.text, minWidth:'180px'}} autoFocus />
                                <button onClick={addComment} style={{background:'#2563eb', color:'#fff', border:'none', padding:'5px 10px', borderRadius:'6px', cursor:'pointer'}}>Salva</button>
                                <button onClick={()=>setSelectedText('')} style={{background:'transparent', border:'none', cursor:'pointer', fontSize:'16px', color:t.textSec}}>✕</button>
                            </div>
                        )}
                    </div>
                </div>
                
                <div style={{marginTop: '60px'}}>
                    <label style={s.label}>GALLERIA FOTOGRAFICA</label>
                    <div style={{display:'flex', gap:'15px', overflowX:'auto', paddingBottom:'15px', alignItems:'center'}}>
                        <label style={{...s.uploadBox, minWidth:'100px', height:'100px', padding:0, display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0}}>
                            <span style={{fontSize:'24px'}}>+</span>
                            <input type="file" multiple onChange={handleGallery} accept="image/*" style={{display:'none'}} />
                        </label>
                        {form.gallery.map((img, i) => (
                            <div key={i} style={{position: 'relative', flexShrink: 0}}>
                                <img src={img} style={s.galleryThumb} alt={`gallery ${i}`} />
                                <button onClick={() => removeGalleryImage(i)} style={{position:'absolute', top:'-5px', right:'-5px', background:'#ef4444', color:'white', border:'none', borderRadius:'50%', width:'22px', height:'22px', cursor:'pointer', fontSize:'12px'}}>✕</button>
                            </div>
                        ))}
                    </div>
                </div>
                <div style={{marginTop: '30px'}}><label style={s.label}>VIDEO EMBED</label><input style={s.inputStd} placeholder="Incolla link YouTube..." value={form.bodyVideo} onChange={e=>setForm({...form, bodyVideo: e.target.value})} /></div>
                
                <div style={{marginTop:'40px', padding:'25px', background: theme==='dark'?'#1e293b':'#f8fafc', borderRadius:'16px', border:`1px solid ${t.border}`}}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                        <label style={s.label}>SEO OPTIMIZATION</label>
                        <strong style={{color: seoAnalysis.score > 80 ? '#22c55e' : seoAnalysis.score > 50 ? '#eab308' : '#ef4444'}}>Score: {seoAnalysis.score}/100</strong>
                    </div>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                        <input style={s.inputStd} placeholder="Focus Keyword..." value={form.focusKeyword} onChange={e=>setForm({...form, focusKeyword: e.target.value})} />
                        <input style={s.inputStd} placeholder="Meta Title..." value={form.seoTitle} onChange={e=>setForm({...form, seoTitle: e.target.value})} />
                    </div>
                    <div style={{marginTop:'15px', fontSize:'12px', display:'flex', flexWrap:'wrap', gap:'10px'}}>
                        {seoAnalysis.problems.map((p,i)=><span key={i} style={{color:'#991b1b', background:'#fee2e2', padding:'2px 8px', borderRadius:'4px'}}>⚠️ {p}</span>)}
                        {seoAnalysis.good.map((p,i)=><span key={i} style={{color:'#166534', background:'#dcfce7', padding:'2px 8px', borderRadius:'4px'}}>✅ {p}</span>)}
                    </div>
                </div>
            </div>

            {/* DESTRA (SIDEBAR) */}
            <div style={{...s.stickySidebar, display: viewMode === 'mobile' ? 'none' : 'flex'}}>
                <div style={s.sidebarBox}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                        <label style={{...s.label, marginBottom:0}}>NOTE REDAZIONALI</label>
                        <span style={{background: form.comments.length > 0 ? '#ef4444':'#e5e7eb', color: form.comments.length > 0?'#fff':'#374151', borderRadius:'10px', padding:'2px 8px', fontSize:'11px', fontWeight:'bold'}}>{form.comments.length}</span>
                    </div>
                    {form.comments.length > 0 ? (form.comments.map(c => (
                        <div key={c.id} style={s.commentCard}>
                            <div style={s.commentHeader}><span>NOTA</span>{isRedattore && <button onClick={()=>deleteComment(c.id)} style={{background:'transparent', border:'none', color:'#fff', cursor:'pointer'}}>✓</button>}</div>
                            <div style={{padding:'8px 12px', fontSize:'11px', fontStyle:'italic', color:t.textSec, background:theme==='dark'?'#27272a':'#fafafa'}}>"{c.quote}"</div>
                            <div style={s.commentBody}>{c.text}</div>
                        </div>
                    ))) : (<div style={{fontSize:'13px', color:t.textSec, textAlign:'center', padding:'20px', border:`2px dashed ${t.border}`, borderRadius:'8px'}}>Nessuna nota.</div>)}
                </div>
                
                <div style={s.sidebarBox}>
                    <label style={s.label}>STATO ATTUALE</label>
                    <div style={{padding:'12px', background: form.status==='Pubblicato'?'#dcfce7':form.status==='Rifiutato'?'#fee2e2':(form.status==='Programmato'?'#e0e7ff':'#fef3c7'), borderRadius:'8px', fontWeight:'bold', fontSize:'14px', color: form.status==='Pubblicato'?'#166534':form.status==='Rifiutato'?'#991b1b':(form.status==='Programmato'?'#4338ca':'#b45309'), textAlign:'center', border:'1px solid rgba(0,0,0,0.05)'}}>
                        {form.status.toUpperCase()}
                    </div>
                </div>

                <div style={s.sidebarBox}>
                    <label style={s.label}>PIANIFICAZIONE</label>
                    <input 
                        type="datetime-local" 
                        disabled={!isRedattore} // <--- DISABILITA SE NON È REDATTORE
                        style={{
                            ...s.inputStd, 
                            opacity: isRedattore ? 1 : 0.5, // Diventa opaco
                            cursor: isRedattore ? 'pointer' : 'not-allowed', // Cursore di divieto
                            background: isRedattore ? t.bg : t.hover // Sfondo leggermente diverso
                        }} 
                        value={form.scheduledAt} 
                        onChange={e => setForm({...form, scheduledAt: e.target.value})} 
                    />
                    
                    {/* Messaggio per l'Editore */}
                    {!isRedattore && (
                        <div style={{fontSize:'10px', color:t.textSec, marginTop:'5px', fontStyle:'italic'}}>
                            🔒 Solo il Redattore può pianificare l'uscita.
                        </div>
                    )}

                    {/* Tasto annulla (visibile solo se c'è una data e sei Redattore) */}
                    {form.scheduledAt && isRedattore && (
                        <div style={{display:'flex', justifyContent:'space-between', marginTop:'8px'}}>
                            <span style={{fontSize:'10px', color:t.textSec}}>Uscita prevista:</span>
                            <button onClick={()=>setForm({...form, scheduledAt:''})} style={{fontSize:'10px', color:'#ef4444', border:'none', background:'transparent', cursor:'pointer', textDecoration:'underline'}}>Annulla</button>
                        </div>
                    )}
                </div>
                
                <div style={s.sidebarBox}>
                    <label style={s.label}>SOCIAL & FONTI</label>
                    <input style={{...s.inputStd, marginBottom:'10px'}} placeholder="Titolo per Facebook..." value={form.ogTitle || ''} onChange={e=>setForm({...form, ogTitle: e.target.value})} />
                    <textarea style={{...s.inputStd, minHeight:'60px'}} placeholder="Descrizione social..." value={form.ogDescription || ''} onChange={e=>setForm({...form, ogDescription: e.target.value})} />
                    <input style={{...s.inputStd, marginTop:'10px'}} placeholder="Link Fonte (es. Ansa)" value={form.source} onChange={e=>setForm({...form, source: e.target.value})} />
                </div>
                
                <div style={s.sidebarBox}>
                    <div style={{display:'flex', justifyContent:'space-between'}}><label style={s.label}>CATEGORIA</label><button onClick={() => { setIsNewCategory(!isNewCategory); setForm({...form, category: ''}); }} style={{background:'none', border:'none', color: t.active, fontSize:'10px', fontWeight:'bold', cursor:'pointer'}}>+ NUOVA</button></div>
                    {isNewCategory ? (<input style={s.inputStd} placeholder="Nome nuova..." value={form.category} onChange={e=>setForm({...form, category: e.target.value})} autoFocus />) : (<select style={s.inputStd} value={form.category} onChange={e=>setForm({...form, category: e.target.value})}>{categories.map(c => <option key={c._id}>{c.name}</option>)}</select>)}
                </div>

               {/* --- BOX VISIBILITÀ (DA AGGIUNGERE) --- */}
                <div style={s.sidebarBox}>
                    <label style={s.label}>CHI PUÒ VEDERLO?</label>
                    <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                        
                        {/* Pubblico */}
                        <label style={{display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', padding:'8px', borderRadius:'6px', border: form.visibility==='public' ? `1px solid ${t.active}` : '1px solid transparent', background: form.visibility==='public' ? t.hover : 'transparent'}}>
                            <input type="radio" name="vis" checked={form.visibility==='public'} onChange={()=>setForm({...form, visibility:'public'})} />
                            <span style={{fontSize:'13px', fontWeight: form.visibility==='public'?'bold':'normal'}}>🌍 Pubblico (Gratis)</span>
                        </label>

                        {/* Abbonati */}
                        <label style={{display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', padding:'8px', borderRadius:'6px', border: form.visibility==='subscribers' ? '1px solid #9333ea' : '1px solid transparent', background: form.visibility==='subscribers' ? '#f3e8ff' : 'transparent'}}>
                            <input type="radio" name="vis" checked={form.visibility==='subscribers'} onChange={()=>setForm({...form, visibility:'subscribers'})} />
                            <span style={{fontSize:'13px', color: form.visibility==='subscribers'?'#7e22ce':t.text, fontWeight: form.visibility==='subscribers'?'bold':'normal'}}>⭐ Solo Abbonati</span>
                        </label>

                        {/* A Pagamento */}
                        <label style={{display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', padding:'8px', borderRadius:'6px', border: form.visibility==='paid' ? '1px solid #059669' : '1px solid transparent', background: form.visibility==='paid' ? '#ecfdf5' : 'transparent'}}>
                            <input type="radio" name="vis" checked={form.visibility==='paid'} onChange={()=>setForm({...form, visibility:'paid'})} />
                            <span style={{fontSize:'13px', color: form.visibility==='paid'?'#047857':t.text, fontWeight: form.visibility==='paid'?'bold':'normal'}}>💰 Paywall (Pagamento)</span>
                        </label>

                        {/* Privato */}
                        <label style={{display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', padding:'8px', borderRadius:'6px', border: form.visibility==='private' ? '1px solid #4b5563' : '1px solid transparent', background: form.visibility==='private' ? '#f3f4f6' : 'transparent'}}>
                            <input type="radio" name="vis" checked={form.visibility==='private'} onChange={()=>setForm({...form, visibility:'private'})} />
                            <span style={{fontSize:'13px', color: form.visibility==='private'?'#1f2937':t.text, fontWeight: form.visibility==='private'?'bold':'normal'}}>🔒 Privato (Solo CMS)</span>
                        </label>

                    </div>
                </div>


{/* --- BOX LEGGI ANCHE (MAX 4) --- */}
<div style={s.sidebarBox}>
    <label style={s.label}>LEGGI ANCHE ({form.attachedNews.length}/4)</label>
    
    {/* Lista notizie già allegate */}
    <div style={{display:'flex', flexDirection:'column', gap:'8px', marginBottom: form.attachedNews.length < 4 ? '15px' : '0'}}>
        {form.attachedNews.map(item => (
            <div key={item._id} style={{display:'flex', alignItems:'center', gap:'10px', background: t.hover, padding:'8px', borderRadius:'8px', border:`1px solid ${t.border}`}}>
                {item.coverImage && <img src={item.coverImage} style={{width:'30px', height:'30px', borderRadius:'4px', objectFit:'cover'}} alt="" />}
                <div style={{flex:1, fontSize:'11px', fontWeight:'600', lineHeight:'1.2', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{item.title}</div>
                <button onClick={() => removeAttachedNews(item._id)} style={{border:'none', background:'transparent', color:'#ef4444', cursor:'pointer', fontWeight:'bold'}}>✕</button>
            </div>
        ))}
    </div>

    {/* Input Ricerca (appare solo se ne hai meno di 4) */}
    {form.attachedNews.length < 4 && (
        <div style={{position:'relative'}}>
            <input 
                style={s.inputStd} 
                placeholder="Cerca notizia da allegare..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            {/* Dropdown Risultati */}
            {searchQuery.length > 2 && (
                <div style={{
                    position:'absolute', top:'100%', left:0, width:'100%', 
                    background: t.card, border:`1px solid ${t.border}`, 
                    borderRadius:'8px', marginTop:'5px', zIndex:50, 
                    boxShadow:'0 10px 20px rgba(0,0,0,0.2)', maxHeight:'200px', overflowY:'auto'
                }}>
                    {allNews
                        .filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()))
                        .slice(0, 5) // Mostra solo i primi 5 risultati
                        .map(n => (
                            <div 
                                key={n._id} 
                                onClick={() => addAttachedNews(n)}
                                style={{padding:'10px', borderBottom:`1px solid ${t.border}`, cursor:'pointer', fontSize:'12px', display:'flex', alignItems:'center', gap:'8px'}}
                                onMouseOver={(e) => e.currentTarget.style.background = t.hover}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                {n.coverImage && <img src={n.coverImage} style={{width:'24px', height:'24px', borderRadius:'4px', objectFit:'cover'}} alt=""/>}
                                <span style={{color:t.text}}>{n.title}</span>
                            </div>
                        ))
                    }
                    {allNews.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                        <div style={{padding:'10px', fontSize:'12px', color:t.textSec, textAlign:'center'}}>Nessun risultato</div>
                    )}
                </div>
            )}
        </div>
    )}
</div>


                <div style={s.sidebarBox}>
                    <label style={s.label}>PRIORITÀ</label>
                    <div style={{display:'flex', gap:'5px'}}>
                        {['Normale', 'Rilievo', "Ultim'ora"].map(imp => (
                            <div key={imp} onClick={()=>setForm({...form, importance: imp})} style={{padding:'8px', borderRadius:'6px', cursor:'pointer', fontSize:'12px', background: form.importance === imp ? t.active : t.hover, color: form.importance === imp ? '#fff' : t.text, flex:1, textAlign:'center', fontWeight: form.importance === imp ? 'bold' : 'normal', transition: 'all 0.2s'}}>{imp}</div>
                        ))}
                    </div>
                </div>
                
{/* --- NUOVO BLOCCO: IMPAGINAZIONE --- */}
<div style={s.sidebarBox}>
    <label style={s.label}>IMPAGINAZIONE (Home)</label>
    <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
        
        {/* Tasto Prima Pagina */}
        <label style={{
            display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', padding:'10px', 
            borderRadius:'8px', transition:'0.2s',
            background: form.isFirstPage ? '#eff6ff' : 'transparent',
            border: form.isFirstPage ? '1px solid #2563eb' : '1px solid transparent'
        }}>
            <input 
                type="checkbox" 
                checked={form.isFirstPage || false} 
                onChange={e => setForm({...form, isFirstPage: e.target.checked, isSecondPage: false})} // Se metti prima, togli seconda
                style={{accentColor: '#2563eb', width:'16px', height:'16px'}} 
            />
            <span style={{fontSize:'13px', fontWeight:'800', color: form.isFirstPage ? '#1e40af' : t.textSec}}>
                🥇 PRIMA PAGINA
            </span>
        </label>

        {/* Tasto Seconda Pagina */}
        <label style={{
            display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', padding:'10px', 
            borderRadius:'8px', transition:'0.2s',
            background: form.isSecondPage ? '#fdf2f8' : 'transparent',
            border: form.isSecondPage ? '1px solid #db2777' : '1px solid transparent'
        }}>
            <input 
                type="checkbox" 
                checked={form.isSecondPage || false} 
                onChange={e => setForm({...form, isSecondPage: e.target.checked, isFirstPage: false})} // Se metti seconda, togli prima
                style={{accentColor: '#db2777', width:'16px', height:'16px'}} 
            />
            <span style={{fontSize:'13px', fontWeight:'800', color: form.isSecondPage ? '#be185d' : t.textSec}}>
                🥈 SECONDA PAGINA
            </span>
        </label>

    </div>
</div>

                <div style={s.sidebarBox}>
                    <label style={s.label}>COPERTINA</label>
                    <input id="cover-upload" type="file" onChange={handleCover} accept="image/*" style={{display:'none'}} />
                    {!form.coverImage ? (
                        <label htmlFor="cover-upload" style={s.uploadBox}><span style={{fontSize:'28px'}}>📷</span><br/>Carica</label>
                    ) : (
                        <div>
                            <img src={form.coverImage} style={s.previewImg} alt="Cover" />
                            <div style={{display:'flex', gap:'5px'}}>
                                <input style={s.inputStd} placeholder="Credits..." value={form.coverCredits} onChange={e=>setForm({...form, coverCredits: e.target.value})} />
                                <label htmlFor="cover-upload" style={{...s.btnSec, padding:'10px', display:'flex', alignItems:'center'}}>🔄</label>
                            </div>
                        </div>
                    )}
                </div>
                
                <div style={s.sidebarBox}>
                    <label style={s.label}>TAGS & SPONSOR</label>
                    <input style={s.inputStd} placeholder="#tag1, #tag2" value={form.tags} onChange={e=>setForm({...form, tags: e.target.value})} />
                    <div style={{display:'flex', alignItems:'center', gap:'10px', marginTop:'15px', padding:'10px', background: t.hover, borderRadius:'8px'}}>
                        <input type="checkbox" checked={form.isAd} onChange={e=>setForm({...form, isAd: e.target.checked})} style={{width:'16px', height:'16px'}} />
                        <span style={{color:t.text, fontSize:'13px', fontWeight:'600'}}>Contenuto Sponsorizzato</span>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};





// --- LISTA ARTICOLI (V10: AGGIUNTA VISIBILITÀ NELLA LISTA) ---
const NewsList = ({ user, theme }) => {
  const navigate = useNavigate();
  const t = themeColors[theme];

  const isRedattore = user?.role === 'Redattore';

  // --- STATI DATI ---
  const [news, setNews] = useState([]);
  const [filteredNews, setFilteredNews] = useState([]);
  const [paginatedNews, setPaginatedNews] = useState([]);

  // --- STATI UI ---
  const [viewMode, setViewMode] = useState(isRedattore ? 'all' : 'mine'); 
  const [page, setPage] = useState(0);
  const itemsPerPage = 10;

  // --- FILTRI ---
  const [searchAuthor, setSearchAuthor] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [searchMonth, setSearchMonth] = useState('');

  // 1. CARICAMENTO
  useEffect(() => {
    axios.get('https://murthnews-api.onrender.com/api/news')
      .then(res => {
        const sorted = res.data.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
        setNews(sorted);
      })
      .catch(err => console.error(err));
  }, []);

  // 2. LOGICA FILTRI AVANZATA
  useEffect(() => {
    if (!user) return; 

    let result = news;
    
    const currentMode = isRedattore ? viewMode : 'mine';

    // Filtro per "I Miei"
    if (currentMode === 'mine') {
        result = result.filter(n => n.author === user.username);
    }

    // Filtro per "Tutti" (Solo Redattore + Ricerca Autore)
    if (currentMode === 'all' && searchAuthor.trim()) {
        result = result.filter(n => n.author.toLowerCase().includes(searchAuthor.toLowerCase()));
    }

    // Filtri Data
    if (searchDate) {
        result = result.filter(n => new Date(n.createdAt).toISOString().slice(0, 10) === searchDate);
    } else if (searchMonth) {
        result = result.filter(n => (new Date(n.createdAt).getMonth() + 1).toString() === searchMonth);
    }

    setFilteredNews(result);
    if (page * itemsPerPage >= result.length) setPage(0);

  }, [news, viewMode, searchAuthor, searchDate, searchMonth, user, page, isRedattore]);

  // 3. PAGINAZIONE
  useEffect(() => {
    const start = page * itemsPerPage;
    setPaginatedNews(filteredNews.slice(start, start + itemsPerPage));
  }, [page, filteredNews]);

  // --- HANDLERS ---
  const handleTabChange = (mode) => {
    setViewMode(mode);
    setPage(0);
    setSearchAuthor(''); setSearchDate(''); setSearchMonth('');
  };

  const deleteNews = async (id) => {
    if(window.confirm("Sei sicuro di voler eliminare questo articolo?")) {
        try {
            await axios.delete(`https://murthnews-api.onrender.com/api/news/${id}`);
            setNews(prev => prev.filter(n => n._id !== id));
        } catch(e) { alert("Errore eliminazione."); }
    }
  };

  // --- STILI ---
  const s = {
    container: { maxWidth:'1400px', margin:'0 auto', paddingBottom:'100px', fontFamily: '-apple-system, sans-serif' },
    
    topRow: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px' },
    titleBox: { display:'flex', flexDirection:'column' },
    mainTitle: { margin:0, color: t.text, fontSize: '32px', fontWeight:'900', letterSpacing:'-1px' },
    subTitle: { color: t.textSec, fontSize:'14px', marginTop:'5px', fontWeight:'500' },

    switcherContainer: { background: t.border, padding:'4px', borderRadius:'30px', display:'inline-flex', gap:'0', boxShadow:'inset 0 2px 5px rgba(0,0,0,0.05)' },
    switchBtn: (isActive) => ({
        padding: '10px 25px', borderRadius: '25px', border: 'none', cursor: 'pointer',
        background: isActive ? t.card : 'transparent',
        color: isActive ? t.active : t.textSec,
        fontWeight: isActive ? '800' : '600',
        boxShadow: isActive ? '0 4px 10px rgba(0,0,0,0.1)' : 'none',
        transition: 'all 0.3s ease', fontSize:'14px'
    }),

    filterBar: { background: t.card, padding:'20px', borderRadius:'16px', border:`1px solid ${t.border}`, marginBottom:'25px', display:'flex', alignItems:'flex-end', gap:'15px', flexWrap:'wrap', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' },
    inputCol: { display:'flex', flexDirection:'column', gap:'6px' },
    label: { fontSize:'11px', fontWeight:'800', color: t.textSec, textTransform:'uppercase', paddingLeft:'5px' },
    input: { padding:'12px 15px', borderRadius:'10px', border:`1px solid ${t.border}`, background: theme==='dark' ? 'rgba(0,0,0,0.2)' : '#f8fafc', color: t.text, outline:'none', minWidth:'160px', fontSize:'14px', fontWeight:'500' },
    resetLink: { marginLeft:'auto', color:'#ef4444', fontWeight:'bold', fontSize:'13px', cursor:'pointer', textDecoration:'underline', paddingBottom:'12px', background:'none', border:'none' },

    tableCard: { background: t.card, borderRadius:'16px', border:`1px solid ${t.border}`, overflow:'hidden', boxShadow:'0 10px 30px rgba(0,0,0,0.03)', overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', minWidth: '950px' },
    thead: { background: theme==='dark' ? 'rgba(255,255,255,0.03)' : '#f1f5f9', borderBottom:`1px solid ${t.border}` },
    th: { textAlign: 'left', padding: '18px 20px', color: t.textSec, fontSize: '11px', textTransform: 'uppercase', fontWeight:'800', letterSpacing:'0.5px' },
    
    row: (status) => ({ 
        borderBottom: `1px solid ${t.border}`, transition: 'background 0.1s',
        background: status === 'Rifiutato' ? (theme === 'dark' ? 'rgba(220, 38, 38, 0.15)' : '#fef2f2') : 
                    status === 'Programmato' ? (theme === 'dark' ? 'rgba(124, 58, 237, 0.1)' : '#f5f3ff') : 
                    'transparent'
    }),
    td: { padding: '18px 20px', color: t.text, verticalAlign: 'middle' },
    
    cover: { width: '50px', height: '50px', objectFit: 'cover', borderRadius: '10px', boxShadow:'0 2px 5px rgba(0,0,0,0.1)' },
    
    badge: (status) => {
        let bg = '#f1f5f9', col = '#64748b';
        if(status==='Pubblicato') { bg='#dcfce7'; col='#15803d'; }
        if(status==='In Revisione') { bg='#fef9c3'; col='#a16207'; }
        if(status==='Rifiutato') { bg='#fee2e2'; col='#991b1b'; } 
        if(status==='Programmato') { bg='#ede9fe'; col='#7c3aed'; }
        
        return { background:bg, color:col, padding:'6px 12px', borderRadius:'20px', fontSize:'11px', fontWeight:'800', display:'inline-flex', alignItems:'center', gap:'5px', textTransform:'uppercase' };
    },

    // --- NUOVO STILE PER VISIBILITÀ ---
    visBadge: (vis) => {
        let bg='#f3f4f6', col='#1f2937';
        if(vis==='paid') { bg='#ecfdf5'; col='#047857'; } // Verde
        if(vis==='subscribers') { bg='#f3e8ff'; col='#7e22ce'; } // Viola
        
        return { 
            marginLeft:'8px', background:bg, color:col, 
            padding:'2px 6px', borderRadius:'4px', 
            fontSize:'9px', fontWeight:'800', 
            textTransform:'uppercase', verticalAlign:'middle', 
            border:`1px solid ${col}30` 
        };
    },
    // ---------------------------------

    dot: { width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', display: 'inline-block', marginRight: '8px', animation: 'pulse 1.5s infinite' },

    actionBtn: (active) => ({ 
        width:'35px', height:'35px', borderRadius:'50%', 
        border: active ? `1px solid ${t.border}` : '1px solid gray', 
        background: active ? t.card : 'transparent', 
        color: active ? t.text : 'gray', 
        cursor: active ? 'pointer' : 'not-allowed',
        opacity: active ? 1 : 0.3,
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', marginLeft:'8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' 
    }),
    
    urgentBtn: {
        width:'35px', height:'35px', borderRadius:'50%', border:`1px solid #ef4444`, 
        background:'#ef4444', color:'#fff', cursor:'pointer', 
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', marginLeft:'8px',
        animation: 'pulse 1.5s infinite', boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
    },

    pagBar: { display:'flex', justifyContent:'center', alignItems:'center', gap:'15px', marginTop:'30px' },
    pagBtn: { width:'45px', height:'45px', borderRadius:'50%', background: t.active, color:'#fff', border:'none', fontSize:'20px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 5px 15px rgba(0,0,0,0.1)' },
    pagText: { fontWeight:'bold', color: t.textSec, fontSize:'14px' }
  };

  const months = [{v:'1',l:'Gen'},{v:'2',l:'Feb'},{v:'3',l:'Mar'},{v:'4',l:'Apr'},{v:'5',l:'Mag'},{v:'6',l:'Giu'},{v:'7',l:'Lug'},{v:'8',l:'Ago'},{v:'9',l:'Set'},{v:'10',l:'Ott'},{v:'11',l:'Nov'},{v:'12',l:'Dic'}];

  return (
    <div style={s.container}>
      <style>{`@keyframes pulse { 0% { transform: scale(0.95); opacity: 0.7; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(0.95); opacity: 0.7; } }`}</style>
      
      <div style={s.topRow}>
        <div style={s.titleBox}>
            <h1 style={s.mainTitle}>Archivio Notizie</h1>
            <span style={s.subTitle}>Ciao <b>{user?.username}</b> ({user?.role})</span>
        </div>

        {isRedattore && (
            <div style={s.switcherContainer}>
                <button onClick={() => handleTabChange('all')} style={s.switchBtn(viewMode === 'all')}>🌍 TUTTI</button>
                <button onClick={() => handleTabChange('mine')} style={s.switchBtn(viewMode === 'mine')}>👤 I MIEI</button>
            </div>
        )}
      </div>

      {/* FILTRI */}
      <div style={s.filterBar}>
        <div style={{color:t.text, marginRight:'10px', display:'flex', alignItems:'center', gap:'10px'}}>
            <span style={{fontSize:'24px', background:t.border, width:'40px', height:'40px', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'10px'}}>🔎</span>
        </div>
        
        {isRedattore && viewMode === 'all' && (
            <div style={s.inputCol}><label style={s.label}>Cerca Autore</label><input placeholder="Nome..." style={s.input} value={searchAuthor} onChange={e => setSearchAuthor(e.target.value)} /></div>
        )}
        
        <div style={s.inputCol}><label style={s.label}>Data Esatta</label><input type="date" style={s.input} value={searchDate} onChange={e => { setSearchDate(e.target.value); setSearchMonth(''); }} /></div>
        <div style={s.inputCol}>
            <label style={s.label}>Oppure Mese</label>
            <select style={{...s.input, opacity: searchDate?0.5:1}} value={searchMonth} onChange={e => setSearchMonth(e.target.value)} disabled={!!searchDate}>
                <option value="">-- Qualsiasi --</option>{months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
        </div>
        {(searchAuthor || searchDate || searchMonth) && (<button onClick={() => { setSearchAuthor(''); setSearchDate(''); setSearchMonth(''); }} style={s.resetLink}>Rimuovi Filtri ✕</button>)}
      </div>

      {/* TABELLA */}
      <div style={s.tableCard}>
        <table style={s.table}>
            <thead style={s.thead}>
                <tr>
                    <th style={s.th}>Immagine</th>
                    <th style={s.th}>Info Principali</th>
                    <th style={s.th}>Categoria</th>
                    <th style={s.th}>Stato</th>
                    <th style={s.th}>Autore</th>
                    <th style={s.th}>Data</th>
                    <th style={{...s.th, textAlign:'right', minWidth:'120px'}}>Gestisci</th>
                </tr>
            </thead>
            <tbody>
                {paginatedNews.map(n => {
                    const safeStatus = n.status || 'Bozza';
                    const currentUser = user ? String(user.username).trim().toLowerCase() : "";
                    const articleAuthor = n.author ? String(n.author).trim().toLowerCase() : "";
                    const canEdit = isRedattore || (currentUser === articleAuthor);
                    const canDelete = canEdit;

                    return (
                    <tr key={n._id} style={s.row(safeStatus)}>
                        <td style={s.td}><img src={n.coverImage || 'https://via.placeholder.com/60'} style={s.cover} alt="cover"/></td>
                        <td style={s.td}>
                            {safeStatus === 'Rifiutato' && <span style={s.dot}></span>}
                            <span style={{fontWeight:'800', fontSize:'15px'}}>
                                {n.title}
                                
                                {/* --- QUI APPARE IL TAG VISIBILITÀ --- */}
                                {n.visibility && n.visibility !== 'public' && (
                                    <span style={s.visBadge(n.visibility)}>
                                        {n.visibility === 'private' ? '🔒 PRIVATO' : n.visibility === 'paid' ? '💰 PAID' : '⭐ ABBONATI'}
                                    </span>
                                )}
                                {/* ------------------------------------ */}

                            </span>
                            <div style={{fontSize:'12px', color:t.textSec, marginTop:'3px'}}>{n.subtitle || 'Nessun sottotitolo'}</div>
                        </td>
                        <td style={s.td}><span style={{fontSize:'12px', color:t.text, fontWeight:'600', borderBottom:`2px solid ${t.active}`}}>{n.category || 'News'}</span></td>
                        <td style={s.td}>
                            <span style={s.badge(safeStatus)}>{safeStatus === 'Rifiutato' ? '⚠️ CORREGGERE' : safeStatus.toUpperCase()}</span>
                        </td>
                        <td style={s.td}>
                            <div style={{display:'flex', flexDirection:'column', gap:'2px'}}>
                                <span style={{fontWeight:'bold', fontSize:'13px'}}>{n.author}</span>
                                {currentUser === articleAuthor && <span style={{fontSize:'10px', color:t.active}}>(Tu)</span>}
                            </div>
                        </td>
                        <td style={s.td}>
                            <div style={{fontSize:'13px', fontWeight:'600'}}>
                                {safeStatus === 'Programmato' && n.scheduledAt 
                                    ? new Date(n.scheduledAt).toLocaleDateString() 
                                    : new Date(n.createdAt).toLocaleDateString()
                                }
                            </div>
                            <div style={{fontSize:'11px', color:t.textSec}}>
                                {safeStatus === 'Programmato' && n.scheduledAt 
                                    ? '🕒 ' + new Date(n.scheduledAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
                                    : new Date(n.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
                                }
                            </div>
                        </td>

                        <td style={s.td}>
                            <div style={{display:'flex', justifyContent:'flex-end'}}>
                                <button 
                                    onClick={() => canEdit ? navigate(`/edit-news/${n._id}`) : alert("Non puoi modificare articoli di altri!")} 
                                    style={safeStatus === 'Rifiutato' && canEdit ? s.urgentBtn : s.actionBtn(canEdit)}
                                    title={canEdit ? "Modifica" : "Solo lettura"}
                                >
                                    ✏️
                                </button>
                                
                                <button 
                                    onClick={() => canDelete ? deleteNews(n._id) : alert("Non puoi eliminare articoli di altri!")} 
                                    style={{...s.actionBtn(canDelete), borderColor: canDelete ? '#ef4444' : 'gray', color: canDelete ? '#ef4444' : 'gray'}} 
                                    title="Elimina"
                                >
                                    🗑️
                                </button>
                            </div>
                        </td>
                    </tr>
                )})}
                {paginatedNews.length === 0 && (<tr><td colSpan="7" style={{padding:'50px', textAlign:'center', color:t.textSec}}>Nessun articolo trovato.</td></tr>)}
            </tbody>
        </table>
      </div>

      {filteredNews.length > itemsPerPage && (
        <div style={s.pagBar}>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{...s.pagBtn, opacity: page === 0 ? 0.3 : 1, cursor: page===0?'default':'pointer'}}>←</button>
            <span style={s.pagText}>Pagina {page + 1} di {Math.ceil(filteredNews.length / itemsPerPage)}</span>
            <button onClick={() => setPage(p => ((p+1)*itemsPerPage < filteredNews.length ? p+1 : p))} disabled={(page + 1) * itemsPerPage >= filteredNews.length} style={{...s.pagBtn, opacity: (page+1)*itemsPerPage >= filteredNews.length ? 0.3 : 1, cursor: (page+1)*itemsPerPage >= filteredNews.length?'default':'pointer'}}>→</button>
        </div>
      )}
    </div>
  );
};



// --- PAGINA RISULTATI RICERCA (Fix Rotta Profilo) ---
const SearchResultsPage = ({ user, theme }) => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');
  const t = themeColors[theme];
  const navigate = useNavigate();

  const [newsResults, setNewsResults] = useState([]);
  const [userResults, setUserResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        if (!query) return;
        setLoading(true);
        try {
            // Cerca News
            const resNews = await axios.get(`https://murthnews-api.onrender.com/api/search/news?q=${query}`);
            setNewsResults(resNews.data);

            // Cerca Utenti
            const resUsers = await axios.get(`https://murthnews-api.onrender.com/api/search/users?q=${query}`);
            setUserResults(resUsers.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [query]);

  const s = {
      container: { padding: '40px', maxWidth: '1000px', margin: '0 auto', color: t.text },
      title: { borderBottom: `1px solid ${t.border}`, paddingBottom: '20px', marginBottom: '30px' },
      sectionTitle: { marginTop: '40px', marginBottom: '20px', color: t.active, textTransform: 'uppercase', fontSize: '14px', fontWeight: 'bold' },
      grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' },
      
      // Card generica
      card: { background: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '20px', cursor: 'pointer', transition: 'transform 0.2s', display:'flex', alignItems:'center', gap:'15px' },
      
      // Stili specifici
      avatar: { width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' },
      newsThumb: { width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }
  };

  if (loading) return <div style={{padding:'50px', textAlign:'center', color:t.text}}>Ricerca in corso...</div>;

  return (
    <div style={s.container}>
        <h2 style={s.title}>Risultati per: "{query}"</h2>

        {/* RISULTATI UTENTI */}
        {userResults.length > 0 && (
            <>
                <div style={s.sectionTitle}>Utenti trovati ({userResults.length})</div>
                <div style={s.grid}>
                    {userResults.map(u => {
                        const photo = u.profileImage || u.foto;
                        return (
                            <div 
                                key={u._id} 
                                style={s.card}
                                onClick={() => navigate(`/profile/${u._id}`)}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                {photo ? (
                                    <img src={photo} style={s.avatar} alt="avatar" />
                                ) : (
                                    <div style={{...s.avatar, background:t.active, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:'bold'}}>
                                        {u.nome.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <div style={{fontWeight:'bold'}}>{u.nome} {u.cognome}</div>
                                    <div style={{fontSize:'12px', color:t.textSec}}>@{u.username}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </>
        )}

        {/* RISULTATI NEWS */}
        {newsResults.length > 0 && (
            <>
                <div style={s.sectionTitle}>Articoli trovati ({newsResults.length})</div>
                <div style={s.grid}>
                    {newsResults.map(n => (
                        <div 
                            key={n._id} 
                            style={s.card}
                            onClick={() => navigate(`/edit-news/${n._id}`)} // Le news vanno in edit
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                             <img src={n.coverImage || 'https://via.placeholder.com/150'} style={s.newsThumb} alt="thumb" />
                             <div>
                                <div style={{fontWeight:'bold', fontSize:'14px', lineHeight:'1.2', marginBottom:'5px'}}>{n.title}</div>
                                <div style={{fontSize:'11px', color:t.textSec}}>{new Date(n.createdAt).toLocaleDateString()}</div>
                             </div>
                        </div>
                    ))}
                </div>
            </>
        )}

        {userResults.length === 0 && newsResults.length === 0 && (
            <div style={{textAlign:'center', marginTop:'50px', color:t.textSec}}>
                Nessun risultato trovato. Prova con un'altra parola.
            </div>
        )}
    </div>
  );
};


// --- PAGINA PROFILO UTENTE (SCHEDA DIGITALE) ---
const UserProfile = ({ currentUser, theme }) => {
  const { id } = useParams();
  // ⛔ FIX CRASH: Se l'utente non è ancora caricato, mostra attesa
  if (!user) return <div style={{padding:'40px', color:'white'}}>Caricamento utente...</div>;
  const navigate = useNavigate();
  const t = themeColors[theme];
  const [profile, setProfile] = useState(null);
  const [userNews, setUserNews] = useState([]);

  useEffect(() => {
    // 1. Scarica i dati del profilo (inclusi i dati sensibili se inviati dal server)
    axios.get(`https://murthnews-api.onrender.com/api/users/profile/${id}`).then(res => {
        const userData = res.data;
        setProfile(userData);

        // 2. Scarica le news dell'autore
        if (userData && userData.username) {
            axios.get(`https://murthnews-api.onrender.com/api/news`, { 
                params: { author: userData.username } 
            })
            .then(newsRes => {
                setUserNews(newsRes.data);
            });
        }
    });
  }, [id]);

  if (!profile) return <div style={{padding:'50px', textAlign:'center', color:t.text}}>Caricamento scheda...</div>;

  const photo = profile.profileImage || profile.foto;

  const s = {
    container: { maxWidth: '1000px', margin: '0 auto', paddingBottom:'80px' },
    backBtn: { background: 'transparent', border: `1px solid ${t.textSec}`, padding: '8px 16px', borderRadius: '20px', color: t.text, cursor: 'pointer', fontWeight: 'bold', marginBottom:'30px', transition:'all 0.2s' },
    
    // HEADER CARD (Pubblica)
    headerCard: { 
        background: t.card, borderRadius: '24px', padding: '40px', 
        display: 'flex', alignItems: 'center', gap: '40px', 
        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', marginBottom: '30px',
        border: `1px solid ${t.border}`, position: 'relative', overflow: 'hidden'
    },
    avatarCircle: { 
        width: '130px', height: '130px', borderRadius: '50%', overflow:'hidden', 
        flexShrink: 0, display:'flex', alignItems:'center', justifyContent:'center', 
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', 
        boxShadow: '0 10px 20px rgba(99, 102, 241, 0.3)', border: `4px solid ${t.bg}`
    },
    avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
    avatarText: { fontSize: '48px', fontWeight: '900', color: '#fff' },
    info: { flex: 1, zIndex: 1 },
    name: { margin: 0, fontSize: '36px', fontWeight: '800', color: t.text, lineHeight: '1.1' },
    username: { fontSize: '18px', color: t.active, marginTop: '5px', fontWeight: '600' },
    roleBadge: { 
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        background: theme === 'light' ? '#f1f5f9' : '#334155', color: t.text, 
        padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', 
        marginTop: '15px', textTransform: 'uppercase', letterSpacing: '1px'
    },
    statBox: { textAlign: 'center', borderLeft: `1px solid ${t.border}`, paddingLeft: '40px' },

    // PRIVATE DATA CARD (Solo Redattore)
    privateCard: {
        background: theme === 'light' ? '#f0fdf4' : 'rgba(22, 163, 74, 0.1)', // Verde leggero
        border: `1px solid ${theme === 'light' ? '#bbf7d0' : '#14532d'}`,
        borderRadius: '16px', padding: '25px', marginBottom: '40px',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px'
    },
    privateLabel: { fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', color: '#15803d', marginBottom: '5px', display:'flex', alignItems:'center', gap:'5px' },
    privateValue: { fontSize: '15px', fontWeight: '600', color: t.text, fontFamily: 'monospace' },

    // NEWS SECTION
    sectionTitle: { fontSize: '20px', fontWeight: '700', color: t.text, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px' },
    cardNews: { 
        background: t.card, borderRadius: '16px', overflow: 'hidden', 
        border: `1px solid ${t.border}`, cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
        display: 'flex', flexDirection: 'column', height: '100%'
    },
    thumb: { width: '100%', height: '160px', objectFit: 'cover' },
    cardBody: { padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }
  };

  return (
    <div style={s.container}>
        <button onClick={() => navigate(-1)} style={s.backBtn}>← Indietro</button>
        
        {/* 1. HEADER PUBBLICO */}
        <div style={s.headerCard}>
            <div style={s.avatarCircle}>
                {photo ? (
                    <img src={photo} style={s.avatarImg} alt="Avatar" />
                ) : (
                    <span style={s.avatarText}>{profile.nome?.charAt(0)}</span>
                )}
            </div>
            <div style={s.info}>
                <h1 style={s.name}>{profile.nome} {profile.cognome}</h1>
                <div style={s.username}>@{profile.username}</div>
                
                {profile.biography && (
                    <div style={{marginTop:'15px', fontStyle:'italic', color: t.textSec, lineHeight: '1.5', maxWidth: '500px'}}>
                        "{profile.biography}"
                    </div>
                )}
                
                <div style={s.roleBadge}>
                    <span>🛡️</span> {profile.role}
                </div>
            </div>
            <div style={s.statBox}>
                <span style={{display:'block', fontSize:'42px', fontWeight:'900', color: t.active}}>{userNews.length}</span>
                <span style={{fontSize:'11px', color: t.textSec, fontWeight:'bold', textTransform:'uppercase', letterSpacing:'1px'}}>Articoli</span>
            </div>
        </div>

        {/* 2. DATI RISERVATI (Visibili SOLO se sono REDATTORE) */}
        {currentUser.role === 'Redattore' && (
            <div style={{animation: 'fadeIn 0.5s'}}>
                <div style={{fontSize:'12px', fontWeight:'bold', color: t.textSec, marginBottom:'10px', display:'flex', alignItems:'center', gap:'5px'}}>
                    🔒 SCHEDA ANAGRAFICA RISERVATA
                </div>
                <div style={s.privateCard}>
                    <div>
                        <div style={s.privateLabel}>📱 TELEFONO</div>
                        <div style={s.privateValue}>{profile.telefono || "Non registrato"}</div>
                    </div>
                    <div>
                        <div style={s.privateLabel}>📧 EMAIL PRIVATA</div>
                        <div style={s.privateValue}>{profile.email}</div>
                    </div>
                    <div>
                        <div style={s.privateLabel}>🏢 WEBMAIL AZIENDALE</div>
                        <div style={s.privateValue}>
                            {profile.internalEmail || (profile.username + "@murthcms.it")}
                        </div>
                    </div>
                    <div>
                        <div style={s.privateLabel}>📅 DATA ASSUNZIONE</div>
                        <div style={s.privateValue}>{new Date(profile.createdAt).toLocaleDateString()}</div>
                    </div>
                </div>
            </div>
        )}

        {/* 3. LISTA ARTICOLI */}
        <div>
            <h2 style={s.sectionTitle}>
                <span>📰</span> Pubblicazioni Recenti
            </h2>
            {userNews.length === 0 ? <div style={{color:t.textSec, fontStyle:'italic'}}>Nessun articolo pubblicato.</div> : (
                <div style={s.grid}>
                    {userNews.map(n => (
                        <div 
                            key={n._id} 
                            style={s.cardNews} 
                            onClick={() => navigate(`/edit-news/${n._id}`)}
                            onMouseEnter={e => {
                                e.currentTarget.style.transform = 'translateY(-5px)';
                                e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <img src={n.coverImage || 'https://via.placeholder.com/300x150'} style={s.thumb} alt="cover" />
                            <div style={s.cardBody}>
                                <div style={{fontSize:'11px', color: t.active, fontWeight:'bold', textTransform:'uppercase', marginBottom:'5px'}}>
                                    {n.category || "News"}
                                </div>
                                <div style={{fontWeight:'bold', color:t.text, fontSize:'16px', lineHeight:'1.4', marginBottom:'auto'}}>
                                    {n.title}
                                </div>
                                <div style={{fontSize:'12px', color:t.textSec, marginTop:'15px', borderTop:`1px solid ${t.border}`, paddingTop:'10px'}}>
                                    📅 {new Date(n.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
        
        <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
};

// --- GESTIONE CATEGORIE (V2: Design Moderno) ---
const CategoriesManager = ({ theme }) => {
  const t = themeColors[theme];
  const [categories, setCategories] = useState([]);
  const [newCat, setNewCat] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. Carica categorie
  useEffect(() => {
    axios.get('https://murthnews-api.onrender.com/api/categories')
      .then(res => setCategories(res.data))
      .catch(err => console.error(err));
  }, []);

  // 2. Aggiungi
  const addCategory = async (e) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post('https://murthnews-api.onrender.com/api/categories', { name: newCat });
      setCategories([...categories, res.data]);
      setNewCat('');
    } catch (err) {
      alert(err.response?.data?.message || "Errore aggiunta");
    } finally { setLoading(false); }
  };


  // 3. Elimina
  const deleteCategory = async (id) => {
    if (!confirm("Eliminare definitivamente questa categoria?")) return;
    try {
      await axios.delete(`https://murthnews-api.onrender.com/api/categories/${id}`);
      setCategories(categories.filter(c => c._id !== id));
    } catch (err) { alert("Errore eliminazione"); }
  };

  // --- STILI ---
  const s = {
    container: { maxWidth: '900px', margin: '0 auto', paddingBottom:'100px', fontFamily:'-apple-system, sans-serif' },
    
    // Header
    topRow: { display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'30px', borderBottom:`1px solid ${t.border}`, paddingBottom:'20px' },
    title: { margin: 0, color: t.text, fontSize: '32px', fontWeight:'900', letterSpacing:'-1px' },
    subtitle: { color: t.textSec, fontSize:'14px', marginTop:'5px', fontWeight:'500' },
    countBadge: { background: t.active, color: '#fff', padding:'5px 12px', borderRadius:'20px', fontWeight:'bold', fontSize:'13px' },

    // Form di inserimento (Hero Box)
    formCard: { 
        background: t.card, padding: '25px', borderRadius: '16px', 
        border: `1px solid ${t.border}`, marginBottom: '40px', 
        display: 'flex', gap: '15px', alignItems: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,0.03)' 
    },
    iconAdd: { fontSize:'24px', background: t.hover, width:'50px', height:'50px', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'12px' },
    inputWrapper: { flex:1 },
    labelInput: { display:'block', fontSize:'11px', fontWeight:'800', textTransform:'uppercase', color: t.textSec, marginBottom:'8px', letterSpacing:'0.5px' },
    input: { 
        width:'100%', padding: '12px 15px', borderRadius: '10px', border: `1px solid ${t.border}`, 
        background: theme === 'dark' ? 'rgba(0,0,0,0.2)' : '#f8fafc', 
        color: t.text, fontSize: '16px', outline: 'none', fontWeight:'500' 
    },
    addBtn: { 
        padding: '0 30px', height:'46px', marginTop:'21px', // allineato visivamente
        background: t.active, color: '#fff', border: 'none', borderRadius: '10px', 
        fontWeight: 'bold', cursor: 'pointer', fontSize: '14px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.1)', transition:'transform 0.1s'
    },

    // Griglia Categorie
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' },
    
    // Card Categoria
    card: { 
        background: t.card, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '20px', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        transition: 'all 0.2s ease', position:'relative', overflow:'hidden', cursor:'default' 
    },
    cardLeft: { display:'flex', alignItems:'center', gap:'15px' },
    catIcon: { 
        width:'40px', height:'40px', background: t.hover, color: t.active, 
        borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', 
        fontWeight:'900', fontSize:'18px', textTransform:'uppercase' 
    },
    catName: { fontWeight: '700', color: t.text, fontSize: '16px' },
    delBtn: { 
        width:'35px', height:'35px', borderRadius:'50%', background:'transparent', 
        border:`1px solid ${t.border}`, color: '#ef4444', cursor: 'pointer', 
        display:'flex', alignItems:'center', justifyContent:'center', fontSize: '16px',
        transition:'all 0.2s'
    }
  };

  return (
    <div style={s.container}>
      
      {/* HEADER */}
      <div style={s.topRow}>
        <div>
            <h1 style={s.title}>Categorie</h1>
            <div style={s.subtitle}>Organizza i temi del tuo giornale</div>
        </div>
        <div style={s.countBadge}>{categories.length} Attive</div>
      </div>

      {/* FORM AGGIUNTA (Design Hero) */}
      <form onSubmit={addCategory} style={s.formCard}>
        <div style={s.iconAdd}>🏷️</div>
        <div style={s.inputWrapper}>
            <label style={s.labelInput}>NUOVA CATEGORIA</label>
            <input 
              style={s.input} 
              placeholder="Es. Tecnologia, Sport, Cronaca..." 
              value={newCat} 
              onChange={e => setNewCat(e.target.value)} 
            />
        </div>
        <button type="submit" disabled={loading} style={s.addBtn} onMouseDown={e=>e.currentTarget.style.transform='scale(0.95)'} onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}>
          {loading ? '...' : '+ CREA'}
        </button>
      </form>

      {/* LISTA GRID */}
      <div style={s.grid}>
        {categories.map(c => (
          <div 
            key={c._id} 
            style={s.card} 
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.05)'; }} 
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={s.cardLeft}>
                {/* Icona generata dalla prima lettera */}
                <div style={s.catIcon}>{c.name.charAt(0)}</div>
                <span style={s.catName}>{c.name}</span>
            </div>
            
            <button 
                onClick={() => deleteCategory(c._id)} 
                style={s.delBtn} 
                title="Elimina"
                onMouseEnter={e => {e.currentTarget.style.background='#fee2e2'; e.currentTarget.style.borderColor='#ef4444';}}
                onMouseLeave={e => {e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor=t.border;}}
            >
                🗑️
            </button>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
          <div style={{textAlign:'center', padding:'60px', color:t.textSec, fontStyle:'italic'}}>
              <div style={{fontSize:'40px', marginBottom:'10px'}}>🗂️</div>
              Nessuna categoria presente. Creane una sopra!
          </div>
      )}

    </div>
  );
};


// --- LOGIN PAGE (Aggiunta ex novo perché mancante) ---
const LoginPage = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            // Simuliamo il percorso standard di login
        const res = await axios.post('https://murthnews-api.onrender.com/api/login', { username, password });
            onLogin(res.data.user);
        } catch (err) {
            setError('Credenziali non valide o errore server.');
        } finally {
            setLoading(false);
        }
    };

    const s = {
        container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc', fontFamily: '-apple-system, sans-serif' },
        card: { background: '#fff', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' },
        title: { fontSize: '24px', fontWeight: '900', color: '#1e293b', marginBottom: '10px', textAlign: 'center' },
        subtitle: { color: '#64748b', fontSize: '14px', textAlign: 'center', marginBottom: '30px' },
        input: { width: '100%', padding: '14px', marginBottom: '15px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px', outline: 'none' },
        btn: { width: '100%', padding: '14px', background: '#2563eb', color: '#fff', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '16px' },
        error: { color: '#ef4444', fontSize: '14px', textAlign: 'center', marginBottom: '20px', fontWeight: 'bold' }
    };

    return (
        <div style={s.container}>
            <form style={s.card} onSubmit={handleLogin}>
                <div style={s.title}>⚡ MurthEditor</div>
                <div style={s.subtitle}>Accedi alla redazione</div>
                {error && <div style={s.error}>{error}</div>}
                <input style={s.input} placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} required />
                <input style={s.input} type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
                <button type="submit" disabled={loading} style={{...s.btn, opacity: loading ? 0.7 : 1}}>
                    {loading ? 'Accesso in corso...' : 'ENTRA'}
                </button>
            </form>
        </div>
    );
};

// --- GESTIONE DIRETTE (LIVE BLOG) - DESIGN PRO "CONTROL ROOM" ---
const LiveManager = ({ theme }) => {
    const t = themeColors[theme];
    const [articles, setArticles] = useState([]);
    const [selected, setSelected] = useState(null);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);

    // 1. Carica articoli
    const fetchArticles = async () => {
        const res = await axios.get('https://murthnews-api.onrender.com/api/news');
        const sorted = res.data
            .filter(n => n.status === 'Pubblicato')
            .sort((a,b) => (b.isLive === a.isLive) ? 0 : b.isLive ? 1 : -1);
        setArticles(sorted);
    };

    useEffect(() => { fetchArticles(); }, []);

    const refreshSelected = async () => {
        fetchArticles(); 
        if(selected) {
            const fresh = await axios.get(`https://murthnews-api.onrender.com/api/news/${selected._id}`);
            setSelected(fresh.data);
        }
    };

    const sendUpdate = async () => {
        if(!text.trim() || !selected) return;
        setLoading(true);
        try {
            await axios.post(`https://murthnews-api.onrender.com/api/news/${selected._id}/live-update`, { text });
            setText('');
            refreshSelected(); 
        } catch(e) { alert("Errore invio"); }
        finally { setLoading(false); }
    };

    const deleteUpdate = async (updateId) => {
        if(!confirm("Eliminare questo aggiornamento?")) return;
        try {
            await axios.delete(`https://murthnews-api.onrender.com/api/news/${selected._id}/live-update/${updateId}`);
            refreshSelected();
        } catch(e) { alert("Errore eliminazione"); }
    };

    const toggleLiveStatus = async () => {
        if (!selected) return; // Sicurezza extra

        const newStatus = !selected.isLive;
        
        // Messaggio di conferma diverso in base all'azione
        if(!confirm(newStatus ? "🔴 AVVIARE LA DIRETTA?\nApparirà il bollino LIVE sul sito." : "⚫ TERMINARE LA DIRETTA?\nLa timeline rimarrà visibile come archivio.")) return;
        
        try {
            // MODIFICA QUI: Usiamo la nuova rotta specifica "/toggle-live"
            await axios.put(`https://murthnews-api.onrender.com/api/news/${selected._id}/toggle-live`, { isLive: newStatus });
            
            // Ricarichiamo i dati per vedere il cambiamento (bottone rosso/verde)
            refreshSelected();
        } catch(e) { 
            console.error(e);
            alert("Errore cambio stato: controlla la console."); 
        }
    };

    // --- STILI AVANZATI ---
    const s = {
        container: { 
            maxWidth: '1400px', margin: '0 auto', padding: '30px', height: '88vh', 
            display: 'grid', gridTemplateColumns: '320px 1fr', gap: '30px', 
            fontFamily: '"Inter", system-ui, sans-serif', color: t.text 
        },
        
        // COLONNA LISTA
        sidebar: { 
            background: t.card, borderRadius: '24px', border: `1px solid ${t.border}`, 
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.02)'
        },
        sidebarHeader: { padding: '20px', borderBottom: `1px solid ${t.border}`, background: theme==='dark'?'rgba(255,255,255,0.02)':'#f8fafc' },
        listArea: { flex: 1, overflowY: 'auto', padding: '15px' },
        
        articleCard: (active, isLive) => ({
            padding: '15px', borderRadius: '16px', marginBottom: '10px', cursor: 'pointer',
            background: active ? t.active : (theme==='dark' ? 'rgba(255,255,255,0.03)' : '#fff'),
            color: active ? '#fff' : t.text,
            border: active ? 'none' : `1px solid ${isLive ? '#fca5a5' : t.border}`,
            transition: 'all 0.2s', transform: active ? 'scale(1.02)' : 'scale(1)',
            boxShadow: active ? '0 8px 20px -5px rgba(0,0,0,0.2)' : 'none',
            position: 'relative', overflow: 'hidden'
        }),

        // COLONNA MAIN (REGIA)
        main: { 
            display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' 
        },
        
        // HEADER DIRETTA (STATUS)
        statusPanel: (isLive) => ({
            background: isLive 
                ? 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)' 
                : (theme==='dark' ? '#1e293b' : '#fff'),
            borderRadius: '24px', padding: '30px',
            color: isLive ? '#fff' : t.text,
            border: isLive ? 'none' : `1px solid ${t.border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            boxShadow: isLive ? '0 20px 50px -10px rgba(220, 38, 38, 0.3)' : '0 4px 20px rgba(0,0,0,0.02)',
            transition: 'all 0.5s ease'
        }),
        statusBadge: (isLive) => ({
            background: isLive ? '#fff' : '#e5e7eb',
            color: isLive ? '#dc2626' : '#6b7280',
            padding: '6px 14px', borderRadius: '30px', fontSize: '12px', fontWeight: '900',
            textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: isLive ? '0 0 15px rgba(255,255,255,0.5)' : 'none'
        }),
        toggleBtn: (isLive) => ({
            padding: '12px 25px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            background: isLive ? 'rgba(0,0,0,0.3)' : '#10b981',
            color: '#fff', fontWeight: 'bold', fontSize: '14px',
            display: 'flex', alignItems: 'center', gap: '8px',
            transition: 'all 0.2s'
        }),

        // AREA SCRITTURA
        inputArea: {
            background: t.card, padding: '20px', borderRadius: '24px', border: `1px solid ${t.border}`,
            display: 'flex', flexDirection: 'column', gap: '15px',
            opacity: selected?.isLive ? 1 : 0.6, pointerEvents: selected?.isLive ? 'auto' : 'none',
            transition: '0.3s'
        },
        textArea: {
            width: '100%', padding: '15px', fontSize: '16px', borderRadius: '12px',
            border: `1px solid ${t.border}`, background: t.bg, color: t.text,
            minHeight: '80px', resize: 'none', outline: 'none', fontFamily: 'inherit'
        },
        sendBtn: {
            alignSelf: 'flex-end', padding: '12px 30px', borderRadius: '50px', border: 'none',
            background: t.active, color: '#fff', fontWeight: 'bold', cursor: 'pointer',
            boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
        },

        // TIMELINE
        timelineContainer: {
            flex: 1, background: t.card, borderRadius: '24px', border: `1px solid ${t.border}`,
            padding: '25px', overflowY: 'auto', position: 'relative'
        },
        timeItem: {
            display: 'flex', gap: '20px', marginBottom: '25px', position: 'relative'
        },
        timeLine: {
            position: 'absolute', left: '60px', top: '30px', bottom: '-30px', width: '2px', background: t.border, zIndex: 0
        },
        timeBadge: {
            minWidth: '60px', textAlign: 'right', fontSize: '13px', fontWeight: '800', color: t.textSec,
            paddingTop: '3px', zIndex: 1, background: t.card // per coprire la linea
        },
        updateBox: {
            flex: 1, 
            background: theme==='dark'?'rgba(255,255,255,0.05)':'#f8fafc', 
            padding: '15px', 
            borderRadius: '12px', 
            border: `1px solid ${t.border}`,
            fontSize: '15px', 
            lineHeight: '1.5', 
            position: 'relative',

            // --- AGGIUNGI QUESTO PER NON FAR BUCARE LO SCHERMO ---
            minWidth: 0,              /* Obbliga il box a non allargarsi oltre il genitore */
            overflowWrap: 'anywhere', /* Spezza le parole/link lunghissimi */
            wordBreak: 'break-word'   /* Sicurezza extra */
        }
    };

    return (
        <div style={s.container}>
            <style>{`
                @keyframes livePulse { 0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); } 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); } }
                .live-dot { width: 10px; height: 10px; background: #dc2626; borderRadius: 50%; display: inline-block; animation: livePulse 2s infinite; }
            `}</style>

            {/* SIDEBAR SELEZIONE */}
            <div style={s.sidebar}>
                <div style={s.sidebarHeader}>
                    <h3 style={{margin:0, fontSize:'14px', textTransform:'uppercase', color: t.textSec}}>Seleziona Canale</h3>
                </div>
                <div style={s.listArea}>
                    {articles.map(a => (
                        <div key={a._id} onClick={()=>setSelected(a)} style={s.articleCard(selected?._id === a._id, a.isLive)}>
                            {a.isLive && <div style={{fontSize:'10px', color:'#dc2626', fontWeight:'900', marginBottom:'5px', display:'flex', alignItems:'center', gap:'5px'}}>● IN ONDA</div>}
                            <div style={{fontWeight:'bold', fontSize:'14px', lineHeight:'1.3'}}>{a.title}</div>
                            <div style={{fontSize:'11px', opacity:0.6, marginTop:'5px'}}>{new Date(a.createdAt).toLocaleDateString()}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* AREA PRINCIPALE */}
            <div style={s.main}>
                {selected ? (
                    <>
                        {/* 1. STATUS PANEL (REGIA) */}
                        <div style={s.statusPanel(selected.isLive)}>
                            <div>
                                <div style={s.statusBadge(selected.isLive)}>
                                    {selected.isLive ? <div className="live-dot"></div> : <div style={{width:8, height:8, background:'gray', borderRadius:'50%'}}></div>}
                                    {selected.isLive ? 'SEGNALE ATTIVO' : 'OFFLINE'}
                                </div>
                                <h2 style={{margin:'15px 0 5px 0', fontSize:'24px', fontWeight:'900'}}>{selected.title}</h2>
                                <div style={{opacity:0.8, fontSize:'14px'}}>{selected.isLive ? 'La diretta è visibile ai lettori.' : 'Attiva la diretta per iniziare a trasmettere.'}</div>
                            </div>
                            
                            <button onClick={toggleLiveStatus} style={s.toggleBtn(selected.isLive)}>
                                {selected.isLive ? '⬛ STOP DIRETTA' : '🔴 VAI LIVE'}
                            </button>
                        </div>

                        {/* 2. AREA SCRITTURA (Disabilitata se OFF) */}
                        <div style={s.inputArea}>
                            <div style={{display:'flex', justifyContent:'space-between'}}>
                                <label style={{fontSize:'11px', fontWeight:'800', textTransform:'uppercase', color: t.textSec}}>Nuovo Aggiornamento</label>
                                {!selected.isLive && <span style={{fontSize:'11px', color:'#ef4444', fontWeight:'bold'}}>⚠️ VAI LIVE PER SCRIVERE</span>}
                            </div>
                            <textarea 
                                style={s.textArea} 
                                placeholder="Scrivi qui l'aggiornamento flash..." 
                                value={text} onChange={e=>setText(e.target.value)} 
                                onKeyDown={e => {if(e.ctrlKey && e.key === 'Enter') sendUpdate()}}
                            />
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <span style={{fontSize:'11px', color:t.textSec}}>Premi Ctrl+Enter per inviare rapido</span>
                                <button onClick={sendUpdate} disabled={loading} style={s.sendBtn}>
                                    {loading ? 'INVIO...' : 'PUBBLICA ORA 🚀'}
                                </button>
                            </div>
                        </div>

                        {/* 3. TIMELINE STORICO */}
                        <div style={s.timelineContainer}>
                            <h4 style={{marginTop:0, marginBottom:'20px', color:t.textSec, fontSize:'12px', textTransform:'uppercase'}}>Feed Aggiornamenti</h4>
                            
                            {selected.liveUpdates && [...selected.liveUpdates].reverse().map((u, i, arr) => (
                                <div key={u._id || i} style={s.timeItem}>
                                    {i !== arr.length - 1 && <div style={s.timeLine}></div>}
                                    
                                    <div style={s.timeBadge}>
                                        {new Date(u.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                    </div>
                                    
                                    <div style={s.updateBox}>
                                        <div style={{whiteSpace:'pre-wrap'}}>{u.text}</div>
                                        <button 
                                            onClick={() => deleteUpdate(u._id)}
                                            style={{
                                                position:'absolute', top:'10px', right:'10px',
                                                background:'transparent', border:'none', cursor:'pointer', opacity:0.4, fontSize:'14px'
                                            }} 
                                            title="Elimina"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                            
                            {(!selected.liveUpdates || selected.liveUpdates.length === 0) && (
                                <div style={{textAlign:'center', padding:'40px', color:t.textSec, fontStyle:'italic'}}>
                                    Nessun aggiornamento. La timeline è vuota.
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    // SCHERMATA VUOTA
                    <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100%', flexDirection:'column', color:t.textSec, border:`2px dashed ${t.border}`, borderRadius:'24px'}}>
                        <div style={{fontSize:'60px', marginBottom:'20px'}}>📡</div>
                        <h3>Regia Live Blog</h3>
                        <p>Seleziona un articolo dalla colonna sinistra per iniziare.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- COMPONENTE NOTIFICA POP-UP ---
const NotificationToast = ({ notification, onClose }) => {
  if (!notification.show) return null;

  const isRedazione = notification.isNotice;
  
  return (
    <div style={{
      position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
      background: isRedazione ? '#ef4444' : '#3b82f6', // Rosso se avviso, Blu se msg normale
      color: '#fff', padding: '15px 20px', borderRadius: '12px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
      display: 'flex', alignItems: 'center', gap: '15px',
      animation: 'slideIn 0.5s ease-out', minWidth: '250px'
    }}>
      <div style={{fontSize: '24px'}}>{isRedazione ? '⚠️' : '💬'}</div>
      <div>
        <div style={{fontSize:'12px', opacity: 0.9, textTransform:'uppercase', fontWeight:'bold'}}>
          {isRedazione ? 'AVVISO URGENTE' : 'NUOVO MESSAGGIO'}
        </div>
        <div style={{fontWeight:'bold', fontSize:'14px'}}>{notification.text}</div>
      </div>
      <button onClick={onClose} style={{marginLeft:'auto', background:'transparent', border:'none', color:'#fff', cursor:'pointer', fontSize:'16px'}}>✕</button>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light'); 
  
  // STATO PER LE NOTIFICHE (Es. messaggi in arrivo o avvisi generici)
  const [notification, setNotification] = useState({ show: false, text: '', isNotice: false });

  // 1. Controllo Login e Tema
  useEffect(() => {
    const savedUser = localStorage.getItem('cms_user');
    if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        if (parsedUser.theme) setTheme(parsedUser.theme);
    }
  }, []);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('cms_user');
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    const updatedUser = { ...user, theme: newTheme };
    setUser(updatedUser);
    localStorage.setItem('cms_user', JSON.stringify(updatedUser));
    try { await axios.put(`https://murthnews-api.onrender.com/api/users/${user._id}`, { theme: newTheme }); } catch (err) {}
  };

  // --- RENDER ---
  if (!user) {
    return <LoginPage onLogin={(u) => { setUser(u); localStorage.setItem('cms_user', JSON.stringify(u)); if(u.theme) setTheme(u.theme); }} />;
  }

// --- PAGINA IMPOSTAZIONI (Logo + Dashboard + Meteo + Iscrizioni + ADS) ---
const SettingsPage = ({ theme }) => {
    const t = themeColors[theme];
    
    // 1. STATO DEL FORM (Aggiornato con campi AD)
    const [form, setForm] = useState({
        siteName: '', 
        logoUrl: '',
        weatherCity: '', weatherLat: '', weatherLon: '',
        dashboardColor: '', dashboardImage: '',
        areSubscriptionsOpen: true,
        // --- NUOVI CAMPI ADS ---
        adImage: '',      // Immagine Banner
        adLink: '',       // Link di destinazione
        adCode: '',       // Codice HTML/JS (es. Adsense)
        isAdActive: false // Interruttore On/Off
    });
    const [loading, setLoading] = useState(false);

    // 5 PRESET DI COLORE
    const themes = [
        { name: "Mystic", val: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" },
        { name: "Ocean",  val: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)" },
        { name: "Forest", val: "linear-gradient(135deg, #059669 0%, #10b981 100%)" },
        { name: "Sunset", val: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)" },
        { name: "Berry",  val: "linear-gradient(135deg, #db2777 0%, #9333ea 100%)" }
    ];

    useEffect(() => {
        axios.get('https://murthnews-api.onrender.com/api/settings').then(res => {
            if (res.data) {
                // Uniamo i dati ricevuti con i default
                setForm(prev => ({ ...prev, ...res.data }));
            }
        });
    }, []);

    const save = async () => {
        setLoading(true);
        try {
            await axios.put('https://murthnews-api.onrender.com/api/settings', form);
            alert("✅ Impostazioni salvate con successo!");
        } catch (e) { alert("Errore salvataggio"); } 
        finally { setLoading(false); }
    };

    // FUNZIONE GENERICA PER CARICARE IMMAGINI
    const handleImageUpload = (e, field) => {
        const file = e.target.files[0];
        if(file) {
            if (file.size > 5 * 1024 * 1024) return alert("File troppo grande (Max 5MB)");
            const r = new FileReader();
            r.onloadend = () => setForm(prev => ({ ...prev, [field]: r.result }));
            r.readAsDataURL(file);
        }
    };

    const setCity = (name, lat, lon) => {
        setForm(prev => ({ ...prev, weatherCity: name, weatherLat: lat, weatherLon: lon }));
    };

    const s = {
        container: { maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: '-apple-system, sans-serif', color: t.text },
        card: { background: t.card, border: `1px solid ${t.border}`, borderRadius: '20px', padding: '30px', marginBottom: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' },
        title: { fontSize: '28px', fontWeight: '900', color: t.text, marginBottom: '10px' },
        subtitle: { color: t.textSec, marginBottom: '40px' },
        label: { display: 'block', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: t.textSec, marginBottom: '8px', marginTop: '20px' },
        input: { width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${t.border}`, background: theme === 'dark' ? 'rgba(0,0,0,0.2)' : '#f8fafc', color: t.text, fontSize: '16px', outline: 'none' },
        row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
        btn: { padding: '15px 40px', background: t.active, color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', marginTop: '20px', width: '100%', boxShadow:'0 5px 15px rgba(0,0,0,0.2)' },
        presetBtn: { padding: '6px 12px', fontSize: '12px', border: `1px solid ${t.border}`, background: 'transparent', color: t.text, borderRadius: '20px', cursor: 'pointer', marginRight: '8px', marginBottom: '8px' },
        
        colorGrid: { display: 'flex', gap: '15px', marginTop: '10px' },
        colorDot: (grad, active) => ({
            width: '50px', height: '50px', borderRadius: '50%', background: grad, cursor: 'pointer',
            border: active ? '4px solid #fff' : '4px solid transparent',
            boxShadow: active ? '0 0 0 2px #4f46e5' : '0 2px 5px rgba(0,0,0,0.1)',
            transition: 'all 0.2s', transform: active ? 'scale(1.1)' : 'scale(1)'
        }),
        
        imgPreviewBox: {
            marginTop: '15px', height: '150px', width: '100%', borderRadius: '15px',
            background: `url('https://www.transparenttextures.com/patterns/cubes.png'), linear-gradient(135deg, #1e293b, #0f172a)`,
            border: `2px dashed ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden'
        },
        removeBtn: { position:'absolute', top:10, right:10, background:'rgba(0,0,0,0.6)', color:'#fff', border:'none', padding:'5px 10px', borderRadius:'20px', cursor:'pointer', fontSize:'11px', fontWeight:'bold' },
        uploadLabel: { cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', width:'100%', height:'100%', color: t.textSec }
    };

    return (
        <div style={s.container}>
            <h1 style={s.title}>⚙️ Impostazioni Redazione</h1>
            <p style={s.subtitle}>Personalizza colori, logo, sfondo e pubblicità.</p>

            {/* CARD 1: DASHBOARD */}
            <div style={s.card}>
                <h3 style={{margin:0, color: t.text}}>🎨 Aspetto Dashboard</h3>
                
                <label style={s.label}>COLORE TEMA</label>
                <div style={s.colorGrid}>
                    {themes.map((th, i) => (
                        <div key={i} style={s.colorDot(th.val, form.dashboardColor === th.val)} onClick={() => setForm({...form, dashboardColor: th.val})} title={th.name} />
                    ))}
                </div>

                <label style={s.label}>OPPURE CARICA FOTO SFONDO</label>
                <div style={s.imgPreviewBox}>
                    {form.dashboardImage ? (
                        <>
                            <div style={{width:'100%', height:'100%', backgroundImage:`url(${form.dashboardImage})`, backgroundSize:'cover', backgroundPosition:'center'}}></div>
                            <button onClick={(e) => { e.preventDefault(); setForm({...form, dashboardImage: ''}); }} style={s.removeBtn}>RIMUOVI FOTO</button>
                        </>
                    ) : (
                        <label style={s.uploadLabel}>
                            <span style={{fontSize:'24px'}}>🖼️</span>
                            <span style={{fontSize:'12px', marginTop:'5px'}}>Clicca per caricare sfondo</span>
                            <input type="file" onChange={(e) => handleImageUpload(e, 'dashboardImage')} accept="image/*" style={{display:'none'}} />
                        </label>
                    )}
                </div>
            </div>

            {/* CARD 2: IDENTITÀ & METEO */}
            <div style={s.card}>
                <h3 style={{margin:0, color: t.text}}>🌍 Identità & Meteo</h3>
                
                <label style={s.label}>LOGO SITO (PNG Trasparente consigliato)</label>
                <div style={{...s.imgPreviewBox, height:'100px'}}> 
                    {form.logoUrl ? (
                        <>
                            <img src={form.logoUrl} alt="Logo" style={{maxWidth:'80%', maxHeight:'80px', objectFit:'contain'}} />
                            <button onClick={(e) => { e.preventDefault(); setForm({...form, logoUrl: ''}); }} style={s.removeBtn}>RIMUOVI LOGO</button>
                        </>
                    ) : (
                        <label style={s.uploadLabel}>
                            <span style={{fontSize:'24px'}}>💎</span>
                            <span style={{fontSize:'12px', marginTop:'5px'}}>Clicca per caricare Logo</span>
                            <input type="file" onChange={(e) => handleImageUpload(e, 'logoUrl')} accept="image/*" style={{display:'none'}} />
                        </label>
                    )}
                </div>

                <label style={s.label}>NOME TESTATA</label>
                <input style={s.input} value={form.siteName} onChange={e => setForm({...form, siteName: e.target.value})} placeholder="Es. MurthNews" />
                
                <label style={s.label}>CITTÀ METEO</label>
                <div style={{marginBottom:'10px'}}>
                    <button onClick={() => setCity('Milano', 45.46, 9.19)} style={s.presetBtn}>Milano</button>
                    <button onClick={() => setCity('Roma', 41.90, 12.49)} style={s.presetBtn}>Roma</button>
                    <button onClick={() => setCity('Napoli', 40.85, 14.26)} style={s.presetBtn}>Napoli</button>
                </div>
                <div style={s.row}>
                    <input style={s.input} value={form.weatherCity} onChange={e => setForm({...form, weatherCity: e.target.value})} placeholder="Nome città" />
                    <div style={{display:'none'}}></div>
                </div>
            </div>

            {/* CARD 3: ISCRIZIONI */}
            <div style={s.card}>
                <h3 style={{margin:0, color: t.text}}>🚦 Controllo Iscrizioni</h3>
                <p style={{color: t.textSec, marginBottom: '20px', fontSize:'14px'}}>
                    Se disattivi questo interruttore, nessun nuovo utente potrà abbonarsi.
                </p>

                <label style={{
                    display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', padding: '15px', borderRadius: '12px',
                    border: form.areSubscriptionsOpen !== false ? `2px solid #22c55e` : `2px solid #ef4444`,
                    background: form.areSubscriptionsOpen !== false ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                    transition: 'all 0.3s ease'
                }}>
                    <div style={{position:'relative', width:'50px', height:'28px'}}>
                        <input 
                            type="checkbox" 
                            checked={form.areSubscriptionsOpen !== false} 
                            onChange={(e) => setForm({...form, areSubscriptionsOpen: e.target.checked})}
                            style={{opacity:0, width:0, height:0}}
                        />
                        <div style={{
                            position:'absolute', inset:0, borderRadius:'30px', 
                            background: form.areSubscriptionsOpen !== false ? '#22c55e' : '#cbd5e1', transition: 'background 0.3s'
                        }}></div>
                        <div style={{
                            position:'absolute', top:'4px', left:'4px', width:'20px', height:'20px', borderRadius:'50%', background:'#fff', boxShadow:'0 2px 5px rgba(0,0,0,0.2)',
                            transform: form.areSubscriptionsOpen !== false ? 'translateX(22px)' : 'translateX(0)', transition: 'transform 0.3s'
                        }}></div>
                    </div>
                    
                    <span style={{fontWeight: '800', fontSize: '15px', color: form.areSubscriptionsOpen !== false ? '#15803d' : '#b91c1c'}}>
                        {form.areSubscriptionsOpen !== false ? "✅ ISCRIZIONI APERTE" : "⛔ ISCRIZIONI BLOCCATE"}
                    </span>
                </label>
            </div>

            {/* CARD 4: PUBBLICITÀ (ADS) - NUOVA SEZIONE */}
            <div style={s.card}>
                <h3 style={{margin:0, color: t.text}}>📢 Gestione Pubblicità</h3>
                <p style={{color: t.textSec, marginBottom: '20px', fontSize:'14px'}}>
                    Gestisci il box pubblicitario che appare nell'angolo degli articoli.
                </p>

                {/* Toggle Attivo/Disattivo */}
                <label style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px', cursor:'pointer'}}>
                    <div style={{position:'relative', width:'50px', height:'28px'}}>
                        <input 
                            type="checkbox" 
                            checked={form.isAdActive || false} 
                            onChange={(e) => setForm({...form, isAdActive: e.target.checked})}
                            style={{opacity:0, width:0, height:0}}
                        />
                        <div style={{position:'absolute', inset:0, borderRadius:'30px', background: form.isAdActive ? '#22c55e' : '#cbd5e1', transition: 'background 0.3s'}}></div>
                        <div style={{position:'absolute', top:'4px', left:'4px', width:'20px', height:'20px', borderRadius:'50%', background:'#fff', boxShadow:'0 2px 5px rgba(0,0,0,0.2)', transform: form.isAdActive ? 'translateX(22px)' : 'translateX(0)', transition: 'transform 0.3s'}}></div>
                    </div>
                    <span style={{fontWeight:'800', fontSize:'14px', color: form.isAdActive ? '#22c55e' : t.textSec}}>
                        {form.isAdActive ? "✅ BANNER ATTIVO" : "⛔ BANNER NASCOSTO"}
                    </span>
                </label>

                <div style={{opacity: form.isAdActive ? 1 : 0.5, pointerEvents: form.isAdActive ? 'auto' : 'none', transition: 'opacity 0.3s'}}>
                    <label style={s.label}>OPZIONE A: FOTO PERSONALIZZATA</label>
                    <input 
                        style={{...s.input, marginBottom: '10px'}} 
                        placeholder="Link di destinazione (es. https://sponsor.com)..." 
                        value={form.adLink || ''} 
                        onChange={e => setForm({...form, adLink: e.target.value})} 
                    />

                    <div style={{...s.imgPreviewBox, height:'200px'}}>
                        {form.adImage ? (
                            <>
                                <img src={form.adImage} alt="Ad" style={{maxWidth:'100%', maxHeight:'100%', objectFit:'contain'}} />
                                <button onClick={(e) => { e.preventDefault(); setForm({...form, adImage: ''}); }} style={s.removeBtn}>RIMUOVI BANNER</button>
                            </>
                        ) : (
                            <label style={s.uploadLabel}>
                                <span style={{fontSize:'24px'}}>📣</span>
                                <span style={{fontSize:'12px', marginTop:'5px'}}>Carica Banner (es. 300x250)</span>
                                <input type="file" onChange={(e) => handleImageUpload(e, 'adImage')} accept="image/*" style={{display:'none'}} />
                            </label>
                        )}
                    </div>

                    <div style={{textAlign:'center', margin:'20px 0', fontWeight:'bold', color:t.textSec, fontSize:'12px'}}>--- OPPURE ---</div>

                    <label style={s.label}>OPZIONE B: CODICE ESTERNO (AdSense / Script)</label>
                    <textarea 
                        style={{...s.input, minHeight:'100px', fontFamily:'monospace', fontSize:'12px', resize:'vertical'}}
                        placeholder="Incolla qui lo script fornito dall'inserzionista (es. <script>...</script>)"
                        value={form.adCode || ''}
                        onChange={e => setForm({...form, adCode: e.target.value})}
                    />
                </div>
            </div>

            <button onClick={save} disabled={loading} style={{...s.btn, opacity: loading ? 0.7 : 1}}>
                {loading ? 'SALVATAGGIO...' : 'SALVA MODIFICHE'}
            </button>
        </div>
    );
};

  return (
    <BrowserRouter>
      {/* CORREZIONE: Passiamo setUser al Layout per aggiornare i permessi in tempo reale */}
      <Layout 
          user={user} 
          setUser={setUser} // <--- QUESTA È LA PARTE AGGIUNTA IMPORTANTE
          onLogout={handleLogout} 
          theme={theme} 
          toggleTheme={toggleTheme}
      >
        
        <NotificationToast notification={notification} onClose={() => setNotification({...notification, show: false})} />

        <Routes>
          <Route path="/" element={<Dashboard user={user} theme={theme} />} />
          
          {/* AI & TOOLS */}
          <Route path="/ai-assistant" element={<AIChatPage user={user} theme={theme} />} />
          <Route path="/logs" element={user.role === 'Redattore' ? <ActivityLogs theme={theme} /> : <Navigate to="/" />} />
          <Route path="/settings" element={user.role === 'Redattore' ? <SettingsPage theme={theme} /> : <Navigate to="/" />} />
          <Route path="/external-users" element={user.role === 'Redattore' ? <ExternalUsersManager theme={theme} /> : <Navigate to="/" />} />
          <Route path="/mail" element={<MailPage user={user} theme={theme} />} />
          <Route path="/notifications" element={<NotificationsPage user={user} theme={theme} />} />
          <Route path="/reviews" element={user.role === 'Redattore' ? <ReviewPage user={user} theme={theme} /> : <Navigate to="/" />} />
          <Route path="/media" element={<MediaGallery user={user} theme={theme} />} />
          
          {/* PAGINE STATICHE */}
          <Route path="/pages" element={<PagesList theme={theme} />} />
          <Route path="/write-page" element={<WritePage theme={theme} />} />
          <Route path="/write-page/:id" element={<WritePage theme={theme} />} />
          <Route path="/p/:slug" element={<PageView theme={theme} />} />
          
          {/* NEWS */}
          <Route path="/breaking" element={<BreakingPage theme={theme} />} />
          <Route path="/write-news" element={<WriteNews user={user} theme={theme} />} />
          <Route path="/news-list" element={<NewsList user={user} theme={theme} />} />
          <Route path="/edit-news/:id" element={<WriteNews user={user} theme={theme} />} />
          <Route path="/categories" element={<CategoriesManager theme={theme} />} />
          <Route path="/read-news/:id" element={<ReadNews user={user} theme={theme} />} />
          <Route path="/search-results" element={<SearchResultsPage user={user} theme={theme} />} />
          
          {/* GESTIONE UTENTI & PROFILO */}
          {/* 👇 CORRETTO QUI: Aggiunto currentUser e uniformato il path */}
          <Route path="/users/profile/:id" element={<UserProfile currentUser={user} theme={theme} />} />
          <Route path="/users/edit/:id" element={<UserEdit user={user} theme={theme} />} />
          
          <Route path="/users" element={user.role === 'Redattore' ? <UsersList theme={theme} /> : <Navigate to="/" />} />
          <Route path="/users/create" element={user.role === 'Redattore' ? <UserCreate theme={theme} /> : <Navigate to="/" />} />
          <Route path="/users/profile/:id" element={<UserProfile currentUser={user} theme={theme} />} />
          {/* NUOVE ROTTE SEZIONE LETTORI */}
          <Route path="/readers/logs" element={<ReaderLogs theme={theme} />} />
          <Route path="/readers/email" element={<ReaderEmail theme={theme} />} />
          <Route path="/readers/subs" element={<ReaderSubs theme={theme} />} />
          <Route path="/readers/revenue" element={<ReaderRevenue theme={theme} />} />
          <Route path="/live" element={<LiveManager theme={theme} />} />
          <Route path="/menu-manager" element={<MenuManager theme={theme} />} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;