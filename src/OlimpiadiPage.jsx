import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Olimpiadi.css';

// --- FOTO IMPORTATE ---
import img1 from './1.png'; // Logo Olimpiadi
import img2 from './2.jpg'; // Tuo Logo
import img3 from './3.png'; // Sfondo

const OlimpiadiPage = () => {
    const navigate = useNavigate();
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- STATI UI ---
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDark, setIsDark] = useState(false);

    // Helper per pulire le stringhe (rimuove virgolette extra se presenti)
    const clean = (str) => str ? str.replace(/^"|"$/g, '').replace(/\\"/g, '"') : '';

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);

        const fetchOlympicNews = async () => {
            try {
                // Utilizziamo l'URL completo di Render per sicurezza
                const API_URL = 'https://murthnews-api.onrender.com/api/news';

                const response = await fetch(API_URL);
                const data = await response.json();

                // --- FILTRO OTTIMIZZATO ---
                const targetID = "695d37b0c3aa2e6bde25b2e2";

                const filtered = data.filter(item => {
                    if (!item.category) return false;

                    // Estraiamo il nome o l'ID della categoria
                    const catName = typeof item.category === 'object' 
                        ? (item.category.name || "") 
                        : String(item.category);
                    
                    const catId = typeof item.category === 'object' ? item.category._id : null;

                    // Controllo: Categoria contiene "olimpiad", "2026" o l'ID specifico
                    const matchesCategory = 
                        catName.toLowerCase().includes('olimpiad') || 
                        catName.toLowerCase().includes('2026') || 
                        catId === targetID;

                    // Mostriamo solo quelle pubblicate
                    return matchesCategory && item.status === 'Pubblicato';
                });

                setNews(filtered);
            } catch (error) {
                console.error("Errore Caricamento News:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOlympicNews();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleSportClick = (sportName) => {
        alert(`🚧 La sezione ${sportName} sarà disponibile all'inizio dei giochi!`);
    };

    return (
        <div className={isDark ? 'dark-mode' : ''} style={{ minHeight: '100vh', backgroundColor: isDark ? '#050a14' : '#fff' }}>
            
            {/* HEADER */}
            <header className="glass-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {isMobile && (
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ background: 'none', border: 'none', fontSize: '1.8rem', color: 'white', cursor: 'pointer' }}>
                            ☰
                        </button>
                    )}
                    
                    <img 
                        src={img2} 
                        alt="Logo" 
                        onClick={() => navigate('/')}
                        style={{ height: '45px', width: 'auto', cursor: 'pointer' }} 
                    />

                    {!isMobile && (
                        <nav style={{ display: 'flex', gap: '10px', marginLeft: '10px' }}>
                            <span className="nav-link" onClick={() => navigate('/')}>Home</span>
                            <span className="nav-link" onClick={() => navigate('/categories')}>Categorie</span>
                        </nav>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button 
                        onClick={() => setIsDark(!isDark)} 
                        style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
                    >
                        {isDark ? '☀️' : '🌙'}
                    </button>
                    <button 
                        onClick={() => navigate('/login')}
                        className="btn-entra-olimpico"
                    >
                        ENTRA
                    </button>
                </div>
            </header>

            {/* MOBILE MENU */}
            {isMobile && isMenuOpen && (
                <div style={{ position: 'fixed', top: 70, left: 0, width: '100%', height: '100vh', background: isDark ? '#050a14' : '#f0f9ff', zIndex: 999, padding: 30, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <span onClick={() => { navigate('/'); setIsMenuOpen(false); }}>Home</span>
                    <span onClick={() => { navigate('/categories'); setIsMenuOpen(false); }}>Categorie</span>
                </div>
            )}

            {/* HERO SECTION */}
            <div className="hero-wrapper" style={{ backgroundImage: `url(${img3})` }}>
                <div className="hero-overlay"></div>
                <div className="hero-content">
                    <div className="hero-logos">
                        <img src={img1} alt="Olimpiadi" className="main-logo" />
                        <img src={img2} alt="Partner" className="partner-logo" />
                    </div>
                    <h1 className="hero-title">Milano Cortina 2026</h1>
                    <p className="hero-subtitle">Il Sogno Olimpico è Qui</p>

                    <div className="sports-container">
                        {[
                            { name: "Sci Alpino", icon: "⛷️" },
                            { name: "Hockey", icon: "🏒" },
                            { name: "Pattinaggio", icon: "⛸️" },
                            { name: "Curling", icon: "🥌" },
                            { name: "Snowboard", icon: "🏂" },
                            { name: "Biathlon", icon: "🎿" }
                        ].map(sport => (
                            <div key={sport.name} className="sport-pill" onClick={() => handleSportClick(sport.name)}>
                                <span>{sport.icon}</span> {sport.name}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* NEWS SECTION */}
            <div className="news-section">
                <h2 className="section-title" style={{ color: isDark ? 'white' : '#003366' }}>Ultime dal Ghiaccio</h2>
                
                <div className="news-grid">
                    {loading ? (
                        <p style={{ textAlign: 'center', width: '100%', fontSize: '1.2rem', color: '#aaa' }}>Caricamento notizie...</p>
                    ) : news.length > 0 ? (
                        news.map((item) => (
                            <article key={item._id} className="holo-card" onClick={() => navigate(`/news/${item.slug}`)}>
                                <div className="card-img-box">
                                    <span className="badge">
                                        {typeof item.category === 'object' ? item.category.name : 'Olimpiadi 2026'}
                                    </span>
                                    {/* Cambiato in coverImage per allineamento DB */}
                                    <img 
                                        src={item.coverImage || "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?auto=format&fit=crop&w=800&q=80"} 
                                        alt="" 
                                    />
                                </div>
                                <div className="card-info">
                                    <h3>{clean(item.title)}</h3>
                                    <p>
                                        {item.summary 
                                            ? (clean(item.summary).substring(0, 100) + "...") 
                                            : "Scopri tutti i dettagli su questo incredibile evento olimpico..."}
                                    </p>
                                    <Link to={`/news/${item.slug}`} className="btn-glow">
                                        LEGGI ARTICOLO <span>→</span>
                                    </Link>
                                </div>
                            </article>
                        ))
                    ) : (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', background: 'rgba(0,0,0,0.03)', borderRadius: '20px' }}>
                            <h3 style={{ color: isDark ? 'white' : '#003366' }}>Nessuna notizia olimpica trovata.</h3>
                            <p style={{ color: '#aaa' }}>Resta sintonizzato per i prossimi aggiornamenti.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OlimpiadiPage;