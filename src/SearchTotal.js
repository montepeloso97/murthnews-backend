import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header2 from './Header2'; // La tua barra secondaria
import Footer from './Footer';   // Se hai il footer

function SearchTotal() {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q');
    const navigate = useNavigate();

    // --- STATI DATI ---
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- STATI HEADER ---
    const [user, setUser] = useState(null);
    const [logoUrl, setLogoUrl] = useState('');
    const [siteName, setSiteName] = useState('MurthNews');
    const [scrolled, setScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // --- TEMA ---
    const [theme, setTheme] = useState(localStorage.getItem('site_theme') || 'light');
    const isDark = theme === 'dark';

    // --- COLORI ---
    const C = {
        bg: isDark ? '#0f172a' : '#f8fafc',
        card: isDark ? '#1e293b' : '#ffffff',
        text: isDark ? '#f8fafc' : '#1e293b',
        meta: isDark ? '#94a3b8' : '#64748b',
        border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        accent: '#2563eb'
    };

    // --- EFFETTI ---
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);

        // 1. CARICA RISULTATI
        const doSearch = async () => {
            if (!query) return;
            setLoading(true);
            try {
                const res = await axios.get(`https://murthnews-api.onrender.com/api/search/news?q=${query}`);
                setResults(res.data);
            } catch (err) { console.error("Errore ricerca:", err); } 
            finally { setLoading(false); }
        };
        doSearch();

        // 2. CARICA SETTINGS HEADER
        const fetchSettings = async () => {
            try {
                const res = await axios.get('https://murthnews-api.onrender.com/api/settings');
                if (res.data) {
                    setLogoUrl(res.data.logoUrl);
                    setSiteName(res.data.siteName || 'MurthNews');
                }
            } catch (err) {}
        };
        fetchSettings();

        // 3. CARICA UTENTE
        const checkUser = () => {
            const storedData = localStorage.getItem('reader_user') || localStorage.getItem('user_data');
            if (storedData) {
                try {
                    const parsed = JSON.parse(storedData);
                    if (parsed && (parsed._id || parsed.email)) {
                        setUser(parsed);
                        if (parsed.theme && parsed.theme !== theme) setTheme(parsed.theme);
                    }
                } catch (e) {}
            }
        };
        checkUser();

        return () => window.removeEventListener('scroll', handleScroll);
    }, [query]);

    // --- NAVIGAZIONE ---
    const goToArticle = (news) => {
        // Se l'articolo ha uno slug usiamo quello, altrimenti l'ID
        const identifier = news.slug || news._id;
        // Questa rotta deve corrispondere a quella definita in App.js per NewsPage
        navigate(`/news/${identifier}`); 
    };

    const handleNavClick = (path) => {
        navigate(path);
        setIsMenuOpen(false);
    };

    // --- GESTIONE TEMA/LOGOUT ---
    const toggleTheme = async () => {
        const newTheme = isDark ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('site_theme', newTheme);
        if (user && user._id) {
            const updatedUser = { ...user, theme: newTheme };
            setUser(updatedUser);
            localStorage.setItem('reader_user', JSON.stringify(updatedUser)); 
            try {
                const url = user.livello ? 'https://murthnews-api.onrender.com/api/reader/update' : `https://murthnews-api.onrender.com/api/users/${user._id}`;
                const payload = user.livello ? { id: user._id, theme: newTheme } : { theme: newTheme };
                await axios.put(url, payload);
            } catch (e) {}
        }
    };

    const handleLogout = (e) => {
        if(e) e.stopPropagation();
        localStorage.removeItem('user_token');
        localStorage.removeItem('reader_user');
        localStorage.removeItem('user_data');
        setUser(null);
        navigate('/login');
    };

    return (
        <div style={{ backgroundColor: C.bg, color: C.text, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            
            <style>{`
                .mobile-hamburger { display: block; }
                .desktop-menu { display: none !important; }
                @media (min-width: 769px) {
                    .mobile-hamburger { display: none !important; }
                    .desktop-menu { display: flex !important; }
                }
                .nav-pill-item { 
                    padding: 8px 20px; border-radius: 50px; font-weight: 600; font-size: 0.9rem; 
                    cursor: pointer; transition: all 0.2s ease; opacity: 0.9; color: ${C.text}; 
                }
                .nav-pill-item:hover { 
                    transform: translateY(-2px); opacity: 1; 
                    background-color: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}; 
                }
            `}</style>

            {/* HEADER PRINCIPALE */}
            <header style={{
                position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 1000,
                padding: '15px 5%',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'background-color 0.3s ease',
                backgroundColor: (scrolled || isMenuOpen) ? (isDark ? '#0f172a' : '#ffffff') : 'transparent',
                borderBottom: (scrolled || isMenuOpen) ? `1px solid ${C.border}` : 'none',
                boxShadow: scrolled ? '0 4px 10px rgba(0,0,0,0.1)' : 'none'
            }}>
                <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                    <button className="mobile-hamburger" onClick={() => setIsMenuOpen(!isMenuOpen)} 
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: C.text, zIndex: 1001 }}>
                        {isMenuOpen ? '✕' : '☰'}
                    </button>

                    <div onClick={()=>navigate('/')} style={{cursor:'pointer', display:'flex', alignItems:'center', zIndex: 1001}}>
                        {logoUrl ? (
                            <img src={logoUrl} alt={siteName} 
                                style={{
                                    height: '55px', 
                                    objectFit:'contain',
                                    filter: isDark ? 'brightness(0) invert(1)' : 'none'
                                }} 
                            />
                        ) : (
                            <span style={{fontWeight:'800', fontSize:'1.5rem', color: C.text}}>{siteName}</span>
                        )}
                    </div>
                    
                    <nav className="desktop-menu" style={{alignItems:'center', gap:'5px', marginLeft:'10px'}}>
                        <span className="nav-pill-item" onClick={()=>handleNavClick('/')}>Home</span>
                        <span className="nav-pill-item" onClick={()=>handleNavClick('/categories')}>Categoria</span>
                        <span className="nav-pill-item" onClick={()=>handleNavClick('/policy')}>Policy</span>
                    </nav>
                </div>

                <div style={{display:'flex', alignItems:'center', gap:'15px', zIndex: 1001}}>
                    <button onClick={toggleTheme} style={{background:'transparent', border:'none', fontSize:'1.2rem', cursor:'pointer', padding: 0, color: C.text}}>
                        {isDark ? '☀️' : '🌙'}
                    </button>

                    {user ? (
                        <div onClick={()=>navigate('/dashboard')} 
                            style={{
                                display:'flex', alignItems:'center', gap:'8px', cursor:'pointer',
                                padding: '4px 12px 4px 4px', borderRadius: '50px',
                                border: `1px solid ${C.border}`,
                                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                            }}
                        >
                            <div style={{width:'30px', height:'30px', borderRadius:'50%', overflow:'hidden', background: C.accent, color: 'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', fontSize:'0.8rem'}}>
                                {user.profileImage ? (
                                    <img src={user.profileImage} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="U"/>
                                ) : (
                                    (user.nome ? user.nome.charAt(0).toUpperCase() : "U")
                                )}
                            </div>
                            <div style={{display:'flex', flexDirection:'column', lineHeight:'1', paddingRight:'5px'}}>
                                <span style={{fontWeight:'700', fontSize:'0.8rem', color: C.text}}>{user.nome || "Utente"}</span>
                            </div>
                            <div onClick={handleLogout} style={{marginLeft:'5px', color:'#ef4444', fontSize:'1.1rem', padding:'0 5px'}} title="Esci">⏻</div>
                        </div>
                    ) : (
                        <button onClick={()=>navigate('/login')} 
                            style={{
                                background: 'transparent', border: `1px solid ${C.text}`, borderRadius: '50px', padding: '8px 24px',
                                color: C.text, fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', textTransform: 'uppercase'
                            }}
                        >
                            Entra
                        </button>
                    )}
                </div>
            </header>

            {/* MENU MOBILE */}
            <div style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh',
                backgroundColor: C.bg, zIndex: 999, paddingTop: '100px', 
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
                transform: isMenuOpen ? 'translateY(0)' : 'translateY(-100%)', 
                opacity: isMenuOpen ? 1 : 0, transition: 'all 0.3s ease-in-out', pointerEvents: isMenuOpen ? 'all' : 'none'
            }}>
                <span style={{fontSize: '1.5rem', fontWeight: 'bold', cursor:'pointer'}} onClick={()=>handleNavClick('/')}>Home</span>
                <span style={{fontSize: '1.5rem', fontWeight: 'bold', cursor:'pointer'}} onClick={()=>handleNavClick('/categories')}>Categoria</span>
                <span style={{fontSize: '1.5rem', fontWeight: 'bold', cursor:'pointer'}} onClick={()=>handleNavClick('/policy')}>Policy</span>
                <div style={{width: '50%', height: '1px', backgroundColor: C.border, margin: '20px 0'}}></div>
                {!user && (
                    <button onClick={()=>handleNavClick('/register')} 
                        style={{background: C.accent, color: 'white', border: 'none', padding: '12px 30px', borderRadius: '50px', fontSize: '1.2rem', fontWeight: 'bold'}}>
                        Registrati Gratis
                    </button>
                )}
            </div>

            {/* HEADER 2 (La tua barra di ricerca) */}
            <Header2 theme={theme} />

            {/* CONTENUTO RISULTATI */}
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '160px 20px 60px 20px', width: '100%', flex: 1 }}>
                
                <h1 style={{fontSize:'32px', marginBottom:'10px'}}>
                    Risultati per: <span style={{color: C.accent}}>"{query}"</span>
                </h1>
                <p style={{color: C.meta, marginBottom:'40px'}}>
                    {loading ? 'Ricerca in corso...' : `Trovati ${results.length} articoli`}
                </p>

                {loading ? (
                    <div style={{textAlign:'center', marginTop:'50px'}}>Caricamento...</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '30px' }}>
                        
                        {results.length === 0 && (
                            <div style={{gridColumn:'1/-1', textAlign:'center', padding:'50px', color:C.meta, border:`2px dashed ${C.border}`, borderRadius:'20px'}}>
                                😕 Nessun articolo trovato. Prova con un'altra parola.
                            </div>
                        )}

                        {results.map((news) => (
                            <div 
                                key={news._id} 
                                onClick={() => goToArticle(news)}
                                style={{
                                    background: C.card, borderRadius: '16px', border: `1px solid ${C.border}`,
                                    overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                <div style={{height: '180px', width:'100%', background: '#ccc'}}>
                                    {news.coverImage ? (
                                        <img src={news.coverImage} alt={news.title} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                                    ) : (
                                        <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background: C.border}}>NO FOTO</div>
                                    )}
                                </div>
                                <div style={{padding: '20px'}}>
                                    <div style={{fontSize:'11px', fontWeight:'800', color: C.accent, textTransform:'uppercase', marginBottom:'5px'}}>
                                        {news.category || 'News'}
                                    </div>
                                    <h3 style={{fontSize:'18px', fontWeight:'bold', margin:'0 0 10px 0', lineHeight:'1.4'}}>
                                        {news.title}
                                    </h3>
                                    {news.summary && (
                                        <p style={{fontSize:'14px', color: C.meta, lineHeight:'1.6', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>
                                            {news.summary}
                                        </p>
                                    )}
                                    <div style={{fontSize:'12px', color: C.meta, marginTop:'15px', borderTop:`1px solid ${C.border}`, paddingTop:'10px'}}>
                                        📅 {new Date(news.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Footer />
        </div>
    );
}

export default SearchTotal;