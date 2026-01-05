import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import SiteLogo from './SiteLogo';
import Footer from './Footer';

// --- ICONE SVG ---
const IconEye = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconHeart = ({ filled }) => <svg width="16" height="16" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const IconBookmark = ({ filled }) => <svg width="16" height="16" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>;
const IconArrowLeft = () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>;
const IconArrowRight = () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>;
// Nuove icone per il menu mobile
const IconMenu = () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>;
const IconClose = () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

function CategoryPage() {
    const { name } = useParams(); 
    const navigate = useNavigate();
    const location = useLocation();
    
    // --- DATI ---
    const [allNews, setAllNews] = useState([]); 
    const [filteredNews, setFilteredNews] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // --- PAGINAZIONE ---
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // --- UI & TEMA ---
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // STATO PER IL MENU MOBILE
    const [theme, setTheme] = useState(() => localStorage.getItem('site_theme') || 'light');

    // Funzione pulizia stringhe
    const normalize = (str) => str ? str.toString().replace(/['"]+/g, '').trim().toLowerCase() : '';
    const displayTitle = (str) => str ? str.toString().replace(/['"]+/g, '').trim() : '';

    // Scroll Listener
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Chiudi menu mobile se cambio pagina
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location]);

    // FETCH DATI
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setCurrentPage(1); 
            try {
                // User
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
                } else { setUser(null); }

                // News
                const res = await axios.get('https://murthnews-api.onrender.com/api/news');
                const targetCat = normalize(name);
                
                const categoryNews = res.data.filter(item => {
                    if (!item.category) return false;
                    return normalize(item.category) === targetCat;
                });

                setAllNews(categoryNews);
                setFilteredNews(categoryNews); 
                setLoading(false);
            } catch (err) { console.error(err); setLoading(false); }
        };
        if (name) fetchData();
    }, [name, location]);

    // RICERCA
    useEffect(() => {
        if (searchTerm.trim() === "") {
            setFilteredNews(allNews);
        } else {
            const lowerTerm = normalize(searchTerm);
            const filtered = allNews.filter(item => 
                normalize(item.title).includes(lowerTerm) || normalize(item.summary).includes(lowerTerm)
            );
            setFilteredNews(filtered);
            setCurrentPage(1);
        }
    }, [searchTerm, allNews]);

    // TEMA
    const toggleTheme = async () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('site_theme', newTheme);
        if (user) {
            try { await axios.put('https://murthnews-api.onrender.com/api/reader/update', { id: user._id, theme: newTheme }); } catch (e) {}
        }
    };

    // --- CALCOLO PAGINAZIONE ---
    const totalPages = Math.ceil(filteredNews.length / ITEMS_PER_PAGE);
    const displayedNews = filteredNews.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const changePage = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' }); 
        }
    };

    // --- COLORI & STYLE ---
    const isDark = theme === 'dark';
    const isPremiumUser = user && (user.livello !== 'standard');

    const C = {
        bg: isDark ? '#0f172a' : '#f8fafc',
        text: isDark ? '#f1f5f9' : '#1e293b',
        meta: isDark ? '#94a3b8' : '#64748b',
        accent: '#6366f1', 
        border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        cardBg: isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.8)',
        gold: '#fbbf24',
        glow: isDark 
            ? 'radial-gradient(circle at 50% 30%, rgba(99, 102, 241, 0.15) 0%, rgba(15, 23, 42, 0) 60%)'
            : 'radial-gradient(circle at 50% 30%, rgba(99, 102, 241, 0.1) 0%, rgba(248, 250, 252, 0) 60%)',
        
        headerBg: scrolled ? (isDark ? '#0f172a' : '#ffffff') : 'transparent',
        headerBorder: scrolled ? (isDark ? '#334155' : '#e2e8f0') : 'transparent',
        headerText: isDark ? '#f8fafc' : '#1e293b'
    };

    return (
        <div style={{ 
            backgroundColor: C.bg, 
            color: C.text, 
            minHeight: '100vh', 
            transition: '0.3s', 
            fontFamily: "'Inter', sans-serif", 
            width: '100%', 
            overflowX: 'hidden', /* FIX SCROLL ORIZZONTALE */
            position: 'relative'
        }}>
            
            {/* SFONDO LUMINOSO (GLOW) */}
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
                    box-sizing: border-box; /* Fix width issues */
                }
                .nav-menu { display: flex; gap: 5px; }
                .nav-item { padding: 8px 16px; border-radius: 30px; cursor: pointer; font-weight: 600; font-size: 0.9rem; transition: 0.2s; color: inherit; text-decoration: none;}
                .nav-item:hover { background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}; }
                
                .user-box { display: flex; align-items: center; gap: 10px; padding: 4px 15px 4px 4px; border-radius: 50px; cursor: pointer; transition: 0.3s; border: 1px solid ${C.headerBorder}; background: ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)'}; }
                .user-box:hover { border-color: ${C.accent}; transform: translateY(-2px); }

                /* HAMBURGER MENU BUTTON (MOBILE) */
                .menu-btn {
                    display: none; /* Nascosto su desktop */
                    background: transparent; border: none; color: inherit; cursor: pointer; padding: 5px;
                }

                /* MOBILE DROPDOWN MENU */
                .mobile-menu {
                    position: fixed; top: ${scrolled ? '70px' : '80px'}; left: 0; width: 100%;
                    background: ${isDark ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)'};
                    border-bottom: 1px solid ${C.border};
                    padding: 20px; display: flex; flex-direction: column; gap: 15px;
                    backdrop-filter: blur(10px); z-index: 999;
                    box-shadow: 0 10px 30px -10px rgba(0,0,0,0.2);
                    animation: slideDown 0.3s ease forwards;
                }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }

                .mobile-link { font-size: 1.1rem; font-weight: 700; color: ${C.text}; text-decoration: none; padding: 10px; border-radius: 8px; }
                .mobile-link:hover { background: ${isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9'}; color: ${C.accent}; }

                /* SEARCH */
                .search-container { position: relative; max-width: 600px; margin: 0 auto 60px auto; z-index: 2; padding: 0 10px; box-sizing: border-box; }
                .search-input {
                    width: 100%; padding: 18px 50px 18px 25px; font-size: 1.1rem;
                    border: 1px solid ${C.border}; border-radius: 50px;
                    background: ${isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.8)'}; 
                    color: ${C.text}; outline: none; backdrop-filter: blur(10px);
                    box-shadow: 0 10px 30px -10px rgba(0,0,0,0.1);
                    transition: all 0.3s;
                    box-sizing: border-box; /* Fix input overflow */
                }
                .search-input:focus { border-color: ${C.accent}; box-shadow: 0 10px 40px -5px ${C.accent}40; transform: scale(1.02); }

                /* GRID */
                .news-grid { 
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 40px; margin-top: 40px; z-index: 2; position: relative;
                }
                
                .news-card { 
                    background: ${C.cardBg}; border: 1px solid ${C.border};
                    border-radius: 20px; overflow: hidden;
                    cursor: pointer; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    backdrop-filter: blur(10px); display: flex; flex-direction: column;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                .news-card:hover { transform: translateY(-10px); box-shadow: 0 20px 40px -10px rgba(0,0,0,0.3); border-color: ${C.accent}; }
                
                .card-img-box { width: 100%; height: 200px; overflow: hidden; position: relative; }
                .card-img { width: 100%; height: 100%; object-fit: cover; transition: 0.5s; }
                .news-card:hover .card-img { transform: scale(1.1); }

                .card-content { padding: 25px; flex-grow: 1; display: flex; flex-direction: column; }
                .card-title { font-family: 'Roboto Condensed', sans-serif; font-size: 1.4rem; line-height: 1.2; margin: 0 0 10px 0; color: ${C.text}; }
                .card-desc { font-size: 0.95rem; color: ${C.meta}; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 20px; flex-grow: 1; }

                .card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 15px; border-top: 1px solid ${C.border}; font-size: 0.8rem; color: ${C.meta}; }
                .stat-item { display: flex; align-items: center; gap: 5px; }

                /* PAGINATION */
                .pagination { display: flex; justify-content: center; align-items: center; gap: 20px; margin-top: 60px; z-index: 2; position: relative; padding-bottom: 40px; }
                .page-btn {
                    width: 50px; height: 50px; border-radius: 50%; border: 1px solid ${C.border};
                    background: ${C.cardBg}; color: ${C.text};
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; transition: 0.2s;
                }
                .page-btn:hover:not(:disabled) { background: ${C.accent}; color: white; border-color: ${C.accent}; transform: scale(1.1); }
                .page-btn:disabled { opacity: 0.3; cursor: not-allowed; }

                /* MOBILE RESPONSIVE */
                @media(max-width: 900px){ 
                    .nav-menu { display: none; } /* Nasconde menu orizzontale */
                    .menu-btn { display: block; } /* Mostra Hamburger */
                    
                    .mobile-hide { display: none; } 
                    .user-name { display: none; } 
                    
                    .header-container { padding: 15px 20px; } 
                    .news-grid { grid-template-columns: 1fr; gap: 25px; } /* 1 colonna */
                    
                    /* Typography più piccola su mobile */
                    h1 { font-size: 2.5rem !important; }
                }
            `}</style>

            {/* HEADER */}
            <header className="header-container" style={{ backgroundColor: C.headerBg, borderBottom: `1px solid ${C.headerBorder}`, color: C.headerText }}>
                {/* SINISTRA: Logo + Hamburger */}
                <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                    {/* Tasto Hamburger (Solo Mobile) */}
                    <button className="menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        {mobileMenuOpen ? <IconClose /> : <IconMenu />}
                    </button>

                    <div onClick={() => navigate('/')} style={{cursor:'pointer'}}><SiteLogo theme={theme} /></div>
                    
                    {/* Menu Desktop */}
                    <nav className="nav-menu">
                        <div className="nav-item" onClick={() => navigate('/')}>Home</div>
                        <div className="nav-item" onClick={() => navigate('/categories')}>Categorie</div>
                        <div className="nav-item mobile-hide" onClick={() => navigate('/policy')}>Chi Siamo</div>
                    </nav>
                </div>

                {/* DESTRA: User & Theme */}
                <div style={{display:'flex', alignItems:'center'}}>
                    <button onClick={toggleTheme} style={{background:'transparent', border:`1px solid ${C.border}`, borderRadius:'50%', width:'35px', height:'35px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', marginRight:'10px', color:'inherit', fontSize:'1.1rem'}}>{isDark ? '☀️' : '🌙'}</button>
                    {user ? (
                        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
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

            {/* MENU MOBILE A TENDINA */}
            {mobileMenuOpen && (
                <div className="mobile-menu">
                    <div className="mobile-link" onClick={() => navigate('/')}>Home</div>
                    <div className="mobile-link" onClick={() => navigate('/categories')}>Categorie</div>
                    <div className="mobile-link" onClick={() => navigate('/policy')}>Chi Siamo</div>
                    {!user && (
                        <div className="mobile-link" onClick={() => navigate('/register')} style={{color: C.accent}}>
                            ✨ Abbonati Ora
                        </div>
                    )}
                    {user && !isPremiumUser && (
                        <div className="mobile-link" onClick={() => navigate('/dashboard/subscription')} style={{color: C.gold}}>
                            ⭐ Passa a Premium
                        </div>
                    )}
                </div>
            )}

            {/* CONTENUTO PRINCIPALE */}
            <div style={{paddingTop:'150px', maxWidth:'1200px', margin:'0 auto', paddingLeft:'20px', paddingRight:'20px', position:'relative', zIndex:1, width: '100%', boxSizing: 'border-box'}}>
                
                {/* HERO BANNER */}
                <div style={{textAlign:'center', marginBottom:'60px'}}>
                    <div style={{textTransform:'uppercase', letterSpacing:'3px', fontSize:'0.8rem', color: C.accent, fontWeight:'800', marginBottom:'15px', opacity:0.9}}>CATEGORIA SELEZIONATA</div>
                    <h1 style={{fontFamily:"'Playfair Display', serif", fontSize:'clamp(3rem, 6vw, 5rem)', margin:'0', textTransform:'capitalize', color: C.text}}>
                        {displayTitle(name)}
                    </h1>
                    <p style={{color: C.meta, fontSize:'1.2rem', marginTop:'15px', maxWidth:'600px', marginLeft:'auto', marginRight:'auto'}}>
                        Esplora le notizie più recenti, gli approfondimenti e gli editoriali riguardanti {displayTitle(name)}.
                    </p>
                </div>

                {/* MOTORE DI RICERCA */}
                <div className="search-container">
                    <input 
                        type="text" 
                        placeholder={`Cerca tra le notizie di ${displayTitle(name)}...`} 
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div style={{position:'absolute', right:'25px', top:'50%', transform:'translateY(-50%)', opacity:0.5, fontSize:'1.2rem'}}>🔍</div>
                </div>

                {/* RISULTATI GRID */}
                {loading ? (
                    <div style={{textAlign:'center', padding:'50px'}}>Caricamento...</div>
                ) : (
                    <>
                        {displayedNews.length > 0 ? (
                            <>
                                <div className="news-grid">
                                    {displayedNews.map(item => (
                                        <div key={item._id} className="news-card" onClick={() => navigate(`/news/${item.slug}`)}>
                                            <div className="card-img-box">
                                                <img src={item.coverImage} alt="" className="card-img" />
                                                {item.importance === "Ultim'ora" && (
                                                    <span style={{position:'absolute', top:'10px', left:'10px', background:'#ef4444', color:'white', padding:'4px 10px', fontSize:'0.7rem', fontWeight:'bold', borderRadius:'20px', boxShadow:'0 4px 10px rgba(0,0,0,0.2)'}}>
                                                        LIVE
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div className="card-content">
                                                <div style={{fontSize:'0.75rem', color: C.accent, fontWeight:'800', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'8px'}}>
                                                    {new Date(item.createdAt).toLocaleDateString()}
                                                </div>
                                                <h3 className="card-title">{displayTitle(item.title)}</h3>
                                                <p className="card-desc">{displayTitle(item.summary)}</p>
                                                
                                                {/* FOOTER CARD CON ICONE */}
                                                <div className="card-footer">
                                                    <div className="stat-item" title="Visualizzazioni">
                                                        <IconEye /> <span>{item.views || 0}</span>
                                                    </div>
                                                    <div className="stat-item" title="Mi Piace">
                                                        <IconHeart filled={user?.likedArticles?.includes(item._id)} /> <span>{item.likes || 0}</span>
                                                    </div>
                                                    <div className="stat-item" title="Salvati">
                                                        <IconBookmark filled={user?.savedArticles?.includes(item._id)} /> 
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* PAGINAZIONE (FRECCE) */}
                                {totalPages > 1 && (
                                    <div className="pagination">
                                        <button 
                                            className="page-btn" 
                                            onClick={() => changePage(currentPage - 1)} 
                                            disabled={currentPage === 1}
                                            title="Pagina Precedente"
                                        >
                                            <IconArrowLeft />
                                        </button>
                                        
                                        <span style={{fontWeight:'bold', color: C.meta}}>
                                            Pagina {currentPage} di {totalPages}
                                        </span>

                                        <button 
                                            className="page-btn" 
                                            onClick={() => changePage(currentPage + 1)} 
                                            disabled={currentPage === totalPages}
                                            title="Pagina Successiva"
                                        >
                                            <IconArrowRight />
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            /* NESSUN RISULTATO */
                            <div style={{textAlign:'center', padding:'60px', border:`1px dashed ${C.border}`, borderRadius:'20px', color: C.meta, background: C.cardBg}}>
                                <p style={{fontSize:'1.3rem', marginBottom:'20px', fontWeight:'bold'}}>
                                    Nessuna notizia trovata in "{displayTitle(name)}".
                                </p>
                                <button onClick={() => navigate('/categories')} style={{background: C.accent, color: 'white', border:'none', padding:'12px 30px', borderRadius:'30px', cursor:'pointer', fontWeight:'bold', fontSize:'1rem', boxShadow:`0 10px 20px -5px ${C.accent}60`}}>
                                    Torna alle Categorie
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div> {/* <-- FINE CONTENUTO PRINCIPALE */}

            {/* FOOTER (Inserito qui, prima della chiusura del wrapper) */}
            <Footer theme={theme} />

        </div> // <-- FINE WRAPPER PAGINA
    );
}

export default CategoryPage;