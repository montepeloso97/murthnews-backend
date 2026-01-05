import React from 'react';
import { useNavigate } from 'react-router-dom';
import SiteLogo from './SiteLogo';

// --- ICONE SOCIAL (SVG) ---
const IconFB = () => <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>;
const IconTW = () => <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>;
const IconIG = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>;
const IconLN = () => <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>;

function Footer({ theme }) {
    const navigate = useNavigate();
    
    // Se il tema non viene passato, proviamo a leggerlo, altrimenti default light
    const currentTheme = theme || localStorage.getItem('site_theme') || 'light';
    const isDark = currentTheme === 'dark';

    // --- COLORI DINAMICI ---
    const C = {
        bg: isDark ? '#020617' : '#f8fafc',
        text: isDark ? '#94a3b8' : '#64748b',
        title: isDark ? '#f1f5f9' : '#0f172a',
        border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        accent: '#e11d48',
        hoverBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
    };

    return (
        <footer className="site-footer" style={{
            backgroundColor: C.bg,
            borderTop: `1px solid ${C.border}`,
            marginTop: 'auto',
            fontFamily: "'Inter', sans-serif",
            transition: 'background-color 0.3s ease'
        }}>
            <style>{`
                .site-footer {
                    padding: 80px 20px 40px 20px;
                }

                .footer-grid {
                    display: grid; 
                    grid-template-columns: 1.5fr 1fr 1fr 1fr; 
                    gap: 40px; 
                    max-width: 1200px; 
                    margin: 0 auto;
                }
                
                .footer-col h4 {
                    color: ${C.title};
                    font-size: 1rem;
                    font-weight: 800;
                    margin-bottom: 25px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }

                .footer-link {
                    display: block;
                    color: ${C.text};
                    margin-bottom: 12px;
                    text-decoration: none;
                    font-size: 0.95rem;
                    transition: all 0.2s ease;
                    cursor: pointer;
                    width: fit-content; /* Importante per l'hover */
                }
                .footer-link:hover {
                    color: ${C.accent};
                    transform: translateX(5px);
                }

                .social-row { display: flex; gap: 15px; }
                .social-icon {
                    width: 40px; height: 40px;
                    border-radius: 50%;
                    border: 1px solid ${C.border};
                    display: flex; align-items: center; justify-content: center;
                    color: ${C.text};
                    transition: 0.3s;
                    cursor: pointer;
                }
                .social-icon:hover {
                    background: ${C.accent};
                    color: white;
                    border-color: ${C.accent};
                    transform: translateY(-3px);
                }

                .footer-bottom {
                    max-width: 1200px; margin: 60px auto 0 auto;
                    padding-top: 30px;
                    border-top: 1px solid ${C.border};
                    display: flex; justify-content: space-between; align-items: center;
                    color: ${C.text}; font-size: 0.85rem;
                }

                /* TABLET (2 Colonne) */
                @media (max-width: 900px) {
                    .footer-grid { 
                        grid-template-columns: 1fr 1fr; 
                        gap: 40px; 
                    }
                }

                /* MOBILE (1 Colonna, tutto centrato) */
                @media (max-width: 600px) {
                    .site-footer {
                        padding: 50px 20px 30px 20px; /* Meno padding verticale */
                    }
                    .footer-grid { 
                        grid-template-columns: 1fr; 
                        text-align: center; 
                        gap: 50px;
                    }
                    
                    /* Centriamo il contenuto delle colonne su mobile */
                    .footer-col {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }
                    
                    /* Centriamo il testo descrittivo */
                    .footer-col p {
                        margin-left: auto;
                        margin-right: auto;
                    }

                    /* I link su mobile non devono scivolare a destra ma illuminarsi */
                    .footer-link {
                        width: auto;
                    }
                    .footer-link:hover {
                        transform: none;
                        color: ${C.accent};
                    }

                    .social-row { justify-content: center; }
                    
                    .footer-bottom { 
                        flex-direction: column; 
                        gap: 15px; 
                        text-align: center;
                        margin-top: 40px;
                    }
                }
            `}</style>

            <div className="footer-grid">
                {/* COLONNA 1: BRAND */}
                <div className="footer-col">
                    <div style={{marginBottom:'20px', display: 'inline-block'}} onClick={() => navigate('/')}>
                        <SiteLogo theme={currentTheme} />
                    </div>
                    <p style={{color: C.text, lineHeight: '1.6', fontSize: '0.95rem', maxWidth: '300px', margin: '0 0 20px 0'}}>
                        La tua fonte quotidiana di notizie verificate, approfondimenti e storie che contano. Informazione libera, sempre.
                    </p>
                </div>

                {/* COLONNA 2: ESPLORA */}
                <div className="footer-col">
                    <h4>Esplora</h4>
                    <span className="footer-link" onClick={() => navigate('/')}>Home Page</span>
                    <span className="footer-link" onClick={() => navigate('/categories')}>Tutte le Categorie</span>
                    <span className="footer-link" onClick={() => navigate('/category/Mondo')}>Mondo</span>
                    <span className="footer-link" onClick={() => navigate('/category/Politica')}>Politica</span>
                    <span className="footer-link" onClick={() => navigate('/category/Tech')}>Tecnologia</span>
                </div>

                {/* COLONNA 3: AZIENDA */}
                <div className="footer-col">
                    <h4>Info</h4>
                    <span className="footer-link" onClick={() => navigate('/policy')}>Chi Siamo</span>
                    <span className="footer-link" onClick={() => navigate('/policy')}>Contatti</span>
                    <span className="footer-link" onClick={() => navigate('/policy')}>Privacy Policy</span>
                    <span className="footer-link" onClick={() => navigate('/policy')}>Termini di Servizio</span>
                </div>

                {/* COLONNA 4: SOCIAL */}
                <div className="footer-col">
                    <h4>Seguici</h4>
                    <div className="social-row">
                        <div className="social-icon" title="Facebook"><IconFB /></div>
                        <div className="social-icon" title="Twitter"><IconTW /></div>
                        <div className="social-icon" title="Instagram"><IconIG /></div>
                        <div className="social-icon" title="LinkedIn"><IconLN /></div>
                    </div>
                    <div style={{marginTop: '25px', width: '100%', maxWidth: '250px'}}>
                        <button 
                            onClick={() => navigate('/register')}
                            style={{
                                background: 'transparent',
                                border: `1px solid ${C.accent}`,
                                color: C.accent,
                                padding: '10px 20px',
                                borderRadius: '30px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: '0.3s',
                                width: '100%'
                            }}
                            onMouseOver={(e) => { e.target.style.background = C.accent; e.target.style.color = 'white'; }}
                            onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.color = C.accent; }}
                        >
                            Iscriviti alla Newsletter
                        </button>
                    </div>
                </div>
            </div>

            {/* BARRA INFERIORE */}
            <div className="footer-bottom">
                <div>&copy; {new Date().getFullYear()} MurthNews. Tutti i diritti riservati.</div>
                <div style={{display:'flex', gap:'20px'}}>
                    <span style={{cursor:'pointer'}} onClick={() => navigate('/policy')}>Privacy</span>
                    <span style={{cursor:'pointer'}} onClick={() => navigate('/policy')}>Cookies</span>
                </div>
            </div>
        </footer>
    );
}

export default Footer;