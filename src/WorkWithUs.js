import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css'; 
import SiteLogo from './SiteLogo'; // <--- IMPORTA IL LOGO DINAMICO

const WorkWithUs = ({ theme = 'dark' }) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const emailTarget = "Info@murtheditor.com";

  const handleCopy = () => {
      navigator.clipboard.writeText(emailTarget);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenMail = () => {
      // Modificato l'oggetto per chiarire che è una collaborazione volontaria
      const subject = encodeURIComponent("Candidatura Volontaria: [Tuo Nome] - [Ruolo]");
      const body = encodeURIComponent(
`Ciao Redazione di MurthNews,

Mi chiamo [Nome e Cognome] e condivido la vostra passione per l'informazione libera.
Vorrei propormi come collaboratore volontario per il ruolo di [es: Redattore / Social Media].

Mi piacerebbe contribuire al progetto per [es: fare esperienza / arricchire il portfolio / passione personale].

In allegato trovi il mio CV o link ai miei lavori.

A presto,
[Tuo Nome]`
      );
      window.location.href = `mailto:${emailTarget}?subject=${subject}&body=${body}`;
  };

  return (
    <div style={{background: '#0f172a', minHeight: '100vh', color: 'white', fontFamily: "'Inter', sans-serif", overflowX:'hidden'}}>
      
      {/* NAVBAR */}
      <div style={{padding: '30px 5%', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          
          <div onClick={() => navigate('/')} style={{cursor: 'pointer'}}>
    <SiteLogo theme={theme} />
</div>

          <button onClick={() => navigate(-1)} style={{background:'rgba(255,255,255,0.1)', color:'white', border:'none', padding:'8px 20px', borderRadius:'20px', cursor:'pointer'}}>✕ Chiudi</button>
      </div>

      <div style={{display:'flex', flexWrap:'wrap', padding:'40px 10%', gap:'60px', alignItems:'center'}}>
          
          {/* COLONNA SINISTRA: MESSAGGIO ONESTO */}
          <div style={{flex:1, minWidth:'300px'}}>
              <h5 style={{color:'#4facfe', letterSpacing:'2px', fontWeight:'bold', marginBottom:'10px'}}>UNISCITI ALLA MISSIONE</h5>
              <h1 style={{fontSize:'3.5rem', lineHeight:'1.1', marginBottom:'20px'}}>La tua passione,<br/>la nostra voce.</h1>
              
              {/* Box Disclaimer Chiaro */}
              <div style={{background:'rgba(255,165,0,0.1)', borderLeft:'4px solid orange', padding:'15px', borderRadius:'5px', marginBottom:'30px'}}>
                  <p style={{margin:0, fontSize:'0.95rem', lineHeight:'1.5'}}>
                      <strong>Nota Bene:</strong> MurthNews è un progetto indipendente basato sul <u>volontariato</u>. 
                      Non offriamo stipendi, ma offriamo una piattaforma libera dove farti un nome, costruire un portfolio solido e scrivere senza censure.
                  </p>
              </div>

              <div style={{display:'grid', gap:'20px'}}>
                  <div style={featureStyle}>
                      <span style={{fontSize:'1.5rem'}}>✍️</span>
                      <div>
                          <strong>Costruisci il tuo Portfolio</strong>
                          <p style={{fontSize:'0.9rem', opacity:0.7, margin:0}}>Firma i tuoi articoli e mostrali al mondo.</p>
                      </div>
                  </div>
                  <div style={featureStyle}>
                      <span style={{fontSize:'1.5rem'}}>🔓</span>
                      <div>
                          <strong>Libertà Editoriale</strong>
                          <p style={{fontSize:'0.9rem', opacity:0.7, margin:0}}>Qui contano le idee, non le linee guida degli sponsor.</p>
                      </div>
                  </div>
                  <div style={featureStyle}>
                      <span style={{fontSize:'1.5rem'}}>🤝</span>
                      <div>
                          <strong>Community & Network</strong>
                          <p style={{fontSize:'0.9rem', opacity:0.7, margin:0}}>Entra in contatto con altri appassionati come te.</p>
                      </div>
                  </div>
              </div>
          </div>

          {/* COLONNA DESTRA: AZIONE */}
          <div style={{flex:1, minWidth:'300px'}}>
              
              <div style={{
                  background:'rgba(255,255,255,0.05)', 
                  backdropFilter:'blur(10px)', 
                  borderRadius:'24px', 
                  padding:'40px', 
                  border:'1px solid rgba(255,255,255,0.1)',
                  boxShadow:'0 20px 50px rgba(0,0,0,0.3)'
              }}>
                  <h3 style={{marginTop:0, fontSize:'1.8rem'}}>Vuoi collaborare?</h3>
                  <p style={{marginBottom:'25px', opacity:0.8}}>Se ami scrivere, programmare o gestire community, scrivici.</p>

                  <div style={{
                      background:'rgba(0,0,0,0.3)', 
                      padding:'15px 20px', 
                      borderRadius:'12px', 
                      display:'flex', 
                      justifyContent:'space-between', 
                      alignItems:'center',
                      marginBottom:'30px',
                      border:'1px solid rgba(255,255,255,0.1)'
                  }}>
                      <span style={{fontFamily:'monospace', fontSize:'1.1rem', color:'#4facfe'}}>{emailTarget}</span>
                      <button 
                          onClick={handleCopy}
                          style={{
                              background: copied ? '#10b981' : 'rgba(255,255,255,0.1)', 
                              color:'white', border:'none', padding:'8px 15px', borderRadius:'8px', cursor:'pointer', fontWeight:'bold', transition:'0.2s'
                          }}
                      >
                          {copied ? 'Copiata!' : 'Copia'}
                      </button>
                  </div>

                  <h4 style={{fontSize:'1rem', textTransform:'uppercase', opacity:0.6, letterSpacing:'1px'}}>Cosa scriverci:</h4>
                  <ul style={{marginBottom:'30px', paddingLeft:'20px', lineHeight:'1.8'}}>
                      <li>💡 Chi sei e cosa ti piace fare</li>
                      <li>🔗 Link a lavori precedenti (se ne hai)</li>
                      <li>🔥 Perché vuoi unirti a noi</li>
                  </ul>

                  <button 
                      onClick={handleOpenMail}
                      style={{
                          width:'100%', 
                          padding:'18px', 
                          borderRadius:'50px', 
                          border:'none', 
                          background:'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', 
                          color:'white', 
                          fontSize:'1.1rem', 
                          fontWeight:'bold', 
                          cursor:'pointer',
                          boxShadow:'0 10px 20px rgba(79, 172, 254, 0.3)',
                          transition:'transform 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
                      onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                  >
                      ✉️ Proponiti Ora
                  </button>
                  <p style={{textAlign:'center', fontSize:'0.8rem', opacity:0.5, marginTop:'15px'}}>Nessun impegno, solo passione.</p>
              </div>

          </div>
      </div>
    </div>
  );
};

const featureStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    background: 'rgba(255,255,255,0.03)',
    padding: '15px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.05)'
};

export default WorkWithUs;