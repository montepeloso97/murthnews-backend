import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css'; 
import SiteLogo from './SiteLogo'; 

// 🎨 COLORI DINAMICI
const themeColors = {
  light: { bg: '#f8fafc', text: '#334155', card: '#ffffff', border: '#e2e8f0', title: '#0f172a' },
  dark: { bg: '#0f172a', text: '#cbd5e1', card: '#1e293b', border: 'rgba(255,255,255,0.1)', title: '#ffffff' }
};

const TermsPage = ({ theme = 'dark' }) => {
  const navigate = useNavigate();
  const t = themeColors[theme] || themeColors.dark;
  
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // <--- STATO PER IL LOGIN

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);

    // CONTROLLO SE L'UTENTE È LOGGATO
    const user = localStorage.getItem('reader_user');
    if (user) {
        setIsLoggedIn(true);
    }

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Funzione di uscita intelligente
  const handleExit = () => {
      if (isLoggedIn) {
          navigate(-1); // Torna indietro (es. alla Dashboard)
      } else {
          navigate('/'); // Torna alla Home (Login/Registrazione)
      }
  };

  // Stili di base
  const sectionStyle = { marginBottom: '40px', paddingBottom: '30px', borderBottom: `1px solid ${t.border}` };
  const h3Style = { color: t.title, fontSize: '1.4rem', marginBottom: '15px', fontWeight: 'bold' };
  const pStyle = { lineHeight: '1.8', fontSize: '1rem', marginBottom: '15px' };

  return (
    <div style={{background: t.bg, minHeight: '100vh', color: t.text, fontFamily: "'Inter', sans-serif", transition: 'background 0.3s'}}>
      
      {/* NAVBAR FISSA */}
      <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 100, 
          padding: '15px 5%',
          background: scrolled ? (theme === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255,255,255,0.95)') : t.bg,
          backdropFilter: scrolled ? 'blur(10px)' : 'none',
          borderBottom: `1px solid ${t.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.3s'
      }}>
           <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
               <div onClick={() => navigate('/')} style={{cursor: 'pointer'}}>
                    <SiteLogo theme={theme} />
               </div>
               <span style={{fontSize:'0.9rem', opacity:0.6, borderLeft:`1px solid ${t.border}`, paddingLeft:'15px', display: window.innerWidth < 768 ? 'none' : 'block'}}>
                   Termini di Servizio
               </span>
           </div>

           {/* BOTTONE CHIUDI / HOME INTELLIGENTE */}
           <button onClick={handleExit} style={{
               background: t.card, color: t.text, border:`1px solid ${t.border}`, 
               padding:'8px 20px', borderRadius:'20px', cursor:'pointer', fontWeight:'bold',
               display: 'flex', alignItems: 'center', gap: '8px'
           }}>
               {isLoggedIn ? '✕ Chiudi' : '🏠 Torna alla Home'}
           </button>
      </div>

      {/* CONTENUTO PRINCIPALE */}
      <div style={{maxWidth: '800px', margin: '0 auto', padding: '120px 20px 60px 20px'}}>
          
          <div style={{textAlign:'center', marginBottom:'60px'}}>
              <h1 style={{fontSize:'2.5rem', fontWeight:'900', color: t.title, marginBottom:'10px'}}>Termini e Condizioni</h1>
              <p style={{opacity:0.6}}>Entrata in vigore: {new Date().toLocaleDateString('it-IT')}</p>
          </div>

          <div style={{background: t.card, padding:'40px', borderRadius:'20px', border:`1px solid ${t.border}`, boxShadow:'0 10px 40px rgba(0,0,0,0.05)'}}>

              {/* 1. INTRODUZIONE */}
              <section style={sectionStyle}>
                  <h3 style={h3Style}>1. Accettazione dei Termini</h3>
                  <p style={pStyle}>
                      Benvenuto su <strong>MurthNews</strong> ("Piattaforma", "Sito"). Accedendo al sito, registrandoti o sottoscrivendo un abbonamento, dichiari di aver letto, compreso e accettato i presenti Termini e Condizioni ("Termini").
                  </p>
                  <p style={pStyle}>
                      Se non accetti questi termini, ti preghiamo di non utilizzare il servizio. L'utilizzo del sito è consentito esclusivamente a utenti che abbiano compiuto <strong>14 anni</strong>.
                  </p>
              </section>

              {/* 2. ABBONAMENTI E PAGAMENTI */}
              <section style={sectionStyle}>
                  <h3 style={h3Style}>2. Abbonamenti e Diritto di Recesso</h3>
                  <p style={pStyle}>
                      <strong>2.1 Pagamenti:</strong> I servizi Premium e Full Pass sono gestiti tramite Stripe. I pagamenti sono sicuri e criptati.
                  </p>
                  <p style={pStyle}>
                      <strong>2.2 Rinnovo Automatico:</strong> L'abbonamento si rinnova automaticamente ogni mese. Puoi disattivare il rinnovo in qualsiasi momento dal tuo Profilo Utente.
                  </p>
                  <p style={{...pStyle, background: theme==='dark'?'rgba(255,0,0,0.1)':'#fee2e2', padding:'15px', borderRadius:'8px', borderLeft:'4px solid #ef4444'}}>
                      <strong>2.3 Esclusione del Diritto di Recesso:</strong> 
                      Trattandosi di fornitura di contenuto digitale mediante supporto non materiale, 
                      accettando i presenti termini l'utente acconsente all'inizio immediato dell'esecuzione del contratto e 
                      <strong> riconosce espressamente di perdere il diritto di recesso</strong> (Art. 59 del Codice del Consumo), 
                      poiché il servizio è fruibile istantaneamente.
                  </p>
              </section>

              {/* 3. CONTENUTI UTENTE E CONDOTTA */}
              <section style={sectionStyle}>
                  <h3 style={h3Style}>3. Regole di Condotta (Moderazione)</h3>
                  <p style={pStyle}>
                      MurthNews incoraggia la discussione libera ma civile. È severamente vietato pubblicare nei commenti o nel profilo:
                  </p>
                  <ul style={{marginBottom:'15px', paddingLeft:'20px', lineHeight:'1.8'}}>
                      <li>Contenuti diffamatori, osceni, pornografici o violenti.</li>
                      <li>Incitamento all'odio razziale, politico o religioso.</li>
                      <li>Spam, pubblicità non autorizzata o link malevoli.</li>
                  </ul>
                  <p style={pStyle}>
                      <strong>Sospensione Account:</strong> Ci riserviamo il diritto di sospendere o eliminare senza preavviso gli account che violano queste regole.
                  </p>
              </section>

              {/* 4. PROPRIETÀ INTELLETTUALE */}
              <section style={sectionStyle}>
                  <h3 style={h3Style}>4. Copyright e Proprietà</h3>
                  <p style={pStyle}>
                      Tutti i contenuti editoriali (articoli, podcast, video) sono di proprietà esclusiva di MurthNews. È vietata la riproduzione, anche parziale, su altri siti senza autorizzazione scritta.
                  </p>
              </section>

              {/* 5. LIMITAZIONE RESPONSABILITÀ */}
              <section style={sectionStyle}>
                  <h3 style={h3Style}>5. Limitazione di Responsabilità</h3>
                  <p style={pStyle}>
                      Il servizio è fornito "così com'è". MurthNews non garantisce che il servizio sarà ininterrotto o privo di errori tecnici. Non siamo responsabili per eventuali danni derivanti dall'uso o dall'impossibilità di usare il sito.
                  </p>
                  <p style={pStyle}>
                      Non siamo responsabili per i commenti inseriti dagli utenti, pur impegnandoci a moderarli nel minor tempo possibile.
                  </p>
              </section>

              {/* 6. PRIVACY E GDPR */}
              <section style={sectionStyle}>
                  <h3 style={h3Style}>6. Privacy e Trattamento Dati (GDPR)</h3>
                  <p style={pStyle}>
                      I tuoi dati personali sono trattati in conformità al Regolamento UE 2016/679 (GDPR). 
                      Per i dettagli completi su cookie, server e fornitori terzi, consulta la nostra <span onClick={() => navigate('/policy')} style={{color:'#4facfe', cursor:'pointer', textDecoration:'underline'}}>Privacy Policy</span>.
                  </p>
              </section>

              {/* 7. LEGGE APPLICABILE */}
              <section style={{marginBottom:'0'}}>
                  <h3 style={h3Style}>7. Foro Competente</h3>
                  <p style={pStyle}>
                      I presenti Termini sono regolati dalla legge italiana.
                  </p>
                  <p style={pStyle}>
                      Per qualsiasi controversia tra MurthNews e l'Utente Consumatore, il foro competente è quello di residenza o domicilio elettivo del consumatore, se ubicato nel territorio italiano. Per gli altri casi, il foro competente esclusivo è il Tribunale di Trento.
                  </p>
                  <div style={{marginTop:'30px', paddingTop:'20px', borderTop:`1px solid ${t.border}`}}>
                      <strong>Sede Legale:</strong><br/>
                      MurthNews<br/>
                      Via Chiesa Vecchia, 16<br/>
                      38066 Riva del Garda (TN)
                  </div>
              </section>

          </div>
      </div>
    </div>
  );
};

export default TermsPage;