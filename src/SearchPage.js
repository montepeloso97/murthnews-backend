import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './App.css'; 
import SiteLogo from './SiteLogo';

const SearchPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // --- STATI ---
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState('news'); 
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  const [results, setResults] = useState({
    news: [],
    users: [],
    pages: [],
    categories: []
  });

  // --- EFFETTI ---
  useEffect(() => {
      document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
      localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const storedUser = localStorage.getItem('reader_user');
    if (storedUser) setCurrentUser(JSON.parse(storedUser));

    if (!query) return;

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resNews, resUsers, resPages, resCats] = await Promise.all([
                axios.get('http://localhost:5000/api/news'),
                axios.get('http://localhost:5000/api/users'),
                axios.get('http://localhost:5000/api/pages'),
                axios.get('http://localhost:5000/api/categories')
            ]);

            const qLower = query.toLowerCase();

            const filteredNews = resNews.data.filter(item => 
                item.title?.toLowerCase().includes(qLower) || item.summary?.toLowerCase().includes(qLower)
            );
            const filteredUsers = resUsers.data.filter(item => 
                item.username?.toLowerCase().includes(qLower) || item.nome?.toLowerCase().includes(qLower)
            );
            const filteredPages = resPages.data.filter(item => 
                item.title?.toLowerCase().includes(qLower) || item.slug?.toLowerCase().includes(qLower)
            );
            const filteredCats = resCats.data.filter(item => 
                item.name?.toLowerCase().includes(qLower)
            );

            setResults({ news: filteredNews, users: filteredUsers, pages: filteredPages, categories: filteredCats });

        } catch (error) {
            console.error("Errore ricerca:", error);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [query]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  
  const handleLogout = () => {
      localStorage.removeItem('reader_user');
      navigate('/');
      window.location.reload();
  };

  const handleSearchSubmit = (e) => {
      e.preventDefault();
      // Nascondi tastiera su mobile dopo invio
      document.activeElement.blur();
      navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  // --- STYLE VARIABLES ---
  const isDark = theme === 'dark';
  const textMain = isDark ? '#ffffff' : '#1e293b';
  const headerBg = isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)';
  
  return (
    <div className="search-page-wrapper" style={{background: isDark ? '#0f172a' : '#f8fafc', minHeight: '100vh', color: textMain, transition: '0.3s'}}>
      
      {/* Background Decorativo */}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>

      {/* --- HEADER RESPONSIVE --- */}
      <header className="responsive-header" style={{background: headerBg}}>
          
          <div onClick={() => navigate('/')} style={{cursor: 'pointer'}}>
    <SiteLogo theme={theme} />
</div>
          {/* Azioni Utente */}
          <div className="header-actions">
              <button onClick={toggleTheme} className="icon-btn">
                  {isDark ? '☀️' : '🌙'}
              </button>

              <button onClick={() => navigate('/dashboard')} className="dash-btn" style={{color: textMain, borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}}>
                 <span className="desk-text">Dashboard</span>
                 <span className="mob-text">📊</span>
              </button>
              
              {currentUser && (
                  <div className="user-profile">
                      <span className="user-name" style={{color: textMain}}>{currentUser.nome}</span>
                      <div className="user-avatar">
                          {currentUser.profileImage ? (
                              <img src={currentUser.profileImage} alt="User" />
                          ) : (
                              <div className="avatar-placeholder">{currentUser.nome?.charAt(0)}</div>
                          )}
                      </div>
                  </div>
              )}

              <button onClick={handleLogout} className="logout-btn">
                  <span className="desk-text">Esci</span>
                  <span className="mob-text">✕</span>
              </button>
          </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <div className="main-container">
          
          {/* Search Input & Tabs */}
          <div className="search-section">
              <form onSubmit={handleSearchSubmit} className="search-form">
                  <input 
                     value={query}
                     onChange={(e) => setQuery(e.target.value)}
                     placeholder="Cerca..."
                     className="search-input"
                     style={{
                         background: isDark ? 'rgba(30, 41, 59, 0.6)' : 'white',
                         color: textMain,
                         boxShadow: isDark ? '0 10px 40px rgba(0,0,0,0.4)' : '0 10px 40px rgba(79, 172, 254, 0.15)'
                     }}
                  />
                  <span className="search-icon">🔍</span>
              </form>

              <div className="tabs-container">
                  {[
                      { id: 'news', label: 'Notizie', icon: '📰' },
                      { id: 'users', label: 'Persone', icon: '👥' },
                      { id: 'pages', label: 'Pagine', icon: '📄' },
                      { id: 'categories', label: 'Cat.', icon: '🏷️' },
                  ].map(tab => (
                      <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                        style={{
                            color: activeTab === tab.id ? 'white' : textMain,
                            background: activeTab === tab.id ? '#4facfe' : (isDark ? 'rgba(255,255,255,0.05)' : 'white')
                        }}
                      >
                          {tab.icon} {tab.label}
                      </button>
                  ))}
              </div>
          </div>

          {/* Results Area */}
          {loading ? (
              <div className="loader-container">
                  <div className="spinner"></div>
                  <p>Sto cercando...</p>
              </div>
          ) : (
              <div className="results-grid-container fade-in">
                  
                  {/* NEWS */}
                  {activeTab === 'news' && (
                      <div className="grid-news">
                          {results.news.length > 0 ? results.news.map(art => (
                              <div key={art._id} className="card news-card" onClick={() => navigate(`/news/${art.slug}`)} style={{background: isDark ? 'rgba(30,41,59,0.6)' : 'white'}}>
                                  <div className="card-img-wrap">
                                      <img src={art.coverImage || 'https://via.placeholder.com/500'} alt="cover" />
                                  </div>
                                  <div className="card-body">
                                      <span className="card-tag">{art.category}</span>
                                      <h3>{art.title}</h3>
                                      <p>{art.summary}</p>
                                  </div>
                              </div>
                          )) : <EmptyState msg="Nessuna notizia." />}
                      </div>
                  )}

                  {/* USERS */}
                  {activeTab === 'users' && (
                      <div className="grid-users">
                          {results.users.length > 0 ? results.users.map(u => (
                              <div 
                                key={u._id} 
                                className="card user-card" 
                                // --- MODIFICA QUI: Aggiunto link e cursore ---
                                onClick={() => navigate(`/author/${u._id}`)}
                                style={{
                                    background: isDark ? 'rgba(30,41,59,0.6)' : 'white',
                                    cursor: 'pointer' 
                                }}
                                // --------------------------------------------
                              >
                                  <div className="user-card-img">
                                      {u.profileImage ? <img src={u.profileImage} alt="u" /> : u.nome?.charAt(0)}
                                  </div>
                                  <h4>{u.nome} {u.cognome}</h4>
                                  <p>@{u.username}</p>
                                  <span className="role-badge">{u.role}</span>
                              </div>
                          )) : <EmptyState msg="Nessun utente." />}
                      </div>
                  )}

                  {/* PAGES */}
                  {activeTab === 'pages' && (
                      <div className="grid-pages">
                          {results.pages.length > 0 ? results.pages.map(page => (
                              <div key={page._id} className="card page-card" style={{background: isDark ? 'rgba(30,41,59,0.6)' : 'white'}}>
                                  <div className="page-icon">📄</div>
                                  <div>
                                      <h3>{page.title}</h3>
                                      <p>/{page.slug}</p>
                                  </div>
                                  
                                  {/* --- MODIFICA QUI: Aggiunto onClick per navigare --- */}
                                  <button 
                                    className="read-btn" 
                                    style={{color: textMain}}
                                    onClick={() => navigate(`/p/${page.slug}`)}
                                  >
                                    Leggi
                                  </button>
                                  {/* -------------------------------------------------- */}
                                  
                              </div>
                          )) : <EmptyState msg="Nessuna pagina." />}
                      </div>
                  )}

                  {/* CATEGORIES */}
                  {activeTab === 'categories' && (
                      <div className="grid-cats">
                          {results.categories.length > 0 ? results.categories.map(cat => (
                              <div key={cat._id} className="card cat-card" style={{background: isDark ? 'rgba(30,41,59,0.6)' : 'white'}}>
                                  <div style={{fontSize:'2rem'}}>📂</div>
                                  <h4>{cat.name}</h4>
                              </div>
                          )) : <EmptyState msg="Nessuna categoria." />}
                      </div>
                  )}

              </div>
          )}
      </div>

      {/* --- STILI CSS AVANZATI E RESPONSIVE --- */}
      <style>{`
        /* Global & Blobs */
        .search-page-wrapper { font-family: 'Inter', sans-serif; position: relative; overflow-x: hidden; }
        .blob { position: fixed; width: 400px; height: 400px; border-radius: 50%; filter: blur(120px); opacity: 0.15; z-index: 0; pointer-events: none; }
        .blob-1 { top: -10%; left: -10%; background: #4facfe; }
        .blob-2 { bottom: -10%; right: -10%; background: #764ba2; }

        /* Header */
        .responsive-header {
            position: sticky; top: 0; z-index: 100;
            display: flex; justify-content: space-between; align-items: center;
            padding: 15px 5%;
            backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .header-logo { display: flex; align-items: center; gap: 10px; cursor: pointer; }
        .logo-icon { width: 40px; height: 40px; background: linear-gradient(135deg, #4facfe, #00f2fe); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 1.4rem; }
        .logo-text { font-size: 1.4rem; font-weight: 800; letter-spacing: -0.5px; }
        
        .header-actions { display: flex; align-items: center; gap: 15px; }
        .icon-btn { background: rgba(255,255,255,0.1); border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
        .dash-btn { background: transparent; border: 1px solid; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-weight: 600; display: flex; alignItems: center; gap: 5px; }
        .logout-btn { background: transparent; border: none; color: #ef4444; font-weight: bold; cursor: pointer; font-size: 0.9rem; }
        
        .user-profile { display: flex; align-items: center; gap: 10px; padding: 5px 5px 5px 15px; background: rgba(255,255,255,0.05); border-radius: 30px; border: 1px solid rgba(255,255,255,0.1); }
        .user-avatar { width: 32px; height: 32px; border-radius: 50%; overflow: hidden; border: 2px solid #4facfe; }
        .user-avatar img, .avatar-placeholder { width: 100%; height: 100%; object-fit: cover; display: flex; alignItems: center; justify-content: center; background: #334155; color: white; }

        /* Mobile Header Logic */
        .mob-text { display: none; }
        @media (max-width: 768px) {
            .responsive-header { flex-direction: column; gap: 15px; padding: 15px; }
            .desk-text { display: none; }
            .mob-text { display: inline; font-size: 1.2rem; }
            .user-name { display: none; } /* Nascondi nome su mobile */
            .user-profile { padding: 0; background: transparent; border: none; }
            .user-avatar { width: 40px; height: 40px; }
            .logo-text { font-size: 1.2rem; }
        }

        /* Search Section */
        .main-container { position: relative; z-index: 1; padding: 30px 20px; max-width: 1200px; margin: 0 auto; }
        .search-section { text-align: center; margin-bottom: 40px; }
        .search-form { max-width: 600px; margin: 0 auto; position: relative; }
        .search-input { width: 100%; padding: 18px 25px 18px 50px; border-radius: 30px; border: none; font-size: 1.1rem; outline: none; transition: 0.3s; }
        .search-icon { position: absolute; left: 20px; top: 50%; transform: translateY(-50%); font-size: 1.2rem; opacity: 0.6; }
        
        .tabs-container { margin-top: 25px; display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; }
        .tab-btn { padding: 10px 20px; border-radius: 15px; border: none; font-weight: bold; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .tab-btn.active { transform: scale(1.05); box-shadow: 0 8px 20px rgba(79, 172, 254, 0.4); }

        /* Grids Responsive */
        .grid-news { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 25px; }
        .grid-users { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 20px; } /* Più stretti su mobile */
        .grid-pages { display: grid; gap: 20px; }
        .grid-cats { display: flex; flex-wrap: wrap; gap: 15px; justify-content: center; }

        @media (max-width: 480px) {
            .grid-news { grid-template-columns: 1fr; } /* 1 colonna su mobile piccolo */
            .grid-users { grid-template-columns: repeat(2, 1fr); } /* 2 utenti per riga */
            .cat-card { width: 100%; }
        }

        /* Cards Style */
        .card { border-radius: 20px; overflow: hidden; backdrop-filter: blur(10px); transition: transform 0.3s; cursor: pointer; border: 1px solid rgba(255,255,255,0.05); }
        .card:hover { transform: translateY(-5px); box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        
        .news-card .card-img-wrap { height: 180px; overflow: hidden; }
        .news-card img { width: 100%; height: 100%; object-fit: cover; transition: 0.5s; }
        .news-card:hover img { transform: scale(1.1); }
        .card-body { padding: 20px; }
        .card-tag { font-size: 0.7rem; color: #4facfe; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
        .news-card h3 { margin: 10px 0; font-size: 1.1rem; line-height: 1.4; }
        .news-card p { font-size: 0.9rem; opacity: 0.7; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

        .user-card { padding: 20px; text-align: center; display: flex; flex-direction: column; align-items: center; }
        .user-card-img { width: 70px; height: 70px; border-radius: 50%; overflow: hidden; margin-bottom: 10px; border: 2px solid #4facfe; display: flex; justify-content: center; align-items: center; font-size: 1.5rem; background: #334155; color: white; }
        .user-card-img img { width: 100%; height: 100%; object-fit: cover; }
        .user-card h4 { margin: 0; font-size: 1rem; }
        .user-card p { margin: 5px 0 10px 0; opacity: 0.6; font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
        .role-badge { font-size: 0.7rem; padding: 4px 10px; background: rgba(255,255,255,0.1); border-radius: 20px; text-transform: uppercase; font-weight: bold; }

        .page-card { padding: 20px; display: flex; align-items: center; gap: 20px; }
        .page-icon { font-size: 2rem; }
        .page-card h3 { margin: 0; font-size: 1.1rem; }
        .read-btn { margin-left: auto; padding: 8px 15px; border-radius: 10px; background: rgba(255,255,255,0.1); border: none; cursor: pointer; font-weight: bold; }

        .cat-card { padding: 20px 40px; text-align: center; min-width: 150px; flex: 1; }

        /* Animations */
        .fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .loader-container { text-align: center; padding: 50px; }
        .spinner { width: 35px; height: 35px; border: 3px solid rgba(79,172,254,0.3); border-top: 3px solid #4facfe; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const EmptyState = ({ msg }) => (
    <div style={{textAlign:'center', padding:'50px', gridColumn:'1 / -1', opacity:0.6}}>
        <div style={{fontSize:'3rem', marginBottom:'15px'}}>🍃</div>
        <h3>{msg}</h3>
    </div>
);

export default SearchPage;