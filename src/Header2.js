import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Header2({ theme, isStatic }) { // 👈 AGGIUNTO 'isStatic'
    const navigate = useNavigate();
    const [menuItems, setMenuItems] = useState([]);
    
    // Stati per la ricerca
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef(null);

    const isDark = theme === 'dark';

    useEffect(() => {
        const fetchMenu = async () => {
            try {
                const res = await axios.get('https://murthnews-api.onrender.com/api/menu');
                if (Array.isArray(res.data)) {
                    setMenuItems(res.data);
                }
            } catch (err) { console.error(err); }
        };
        fetchMenu();
    }, []);

    // Focus automatico sulla ricerca
    useEffect(() => {
        if (isSearchOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isSearchOpen]);

    // Gestione Click Link
    const handleClick = (item) => {
        if (item.type === 'custom' || item.link.startsWith('http')) {
            window.open(item.link, '_blank');
        } else {
            navigate(item.link);
        }
    };

    // Gestione Invio Ricerca
    const handleSearchSubmit = (e) => {
        if (e.key === 'Enter' && searchQuery.trim() !== '') {
            navigate(`/search-results?q=${searchQuery}`);
            setIsSearchOpen(false);
        }
    };

    // --- STILI ---
    const S = {
        container: {
            // 👇 LOGICA DINAMICA: Se è statico, diventa 'relative' e top 0
            position: isStatic ? 'relative' : 'absolute',
            top: isStatic ? '0' : '80px', 
            
            left: 0,
            width: '100%',
            height: '50px',
            zIndex: 998,
            
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center', 
            
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)',
            borderTop: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)', 
            borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
            boxShadow: '0 4px 10px -5px rgba(0, 0, 0, 0.05)',
        },
        scrollWrapper: {
            flex: 1, 
            maxWidth: '1200px',
            display: isSearchOpen ? 'none' : 'flex', // Nascondi se cerchi
            alignItems: 'center',
            gap: '12px', // Spazio tra i bottoni
            padding: '0 20px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            justifyContent: 'center', // Centrato su Desktop
        },
        item: {
            whiteSpace: 'nowrap',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: '700',
            color: isDark ? '#94a3b8' : '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            cursor: 'pointer',
            padding: '6px 14px',
            borderRadius: '20px',
            transition: 'all 0.2s ease',
            flexShrink: 0,
            display: 'flex', 
            alignItems: 'center',
            gap: '6px' // Spazio tra Icona e Testo
        },
        searchIconBtn: {
            background: 'transparent',
            border: 'none',
            color: isDark ? '#fff' : '#000',
            fontSize: '1.2rem',
            cursor: 'pointer',
            padding: '0 20px',
            display: isSearchOpen ? 'none' : 'flex',
            alignItems: 'center',
            height: '100%'
        },
        searchContainer: {
            display: isSearchOpen ? 'flex' : 'none',
            width: '100%',
            maxWidth: '800px',
            alignItems: 'center',
            padding: '0 20px',
            gap: '10px',
            animation: 'fadeIn 0.2s ease-in-out'
        },
        input: {
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: isDark ? '#fff' : '#000',
            fontSize: '1.1rem',
            fontWeight: '600',
            outline: 'none',
            padding: '10px'
        }
    };

    return (
        <div style={S.container}>
            <style>{`
                .header2-scroll::-webkit-scrollbar { display: none; }
                
                .header2-item:hover {
                    color: ${isDark ? '#fff' : '#000'} !important;
                    background-color: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
                    transform: translateY(-1px);
                }

                @media (max-width: 768px) {
    .header2-scroll {
        /* MODIFICA QUI: flex-start invece di center */
        justify-content: flex-start !important; 
        
        /* Aggiungi questo per evitare che il primo elemento sia attaccato al bordo */
        padding-left: 20px !important; 
        padding-right: 20px !important;
    }
}
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            {/* LISTA LINK */}
            <div style={S.scrollWrapper} className="header2-scroll">
                {menuItems.map((item) => (
                    <div 
                        key={item._id} 
                        style={S.item} 
                        className="header2-item"
                        onClick={() => handleClick(item)}
                    >
                        {/* 🔥 QUI APPARE L'ICONA SE PRESENTE */}
                        {item.icon && <span style={{fontSize: '1.1rem', lineHeight: 1}}>{item.icon}</span>}
                        
                        {/* TESTO */}
                        <span>{item.label}</span>
                    </div>
                ))}
            </div>

            {/* TASTO CERCA */}
            <button style={S.searchIconBtn} onClick={() => setIsSearchOpen(true)} title="Cerca">
                🔍
            </button>

            {/* BARRA RICERCA A COMPARSA */}
            <div style={S.searchContainer}>
                <span style={{fontSize: '1.2rem'}}>🔎</span>
                <input 
                    ref={inputRef}
                    style={S.input}
                    placeholder="Cerca un articolo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchSubmit}
                />
                <button 
                    style={{background:'none', border:'none', color: S.item.color, fontSize:'1.2rem', cursor:'pointer'}} 
                    onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                >
                    ✕
                </button>
            </div>
        </div>
    );
}

export default Header2;