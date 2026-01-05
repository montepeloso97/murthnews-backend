import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; 
import './App.css'; 
import SiteLogo from './SiteLogo'; 

// 🎨 COLORI DINAMICI
const themeColors = {
  light: { bg: '#ffffff', text: '#1e293b', card: '#f8fafc', border: '#e2e8f0', link: '#2563eb' },
  dark: { bg: '#0f172a', text: '#ffffff', card: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255,255,255,0.1)', link: '#4facfe' }
};

const PolicyPage = ({ theme = 'dark' }) => {
  const navigate = useNavigate();
  const t = themeColors[theme] || themeColors.dark;

  // --- STATI ---
  const [prices, setPrices] = useState({ premium: 1.99, full: 5.99 });
  const [currentUser, setCurrentUser] = useState(null);
  const [team, setTeam] = useState([]);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);

    // 1. Recupera Prezzi
    axios.get('https://murthnews-api.onrender.com/api/settings')
      .then(res => { if (res.data) setPrices({ premium: res.data.pricePremium || 1.99, full: res.data.priceFull || 5.99 }); })
      .catch(() => {});

    // 2. Utente (Serve anche per capire se mostrare "Chiudi" o "Home")
    const stored = localStorage.getItem('reader_user');
    if (stored) { try { setCurrentUser(JSON.parse(stored)); } catch (e) {} }

    // 3. Team (Staff)
    axios.get('https://murthnews-api.onrender.com/api/users') 
      .then(res => {
          const allowedRoles = ['admin', 'editor', 'journalist', 'moderator', 'amministratore', 'redattore', 'giornalista', 'editore'];
          const staff = res.data.filter(u => u.role && allowedRoles.includes(u.role.toLowerCase()));
          if(staff.length > 0) setTeam(staff);
      })
      .catch(() => {
          setTeam([{ _id: 'd1', nome: 'Redazione', cognome: 'Murth', role: 'Team', profileImage: null }]);
      });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- FUNZIONE USCITA INTELLIGENTE ---
  const handleExit = () => {
      if (currentUser) {
          navigate(-1); // Se loggato, torna indietro
      } else {
          navigate('/'); // Se ospite, vai alla Home
      }
  };

  const isPremiumActive = currentUser?.livello === 'premium';
  const isFullActive = currentUser?.livello === 'abbonato' || currentUser?.livello === 'full';

  // STILI INTERNI
  const styles = {
      sectionTitle: { fontSize: '2.5rem', fontWeight: '800', marginBottom: '15px', background: 'linear-gradient(to right, #fff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
      cardGlass: { background: t.card, backdropFilter: 'blur(10px)', border: `1px solid ${t.border}`, borderRadius: '20px', padding: '30px' },
  };

  return (
    <div className="policy-page" style={{background: t.bg, minHeight: '100vh', color: t.text, fontFamily: "'Inter', sans-serif", overflowX:'hidden', transition: 'background 0.3s, color 0.3s'}}>
      
      {/* ANIMAZIONI CSS */}
      <style>{`
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-20px); } 100% { transform: translateY(0px); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .anim-fadeup { animation: fadeUp 0.8s ease-out forwards; }
        .hero-img-mob { max-width: 100%; height: auto; animation: float 6s ease-in-out infinite; }
        @media (max-width: 768px) {
            .policy-hero { flex-direction: column-reverse; padding-top: 100px !important; text-align: center; }
            .hero-text h1 { font-size: 2.5rem !important; }
            .grid-rules, .flex-team { flex-direction: column; }
            .subs-container { flex-direction: column; align-items: center; }
        }
      `}</style>

      {/* --- NAVBAR DINAMICA --- */}
      <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 100, 
          padding: scrolled ? '10px 5%' : '30px 5%',
          background: scrolled ? (theme === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255,255,255,0.95)') : 'transparent',
          backdropFilter: scrolled ? 'blur(10px)' : 'none',
          borderBottom: scrolled ? `1px solid ${t.border}` : 'none',
          transition: 'all 0.3s ease',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
          <div onClick={() => navigate('/')} style={{cursor: 'pointer'}}>
              <SiteLogo theme={theme} />
          </div>

          {/* BOTTONE INTELLIGENTE */}
          <button onClick={handleExit} style={{
              background: t.card, color: t.text, border:`1px solid ${t.border}`, 
              padding:'8px 20px', borderRadius:'20px', cursor:'pointer', fontSize:'0.9rem', fontWeight:'bold',
              display: 'flex', alignItems: 'center', gap: '8px'
          }}>
              {currentUser ? '✕ Chiudi' : '🏠 Torna alla Home'}
          </button>
      </div>

      {/* --- HERO SECTION --- */}
      <header className="policy-hero" style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'150px 10% 80px 10%', minHeight:'80vh', position:'relative'}}>
        <div className="hero-text anim-fadeup" style={{flex:1, maxWidth:'600px'}}>
          <h5 style={{color:'#4facfe', letterSpacing:'2px', fontWeight:'bold', marginBottom:'10px'}}>TRANSPARENCY HUB</h5>
          <h1 style={{fontSize:'3.5rem', lineHeight:'1.1', marginBottom:'20px'}}>La verità,<br/>prima di tutto.</h1>
          <p style={{fontSize:'1.2rem', lineHeight:'1.6', opacity:0.8, marginBottom:'40px'}}>
            Non siamo solo un giornale, siamo una cassaforte per le tue informazioni e una garanzia di fatti verificati. 
            Qui ti spieghiamo come lavoriamo, come verifichiamo le notizie e come proteggiamo i tuoi dati.
          </p>
          
          <div style={{display:'flex', gap:'15px', flexWrap:'wrap', justifyContent: 'flex-start'}}>
            {['🔒 Dati Criptati', '⚖️ Etica Ferrea', 'Fact-Checking', '🚫 Zero Fake News'].map(tag => (
                <span key={tag} style={{background: t.card, padding:'8px 16px', borderRadius:'30px', fontSize:'0.9rem', border:`1px solid ${t.border}`}}>{tag}</span>
            ))}
          </div>
        </div>

        <div className="hero-image-container anim-fadeup" style={{flex:1, display:'flex', justifyContent:'center', position:'relative', animationDelay:'0.2s'}}>
          <img src="https://images.unsplash.com/photo-1633265486064-086b219458ec?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Shield 3D" className="hero-img-mob" style={{borderRadius:'40px', boxShadow:'0 20px 50px rgba(0,0,0,0.5)', maxWidth:'80%'}} />
          <div style={{position:'absolute', bottom:'-30px', left:'10%', background: theme==='dark'?'#1e293b':'white', padding:'20px', borderRadius:'20px', boxShadow:'0 10px 30px rgba(0,0,0,0.4)', display:'flex', alignItems:'center', gap:'15px', border:`1px solid ${t.border}`}}>
              <div style={{fontSize:'2rem'}}>✅</div>
              <div>
                  <div style={{fontWeight:'bold', fontSize:'0.9rem'}}>100% Verificato</div>
                  <div style={{fontSize:'0.7rem', opacity:0.6}}>Standard Editoriale</div>
              </div>
          </div>
        </div>
      </header>

      {/* --- SEZIONE 1: IL NOSTRO METODO --- */}
      <section style={{padding:'80px 10%', background: theme==='dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc'}}>
          <h2 style={{...styles.sectionTitle, textAlign:'center'}}>Come Lavoriamo</h2>
          <p style={{textAlign:'center', maxWidth:'700px', margin:'0 auto 50px auto', opacity:0.7}}>Le regole che seguiamo ogni giorno per garantirti un'informazione pulita.</p>

          <div className="grid-rules" style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:'30px'}}>
              <div style={styles.cardGlass}>
                  <div style={{fontSize:'2.5rem', marginBottom:'15px'}}>🕵️‍♂️</div>
                  <h3 style={{fontSize:'1.4rem', marginBottom:'10px'}}>Fact-Checking Ossessivo</h3>
                  <p style={{opacity:0.8, lineHeight:'1.6'}}>
                      Ogni articolo passa attraverso tre livelli di verifica. Incrociamo almeno due fonti indipendenti prima di pubblicare. Se sbagliamo, rettifichiamo con evidenza.
                  </p>
              </div>
              <div style={styles.cardGlass}>
                  <div style={{fontSize:'2.5rem', marginBottom:'15px'}}>🪙</div>
                  <h3 style={{fontSize:'1.4rem', marginBottom:'10px'}}>Zero Conflitti</h3>
                  <p style={{opacity:0.8, lineHeight:'1.6'}}>
                      Siamo indipendenti. Non accettiamo denaro per "spingere" notizie e non abbiamo editori occulti. Viviamo solo grazie al supporto dei lettori.
                  </p>
              </div>
              <div style={styles.cardGlass}>
                  <div style={{fontSize:'2.5rem', marginBottom:'15px'}}>📚</div>
                  <h3 style={{fontSize:'1.4rem', marginBottom:'10px'}}>Le Fonti</h3>
                  <p style={{opacity:0.8, lineHeight:'1.6'}}>
                      Privilegiamo fonti primarie, documenti ufficiali e testimonianze dirette. Il "sentito dire" qui non trova spazio.
                  </p>
              </div>
          </div>
      </section>

      {/* --- SEZIONE 2: PRIVACY & TECNOLOGIA --- */}
      <section style={{padding:'80px 10%', background: theme==='dark' ? '#0f172a' : '#ffffff'}}>
          <div style={{maxWidth:'800px', margin:'0 auto'}}>
              <h2 style={{fontSize:'2rem', fontWeight:'bold', marginBottom:'20px'}}>🔒 Privacy & I tuoi Dati</h2>
              <p style={{marginBottom:'30px', opacity:0.8}}>
                  La trasparenza non riguarda solo le notizie, ma anche i tuoi dati personali. Ecco dove sono e come li proteggiamo.
              </p>
              
              <div style={{display:'grid', gap:'20px'}}>
                  <div style={{padding:'20px', borderLeft:`4px solid #4facfe`, background: t.card}}>
                      <strong>Dove sono i dati?</strong><br/>
                      Utilizziamo <em>MongoDB Atlas</em> (Database sicuri) per i testi e <em>Cloudinary</em> per le immagini. I server sono protetti e monitorati h24.
                  </div>
                  <div style={{padding:'20px', borderLeft:`4px solid #4facfe`, background: t.card}}>
                      <strong>Password Criptate</strong><br/>
                      Non leggiamo la tua password. Viene trasformata in un codice indecifrabile (Hash Bcrypt) nel momento in cui ti registri.
                  </div>
                  <div style={{padding:'20px', borderLeft:`4px solid #4facfe`, background: t.card}}>
                      <strong>Diritto all'Oblio</strong><br/>
                      Puoi eliminare il tuo account e tutti i tuoi dati (commenti, profilo, storico) in qualsiasi momento dalle tue Impostazioni.
                  </div>
              </div>
          </div>
      </section>

      {/* --- SEZIONE 3: LA REDAZIONE --- */}
      <section style={{padding:'80px 10%', background: theme==='dark' ? '#1e293b' : '#e2e8f0'}}>
          <div style={{marginBottom:'50px'}}>
             <h2 style={styles.sectionTitle}>Chi ci mette la faccia?</h2>
             <p style={{opacity:0.7}}>Dietro ogni pixel e ogni parola ci sono persone reali. Ecco la nostra squadra.</p>
          </div>

          <div className="flex-team" style={{display:'flex', gap:'30px', overflowX:'auto', paddingBottom:'20px', scrollSnapType: 'x mandatory'}}>
              {team.map(member => (
                  <div key={member._id} style={{
                      minWidth:'220px', 
                      background: t.card, 
                      borderRadius:'24px', 
                      padding:'25px', 
                      textAlign:'center',
                      border: `1px solid ${t.border}`,
                      scrollSnapAlign: 'start'
                  }}>
                      <div style={{width:'90px', height:'90px', borderRadius:'50%', margin:'0 auto 20px auto', overflow:'hidden', border:'3px solid #4facfe'}}>
                          {member.profileImage ? 
                             <img src={member.profileImage} alt={member.nome} style={{width:'100%', height:'100%', objectFit:'cover'}} /> :
                             <div style={{width:'100%', height:'100%', background:'#334155', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2rem', color:'white'}}>{member.nome.charAt(0)}</div>
                          }
                      </div>
                      <h4 style={{fontSize:'1.2rem', marginBottom:'5px'}}>{member.nome} {member.cognome}</h4>
                      <span style={{fontSize:'0.8rem', color:'#4facfe', textTransform:'uppercase', letterSpacing:'1px', fontWeight:'bold'}}>{member.role || 'Staff'}</span>
                  </div>
              ))}
          </div>
      </section>

      {/* --- SEZIONE 4: ABBONAMENTI --- */}
      <section style={{padding:'80px 10%', background: theme==='dark' ? 'linear-gradient(to bottom, #0f172a, #1e293b)' : '#f8fafc', textAlign:'center'}}>
          <h2 style={{fontSize:'3rem', fontWeight:'900', marginBottom:'20px', color: t.text}}>Investi nella Verità.</h2>
          <p style={{opacity:0.8, maxWidth:'600px', margin:'0 auto 50px auto'}}>Scegli il piano adatto a te. Puoi disdire quando vuoi, senza penali.</p>

          <div className="subs-container" style={{display:'flex', justifyContent:'center', gap:'30px'}}>
              
              {/* PIANO PREMIUM */}
              <div style={{
                  background: theme==='dark' ? 'white' : '#fff', 
                  color:'#0f172a', padding:'40px', borderRadius:'30px', width:'100%', maxWidth:'350px',
                  border: isPremiumActive ? '5px solid #4facfe' : '1px solid #cbd5e1', position:'relative', transition:'transform 0.3s'
              }}>
                  {isPremiumActive && <div style={{position:'absolute', top:'-20px', left:'50%', transform:'translateX(-50%)', background:'#4facfe', color:'white', padding:'8px 20px', borderRadius:'30px', fontWeight:'bold'}}>PIANO ATTIVO</div>}
                  <h3 style={{opacity:0.6, fontSize:'1rem', textTransform:'uppercase', letterSpacing:'2px'}}>Lettore Attento</h3>
                  <div style={{fontSize:'3.5rem', fontWeight:'900', margin:'15px 0', letterSpacing:'-2px'}}>€{prices.premium}</div>
                  <p style={{fontSize:'0.9rem', color:'#64748b', marginBottom:'30px'}}>/ mese</p>
                  <ul style={{textAlign:'left', listStyle:'none', padding:0, marginBottom:'30px'}}>
                      <li style={{marginBottom:'10px'}}>✅ Accesso illimitato</li>
                      <li style={{marginBottom:'10px'}}>✅ Zero Pubblicità</li>
                      <li style={{marginBottom:'10px'}}>✅ Commenti prioritari</li>
                  </ul>
                  {!isPremiumActive && !isFullActive && <button onClick={() => navigate('/dashboard/subscription')} style={{width:'100%', padding:'15px', borderRadius:'50px', border:'2px solid #0f172a', background:'transparent', fontSize:'1rem', fontWeight:'bold', cursor:'pointer'}}>Inizia Ora</button>}
              </div>

              {/* PIANO FULL PASS */}
              <div style={{
                  background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color:'white', padding:'40px', borderRadius:'30px', width:'100%', maxWidth:'350px',
                  boxShadow:'0 20px 50px rgba(118, 75, 162, 0.4)', position:'relative', transform:'scale(1.05)', zIndex:2
              }}>
                  <div style={{position:'absolute', top:'20px', right:'20px', fontSize:'1.5rem'}}>👑</div>
                  {isFullActive && <div style={{position:'absolute', top:'-20px', left:'50%', transform:'translateX(-50%)', background:'white', color:'#764ba2', padding:'8px 20px', borderRadius:'30px', fontWeight:'bold'}}>PIANO ATTIVO</div>}
                  <h3 style={{opacity:0.9, fontSize:'1rem', textTransform:'uppercase', letterSpacing:'2px'}}>Sostenitore VIP</h3>
                  <div style={{fontSize:'3.5rem', fontWeight:'900', margin:'15px 0', letterSpacing:'-2px'}}>€{prices.full}</div>
                  <p style={{fontSize:'0.9rem', opacity:0.8, marginBottom:'30px'}}>/ mese</p>
                  <ul style={{textAlign:'left', listStyle:'none', padding:0, marginBottom:'30px'}}>
                      <li style={{marginBottom:'10px'}}>✨ Tutto incluso nel Premium</li>
                      <li style={{marginBottom:'10px'}}>✨ Podcast & Audio-articoli</li>
                      <li style={{marginBottom:'10px'}}>✨ Badge "Sostenitore"</li>
                  </ul>
                  {!isFullActive && (
                      <button onClick={() => navigate('/dashboard/subscription')} style={{width:'100%', padding:'15px', borderRadius:'50px', border:'none', background:'white', color:'#764ba2', fontSize:'1.1rem', fontWeight:'bold', cursor:'pointer', boxShadow:'0 10px 20px rgba(0,0,0,0.2)'}}>
                         {isPremiumActive ? 'Fai Upgrade' : 'Diventa VIP'}
                      </button>
                  )}
              </div>
          </div>
      </section>

      {/* --- FOOTER --- */}
      <footer style={{padding:'60px 10%', background:'#020617', textAlign:'center', borderTop:'1px solid rgba(255,255,255,0.05)', color:'white'}}>
          <h2 style={{fontSize:'1.5rem', fontWeight:'bold', marginBottom:'20px'}}>MurthNews.</h2>
          <p style={{opacity:0.5, fontSize:'0.9rem', lineHeight:'1.8'}}>
              Sede Legale: Via Chiesa Vecchia, 16, Riva Del Garda (TN).<br/>
              Direttore Responsabile: A. Murth<br/>
              © 2025 Tutti i diritti riservati.
          </p>
          <div style={{marginTop:'30px', display:'flex', justifyContent:'center', gap:'30px', fontSize:'0.9rem', opacity:0.7, flexWrap:'wrap'}}>
              <span onClick={() => navigate('/termini')} style={{cursor:'pointer', textDecoration:'underline'}}>Termini e Condizioni</span>
              <span onClick={() => navigate('/lavora-con-noi')} style={{cursor:'pointer', textDecoration:'underline', color:'#4facfe', fontWeight:'bold'}}>Lavora con noi</span>
          </div>
      </footer>
    </div>
  );
};

export default PolicyPage;