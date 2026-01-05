import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SiteLogo = ({ theme }) => { 
  const [logoUrl, setLogoUrl] = useState(null);

  useEffect(() => {
    axios.get('http://localhost:5000/api/settings')
      .then(res => { if (res.data && res.data.logoUrl) setLogoUrl(res.data.logoUrl); })
      .catch(() => {});
  }, []);

  const containerStyle = { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' };

  // --- LOGO CARICATO ---
  if (logoUrl) {
    return (
      <div style={containerStyle}>
        <img 
          src={logoUrl} 
          alt="Logo" 
          style={{
            height: '45px', 
            width: 'auto', 
            objectFit: 'contain',
            // 👇 QUESTA È LA RIGA MAGICA PER IL BIANCO/NERO 👇
            filter: theme === 'dark' ? 'invert(1) brightness(2)' : 'none',
            transition: 'filter 0.3s'
          }} 
        />
      </div>
    );
  }

  // --- LOGO DEFAULT (M) ---
  return (
    <div style={containerStyle}>
      <div style={{
        width: '40px', height: '40px', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontWeight: '900', fontSize: '1.4rem'
      }}>M</div>
      <span style={{ fontSize: '1.4rem', fontWeight: '800', color: theme === 'dark' ? 'white' : '#1e293b' }}>
          MurthNews
      </span>
    </div>
  );
};

export default SiteLogo;