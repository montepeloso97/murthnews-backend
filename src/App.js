import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// --- PAGINE PRINCIPALI ---
import Home from './Home'; // <--- LA TUA NUOVA HOME (Prima/Seconda Pagina)
import NewsPage from './NewsPage'; // Pagina lettura articolo
import RegisterReader from './RegisterReader'; // <--- GESTISCE SIA LOGIN CHE REGISTRAZIONE

// --- PAGINE EXTRA & UTENTE ---
import PageViewer from './PageViewer';
import SearchTotal from './SearchTotal';
import PaymentSuccess from './PaymentSuccess';
import UserSettings from './UserSettings';
import PolicyPage from './PolicyPage';
import WorkWithUs from './WorkWithUs';
import TermsPage from './TermsPage';
import SearchPage from './SearchPage';
import InterestsPage from './InterestsPage';
import UserDashboard from './UserDashboard';
import SubscriptionManager from './SubscriptionManager';
import UserLibrary from './UserLibrary';
import CategoryPage from './CategoryPage';
import CategoriesPage from './CategoriesPage';
import AuthorPage from './AuthorPage';
import OlimpiadiPage from './OlimpiadiPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ================================================= */}
        {/* 🏠 ROTTA PRINCIPALE: ORA PUNTA A HOME (NOTIZIE)   */}
        {/* ================================================= */}
        {/* Se l'utente va su miosito.it vede le notizie, non il login */}
        <Route path="/" element={<Home />} />

        {/* 🔐 LOGIN E REGISTRAZIONE (Usano lo stesso componente) */}
        {/* Se l'utente clicca "Entra" va qui */}
        <Route path="/login" element={<RegisterReader />} />
        <Route path="/register" element={<RegisterReader />} />
        
        {/* 📰 LETTURA ARTICOLO */}
        <Route path="/news/:slug" element={<NewsPage />} />

        {/* 📂 CATEGORIE E AUTORI */}
        <Route path="/category/:name" element={<CategoryPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/author/:id" element={<AuthorPage isDark={false} />} />

        {/* 👤 DASHBOARD UTENTE */}
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/dashboard/subscription" element={<SubscriptionManager />} />
        <Route path="/dashboard/library" element={<UserLibrary />} />
        <Route path="/dashboard/interests" element={<InterestsPage />} />
        <Route path="/reader/settings" element={<UserSettings />} />

        {/* ⚙️ FUNZIONALITÀ EXTRA */}
        <Route path="/search" element={<SearchPage />} />
        <Route path="/search-results" element={<SearchTotal />} />
        <Route path="/p/:slug" element={<PageViewer />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />

        {/* ⚖️ PAGINE LEGALI */}
        <Route path="/policy" element={<PolicyPage />} />
        <Route path="/lavora-con-noi" element={<WorkWithUs />} />
        <Route path="/termini" element={<TermsPage />} />
        <Route path="/olimpiadi" element={<OlimpiadiPage />} />

        {/* ⚠️ FALLBACK (Se la pagina non esiste, torna alla Home) */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;