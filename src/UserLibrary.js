import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SiteLogo from './SiteLogo';

function UserLibrary() {
    const navigate = useNavigate();
    
    // --- DATI ---
    const [saved, setSaved] = useState([]);
    const [liked, setLiked] = useState([]);
    const [user, setUser] = useState(null); // FIX: Utente definito
    
    // --- UI ---
    const [activeTab, setActiveTab] = useState('saved'); 
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState('light');
    const [scrolled, setScrolled] = useState(false);

    // 1. Scroll per effetto vetro
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // 2. Caricamento Dati
    useEffect(() => {
        const storedUser = localStorage.getItem('reader_user');
        if (!storedUser) return navigate('/login');
        
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser); 
        
        if (parsedUser.theme) setTheme(parsedUser.theme);

        // Chiamata al Server
        axios.get(`http://localhost:5000/api/user/${parsedUser._id}/library`)
            .then(res => {
                console.log("DATI DAL SERVER:", res.data); // Guarda la console del browser (F12)
                setSaved(res.data.saved || []);
                setLiked(res.data.liked || []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Errore fetch:", err);
                setLoading(false);
            });
    }, [navigate]);

    const isDark = theme === 'dark';
    
    // --- COLORI & GRAFICA ---
    const colors = {
        bg: isDark ? '#0f172a' : '#f8fafc',
        textMain: isDark ? '#f8fafc' : '#1e293b',
        textSec: isDark ? '#94a3b8' : '#64748b',
        cardBg: isDark ? '#1e293b' : '#ffffff',
        border: isDark ? '#334155' : '#e2e8f0',
        navBg: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        accent: '#ef4444',
        // IL BAGLIORE CHE VOLEVI
        glow: isDark 
            ? 'radial-gradient(circle at 50% 0%, #312e81 0%, #0f172a 60%)' 
            : 'radial-gradient(circle at 50% 0%, #e0e7ff 0%, #f8fafc 60%)'
    };

    const list = activeTab === 'saved' ? saved : liked;

    return (
        <div style={{minHeight:'100vh', background: colors.bg, color: colors.textMain, fontFamily:"'Inter', sans-serif", position:'relative', transition:'0.3s'}}>
             
             {/* SFONDO BAGLIORE */}
             <div style={{position:'absolute', top:0, left:0, width:'100%', height:'600px', background: colors.glow, zIndex:0, pointerEvents:'none'}}></div>

             {/* STILI CSS PER GLI EFFETTI */}
             <style>{`
                .nav-fixed {
                    position: fixed; top: 0; left: 0; width: 100%; z-index: 50;
                    padding: 15px 5%; display: flex; justify-content: space-between; align-items: center;
                    background: ${scrolled ? colors.navBg : 'transparent'};
                    backdrop-filter: ${scrolled ? 'blur(10px)' : 'none'};
                    border-bottom: ${scrolled ? `1px solid ${colors.border}` : 'none'};
                    transition: all 0.3s ease;
                }
                .lib-card {
                    background: ${colors.cardBg}; border-radius: 16px; overflow: hidden;
                    border: 1px solid ${colors.border}; transition: transform 0.3s ease, box-shadow 0.3s ease;
                    cursor: pointer; position: relative;
                }
                .lib-card:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 15px 30px rgba(0,0,0,0.12);
                    border-color: ${colors.accent};
                }
                .card-img-wrap { height: 200px; overflow: hidden; position: relative; }
                .card-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s ease; }
                .lib-card:hover .card-img { transform: scale(1.1); }
                
                .tab-btn {
                    padding: 12px 30px; border-radius: 50px; font-weight: bold; cursor: pointer; border: none;
                    transition: all 0.2s; font-size: 1rem; display: flex; align-items: center; gap: 10px;
                }
                .tab-btn:hover { transform: scale(1.05); }
             `}</style>

             {/* --- NAVBAR VETRO --- */}
             <nav className="nav-fixed">
                <div onClick={() => navigate('/')} style={{cursor:'pointer'}}><SiteLogo theme={theme} /></div>
                
                <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                    {user && (
                        <div style={{fontSize:'0.9rem', fontWeight:'600', opacity:0.8, marginRight:'10px'}}>
                            Ciao, {user.nome}
                        </div>
                    )}
                    <button onClick={() => navigate('/dashboard')} style={{
                        padding:'8px 20px', borderRadius:'30px', border:`1px solid ${colors.border}`, 
                        background:'transparent', color: colors.textMain, cursor:'pointer', fontWeight:'bold',
                        fontSize:'0.85rem'
                    }}>
                        Torna alla Dashboard
                    </button>
                </div>
             </nav>

             {/* --- CONTENUTO --- */}
             <div style={{maxWidth:'1100px', margin:'0 auto', padding:'120px 20px 60px 20px', position:'relative', zIndex:1}}>
                 
                 {/* TITOLO */}
                 <div style={{textAlign:'center', marginBottom:'50px'}}>
                    <h1 style={{fontSize:'3rem', fontWeight:'900', margin:'0 0 10px 0', letterSpacing:'-1.5px'}}>La tua Libreria</h1>
                    <p style={{color: colors.textSec, fontSize:'1.1rem'}}>
                        La tua collezione personale di letture.
                    </p>
                 </div>
                 
                 {/* TABS (CON CONTATORI) */}
                 <div style={{display:'flex', justifyContent:'center', gap:'15px', marginBottom:'50px'}}>
                     <button onClick={() => setActiveTab('saved')} 
                        className="tab-btn"
                        style={{
                            background: activeTab === 'saved' ? colors.textMain : 'transparent',
                            color: activeTab === 'saved' ? colors.bg : colors.textMain,
                            border: `2px solid ${activeTab === 'saved' ? colors.textMain : colors.border}`,
                            boxShadow: activeTab === 'saved' ? '0 5px 15px rgba(0,0,0,0.2)' : 'none'
                        }}
                     >
                        <span>🔖</span> Articoli Salvati <span style={{opacity:0.7, fontSize:'0.9em', marginLeft:'5px'}}>({saved.length})</span>
                     </button>
                     
                     <button onClick={() => setActiveTab('liked')} 
                        className="tab-btn"
                        style={{
                            background: activeTab === 'liked' ? '#ef4444' : 'transparent',
                            color: activeTab === 'liked' ? 'white' : colors.textMain,
                            border: `2px solid ${activeTab === 'liked' ? '#ef4444' : colors.border}`,
                            boxShadow: activeTab === 'liked' ? '0 5px 15px rgba(239, 68, 68, 0.3)' : 'none'
                        }}
                     >
                        <span>❤️</span> Mi Piace <span style={{opacity:0.7, fontSize:'0.9em', marginLeft:'5px'}}>({liked.length})</span>
                     </button>
                 </div>

                 {/* GRIGLIA ARTICOLI */}
                 {loading ? (
                     <div style={{textAlign:'center', padding:'50px', fontSize:'1.2rem', opacity:0.7}}>Caricamento libreria...</div>
                 ) : list.length > 0 ? (
                     <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:'30px'}}>
                         {list.map(item => (
                             <div key={item._id} onClick={() => navigate(`/news/${item.slug}`)} className="lib-card">
                                 {/* Immagine con Zoom */}
                                 <div className="card-img-wrap">
                                     <img src={item.coverImage} alt={item.title} className="card-img"/>
                                     <div style={{position:'absolute', top:15, left:15, background:'rgba(0,0,0,0.6)', color:'white', padding:'5px 12px', borderRadius:'6px', fontSize:'0.75rem', fontWeight:'bold', textTransform:'uppercase', backdropFilter:'blur(4px)'}}>
                                         {item.category}
                                     </div>
                                 </div>
                                 
                                 {/* Testo */}
                                 <div style={{padding:'25px'}}>
                                     <div style={{fontSize:'0.8rem', color: colors.textSec, marginBottom:'8px', fontWeight:'600'}}>
                                         {new Date(item.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                                     </div>
                                     <h3 style={{margin:'0 0 15px 0', fontSize:'1.25rem', lineHeight:'1.4', fontWeight:'800'}}>
                                         {item.title}
                                     </h3>
                                     <div style={{display:'flex', alignItems:'center', gap:'5px', fontSize:'0.9rem', fontWeight:'bold', color: colors.accent}}>
                                         Leggi articolo <span style={{fontSize:'1.2em'}}>→</span>
                                     </div>
                                 </div>
                             </div>
                         ))}
                     </div>
                 ) : (
                     /* EMPTY STATE (Se 0 articoli) */
                     <div style={{textAlign:'center', padding:'80px 20px', background: colors.cardBg, borderRadius:'24px', border:`2px dashed ${colors.border}`, maxWidth:'600px', margin:'0 auto'}}>
                         <div style={{fontSize:'4rem', marginBottom:'20px', opacity:0.5}}>
                             {activeTab === 'saved' ? '📂' : '💔'}
                         </div>
                         <h3 style={{fontSize:'1.8rem', marginBottom:'15px', fontWeight:'800'}}>
                             {activeTab === 'saved' ? 'La tua lista è vuota' : 'Nessun "Mi Piace"'}
                         </h3>
                         <p style={{color: colors.textSec, marginBottom:'30px', fontSize:'1.1rem', lineHeight:'1.6'}}>
                             {activeTab === 'saved' 
                                ? "Salva gli articoli che vuoi leggere con calma cliccando sull'icona segnalibro." 
                                : "Mostra apprezzamento per gli articoli che ti colpiscono cliccando sul cuore."}
                         </p>
                         <button onClick={() => navigate('/dashboard')} style={{padding:'15px 40px', background: colors.textMain, color: colors.bg, border:'none', borderRadius:'50px', fontWeight:'bold', cursor:'pointer', fontSize:'1rem'}}>
                             Esplora Notizie
                         </button>
                     </div>
                 )}
             </div>
        </div>
    );
}

export default UserLibrary;