import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css'; 
import axios from 'axios';

function RegisterReader() {
  const navigate = useNavigate();

  // --- STATO GDPR (Nuovo) ---
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Step: 0=Email, 1=Info, 2=Password, 3=PIANI (Full Screen), 4=PIN (Split)
  const [step, setStep] = useState(0); 
  const [emailOk, setEmailOk] = useState(false);
  const [checking, setChecking] = useState(false);
  const [isReturningUser, setIsReturningUser] = useState(false);
  
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [pinCode, setPinCode] = useState("");
  
  const [prices, setPrices] = useState({ premium: 1.99, full: 5.99 });

  // --- STATO BLOCCO ABBONAMENTI ---
  const [areSubscriptionsOpen, setAreSubscriptionsOpen] = useState(true); 

  const [formData, setFormData] = useState({ email: '', nome: '', cognome: '', password: '' });

  // 1. SCARICA IMPOSTAZIONI
  useEffect(() => {
      axios.get('https://murthnews-api.onrender.com/api/settings')
           .then(res => {
               if (res.data) {
                   setPrices({
                       premium: res.data.pricePremium || 1.99,
                       full: res.data.priceFull || 5.99
                   });
                   // Controlliamo l'interruttore
                   setAreSubscriptionsOpen(res.data.areSubscriptionsOpen !== false);
               }
           })
           .catch(err => console.log("Uso default"));
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // --- VALIDAZIONE EMAIL (MANUALE E SICURA) ---
  const validateEmail = async (e) => {
    if(e) e.preventDefault(); // Evita refresh se chiamato da form

    // Controllo base
    if (!formData.email.includes('@') || formData.email.length < 5) {
        return;
    }

    setChecking(true);
    try {
        const res = await axios.post('https://murthnews-api.onrender.com/api/check-email', { email: formData.email });
        setChecking(false);
        setEmailOk(true);

        if (res.data.exists) {
            // UTENTE ESISTE -> VAI A LOGIN (Step 2)
            setIsReturningUser(true);
            setStep(2); 
        } else {
            // UTENTE NUOVO -> VAI A REGISTRAZIONE (Step 1 - Nome)
            setIsReturningUser(false);
            setStep(1); 
        }
    } catch (error) { 
        console.error(error);
        setChecking(false);
        alert("Errore connessione server.");
    }
  };

  // --- AVANZAMENTO NOME -> PASSWORD ---
  const handleNameNext = () => {
      if (formData.nome.length > 2 && formData.cognome.length > 2) {
          setStep(2);
      } else {
          alert("Inserisci Nome e Cognome validi.");
      }
  };

  const handleResendPin = async () => {
    try {
        await axios.post('https://murthnews-api.onrender.com/api/resend-pin', { email: formData.email });
        alert("Nuovo codice inviato!");
    } catch (e) { alert("Errore invio codice"); }
  };

  // --- SELEZIONE PIANO INTELLIGENTE ---
  const handleSelectPlan = (plan) => {
      // SE CHIUSO E NON È FREE -> BLOCCA
      if (!areSubscriptionsOpen && plan !== 'free') {
          alert("⛔ Le nuove iscrizioni Premium sono momentaneamente sospese. Puoi registrarti GRATIS.");
          return;
      }
      setSelectedPlan(plan);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    // LOGIN
    if (isReturningUser) {
        try {
            const res = await axios.post('https://murthnews-api.onrender.com/api/login', { 
                email: formData.email, password: formData.password 
            });
            if (res.data.user.emailVerificata === false) {
                alert("Verifica la tua email."); setIsReturningUser(false); setStep(4); return;
            }
            localStorage.setItem('reader_user', JSON.stringify(res.data.user)); 
            navigate('/dashboard'); 
        } catch (e) { alert("Password errata"); }
        return;
    }

    // --- VERIFICA PIN E GESTIONE PAGAMENTO ---
    if (step === 4) {
        try {
            // 1. Verifica il PIN
            const res = await axios.post('https://murthnews-api.onrender.com/api/verify-pin', { email: formData.email, pin: pinCode });
            const user = res.data.user;

            // Salva l'utente (che per ora è STANDARD)
            localStorage.setItem('reader_user', JSON.stringify(user)); 

            // 2. SE HA SCELTO UN PIANO A PAGAMENTO -> VAI A STRIPE
            if (selectedPlan && selectedPlan !== 'free') {
                try {
                    const stripeRes = await axios.post('https://murthnews-api.onrender.com/api/create-checkout-session', {
                        plan: selectedPlan,
                        userEmail: user.email,
                        userId: user._id
                    });
                    // Reindirizza a Stripe
                    window.location.href = stripeRes.data.url;
                } catch (stripeError) {
                    alert("Errore nell'avvio del pagamento. Riprova dalla dashboard.");
                    navigate('/dashboard');
                }
            } else {
                // 3. SE È FREE -> VAI ALLA DASHBOARD
                alert("Benvenuto!");
                navigate('/dashboard');
            }
        } catch (e) { alert("PIN errato o scaduto."); }
        return;
    }

    // --- REGISTRAZIONE INIZIALE (Step 3) ---
    if (step === 3) {
        if (!selectedPlan) return alert("Scegli un piano.");
        try {
            // 🔥 TRUCCO: Lo registriamo SEMPRE come 'standard' all'inizio.
            await axios.post('https://murthnews-api.onrender.com/api/register', { 
                ...formData, 
                livello: 'standard' 
            });
            setStep(4); 
        } catch (e) { alert("Errore: " + (e.response?.data?.message || "Errore server")); }
    }
  };

  const isFullScreen = (step === 3 && !isReturningUser);

  // Stile per disabilitare i box
  const disabledStyle = {
      opacity: 0.5, 
      filter: 'grayscale(100%)', 
      cursor: 'not-allowed',
      position: 'relative'
  };

  return (
    <div className={`auth-container ${isFullScreen ? 'full-layout' : 'split-layout'}`}>
      
      {!isFullScreen && (
        <div className="left-panel">
            <div className="dynamic-logo">MurthNews</div>
            <p className="dynamic-slogan">THE FUTURE OF PRESS</p>
        </div>
      )}

      <div className={isFullScreen ? "plans-wrapper" : "right-panel"}>
        
        {/* --- STEP 3: PIANI (MODIFICATO PER IL BLOCCO) --- */}
        {isFullScreen ? (
            <>
                <div style={{width: '100%', textAlign: 'center', marginBottom: '40px'}}>
                    <h1 style={{fontSize: '3rem', fontWeight:'bold'}}>Scegli il tuo livello</h1>
                    
                    {!areSubscriptionsOpen && (
                        <div style={{background:'#fee2e2', color:'#991b1b', padding:'10px', borderRadius:'8px', display:'inline-block', marginTop:'10px', fontWeight:'bold'}}>
                            ⚠️ ABBONAMENTI A PAGAMENTO SOSPESI
                        </div>
                    )}
                </div>

                {/* FREE - SEMPRE ATTIVO */}
                <div className={`plan-card-big ${selectedPlan === 'free' ? 'selected' : ''}`} onClick={() => handleSelectPlan('free')}>
                    <h3>Free Account</h3>
                    <div className="price">€0</div>
                    <ul><li>Podcast Base</li><li>Newsletter</li><li>Accesso limitato</li></ul>
                </div>

                {/* PREMIUM - BLOCCABILE */}
                <div 
                    className={`plan-card-big ${selectedPlan === 'premium' ? 'selected' : ''}`} 
                    onClick={() => handleSelectPlan('premium')}
                    style={!areSubscriptionsOpen ? disabledStyle : {}}
                >
                    {!areSubscriptionsOpen && <div style={{position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'900', fontSize:'20px', color:'#000', zIndex:10}}>SOSPESO</div>}
                    
                    <div className="best-value">Consigliato</div>
                    <h3>Premium</h3>
                    <div className="price">€{prices.premium} <small>/mese</small></div>
                    <ul><li>Tutto il piano Free</li><li>No Pubblicità</li></ul>
                </div>

                {/* FULL - BLOCCABILE */}
                <div 
                    className={`plan-card-big ${selectedPlan === 'abbonamento' ? 'selected' : ''}`} 
                    onClick={() => handleSelectPlan('abbonamento')}
                    style={!areSubscriptionsOpen ? disabledStyle : {}}
                >
                    {!areSubscriptionsOpen && <div style={{position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'900', fontSize:'20px', color:'#000', zIndex:10}}>SOSPESO</div>}

                    <h3>Full Pass</h3>
                    <div className="price">€{prices.full} <small>/mese</small></div>
                    <ul><li>Accesso Totale</li><li>Supporto h24</li></ul>
                </div>

                <div style={{width: '100%', textAlign: 'center', marginTop: '40px'}}>
                    {selectedPlan && (
                        <button onClick={handleSubmit} className="clean-btn" style={{maxWidth: '300px', background: '#fff', color: '#000', fontWeight:'900'}}>
                            CONFERMA {selectedPlan.toUpperCase()}
                        </button>
                    )}
                </div>
            </>
        ) : (
            /* --- FORM INIZIALE (SEMPRE VISIBILE) --- */
            <div className="auth-box">
                <div className="clean-header">
                    <h2 style={{fontSize:'2.5rem', fontWeight:'800', marginBottom:'5px'}}>
                        {step === 4 ? "Verifica" : isReturningUser ? "Bentornato" : "Inizia qui"}
                    </h2>
                    <p style={{fontSize:'1.1rem', color:'#888'}}>
                        {step === 4 ? `Codice inviato a ${formData.email}` : "Inserisci i tuoi dati."}
                    </p>
                </div>

                {/* Form con gestione Submit manuale per ogni step */}
                <form onSubmit={(e) => e.preventDefault()} autoComplete="off">
                    {step < 4 && (
                        <>
                            {/* CAMPO EMAIL (Step 0) */}
                            <div className="input-block">
                                <input 
                                    className="clean-input" 
                                    type="email" 
                                    name="email" 
                                    placeholder="Inserisci la tua email" 
                                    value={formData.email} 
                                    onChange={handleChange} 
                                    disabled={step > 0} // Blocca se siamo già avanti
                                    onKeyDown={(e) => {
                                        if(e.key === 'Enter' && step === 0) validateEmail(e);
                                    }}
                                />
                                <div className="status-indicator">
                                    {checking && <div className="loading-spinner"></div>}
                                    {!checking && emailOk && <div className="check-icon">✔</div>}
                                </div>
                            </div>

                            {/* BOTTONE STEP 0 (Email) - APPARE SOLO SE NON SIAMO AVANTI */}
                            {step === 0 && (
                                <button onClick={validateEmail} className="clean-btn" style={{marginTop:'10px'}}>
                                    CONTINUA →
                                </button>
                            )}

                            {/* NOME E COGNOME: Solo se NUOVO UTENTE (Step 1) */}
                            {step === 1 && !isReturningUser && (
                                <div className="animate-in">
                                    <input className="clean-input" type="text" name="nome" placeholder="Nome" value={formData.nome} onChange={handleChange} style={{marginBottom:'15px'}} autoFocus/>
                                    <input 
                                        className="clean-input" 
                                        type="text" 
                                        name="cognome" 
                                        placeholder="Cognome" 
                                        value={formData.cognome} 
                                        onChange={handleChange} 
                                        onKeyDown={(e) => {
                                            if(e.key === 'Enter') handleNameNext();
                                        }}
                                    />
                                    <button onClick={handleNameNext} className="clean-btn" style={{marginTop:'10px'}}>
                                        IMPOSTA PASSWORD →
                                    </button>
                                </div>
                            )}

                            {/* PASSWORD (Step 2) */}
                            {step === 2 && (
                                <div className="animate-in" style={{marginTop:'15px'}}>
                                    <input 
                                        className="clean-input" 
                                        type="password" 
                                        name="password" 
                                        placeholder="Password sicura" 
                                        value={formData.password} 
                                        onChange={handleChange} 
                                        autoComplete="new-password"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if(e.key === 'Enter') {
                                                if(isReturningUser) handleSubmit(e);
                                                // Rimosso il setStep(3) automatico qui, deve cliccare il bottone dopo il check
                                            }
                                        }}
                                    />
                                    
                                    {/* Bottone Login per utenti di ritorno */}
                                    {isReturningUser && (
                                        <button onClick={handleSubmit} className="clean-btn" style={{marginTop: '20px'}}>
                                            ACCEDI
                                        </button>
                                    )}

                                    {/* SEZIONE NUOVI UTENTI: CHECKBOX + BOTTONE BLOCCO */}
                                    {!isReturningUser && formData.password.length > 5 && (
                                        <div style={{marginTop: '20px'}}>
                                            
                                            {/* CHECKBOX GDPR E 14+ ANNI */}
                                            <div style={{display:'flex', gap:'10px', alignItems:'flex-start', marginBottom:'15px', textAlign:'left'}}>
                                                <input 
                                                    type="checkbox" 
                                                    id="terms-check" 
                                                    checked={acceptedTerms} 
                                                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                                                    style={{marginTop:'4px', cursor:'pointer', width:'20px', height:'20px', accentColor: 'black'}} 
                                                />
                                                <label htmlFor="terms-check" style={{fontSize:'0.85rem', color:'#666', lineHeight:'1.4', cursor:'pointer'}}>
                                                    Dichiaro di avere <strong>più di 14 anni</strong> e accetto i <span onClick={() => window.open('/termini', '_blank')} style={{textDecoration:'underline', color:'blue', cursor:'pointer'}}>Termini e Condizioni</span> e la <span onClick={() => window.open('/policy', '_blank')} style={{textDecoration:'underline', color:'blue', cursor:'pointer'}}>Privacy Policy</span>.
                                                </label>
                                            </div>

                                            {/* BOTTONE (Disabilitato se non accetta) */}
                                            <button 
                                                type="button" 
                                                onClick={() => setStep(3)} 
                                                disabled={!acceptedTerms} 
                                                className="clean-btn"
                                                style={{
                                                    background: acceptedTerms ? '#000' : '#ccc', 
                                                    color: '#fff',
                                                    cursor: acceptedTerms ? 'pointer' : 'not-allowed',
                                                    transition: 'background 0.3s'
                                                }}
                                            >
                                                SCEGLI IL TUO PIANO →
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* PIN (Step 4) */}
                    {step === 4 && (
                        <div className="animate-in" style={{textAlign: 'center'}}>
                            <input className="clean-input" type="text" placeholder="------" value={pinCode} onChange={(e) => setPinCode(e.target.value)} maxLength={6} style={{textAlign: 'center', fontSize: '32px', letterSpacing: '10px'}} autoFocus />
                            <button type="button" onClick={handleResendPin} style={{background:'none', border:'none', textDecoration:'underline', cursor:'pointer', marginTop:'10px'}}>Invia nuovo codice</button>
                            
                            {pinCode.length === 6 && (
                                <button onClick={handleSubmit} className="clean-btn" style={{marginTop:'20px'}}>
                                    VERIFICA ACCOUNT
                                </button>
                            )}
                        </div>
                    )}

                </form>
            </div>
        )}
      </div>
    </div>
  );
}

export default RegisterReader;