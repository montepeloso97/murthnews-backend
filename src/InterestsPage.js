import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SiteLogo from './SiteLogo';

// --- ICONE SVG ---
const IconStar = () => <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
const IconDiamond = () => <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M6 2L3 8l9 14 9-14-3-6H6z"/></svg>;
const IconLock = () => <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;
const IconClock = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;

function InterestsPage() {
    const navigate = useNavigate();
    
    const [news, setNews] = useState([]);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState('light');

    useEffect(() => {
        const stored = localStorage.getItem('reader_user');
        if (!stored) { navigate('/login'); return; }
        
        const u = JSON.parse(stored);
        setUser(u);
        if (u.theme) setTheme(u.theme);

        const fetchData = async () => {
            try {
                let data = [];
                // Se l'utente ha interessi, filtra. Altrimenti prendi le ultime.
                if (u.interessi && u.interessi.length > 0) {
                    const res = await axios.post('https://murthnews-api.onrender.com/api/news/by-interests', { interests: u.interessi });
                    data = res.data;
                } else {
                    const res = await axios.get('https://murthnews-api.onrender.com/api/news');
                    data = res.data;
                }

                // --- SIMULAZIONE TIPI DI ACCESSO (Per test grafico) ---
                // Nota: In produzione questo dato arriverà dal DB (item.accessType)
                const enrichedData = data.map((item, index) => ({
                    ...item,
                    // Simuliamo: 1 gratis, 1 premium, 1 full pass, ripeti...
                    accessType: index % 3 === 0 ? 'free' : (index % 3 === 1 ? 'premium' : 'fullpass') 
                }));
                // -----------------------------------------------------

                setNews(enrichedData);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    const isDark = theme === 'dark';

    // COLORI
    const colors = {
        bg: isDark ? '#0b1120' : '#f8fafc',
        textTitle: isDark ? '#f1f5f9' : '#1e293b',
        textBody: isDark ? '#94a3b8' : '#64748b',
        accent: '#6366f1',
        gold: '#fbbf24',    
        diamond: '#22d3ee', 
        glow: isDark 
            ? 'radial-gradient(circle at 50% -10%, #312e81 0%, #0b1120 45%)' 
            : 'radial-gradient(circle at 50% -10%, #e0e7ff 0%, #f8fafc 45%)'
    };

    // --- LOGICA DI ACCESSO CORRETTA ---
    const checkAccess = (article) => {
        const type = article.accessType || 'free';
        
        // Se è gratis, passa sempre
        if (type === 'free') return { locked: false, label: null, color: null, icon: null };

        // Recuperiamo il livello dell'utente (standard, premium, abbonato/full)
        const userLevel = user?.livello || 'standard'; 

        // Se l'articolo è PREMIUM
        if (type === 'premium') {
            // Chi può vederlo? Premium e Abbonato (Full)
            const canView = userLevel === 'premium' || userLevel === 'abbonato' || userLevel === 'full';
            return {
                locked: !canView,
                label: 'Premium',
                color: colors.gold,
                icon: <IconStar />
            };
        }

        // Se l'articolo è FULL PASS
        if (type === 'fullpass') {
            // Chi può vederlo? Solo Abbonato (Full)
            const canView = userLevel === 'abbonato' || userLevel === 'full';
            return {
                locked: !canView,
                label: 'Full Pass',
                color: colors.diamond,
                icon: <IconDiamond />
            };
        }

        return { locked: false };
    };

    return (
        <div style={{ minHeight:'100vh', background: colors.bg, color: colors.textBody, fontFamily:"'Plus Jakarta Sans', sans-serif", transition:'0.3s', position:'relative', overflowX:'hidden' }}>
            
            {/* GLOW */}
            <div style={{position:'absolute', top:0, left:0, width:'100%', height:'800px', background: colors.glow, zIndex: 0}}></div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,800;1,600&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap');

                .page-container { max-width: 1200px; margin: 0 auto; padding: 110px 20px 80px 20px; position: relative; z-index: 1; }

                /* NAVBAR */
                .nav-glass {
                    position: fixed; top: 0; left: 0; width: 100%; z-index: 50;
                    padding: 20px 5%; display: flex; justify-content: space-between; align-items: center;
                    background: ${isDark ? 'rgba(11, 17, 32, 0.6)' : 'rgba(248, 250, 252, 0.6)'};
                    backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.05);
                }

                /* GRID */
                .news-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; }
                @media (max-width: 900px) { .news-grid { grid-template-columns: repeat(2, 1fr); } }
                @media (max-width: 600px) { .news-grid { grid-template-columns: 1fr; } }

                /* NEWS ITEM */
                .news-item { display: flex; flex-direction: column; gap: 15px; cursor: pointer; position: relative; }
                
                /* Se bloccato, cambiamo cursore */
                .news-item.locked { cursor: default; }

                .img-container {
                    border-radius: 20px; overflow: hidden; height: 240px; width: 100%; position: relative; 
                    box-shadow: 0 10px 30px -10px rgba(0,0,0,0.15);
                    transition: transform 0.4s ease, box-shadow 0.4s ease;
                }
                
                /* Hover solo se NON è bloccato */
                .news-item:not(.locked):hover .img-container { transform: translateY(-5px); box-shadow: 0 20px 40px -10px rgba(0,0,0,0.25); }

                .news-img { width: 100%; height: 100%; object-fit: cover; transition: 0.5s; }
                .news-item:not(.locked):hover .news-img { transform: scale(1.05); }

                /* OVERLAY LUCCHETTO */
                .lock-overlay {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(5px);
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    color: white; opacity: 0; transition: opacity 0.3s; pointer-events: none; /* Lascia passare i click al bottone dentro */
                }
                .locked .lock-overlay { opacity: 1; pointer-events: auto; }

                /* BADGE */
                .access-badge {
                    position: absolute; top: 15px; left: 15px;
                    padding: 6px 12px; border-radius: 30px;
                    font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;
                    display: flex; align-items: center; gap: 6px;
                    background: rgba(255, 255, 255, 0.95); color: #000;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1); z-index: 10;
                }

                .news-title {
                    font-family: 'Playfair Display', serif; font-size: 1.5rem; line-height: 1.25; font-weight: 800;
                    color: ${colors.textTitle}; margin: 0; transition: color 0.2s;
                }
                .news-item:not(.locked):hover .news-title { color: ${colors.accent}; }

                .meta-row { display: flex; align-items: center; gap: 15px; font-size: 0.8rem; opacity: 0.8; font-weight: 600; }
                
                .btn-unlock {
                    margin-top: 15px; padding: 10px 20px; background: white; color: black;
                    border: none; border-radius: 30px;
                    font-size: 0.85rem; font-weight: 800; cursor: pointer;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.2); transition: transform 0.2s;
                }
                .btn-unlock:hover { transform: scale(1.05); }
            `}</style>

            <nav className="nav-glass">
                <div onClick={() => navigate('/')} style={{cursor:'pointer'}}><SiteLogo theme={theme} /></div>
                <div style={{display:'flex', alignItems:'center', gap:'20px'}}>
                    <button onClick={() => navigate('/dashboard')} style={{
                        background: 'transparent', border: `1px solid ${isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'}`, 
                        padding: '8px 20px', borderRadius: '30px', color: colors.textTitle, cursor: 'pointer', fontWeight: 'bold', fontSize:'0.85rem'
                    }}>
                        ← Dashboard
                    </button>
                    <div style={{fontFamily:"'Playfair Display', serif", fontStyle:'italic', opacity:0.6}}>Your Daily Mix</div>
                </div>
            </nav>

            <div className="page-container">
                
                <div style={{marginBottom:'60px', textAlign:'left'}}>
                    <h1 style={{fontFamily:"'Playfair Display', serif", fontSize:'3.5rem', margin:'0', color: colors.textTitle}}>
                        Letture del Giorno
                    </h1>
                    <p style={{marginTop:'10px', fontSize:'1.1rem', maxWidth:'600px'}}>
                        Selezionate in base ai tuoi interessi: <span style={{color: colors.accent}}>{user?.interessi?.join(", ") || "Generale"}</span>.
                    </p>
                </div>

                {loading ? (
                    <div style={{padding:'60px', textAlign:'center'}}>✨ Caricamento...</div>
                ) : (
                    <div className="news-grid">
                        {news.slice(0, 9).map((item) => { 
                            const access = checkAccess(item);

                            return (
                                <article 
                                    key={item._id} 
                                    className={`news-item ${access.locked ? 'locked' : ''}`}
                                    onClick={() => {
                                        // Se NON è bloccato, naviga alla news
                                        if (!access.locked) navigate(`/news/${item.slug}`);
                                    }}
                                >
                                    {/* IMMAGINE */}
                                    <div className="img-container">
                                        <img src={item.coverImage} alt={item.title} className="news-img" />
                                        
                                        {/* Badge Accesso (Se non è free) */}
                                        {access.label && (
                                            <div className="access-badge" style={{color: access.color}}>
                                                {access.icon}
                                                <span>{access.label}</span>
                                            </div>
                                        )}

                                        {/* Overlay Blocco (Solo se locked) */}
                                        <div className="lock-overlay">
                                            <IconLock />
                                            <span style={{marginTop:'10px', fontWeight:'700', fontSize:'1.1rem'}}>
                                                {item.accessType === 'fullpass' ? 'Solo Full Pass' : 'Contenuto Premium'}
                                            </span>
                                            {/* Bottone per Abbonarsi */}
                                            <button 
                                                className="btn-unlock" 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); // Ferma il click sulla card
                                                    navigate('/dashboard/subscription'); 
                                                }}
                                            >
                                                Sblocca Ora
                                            </button>
                                        </div>
                                    </div>

                                    {/* TESTO */}
                                    <div>
                                        <div className="meta-row" style={{marginBottom:'8px'}}>
                                            <span style={{textTransform:'uppercase', fontSize:'0.7rem', letterSpacing:'1px', color: colors.accent, fontWeight:'800'}}>
                                                {item.category}
                                            </span>
                                            <span style={{display:'flex', alignItems:'center', gap:'5px'}}>
                                                <IconClock /> {Math.ceil(item.content?.length / 3000) || 2} min
                                            </span>
                                        </div>

                                        <h2 className="news-title">
                                            {item.title}
                                        </h2>

                                        {!access.locked && (
                                            <p style={{margin:'10px 0 0 0', fontSize:'0.95rem', lineHeight:'1.6', opacity:0.8, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden'}}>
                                                {item.summary || "Scopri di più su questo argomento..."}
                                            </p>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default InterestsPage;