import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Footer from './Footer'; 
import Header2 from './Header2'; // <--- AGGIUNGI QUESTO

function PageViewer() {
    const { slug } = useParams();
    const navigate = useNavigate();

    // --- STATI PAGINA ---
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

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
        bg: isDark ? '#0f172a' : '#ffffff',
        text: isDark ? '#f8fafc' : '#1e293b',
        meta: isDark ? '#94a3b8' : '#6b7280',
        border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        accent: '#2563eb'
    };

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);

        const fetchPage = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`https://murthnews-api.onrender.com/api/pages/slug/${slug}`);
                setPage(res.data);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setError(true);
                setLoading(false);
            }
        };
        fetchPage();

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

        // --- RECUPERO UTENTE CORRETTO ---
        const checkUser = () => {
            // FIX: Ora cerchiamo PRIMA in 'reader_user' (la chiave che hai tu), poi in 'user_data' come fallback
            const storedData = localStorage.getItem('reader_user') || localStorage.getItem('user_data');
            
            if (storedData) {
                try {
                    const parsed = JSON.parse(storedData);
                    if (parsed && (parsed._id || parsed.email)) {
                        console.log("Utente Trovato:", parsed.nome);
                        setUser(parsed);
                        if (parsed.theme && parsed.theme !== theme) setTheme(parsed.theme);
                    }
                } catch (e) { console.error(e); }
            }
        };
        checkUser();

        return () => window.removeEventListener('scroll', handleScroll);
    }, [slug]);

    // --- AZIONI ---
    const toggleTheme = async () => {
        const newTheme = isDark ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('site_theme', newTheme);
        if (user && user._id) {
            const updatedUser = { ...user, theme: newTheme };
            setUser(updatedUser);
            // Salviamo su entrambe le chiavi per sicurezza futura
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
        localStorage.removeItem('reader_user'); // Rimuovi la chiave corretta
        localStorage.removeItem('user_data');   // Rimuovi anche l'altra per pulizia
        setUser(null);
        navigate('/login');
    };

    const handleNavClick = (path) => {
        navigate(path);
        setIsMenuOpen(false);
    };

    if (loading) return <div style={{padding:'100px', textAlign:'center', background:C.bg, color:C.text, minHeight:'100vh'}}>Caricamento...</div>;

    if (error || !page) return (
        <div style={{ background:C.bg, color:C.text, minHeight:'100vh', padding:'100px', textAlign:'center' }}>
            <h1>404</h1><p>Pagina non trovata</p>
            <button onClick={()=>navigate('/')}>Home</button>
        </div>
    );

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
                                <span style={{fontWeight:'700', fontSize:'0.8rem', color: C.text}}>
                                    {user.nome || "Utente"}
                                </span>
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
            <Header2 theme={theme} />

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

            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '160px 20px 60px 20px', flex: 1, width: '100%' }}>
                <header style={{ marginBottom: '40px', borderBottom: `1px solid ${C.border}`, paddingBottom: '20px' }}>
                    <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: '900', lineHeight: '1.1', marginBottom: '15px' }}>
                        {page.title}
                    </h1>
                    <div style={{ fontSize: '0.9rem', color: C.meta, fontStyle: 'italic' }}>
                        Ultimo aggiornamento: {new Date(page.updatedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                </header>
                <div style={{ fontSize: '1.2rem', lineHeight: '1.8', fontFamily: 'Georgia, serif', whiteSpace: 'pre-line' }}
                    dangerouslySetInnerHTML={{ __html: page.content }} 
                />
            </div>

            <Footer />
        </div>
    );
}

export default PageViewer;