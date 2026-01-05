import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import SiteLogo from './SiteLogo';
import Footer from './Footer';

// --- ICONE ---
const IconArrowRight = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>;
const IconMenu = () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>;
const IconClose = () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

function CategoriesPage() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // --- DATI ---
    const [categories, setCategories] = useState([]);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // --- UI & TEMA ---
    const [theme, setTheme] = useState(() => localStorage.getItem('site_theme') || 'light');
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // 1. SCROLL LISTENER
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // 2. FETCH DATI
    useEffect(() => {
        const fetchData = async () => {
            try {
                // UTENTE
                const storedUserString = localStorage.getItem('reader_user');
                let currentUser = null;
                if (storedUserString) {
                    const localUser = JSON.parse(storedUserString);
                    try {
                        const userRes = await axios.get(`https://murthnews-api.onrender.com/api/reader/status/${localUser._id}`);
                        currentUser = userRes.data;
                        setUser(currentUser);
                        if (currentUser.theme) setTheme(currentUser.theme);
                    } catch (e) { setUser(localUser); }
                }

                // CATEGORIE (DAL DB)
                const resCats = await axios.get('https://murthnews-api.onrender.com/api/categories');
                setCategories(resCats.data);

                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };
        fetchData();
        setMobileMenuOpen(false); // Chiudi menu se cambio pagina
    }, [location]);

    // --- AZIONI ---
    const toggleTheme = async () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('site_theme', newTheme);
        if (user) {
            try { await axios.put('https://murthnews-api.onrender.com/api/reader/update', { id: user._id, theme: newTheme }); } catch (e) {}
        }
    };

    // --- VISUAL ---
    const isDark = theme === 'dark';
    const isPremiumUser = user && (user.livello !== 'standard');

    const C = {
        bg: isDark ? '#0f172a' : '#f8fafc',
        text: isDark ? '#f1f5f9' : '#1e293b',
        meta: isDark ? '#94a3b8' : '#64748b',
        accent: '#6366f1', 
        border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        gold: '#fbbf24',
        
        // Header
        headerBg: scrolled ? (isDark ? '#0f172a' : '#ffffff') : 'transparent',
        headerBorder: scrolled ? (isDark ? '#334155' : '#e2e8f0') : 'transparent',
        headerText: isDark ? '#f8fafc' : '#1e293b',

        // Card Categoria
        cardBg: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.8)',
        cardHover: isDark ? 'rgba(30, 41, 59, 0.9)' : '#ffffff',
        glow: isDark 
            ? 'radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.15) 0%, rgba(15, 23, 42, 0) 60%)'
            : 'radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.1) 0%, rgba(248, 250, 252, 0) 60%)',
    };

    return (
        <div style={{ backgroundColor: C.bg, color: C.text, minHeight: '100vh', transition: '0.3s', fontFamily: "'Inter', sans-serif", width: '100%', overflowX: 'hidden', position: 'relative' }}>
            
            {/* SFONDO GLOW */}
            <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100vh', background: C.glow, zIndex:0, pointerEvents:'none'}}></div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Roboto+Condensed:wght@700&family=Inter:wght@400;600;700&display=swap');
                
                /* HEADER */
                .header-container {
                    position: fixed; top: 0; left: 0; width: 100%; z-index: 1000;
                    padding: ${scrolled ? '15px 5%' : '20px 5%'};
                    display: flex; justify-content: space-between; align-items: center;
                    transition: all 0.3s ease;
                    backdrop-filter: ${scrolled ? 'none' : 'blur(5px)'};
                    box-sizing: border-box;
                }
                .nav-menu { display: flex; gap: 5px; }
                .nav-item { padding: 8px 16px; border-radius: 30px; cursor: pointer; font-weight: 600; font-size: 0.9rem; transition: 0.2s; color: inherit; }
                .nav-item:hover { background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}; }
                
                .user-box { display: flex; align-items: center; gap: 10px; padding: 4px 15px 4px 4px; border-radius: 50px; cursor: pointer; transition: 0.3s; border: 1px solid ${C.headerBorder}; background: ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)'}; }
                .user-box:hover { border-color: ${C.accent}; transform: translateY(-2px); }

                /* GRID CATEGORIE */
                .cats-grid {
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 30px;
                    max-width: 1200px; margin: 0 auto; padding: 40px 20px; position: relative; z-index: 2;
                }
                
                .cat-card {
                    background: ${C.cardBg}; border: 1px solid ${C.border};
                    border-radius: 20px; padding: 40px 30px; text-align: center;
                    cursor: pointer; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    min-height: 200px; position: relative; overflow: hidden;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                }
                .cat-card:hover { 
                    transform: translateY(-10px); 
                    border-color: ${C.accent}; 
                    background: ${C.cardHover};
                    box-shadow: 0 20px 40px -10px rgba(0,0,0,0.2); 
                }
                
                .cat-title { 
                    font-family: 'Roboto Condensed', sans-serif; font-size: 2rem; 
                    text-transform: uppercase; font-weight: 800; z-index: 2; position: relative;
                    color: ${C.text}; letter-spacing: 1px;
                }
                
                /* Lettera decorativa sullo sfondo */
                .cat-deco { 
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    font-size: 10rem; opacity: 0.05; font-weight: 900; z-index: 1; 
                    color: ${C.text}; pointer-events: none; transition: 0.4s;
                }
                .cat-card:hover .cat-deco { opacity: 0.1; transform: translate(-50%, -50%) scale(1.2); color: ${C.accent}; }

                .view-btn {
                    margin-top: 20px; z-index: 2; font-size: 0.9rem; font-weight: 700; color: ${C.accent};
                    display: flex; align-items: center; gap: 8px; opacity: 0.8; transition: 0.2s;
                }
                .cat-card:hover .view-btn { opacity: 1; gap: 12px; }

                /* MOBILE MENU */
                .menu-btn { display: none; background: transparent; border: none; color: inherit; cursor: pointer; padding: 5px; }
                .mobile-menu {
                    position: fixed; top: ${scrolled ? '70px' : '80px'}; left: 0; width: 100%;
                    background: ${isDark ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)'};
                    border-bottom: 1px solid ${C.border}; padding: 20px; 
                    display: flex; flex-direction: column; gap: 15px; backdrop-filter: blur(10px); z-index: 999;
                    animation: slideDown 0.3s ease forwards;
                }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
                .mobile-link { font-size: 1.1rem; font-weight: 700; color: ${C.text}; padding: 10px; border-radius: 8px; }

                @media(max-width: 900px){ 
                    .mobile-hide { display: none; } .user-name { display: none; } 
                    .nav-menu { display: none; } .menu-btn { display: block; }
                    .header-container { padding: 15px 20px; } 
                    .cats-grid { grid-template-columns: 1fr; gap: 20px; }
                }
            `}</style>

            {/* HEADER INTEGRATO */}
            <header className="header-container" style={{ backgroundColor: C.headerBg, borderBottom: `1px solid ${C.headerBorder}`, color: C.headerText }}>
                {/* SINISTRA */}
                <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                    <button className="menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        {mobileMenuOpen ? <IconClose /> : <IconMenu />}
                    </button>
                    <div onClick={() => navigate('/')} style={{cursor:'pointer'}}><SiteLogo theme={theme} /></div>
                    <nav className="nav-menu">
                        <div className="nav-item" onClick={() => navigate('/')}>Home</div>
                        <div className="nav-item" onClick={() => navigate('/categories')}>Categorie</div>
                        <div className="nav-item mobile-hide" onClick={() => navigate('/policy')}>Chi Siamo</div>
                    </nav>
                </div>

                {/* DESTRA */}
                <div style={{display:'flex', alignItems:'center'}}>
                    <button onClick={toggleTheme} style={{background:'transparent', border:`1px solid ${C.border}`, borderRadius:'50%', width:'35px', height:'35px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', marginRight:'10px', color:'inherit', fontSize:'1.1rem'}}>{isDark ? '☀️' : '🌙'}</button>
                    {user ? (
                        <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                            {!isPremiumUser && <button className="mobile-hide" onClick={() => navigate('/dashboard/subscription')} style={{background: 'transparent', color: C.accent, border: `1px solid ${C.accent}`, padding: '6px 15px', borderRadius: '30px', fontWeight: '700', fontSize: '0.75rem', cursor: 'pointer'}}>⭐ Passa a Premium</button>}
                            <div className="user-box" onClick={() => navigate('/dashboard')}>
                                <div style={{width: '32px', height: '32px', borderRadius: '50%', background: C.accent, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', overflow: 'hidden', border: isPremiumUser ? `2px solid ${C.gold}` : 'none'}}>
                                    {user.profileImage ? <img src={user.profileImage} style={{width:'100%', height:'100%'}} alt="Me"/> : user.nome.charAt(0)}
                                </div>
                                <div className="user-name" style={{display:'flex', alignItems:'center', gap:'6px', paddingRight:'5px', fontWeight:'600', fontSize:'0.9rem'}}><span>{user.nome}</span>{isPremiumUser ? <span style={{color: C.gold}}>★</span> : null}</div>
                            </div>
                        </div>
                    ) : (
                        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                            <button onClick={() => navigate('/login')} style={{background: 'transparent', color: 'inherit', border: `1px solid ${C.border}`, padding: '8px 20px', borderRadius: '30px', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer'}}>Accedi</button>
                            <button className="mobile-hide" onClick={() => navigate('/register')} style={{background: C.accent, color: 'white', border: 'none', padding: '8px 20px', borderRadius: '30px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer'}}>✨ Abbonati</button>
                        </div>
                    )}
                </div>
            </header>

            {/* MOBILE MENU */}
            {mobileMenuOpen && (
                <div className="mobile-menu">
                    <div className="mobile-link" onClick={() => navigate('/')}>Home</div>
                    <div className="mobile-link" onClick={() => navigate('/categories')}>Categorie</div>
                    <div className="mobile-link" onClick={() => navigate('/policy')}>Chi Siamo</div>
                    {!user && (
                        <div className="mobile-link" onClick={() => navigate('/register')} style={{color: C.accent}}>✨ Abbonati Ora</div>
                    )}
                </div>
            )}

            {/* CONTENUTO */}
            <div style={{paddingTop:'150px', paddingBottom:'80px', maxWidth:'1200px', margin:'0 auto', position:'relative', zIndex:1, paddingLeft:'20px', paddingRight:'20px'}}>
                
                {/* HERO */}
                <div style={{textAlign:'center', marginBottom:'60px'}}>
                    <div style={{textTransform:'uppercase', letterSpacing:'3px', fontSize:'0.8rem', color: C.accent, fontWeight:'800', marginBottom:'15px', opacity:0.9}}>NAVIGAZIONE</div>
                    <h1 style={{fontFamily:"'Playfair Display', serif", fontSize:'clamp(3rem, 5vw, 4.5rem)', margin:'0 0 15px 0', textTransform:'capitalize', color: C.text}}>
                        Esplora Categorie
                    </h1>
                    <p style={{color: C.meta, fontSize:'1.2rem', maxWidth:'600px', margin:'0 auto'}}>
                        Sfoglia le nostre sezioni principali e scopri le notizie che ti interessano di più.
                    </p>
                </div>

                {loading ? (
                    <div style={{textAlign:'center', padding:'50px'}}>Caricamento...</div>
                ) : (
                    <div className="cats-grid">
                        {categories.map(cat => (
                            <div 
                                key={cat._id} 
                                className="cat-card" 
                                onClick={() => navigate('/category/' + cat.name)} // Link alla pagina singola
                            >
                                {/* Iniziale decorativa */}
                                <span className="cat-deco">{cat.name.charAt(0)}</span>
                                
                                <h3 className="cat-title">{cat.name}</h3>
                                
                                <div className="view-btn">
                                    Vedi Notizie <IconArrowRight />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div> {/* Fine del contenitore principale (paddingTop 150px) */}

            {/* IL FOOTER VA QUI */}
            <Footer theme={theme} />

        </div> // Fine del wrapper principale (quello con il colore di sfondo)
    );
}

export default CategoriesPage;