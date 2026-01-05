import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './App.css';

function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('Verifica del pagamento in corso...');

  useEffect(() => {
    if (!sessionId) { navigate('/dashboard'); return; }

    axios.post('https://murthnews-api.onrender.com/api/verify-payment', { sessionId })
         .then(res => {
             if (res.data.success) {
                 setStatus("Pagamento Confermato! 🎉");
                 localStorage.setItem('reader_user', JSON.stringify(res.data.user));
                 setTimeout(() => navigate('/dashboard'), 2500);
             } else {
                 setStatus("Pagamento non riuscito.");
             }
         })
         .catch(err => setStatus("Errore di connessione."));
  }, [sessionId, navigate]);

  return (
    <div className="auth-container full-layout">
        <div style={{textAlign: 'center', color: '#fff'}}>
            <h1>{status}</h1>
            <div className="loading-spinner" style={{margin:'20px auto', borderColor:'#fff', borderTopColor:'transparent'}}></div>
            <p>Stiamo aggiornando il tuo profilo...</p>
        </div>
    </div>
  );
}

export default PaymentSuccess;