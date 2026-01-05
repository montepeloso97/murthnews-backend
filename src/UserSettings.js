import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; 
import axios from 'axios';
import './App.css'; 

function UserSettings() {
    const navigate = useNavigate();
    const location = useLocation(); 
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Categorie dal DB
    const [dbCategories, setDbCategories] = useState([]);
    
    const [showSuccess, setShowSuccess] = useState(false);
    const fileInputRef = useRef(null);
    
    const [formData, setFormData] = useState({
        nome: '',
        cognome: '',
        password: '',
        confirmPassword: '',
        interessi: [],
        profileImage: ''
    });

    const defaultCategories = ["Politica", "Cronaca", "Sport", "Tech", "Economia", "Cultura", "Mondo", "Lifestyle", "Scienza"];

    useEffect(() => {
        const stored = localStorage.getItem('reader_user');
        if (!stored) {
            navigate('/login');
        } else {
            const u = JSON.parse(stored);
            setUser(u);
            setFormData({
                nome: u.nome || '',
                cognome: u.cognome || '',
                password: '',
                confirmPassword: '',
                interessi: u.interessi || [],
                profileImage: u.profileImage || ''
            });
            
            // Applica il tema salvato
            if(u.theme === 'dark') document.body.classList.add('dark-theme');
            else document.body.classList.remove('dark-theme');
        }

        // Carica Categorie
        axios.get('https://murthnews-api.onrender.com/api/categories')
            .then(res => {
                setDbCategories(res.data && res.data.length > 0 ? res.data.map(c => c.name) : defaultCategories);
            })
            .catch(() => setDbCategories(defaultCategories));

    }, [navigate]);

    // Scroll automatico
    useEffect(() => {
        if (location.hash === '#interests') {
            setTimeout(() => {
                const element = document.getElementById('interests-section');
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Piccolo flash per evidenziare
                    element.style.border = "2px solid var(--accent-color)";
                    setTimeout(() => element.style.border = "none", 1000);
                }
            }, 300);
        }
    }, [location]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const toggleInterest = (cat) => {
        setFormData(prev => {
            const current = prev.interessi || [];
            return current.includes(cat) 
                ? { ...prev, interessi: current.filter(c => c !== cat) }
                : { ...prev, interessi: [...current, cat] };
        });
    };

    const handleImageClick = () => fileInputRef.current.click();

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setFormData(prev => ({ ...prev, profileImage: reader.result }));
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (formData.password && formData.password !== formData.confirmPassword) {
            alert("⚠️ Le password non coincidono!");
            return;
        }

        setLoading(true);
        try {
            const res = await axios.put('https://murthnews-api.onrender.com/api/reader/update', {
                id: user._id,
                ...formData
            });

            if (res.data.success) {
                localStorage.setItem('reader_user', JSON.stringify(res.data.user));
                setUser(res.data.user);
                
                setShowSuccess(true);
                setTimeout(() => { setShowSuccess(false); }, 4000);

                setFormData(prev => ({ ...prev, password: '', confirmPassword: '' })); 
            }
        } catch (error) {
            alert("Errore durante il salvataggio."); 
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('reader_user');
        document.body.classList.remove('dark-theme');
        navigate('/');
        window.location.reload();
    };

    const handleDeleteAccount = async () => {
        if (!user) return;
        const confirm1 = window.confirm("SEI SICURO? Cancellando l'account perderai l'accesso a tutti i contenuti e l'abbonamento.");
        if (confirm1) {
            const confirm2 = window.confirm("Ultima conferma: Procedere con l'eliminazione definitiva?");
            if (confirm2) {
                setLoading(true);
                try {
                    await axios.delete(`https://murthnews-api.onrender.com/api/users/${user._id}`);
                    localStorage.removeItem('reader_user');
                    alert("Account eliminato. Ci dispiace vederti andare.");
                    navigate('/');
                    window.location.reload();
                } catch (error) {
                    const msg = error.response?.data?.message || error.message;
                    alert("Errore eliminazione: " + msg);
                    setLoading(false);
                }
            }
        }
    };

    if (!user) return null;

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera";

    return (
        <div className="modern-dash">
            
            {showSuccess && (
                <div className="success-toast">
                    <span>✅</span> Profilo aggiornato con successo!
                </div>
            )}

            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden-file-input" />

            {/* HEADER DASHBOARD */}
            <header className="dash-hero">
                <div>
                    <div className="dash-date">IL TUO ACCOUNT</div>
                    <h1>{greeting}, <span className="highlight-name">{user.nome}</span>.</h1>
                </div>
                <button onClick={() => navigate('/dashboard')} style={{background:'transparent', border:'1px solid var(--border-color)', padding:'10px 25px', borderRadius:'30px', cursor:'pointer', fontWeight:'bold', color:'var(--text-main)'}}>
                    ← Torna alla Dashboard
                </button>
            </header>

            <div className="dash-layout">
                
                {/* SIDEBAR SINISTRA */}
                <aside className="dash-sidebar">
                    <div className="profile-widget">
                        <div className="avatar-ring" onClick={handleImageClick} title="Clicca per cambiare foto">
                            <div className="avatar-editable">
                                {formData.profileImage ? (
                                    <img src={formData.profileImage} alt="Profile" className="avatar-img-real" />
                                ) : (
                                    <div className="avatar-content">{user.nome.charAt(0)}</div>
                                )}
                                <div className="avatar-overlay">📷</div>
                            </div>
                        </div>
                        <h3>{user.nome} {user.cognome}</h3>
                        <p className="email-label">{user.email}</p>
                    </div>
                    
                    <nav className="minimal-menu">
                        <button className="menu-item" onClick={() => navigate('/dashboard')}>
                            <span className="icon">🏠</span> Dashboard
                        </button>
                        <button className="menu-item active">
                            <span className="icon">⚙️</span> Impostazioni
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

                {/* CONTENUTO CENTRALE */}
                <main className="dash-content">
                    
                    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(400px, 1fr))', gap:'25px'}}>

                        {/* BOX 1: DATI PERSONALI */}
                        <div className="settings-card">
                            <h3 className="settings-section-title">👤 Dati Personali</h3>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Nome</label>
                                    <input className="form-input" name="nome" value={formData.nome} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Cognome</label>
                                    <input className="form-input" name="cognome" value={formData.cognome} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email (Non modificabile)</label>
                                <input className="form-input" value={user.email} disabled style={{opacity:0.7, cursor:'not-allowed'}} />
                            </div>
                        </div>

                        {/* BOX 2: SICUREZZA */}
                        <div className="settings-card">
                            <h3 className="settings-section-title">🔒 Sicurezza</h3>
                            <div className="form-group">
                                <label className="form-label">Nuova Password</label>
                                <input className="form-input" type="password" name="password" placeholder="Inserisci nuova password" value={formData.password} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Conferma Password</label>
                                <input className="form-input" type="password" name="confirmPassword" placeholder="Ripeti password" value={formData.confirmPassword} onChange={handleChange} />
                            </div>
                        </div>

                    </div>

                    {/* BOX 3: INTERESSI (Larghezza Piena) */}
                    <div className="settings-card" id="interests-section" style={{marginTop:'25px'}}>
                        <h3 className="settings-section-title">❤️ I tuoi Interessi</h3>
                        <p style={{color:'var(--text-muted)', marginBottom:'20px', fontSize:'0.9rem'}}>Seleziona gli argomenti che vuoi vedere più spesso nel tuo feed.</p>
                        <div className="interests-grid">
                            {dbCategories.map(cat => (
                                <div key={cat} className={`interest-tag ${formData.interessi.includes(cat) ? 'active' : ''}`} onClick={() => toggleInterest(cat)}>
                                    {cat}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* BOX 4: STATO ABBONAMENTO (Stile Dashboard) */}
                    <div className="settings-card subscription-box" style={{marginTop:'25px'}}>
                        <h3 className="settings-section-title" style={{borderBottom:'none', marginBottom:'10px', color:'var(--text-main)'}}>
                            💎 Il tuo Piano
                        </h3>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'20px'}}>
                            <div>
                                <div style={{fontSize:'0.8rem', fontWeight:'bold', color:'var(--text-muted)', textTransform:'uppercase'}}>Piano Attuale</div>
                                <div style={{fontSize:'1.8rem', fontWeight:'900', color:'var(--text-main)'}}>
                                    {user.livello === 'standard' ? 'FREE START' : user.livello.toUpperCase()}
                                </div>
                            </div>
                            <button onClick={() => navigate('/dashboard/subscription')} className="clean-btn small" style={{width:'auto', marginTop:0}}>
                                Gestisci Abbonamento
                            </button>
                        </div>
                    </div>

                    {/* TASTO SALVA (Destra) */}
                    <div style={{textAlign:'right', marginTop:'30px', marginBottom:'50px'}}>
                        <button onClick={handleSave} disabled={loading} className="clean-btn" style={{width:'auto', padding:'15px 40px', fontSize:'1rem'}}>
                            {loading ? 'Salvataggio...' : 'SALVA MODIFICHE'}
                        </button>
                    </div>

                    {/* ZONA PERICOLO (Design Pulito) */}
                    <div style={{borderTop:'1px solid var(--border-color)', paddingTop:'30px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'20px'}}>
                        <div>
                            <h4 style={{margin:0, color:'#ef4444', fontSize:'1rem'}}>Eliminazione Account</h4>
                            <p style={{margin:'5px 0 0 0', fontSize:'0.85rem', color:'var(--text-muted)'}}>
                                L'azione è irreversibile e cancellerà tutti i dati.
                            </p>
                        </div>
                        <button 
                            onClick={handleDeleteAccount}
                            disabled={loading}
                            style={{
                                padding: '10px 20px',
                                background: 'transparent',
                                color: '#ef4444',
                                border: '1px solid #ef4444',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                            onMouseOver={(e) => {e.target.style.background = '#ef4444'; e.target.style.color = 'white'}}
                            onMouseOut={(e) => {e.target.style.background = 'transparent'; e.target.style.color = '#ef4444'}}
                        >
                           Elimina Account
                        </button>
                    </div>

                </main>
            </div>
        </div>
    );
}

export default UserSettings;