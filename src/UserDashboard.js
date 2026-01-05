import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; 
import './App.css'; 
import SiteLogo from './SiteLogo';

function UserDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [prices, setPrices] = useState({ premium: 1.99, full: 5.99 });
  const [theme, setTheme] = useState('light');
  
  // --- 1. MOTORE DI RICERCA ---
  const [searchTerm, setSearchTerm] = useState(''); 

  const handleSearch = (e) => {
    e.preventDefault(); 
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  const applyTheme = (mode) => {
      if (mode === 'dark') {
          document.body.classList.add('dark-theme');
      } else {
          document.body.classList.remove('dark-theme');
      }
  };

  // --- 2. CARICAMENTO DATI ---
  useEffect(() => {
    const storedUser = localStorage.getItem('reader_user');

    if (!storedUser) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    
    // Controllo base integrità
    if (!parsedUser || !parsedUser._id) {
       localStorage.removeItem('reader_user');
       navigate('/login');
       return;
    }

    // Imposta stato iniziale
    setUser(parsedUser);
    const savedTheme = parsedUser.theme || 'light';
    setTheme(savedTheme);
    applyTheme(savedTheme);

    // SYNC DATI FRESCHI DAL SERVER
    axios.get(`https://murthnews-api.onrender.com/api/users/${parsedUser._id}`)
         .then(res => {
             if(res.data) {
                setUser(res.data);
                localStorage.setItem('reader_user', JSON.stringify(res.data));
             }
         })
         .catch(err => console.log("Errore sync utente:", err));

    // CARICA PREZZI
    axios.get('https://murthnews-api.onrender.com/api/settings')
          .then(res => {
              if (res.data) {
                  setPrices({
                      premium: res.data.pricePremium || 1.99,
                      full: res.data.priceFull || 5.99
                  });
              }
          })
          .catch(err => console.log("Uso prezzi default"));

  }, [navigate]);

  // --- AZIONI UTENTE ---
  const toggleTheme = async () => {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);    
      applyTheme(newTheme);  

      const updatedUser = { ...user, theme: newTheme };
      setUser(updatedUser);
      localStorage.setItem('reader_user', JSON.stringify(updatedUser));

      try {
          await axios.put('https://murthnews-api.onrender.com/api/reader/update', {
              id: user._id,
              theme: newTheme
          });
      } catch (e) {
          console.error("Errore salvataggio tema", e);
      }
  };

  const handleLogout = () => {
    localStorage.removeItem('reader_user');
    document.body.classList.remove('dark-theme');
    navigate('/');
    window.location.reload(); 
  };

  if (!user) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera";

  const planDetails = {
    standard: { label: 'Free Start', class: 'standard', price: 'Gratuito' },
    free:     { label: 'Free Start', class: 'standard', price: 'Gratuito' },
    premium:  { label: 'Premium', class: 'premium', price: `€${prices.premium} /mese` },
    abbonato: { label: 'Full Pass', class: 'abbonato', price: `€${prices.full} /mese` }
  };

  const currentPlan = planDetails[user.livello] || planDetails.standard;
  const isFreePlan = user.livello === 'standard' || user.livello === 'free';
  const hasInterests = user.interessi && user.interessi.length > 0;

  // Calcolo Contatori
  const savedCount = user.savedArticles ? user.savedArticles.length : 0;
  const likedCount = user.likedArticles ? user.likedArticles.length : 0;

  return (
    <div className="modern-dash">
      
      {/* HEADER */}
      <header className="dash-hero">
          <div>
            <div className="dash-date">
                {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <h1>{greeting}, <span className="highlight-name">{user.nome}</span>.</h1>
          </div>
          <button onClick={() => navigate('/')} style={{background:'transparent', border:'1px solid var(--border-color)', padding:'10px 25px', borderRadius:'30px', cursor:'pointer', fontWeight:'bold', color:'var(--text-main)', boxShadow:'0 4px 10px rgba(0,0,0,0.05)'}}>
              Vai al Giornale →
          </button>
      </header>

      <div className="dash-layout">
        
        {/* SIDEBAR */}
        <aside className="dash-sidebar">
          <div className="profile-widget">
            <div className="avatar-ring">
                {user.profileImage ? (
                    <img 
                        src={user.profileImage} 
                        alt="Profile" 
                        style={{width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%', display:'block'}} 
                    />
                ) : (
                    <div className="avatar-content">{user.nome.charAt(0)}</div>
                )}
            </div>
            <h3>{user.nome} {user.cognome}</h3>
            <p className="email-label">{user.email}</p>
          </div>
          
          <nav className="minimal-menu">
            <button className="menu-item active">
                <span className="icon">🏠</span> Dashboard
            </button>
            <button className="menu-item" onClick={() => navigate('/dashboard/library')}>
                <span className="icon">📚</span> La mia Libreria
            </button>
            <button className="menu-item" onClick={() => navigate('/reader/settings')}>
                <span className="icon">⚙️</span> Profilo
            </button>
            <button className="menu-item" onClick={toggleTheme}>
                <span className="icon">{theme === 'light' ? '🌙' : '☀️'}</span> 
                {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </button>
            <button className="menu-item action-btn" onClick={() => navigate('/dashboard/subscription')}>
                <span className="icon">💳</span> Abbonamento
            </button>
            <div className="divider"></div>
            <button className="menu-item logout-btn" onClick={handleLogout}>
                <span className="icon">🚪</span> Esci
            </button>
          </nav>
        </aside>

        {/* CONTENUTO PRINCIPALE */}
        <main className="dash-content">
           
           {/* CARD PIANO */}
           <div className={`status-card ${currentPlan.class}`}>
              <div>
                  <div className="status-header">
                      <span className="status-label">PIANO ATTUALE</span>
                      <span className="status-badge">● ATTIVO</span>
                  </div>
                  <div className="plan-info">
                    <h2>{currentPlan.label}</h2>
                    <div className="plan-price">{currentPlan.price}</div>
                  </div>
              </div>
              <div className="status-footer">
                <div className="meta-item">
                    <small>Membro dal</small>
                    <strong>{new Date(user.dataIscrizione || Date.now()).toLocaleDateString('it-IT')}</strong>
                </div>
                <div className="meta-item">
                    <small>Rinnovo / Scadenza</small>
                    <strong>
                        {isFreePlan ? "Illimitata" : (
                            user.scadenzaAbbonamento 
                            ? new Date(user.scadenzaAbbonamento).toLocaleDateString('it-IT')
                            : "N/D"
                        )}
                    </strong>
                </div>
              </div>
           </div>

           {/* --- MOTORE DI RICERCA (IL TUO ORIGINALE) --- */}
           <div style={{
               margin: '30px 0', 
               padding: '40px', 
               borderRadius: '24px', 
               background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
               color: 'white', 
               textAlign: 'center',
               boxShadow: '0 10px 25px rgba(118, 75, 162, 0.3)',
               position: 'relative',
               overflow: 'hidden'
           }}>
               <div style={{position:'relative', zIndex:2}}>
                   <h2 style={{margin:'0 0 15px 0', fontSize:'1.8rem'}}>Cosa vuoi leggere oggi?</h2>
                   <p style={{opacity:0.9, marginBottom:'25px'}}>Cerca tra migliaia di articoli, autori e tag.</p>
                   
                   <div style={{display:'flex', gap:'10px', maxWidth:'500px', margin:'0 auto'}}>
                       <input 
                         type="text" 
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                         onKeyDown={(e) => {
                             if (e.key === 'Enter' && searchTerm.trim()) {
                                 navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
                             }
                         }}
                         placeholder="Digita un argomento..." 
                         style={{
                             flex: 1, padding: '15px 25px', borderRadius: '50px', border: 'none', outline: 'none', fontSize: '1rem',
                             boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                         }}
                       />
                       <button 
                           type="button" 
                           onClick={() => {
                               if (searchTerm.trim()) navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
                           }}
                           style={{
                               padding: '15px 25px', borderRadius: '50px', border: 'none', background: '#fff', color: '#764ba2',
                               fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', transition: 'transform 0.2s'
                           }}
                       >
                           Cerca
                       </button>
                   </div>
               </div>
               
               {/* Decorazioni sfondo */}
               <div style={{position:'absolute', top:'-50%', left:'-10%', width:'300px', height:'300px', background:'rgba(255,255,255,0.1)', borderRadius:'50%'}}></div>
               <div style={{position:'absolute', bottom:'-50%', right:'-10%', width:'300px', height:'300px', background:'rgba(255,255,255,0.1)', borderRadius:'50%'}}></div>
           </div>

           {/* --- WIDGET LIBRERIA (Salvati & Like) --- */}
           <div onClick={() => navigate('/dashboard/library')} style={{
               display: 'flex', justifyContent: 'space-around', alignItems: 'center',
               background: 'var(--card-bg)', border: '1px solid var(--border-color)',
               borderRadius: '20px', padding: '25px', marginBottom: '40px',
               cursor: 'pointer', boxShadow: '0 5px 20px rgba(0,0,0,0.05)',
               transition: 'transform 0.2s'
           }}
           onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
           onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
           >
                {/* Parte Sinistra: Salvati */}
                <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                    <div style={{width:'50px', height:'50px', background:'#eff6ff', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem'}}>
                        🔖
                    </div>
                    <div>
                        <div style={{fontSize:'2rem', fontWeight:'900', color:'var(--text-main)', lineHeight:'1'}}>{savedCount}</div>
                        <div style={{fontSize:'0.85rem', color:'var(--text-muted)', fontWeight:'bold', textTransform:'uppercase'}}>Salvati</div>
                    </div>
                </div>

                {/* Divisore verticale */}
                <div style={{width:'1px', height:'50px', background:'var(--border-color)'}}></div>

                {/* Parte Destra: Like */}
                <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                    <div style={{width:'50px', height:'50px', background:'#fef2f2', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem'}}>
                        ❤️
                    </div>
                    <div>
                        <div style={{fontSize:'2rem', fontWeight:'900', color:'var(--text-main)', lineHeight:'1'}}>{likedCount}</div>
                        <div style={{fontSize:'0.85rem', color:'var(--text-muted)', fontWeight:'bold', textTransform:'uppercase'}}>Mi Piace</div>
                    </div>
                </div>

                {/* Freccia */}
                <div style={{fontSize:'1.5rem', color:'var(--text-muted)'}}>➜</div>
           </div>


           {/* --- SEZIONE ESPLORA --- */}
           <h3 style={{fontSize:'1.5rem', fontWeight:'800', marginBottom:'20px', color:'var(--text-main)'}}>Esplora</h3>
           
           {/* STILE ANIMAZIONE PULSAGGIO */}
           <style>{`
               @keyframes pulse-back {
                   0% { transform: translate(-50%, -50%) scale(1); opacity: 0.1; }
                   50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.25; }
                   100% { transform: translate(-50%, -50%) scale(1); opacity: 0.1; }
               }
           `}</style>

           <div className="content-grid">
               
               {/* 1. WIDGET "IL TUO FEED" (NUOVO DESIGN CUORE) */}
               <div className="dashboard-box" 
                    onClick={() => navigate(hasInterests ? '/dashboard/interests' : '/reader/settings#interests')}
                    style={{
                        position: 'relative', overflow: 'hidden', cursor: 'pointer',
                        border: '2px solid #fda4af', 
                        background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)', 
                        color: '#881337', minHeight: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'center'
                    }}
               >
                   {/* CUORE SFONDO ANIMATO */}
                   <div style={{
                       position: 'absolute', top: '50%', left: '50%', 
                       transform: 'translate(-50%, -50%)',
                       fontSize: '12rem', color: '#be123c', 
                       lineHeight: 0, pointerEvents: 'none',
                       animation: 'pulse-back 2s infinite ease-in-out'
                   }}>
                       ❤️
                   </div>

                   {/* Contenuto */}
                   <div style={{position: 'relative', zIndex: 2, textAlign:'center'}}>
                       <div style={{fontSize:'3rem', marginBottom:'5px'}}>
                           {hasInterests ? '😍' : '💘'}
                       </div>
                       <h4 style={{fontSize:'1.4rem', fontWeight:'900', margin:'0 0 5px 0', color: '#be123c'}}>
                           {hasInterests ? "IL TUO FEED" : "CREA FEED"}
                       </h4>
                       <p style={{fontSize:'0.9rem', color: '#9f1239', fontWeight:'600', marginBottom:'15px'}}>
                           {hasInterests ? "Le news che ami, tutte qui." : "Scegli cosa ti piace."}
                       </p>
                       <span style={{
                           background: '#be123c', color: 'white', padding: '8px 20px', 
                           borderRadius: '30px', fontSize:'0.85rem', fontWeight:'bold',
                           boxShadow: '0 4px 10px rgba(190, 18, 60, 0.3)'
                       }}>
                           {hasInterests ? "Sfoglia ➜" : "Inizia ➜"}
                       </span>
                   </div>
               </div>

               {/* 2. NEWSLETTER */}
               <div className="dashboard-box">
                   <div className="box-icon">📩</div>
                   <h4 className="box-title">Newsletter</h4>
                   <p className="box-desc">Rimani aggiornato via email.</p>
                   <button onClick={() => navigate('/reader/settings')} className="clean-btn small" style={{marginTop:'auto', background:'transparent', color:'var(--text-main)', border:'1px solid var(--text-main)'}}>Imposta</button>
               </div>
               
               {/* 3. PODCAST */}
               <div className="dashboard-box" style={{opacity:0.7}}>
                   <div className="box-icon">🎙️</div>
                   <h4 className="box-title">Podcast</h4>
                   <p className="box-desc">In arrivo per ascoltare gli articoli.</p>
               </div>
           </div>

        </main>
      </div>
    </div>
  );
}

export default UserDashboard;