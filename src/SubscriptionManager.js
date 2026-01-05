import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './App.css'; 

function SubscriptionManager() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [prices, setPrices] = useState({ premium: 1.99, full: 5.99 });
  const [loading, setLoading] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false); 
  const [expirationDate, setExpirationDate] = useState('');
  
  // --- NUOVO STATO: ISCRIZIONI APERTE? ---
  const [areOpen, setAreOpen] = useState(true);

  useEffect(() => {
    // 1. Carica Utente
    const storedUser = localStorage.getItem('reader_user');
    if (!storedUser) {
      navigate('/login');
    } else {
      setUser(JSON.parse(storedUser));
    }

    // 2. Carica Impostazioni (Prezzi + Interruttore)
    axios.get('http://localhost:5000/api/settings')
         .then(res => {
             if (res.data) {
                 setPrices({
                     premium: res.data.pricePremium || 1.99,
                     full: res.data.priceFull || 5.99
                 });
                 // Se il campo manca (vecchio db), consideralo true
                 setAreOpen(res.data.areSubscriptionsOpen !== false);
             }
         })
         .catch(err => console.log("Errore impostazioni"));
  }, [navigate]);

  // --- FUNZIONE ANNULLA ---
  const handleCancelSubscription = async () => {
      if(!window.confirm("Sei sicuro? Mantenirai l'accesso fino alla scadenza, ma non verrà rinnovato.")) return;

      setLoading(true);
      try {
          const res = await axios.post('http://localhost:5000/api/cancel-subscription', {
              userId: user._id
          });
          
          if(res.data.success) {
              localStorage.setItem('reader_user', JSON.stringify(res.data.user));
              setUser(res.data.user);
              alert("Rinnovo automatico annullato con successo.");
          }
      } catch (error) {
          alert("Errore durante la disdetta. Riprova.");
      } finally {
          setLoading(false);
      }
  };

  // --- FUNZIONE AGGIORNA PIANO ---
  const handleUpdatePlan = async (newLevel) => {
      if (!user) return;
      
      // BLOCCA SE CHIUSO (Doppia sicurezza oltre al bottone disabilitato)
      if (!areOpen && newLevel !== 'free') {
          alert("Le nuove iscrizioni sono momentaneamente sospese.");
          return;
      }

      if (user.livello === newLevel) return; 
      if ((user.livello === 'standard' || user.livello === 'free') && newLevel === 'free') return;

      // DOWNGRADE A FREE
      if (newLevel === 'free') {
          const isPaidUser = user.livello === 'premium' || user.livello === 'abbonato';
          const isNotExpired = user.scadenzaAbbonamento && new Date(user.scadenzaAbbonamento) > new Date();

          if (isPaidUser && isNotExpired) {
              setExpirationDate(new Date(user.scadenzaAbbonamento).toLocaleDateString('it-IT'));
              setShowBlockModal(true); 
              return; 
          }

          if(!window.confirm("Sei sicuro di voler tornare al piano gratuito?")) return;
          
          try {
             const res = await axios.put('http://localhost:5000/api/user/update-plan', {
                 email: user.email, newLevel: 'free'
             });
             if(res.data.success) {
                 localStorage.setItem('reader_user', JSON.stringify(res.data.user));
                 setUser(res.data.user); // Aggiorna stato locale immediato
                 navigate('/dashboard'); 
             }
          } catch(e) { alert("Errore downgrade"); }
          return;
      }

      // PAGAMENTO (UPGRADE)
      setLoading(true);
      try {
          const res = await axios.post('http://localhost:5000/api/create-checkout-session', {
              plan: newLevel,
              userEmail: user.email,
              userId: user._id 
          });

          if (res.data.url) {
              window.location.href = res.data.url; 
          }
      } catch (error) {
          // Gestione errore blocco server
          if (error.response && error.response.status === 403) {
              alert(error.response.data.error); // "Iscrizioni chiuse"
          } else {
              alert("Errore pagamento.");
          }
          setLoading(false);
      }
  };

  if (!user) return null;
  const currentLevel = user.livello === 'standard' ? 'free' : user.livello;

  // Helper Stile Bloccato (Grigio)
  const cardStyle = {
      filter: areOpen ? 'none' : 'grayscale(100%) opacity(0.6)',
      pointerEvents: areOpen ? 'auto' : 'none',
      position: 'relative'
  };

  const renderCurrentPlanAction = () => {
      if (user.isCanceled) {
          return <div className="canceled-badge">⚠ Disdetta programmata.<br/>Scade il: {new Date(user.scadenzaAbbonamento).toLocaleDateString('it-IT')}</div>;
      }
      return (
          <>
            <button className="plan-btn current" disabled>Piano Attivo</button>
            <button className="cancel-sub-btn" onClick={handleCancelSubscription}>
                Disdici Rinnovo
            </button>
          </>
      );
  };

  return (
    <div className="sub-page-container">
        
        <div className="sub-header">
            <button onClick={() => navigate('/dashboard')} className="back-link">← Torna alla Dashboard</button>
            <h1>Scegli il livello della tua informazione</h1>
            <p>Flessibile. Trasparente. Cancelli quando vuoi.</p>
            
            {/* Avviso se chiuso */}
            {!areOpen && (
                <div style={{background:'#fee2e2', color:'#b91c1c', padding:'10px', borderRadius:'8px', marginTop:'10px', fontWeight:'bold'}}>
                    ⛔ NUOVE ISCRIZIONI MOMENTANEAMENTE SOSPESE
                </div>
            )}
        </div>

        <div className="pricing-grid">
            
            {/* FREE (Sempre attivo) */}
            <div className={`price-card free ${currentLevel === 'free' ? 'active-plan' : ''}`}>
                <div className="card-header">
                    <h3>Free Start</h3>
                    <div className="big-price">€0</div>
                    <p className="period">per sempre</p>
                </div>
                <div className="card-features">
                    <ul>
                        <li>✔ Accesso agli articoli base</li>
                        <li>✔ Newsletter settimanale</li>
                    </ul>
                </div>
                <div className="card-action">
                    {currentLevel === 'free' ? (
                        <button className="plan-btn current" disabled>Piano Attuale</button>
                    ) : (
                        <button className="plan-btn downgrade" onClick={() => handleUpdatePlan('free')}>Torna al Free</button>
                    )}
                </div>
            </div>

            {/* PREMIUM (Bloccabile) */}
            <div className={`price-card premium ${currentLevel === 'premium' ? 'active-plan' : ''}`} style={currentLevel !== 'premium' ? cardStyle : {}}>
                
                {/* Overlay se bloccato e non sei già abbonato */}
                {!areOpen && currentLevel !== 'premium' && (
                    <div style={{position:'absolute', inset:0, zIndex:10, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'900', fontSize:'24px', color:'#000', textShadow:'0 0 5px white'}}>
                        SOSPESO
                    </div>
                )}

                <div className="card-header">
                    <h3>Premium</h3>
                    <div className="big-price">€{prices.premium}</div>
                    <p className="period">al mese</p>
                </div>
                <div className="card-features">
                    <ul>
                         <li><strong>✔ Tutto il piano Free</strong></li>
                         <li>✔ Nessuna Pubblicità</li>
                    </ul>
                </div>
                <div className="card-action">
                    {currentLevel === 'premium' 
                        ? renderCurrentPlanAction() 
                        : <button className="plan-btn upgrade" disabled={!areOpen} onClick={() => handleUpdatePlan('premium')}>
                            {areOpen ? "Attiva Premium" : "Non Disponibile"}
                          </button>
                    }
                </div>
            </div>

            {/* FULL (Bloccabile) */}
            <div className={`price-card full ${currentLevel === 'abbonato' ? 'active-plan' : ''}`} style={currentLevel !== 'abbonato' ? cardStyle : {}}>
                
                {!areOpen && currentLevel !== 'abbonato' && (
                    <div style={{position:'absolute', inset:0, zIndex:10, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'900', fontSize:'24px', color:'#000', textShadow:'0 0 5px white'}}>
                        SOSPESO
                    </div>
                )}

                <div className="card-header">
                    <h3>Full Pass</h3>
                    <div className="big-price">€{prices.full}</div>
                    <p className="period">al mese</p>
                </div>
                <div className="card-features">
                    <ul>
                        <li><strong>✔ Esperienza VIP Totale</strong></li>
                        <li>✔ Supporto dedicato h24</li>
                    </ul>
                </div>
                <div className="card-action">
                    {currentLevel === 'abbonato' 
                        ? renderCurrentPlanAction() 
                        : <button className="plan-btn upgrade-gold" disabled={!areOpen} onClick={() => handleUpdatePlan('abbonato')}>
                            {areOpen ? "Diventa Partner" : "Non Disponibile"}
                          </button>
                    }
                </div>
            </div>

        </div>

        {loading && (
            <div className="loading-overlay">
                <div className="spinner"></div>
                <p>Elaborazione...</p>
            </div>
        )}

        {showBlockModal && (
            <div className="modal-overlay" onClick={() => setShowBlockModal(false)}>
                <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-icon">🛡️</div>
                    <h3>Abbonamento ancora Attivo</h3>
                    <p>
                        Il tuo piano attuale è valido fino al <strong>{expirationDate}</strong>.
                        <br/>Non puoi tornare al piano Free adesso.
                    </p>
                    <button className="modal-btn" onClick={() => setShowBlockModal(false)}>Ho capito</button>
                </div>
            </div>
        )}
    </div>
  );
}

export default SubscriptionManager;