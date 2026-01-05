import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import SiteLogo from './SiteLogo'; 
import Footer from './Footer'; 

function AuthorPage() {
    const { id } = useParams(); 
    const navigate = useNavigate();

    // --- STATI ---
    const [author, setAuthor] = useState(null);
    const [articles, setArticles] = useState([]);
    const [user, setUser] = useState(null); 
    const [loading, setLoading] = useState(true);
    const [scrolled, setScrolled] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailData, setEmailData] = useState({ subject: '', message: '' });
    const [sendingEmail, setSendingEmail] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6; 
    
    // Generiamo un ID casuale al caricamento per forzare il refresh delle immagini
    const [uniqueId, setUniqueId] = useState(Date.now());

    const [theme, setTheme] = useState(() => localStorage.getItem('site_theme') || 'light');
    const isDark = theme === 'dark';

    // 1. SCROLL
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // 2. TITLE
    useEffect(() => {
        if (author && author.nome) document.title = `${author.nome} ${author.cognome} | Autore`;
    }, [author]);

    // 3. FETCH DATI
    useEffect(() => {
        setAuthor(null);
        setLoading(true);
        setUniqueId(Date.now()); 

        const fetchData = async () => {
            // A. Utente Locale
            let currentUser = null;
            try {
                const storedUserString = localStorage.getItem('reader_user');
                if (storedUserString) {
                    currentUser = JSON.parse(storedUserString);
                    setUser(currentUser);
                    if (currentUser.theme) setTheme(currentUser.theme);
                }
            } catch(e){}

            // B. Autore dal DB
            let authorData = null;
            if (id && id !== 'guest') {
                try {
                    // Header no-cache per evitare che il browser usi il vecchio JSON
                    const res = await axios.get(`https://murthnews-api.onrender.com/api/reader/status/${id}?nocache=${Date.now()}`, {
                        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache', 'Expires': '0' }
                    });
                    authorData = res.data;
                    setAuthor(authorData); 

                    // Sync LocalStorage se sono io
                    if (currentUser && currentUser._id === authorData._id) {
                        const updatedLocal = { ...currentUser, ...authorData };
                        localStorage.setItem('reader_user', JSON.stringify(updatedLocal));
                        setUser(updatedLocal);
                    }
                } catch (err) { console.warn("Err fetch author", err); }
            }

            if (!authorData) {
                authorData = { _id: 'guest', nome: "Autore", cognome: "", role: "Author", profileImage: null };
                setAuthor(authorData);
            }

            // C. Follow
            if (currentUser && currentUser.following && currentUser.following.includes(authorData._id)) {
                setIsFollowing(true);
            }

            // D. Articoli
            try {
                const newsRes = await axios.get(`https://murthnews-api.onrender.com/api/news?_t=${Date.now()}`);
                const allNews = newsRes.data;
                const n = (authorData.nome || "").toLowerCase().trim();
                const c = (authorData.cognome || "").toLowerCase().trim();
                const u = (authorData.username || "").toLowerCase().trim();
                
                const matched = allNews.filter(art => {
                    if (art.authorId && art.authorId === authorData._id) return true;
                    if (art.author && typeof art.author === 'string') {
                        const clean = art.author.toLowerCase().replace(/\s+/g, ''); 
                        return clean.includes(n) || clean.includes(c) || clean.includes(u);
                    }
                    return false;
                });
                setArticles(matched);
            } catch (e) {}

            setLoading(false);
        };
        fetchData();
    }, [id]); 

    // --- LOGICA PULIZIA URL IMMAGINE ---
    // Invertita priorità: PRIMA profileImage, POI foto
    const getFreshImage = (src) => {
        if (!src) return null;
        if (src.startsWith('data:')) return src; 
        const sep = src.includes('?') ? '&' : '?';
        return `${src}${sep}refresh=${uniqueId}`;
    };

    // UTILS
    const calculateReadTime = (t) => t ? Math.ceil(t.trim().split(/\s+/).length / 200) : 1;
    const toggleTheme = () => {
        const newTheme = isDark ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('site_theme', newTheme);
    };
    const clean = (s) => s ? s.replace(/^"|"$/g, '').replace(/\\"/g, '"') : '';

    // HANDLERS
    const handleFollow = async () => {
        if (!user) return navigate('/login');
        if (author._id === 'guest') return alert("Profilo guest.");
        const wasFollowing = isFollowing;
        setIsFollowing(!wasFollowing);
        setAuthor(prev => ({...prev, followersCount: wasFollowing ? (prev.followersCount - 1) : (prev.followersCount + 1)}));
        try {
            await axios.put(`https://murthnews-api.onrender.com/api/reader/follow`, { userId: user._id, targetId: author._id });
            const updated = { ...user };
            if (!updated.following) updated.following = [];
            if (wasFollowing) updated.following = updated.following.filter(fid => fid !== author._id);
            else updated.following.push(author._id);
            setUser(updated);
            localStorage.setItem('reader_user', JSON.stringify(updated));
        } catch (e) { setIsFollowing(wasFollowing); }
    };

    const handleSendEmail = async (e) => {
        e.preventDefault();
        if (!user) return alert("Login necessario.");
        setSendingEmail(true);
        try {
            await axios.post('https://murthnews-api.onrender.com/api/contact/author', {
                senderName: `${user.nome} ${user.cognome}`,
                senderEmail: user.email,
                recipientEmail: author.email, 
                subject: emailData.subject,
                message: emailData.message
            });
            alert("Messaggio inviato!");
            setShowEmailModal(false);
            setEmailData({ subject: '', message: '' });
        } catch (e) { alert("Errore invio."); }
        setSendingEmail(false);
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentArticles = articles.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(articles.length / itemsPerPage);
    const changePage = (p) => { setCurrentPage(p); window.scrollTo({ top: 400, behavior: 'smooth' }); };

    const C = {
        bg: isDark ? '#0f172a' : '#ffffff',
        text: isDark ? '#f8fafc' : '#111827',
        meta: isDark ? '#94a3b8' : '#6b7280',
        border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        accent: isDark ? '#fff' : '#000',
        cardBg: isDark ? '#1e293b' : '#ffffff',
        modalBg: isDark ? '#1e293b' : '#ffffff',
        inputBg: isDark ? 'rgba(255,255,255,0.07)' : '#f3f4f6',
        heroGradient: isDark ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
        glassCard: isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.9)'
    };

    if (loading) return <div style={{height:'100vh', background:C.bg, color:C.text, display:'flex', alignItems:'center', justifyContent:'center'}}>Caricamento...</div>;
    if (!author) return null;

    // *** FIX FINALE: PRIORITA' A PROFILEIMAGE ***
    const authorImage = getFreshImage(author.profileImage || author.foto);

    return (
        <div style={{ backgroundColor: C.bg, minHeight: '100vh', color: C.text, fontFamily: "'Inter', sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;900&family=Inter:wght@300;400;600;700;900&display=swap');
                body { margin: 0; padding: 0; }
                .mobile-nav-btn { display: none; background: transparent; border: none; font-size: 1.5rem; cursor: pointer; padding: 0; z-index: 1001; }
                .desktop-nav { display: flex; }
                .mobile-menu-link { font-size: 1.2rem; font-weight: 700; padding: 15px 0; border-bottom: 1px solid rgba(0,0,0,0.1); cursor: pointer; color: inherit; display: block; }
                @media (max-width: 900px) { .desktop-nav { display: none !important; } .mobile-nav-btn { display: block !important; } .header-container { padding: 10px 15px; } }
                .login-btn { padding: 8px 24px; border-radius: 50px; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: 0.2s; background: transparent; color: ${C.text}; border: 1.5px solid ${C.text}; }
                .login-btn:hover { background: ${C.text}; color: ${C.bg}; transform: translateY(-2px); }
                .articles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 40px; }
                @media (max-width: 600px) { .articles-grid { grid-template-columns: 1fr; gap: 30px; } }
                .article-card { transition: 0.3s; border-radius: 12px; overflow: hidden; background: ${C.cardBg}; border: 1px solid ${C.border}; }
                .article-card:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                .pagination-btn { padding: 10px 20px; margin: 0 5px; border: none; border-radius: 50px; font-weight: bold; cursor: pointer; transition: 0.2s; background: ${C.border}; color: ${C.text}; }
                .pagination-btn:hover:not(:disabled) { background: ${C.text}; color: ${C.bg}; }
                .hero-card { background: ${C.glassCard}; backdrop-filter: blur(10px); border: 1px solid ${C.border}; border-radius: 24px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.05); max-width: 800px; margin: 0 auto; position: relative; animation: fadeIn 0.8s ease; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .stat-box { background: ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}; padding: 10px 20px; border-radius: 12px; min-width: 100px; border: 1px solid ${C.border}; }
                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; alignItems: center; justifyContent: center; zIndex: 2000; backdrop-filter: blur(8px); }
                .modal-content { background: ${C.modalBg}; padding: 30px; border-radius: 24px; width: 90%; max-width: 500px; border: 1px solid ${C.border}; }
                .minimal-input { width: 100%; padding: 15px 20px; margin-bottom: 15px; background: ${C.inputBg}; border: none; color: ${C.text}; border-radius: 14px; outline: none; }
                .close-btn { position: absolute; top: 20px; right: 20px; background: ${C.inputBg}; border: none; width: 35px; height: 35px; border-radius: 50%; display: flex; alignItems: center; justifyContent: center; cursor: pointer; color: ${C.text}; }
            `}</style>

            <header className="header-container" style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 1000, padding: '15px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: '0.3s', backgroundColor: scrolled ? (isDark ? '#0f172a' : '#ffffff') : 'transparent', borderBottom: scrolled ? `1px solid ${C.border}` : 'none', boxShadow: scrolled ? '0 4px 10px rgba(0,0,0,0.1)' : 'none' }}>
                <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                    <button className="mobile-nav-btn" onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ color: C.text }}>{isMenuOpen ? '✕' : '☰'}</button>
                    <div onClick={()=>navigate('/')} style={{cursor:'pointer'}}><SiteLogo theme={isDark ? 'dark' : 'light'} /></div>
                    <nav className="desktop-nav" style={{alignItems:'center', gap:'5px', marginLeft:'10px'}}>
                        <style>{` .nav-pill-item { padding: 8px 20px; border-radius: 50px; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: 0.2s; color: ${C.text}; opacity: 0.9; } .nav-pill-item:hover { background-color: ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)'}; opacity: 1; transform: translateY(-2px); } `}</style>
                        <span className="nav-pill-item font-ui" onClick={()=>navigate('/')}>Home</span>
                        <span className="nav-pill-item font-ui" onClick={()=>navigate('/categories')}>Categorie</span>
                        <span className="nav-pill-item font-ui" onClick={()=>navigate('/policy')}>Policy</span>
                    </nav>
                </div>
                <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                    <button onClick={toggleTheme} style={{background:'transparent', border:'none', fontSize:'1.2rem', cursor:'pointer', padding: 0, color: C.text}}>{isDark ? '☀️' : '🌙'}</button>
                    {user ? (
                        <div onClick={()=>navigate('/dashboard')} style={{display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', padding: '4px 12px 4px 4px', borderRadius: '50px', border: `1px solid ${C.border}`, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}}>
                            <div style={{width:'30px', height:'30px', borderRadius:'50%', overflow:'hidden', background: C.accent, color: 'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', fontSize:'0.8rem'}}>
                                {/* PRIORITA' A PROFILE IMAGE */}
                                {user.profileImage ? <img src={user.profileImage} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="Me"/> : user.nome.charAt(0)}
                            </div>
                            <div style={{display:'flex', flexDirection:'column', lineHeight:'1', paddingRight:'5px'}}>
                                <span style={{fontWeight:'700', fontSize:'0.8rem', color: C.text}}>{user.nome}</span>
                            </div>
                        </div>
                    ) : (
                        <button onClick={()=>navigate('/login')} style={{background: 'transparent', border: `1px solid ${C.text}`, borderRadius: '50px', padding: '8px 24px', color: C.text, fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase'}} onMouseEnter={(e) => { e.currentTarget.style.background = C.text; e.currentTarget.style.color = C.bg; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.text; }}>Entra</button>
                    )}
                </div>
            </header>

            {isMenuOpen && (
                <div className="mobile-menu-overlay font-ui" style={{position: 'fixed', top: '60px', left: 0, right: 0, bottom: 0, background: isDark ? '#0f172a' : '#ffffff', padding: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', animation: 'slideDown 0.3s ease'}}>
                    <div style={{flex: 1, overflowY: 'auto'}}>
                        <div className="mobile-menu-link" onClick={()=>{navigate('/'); setIsMenuOpen(false)}} style={{borderColor: C.border}}>Home</div>
                        <div className="mobile-menu-link" onClick={()=>{navigate('/categories'); setIsMenuOpen(false)}} style={{borderColor: C.border}}>Categorie</div>
                        <div className="mobile-menu-link" onClick={()=>{navigate('/policy'); setIsMenuOpen(false)}} style={{borderColor: C.border}}>Policy</div>
                        {user && <div className="mobile-menu-link" onClick={()=>{navigate('/dashboard'); setIsMenuOpen(false)}} style={{borderColor: C.border, color: C.accent}}>La mia Dashboard</div>}
                    </div>
                    <div className="mobile-menu-footer" style={{borderTop: `1px solid ${C.border}`, paddingTop: '20px', display:'flex', gap:'10px'}}>
                        <button onClick={toggleTheme} style={{background: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', border: 'none', padding: '10px', borderRadius: '8px', color: C.text, fontWeight: 'bold', cursor: 'pointer', flex: 1}}>{isDark ? '☀️' : '🌙'}</button>
                        {!user ? (<button onClick={()=>{navigate('/login'); setIsMenuOpen(false)}} style={{background: C.text, color: C.bg, border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', flex: 1}}>ENTRA</button>) : (<button onClick={()=>{navigate('/logout'); setIsMenuOpen(false)}} style={{background: '#ef4444', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', flex: 1}}>ESCI</button>)}
                    </div>
                </div>
            )}

            <div style={{ padding: '140px 20px 80px 20px', background: C.heroGradient, textAlign: 'center', position: 'relative' }}>
                <div className="hero-card">
                    <div style={{width: '140px', height: '140px', margin: '-90px auto 20px auto', borderRadius: '50%', overflow: 'hidden', border: `6px solid ${C.cardBg}`, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', background: C.border}}>
                        {authorImage ? ( 
                            <img 
                                key={uniqueId} // Forza re-render
                                src={authorImage} 
                                alt={author.nome} 
                                style={{width:'100%', height:'100%', objectFit:'cover'}} 
                                onError={(e) => { e.target.style.display = 'none'; if(e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }}
                            /> 
                        ) : null}
                        {/* FALLBACK: Appare se authorImage (profileImage || foto) è null */}
                        {(!authorImage) || <div style={{width:'100%', height:'100%', display: authorImage ? 'none' : 'flex', alignItems:'center', justifyContent:'center', fontSize:'3rem', fontWeight:'bold', color: C.text}}>{author.nome ? author.nome.charAt(0) : '?'}</div>}
                    </div>

                    <h1 style={{fontSize: '2.5rem', fontWeight: '900', margin: '0 0 5px 0', fontFamily: "Georgia, serif", letterSpacing: '-0.5px'}}>{author.nome} {author.cognome}</h1>
                    <div style={{display: 'inline-block', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold', color: C.bg, background: C.text, padding: '4px 12px', borderRadius: '50px', marginBottom: '20px'}}>{author.role === 'admin' ? 'Redazione' : (author.role || "Author")}</div>
                    {author.biography && <p style={{fontSize: '1.1rem', lineHeight: '1.7', color: C.text, maxWidth: '600px', margin: '0 auto 30px auto', opacity: 0.85}}>"{clean(author.biography)}"</p>}
                    
                    <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '35px'}}>
                        <div className="stat-box"><div style={{fontWeight:'900', fontSize:'1.5rem'}}>{articles.length}</div><div style={{fontSize:'0.75rem', color:C.meta, textTransform:'uppercase', fontWeight:'bold'}}>Articoli</div></div>
                        <div className="stat-box"><div style={{fontWeight:'900', fontSize:'1.5rem'}}>{author.followersCount || 0}</div><div style={{fontSize:'0.75rem', color:C.meta, textTransform:'uppercase', fontWeight:'bold'}}>Follower</div></div>
                    </div>
                    
                    <div style={{display: 'flex', justifyContent: 'center', gap: '15px'}}>
                        <button onClick={handleFollow} style={{ backgroundColor: isFollowing ? 'transparent' : C.text, color: isFollowing ? C.text : C.bg, border: `2px solid ${C.text}`, padding: '12px 35px', borderRadius: '50px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', boxShadow: isFollowing ? 'none' : '0 8px 20px rgba(0,0,0,0.15)', transform: isFollowing ? 'scale(0.98)' : 'scale(1)' }}>{isFollowing ? '✓ Seguito' : '+ Segui'}</button>
                        <button onClick={() => { if(!user) return navigate('/login'); setShowEmailModal(true); }} style={{ backgroundColor: 'transparent', color: C.text, border: `2px solid ${C.text}`, padding: '12px 30px', borderRadius: '50px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.2s' }} onMouseOver={(e) => { e.currentTarget.style.backgroundColor = C.text; e.currentTarget.style.color = C.bg; }} onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = C.text; }}>✉️ Contatta</button>
                    </div>
                </div>
            </div>

            <div style={{maxWidth: '1200px', margin: '0 auto', padding: '60px 20px'}}>
                <h3 style={{fontSize: '1.5rem', fontWeight: '900', marginBottom: '40px', borderLeft: `5px solid ${C.text}`, paddingLeft: '15px', color: C.text}}>Pubblicazioni recenti</h3>
                {currentArticles.length > 0 ? (
                    <>
                        <div className="articles-grid">
                            {currentArticles.map(article => (
                                <div key={article._id} className="article-card" onClick={() => navigate(`/news/${article.slug}`)} style={{cursor: 'pointer', display: 'flex', flexDirection: 'column'}}>
                                    <div style={{width: '100%', aspectRatio: '16/10', backgroundColor: C.border, overflow: 'hidden'}}>
                                        {article.coverImage && <img src={article.coverImage} alt={article.title} style={{width:'100%', height:'100%', objectFit:'cover', transition: 'transform 0.5s'}} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} />}
                                    </div>
                                    <div style={{padding: '20px', flex: 1, display: 'flex', flexDirection: 'column'}}>
                                        <div style={{fontSize: '0.8rem', fontWeight: '600', color: C.meta, marginBottom: '8px', display:'flex', justifyContent:'space-between'}}>
                                            <span>{new Date(article.createdAt).toLocaleDateString('it-IT')}</span>
                                            <span style={{textTransform:'uppercase', fontSize:'0.7rem', border:`1px solid ${C.border}`, padding:'2px 6px', borderRadius:'4px'}}>{clean(article.category)}</span>
                                        </div>
                                        <h2 style={{fontSize: '1.25rem', fontWeight: 'bold', lineHeight: '1.3', margin: '0 0 15px 0', color: C.text, fontFamily: "Georgia, serif", flex: 1}}>{clean(article.title)}</h2>
                                        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '15px', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: C.meta, fontWeight: '600' }}>
                                            <div style={{display:'flex', alignItems:'center', gap:'6px'}}><span>⏱</span> {calculateReadTime(article.content)} min</div>
                                            <div style={{display:'flex', alignItems:'center', gap:'6px'}}><span style={{color: '#ef4444'}}>❤️</span> {article.likes || 0}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {articles.length > itemsPerPage && (
                            <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '60px', gap: '20px'}}>
                                <button className="pagination-btn" onClick={() => changePage(currentPage - 1)} disabled={currentPage === 1}>← Indietro</button>
                                <span style={{fontWeight: 'bold', fontSize: '1.1rem'}}>Pagina {currentPage} di {totalPages}</span>
                                <button className="pagination-btn" onClick={() => changePage(currentPage + 1)} disabled={currentPage === totalPages}>Avanti →</button>
                            </div>
                        )}
                    </>
                ) : ( <div style={{textAlign:'center', padding:'50px', border:`1px dashed ${C.border}`, borderRadius:'12px', color:C.meta}}>Nessun articolo trovato.</div> )}
            </div>

            {showEmailModal && (
                <div className="modal-overlay" onClick={() => setShowEmailModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="close-btn" onClick={() => setShowEmailModal(false)}>×</button>
                        <div style={{marginBottom: '20px', textAlign: 'left'}}>
                            <h2 style={{margin: '0 0 5px 0', fontSize: '1.6rem', fontWeight: '800'}}>Scrivi un messaggio</h2>
                            <p style={{margin: 0, fontSize: '0.9rem', color: C.meta}}>A: <strong style={{color:C.text}}>{author.nome} {author.cognome}</strong> • Da: <strong style={{color:C.text}}>{user.nome}</strong></p>
                        </div>
                        <form onSubmit={handleSendEmail}>
                            <input type="text" className="minimal-input" placeholder="Oggetto" required value={emailData.subject} onChange={e => setEmailData({...emailData, subject: e.target.value})} autoFocus />
                            <textarea className="minimal-input" rows="6" placeholder="Scrivi qui..." required value={emailData.message} onChange={e => setEmailData({...emailData, message: e.target.value})} style={{resize: 'none'}}></textarea>
                            <button type="submit" disabled={sendingEmail} style={{width: '100%', padding: '16px', borderRadius: '14px', border: 'none', background: C.text, color: C.bg, fontWeight: 'bold', fontSize: '1rem', cursor: sendingEmail ? 'wait' : 'pointer', opacity: sendingEmail ? 0.7 : 1, marginTop: '5px'}}>{sendingEmail ? 'Invio...' : 'Invia Messaggio ✈️'}</button>
                        </form>
                    </div>
                </div>
            )}
            <Footer />
        </div>
    );
};

export default AuthorPage;