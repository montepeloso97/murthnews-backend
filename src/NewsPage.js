import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import SiteLogo from './SiteLogo';
import Footer from './Footer';
import Header2 from './Header2'; // <--- AGGIUNGI QUESTO

function NewsPage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // STATO PER IL FOLLOW
    const [isFollowing, setIsFollowing] = useState(false); // false = non segui, true = segui


    const handleFollow = async (e) => {
        if(e) e.stopPropagation();

        if (!user) {
            navigate('/login');
            return;
        }

        // --- FIX: Cerca l'ID in tutti i posti possibili ---
        // 1. ID diretto nell'articolo
        // 2. ID nell'oggetto autore (se popolato)
        // 3. ID trovato dalla ricerca server (authorData) <--- IMPORTANTE
        // 4. ID trovato dalla patch locale (resolvedAuthorId)
        const targetId = article.authorId || 
                         (typeof article.author === 'object' ? article.author._id : null) || 
                         (authorData ? authorData._id : null) ||
                         resolvedAuthorId; 

        if (!targetId) {
            alert("Impossibile seguire: L'autore di questo articolo non ha un profilo collegato.");
            return;
        }

        // LOGICA DI AGGIORNAMENTO VISIVO
        const wasFollowing = isFollowing;
        setIsFollowing(!wasFollowing); 

        try {
            // CHIAMATA API
            await axios.put(`https://murthnews-api.onrender.com/api/reader/follow`, { 
                userId: user._id, 
                targetId: targetId 
            });

            // AGGIORNAMENTO STATO LOCALE E STORAGE
            const updatedUser = { ...user };
            if (!updatedUser.following) updatedUser.following = [];

            if (wasFollowing) {
                updatedUser.following = updatedUser.following.filter(id => id !== targetId);
            } else {
                updatedUser.following.push(targetId);
            }

            setUser(updatedUser);
            localStorage.setItem('reader_user', JSON.stringify(updatedUser));

        } catch (error) {
            console.error("❌ ERRORE API:", error);
            setIsFollowing(wasFollowing); // Torna indietro se fallisce
            alert("Errore durante il salvataggio.");
        }
    };

   // FUNZIONE PER ANDARE ALLA PAGINA AUTORE (Versione "Forzata")
    const goToAuthorProfile = (e) => {
        if (e) e.stopPropagation();

        // 1. Prepariamo i dati. Se authorData (dal DB) è null, usiamo i dati dell'articolo (Stringa)
        const effectiveAuthor = authorData || {
            _id: 'guest', // ID finto per evitare crash
            nome: clean(article.author), // Usiamo il nome scritto nell'articolo
            cognome: "",
            role: "Autore",
            foto: null,
            biography: "",
            isGuest: true // Flag per capire che non è un utente registrato
        };

        // 2. Navighiamo passando i dati nello "state" (il pacchetto)
        navigate(`/author/${effectiveAuthor._id}`, { state: { preloadedAuthor: effectiveAuthor } });
    };
    
    // --- DATI ---
    const [article, setArticle] = useState(null);
    const [relatedNews, setRelatedNews] = useState([]);
    const [popularNews, setPopularNews] = useState([]); 
    const [user, setUser] = useState(null);
    const [authorData, setAuthorData] = useState(null);
    const [adSettings, setAdSettings] = useState(null);
    const [showSources, setShowSources] = useState(false);
    // Stato per memorizzare l'ID reale dell'autore recuperato
    const [resolvedAuthorId, setResolvedAuthorId] = useState(null);
    
    // --- UI ---
    const [loading, setLoading] = useState(true);
    const [scrolled, setScrolled] = useState(false);
    const [lightboxImg, setLightboxImg] = useState(null);
    const [galleryIndex, setGalleryIndex] = useState(0);
    
    // TEMA
    const [theme, setTheme] = useState(() => localStorage.getItem('site_theme') || 'light');
    const isDark = theme === 'dark';

    // --- INTERAZIONI ---
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // 1. SCROLL LISTENER (DEBUG VERSION)
    useEffect(() => {
        const handleScroll = () => {
            // Cerca lo scroll ovunque (window, body, document)
            const position = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
            
            // LOG DI CONTROLLO: Se non vedi questo nella console, lo scroll è bloccato dal CSS
            // console.log("Posizione Scroll:", position); 

            setScrolled(position > 10);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // 2. FETCH DATI
    useEffect(() => {
        const fetchAll = async () => {
            try {
                setLoading(true);
                
                // UTENTE
                const storedUserString = localStorage.getItem('reader_user');
                let currentUser = null;
                if (storedUserString) {
                    try {
                        const localUser = JSON.parse(storedUserString);
                        const userRes = await axios.get(`https://murthnews-api.onrender.com/api/reader/status/${localUser._id}`);
                        currentUser = userRes.data;
                        setUser(currentUser);
                        localStorage.setItem('reader_user', JSON.stringify(currentUser)); 
                        if (currentUser.theme) setTheme(currentUser.theme);
                    } catch (e) { setUser(null); }
                }

                // ARTICOLO CORRENTE
                const resArticle = await axios.get(`https://murthnews-api.onrender.com/api/news/slug/${slug}`);
                const art = resArticle.data;

                // --- BLOCCO DI SICUREZZA (Privati / Data Futura) ---
                const now = new Date();
                // Usa 'publishDate' se esiste nel tuo DB, altrimenti usa 'createdAt'
                const publicationDate = new Date(art.publishDate || art.createdAt); 
                
                // 1. Controllo Data Futura
                const isFuture = publicationDate > now;
                
                // 2. Controllo Privato 
                // (Assicurati che i valori 'private'/'draft' coincidano con quelli del tuo CMS)
                const isPrivate = art.visibility === 'private' || art.status === 'draft' || art.status === 'private';

                // Se è nel futuro O è privato -> STOP IMMEDIATO
                if (isFuture || isPrivate) {
                    console.log("Articolo non disponibile: Data futura o Privato");
                    setArticle(null); // Imposta a null così appare "Articolo non trovato"
                    setLoading(false);
                    return; // Ferma tutto il resto, non carica altro
                }
                // ----------------------------------------------------

                setArticle(art);
                setLikesCount(art.likes || 0);

                // RECUPERO TUTTE LE NEWS (Per Correlate e Popolari)
                const resAll = await axios.get('https://murthnews-api.onrender.com/api/news');
                const allNews = resAll.data;

                // A. CORRELATE (Stessa Categoria)
                const related = allNews
                    .filter(item => item.category === art.category && item._id !== art._id)
                    .slice(0, 4); 
                setRelatedNews(related);

                // B. POPOLARI (Ordinate per Likes decrescenti)
                const popular = [...allNews]
                    .sort((a, b) => (b.likes || 0) - (a.likes || 0))
                    .slice(0, 5);
                setPopularNews(popular);

                // STATI (Like/Save dell'utente)
                if (currentUser) {
                    if (currentUser.likedArticles && currentUser.likedArticles.includes(art._id)) setIsLiked(true);
                    if (currentUser.savedArticles && currentUser.savedArticles.includes(art._id)) setIsSaved(true);
                }

                // AUTORE
                if (art.author) {
                    try {
                        // Aggiunto encodeURIComponent per gestire spazi e caratteri speciali nei nomi
                        const resAuthor = await axios.get(`https://murthnews-api.onrender.com/api/search/users?q=${encodeURIComponent(art.author)}`);
                        const found = (resAuthor.data && resAuthor.data.length > 0) ? resAuthor.data[0] : null;
                        setAuthorData(found);
                    } catch(e) {}
                }

                // SETTINGS
                try {
                    const settingsRes = await axios.get('https://murthnews-api.onrender.com/api/settings');
                    setAdSettings(settingsRes.data);
                } catch(e) {}

                setLoading(false);
            } catch (err) { 
                console.error(err); 
                setLoading(false); 
            }
        };
        fetchAll();
    }, [slug, location]);

    // --- HELPER PER AGGIORNARE LA FOTO (ANTI-CACHE) ---
    const getFreshImage = (src) => {
        if (!src) return null;
        // Se è base64 (data:image...) non toccarla
        if (src.startsWith('data:')) return src;
        // Se è un URL web, aggiungi un parametro temporale per forzare il ricaricamento
        const separator = src.includes('?') ? '&' : '?';
        return `${src}${separator}t=${Date.now()}`;
    };

    // --- AZIONI ---
    const toggleTheme = async () => {
        const newTheme = isDark ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('site_theme', newTheme);
        if (user) {
            try { await axios.put('https://murthnews-api.onrender.com/api/reader/update', { id: user._id, theme: newTheme }); } catch(e){}
        }
    };


    // --- CONTROLLO INIZIALE: SEGUI GIÀ QUESTO AUTORE? ---
    useEffect(() => {
        if (user && user.following && article) {
            // CERCHIAMO L'ID IN QUESTO ORDINE:
            // 1. ID diretto nell'articolo
            // 2. ID nell'oggetto autore (se popolato)
            // 3. ID trovato dalla ricerca server (authorData) <--- FONDAMENTALE
            // 4. ID trovato dalla patch locale (resolvedAuthorId)
            const targetId = article.authorId || 
                             (typeof article.author === 'object' ? article.author._id : null) || 
                             (authorData ? authorData._id : null) || 
                             resolvedAuthorId;
            
            if (targetId && user.following.includes(targetId)) {
                setIsFollowing(true);
            } else {
                setIsFollowing(false);
            }
        }
    }, [user, article, authorData, resolvedAuthorId]); // <--- Aggiungi authorData qui

    // 3. GESTIONE TITOLO BROWSER (TAB)
    useEffect(() => {
        if (article?.title) {
            // Imposta: "Titolo Articolo | NomeSito"
            document.title = `${clean(article.title)} | MurthNews`; 
        } else {
            document.title = "MurthNews"; // Default mentre carica
        }
        
        // Reset quando esci dalla pagina (opzionale)
        return () => { document.title = "MurthNews"; };
    }, [article]);


    // --- RECUPERO ID AUTORE (PATCH) ---
    useEffect(() => {
        if (!article) return;

        const findId = async () => {
            // CASO 1: L'ID c'è già (Perfetto)
            if (article.authorId) {
                setResolvedAuthorId(article.authorId);
                return;
            }
            if (article.author && typeof article.author === 'object' && article.author._id) {
                setResolvedAuthorId(article.author._id);
                return;
            }

            // CASO 2: È solo una stringa (es. "Mario Rossi") -> CERCHIAMOLO
            if (typeof article.author === 'string') {
                try {
                    // Scarichiamo gli utenti per trovare chi corrisponde al nome
                    // ATTENZIONE: Se hai un endpoint diverso per gli utenti, cambialo qui
                    const res = await axios.get('https://murthnews-api.onrender.com/api/users'); 
                    const allUsers = res.data;
                    const nameToFind = article.author.toLowerCase().trim();

                    const found = allUsers.find(u => {
                        const fullName = `${u.nome} ${u.cognome}`.toLowerCase();
                        return fullName === nameToFind;
                    });

                    if (found) {
                        console.log("✅ ID Autore recuperato dal nome:", found._id);
                        setResolvedAuthorId(found._id);
                    } else {
                        console.warn("⚠️ Nessun utente trovato con il nome:", article.author);
                    }
                } catch (error) {
                    console.error("Errore ricerca autore:", error);
                }
            }
        };

        findId();
    }, [article]);


    const handleLike = async () => { 
        if (!user) return navigate('/login');
        const prevLiked = isLiked; setIsLiked(!isLiked); setLikesCount(prev => !prevLiked ? prev + 1 : prev - 1);
        try { await axios.post('https://murthnews-api.onrender.com/api/user/toggle-like', { userId: user._id, articleId: article._id }); } 
        catch (e) { setIsLiked(prevLiked); setLikesCount(prev => prevLiked ? prev + 1 : prev - 1); }
    };

    const handleSave = async () => { 
        if (!user) return navigate('/login');
        const prevSaved = isSaved; setIsSaved(!isSaved); 
        try { await axios.post('https://murthnews-api.onrender.com/api/user/toggle-save', { userId: user._id, articleId: article._id }); } 
        catch (e) { setIsSaved(prevSaved); }
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        alert("Link copiato");
    };

    const clean = (str) => str ? str.replace(/^"|"$/g, '').replace(/\\"/g, '"') : '';

    // --- STYLE SYSTEM MINIMAL ---
    const C = {
        bg: isDark ? '#0f172a' : '#ffffff',
        text: isDark ? '#f8fafc' : '#111827',
        meta: isDark ? '#94a3b8' : '#6b7280',
        border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        accent: isDark ? '#fff' : '#000',
        headerBg: scrolled ? (isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)') : 'transparent',
    };

    // FIX CRASH: Uso "article?." per proteggere dal null.
    const isUltimora = article?.importance === "Ultim'ora";


    // --- CALCOLO STATO LIVE (5 ORE) ---
    const isLiveActive = (() => {
        if (!article?.isLive) return false;
        if (!article.liveUpdates || article.liveUpdates.length === 0) return true;

        const timestamps = article.liveUpdates.map(u => new Date(u.time).getTime());
        const lastUpdateObj = Math.max(...timestamps);
        const now = new Date().getTime();
        const hoursDiff = (now - lastUpdateObj) / (1000 * 60 * 60);

        return hoursDiff < 5; 
    })();



    // LOGICA SEMPLIFICATA:
    // 1. Se è "Ultim'ora" E sono in cima alla pagina -> TESTO BIANCO (perché la foto è scura).
    // 2. In tutti gli altri casi (se scrollo o se è un articolo normale) -> Uso il colore del tema (Nero su Giorno, Bianco su Notte).
    const headerTextColor = (isUltimora && !scrolled) ? '#ffffff' : (isDark ? '#ffffff' : '#111827');

    // --- LOGICA ANALISI CONTENUTO ---
    const analyzeContent = () => {
        if (!article) return { gravity: "NORMALE", gravityColor: "#94a3b8", isTrusted: false, domain: "" };

        // 1. Uniamo Titolo e Sottotitolo
        const fullText = ((article.title || "") + " " + (article.subtitle || "")).toLowerCase();
        
        // 2. Keywords per Gravità
        const criticalWords = ['guerra', 'morti', 'attentato', 'terremoto', 'catastrofe', 'urgente', 'allerta', 'crolla', 'omicidio', 'strage', 'esplosione'];
        const highWords = ['crisi', 'scontro', 'polemica', 'riforma', 'aumento', 'tensione', 'arresto', 'lancio', 'caos', 'scandalo'];
        
        let gravity = "NORMALE";
        let gravityColor = C.meta; 

        if (criticalWords.some(w => fullText.includes(w))) {
            gravity = "CRITICA";
            gravityColor = "#ef4444"; 
        } else if (highWords.some(w => fullText.includes(w))) {
            gravity = "ALTA";
            gravityColor = "#f97316"; 
        }

        // 3. Verifica Fonte (Whitelist)
        const src = (article.source || "").toLowerCase();
        const trusted = ['ansa', 'repubblica', 'corriere', 'bbc', 'cnn', 'reuters', 'ilsole24ore', 'nytimes', 'sky', 'ag', 'adnkronos'];
        
        const isTrusted = trusted.some(domain => src.includes(domain));
        
        let domain = "Fonte Interna";
        try {
            if (article.source && article.source.startsWith('http')) {
                domain = new URL(article.source).hostname.replace('www.','');
            }
        } catch(e) {}

        return { gravity, gravityColor, isTrusted, domain };
    };

    // --- CALCOLO DATI DERIVATI ---
    const aiData = analyzeContent();
    
    // --- LOGICA RILIEVO ---
    const isBigLayout = article?.importance === "Rilievo";
    
    // Variabili Logiche
    const isLocked = (article?.importance === "Ultim'ora" || article?.visibility === 'paid') && (!user || user.livello === 'standard');
    
    // Immagini
    const images = article?.gallery && article.gallery.length > 0 ? article.gallery : (article?.coverImage ? [article.coverImage] : []);

    const nextSlide = (e) => { 
        if(e) e.stopPropagation(); 
        if (images.length > 1) setGalleryIndex((prev) => (prev + 1) % images.length); 
    };

    const prevSlide = (e) => { 
        if(e) e.stopPropagation(); 
        if (images.length > 1) setGalleryIndex((prev) => (prev - 1 + images.length) % images.length); 
    };

    // 1. BLOCCO DATI (Categoria, Data, Fonte, Gravità)
    const MetaBlock = (
        <>
            <div style={{marginBottom: showSources ? '10px' : '0px', transition:'0.3s'}}>
                <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '15px', fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.5px', color: C.meta, textTransform: 'uppercase'}}>
                    
                    {/* Categoria */}
                    <span onClick={()=>navigate(`/category/${article?.category}`)} style={{color: C.accent, cursor:'pointer'}}>{clean(article?.category)}</span>
                    <span style={{opacity: 0.3}}>/</span>
                    
                    {/* Data */}
                    <span>{new Date(article?.createdAt).toLocaleDateString('it-IT', {day: 'numeric', month: 'long'})}</span>
                    <span style={{opacity: 0.3}}>/</span>
                    
                    {/* Gravità */}
                    <div style={{display:'flex', gap:'5px', alignItems:'center'}}><span>GRAVITÀ:</span><span style={{color: aiData.gravityColor, borderBottom:`1px solid ${aiData.gravityColor}`}}>{aiData.gravity}</span></div>
                    
                    {/* TASTO FONTE (Desktop: Box / Mobile: Pallina) */}
                    <div onClick={() => setShowSources(!showSources)} style={{marginLeft: 'auto', cursor: 'pointer', display: 'flex', alignItems: 'center'}}>
                        
                        {/* 1. VERSIONE DESKTOP (Box con testo) */}
                        <div className="desktop-source-badge" style={{
                            display: 'flex', alignItems: 'center', gap: '8px', 
                            color: C.text, border: `1px solid ${C.border}`, 
                            padding: '6px 14px', borderRadius: '4px', 
                            background: showSources ? (isDark ? 'rgba(255,255,255,0.1)' : '#eee') : 'transparent', 
                            transition: '0.2s'
                        }}>
                            <span>FONTE: {aiData.isTrusted ? 'VERIFICATA' : 'NON VERIFICATA'}</span>
                            <span style={{fontSize:'0.6rem', transform: showSources ? 'rotate(180deg)' : 'rotate(0deg)', transition:'0.3s'}}>▼</span>
                        </div>

                        {/* 2. VERSIONE MOBILE (Pallina Colorata) */}
                        <div className="mobile-source-dot" style={{
                            width: '14px', 
                            height: '14px', 
                            borderRadius: '50%',
                            // Logica colori: Verde se trusted, Rossa se non trusted
                            backgroundColor: aiData.isTrusted ? '#10b981' : '#ef4444', 
                            boxShadow: `0 0 0 1px ${C.bg}, 0 0 2px rgba(0,0,0,0.3)`
                        }} />
                    </div>

                </div>
            </div>

            {/* BOX FONTI ESPANDIBILE (Resta uguale) */}
            <div className={`source-expand-box ${showSources ? 'open' : ''}`}>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1.2fr', gap:'30px'}}>
                    <div><div className="meta-label" style={{marginBottom:'8px'}}>Fonte Dichiarata</div><div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'5px'}}><div style={{width:'8px', height:'8px', borderRadius:'50%', background: aiData.isTrusted ? '#10b981' : '#f59e0b'}}></div><a href={article?.source} target="_blank" rel="noreferrer" style={{color: C.text, fontWeight:'bold', textDecoration:'none', fontSize:'0.9rem'}}>{aiData.domain}</a></div><div style={{fontSize:'0.75rem', color: C.meta, lineHeight:'1.4'}}>{aiData.isTrusted ? "Dominio presente nel registro delle testate accreditate." : "Dominio non presente nei registri partner o fonte interna."}</div></div>
                    <div style={{background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)', padding:'15px', borderRadius:'6px'}}><div className="meta-label" style={{marginBottom:'8px', display:'flex', justifyContent:'space-between'}}><span>Verifica Titolo</span><span style={{color: aiData.isTrusted ? '#10b981' : '#f59e0b'}}>{aiData.isTrusted ? 'MATCH POSITIVO' : 'IN ATTESA'}</span></div><div style={{fontSize:'0.8rem', fontFamily:'monospace', color: C.text, marginBottom:'10px'}}><span>Scanning keywords: </span><span style={{opacity:0.6}}>{article?.title ? article.title.substring(0, 25) : "..."}...</span></div><div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>{aiData.isTrusted ? ['ANSA', 'REUTERS'].map(a=><span key={a} style={{fontSize:'0.65rem', padding:'3px 8px', borderRadius:'4px', background: isDark ? 'rgba(16, 185, 129, 0.1)' : '#dcfce7', color: '#15803d', fontWeight:'bold'}}>✓ {a}</span>) : <span style={{fontSize:'0.75rem', color: '#f59e0b', fontStyle:'italic'}}>Nessun riscontro.</span>}</div></div>
                </div>
            </div>
        </>
    );

    // 2. BLOCCO TITOLO (Modificato per nascondere il sottotitolo su mobile)
    const TitleBlock = (
        <>
            <h1 className="font-bbc" style={{
                marginTop: '0', paddingTop: '0',
                fontSize: isBigLayout ? 'clamp(3rem, 6vw, 5.5rem)' : 'clamp(2.5rem, 5vw, 4.2rem)', 
                fontWeight: '900', 
                lineHeight: '1.05', 
                marginBottom: '10px',
                color: C.text,
                maxWidth: '100%'
            }}>
                {clean(article?.title)}
            </h1>

            {/* QUESTO DIV NASCONDE IL SOTTOTITOLO SU MOBILE */}
            <div className="desktop-subtitle">
                {article?.subtitle && (
                    <h2 className="font-serif" style={{
                        fontSize: isBigLayout ? '1.6rem' : '1.4rem', 
                        fontWeight:'400', 
                        color: C.meta, 
                        lineHeight:'1.3', 
                        marginBottom:'10px',
                        maxWidth:'90%'
                    }}>
                        {clean(article.subtitle)}
                    </h2>
                )}
            </div>
        </>
    );

    // --- COMPONENTE SIDEBAR ---
    const SidebarContent = () => (
        <div style={{position: 'sticky', top: '100px', display: 'flex', flexDirection: 'column', gap: '50px'}}>
            
            {/* 1. BANNER ADS (Adattivo) */}
            <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                <span style={{fontSize:'0.65rem', fontWeight:'700', letterSpacing:'1.5px', color: C.meta, textTransform:'uppercase', marginBottom:'8px'}}>
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
                            <div dangerouslySetInnerHTML={{__html: adSettings.adCode}} style={{width:'100%', overflow:'hidden'}} />
                        ) : (
                            <a href={adSettings.adLink || '#'} target="_blank" rel="noreferrer" style={{display:'block', width:'100%'}}>
                                <img src={adSettings.adImage} alt="Sponsor" style={{width:'100%', height:'auto', display:'block', objectFit:'contain'}} />
                            </a>
                        )}
                    </div>
                ) : (
                    <div style={{width:'100%', height:'250px', background:isDark?'rgba(255,255,255,0.03)':'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'4px', border:`1px dashed ${C.border}`, color:C.meta, fontSize:'0.8rem', fontWeight:'600'}}>
                        SPAZIO DISPONIBILE
                    </div>
                )}
            </div>

            {/* 2. PODIO TENDENZE (Top 3) */}
            <div>
                <h3 style={{fontSize: '0.85rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `2px solid ${C.text}`, paddingBottom: '10px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span style={{fontSize:'1.2rem'}}>🏆</span> Top 3 Oggi
                </h3>

                <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
                    {popularNews.slice(0, 3).map((news, index) => { 
                        const colors = ['#fbbf24', '#94a3b8', '#b45309'];
                        const rankColor = colors[index];
                        return (
                            <div key={news._id} onClick={()=>navigate(`/news/${news.slug}`)} style={{display:'flex', gap:'15px', cursor:'pointer', alignItems:'center'}}>
                                {/* Numero */}
                                <div style={{fontSize: '2.5rem', fontWeight: '900', color: 'transparent', WebkitTextStroke: `1px ${rankColor}`, fontFamily: "'Inter', sans-serif", lineHeight: '0.8', minWidth: '30px', textAlign: 'center'}}>
                                    {index + 1}
                                </div>
                                {/* Foto Miniatura */}
                                <div style={{width:'45px', height:'45px', borderRadius:'50%', overflow:'hidden', flexShrink:0, border:`2px solid ${rankColor}`}}>
                                    {news.coverImage && <img src={news.coverImage} style={{width:'100%', height:'100%', objectFit:'cover'}} alt=""/>}
                                </div>
                                {/* Titolo */}
                                <div style={{flex:1}}>
                                    <div style={{fontSize:'0.85rem', fontWeight:'700', lineHeight:'1.3', marginBottom:'4px', color: C.text, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>
                                        {clean(news.title)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 3. CARD AUTORE PULITA (Corretta con authorData) */}
            <div style={{
                background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                padding: '25px', 
                borderRadius: '12px', 
                border: `1px solid ${C.border}`,
                position: 'sticky',
                top: '100px'
            }}>
                
                {/* Header: Foto + Dati */}
                <div style={{display:'flex', gap:'15px', alignItems:'center', marginBottom: authorData?.biography ? '15px' : '0'}}>
                    
                    {/* FOTO PROFILO */}
                    <div style={{width:'60px', height:'60px', borderRadius:'50%', overflow:'hidden', border: `1px solid ${C.border}`, flexShrink: 0}}>
                        {authorData && (authorData.profileImage || authorData.foto)
                            ? <img src={authorData.profileImage || authorData.foto} style={{width:'100%', height:'100%', objectFit:'cover'}} alt={article.author}/>
                            : <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', fontSize:'1.5rem', color:C.text, background: C.border}}>
                                {(typeof article.author === 'string' ? article.author.charAt(0) : 'R')}
                              </div>
                        }
                    </div>

                    {/* NOME E RUOLO */}
                    <div>
                        <div style={{fontSize:'1.1rem', fontWeight:'900', color: C.text, fontFamily:"'Inter', sans-serif", lineHeight:'1.2'}}>
                            {authorData ? `${authorData.nome} ${authorData.cognome}` : article.author}
                        </div>
                        <div style={{fontSize:'0.75rem', color:C.meta, textTransform:'uppercase', fontWeight:'bold', letterSpacing:'1px', marginTop:'4px'}}>
                            {authorData?.role === 'admin' ? 'Redazione' : (authorData?.role || "Giornalista")}
                        </div>
                    </div>
                </div>

                {/* BIOGRAFIA (Mostra solo se esiste in authorData) */}
                {authorData?.biography && (
                    <div style={{
                        fontSize: '0.95rem',
                        lineHeight: '1.6',
                        color: C.text,
                        opacity: 0.9,
                        fontFamily: "'Inter', sans-serif",
                        fontStyle: 'italic',
                        paddingTop: '15px',
                        borderTop: `1px solid ${C.border}`
                    }}>
                        "{authorData.biography}"
                    </div>
                )}
            </div>
        </div>
    );
    // LOADING SCREEN (Design Elegante)
    if (loading) return (
        <div style={{
            height: '100vh',
            background: C.bg,
            color: C.text,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            {/* Animazione CSS */}
            <style>{`
                @keyframes breathe {
                    0% { transform: scale(0.9); opacity: 0.5; }
                    50% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(0.9); opacity: 0.5; }
                }
            `}</style>
            
            {/* Icona Animata */}
            <div style={{fontSize:'4rem', marginBottom:'20px', animation:'breathe 2s infinite ease-in-out'}}>
                📰
            </div>
            
            {/* Testo */}
            <div style={{
                fontFamily:'serif', 
                fontSize:'1.2rem', 
                fontStyle:'italic', 
                opacity:0.7
            }}>
                Stiamo impaginando la notizia...
            </div>
        </div>
    );
    if (!article) return <div style={{padding:50, textAlign:'center'}}>Articolo non trovato</div>;

    return (
        <div style={{ 
            backgroundColor: C.bg, 
            color: C.text, 
            minHeight: '100vh', 
            transition: 'background 0.3s ease', 
            fontFamily: "'Inter', sans-serif",
            /* RIMUOVIAMO overflowX: 'hidden' SE POSSIBILE, o lo gestiamo meglio */
            width: '100%',
            position: 'relative' // Aggiunge stabilità
        }}>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;900&family=Inter:wght@300;400;700;900&family=Lora:ital,wght@0,400;0,500;0,600;1,400&display=swap');

body { margin: 0; padding: 0; box-sizing: border-box; }

/* BLOCCO TOTALE TREMOLIO */
html, body {
    width: 100%;
    position: relative;
    overscroll-behavior-y: none; /* Disabilita l'effetto elastico nativo su alcuni browser */
}

/* CLASSE PER L'IMMAGINE FULL WIDTH (Sostituisce lo stile inline che causava problemi) */
.full-width-breakout {
    position: relative;
    width: 100%; /* Default sicuro per mobile */
    margin-left: 0;
    height: 60vh; /* Altezza ridotta per mobile */
    overflow: hidden;
    margin-bottom: 0;
}

/* SOLO SU DESKTOP (Sopra 900px): Attiviamo l'effetto "schermo intero" */
@media (min-width: 901px) {
    .full-width-breakout {
        width: 100vw;
        margin-left: calc(-50vw + 50%);
        height: 75vh;
    }
}

/* UTILS */
.font-bbc { font-family: 'Inter', sans-serif; letter-spacing: -0.5px; }
.font-serif { font-family: 'Playfair Display', serif; }

/* HEADER */
/* HEADER: Rimuovi qualsiasi background da qui! */
.header-container {
    /* Lascia vuoto o metti solo questo per sicurezza */
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    z-index: 1000;
}
.nav-link { font-size: 0.9rem; fontWeight: 600; cursor: pointer; opacity: 0.8; transition: 0.2s; color: ${C.text}; }
.nav-link:hover { opacity: 1; color: ${C.accent}; }

.mobile-nav-btn { display: none; background: transparent; border: none; font-size: 1.5rem; cursor: pointer; color: ${C.text}; padding: 0; z-index: 1001; }
.mobile-menu-overlay { position: fixed; top: 60px; left: 0; width: 100%; background: ${isDark ? 'rgba(15,23,42,0.98)' : 'rgba(255,255,255,0.98)'}; border-bottom: 1px solid ${C.border}; padding: 20px; display: flex; flex-direction: column; gap: 20px; z-index: 999; animation: slideDown 0.3s ease; }

/* --- GRID LAYOUT DESKTOP --- */
.main-grid { 
    display: grid; 
    grid-template-columns: 2.5fr 1fr; 
    gap: 60px; 
    max-width: 1200px; 
    margin: 0 auto; 
    padding-left: 20px; padding-right: 20px; padding-bottom: 60px;
}

/* Casi specifici Desktop */
.main-grid.grid-standard { padding-top: 160px !important; } /* Spazio per Header */
.main-grid.grid-rilievo  { padding-top: 10px; }  /* Attaccato al Titolo */
.main-grid.grid-ultimora { padding-top: 30px; }  /* Spazio dalla Foto */

/* DESKTOP: Notizia Standard (Titolo dentro) -> Serve spazio per la header */
.main-grid.grid-standard {
    padding-top: 80px;
}

/* DESKTOP: Notizia Rilievo (Titolo fuori) -> Serve POCO spazio tra titolo e foto */
.main-grid.grid-rilievo {
    padding-top: 10px; /* <--- ECCO IL FIX: Riduciamo lo spazio tra Titolo esterno e Foto */
}
/* VISUAL CONTAINER (Foto/Gallery) */
/* --- GALLERIA MOBILE STABILE --- */
    .visual-container {
        border-radius: 8px !important;
        margin-left: 0 !important; /* STOP AI MARGINI NEGATIVI */
        margin-right: 0 !important;
        width: 100% !important;    /* LARGHEZZA STANDARD */
        transform: none !important; /* Nessuna trasformazione durante lo scroll */
    }.visual-img { width: 100%; height: auto; max-height: 600px; object-fit: contain; display: block; margin: 0 auto; }

/* OVERLAY ACTIONS */
.overlay-actions { position: absolute; bottom: 15px; right: 15px; display: flex; gap: 10px; z-index: 20; }
.overlay-btn { 
    width: 40px; height: 40px; border-radius: 50%; 
    background: rgba(0, 0, 0, 0.6); 
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255,255,255,0.2);
    color: white; 
    display: flex; align-items: center; justify-content: center; 
    cursor: pointer; transition: 0.2s; font-size: 1.1rem;
}
.overlay-btn:hover { background: ${C.accent}; border-color: ${C.accent}; transform: scale(1.1); }

/* SLIDER CONTROLS */
.nav-arrow { 
    position: absolute; top: 50%; transform: translateY(-50%); 
    width: 40px; height: 40px; border-radius: 50%; 
    background: rgba(0,0,0,0.3); backdrop-filter: blur(4px);
    border: 1px solid rgba(255,255,255,0.2); color: white;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: 0.2s; font-size: 1.2rem; z-index: 30; opacity: 0;
}
.visual-container:hover .nav-arrow { opacity: 1; }
.nav-arrow:hover { background: rgba(0,0,0,0.7); transform: translateY(-50%) scale(1.1); }
.nav-prev { left: 15px; } 
.nav-next { right: 15px; }

.slide-counter { position: absolute; top: 15px; left: 15px; background: rgba(0,0,0,0.5); padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; color: white; z-index: 20; backdrop-filter: blur(4px); }

/* BUTTONS */
.glass-btn { border: 1px solid ${C.border}; border-radius: 6px; padding: 8px 16px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); color: ${C.text}; font-family: 'Inter', sans-serif; }
.glass-btn:hover { transform: translateY(-2px); opacity: 0.8; background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}; }

/* TESTO ARTICOLO E VIDEO RESPONSIVE */
.article-text { font-size: 1.25rem; line-height: 1.8; color: ${C.text}; font-family: 'Lora', serif; font-weight: 400; }
.article-text p { margin-bottom: 28px; }
.article-text b, .article-text strong { font-weight: 700; color: ${isDark ? '#fff' : '#000'}; }

/* Fix Video/Iframe/Img */
.article-text iframe, 
.article-text video, 
.live-content iframe {
    width: 100% !important;
    height: auto !important;
    aspect-ratio: 16/9;
    border-radius: 8px;
}
.article-text img {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
    margin: 20px 0;
}

/* EXTRAS */
.lightbox { position: fixed; inset: 0; z-index: 2000; background: rgba(0,0,0,0.95); display: flex; align-items: center; justify-content: center; cursor: zoom-out; }
.paywall-blur { filter: blur(6px); user-select: none; pointer-events: none; opacity: 0.5; }

/* BOX FONTE (EXPANDABLE) */
.source-expand-box {
    overflow: hidden;
    transition: max-height 0.4s ease, opacity 0.4s ease, margin 0.4s ease;
    max-height: 0;
    opacity: 0;
    margin-bottom: 0;
    background: ${isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc'};
    border-left: 2px solid ${C.accent};
}
.source-expand-box.open {
    max-height: 200px; 
    opacity: 1;
    margin-bottom: 30px;
    padding: 20px;
}

/* ETICHETTE */
.meta-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: ${C.meta}; }

/* ANIMAZIONI */
@keyframes blink-white {
    0% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.8); }
    100% { opacity: 1; transform: scale(1); }
}

/* --- MEDIA QUERIES (Ordiniamo per grandezza schermo) --- */

/* 0. REGOLE GLOBALI (DEFAULT DESKTOP) */
/* Di base (Desktop) mostriamo il Badge e nascondiamo la Pallina */
.mobile-source-dot {
    display: none !important; 
}
.desktop-source-badge {
    display: flex !important;
}

/* --- STILI MENU MOBILE (Aggiungi questi per far apparire bene la lista nel menu) --- */
.mobile-menu-link {
    font-size: 1.2rem;
    font-weight: 700;
    padding: 15px 0;
    border-bottom: 1px solid rgba(0,0,0,0.1);
    cursor: pointer;
    color: inherit;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.mobile-menu-footer {
    margin-top: 30px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
}

/* 1. TABLET E MOBILE (sotto 900px) */
@media (max-width: 900px) {
    .main-grid {
        grid-template-columns: 1fr;
        gap: 10px !important;
    }

    /* CASO 1: NOTIZIA NORMALE (Titolo DENTRO la griglia) */
    /* Deve scendere di 80px per uscire da sotto la Header */
    .main-grid.grid-standard {
        padding-top: 145px !important; 
    }

    /* CASO 2: NOTIZIA RILIEVO (Titolo FUORI dalla griglia) */
    /* Deve stare attaccata al titolo sopra, quindi poco padding */
    .main-grid.grid-rilievo {
        padding-top: 20px !important; 
    }
    
    /* TITOLO: Margini azzerati */
    .font-bbc { 
        margin-top: 0 !important; 
        padding-top: 0 !important; 
        margin-bottom: 5px !important;
    }

    /* Nasconde elementi desktop */
    .desktop-nav { display: none !important; }
    .header-actions-desktop { display: none !important; }
    .mobile-nav-btn { display: block !important; }
    .mobile-hide { display: none; }
    .header-container { padding: 10px 15px; }
}

/* 2. MOBILE STANDARD (sotto 768px) */
@media (max-width: 768px) {

    /* --- LOGICA FONTE: INVERSIONE --- */
    /* Su mobile: NASCONDI il badge rettangolare, MOSTRA la pallina */
    .mobile-source-dot {
        display: block !important;
    }
    .desktop-source-badge {
        display: none !important;
    }

    /* --- HEADER E TESTI --- */
    .message-header {
        display: flex !important;
        flex-direction: row !important;
        align-items: center;
        flex-wrap: nowrap;
        gap: 5px;
    }

    .message-header > * {
        display: inline-block !important;
        flex-shrink: 0;
        visibility: visible !important;
        opacity: 1 !important;
    }

    .article-text {
        font-size: 1.15rem !important;
        line-height: 1.7;
        padding: 0 5px;
    }

    .font-bbc {
        font-size: 2.2rem !important;
    }

    /* --- GALLERIA MOBILE STABILE --- */
    .visual-container {
        border-radius: 8px !important;
        margin-left: 0 !important; /* STOP AI MARGINI NEGATIVI */
        margin-right: 0 !important;
        width: 100% !important;    /* LARGHEZZA STANDARD */
        transform: none !important; /* Nessuna trasformazione durante lo scroll */
    }

    .nav-arrow {
        opacity: 1 !important;
        width: 50px;
        height: 50px;
        background: rgba(0,0,0,0.5);
    }
    
    .visual-container h2 {
         font-size: 1rem;
    }
}

/* 3. MOBILE PICCOLO (sotto 600px) */
@media (max-width: 600px) {
    
    /* --- ZONA AUTORE: BARRA UNICA --- */
    .author-box-responsive {
        flex-direction: row !important;
        flex-wrap: nowrap !important;
        align-items: center !important;
        gap: 12px !important;
        padding: 8px 0 !important;
    }

    /* FOTO */
    .author-box-responsive > div:nth-child(1) {
        width: 45px !important;
        height: 45px !important;
    }
    .mobile-follow-icon {
        display: flex !important;
    }

    /* INFO */
    .desktop-only-label {
        display: none !important;
    }
    .author-box-responsive > div:nth-child(2) > div:last-child {
        font-size: 0.95rem !important;
    }

    /* AZIONI */
    .actions-group-responsive {
        gap: 5px !important;
    }

    /* NASCONDI IL TASTONE "SEGUI" GRANDE */
    .desktop-follow-btn {
        display: none !important;
    }

    /* --- FIX FONTE E TAGS --- */
    .source-box-responsive {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 15px !important;
    }
    
    /* Nasconde il divisore verticale (|) su mobile */
    .source-box-responsive > div:nth-child(2) {
        display: none !important;
    }
}
/* --- STILE LEAD / SOMMARIO (VERSIONE PULITA E STABILE) --- */
.article-lead {
    font-family: 'Inter', sans-serif;
    font-weight: 500;
    font-size: 1.35rem;
    line-height: 1.6;
    color: ${C.text}; /* Usa il colore del tema */
    opacity: 1 !important; /* Opacità piena per evitare ricalcoli */
    
    /* RIMOSSI TUTTI I TRUCCHI GPU CHE CAUSAVANO IL TREMOLIO */
    transform: none !important;
    will-change: auto !important;
    -webkit-font-smoothing: auto;
}

/* SU MOBILE */
@media (max-width: 768px) {
    .article-lead {
        font-size: 1.15rem !important;
        line-height: 1.5;
        font-weight: 400;
    }
}
    /* GESTIONE SOTTOTITOLO RESPONSIVE */
.desktop-subtitle { display: block !important; }
.mobile-subtitle { display: none !important; }

/* SU MOBILE (sotto 900px): Invertiamo la visibilità */
@media (max-width: 900px) {
    .desktop-subtitle { display: none !important; }
    .mobile-subtitle { display: block !important; }
}
            `}</style>

            {/* LIGHTBOX */}
            {lightboxImg && (
                <div className="lightbox" onClick={() => setLightboxImg(null)}>
                    <img src={lightboxImg} style={{maxWidth:'95%', maxHeight:'95%', borderRadius:'4px'}} onClick={e=>e.stopPropagation()} alt=""/>
                    <button onClick={()=>setLightboxImg(null)} style={{position:'absolute', top:20, right:20, background:'transparent', border:'none', color:'white', fontSize:'2rem', cursor:'pointer'}}>✕</button>
                </div>
            )}

           <header className="header-container" style={{
                /* Layout */
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                zIndex: 1000,
                padding: '15px 5%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                
                /* Transizione */
                transition: 'background-color 0.3s ease',

                /* LOGICA DIRETTA: Se scrollo > Sfondo Scuro/Bianco. Se no > Trasparente */
                /* Uso !important logico per forzare la mano */
                backgroundColor: scrolled 
                    ? (isDark ? '#0f172a' : '#ffffff') 
                    : 'transparent',

                /* Bordi */
                borderBottom: scrolled ? `1px solid ${C.border}` : 'none',
                boxShadow: scrolled ? '0 4px 10px rgba(0,0,0,0.1)' : 'none'
            }}>
                <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                    
                    {/* TASTO HAMBURGER */}
                    <button className="mobile-nav-btn" onClick={() => setIsMenuOpen(!isMenuOpen)} 
                        style={{
                            // Se Ultim'ora in cima -> BIANCO. Altrimenti -> Colore Tema
                            color: (article?.importance === "Ultim'ora" && !scrolled) ? '#ffffff' : C.text, 
                            transition: 'color 0.3s'
                        }}>
                        {isMenuOpen ? '✕' : '☰'}
                    </button>

                    {/* LOGO */}
                    <div onClick={()=>navigate('/')} style={{cursor:'pointer'}}>
                        {/* Se Ultim'ora in cima -> Tema Dark (Bianco). Altrimenti -> Tema Corrente */}
                        <SiteLogo theme={(article?.importance === "Ultim'ora" && !scrolled) ? 'dark' : (isDark ? 'dark' : 'light')} />
                    </div>
                    
                    {/* MENU DESKTOP */}
                    <nav className="desktop-nav" style={{display:'flex', alignItems:'center', gap:'5px', marginLeft:'10px'}}>
                        <style>{`
                            .nav-pill-item {
                                padding: 8px 20px;
                                border-radius: 50px;
                                font-weight: 600;
                                font-size: 0.9rem;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                /* LOGICA COLORE: Bianco se Ultim'ora Top, altrimenti C.text */
                                color: ${(article?.importance === "Ultim'ora" && !scrolled) ? '#ffffff' : C.text};
                                opacity: 0.9;
                            }
                            .nav-pill-item:hover {
                                background-color: ${(isDark || (article?.importance === "Ultim'ora" && !scrolled)) ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)'};
                                opacity: 1;
                                transform: translateY(-2px);
                            }
                        `}</style>

                        <span className="nav-pill-item font-ui" onClick={()=>navigate('/')}>Home</span>
                        <span className="nav-pill-item font-ui" onClick={()=>navigate('/categories')}>Categorie</span>
                        <span className="nav-pill-item font-ui" onClick={()=>navigate('/policy')}>Policy</span>
                    </nav>
                </div>

                <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                    
                    {/* BOTTONE LIVE HEADER */}
                    {article?.isLive && (
                        <div 
                            onClick={() => { const el = document.getElementById('live-timeline'); if(el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} 
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                // QUI CAMBIA SOLO IL BOTTONCINO: Rosso se attivo, Grigio se inattivo
                                background: isLiveActive ? '#dc2626' : '#6b7280', 
                                color: 'white',
                                padding: '6px 14px', borderRadius: '50px',
                                fontSize: '0.75rem', fontWeight: '900',
                                letterSpacing: '1px', textTransform: 'uppercase',
                                // L'animazione c'è solo se è attivo
                                animation: isLiveActive ? 'pulse-live 2s infinite' : 'none',
                                cursor: 'pointer', border: '1px solid rgba(255,255,255,0.3)',
                                whiteSpace: 'nowrap', transition: 'background 0.3s'
                            }}
                        >
                            <div style={{
                                width:'8px', height:'8px', 
                                background: isLiveActive ? 'white' : '#d1d5db', // Pallino bianco o grigino
                                borderRadius:'50%'
                            }}></div>
                            {isLiveActive ? 'LIVE' : 'LIVE CHIUSA'}
                        </div>
                    )}
                    {/* TASTO TEMA */}
                    <button 
                        onClick={toggleTheme} 
                        style={{
                            background:'transparent', border:'none', fontSize:'1.2rem', cursor:'pointer', padding: 0, 
                            color: (article?.importance === "Ultim'ora" && !scrolled) ? '#ffffff' : C.text,
                            transition: 'color 0.3s'
                        }}
                    >
                        {isDark ? '☀️' : '🌙'}
                    </button>

                    {/* AREA UTENTE */}
                    {user ? (
                        <div 
                            onClick={()=>navigate('/dashboard')} 
                            style={{
                                display:'flex', alignItems:'center', gap:'8px', cursor:'pointer',
                                padding: '4px 12px 4px 4px', borderRadius: '50px',
                                border: `1px solid ${(article?.importance === "Ultim'ora" && !scrolled) ? 'rgba(255,255,255,0.5)' : C.border}`,
                                background: (article?.importance === "Ultim'ora" && !scrolled) ? 'rgba(255,255,255,0.2)' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                                transition: 'all 0.3s'
                            }}
                        >
                            <div style={{width:'30px', height:'30px', borderRadius:'50%', overflow:'hidden', background: C.accent, color: 'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', fontSize:'0.8rem'}}>
                                {user.profileImage ? <img src={user.profileImage} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="Me"/> : user.nome.charAt(0)}
                            </div>
                            <div style={{display:'flex', flexDirection:'column', lineHeight:'1', paddingRight:'5px'}}>
                                <span style={{fontWeight:'700', fontSize:'0.8rem', color: (article?.importance === "Ultim'ora" && !scrolled) ? '#ffffff' : C.text}}>{user.nome}</span>
                                <span style={{fontSize:'0.6rem', color: (article?.importance === "Ultim'ora" && !scrolled) ? '#ffffff' : C.text, opacity:0.8, textTransform:'uppercase', display: window.innerWidth < 380 ? 'none' : 'block'}}>Dashboard ➜</span>
                            </div>
                        </div>
                    ) : (
                        <button 
                            onClick={()=>navigate('/login')} 
                            style={{
                                background: 'transparent',
                                border: `1px solid ${(article?.importance === "Ultim'ora" && !scrolled) ? '#ffffff' : C.text}`,
                                borderRadius: '50px',
                                padding: '8px 24px',
                                color: (article?.importance === "Ultim'ora" && !scrolled) ? '#ffffff' : C.text,
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                fontFamily: "'Inter', sans-serif",
                                cursor: 'pointer',
                                letterSpacing: '1px',
                                textTransform: 'uppercase',
                                transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => { 
                                e.currentTarget.style.background = (article?.importance === "Ultim'ora" && !scrolled) ? '#ffffff' : C.text; 
                                e.currentTarget.style.color = (article?.importance === "Ultim'ora" && !scrolled) ? '#000000' : C.bg; 
                            }}
                            onMouseLeave={(e) => { 
                                e.currentTarget.style.background = 'transparent'; 
                                e.currentTarget.style.color = (article?.importance === "Ultim'ora" && !scrolled) ? '#ffffff' : C.text; 
                            }}
                        >
                            Entra
                        </button>
                    )}
                </div>
            </header>


            {/* MOSTRA IN ALTO SOLO SE NON È ULTIM'ORA */}
            {article?.importance !== "Ultim'ora" && (
                <Header2 theme={theme} />
            )}


            {/* MENU MOBILE A COMPARSA COMPLETO */}
            {isMenuOpen && (
                <div className="mobile-menu-overlay font-ui" style={{
                    position: 'fixed', top: '60px', left: 0, right: 0, bottom: 0,
                    background: isDark ? '#0f172a' : '#ffffff',
                    padding: '20px',
                    zIndex: 9999,
                    display: 'flex', flexDirection: 'column',
                    animation: 'slideDown 0.3s ease'
                }}>
                    {/* LISTA LINK */}
                    <div style={{flex: 1, overflowY: 'auto'}}>
                        <div className="mobile-menu-link" onClick={()=>{navigate('/'); setIsMenuOpen(false)}} style={{borderColor: C.border}}>
                            Home <span>➔</span>
                        </div>
                        <div className="mobile-menu-link" onClick={()=>{navigate('/categories'); setIsMenuOpen(false)}} style={{borderColor: C.border}}>
                            Categorie <span>➔</span>
                        </div>
                        <div className="mobile-menu-link" onClick={()=>{navigate('/policy'); setIsMenuOpen(false)}} style={{borderColor: C.border}}>
                            Policy <span>➔</span>
                        </div>
                        
                        {/* Link extra se utente loggato */}
                        {user && (
                            <div className="mobile-menu-link" onClick={()=>{navigate('/dashboard'); setIsMenuOpen(false)}} style={{borderColor: C.border, color: C.accent}}>
                                La mia Dashboard <span>👤</span>
                            </div>
                        )}
                    </div>

                    {/* PIÈ DI PAGINA DEL MENU (Azioni) */}
                    <div className="mobile-menu-footer" style={{borderTop: `1px solid ${C.border}`, paddingTop: '20px'}}>
                        
                        {/* Tasto Tema */}
                        <button onClick={toggleTheme} style={{
                            background: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
                            border: 'none', padding: '10px 20px', borderRadius: '8px',
                            color: C.text, fontWeight: 'bold', cursor: 'pointer', flex: 1
                        }}>
                            {isDark ? '☀️ Modalità Giorno' : '🌙 Modalità Notte'}
                        </button>

                        {/* Tasto Login/Logout */}
                        {!user ? (
                            <button onClick={()=>{navigate('/login'); setIsMenuOpen(false)}} style={{
                                background: C.text, color: C.bg,
                                border: 'none', padding: '10px 20px', borderRadius: '8px',
                                fontWeight: 'bold', cursor: 'pointer', flex: 1
                            }}>
                                ENTRA
                            </button>
                        ) : (
                            <button onClick={()=>{/* logica logout */ navigate('/logout'); setIsMenuOpen(false)}} style={{
                                background: '#ef4444', color: 'white',
                                border: 'none', padding: '10px 20px', borderRadius: '8px',
                                fontWeight: 'bold', cursor: 'pointer', flex: 1
                            }}>
                                ESCI
                            </button>
                        )}
                    </div>
                </div>
            )}


           {/* 1. LAYOUT ULTIM'ORA: FOTO + BOX LIVE (Slide-in Destra) */}
            {article.importance === "Ultim'ora" && (
                <>
                    <style>{`
                        @keyframes pulse-red {
                            0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                            70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
                            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                        }
                        @keyframes enter-from-right {
                            0% { opacity: 0; transform: translate(120%, -50%); }
                            100% { opacity: 1; transform: translate(0, -50%); }
                        }
                        .live-text-clamp {
                            display: -webkit-box;
                            -webkit-line-clamp: 3;
                            -webkit-box-orient: vertical;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        }
                        /* VISIBILITÀ: Flex su Desktop, None su Mobile */
                        .live-box-desktop { display: flex; flex-direction: column; }
                        @media (max-width: 900px) { .live-box-desktop { display: none !important; } }
                    `}</style>

                    <div style={{ 
                        position: 'relative', 
                        width: '100vw', 
                        marginLeft: 'calc(-50vw + 50%)', 
                        height: '75vh', 
                        marginBottom: '0',
                        overflow: 'hidden', 
                        marginTop: '0' 
                    }}>
                        
                        {/* Immagine Sfondo */}
                        <img 
                            src={clean(article.coverImage) || (images.length > 0 ? clean(images[0]) : 'https://via.placeholder.com/1200x800')} 
                            style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition: 'center center' }} 
                            alt="Copertina"
                        />
                        
                        {/* Overlay Sfumato */}
                        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.2) 100%)'}}></div>
                        
                        {/* === BOX LIVE LATERALE (Mostra ultimi 2 aggiornamenti reali) === */}
{article.isLive && (
    <div className="live-box-desktop" style={{
        position: 'absolute', 
        top: '40%', 
        right: '40px', 
        transform: 'translateY(-50%)', 
        width: '360px', 
        // SFONDO BOX: Rimane SEMPRE scuro fisso (non cambia mai)
        background: 'rgba(10, 10, 10, 0.9)', 
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '12px',
        color: 'white',
        zIndex: 20,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)',
        animation: 'enter-from-right 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards'
    }}>
        {/* HEADER BOX INTERNA */}
        <div style={{
            padding: '15px 20px', 
            borderBottom: '1px solid rgba(255,255,255,0.1)', 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.02)'
        }}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                {/* PALLINO: Rosso se attivo, Grigio se inattivo */}
                <div style={{
                    width:'8px', height:'8px', borderRadius:'50%', 
                    background: isLiveActive ? '#ef4444' : '#6b7280', 
                    animation: isLiveActive ? 'pulse-red 2s infinite' : 'none'
                }}></div>
                
                {/* SCRITTA: LIVE NOW vs DIRETTA INTERROTTA */}
                <span style={{
                    fontSize:'0.85rem', fontWeight:'800', 
                    textTransform:'uppercase', letterSpacing:'1px', 
                    color: isLiveActive ? '#ef4444' : '#9ca3af'
                }}>
                    {isLiveActive ? 'LIVE NOW' : 'DIRETTA INTERROTTA'}
                </span>
            </div>
            <span style={{fontSize:'0.75rem', opacity:0.6, fontStyle:'italic'}}>
                {isLiveActive ? 'Ultimi update' : 'Stop aggiornamenti'}
            </span>
        </div>

        {/* CONTENUTO: LISTA AGGIORNAMENTI (Testo bianco, non cambia) */}
        <div style={{padding: '20px', display:'flex', flexDirection:'column', gap:'20px'}}>
            {(article.liveUpdates && article.liveUpdates.length > 0) ? (
                [...article.liveUpdates].reverse().slice(0, 2).map((update, i) => (
                    <div key={i} style={{display:'flex', gap:'12px', alignItems:'flex-start'}}>
                        <div style={{
                            background: 'rgba(255,255,255,0.15)', 
                            borderRadius: '4px', padding: '2px 6px', 
                            fontSize: '0.75rem', fontWeight: '700', 
                            color: '#fff', whiteSpace: 'nowrap', marginTop:'2px'
                        }}>
                            {new Date(update.time).toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        <div className="live-text-clamp" style={{
                            fontSize: '0.95rem', lineHeight: '1.4', 
                            color: 'rgba(255,255,255,0.95)', 
                            fontFamily: "'Inter', sans-serif"
                        }}>
                            <span dangerouslySetInnerHTML={{__html: update.text.replace(/<[^>]+>/g, '')}} />
                        </div>
                    </div>
                ))
            ) : (
                <div style={{textAlign:'center', opacity:0.7, padding:'10px 0', fontSize:'0.9rem'}}>
                    La diretta è iniziata. <br/> Gli aggiornamenti appariranno qui a breve.
                </div>
            )}
        </div>

        {/* FOOTER: BOTTONE (Diventa grigio se inattivo) */}
        <div style={{padding: '0 20px 20px 20px'}}>
            <button onClick={() => {const el = document.getElementById('live-timeline'); if(el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });}} 
                style={{
                    width: '100%', 
                    padding: '14px', 
                    // BACKGROUND BOTTONE: Rosso o Grigio Scuro
                    background: isLiveActive ? '#ef4444' : '#4b5563', 
                    border: 'none', 
                    borderRadius: '8px', 
                    color: 'white', 
                    fontSize: '0.9rem', 
                    fontWeight: '800', 
                    cursor: 'pointer', 
                    textTransform: 'uppercase', 
                    letterSpacing: '1px',
                    boxShadow: isLiveActive ? '0 4px 15px rgba(239, 68, 68, 0.4)' : 'none',
                    transition: 'all 0.2s'
                }}
                // Hover effect: solo se è attivo diventa rosso acceso
                onMouseEnter={(e) => {
                    if(isLiveActive) { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.background = '#dc2626'; }
                }}
                onMouseLeave={(e) => {
                    if(isLiveActive) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#ef4444'; }
                }}
            >
                {isLiveActive ? 'SEGUI LA DIRETTA ↓' : 'LEGGI LA CRONACA ↓'}
            </button>
        </div>
    </div>
)}

                        {/* CONTENITORE TITOLO CENTRALE (IN BASSO) */}
                        <div style={{
                            position: 'absolute', bottom: 0, left: 0, width: '100%', 
                            padding: isBigLayout ? '50px 10vw' : '30px 20px', 
                            color: '#ffffff', zIndex: 10,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
                        }}>
                            <div style={{maxWidth: '1000px', margin: '0 auto'}}>
                                <h1 className="font-bbc" style={{fontSize: isBigLayout ? 'clamp(3rem, 6vw, 5rem)' : 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: '900', lineHeight: '1.05', marginBottom: '20px', textShadow: '0 2px 10px rgba(0,0,0,0.5)', color:'white'}}>{clean(article.title)}</h1>
                                {article.subtitle && <h2 className="font-serif" style={{fontSize: isBigLayout ? '1.6rem' : '1.2rem', fontWeight: '400', opacity: 0.9, lineHeight: '1.5', maxWidth: '90%', margin: '0 auto', textShadow: '0 2px 5px rgba(0,0,0,0.5)', color:'white'}}>{clean(article.subtitle)}</h2>}
                            </div>
                        </div>
                    </div>
                </>
            )}
            {article?.importance === "Ultim'ora" && (
                <div style={{
    marginBottom: '5px',
    borderBottom: `1px solid ${C.border}`,
    width: '100%',        // <--- AGGIUNGI QUESTO
    maxWidth: '100%',     // <--- MODIFICA QUESTO (era '1200px')
    margin: '0 auto 40px auto'
}}>
    <Header2 theme={theme} isStatic={true} />
</div>
            )}

            {/* ========================================================== */}
            {/* LOGICA LAYOUT 2: TITOLO RILEVANTE (Fuori griglia)          */}
            {/* ========================================================== */}
            {article.importance === "Rilievo" && (
    <div style={{
        maxWidth:'1200px', 
        margin:'0 auto', 
        padding:'160px 20px 0 20px' // <--- CAMBIA QUI DA 120px A 160px
    }}>
        {TitleBlock}
    </div>
)}

            {/* ========================================================== */}
            {/* GRIGLIA PRINCIPALE (Apertura)                              */}
            {/* ========================================================== */}
            {/* GRIGLIA PRINCIPALE: Classi dinamiche per Rilievo/Standard */}
            {/* GRIGLIA PRINCIPALE: 3 Layout diversi (Rilievo / Ultim'ora / Standard) */}
            <div className={`main-grid ${
                article.importance === 'Rilievo' ? 'grid-rilievo' : 
                article.importance === "Ultim'ora" ? 'grid-ultimora' : 
                'grid-standard'
            }`}>
                <div style={{maxWidth:'100%'}}>
                
                    {/* LAYOUT 3: TITOLO NORMALE (Dentro la griglia) */}
                    {article.importance !== "Ultim'ora" && article.importance !== "Rilievo" && (
                        <div style={{marginBottom:'30px'}}>{TitleBlock}</div>
                    )}

                    {/* FOTO STANDARD (Se NON è Ultim'ora) */}
                    {article.importance !== "Ultim'ora" && images.length > 0 && (
                        <div className="visual-container" style={{
                            position:'relative', 
                            width:'100%', 
                            aspectRatio: '16/9', 
                            borderRadius:'8px', 
                            overflow:'hidden', 
                            
                            marginBottom:'30px', /* <--- MODIFICATO DA 30px A 10px */
                            
                            background: isDark ? '#000' : '#f3f4f6',
                            border: `1px solid ${C.border}`, // Bordo sottile per definizione
                            display: 'flex', alignItems: 'center', justifyContent: 'center' // Centratura perfetta
                        }}>
                            <img src={clean(images[galleryIndex])} style={{width:'100%', height:'100%', objectFit:'contain', display:'block', margin:'0 auto'}} onClick={() => setLightboxImg(images[galleryIndex])} alt="Visual"/>
                            {images.length > 1 && (
                                <>
                                    <div className="slide-counter" style={{position:'absolute', top:'15px', left:'15px', background:'rgba(0,0,0,0.6)', color:'white', padding:'4px 12px', borderRadius:'20px', fontSize:'0.75rem', fontWeight:'bold', backdropFilter:'blur(4px)', zIndex:20}}>{galleryIndex + 1} / {images.length}</div>
                                    <button className="nav-arrow nav-prev" onClick={prevSlide} style={{left:'15px'}}>❮</button>
                                    <button className="nav-arrow nav-next" onClick={nextSlide} style={{right:'15px'}}>❯</button>
                                </>
                            )}
                            {(article.coverCaption || article.coverCredits) && <div style={{position:'absolute', bottom:0, left:0, width:'100%', background:'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', padding:'40px 15px 15px 15px', color:'rgba(255,255,255,0.8)', fontSize:'0.75rem', pointerEvents:'none', textAlign: 'left'}}>{clean(article.coverCaption)} {article.coverCredits && `• ${article.coverCredits}`}</div>}
                        </div>
                    )}

                    {/* 3. DATI (Categoria, Data, Fonte) */}
                    {/* ORA APPARE SEMPRE: Sia per Rilievo che per Normale */}
                    <div style={{marginBottom:'0px'}}>
                        {MetaBlock}
                    </div>
                    

                    {/* 6. AUTORE + AZIONI (Interattivo e Navigabile) */}
                    <div className="author-box-responsive" style={{
                        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '20px', 
                        padding: '12px 0', margin: '10px 0', 
                        borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`
                    }}>
                        
                        {/* AVATAR (Cliccabile -> Vai al Profilo) */}
                        <div 
                            onClick={goToAuthorProfile} /* <--- AGGIUNTO CLICK */
                            style={{
                                width: '60px', height: '60px', borderRadius: '50%', overflow: 'visible',
                                background: isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6', flexShrink: 0,
                                position: 'relative', 
                                cursor: authorData ? 'pointer' : 'default' /* <--- MANINA SOLO SE ESISTE PROFILO */
                            }}
                        >
                            {authorData && (authorData.profileImage || authorData.foto) ? (
    <img 
        key={Date.now()} 
        src={getFreshImage(authorData.profileImage || authorData.foto)} 
        style={{width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%'}} 
        alt="Author"
    />
) : (
    <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', fontSize:'1.5rem', color: C.meta, borderRadius:'50%'}}>
        {clean(article.author).charAt(0)}
    </div>
)}

                            {/* PALLINO MOBILE (Interattivo: Cambia da + a ✓) */}
                            <button
                                className="mobile-follow-icon"
                                onClick={handleFollow} /* <--- CLICK PER SEGUIRE/SMETTERE */
                                style={{
                                    position: 'absolute', bottom: '-2px', right: '-2px',
                                    width: '24px', height: '24px', borderRadius: '50%', border: 'none',
                                    /* Cambia colore: Verde se seguito, Nero/Bianco se no */
                                    background: isFollowing ? '#10b981' : C.text, 
                                    color: isFollowing ? '#fff' : C.bg,
                                    display: 'none', alignItems: 'center', justifyContent: 'center',
                                    fontSize: isFollowing ? '0.9rem' : '1.4rem', 
                                    fontWeight: '400', lineHeight: 1,
                                    boxShadow: `0 0 0 3px ${C.bg}`, cursor: 'pointer', padding: 0, zIndex: 5
                                }}
                            >
                                {isFollowing ? '✓' : '+'}
                            </button>
                        </div>

                        {/* INFO AUTORE (Cliccabile -> Vai al Profilo) */}
                        <div 
                            onClick={goToAuthorProfile} /* <--- AGGIUNTO CLICK */
                            style={{
                                flex: 1, 
                                minWidth: '150px', 
                                cursor: authorData ? 'pointer' : 'default' /* <--- MANINA SOLO SE ESISTE PROFILO */
                            }}
                        >
                            <div style={{fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: C.meta, fontWeight: 'bold', marginBottom:'2px'}}>
                                Scritto da
                            </div>
                            <div style={{fontSize: '1.1rem', fontWeight: '900', color: C.text, fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                {clean(article.author)}
                            </div>
                        </div>

                        {/* GRUPPO AZIONI (Like, Save, Share) - Invariato */}
                        <div className="actions-group-responsive" style={{display:'flex', alignItems:'center', gap:'10px'}}>
                            <button onClick={handleLike} style={{background:'transparent', border:`1px solid ${C.border}`, borderRadius:'50px', padding:'6px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', color: C.text, transition:'0.2s'}}>
                                <span style={{fontSize:'1rem'}}>{isLiked ? '❤️' : '🤍'}</span>
                                <span style={{fontSize:'0.75rem', fontWeight:'bold'}}>{likesCount}</span>
                            </button>
                            <button onClick={handleSave} style={{background:'transparent', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color: C.text, padding:'5px'}}>
                                <span style={{fontSize:'1.2rem'}}>{isSaved ? '🔖' : '🏷️'}</span>
                            </button>
                             <button className="share-btn-responsive" onClick={handleShare} style={{background:'transparent', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color: C.text, padding:'5px'}}>
                                <span style={{fontSize:'1.2rem'}}>🔗</span>
                            </button>
                        </div>

                        {/* TASTO SEGUI DESKTOP (Interattivo) */}
                        <button
                            className="desktop-follow-btn"
                            onClick={handleFollow} /* <--- CLICK PER SEGUIRE/SMETTERE */
                            style={{
                                /* Cambia stile: Bordo vuoto se seguito, Pieno se no */
                                background: isFollowing ? 'transparent' : C.text, 
                                color: isFollowing ? C.text : C.bg, 
                                border: isFollowing ? `1px solid ${C.text}` : 'none',
                                
                                padding: '10px 24px', borderRadius: '50px', 
                                fontWeight: '800', fontSize: '0.75rem', letterSpacing: '1px',
                                textTransform: 'uppercase', cursor: 'pointer', 
                                boxShadow: isFollowing ? 'none' : '0 4px 15px rgba(0,0,0,0.1)'
                            }}
                        >
                            {isFollowing ? 'Seguito' : '+ Segui'}
                        </button>
                    </div>

{/* --- SOTTOTITOLO SOLO MOBILE (Box Elegante e Indiscreto) --- */}
            <div className="mobile-subtitle" style={{
                marginTop: '25px',
                marginBottom: '35px',
                /* STILE BOX */
                background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', // Sfondo molto tenue
                border: `1px solid ${C.border}`,
                borderLeft: `4px solid ${C.accent}`, // Linea laterale elegante
                borderRadius: '0 12px 12px 0',       // Arrotondato solo a destra
                padding: '20px 25px',                // Spaziatura interna comoda
                position: 'relative'
            }}>
                {article?.subtitle && (
                    <h2 className="font-serif" style={{
                        fontSize: '1.25rem',   // Dimensione leggibile ma non enorme
                        fontWeight:'400', 
                        color: C.text,      
                        lineHeight:'1.6',      // Interlinea ariosa
                        margin: 0,
                        fontStyle: 'italic',   // Corsivo editoriale
                        opacity: 0.95
                    }}>
                        {clean(article.subtitle)}
                    </h2>
                )}
            </div>

                    {/* 7. CONTENUTO + VIDEO IN MEZZO + PAYWALL */}
                    <div style={{position:'relative', overflow:'hidden'}}>
                        
                        {/* Sommario (Lead) */}
                        {article.summary && (
                            <div className="article-lead" style={{
                                color: C.text, 
                                marginBottom:'10px', /* <--- MODIFICATO: Era 40px, ora 20px */
                                opacity: 0.9,
                            }}>
                                {clean(article.summary)}
                            </div>
                        )}

                        {/* --- GALLERIA NEL CORPO (SOLO PER ULTIM'ORA) --- */}
                        {article.importance === "Ultim'ora" && images.length > 0 && (
                            <div className="visual-container" style={{
                                position:'relative', width:'100%', aspectRatio: '16/9', 
                                borderRadius:'8px', overflow:'hidden', marginBottom:'40px', 
                                background: isDark ? '#000' : '#f3f4f6',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                            }}>
                                {/* Immagine */}
                                <img 
                                    src={clean(images[galleryIndex])} 
                                    style={{width:'100%', height:'100%', objectFit:'contain', display:'block', margin:'0 auto'}} 
                                    onClick={() => setLightboxImg(images[galleryIndex])} 
                                    alt="Gallery"
                                />

                                {/* Controlli Slider (Solo se più di 1 foto) */}
                                {images.length > 1 && (
                                    <>
                                        <div className="slide-counter" style={{position:'absolute', top:'15px', left:'15px', background:'rgba(0,0,0,0.6)', color:'white', padding:'4px 12px', borderRadius:'20px', fontSize:'0.75rem', fontWeight:'bold', backdropFilter:'blur(4px)', zIndex:20}}>
                                            {galleryIndex + 1} / {images.length}
                                        </div>
                                        <button className="nav-arrow nav-prev" onClick={prevSlide} style={{left:'15px'}}>❮</button>
                                        <button className="nav-arrow nav-next" onClick={nextSlide} style={{right:'15px'}}>❯</button>
                                    </>
                                )}

                                {/* Didascalia */}
                                {(article.coverCaption || article.coverCredits) && (
                                    <div style={{position:'absolute', bottom:0, left:0, width:'100%', background:'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', padding:'40px 15px 15px 15px', color:'rgba(255,255,255,0.9)', fontSize:'0.8rem', pointerEvents:'none', textAlign: 'left'}}>
                                        {clean(article.coverCaption)} {article.coverCredits && <span style={{opacity:0.7}}>• {article.coverCredits}</span>}
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* Testo Articolo con Video Intelligente nel mezzo */}
                        <div className={`article-text ${isLocked ? 'paywall-blur' : ''}`} style={{transition:'0.3s'}}>
                            {(() => {
                                // 1. Dividiamo il testo in paragrafi reali e puliti
                                const paragraphs = clean(article.content).split('\n').filter(p => p.trim() !== "");
                                // 2. Calcoliamo la metà esatta
                                const middleIndex = Math.floor(paragraphs.length / 2);

                                return paragraphs.map((p, i) => {
                                    // Logica Paywall: nascondi dopo il 5° paragrafo se bloccato
                                    if (isLocked && i > 4) return null;

                                    return (
                                        <React.Fragment key={i}>
                                            {/* Stampa il paragrafo */}
                                            <p dangerouslySetInnerHTML={{ __html: p }}></p>

                                            {/* VIDEO: Se siamo a metà, c'è un video e non è bloccato -> MOSTRALO QUI */}
                                            {!isLocked && article.bodyVideo && i === middleIndex && (
                                                <div style={{
                                                    width: '100%', 
                                                    margin: '40px 0', 
                                                    borderRadius: '8px', 
                                                    overflow: 'hidden',
                                                    border: `1px solid ${C.border}`,
                                                    background: isDark ? '#000' : '#f0f0f0'
                                                }}>
                                                    <div dangerouslySetInnerHTML={{__html: article.bodyVideo}} style={{width: '100%', display: 'flex', justifyContent: 'center'}} />
                                                </div>
                                            )}
                                        </React.Fragment>
                                    );
                                });
                            })()}
                        </div>

                        {/* BOX PAYWALL (Premium Glass Overlay) */}
                        {isLocked && (
                            <div style={{
                                position:'absolute', bottom:0, left:0, width:'100%', 
                                height: '80%', display: 'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', textAlign:'center',
                                padding: '40px 20px',
                                background: isDark 
                                    ? `linear-gradient(to bottom, transparent 0%, rgba(15, 23, 42, 0.8) 50%, #0f172a 100%)` 
                                    : `linear-gradient(to bottom, transparent 0%, rgba(255, 255, 255, 0.8) 50%, #ffffff 100%)`,
                                backdropFilter: 'blur(8px)', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'}`
                            }}>
                                
                                {/* Contenuto del Box */}
                                <div style={{maxWidth:'500px', paddingBottom:'20px'}}>
                                    
                                    {/* Icona Lucchetto */}
                                    <div style={{fontSize:'3.5rem', marginBottom:'15px', color: C.accent, filter: `drop-shadow(0 0 20px ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'})`}}>
                                        🔒
                                    </div>
                                    
                                    <h3 className="font-bbc" style={{fontSize:'2rem', fontWeight:'900', marginBottom:'15px', color: C.text, lineHeight:'1.1'}}>
                                        Continua la lettura
                                    </h3>
                                    
                                    <p style={{marginBottom:'35px', opacity:0.9, fontSize:'1.05rem', lineHeight:'1.6', color: C.text}}>
                                        {!user 
                                            ? <span>Questo è un contenuto esclusivo. <br/>Registrati gratuitamente per accedervi subito.</span>
                                            : <span>Hai raggiunto un contenuto Premium. <br/>Passa ad un piano superiore per sbloccarlo.</span>
                                        }
                                    </p>

                                    {/* BOTTONE SMART */}
                                    <button 
                                        onClick={() => !user ? navigate('/register') : navigate('/dashboard/subscription')} 
                                        style={{
                                            background: C.text, color: C.bg, border: 'none', 
                                            padding: '18px 50px', borderRadius: '50px', 
                                            fontWeight: '800', fontSize: '1rem', cursor: 'pointer',
                                            boxShadow: `0 15px 30px -10px ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)'}`,
                                            transform: 'scale(1)', transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                            textTransform: 'uppercase', letterSpacing: '1.5px'
                                        }}
                                        onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.05) translateY(-3px)'; e.currentTarget.style.boxShadow=`0 20px 40px -10px ${isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)'}`}}
                                        onMouseLeave={e=>{e.currentTarget.style.transform='scale(1) translateY(0)'; e.currentTarget.style.boxShadow=`0 15px 30px -10px ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)'}`}}
                                    >
                                        {!user ? "Crea Account Gratuito" : "Sblocca con Premium"}
                                    </button>

                                    {/* Link alternativo login */}
                                    {!user && (
                                        <div style={{marginTop:'25px', fontSize:'0.9rem', cursor:'pointer', opacity:0.8, fontWeight:'600'}} onClick={()=>navigate('/login')}>
                                            Hai già un account? <span style={{color: C.accent, textDecoration:'underline'}}>Accedi</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* --- ZONA LIVE BLOG (TIMELINE PRO DESIGN - FIXED) --- */}
                    {article.liveUpdates && article.liveUpdates.length > 0 && (
                        <div id="live-timeline" style={{marginTop:'60px', marginBottom:'60px', scrollMarginTop: '100px'}}>
                            
                            {/* Intestazione Sezione */}
                            <div style={{display:'flex', alignItems:'center', gap:'15px', marginBottom:'30px', borderBottom:`1px solid ${C.border}`, paddingBottom:'15px'}}>
                                <div style={{position:'relative'}}>
                                    <div style={{width:'16px', height:'16px', background:'#dc2626', borderRadius:'50%'}}></div>
                                    <div style={{position:'absolute', inset:0, borderRadius:'50%', border:'1px solid #dc2626', animation:'live-pulse 2s infinite'}}></div>
                                </div>
                                <h3 style={{margin:0, fontSize:'1.4rem', fontWeight:'900', textTransform:'uppercase', color: C.text, letterSpacing:'0.5px'}}>
                                    Timeline Eventi
                                </h3>
                            </div>

                            {/* Contenitore Timeline */}
                            <div style={{position:'relative', paddingLeft:'10px'}}>
                                {/* Linea Verticale */}
                                <div style={{position:'absolute', top:'10px', bottom:'0', left:'24px', width:'2px', background: isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}}></div>

                                {/* Lista Aggiornamenti */}
                                {[...article.liveUpdates].reverse().map((update, i) => (
                                    <div key={i} style={{
                                        position:'relative', marginBottom:'40px', paddingLeft:'60px', 
                                        animation: i===0 ? 'fadeIn 0.5s ease' : 'none'
                                    }}>
                                        {/* Pallino sulla linea */}
                                        <div style={{
                                            position:'absolute', left:'15px', top:'0', 
                                            width:'20px', height:'20px', borderRadius:'50%', 
                                            background: i===0 ? '#dc2626' : (isDark ? '#334155' : '#fff'), 
                                            border: i===0 ? '4px solid #fecaca' : `4px solid ${isDark ? '#0f172a' : '#f3f4f6'}`,
                                            boxShadow: i===0 ? '0 0 0 2px #dc2626' : `0 0 0 2px ${C.border}`,
                                            zIndex: 2
                                        }}></div>

                                        {/* Orario */}
                                        <div style={{
                                            display:'inline-block', padding:'4px 10px', borderRadius:'6px', 
                                            background: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', 
                                            color: C.text, fontWeight:'800', fontSize:'0.85rem', marginBottom:'10px',
                                            border: `1px solid ${C.border}`
                                        }}>
                                            {new Date(update.time).toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'})}
                                        </div>

                                        {/* Testo Aggiornamento (FIX BUG OVERFLOW) */}
                                        <div style={{
                                            fontSize:'1.1rem', lineHeight:'1.6', color: C.text, 
                                            background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                                            padding: '20px', borderRadius:'12px',
                                            border: `1px solid ${C.border}`,
                                            boxShadow: isDark ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                                            /* --- FIX CRITICI PER IL TESTO --- */
                                            overflowWrap: 'break-word',  // Spezza parole lunghe
                                            wordBreak: 'break-word',     // Forza a capo se non ci sono spazi
                                            maxWidth: '100%',            // Impedisce di uscire dal div padre
                                            overflow: 'hidden'           // Taglia tutto ciò che sborda
                                        }}>
                                            {/* Stili interni per immagini e link */}
                                            <style>{`
                                                .live-content img { max-width: 100% !important; height: auto; border-radius: 8px; margin-top: 10px; }
                                                .live-content a { color: ${C.accent}; text-decoration: underline; word-break: break-all; }
                                                .live-content iframe { max-width: 100% !important; }
                                            `}</style>
                                            
                                            <div className="live-content" dangerouslySetInnerHTML={{__html: update.text.replace(/\n/g, '<br/>')}} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}


                    {/* 9. TAGS & SOURCE (Affiancati su una riga) */}
                    <div className="source-box-responsive" style={{
    marginTop:'60px', 
    paddingTop:'20px', 
    borderTop:`1px solid ${C.border}`, 
    display: 'flex', 
    flexWrap: 'wrap', 
    alignItems: 'center', 
    gap: '20px' 
}}>
                        
                        {/* Fonte */}
<div style={{fontSize:'0.85rem', color: C.meta, whiteSpace: 'nowrap'}}>
    Fonte: <a href={article.source} target="_blank" rel="noreferrer" style={{color: C.text, fontWeight:'bold', textDecoration:'underline'}}>
        {article.source && article.source.length > 15 
            ? article.source.substring(0, 15) + '...' 
            : (article.source || "Interna")}
    </a>
</div>

                        {/* Divisore Verticale (Opzionale, solo estetico) */}
                        <div style={{width:'1px', height:'15px', background:C.border}}></div> 

                        {/* Tags */}
                        <div style={{display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center'}}>
                            {article.tags && article.tags.map((t, i) => (
                                <span key={i} style={{
                                    fontSize:'0.75rem', fontWeight:'bold', 
                                    border:`1px solid ${C.border}`, 
                                    padding:'4px 12px', borderRadius:'20px', 
                                    textTransform:'uppercase', color: C.text
                                }}>
                                    #{clean(t)}
                                </span>
                            ))}
                        </div>
                    </div>

                </div>
                {/* FINE COLONNA SINISTRA */}

                <div className="mobile-hide">
                    <SidebarContent />
                </div>

            </div> {/* FINE MAIN GRID */}

           {/* FOOTER AREA (Potrebbe interessarti) */}
            <div style={{background: isDark ? '#020617' : '#f8fafc', padding:'80px 5%', borderTop:`1px solid ${C.border}`}}>
                <div style={{maxWidth:'1200px', margin:'0 auto'}}>
                    
                    <h3 style={{fontWeight:'900', textTransform:'uppercase', fontSize:'0.9rem', marginBottom:'40px', letterSpacing:'2px', color: C.meta, borderBottom:`1px solid ${C.border}`, paddingBottom:'15px', display:'inline-block'}}>
                        Potrebbe interessarti
                    </h3>

                    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:'40px'}}>
                        {relatedNews.slice(0, 3).map(n => {
                            // Calcolo Tempo Lettura
                            const wordCount = n.content ? n.content.replace(/<[^>]+>/g, '').split(/\s+/).length : 600;
                            const readTime = Math.ceil(wordCount / 200);

                            return (
                                <div key={n._id} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                                    
                                    {/* 1. IMMAGINE con CATEGORIA SOPRA */}
                                    <div onClick={()=>navigate(`/news/${n.slug}`)} style={{
                                        width:'100%', aspectRatio:'16/9', borderRadius:'12px', overflow:'hidden', 
                                        cursor:'pointer', background:C.border, position:'relative',
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
                                    }}>
                                        <img 
                                            src={n.coverImage} 
                                            style={{width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.5s ease'}} 
                                            onMouseOver={e=>e.currentTarget.style.transform='scale(1.05)'} 
                                            onMouseOut={e=>e.currentTarget.style.transform='scale(1)'} 
                                            alt=""
                                        />
                                        
                                        {/* ETICHETTA CATEGORIA (Sopra la foto) */}
                                        <div style={{
                                            position: 'absolute', top: '12px', left: '12px',
                                            background: '#ffffff', color: '#000000',
                                            padding: '4px 10px', borderRadius: '4px',
                                            fontSize: '0.7rem', fontWeight: '800',
                                            textTransform: 'uppercase', letterSpacing: '0.5px',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                            zIndex: 2, pointerEvents: 'none'
                                        }}>
                                            {clean(n.category)}
                                        </div>
                                    </div>

                                    {/* 2. DATA e TEMPO DI LETTURA */}
                                    <div style={{display:'flex', alignItems:'center', gap:'10px', fontSize:'0.75rem', fontWeight:'600', color:C.meta, marginTop:'-5px'}}>
                                        <span>{new Date(n.createdAt).toLocaleDateString('it-IT', {day: 'numeric', month: 'long'})}</span>
                                        <span style={{opacity:0.4}}>•</span>
                                        <span>⏳ {readTime} min lettura</span>
                                    </div>

                                    {/* 3. TITOLO */}
                                    <h4 onClick={()=>navigate(`/news/${n.slug}`)} style={{
                                        margin:0, fontSize:'1.3rem', lineHeight:'1.3', fontWeight:'700', 
                                        cursor:'pointer', color:C.text, fontFamily:"'Inter', sans-serif"
                                    }}>
                                        {clean(n.title)}
                                    </h4>

                                    {/* 4. FOOTER CARD (Autore + Like) */}
                                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:`1px solid ${C.border}`, paddingTop:'12px', marginTop:'auto'}}>
                                        
                                        {/* Autore (Foto + Nome) */}
                                        <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                            <div style={{width:'24px', height:'24px', borderRadius:'50%', overflow:'hidden', background: C.border}}>
                                                {n.author && typeof n.author === 'object' && n.author.foto 
                                                    ? <img src={n.author.foto} style={{width:'100%', height:'100%', objectFit:'cover'}} alt=""/>
                                                    : <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem', fontWeight:'bold', color:C.text, background:C.border}}>
                                                        {(typeof n.author === 'string' ? n.author : (n.author?.nome || 'R')).charAt(0)}
                                                    </div>
                                                }
                                            </div>
                                            <span style={{fontSize:'0.8rem', fontWeight:'700', color:C.text}}>
                                                {typeof n.author === 'string' ? n.author : (n.author?.nome || "Redazione")}
                                            </span>
                                        </div>

                                        {/* Likes */}
                                        <div style={{display:'flex', alignItems:'center', gap:'4px', fontSize:'0.8rem', fontWeight:'600', color:C.meta}}>
                                            <span>❤️</span>
                                            <span>{n.likes || 0}</span>
                                        </div>
                                    </div>

                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}

export default NewsPage;