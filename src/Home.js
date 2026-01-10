import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Componenti esterni (assumendo esistano nella tua cartella)
import Header2 from './Header2';
import Footer from './Footer';
import SiteLogo from './SiteLogo';

function Home() {
    const navigate = useNavigate();

    // --- STATI ---
    const [news, setNews] = useState([]);
    const [user, setUser] = useState(null);
    const [breaking, setBreaking] = useState(null); // <--- ECCOLO AGGIUNTO QUI
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState(() => localStorage.getItem('site_theme') || 'light');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [secondPageAuthor, setSecondPageAuthor] = useState(null); // <--- NUOVO STATO
    const [adSettings, setAdSettings] = useState({ isAdActive: false }); // Stato Ads

    const isDark = theme === 'dark';

    // --- COLORI ---
    const C = {
        bg: isDark ? '#0f172a' : '#ffffff',
        heroBox: isDark ? '#1e293b' : '#f8fafc',
        headerBg: isDark ? '#1e293b' : '#ffffff',
        text: isDark ? '#f8fafc' : '#111827',
        border: isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb',
        accent: '#b91c1c',
        live: '#ef4444',
        breaking: '#ea580c',
        meta: isDark ? '#94a3b8' : '#6b7280',
        cardBg: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff'
    };


    // --- TITOLO TAB BROWSER ---
    useEffect(() => {
        document.title = "Murth News - Home"; // O quello che preferisci
    }, []);

    // --- INIT ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. News Normali
                const res = await axios.get('https://murthnews-api.onrender.com/api/news');
                const published = res.data.filter(n => n.status === 'Pubblicato');
                setNews(published);

                // 2. BREAKING NEWS
                try {
                    const resBreak = await axios.get('https://murthnews-api.onrender.com/api/breaking');
                    if (resBreak.data) {
                        const dataList = Array.isArray(resBreak.data) ? resBreak.data : [resBreak.data];
                        if (dataList.length > 0) {
                            const sorted = dataList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                            setBreaking(sorted[0]);
                        }
                    }
                } catch (e) {
                    console.error("❌ ERRORE BREAKING NEWS:", e.message);
                }

                // 3. User
                const storedUser = localStorage.getItem('reader_user');
                if (storedUser) {
                    const parsed = JSON.parse(storedUser);
                    setUser(parsed);
                    axios.get(`https://murthnews-api.onrender.com/api/users/${parsed._id}`)
                        .then(u => {
                            if (u.data) {
                                setUser(u.data);
                                localStorage.setItem('reader_user', JSON.stringify(u.data));
                            }
                        })
                        .catch(() => {});
                }

                // 4. ADS / SPONSOR (CORRETTO: URL /api/settings come in NewsPage)
                try {
                    const settingsRes = await axios.get('https://murthnews-api.onrender.com/api/settings');
                    setAdSettings(settingsRes.data);
                } catch (e) {
                    console.error("❌ ERRORE ADS:", e.message);
                }

                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };
        fetchData();

        const handleResize = () => setIsMobile(window.innerWidth < 900);
        window.addEventListener('resize', handleResize);
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleScroll);
            clearInterval(timer);
        };
    }, []);

    // --- LOGICA SECONDA PAGINA ---
    // Prende la prima news segnata come "Seconda Pagina"
    const mainSecondPage = news.find(n => n.isSecondPage) || null;

    // Prende le news di POLITICA (escludendo quella già mostrata a sinistra se capita)
    const politicsNews = news.filter(n =>
        n.category === 'Politica' &&
        n._id !== mainSecondPage?._id
    ).slice(0, 5); // Ne mostriamo massimo 5 nella sidebar

    const toggleTheme = () => {
        const newTheme = isDark ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('site_theme', newTheme);
    };

    // --- UTILS ---
    const clean = (str) => str ? str.replace(/^"|"$/g, '').replace(/\\"/g, '"') : '';

    const formatTime = (isoDate) => {
        if (!isoDate) return '';
        const d = new Date(isoDate);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // --- FUNZIONE MANCANTE ---
    const formatDate = (isoDate) => {
        if (!isoDate) return '';
        // Esempio output: "3 gennaio 2026"
        return new Date(isoDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    // --- ACTIONS (Like/Save) ---
    const handleLike = async (e, articleId) => {
        e.stopPropagation();
        if (!user) return navigate('/login');
        try {
            const res = await axios.post('https://murthnews-api.onrender.com/api/user/toggle-like', { userId: user._id, articleId });
            setNews(prev => prev.map(n => n._id === articleId ? { ...n, likes: res.data.likes } : n));
            const updatedUser = { ...user, likedArticles: res.data.user.likedArticles };
            setUser(updatedUser);
            localStorage.setItem('reader_user', JSON.stringify(updatedUser));
        } catch (err) { console.error(err); }
    };

    const handleSave = async (e, articleId) => {
        e.stopPropagation();
        if (!user) return navigate('/login');
        try {
            const res = await axios.post('https://murthnews-api.onrender.com/api/user/toggle-save', { userId: user._id, articleId });
            const updatedUser = { ...user, savedArticles: res.data.user.savedArticles };
            setUser(updatedUser);
            localStorage.setItem('reader_user', JSON.stringify(updatedUser));
        } catch (err) { console.error(err); }
    };

    const isLiked = (id) => user?.likedArticles?.includes(id);
    const isSaved = (id) => user?.savedArticles?.includes(id);

    // --- FILTRO 3 ORE ---
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
    const rawFirstPage = news.filter(n => n.isFirstPage);
    const validFirstPage = rawFirstPage.filter(n => {
        const lastActivity = n.lastUpdate ? new Date(n.lastUpdate).getTime() : new Date(n.createdAt).getTime();
        return (currentTime.getTime() - lastActivity) < THREE_HOURS_MS;
    });
    validFirstPage.sort((a, b) => {
        const dA = a.lastUpdate ? new Date(a.lastUpdate) : new Date(a.createdAt);
        const dB = b.lastUpdate ? new Date(b.lastUpdate) : new Date(b.createdAt);
        return dB - dA;
    });

    const mainHero = validFirstPage[0]; // La notizia principale
    const subHero = validFirstPage[1]; // Quella sotto (se esiste)

    // --- LOGICA DOWNGRADE (Dopo 2 ore diventa "Normale") ---
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    let showAsBreaking = false;

    if (mainHero) {
        const lastActivity = mainHero.lastUpdate ? new Date(mainHero.lastUpdate).getTime() : new Date(mainHero.createdAt).getTime();
        const timeDiff = currentTime.getTime() - lastActivity;

        // È visualizzato come Ultim'ora SOLO SE:
        // 1. Nel DB è "Ultim'ora"
        // 2. E sono passate MENO di 2 ore
        showAsBreaking = (mainHero.importance === "Ultim'ora" && timeDiff < TWO_HOURS_MS);
    }

    useEffect(() => {
        if (mainSecondPage && mainSecondPage.author) {
            // Cerca l'utente nel DB usando il nome autore
            axios.get(`https://murthnews-api.onrender.com/api/search/users?q=${mainSecondPage.author}`)
                .then(res => {
                    if (res.data && res.data.length > 0) {
                        setSecondPageAuthor(res.data[0]);
                    }
                })
                .catch(err => console.log("Impossibile trovare foto autore", err));
        }
    }, [mainSecondPage]);

    // Altre liste
    const secondPageNews = news.filter(n => n.isSecondPage && !n.isFirstPage);
    const standardNews = news.filter(n => !n.isFirstPage && !n.isSecondPage);

    // --- ICONS ---
    const Icons = {
        Heart: ({ filled }) => <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? C.live : "none"} stroke={filled ? C.live : "white"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))', display: 'block' }}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>,
        Bookmark: ({ filled }) => <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "white" : "none"} stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))', display: 'block' }}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>,
        LiveDot: () => <div style={{ width: 8, height: 8, background: C.live, borderRadius: '50%', boxShadow: `0 0 8px ${C.live}` }}></div>,
        LiveIconWhite: () => <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: C.live, color: 'white', padding: '4px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: '900', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}>LIVE <div style={{ width: 6, height: 6, background: 'white', borderRadius: '50%' }}></div></div>
    };


    // --- (PARTE 1 DA AGGIUNGERE) FILTRI E COMPONENTE GRAFICO ---

    // 1. Funzione helper per filtrare le notizie per argomento (cerca in categoria, titolo o tag)
    const filterByTopic = (topic) => {
        // Escludiamo la prima e seconda pagina per non ripetere notizie già mostrate in alto
        return news.filter(n =>
            (n.category && n.category.toLowerCase().includes(topic.toLowerCase())) ||
            (n.title && n.title.toLowerCase().includes(topic.toLowerCase())) ||
            (n.tags && n.tags.some(t => t.toLowerCase() === topic.toLowerCase()))
        ).filter(n => !n.isFirstPage && !n.isSecondPage).slice(0, 8); // Max 8 card per riga
    };

    // 2. Prepariamo i dati per le 4 nuove sezioni
    const newsAmerica = filterByTopic('America');
    const newsUcraina = filterByTopic('Ucraina');
    const newsRussia  = filterByTopic('Russia');
    const newsMondo   = filterByTopic('Mondo');
    const newsItalia      = filterByTopic('Italia');      // Cerca news con categoria o tag "Italia"
    const newsMedioriente = filterByTopic('Medioriente');
    const newsIran        = filterByTopic('Iran');
    const newsGuerra      = filterByTopic('Guerra');

    // 3. NUOVO COMPONENTE GRAFICO: RIGA A SCORRIMENTO ORIZZONTALE
    const CategoryRow = ({ title, data, color }) => {
        if (!data || data.length === 0) return null; // Se non ci sono news, non mostra nulla
        return (
            <div style={{ marginBottom: '60px', paddingTop: '30px', borderTop: `1px solid ${C.border}` }}>
                {/* Header Sezione (Titolo e Link "Vedi tutti") */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '25px', padding: '0 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Bandierina colorata verticale */}
                        <div style={{ width: '6px', height: '28px', background: color, borderRadius: '3px' }}></div>
                        <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', color: C.text, fontFamily: "'Inter', sans-serif" }}>
                            {title}
                        </h3>
                    </div>
                    <span onClick={() => navigate('/categories')} style={{ fontSize: '0.85rem', fontWeight: '700', color: C.meta, cursor: 'pointer', textTransform: 'uppercase', letterSpacing:'0.5px' }}>
                        Vedi tutti ➜
                    </span>
                </div>

                {/* Container Scrollabile Orizzontale */}
                <div className="horz-scroll" style={{
                    display: 'flex',
                    gap: '25px',
                    overflowX: 'auto',
                    padding: '10px 10px 40px 10px', // Padding sotto per l'ombra hover
                    scrollSnapType: 'x mandatory',  // Scatto fluido
                    WebkitOverflowScrolling: 'touch' // Scroll nativo su iOS
                }}>
                    {data.map(n => (
                        <div key={n._id} className="cat-card" onClick={() => navigate(`/news/${n.slug}`)} style={{
                            minWidth: '300px',  // Larghezza fissa card
                            maxWidth: '300px',
                            background: C.heroBox,
                            borderRadius: '12px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            scrollSnapAlign: 'start',
                            border: `1px solid ${C.border}`,
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'all 0.3s ease', // Transizione fluida per hover
                            boxShadow: '0 4px 10px rgba(0,0,0,0.03)'
                        }}>
                            {/* Immagine Verticale (Poster) */}
                            <div className="img-wrapper" style={{ height: '200px', width: '100%', position: 'relative' }}>
                                <img src={n.coverImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                {/* Etichetta Categoria colorata sopra l'immagine */}
                                <div style={{ position: 'absolute', top: 12, left: 12, background: color, color: 'white', fontSize: '0.7rem', fontWeight: '800', padding: '4px 10px', borderRadius: '6px', textTransform: 'uppercase', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', letterSpacing:'0.5px' }}>
                                    {n.category}
                                </div>
                            </div>

                            {/* Testo Card */}
                            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <h4 style={{ fontSize: '1.2rem', fontWeight: '700', lineHeight: '1.3', margin: '0 0 15px 0', color: C.text, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontFamily: "'Georgia', serif" }}>
                                    {clean(n.title)}
                                </h4>
                                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: C.meta, fontWeight:'600', textTransform:'uppercase' }}>
                                    <span>{formatDate(n.createdAt)}</span>
                                    <span>⏱ {Math.ceil((n.content?.length || 500) / 1500)} min</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };
    // --- (FINE PARTE 1) ---

    

    // --- LOADING SCREEN (Sostituisci la riga vecchia con questo blocco) ---
    if (loading) return (
        <div style={{
            height: '100vh',
            width: '100%',
            background: C.bg,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
        }}>
            {/* CSS SPECIFICO PER IL LOADING */}
            <style>{`
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                @keyframes fade { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
                
                .loader-ring {
                    width: 60px;
                    height: 60px;
                    border: 5px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
                    border-top: 5px solid ${C.accent};
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 20px;
                }
                .loader-text {
                    font-family: 'Georgia', serif;
                    font-weight: 700;
                    letter-spacing: 2px;
                    color: ${C.text};
                    font-size: 1.1rem;
                    text-transform: uppercase;
                    animation: fade 2s infinite ease-in-out;
                }
            `}</style>

            <div className="loader-ring"></div>
            <div className="loader-text">Murth News</div>
        </div>
    );

    return (
        <div style={{ backgroundColor: C.bg, minHeight: '100vh', color: C.text, fontFamily: "'Inter', sans-serif" }}>

            <style>{`
                /* --- GENERALI --- */
                .container { max-width: 1240px; margin: 0 auto; padding: 20px; padding-top: 140px; padding-bottom: 80px; }
                
                /* HEADER BUTTONS - COMPATTI E NEUTRI */
/* HEADER BUTTONS - ZERO GLOW / ZERO SHADOW */
.nav-link { 
    font-family: 'Poppins', sans-serif; 
    font-weight: 600; 
    font-size: 0.78rem; 
    color: ${C.text} !important; 
    cursor: pointer; 
    padding: 6px 12px; 
    border-radius: 20px; 
    letter-spacing: 0.3px;
    text-transform: uppercase;
    text-decoration: none !important;
    display: flex;
    align-items: center;
    
    /* RESET TOTALE DI OGNI POSSIBILE BAGLIORE */
    box-shadow: none !important;
    text-shadow: none !important;      /* Rimuove ombre del testo */
    filter: none !important;           /* Rimuove filtri grafici (glow) */
    backdrop-filter: none !important;  /* Rimuove effetti sfocatura dietro */
    outline: none !important;          /* Rimuove il bordo di focus */
    
    transition: background-color 0.2s ease;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
}

.nav-link:hover { 
    /* Solo colore di sfondo piatto */
    background-color: ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'} !important; 
    color: ${C.text} !important;
    
    /* Riafferma il reset anche in stato hover */
    box-shadow: none !important;
    text-shadow: none !important;
    filter: none !important;
    transform: none !important;
}

                /* HEADER PROFILE (FOTO + NOME) */
                .profile-pill {
                    display: flex; align-items: center; gap: 10px; 
                    padding: 4px 12px 4px 4px; border: 1px solid ${C.border}; border-radius: 30px; 
                    cursor: pointer; transition: all 0.2s ease; background-color: ${isDark ? 'rgba(255,255,255,0.02)' : '#ffffff'};
                }
                .profile-pill:hover { border-color: ${C.text}; background-color: ${isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb'}; }
                
                .profile-avatar {
                    width: 32px; height: 32px; border-radius: 50%; background: ${C.accent}; color: white; 
                    display: flex; alignItems: center; justifyContent: center; font-weight: 600; overflow: hidden; flex-shrink: 0;
                }
                .profile-name { font-size: 0.9rem; font-weight: 500; color: ${C.text}; }

                /* --- BOX COMUNI --- */
                .news-box {
                    background: ${C.heroBox}; border: 1px solid ${C.border}; border-radius: 4px; 
                    overflow: hidden; position: relative; transition: box-shadow 0.2s;
                }
                .news-box:hover { box-shadow: 0 5px 15px rgba(0,0,0,0.08); border-color: ${C.meta}; }

                .img-wrapper { position: relative; overflow: hidden; background: ${C.border}; }
                .news-img { width: 100%; height: 100%; object-fit: cover; display: block; }
                
                /* OVERLAY AZIONI */
                .overlay-actions { position: absolute; bottom: 10px; right: 10px; display: flex; gap: 10px; z-index: 10; }
                .icon-btn {
                    background: rgba(0,0,0,0.4); backdrop-filter: blur(2px); width: 36px; height: 36px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center; cursor: pointer; border: 1px solid rgba(255,255,255,0.2);
                    transition: transform 0.2s, background 0.2s;
                }
                .icon-btn:hover { background: rgba(0,0,0,0.7); transform: scale(1.1); }

                /* --- LAYOUT STANDARD --- */
                .standard-layout { display: flex; flex-direction: ${isMobile ? 'column-reverse' : 'row'}; min-height: 340px; }
                .std-text { flex: 0 0 40%; padding: 25px; display: flex; flex-direction: column; justify-content: flex-start; border-right: ${isMobile ? 'none' : `1px solid ${C.border}`}; }
                .std-img-col { flex: 1; position: relative; min-height: 250px; } 

                .std-cat { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: ${C.accent}; margin-bottom: 8px; letter-spacing: 1px; }
                .std-title { font-size: clamp(1.5rem, 2.5vw, 2.2rem); font-weight: 800; line-height: 1.1; color: ${C.text}; margin-bottom: 12px; font-family: 'Georgia', serif; }
                .std-sub { font-size: 1rem; line-height: 1.5; color: ${C.meta}; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
                .live-row { display: flex; alignItems: center; gap: 8px; margin-top: 15px; color: ${C.live}; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; }
                .std-updates { margin-top: 15px; padding-top: 15px; border-top: 1px solid ${C.border}; }
                .update-row { display: flex; gap: 8px; margin-bottom: 6px; font-size: 0.85rem; }
                .u-time { font-weight: 700; color: ${C.live}; white-space: nowrap; }
                .u-text { color: ${C.text}; line-height: 1.3; }

                /* --- LAYOUT BREAKING --- */
                .breaking-layout { display: flex; flex-direction: column; }
                .brk-header { padding: 25px; text-align: center; border-bottom: 1px solid ${C.border}; }
                .brk-title { font-size: clamp(2rem, 4vw, 3rem); font-weight: 900; line-height: 1.05; color: ${C.text}; font-family: 'Georgia', serif; margin: 0; }
                
                .brk-img-container { width: 100%; height: auto; position: relative; }
                .brk-img { width: 100%; height: auto; display: block; max-height: 500px; object-fit: cover; }
                
                .overlay-live { position: absolute; top: 15px; left: 15px; z-index: 10; animation: pulse 1.5s infinite; }
                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }

                .brk-updates-area { padding: 20px; background: ${isDark ? 'rgba(255,255,255,0.02)' : '#f9f9f9'}; border-top: 1px solid ${C.border}; }

                /* RELATED */
                .related-sec { margin-top: 15px; display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px; }
                .rel-item { display: flex; gap: 10px; padding: 10px; background: ${C.cardBg}; border: 1px solid ${C.border}; align-items: center; cursor: pointer; border-radius: 4px; transition: transform 0.2s; }
                .rel-item:hover { transform: translateY(-2px); border-color: ${C.meta}; }
                .rel-img { width: 80px; height: 55px; object-fit: cover; border-radius: 2px; flex-shrink: 0; }
                .rel-txt { font-size: 0.9rem; font-weight: 700; line-height: 1.2; color: ${C.text}; }

                .btn-login { background: ${C.text}; color: ${C.bg}; border:none; padding:8px 20px; border-radius:20px; font-weight:600; cursor:pointer; font-size:0.85rem; }
                /* --- WIDGET SECONDA PAGINA --- */
                .sp-container {
                    display: grid;
                    grid-template-columns: 2fr 1fr; 
                    gap: 40px;
                    margin-bottom: 60px;
                    
                    /* 🔥 LOGICA DINAMICA: Bordo e padding solo se c'è la Hero sopra */
                    border-top: ${mainHero ? `1px solid ${C.border}` : 'none'};
                    padding-top: ${mainHero ? '40px' : '0'};
                    margin-top: ${mainHero ? '0' : '20px'};
                }
                
                /* Mobile: colonna unica */
                @media (max-width: 900px) { .sp-container { grid-template-columns: 1fr; } }

                /* STILE COLONNA SINISTRA (BIG NEWS) */
                .sp-title {
                    font-family: 'Georgia', serif;
                    font-size: clamp(1.8rem, 3vw, 2.2rem);
                    font-weight: 800;
                    line-height: 1.1;
                    color: ${C.text};
                    margin-bottom: 15px;
                }
                .sp-sub {
                    font-size: 1.05rem;
                    line-height: 1.6;
                    color: ${C.meta};
                    margin-top: 15px;
                    margin-bottom: 25px;
                }
                .sp-related-box {
                    display: grid;
                    grid-template-columns: 1fr 1fr; /* 2 a fianco */
                    gap: 15px;
                    margin-top: 20px;
                    padding-top: 20px;
                    border-top: 1px dashed ${C.border};
                }

                /* --- SIDEBAR POLITICA (Nuovo Stile Classifica) --- */
                .sidebar-header {
                    font-family: 'Inter', sans-serif;
                    font-size: 0.85rem;
                    font-weight: 900;
                    letter-spacing: 1.5px;
                    text-transform: uppercase;
                    color: ${C.text};
                    border-top: 2px solid ${C.accent}; /* Linea sopra */
                    padding-top: 15px;
                    margin-bottom: 30px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    width: 100%;
                }

                .side-item {
                    display: grid;
                    /* QUESTA È LA CHIAVE: 3 colonne (Numero | Testo | Foto Piccola) */
                    grid-template-columns: 35px 1fr 70px; 
                    gap: 15px;
                    padding-bottom: 20px;
                    margin-bottom: 20px;
                    border-bottom: 1px dashed ${C.border};
                    cursor: pointer;
                    align-items: start;
                    transition: transform 0.2s ease;
                }
                .side-item:last-child { border-bottom: none; }
                .side-item:hover { transform: translateX(5px); }

                /* Numero Grande (1, 2, 3...) */
                .side-rank {
                    font-family: 'Georgia', serif;
                    font-size: 2.2rem;
                    line-height: 0.8;
                    font-weight: 700;
                    color: ${C.border}; /* Grigio chiaro */
                    transition: color 0.2s;
                    text-align: center;
                }
                .side-item:hover .side-rank { color: ${C.accent}; }

                .side-title {
                    font-family: 'Inter', sans-serif;
                    font-size: 0.95rem;
                    font-weight: 700;
                    line-height: 1.35;
                    color: ${C.text};
                    margin-bottom: 6px;
                    transition: color 0.2s;
                }
                .side-item:hover .side-title { color: ${C.accent}; }

                .side-meta {
                    font-size: 0.7rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    color: ${C.meta};
                    display: flex; gap: 8px;
                }

                /* --- FOTO MINI (Fix per la foto enorme) --- */
                .side-img-mini {
                    width: 70px;      /* Larghezza fissa */
                    height: 70px;     /* Altezza fissa */
                    border-radius: 4px;
                    object-fit: cover; /* Taglia la foto senza deformarla */
                    background: ${C.border};
                    display: block;
                }
            /* --- BREAKING NEWS BANNER (IMPATTO) --- */
                .breaking-banner {
                    background: linear-gradient(135deg, ${C.live} 0%, #991b1b 100%); /* Gradiente Rosso */
                    padding: 20px 25px;
                    border-radius: 8px;
                    margin-bottom: 40px; /* Stacca dalla hero */
                    display: flex;
                    flex-direction: ${isMobile ? 'column' : 'row'};
                    align-items: center;
                    justify-content: space-between;
                    gap: 20px;
                    color: white;
                    box-shadow: 0 10px 30px rgba(220, 38, 38, 0.3); /* Ombra rossa luminosa */
                    border: 1px solid rgba(255,255,255,0.1);
                    position: relative;
                    overflow: hidden;
                }

                /* Etichetta ULTIM'ORA che lampeggia */
                .bk-label {
                    background: rgba(255,255,255,0.2);
                    backdrop-filter: blur(5px);
                    padding: 6px 14px;
                    border-radius: 4px;
                    font-weight: 900;
                    font-size: 0.9rem;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    display: flex; align-items: center; gap: 8px;
                    white-space: nowrap;
                    border: 1px solid rgba(255,255,255,0.3);
                    box-shadow: 0 0 15px rgba(255,255,255,0.2);
                    animation: pulse-white 2s infinite;
                }

                .bk-text {
                    font-family: 'Georgia', serif;
                    font-size: ${isMobile ? '1.3rem' : '1.6rem'};
                    font-weight: 700;
                    line-height: 1.2;
                    text-align: ${isMobile ? 'center' : 'left'};
                    flex: 1;
                }

                .bk-date {
                    font-size: 0.8rem;
                    opacity: 0.9;
                    font-weight: 600;
                    white-space: nowrap;
                    text-transform: uppercase;
                    background: rgba(0,0,0,0.2);
                    padding: 4px 10px;
                    border-radius: 20px;
                }

                @keyframes pulse-white {
                    0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
                }
                    /* --- (PARTE 2 DA AGGIUNGERE) CSS PER LO SCROLL --- */

                /* SCROLLBAR ORRIZONTALE NASCOSTA MA FUNZIONANTE E STILIZZATA */
                .horz-scroll::-webkit-scrollbar { height: 6px; }
                .horz-scroll::-webkit-scrollbar-track { background: transparent; }
                .horz-scroll::-webkit-scrollbar-thumb { background: ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}; border-radius: 10px; }
                .horz-scroll:hover::-webkit-scrollbar-thumb { background: ${C.accent}; }

                /* HOVER EFFECT CARD (Le fa "saltare" fuori) */
                .cat-card:hover { transform: translateY(-8px) !important; box-shadow: 0 15px 30px rgba(0,0,0,0.15) !important; border-color: ${C.meta} !important; }
            `}</style>

            {/* --- HEADER --- */}
<div style={{
    position: 'fixed', top: 0, left: 0, width: '100%', height: '70px',
    background: C.headerBg, borderBottom: `1px solid ${C.border}`, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px',
    boxShadow: scrolled ? '0 4px 20px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.3s'
}}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
        {isMobile && (
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ background: 'none', border: 'none', fontSize: '1.6rem', color: C.text, cursor: 'pointer' }}>
                ☰
            </button>
        )}

        {/* Logo rimpicciolito e spostato più verso il centro */}
        <div onClick={() => navigate('/')} style={{ 
        cursor: 'pointer', 
        display: 'flex', 
        transform: 'scale(0.8)' // Logo ancora più piccolo
    }}>
        <SiteLogo theme={theme} />
    </div>

    {!isMobile && (
        <div style={{ 
            display: 'flex', 
            gap: '2px', // Tasti quasi attaccati tra loro
            marginLeft: '0px' // Eliminato spazio dal logo
        }}>
            <span className="nav-link" onClick={() => navigate('/')}>Home</span>
            <span className="nav-link" onClick={() => navigate('/categories')}>Categorie</span>
            <span className="nav-link" onClick={() => navigate('/policy')}>Info</span>
        </div>
    )}
</div>
    
    {/* ... resto della header (pulsante tema e profilo) rimane invariato ... */}

                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <button onClick={toggleTheme} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: '5px', lineHeight: 1 }}>
                        {isDark ? '☀️' : '🌙'}
                    </button>

                    {user ? (
                        <div className="profile-pill" onClick={() => navigate('/dashboard')}>
                            <div className="profile-avatar">
                                {user.profileImage ? (
                                    <img src={user.profileImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Me" />
                                ) : (
                                    user.nome.charAt(0).toUpperCase()
                                )}
                            </div>
                            {!isMobile && <span className="profile-name">{user.nome}</span>}
                        </div>
                    ) : (
                        <button className="btn-login" onClick={() => navigate('/login')}>ENTRA</button>
                    )}
                </div>
            </div>

            {/* --- MOBILE MENU --- */}
{isMobile && isMenuOpen && (
    <div style={{ 
        position: 'fixed', top: 70, left: 0, width: '100%', height: '100%', 
        background: C.bg, zIndex: 1001, padding: '20px 30px', 
        display: 'flex', flexDirection: 'column', 
        gap: '12px', // Bottoni più attaccati tra loro
        fontSize: '1.1rem', 
        fontWeight: '700',
        fontFamily: "'Poppins', sans-serif"
    }}>
        <span onClick={() => { navigate('/'); setIsMenuOpen(false); }} style={{ cursor: 'pointer', padding: '5px 0' }}>Home</span>
        <span onClick={() => { navigate('/categories'); setIsMenuOpen(false); }} style={{ cursor: 'pointer', padding: '5px 0' }}>Categorie</span>
        
        {/* Mostra Login solo se non c'è l'utente, altrimenti mostra Dashboard */}
        {!user ? (
            <span onClick={() => { navigate('/login'); setIsMenuOpen(false); }} style={{ cursor: 'pointer', padding: '5px 0' }}>Login</span>
        ) : (
            <span onClick={() => { navigate('/dashboard'); setIsMenuOpen(false); }} style={{ cursor: 'pointer', padding: '5px 0', color: C.accent }}>Il mio Profilo</span>
        )}

        <span onClick={() => { navigate('/policy'); setIsMenuOpen(false); }} style={{ cursor: 'pointer', padding: '5px 0' }}>Info</span>
    </div>
)}
            {/* --- HEADER 2 (Categorie) --- */}
            <div style={{ position: 'fixed', top: 70, left: 0, width: '100%', height: 50, background: C.bg, borderBottom: `1px solid ${C.border}`, zIndex: 999 }}>
                <Header2 theme={theme} isStatic={true} />
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="container">

                {/* === BREAKING NEWS WIDGET (DESIGN ROSSO MODERNO) === */}
                {breaking && (new Date() - new Date(breaking.createdAt) < 7200000) && (
                    <>
                        {/* 1. STILE CSS SPECIFICO PER QUESTO WIDGET */}
                        <style>{`
                            .breaking-banner {
                                background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
                                position: relative;
                                overflow: hidden;
                                padding: 18px 25px;
                                border-radius: 12px;
                                margin-bottom: 40px;
                                display: flex;
                                flex-direction: ${isMobile ? 'column' : 'row'};
                                align-items: center;
                                justify-content: space-between;
                                gap: 20px;
                                box-shadow: 0 10px 25px -5px rgba(220, 38, 38, 0.5);
                                border: 1px solid rgba(255,255,255,0.1);
                                transition: transform 0.2s ease, box-shadow 0.2s ease;
                            }
                            .breaking-banner:hover {
                                transform: translateY(-2px);
                                box-shadow: 0 15px 30px -5px rgba(220, 38, 38, 0.6);
                            }
                            .breaking-banner::before {
                                content: '';
                                position: absolute;
                                top: 0; left: -50%;
                                width: 100%; height: 100%;
                                background: linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent);
                                transform: skewX(-25deg);
                                animation: shine 6s infinite;
                            }
                            @keyframes shine {
                                0% { left: -50%; }
                                20% { left: 150%; }
                                100% { left: 150%; }
                            }
                            .bk-label {
                                background: #ffffff;
                                color: #b91c1c;
                                padding: 6px 14px;
                                border-radius: 6px;
                                font-weight: 900;
                                font-size: 0.75rem;
                                letter-spacing: 1px;
                                text-transform: uppercase;
                                white-space: nowrap;
                                display: flex; align-items: center; gap: 8px;
                                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                                z-index: 2;
                            }
                            .bk-dot {
                                width: 8px; height: 8px; 
                                background: #dc2626; 
                                border-radius: 50%;
                                animation: pulse-red 1.5s infinite;
                            }
                            @keyframes pulse-red { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } 100% { opacity: 1; transform: scale(1); } }
                            .bk-text {
                                font-family: 'Georgia', serif;
                                color: #ffffff;
                                font-size: ${isMobile ? '1.2rem' : '1.4rem'};
                                font-weight: 700;
                                line-height: 1.3;
                                flex: 1;
                                text-align: ${isMobile ? 'center' : 'left'};
                                text-shadow: 0 2px 4px rgba(0,0,0,0.2);
                                z-index: 2;
                            }
                            .bk-date {
                                font-size: 0.8rem;
                                font-weight: 700;
                                color: rgba(255,255,255,0.9);
                                background: rgba(0,0,0,0.2);
                                padding: 6px 12px;
                                border-radius: 20px;
                                white-space: nowrap;
                                z-index: 2;
                            }
                        `}</style>

                        {/* 2. STRUTTURA HTML DEL BANNER */}
                        <div className="breaking-banner" 
                             onClick={() => breaking.link ? window.location.href = breaking.link : null} 
                             style={{ cursor: breaking.link ? 'pointer' : 'default' }}
                        >
                            {/* Etichetta Bianca */}
                            <div className="bk-label">
                                <div className="bk-dot"></div> ULTIM'ORA
                            </div>

                            {/* Testo Bianco */}
                            <div className="bk-text">
                                {clean(breaking.text)}
                            </div>

                            {/* Data */}
                            <div className="bk-date">
                                {new Date(breaking.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </>
                )}

                {/* 1. PRIMA PAGINA (Hero) */}
                {mainHero && (
                    <div style={{ marginBottom: '60px' }}>

                        {/* CONTROLLO TIPO: BREAKING vs STANDARD */}
                        {showAsBreaking ? (

                            <div className="news-box breaking-layout">
                                {/* === CASO A: ULTIM'ORA === */}
                                {/* Titolo Centrato Sopra */}
                                <div className="brk-header">
                                    <div className="std-cat" style={{ color: C.breaking }}>ULTIM'ORA / {mainHero.category}</div>
                                    <h1 className="brk-title">{clean(mainHero.title)}</h1>
                                </div>

                                {/* Foto Estesa */}
                                <div className="brk-img-container" onClick={() => navigate(`/news/${mainHero.slug}`)} style={{ cursor: 'pointer' }}>
                                    <img src={mainHero.coverImage} className="brk-img" alt="" />

                                    {/* Icona LIVE sopra foto (Lampeggia) */}
                                    {mainHero.isLive && <div className="overlay-live"><Icons.LiveIconWhite /></div>}

                                    {/* Like/Save sovrapposti sulla FOTO */}
                                    <div className="overlay-actions">
                                        <div className="icon-btn" onClick={(e) => handleLike(e, mainHero._id)}><Icons.Heart filled={isLiked(mainHero._id)} /></div>
                                        <div className="icon-btn" onClick={(e) => handleSave(e, mainHero._id)}><Icons.Bookmark filled={isSaved(mainHero._id)} /></div>
                                    </div>
                                </div>

                                {/* NESSUN SOTTOTITOLO QUI (Come richiesto) */}

                                {/* Aggiornamenti Sotto (Griglia Box) */}
                                {mainHero.isLive && mainHero.liveUpdates && (
                                    <div className="brk-updates-area">
                                        <div style={{ color: C.live, fontWeight: '900', marginBottom: 10, textTransform: 'uppercase' }}>🔴 Aggiornamenti Live</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 15 }}>
                                            {mainHero.liveUpdates.slice(0, 3).map((u, i) => (
                                                <div key={i} style={{ padding: 10, borderLeft: `3px solid ${C.live}`, background: isDark ? 'rgba(255,255,255,0.05)' : '#fff', border: `1px solid ${C.border}`, borderLeftWidth: 3 }}>
                                                    <div className="u-time">{formatTime(u.time)}</div>
                                                    <div className="u-text">{clean(u.text)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                        ) : (

                            <div className="news-box standard-layout" onClick={() => navigate(`/news/${mainHero.slug}`)} style={{ cursor: 'pointer' }}>
                                {/* === CASO B: STANDARD === */}
                                {/* Colonna Testo Sinistra */}
                                <div className="std-text">
                                    <div className="std-cat">{mainHero.category}</div>
                                    <h1 className="std-title">{clean(mainHero.title)}</h1>
                                    <p className="std-sub">{clean(mainHero.summary)}</p>

                                    {/* Stringa Live nel testo + Aggiornamenti sotto */}
                                    {mainHero.isLive && (
                                        <>
                                            <div className="live-row"><Icons.LiveDot /> DIRETTA LIVE</div>
                                            {mainHero.liveUpdates && (
                                                <div className="std-updates">
                                                    {mainHero.liveUpdates.slice(0, 2).map((u, i) => (
                                                        <div key={i} className="update-row">
                                                            <span className="u-time">{formatTime(u.time)}</span>
                                                            <span className="u-text">{clean(u.text)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Colonna Foto Destra */}
                                <div className="std-img-col">
                                    <div className="img-wrapper" style={{ width: '100%', height: '100%' }}>
                                        <img src={mainHero.coverImage} className="news-img" alt="" />
                                        {/* Like/Save sovrapposti sulla FOTO */}
                                        <div className="overlay-actions">
                                            <div className="icon-btn" onClick={(e) => handleLike(e, mainHero._id)}><Icons.Heart filled={isLiked(mainHero._id)} /></div>
                                            <div className="icon-btn" onClick={(e) => handleSave(e, mainHero._id)}><Icons.Bookmark filled={isSaved(mainHero._id)} /></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* === NEWS CORRELATE (Sotto al box principale) === */}
                        {mainHero.attachedNews && mainHero.attachedNews.length > 0 && (
                            <div className="related-sec">
                                {mainHero.attachedNews.map(rel => (
                                    <div key={rel._id} className="rel-item" onClick={() => navigate(`/news/${rel.slug}`)}>
                                        <img src={rel.coverImage} className="rel-img" alt="" />
                                        <div className="rel-txt">{clean(rel.title)}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* === SUB HERO (Seconda notizia prima pagina) - FOTO PIÙ LARGA === */}
                        {subHero && (
                            <div className="news-box standard-layout" style={{ marginTop: 40, minHeight: 200 }} onClick={() => navigate(`/news/${subHero.slug}`)}>
                                {/* Restringiamo il testo al 35% per dare più spazio alla foto */}
                                <div className="std-text" style={{ flex: '0 0 35%' }}>
                                    <div className="std-cat">{subHero.category}</div>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800', lineHeight: 1.2, margin: '0 0 10px 0' }}>{clean(subHero.title)}</h2>
                                    <p className="std-sub" style={{ WebkitLineClamp: 2 }}>{clean(subHero.summary)}</p>
                                </div>
                                {/* Rimosso il vincolo fisso, ora prende il 65% restante */}
                                <div className="std-img-col" style={{ minHeight: 200 }}>
                                    <div className="img-wrapper" style={{ width: '100%', height: '100%' }}>
                                        <img src={subHero.coverImage} className="news-img" alt="" />
                                        <div className="overlay-actions">
                                            <div className="icon-btn" onClick={(e) => handleLike(e, subHero._id)}><Icons.Heart filled={isLiked(subHero._id)} /></div>
                                            <div className="icon-btn" onClick={(e) => handleSave(e, subHero._id)}><Icons.Bookmark filled={isSaved(subHero._id)} /></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}


                {/* --- SECONDA PAGINA WIDGET (Titolo su, Cliccabile, Foto DB) --- */}
                <div className="sp-container">

                    {/* COLONNA SINISTRA: News Principale */}
                    <div className="sp-left">
                        {mainSecondPage && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                                {/* 1. TITOLO (Largo, Centrato e con Virgolette) */}
                                <h2 className="sp-title" 
                                    onClick={() => navigate(`/news/${mainSecondPage.slug}`)}
                                    style={{
                                        textAlign: 'center',
                                        fontFamily: "'Georgia', serif", // Font più "giornalistico" per le virgolette
                                        fontWeight: '800',
                                        fontSize: 'clamp(2.2rem, 4vw, 3.2rem)', // Aumentato per riempire la larghezza
                                        lineHeight: '1.1',
                                        letterSpacing: '-0.5px',
                                        marginBottom: '20px',
                                        marginTop: '-10px',
                                        width: '100%',
                                        maxWidth: '100%',
                                        color: C.text,
                                        cursor: 'pointer'
                                    }}
                                >
                                    “{clean(mainSecondPage.title)}”
                                </h2>

                                {/* 2. FOTO (Più Alta e Cliccabile) */}
                                <div className="img-wrapper" style={{
                                    width: '100%',
                                    height: '450px',
                                    borderRadius: '4px',
                                    marginBottom: '20px',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                                    cursor: 'pointer'
                                }} onClick={() => navigate(`/news/${mainSecondPage.slug}`)}>
                                    <img src={mainSecondPage.coverImage} className="news-img" alt="" />

                                    {mainSecondPage.isLive && <div className="overlay-live"><Icons.LiveIconWhite /></div>}

                                    <div className="overlay-actions">
                                        <div className="icon-btn" onClick={(e) => handleLike(e, mainSecondPage._id)}><Icons.Heart filled={isLiked(mainSecondPage._id)} /></div>
                                        <div className="icon-btn" onClick={(e) => handleSave(e, mainSecondPage._id)}><Icons.Bookmark filled={isSaved(mainSecondPage._id)} /></div>
                                    </div>
                                </div>

                                {/* 3. META DATA (Restyling: Sottile, Compatto + Tags) */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    width: '100%',
                                    paddingBottom: '15px',
                                    marginBottom: '20px',
                                    borderBottom: `1px solid ${C.border}`,
                                    flexWrap: 'wrap' // Per adattarsi ai cellulari
                                }}>

                                    {/* A. AVATAR (Più piccolo: 38px) */}
                                    <div style={{
                                        width: '38px', height: '38px', borderRadius: '50%',
                                        background: C.accent, color: 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: '500', fontSize: '1rem', flexShrink: 0,
                                        overflow: 'hidden', border: `1px solid ${C.border}`
                                    }}>
                                        {secondPageAuthor && (secondPageAuthor.foto || secondPageAuthor.profileImage) ? (
                                            <img src={secondPageAuthor.foto || secondPageAuthor.profileImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                        ) : (
                                            mainSecondPage.author ? mainSecondPage.author.charAt(0).toUpperCase() : 'R'
                                        )}
                                    </div>

                                    {/* B. NOME & TEMPO (Font Sottile) */}
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{
                                            fontWeight: '600', // Meno grassetto (era 800)
                                            fontSize: '0.9rem',
                                            color: C.text,
                                            lineHeight: '1.2'
                                        }}>
                                            {mainSecondPage.author || "Redazione"}
                                        </span>
                                        <span style={{ fontSize: '0.8rem', color: C.meta, fontWeight: '400' }}>
                                            {Math.max(1, Math.round((mainSecondPage.content?.length || 500) / 1000))} min lettura
                                        </span>
                                    </div>

                                    {/* C. DIVISORE E DATI EXTRA (A destra) */}
                                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>

                                        {/* Categoria (Colore Accent) */}
                                        <span style={{
                                            fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase',
                                            color: C.accent, letterSpacing: '0.5px'
                                        }}>
                                            {mainSecondPage.category}
                                        </span>

                                        {/* Tags (Pillole grigie) */}
                                        {mainSecondPage.tags && mainSecondPage.tags.length > 0 && (
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                {mainSecondPage.tags.slice(0, 2).map((tag, i) => (
                                                    <span key={i} style={{
                                                        fontSize: '0.7rem',
                                                        background: isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
                                                        color: C.meta,
                                                        padding: '3px 8px',
                                                        borderRadius: '4px',
                                                        fontWeight: '500'
                                                    }}>
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 4. SOMMARIO */}
                                <p className="sp-sub" style={{
                                    textAlign: 'left',
                                    width: '100%',
                                    fontSize: '1.15rem',
                                    lineHeight: '1.6',
                                    marginTop: '0'
                                }}>
                                    {clean(mainSecondPage.summary)}
                                </p>

                                {/* --- CODICE DA AGGIUNGERE QUI SOTTO --- */}
                                
                                {/* 5. ACTION BAR (Per riempire il vuoto) */}
                                <div style={{
                                    marginTop: '25px',
                                    paddingTop: '20px',
                                    borderTop: `1px solid ${C.border}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    width: '100%'
                                }}>
                                    {/* Bottone "Leggi l'articolo" */}
                                    <button 
                                        onClick={() => navigate(`/news/${mainSecondPage.slug}`)}
                                        style={{
                                            background: 'transparent',
                                            border: `2px solid ${C.text}`,
                                            color: C.text,
                                            padding: '12px 30px',
                                            borderRadius: '50px',
                                            fontWeight: '800',
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = C.text;
                                            e.currentTarget.style.color = C.bg;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = C.text;
                                        }}
                                    >
                                        Leggi l'articolo <span>➜</span>
                                    </button>

                                    {/* Icone Rapide (Like/Save) */}
                                    <div style={{display: 'flex', gap: '10px'}}>
                                        <div 
                                            className="icon-btn" 
                                            style={{
                                                width: 40, height: 40, 
                                                border: `1px solid ${C.border}`, 
                                                background: 'transparent',
                                                color: C.text
                                            }} 
                                            onClick={(e)=>handleLike(e, mainSecondPage._id)}
                                        >
                                            <Icons.Heart filled={isLiked(mainSecondPage._id)} />
                                        </div>
                                        <div 
                                            className="icon-btn" 
                                            style={{
                                                width: 40, height: 40, 
                                                border: `1px solid ${C.border}`, 
                                                background: 'transparent',
                                                color: C.text
                                            }} 
                                            onClick={(e)=>handleSave(e, mainSecondPage._id)}
                                        >
                                            <Icons.Bookmark filled={isSaved(mainSecondPage._id)} />
                                        </div>
                                    </div>
                                </div>

                                {/* -------------------------------------- */}

                                {/* News Correlate */}
                                {mainSecondPage.attachedNews && mainSecondPage.attachedNews.length > 0 && (
                                    <div className="sp-related-box" style={{ width: '100%' }}>
                                        {mainSecondPage.attachedNews.slice(0, 2).map(rel => (
                                            <div key={rel._id} className="news-box" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, cursor: 'pointer' }} onClick={() => navigate(`/news/${rel.slug}`)}>
                                                <div className="img-wrapper" style={{ width: 70, height: 50, flexShrink: 0 }}>
                                                    <img src={rel.coverImage} className="news-img" alt="" />
                                                </div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: '700', lineHeight: 1.2 }}>{clean(rel.title)}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* COLONNA DESTRA: Sidebar POLITICA (Classifica + Banner) */}
                    <div className="sp-sidebar">

                        {/* Header */}
                        <div className="sidebar-header">
                            <span style={{ color: C.accent, marginRight: '5px' }}>●</span> POLITICA & PALAZZO
                        </div>

                        {/* LISTA NOTIZIE (Ranking) */}
                        {politicsNews.map((n, index) => (
                            <div key={n._id} className="side-item" onClick={() => navigate(`/news/${n.slug}`)}>
                                {/* 1. NUMERO */}
                                <div className="side-rank">{index + 1}</div>

                                {/* 2. TESTI */}
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div style={{
                                        fontSize: '0.65rem', fontWeight: '800', color: C.accent,
                                        textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px'
                                    }}>
                                        {n.category || 'Politica'}
                                    </div>
                                    <div className="side-title">{clean(n.title)}</div>
                                    <div className="side-meta">{formatDate(n.createdAt)}</div>
                                </div>

                                {/* 3. FOTO MINI */}
                                <img src={n.coverImage} className="side-img-mini" alt="" />
                            </div>
                        ))}

                        {/* <--- INCOLLA QUESTO SOTTO LA CHIUSURA DEL DIV "SPONSOR" ---> */}

                        {/* --- NUOVA SEZIONE SIDEBAR: RUSSIA --- */}
                        <div style={{ marginTop: '50px' }}>
                            {/* Header Sidebar RUSSIA (Rosso) */}
                            <div className="sidebar-header" style={{ borderTop: '2px solid #dc2626' }}>
                                <span style={{ color: '#dc2626', marginRight: '5px' }}>●</span> RUSSIA
                            </div>

                            {/* LISTA NOTIZIE RUSSIA (Ranking 1-5) */}
                            {newsRussia.slice(0, 2).map((n, index) => (
                                <div key={n._id} className="side-item" onClick={() => navigate(`/news/${n.slug}`)}>
                                    {/* 1. NUMERO */}
                                    <div className="side-rank">{index + 1}</div>

                                    {/* 2. TESTI */}
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div style={{
                                            fontSize: '0.65rem', fontWeight: '800', color: '#dc2626', /* Colore Rosso */
                                            textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px'
                                        }}>
                                            {n.category}
                                        </div>
                                        <div className="side-title">{clean(n.title)}</div>
                                        <div className="side-meta">{formatDate(n.createdAt)}</div>
                                    </div>

                                    {/* 3. FOTO MINI */}
                                    <img src={n.coverImage} className="side-img-mini" alt="" />
                                </div>
                            ))}
                        </div>


                        {/* --- BANNER ADS (LOGICA DINAMICA) --- */}
                        <div style={{
                            marginTop: '50px',
                            paddingTop: '30px',
                            borderTop: `1px dashed ${C.border}`,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            width: '100%'
                        }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: '700', letterSpacing: '1.5px', color: C.meta, textTransform: 'uppercase', marginBottom: '15px' }}>
                                Sponsor
                            </span>

                            {adSettings && adSettings.isAdActive ? (
                                <div style={{
                                    width: '100%', maxWidth: '300px', minHeight: '250px',
                                    background: isDark ? 'rgba(255,255,255,0.02)' : '#f1f5f9',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    borderRadius: '8px', overflow: 'hidden'
                                }}>
                                    {adSettings.adCode ? (
                                        <div dangerouslySetInnerHTML={{ __html: adSettings.adCode }} style={{ width: '100%', overflow: 'hidden' }} />
                                    ) : (
                                        <a href={adSettings.adLink || '#'} target="_blank" rel="noreferrer" style={{ display: 'block', width: '100%' }}>
                                            <img src={adSettings.adImage} alt="Sponsor" style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }} />
                                        </a>
                                    )}
                                </div>
                            ) : (
                                <div style={{
                                    width: '100%', maxWidth: '300px', height: '250px',
                                    background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    borderRadius: '4px', border: `1px dashed ${C.border}`,
                                    color: C.meta, fontSize: '0.8rem', fontWeight: '600'
                                }}>
                                    SPAZIO DISPONIBILE
                                </div>
                            )}
                        </div>

                    </div>


                </div> {/* FINE sp-container (Era questo il problema per le altre notizie!) */}

                {/* --- INSERISCI QUI: ITALIA 3 NEWS (Sotto allo Sponsor/Seconda Pagina) --- */}
<CategoryRow 
    title="Italia 3 News" 
    data={newsItalia.slice(0, 4)}  /* <--- MODIFICA QUI: Prende solo le prime 4 */
    color="#008C45" 
/>

                {/* --- 3. ALTRE NOTIZIE (Griglia Sotto - LIMITATA A 3) --- */}
                <div style={{ marginBottom: '60px' }}>
                    <h3 style={{ borderBottom: `2px solid ${C.accent}`, display: 'inline-block', paddingBottom: 5, marginBottom: 20, textTransform: 'uppercase' }}>
                        Altre Notizie
                    </h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 30 }}>
                        {/* 👇 QUI LA MODIFICA: .slice(0, 3) prende solo le prime 3 */}
                        {[...secondPageNews, ...standardNews].slice(0, 3).map(n => (
                            <div key={n._id} className="news-box" style={{ display: 'flex', flexDirection: 'column', cursor:'pointer' }} onClick={() => navigate(`/news/${n.slug}`)}>
                                
                                {/* Foto */}
                                <div className="img-wrapper" style={{ height: 180 }}>
                                    <img src={n.coverImage} className="news-img" alt="" />
                                    
                                    <div className="overlay-actions">
                                        <div className="icon-btn" style={{ width: 30, height: 30 }} onClick={(e) => handleLike(e, n._id)}>
                                            <Icons.Heart filled={isLiked(n._id)} />
                                        </div>
                                        <div className="icon-btn" style={{ width: 30, height: 30 }} onClick={(e) => handleSave(e, n._id)}>
                                            <Icons.Bookmark filled={isSaved(n._id)} />
                                        </div>
                                    </div>
                                </div>

                                {/* Testo */}
                                <div style={{ padding: 15, flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: C.accent, textTransform: 'uppercase', marginBottom: 5 }}>
                                        {n.category}
                                    </div>
                                    <h4 style={{ fontSize: '1.1rem', fontWeight: '700', lineHeight: 1.3, margin: '0 0 8px 0', color: C.text }}>
                                        {clean(n.title)}
                                    </h4>
                                    <div style={{ marginTop: 'auto', fontSize: '0.8rem', color: C.meta }}>
                                        {formatDate(n.createdAt)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

{/* --- (PARTE 3 DA AGGIUNGERE) LE 4 NUOVE SEZIONI A SCORRIMENTO --- */}

                {/* 1. AMERICA (Colore Blu) */}
                <CategoryRow title="America" data={newsAmerica} color="#2563eb" />

                {/* 2. UCRAINA (Colore Giallo/Oro) */}
                <CategoryRow title="Ucraina" data={newsUcraina} color="#eab308" />

                {/* 4. MONDO (Colore Verde Smeraldo) */}
                <CategoryRow title="Dal Mondo" data={newsMondo} color="#059669" />

                {/* ... dopo <CategoryRow title="Dal Mondo" ... /> */}

                {/* NUOVE CATEGORIE IN BASSO */}
                <CategoryRow title="Medioriente" data={newsMedioriente} color="#d97706" /* Arancione scuro */ />
                <CategoryRow title="Iran" data={newsIran} color="#be123c" /* Rosso scuro */ />
                <CategoryRow title="Scenari di Guerra" data={newsGuerra} color="#57534e" /* Grigio Pietra */ />

                {/* -------------------------------------------------------- */}

            </div> {/* FINE CONTAINER (Era questo il problema del footer!) */}
            
            <Footer />
        </div>
    );
}
export default Home;