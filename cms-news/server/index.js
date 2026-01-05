require('dotenv').config(); // <--- SEMPRE PER PRIMO
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const cloudinary = require('cloudinary').v2; 
const cron = require('node-cron');
const OpenAI = require('openai');
const { getVerificationEmailHtml } = require('./virtual/emailTemplate');


// --- 1. CONFIGURAZIONE STRIPE (NUOVO) ---
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY.trim());
const CLIENT_URL = 'https://www.murthnews.com'; 

// 🔥 AGGIUNGI QUESTA RIGA QUI SOTTO PER IL DEBUG:
console.log(">>> CHECK STRIPE KEY:", process.env.STRIPE_SECRET_KEY ? "✅ Chiave Presente" : "❌ Chiave NON TROVATA (Controlla .env)");

console.log(">>> CHECK ENV RESEND:", process.env.RESEND_API_KEY ? "✅ Chiave Trovata!" : "❌ Chiave NON trovata");

console.log(">>> CHECK ENV RESEND:", process.env.RESEND_API_KEY ? "✅ Chiave Trovata!" : "❌ Chiave NON trovata");

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://www.murthnews.com",
    "https://murthnews.com",
    "https://www.murtheditor.com",
    "https://murtheditor.com"
  ],
  credentials: true
}));

// --- GESTIONE LETTORI (CMS) ---

// 1. OTTIENI TUTTI I LETTORI
app.get('/api/readers', async (req, res) => {
  try {
    // Li ordiniamo dal più recente al più vecchio
    const readers = await Reader.find().sort({ dataIscrizione: -1 });
    res.json(readers);
  } catch (error) {
    res.status(500).json({ message: "Errore recupero lettori" });
  }
});

// 2. ELIMINA LETTORE (Ban)
app.delete('/api/readers/:id', async (req, res) => {
  try {
    await Reader.findByIdAndDelete(req.params.id);
    res.json({ message: "Lettore eliminato con successo." });
  } catch (error) {
    res.status(500).json({ message: "Errore eliminazione" });
  }
});

// --- AGGIORNA PROFILO LETTORE (CON FOTO) ---
app.put('/api/reader/update', async (req, res) => {
    // 1. Aggiungi profileImage qui
    const { id, nome, cognome, password, interessi, theme, profileImage } = req.body; 

    try {
        const reader = await Reader.findById(id);
        if (!reader) return res.status(404).json({ message: "Utente non trovato" });

        if (nome) reader.nome = nome;
        if (cognome) reader.cognome = cognome;
        if (interessi) reader.interessi = interessi; 
        if (theme) reader.theme = theme;

        // 👇 2. LOGICA CARICAMENTO FOTO 👇
        if (profileImage && profileImage.startsWith('data:')) {
            // Se è una nuova foto (Base64), caricala su Cloudinary
            reader.profileImage = await uploadImage(profileImage);
        } else if (profileImage === "") {
            // Se l'utente vuole rimuoverla
            reader.profileImage = "";
        }

        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            reader.password = await bcrypt.hash(password, salt);
        }

        await reader.save();

        const userData = reader.toObject();
        delete userData.password;

        res.json({ success: true, user: userData, message: "Profilo aggiornato!" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Errore aggiornamento profilo" });
    }
});

// --- SCHEMA MENU ---
const MenuSchema = new mongoose.Schema({
  label: { type: String, required: true }, // Es: "Chi Siamo" o "Speciale Elezioni"
  link: { type: String, required: true },  // Es: "/p/chi-siamo" o "/speciale/live"
  type: { type: String, default: 'custom' }, // 'page' o 'custom'
  icon: { type: String, default: '' },
  order: { type: Number, default: 0 }
});
const Menu = mongoose.model('Menu', MenuSchema);

// --- ROTTE MENU ---

// 1. Leggi Menu (Per Header e CMS)
app.get('/api/menu', async (req, res) => {
  try {
    const items = await Menu.find().sort({ order: 1 }); // Ordine di inserimento
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. Aggiungi Voce al Menu (CORRETTO)
app.post('/api/menu', async (req, res) => {
  try {
    // 👇 HO AGGIUNTO 'icon' QUI
    const { label, link, type, icon } = req.body;
    
    const count = await Menu.countDocuments();
    
    // 👇 HO AGGIUNTO 'icon' ANCHE QUI
    const newItem = new Menu({ label, link, type, icon, order: count + 1 });
    
    await newItem.save();
    res.json(newItem);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. Rimuovi Voce dal Menu
app.delete('/api/menu/:id', async (req, res) => {
  try {
    await Menu.findByIdAndDelete(req.params.id);
    res.json({ message: "Voce rimossa" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ROTTA CANCELLAZIONE ACCOUNT (DIRITTO ALL'OBLIO - FIX READER) ---
// 🔥 MODIFICA QUI: Ho cambiato l'URL per non confondersi con lo Staff
app.delete('/api/readers/delete-account/:id', async (req, res) => {
  console.log("--> RICHIESTA OBLIO READER PER ID:", req.params.id);

  try {
    const userId = req.params.id;

    // 1. Cerchiamo nel database dei LETTORI (Reader)
    const reader = await Reader.findById(userId);
    
    if (!reader) {
        console.log("❌ Lettore non trovato nel DB (Probabilmente è un ID Staff, usa l'altra rotta)");
        return res.status(404).json({ message: "Account lettore non trovato." });
    }

    // 2. Cancellazione Stripe (Se esiste un abbonamento attivo)
    if (reader.stripeSubscriptionId && typeof stripe !== 'undefined') {
        try {
            await stripe.subscriptions.cancel(reader.stripeSubscriptionId);
            console.log("✅ Abbonamento Stripe cancellato per:", reader.email);
        } catch (stripeErr) {
            console.log("⚠️ Nota Stripe (non bloccante):", stripeErr.message);
        }
    }

    // 3. Cancellazione definitiva dal Database
    await Reader.findByIdAndDelete(userId);
    console.log("✅ Lettore eliminato dal DB definitivamente.");

    res.json({ message: "Account eliminato correttamente." });

  } catch (error) {
    console.error("❌ ERRORE SERVER GRAVE:", error);
    res.status(500).json({ message: "Errore interno: " + error.message });
  }
});


// --- CONTROLLO EMAIL (SOLO PER LETTORI) ---
app.post('/api/check-email', async (req, res) => {
  const { email } = req.body;

  // 1. Sicurezza: Se l'email è vuota, esci subito
  if (!email || email.trim() === "") {
    return res.json({ exists: false });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();

    // 2. CERCA SOLO NEI LETTORI (Ignora lo Staff/CMS)
    // Usiamo collation per ignorare maiuscole/minuscole
    const reader = await Reader.findOne({ email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') } });

    if (reader) {
      console.log(`>>> CHECK: L'email ${cleanEmail} è già un LETTORE.`);
      return res.json({ exists: true });
    } else {
      console.log(`>>> CHECK: L'email ${cleanEmail} è NUOVA (per i lettori).`);
      return res.json({ exists: false });
    }

  } catch (error) {
    console.error("Errore check:", error);
    return res.json({ exists: false });
  }
});

const SettingsSchema = new mongoose.Schema({
    siteName: { type: String, default: "MurthEditor" },
    weatherCity: { type: String, default: "Riva del Garda" },
    weatherLat: { type: Number, default: 45.88 },
    weatherLon: { type: Number, default: 10.84 },
    dashboardColor: { type: String, default: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" },
    dashboardImage: { type: String, default: "" },

    logoUrl: { type: String, default: "" },
    
    // PREZZI
    pricePremium: { type: Number, default: 1.99 },
    priceFull: { type: Number, default: 5.99 },

    // 👇 AGGIUNGI UNA VIRGOLA QUI ALLA FINE
    areSubscriptionsOpen: { type: Boolean, default: true }, 

    // 👇 POI INCOLLA QUESTI 4 CAMPI NUOVI 👇
    adImage: { type: String, default: "" },       // URL Banner
    adLink: { type: String, default: "" },        // Link destinazione
    adCode: { type: String, default: "" },        // Codice HTML/Script
    isAdActive: { type: Boolean, default: false } // Interruttore ON/OFF
});
const Settings = mongoose.model('Settings', SettingsSchema);

// --- SCHEMA LOG ATTIVITÀ ---
const LogSchema = new mongoose.Schema({
    action: String,      // Es: "Login", "Modifica Settings", "Elimina News"
    user: String,        // Username di chi ha fatto l'azione
    details: String,     // Dettagli extra (es. "Titolo news: Incendio")
    ip: String,          // Indirizzo IP
    createdAt: { type: Date, default: Date.now }
});
const Log = mongoose.model('Log', LogSchema);

// --- FUNZIONE PER CREARE LOG (Da usare nelle altre rotte) ---
const createLog = async (action, user, details, req = null) => {
    try {
        const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : 'Unknown';
        await new Log({ action, user, details, ip }).save();
    } catch(e) { console.error("Errore Log:", e); }
};

// --- ROTTE LOG (API) ---
// --- API LOGS ---
app.get('/api/logs', async (req, res) => {
    const logs = await Log.find().sort({ createdAt: -1 }).limit(100);
    res.json(logs);
});

app.delete('/api/logs', async (req, res) => {
    await Log.deleteMany({});
    createLog("Pulizia Log", "Admin", "Cancellato tutto lo storico", req);
    res.json({ success: true });
});

// 2. Pulisci tutto
app.delete('/api/logs', async (req, res) => {
    try {
        await Log.deleteMany({});
        createLog("Pulizia Log", "Admin", "Cancellato tutto lo storico", req);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Errore server" }); }
});

// --- ROTTE IMPOSTAZIONI ---
// 1. Leggi (se non esiste, ne crea una di default)
app.get('/api/settings', async (req, res) => {
    let settings = await Settings.findOne();
    if (!settings) {
        settings = new Settings();
        await settings.save();
    }
    res.json(settings);
});

app.put('/api/settings', async (req, res) => {
    console.log(">>> RICHIESTA UPDATE SETTINGS RICEVUTA"); 
    
    try {
        let settings = await Settings.findOne();
        if (!settings) settings = new Settings();

        const data = req.body;

        // 1. GESTIONE LOGO (Già presente nel tuo codice...)
        if (data.logoUrl && data.logoUrl.startsWith('data:')) {
             // ... (codice esistente logo)
             const urlLogo = await uploadImage(data.logoUrl);
             if (urlLogo) data.logoUrl = urlLogo;
             else delete data.logoUrl;
        }

        // 2. GESTIONE SFONDO (Già presente nel tuo codice...)
        if (data.dashboardImage && data.dashboardImage.startsWith('data:')) {
             // ... (codice esistente sfondo)
             const urlBg = await uploadImage(data.dashboardImage);
             if (urlBg) data.dashboardImage = urlBg;
             else delete data.dashboardImage;
        }

        // 👇 3. GESTIONE BANNER PUBBLICITARIO (AGGIUNGI QUESTO BLOCCO) 👇
        if (data.adImage && data.adImage.startsWith('data:')) {
            console.log(">>> Trovato nuovo Banner AD (Base64). Caricamento...");
            const urlAd = await uploadImage(data.adImage);
            if (urlAd) {
                data.adImage = urlAd;
            } else {
                delete data.adImage;
            }
        }
        // 👆 FINE BLOCCO AGGIUNTO 👆

        // Aggiorna
        Object.assign(settings, data);
        
        // SALVATAGGIO REALE
        const savedSettings = await settings.save();
        console.log(">>> DATABASE AGGIORNATO.");

        res.json(savedSettings);

    } catch (err) {
        console.error(">>> ERRORE CRITICO SERVER:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- 2. CONFIGURAZIONE OPENAI AGGIUNTA ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
// -----------------------------------------

// 1. CONFIGURAZIONE CLOUDINARY
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Limite alto per gestire foto e gallery (100mb)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(cors());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log(">>> SERVER: MongoDB Connesso!"))
  .catch(err => console.error(">>> SERVER: Errore DB:", err));

// --- HELPER UPLOAD (Versione Debug) ---
const uploadImage = async (imageString) => {
    if (!imageString) return "";
    if (imageString.startsWith("http")) return imageString; // È già un link, tutto ok
    
    try {
        console.log(">>> [CLOUDINARY] Inizio upload immagine..."); // VEDIAMO SE ARRIVA QUI
        
        const result = await cloudinary.uploader.upload(imageString, {
            folder: "murtheditor_uploads", 
        });
        
        console.log(">>> [CLOUDINARY] Successo! URL generato:", result.secure_url);
        return result.secure_url; 
    } catch (err) {
        // QUI VEDRAI L'ERRORE VERO (es. file troppo grande, credenziali sbagliate, ecc.)
        console.error(">>> [CLOUDINARY] ❌ ERRORE GRAVE:", err); 
        return ""; 
    }
};
// --- SCHEMI ---

// 1. CATEGORIE
const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});
const Category = mongoose.model('Category', CategorySchema);

// 2. UTENTI (Aggiornato)
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true }, // Aggiunto unique per sicurezza
  nome: String,
  cognome: String,
  telefono: { type: String, default: "" }, 
  biography: { type: String, default: "" },
  role: { type: String, default: 'reader' }, // <--- Default 'reader' per chi si iscrive da fuori
  followersCount: { type: Number, default: 0 },
  interessi: { type: [String], default: [] }, // <--- NUOVO CAMPO FONDAMENTALE
  hasMediaAccess: { type: Boolean, default: false },
  pendingMediaRequest: { type: Boolean, default: false },
  mediaAccessExpiresAt: { type: Date, default: null },
  profileImage: String, 
  foto: { type: String, default: "" }, 
  theme: { type: String, default: 'light' },
  isBlocked: { type: Boolean, default: false },
  internalEmail: { type: String, default: "" },
  lastActiveAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// ... (Sotto UserSchema) ...

const ReaderSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  nome: String,
  cognome: String,
  livello: { type: String, enum: ['standard', 'abbonato', 'premium'], default: 'standard' },
  interessi: [String],
  dataIscrizione: { type: Date, default: Date.now },
  emailVerificata: { type: Boolean, default: false },

  theme: { type: String, default: 'light' },
  profileImage: { type: String, default: "" },
  savedArticles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'News' }], // 'News' con la N maiuscola
  likedArticles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'News' }], // 'News' con la N maiuscola
  following: [{ type: String }], // Salviamo gli ID come stringhe per semplicità

  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reader' }], // <--- LISTA DI CHI SEGUE
  followersCount: { type: Number, default: 0 },
  followersCount: { type: Number, default: 0 },
  
  // --- CAMPI AGGIUNTI PER IL PIN ---
  verificationPin: { type: String }, 
  verificationPinExpires: { type: Date },
  scadenzaAbbonamento: { type: Date, default: null },
  dataIscrizione: { type: Date, default: Date.now },

  stripeSubscriptionId: { type: String }, 
  isCanceled: { type: Boolean, default: false }
});
const Reader = mongoose.model('Reader', ReaderSchema);

const MediaSchema = new mongoose.Schema({
  data: String, // La foto in base64
  name: String,
  uploader: String,
  createdAt: { type: Date, default: Date.now }
});
const Media = mongoose.model('Media', MediaSchema);

// --- SOSTITUISCI IL TUO NewsSchema CON QUESTO (AGGIORNATO CON IA LAYOUT) ---
const NewsSchema = new mongoose.Schema({
    title: { type: String, required: true },
    subtitle: String,
    summary: String,
    content: String,
    
    coverImage: String,
    coverCaption: String,
    coverCredits: String,
    mediaType: { type: String, default: 'image' },
    gallery: [String],
    bodyVideo: String,
    category: String,
    tags: [String],
    importance: { type: String, enum: ['Normale', 'Rilievo', "Ultim'ora", 'Editoriale'], default: 'Normale' },
    location: String,

    visibility: { type: String, default: 'public' },
    
    slug: { type: String, unique: true }, // Assicurati che sia unique
    isAd: { type: Boolean, default: false },
    isFirstPage: { type: Boolean, default: false },
    isSecondPage: { type: Boolean, default: false },

    // Stato con Programmato incluso
    status: { 
        type: String, 
        enum: ['Pubblicato', 'Bozza', 'In Revisione', 'Rifiutato', 'Programmato'], 
        default: 'Bozza' 
    },


    isLive: { type: Boolean, default: false }, 
    liveUpdates: [{
        text: String,
        time: { type: Date, default: Date.now }
    }],

    attachedNews: [{
        _id: String,
        title: String,
        slug: String,
        coverImage: String
    }],

    rejectionReason: { type: String, default: '' },

    focusKeyword: String,
    seoTitle: String,
    seoDescription: String,
    seoScore: { type: Number, default: 0 },
    
    ogTitle: { type: String, default: '' },
    ogDescription: { type: String, default: '' },
    source: { type: String, default: '' },

    comments: [{
        id: String,
        quote: String,
        text: String,
        author: String,
        date: Date,
        resolved: { type: Boolean, default: false }
    }],

    author: String,
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },

    scheduledAt: { type: Date, default: null },

    // 👇 MODIFICA IA: SOSTITUISCE visualTheme 👇
    layoutConfig: { 
        type: mongoose.Schema.Types.Mixed, 
        default: { mode: 'STANDARD', highlightWords: [], accentColor: '#e11d48' } 
    },
    
    createdAt: { type: Date, default: Date.now },
    lastUpdate: { type: Date, default: Date.now },

    // 👇 CAMPI AGGIUNTI PER IL BLOCCO MODIFICHE 👇
    lockedBy: { type: String, default: null }, 
    lockedAt: { type: Date, default: null }    
});

const News = mongoose.model('News', NewsSchema);

// 4. MESSAGGI (Questo va bene così com'è, non toccarlo)
const MessageSchema = new mongoose.Schema({
  sender: String,
  senderName: String,
  senderRole: String,
  recipient: String,    
  text: String,
  image: String, 
  isNotice: { type: Boolean, default: false },
  read: { type: Boolean, default: false },
  
  folder: { type: String, default: 'inbox' },
  isEmail: { type: Boolean, default: false },
  senderEmail: { type: String, default: "" },
  subject: { type: String, default: "" },
  
  createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);

// --- HELPER & INIT ---
const initCategories = async () => {
  const count = await Category.countDocuments();
  if (count === 0) {
    const defaults = ["Mondo", "Politica", "Cronaca", "Sport", "Tech", "Economia", "Cultura"];
    await Category.insertMany(defaults.map(name => ({ name })));
    console.log(">>> Categorie di default create!");
  }
};
initCategories();

const generateUniqueUsername = async (baseName) => {
  let username = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
  let candidate = username;
  let counter = 1;
  while (await User.findOne({ username: candidate })) { candidate = `${username}${counter}`; counter++; }
  return candidate;
};

// --- FUNZIONE IA ART DIRECTOR & ANALISTA GRAVITÀ ---
const generateLayoutConfig = async (title, subtitle, content) => {
    try {
        const prompt = `
        Sei il Direttore Creativo di un giornale digitale. 
        Analizza la notizia:
        Titolo: "${title}"
        Sottotitolo: "${subtitle}"
        
        1. Determina il LAYOUT_MODE:
           - "IMPACT_HERO": Per guerre, tragedie, breaking news mondiali (Foto enorme, titolo sopra).
           - "MAGAZINE_SPLIT": Per tech, interviste, approfondimenti (Schermo diviso a metà).
           - "MINIMAL_TYPO": Per editoriali, politica, opinioni (Molto bianco, font serif elegante).
           - "VISUAL_STORY": Per sport, natura, viaggi (Foto a tutta larghezza immersiva).
        
        2. Determina la GRAVITY (Gravità della notizia):
           - "CRITICA": Morti, guerre, crolli borse (Colore: #dc2626).
           - "ALTA": Scandali politici, grandi scoperte (Colore: #ea580c).
           - "MEDIA": Cronaca standard, economia (Colore: #2563eb).
           - "NEUTRA/POSITIVA": Tech, cultura, gossip (Colore: #059669 o #7c3aed).

        Rispondi SOLO con un JSON valido:
        {
            "mode": "IMPACT_HERO",
            "gravity": "CRITICA",
            "gravityText": "Alta Tensione", (Una frase di 2 parole che descrive il mood)
            "accentColor": "#codiceHex",
            "highlightWords": ["Parola1", "Parola2"]
        }
        `;

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.6,
            max_tokens: 200
        });

        const jsonString = completion.choices[0].message.content.trim().replace(/```json|```/g, ''); 
        return JSON.parse(jsonString);

    } catch (e) {
        console.error("Errore AI Layout:", e);
        return { mode: 'STANDARD', gravity: 'NEUTRA', gravityText: 'Notizia', accentColor: '#e11d48', highlightWords: [] };
    }
};

// --- ROTTE ---

// --- 1. SCHEMA PAGINE ---
const PageSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true }, // es: "chi-siamo"
  content: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now }
});
const Page = mongoose.model('Page', PageSchema);

// --- 2. ROTTE PAGINE ---

// Crea Pagina
app.post('/api/pages', async (req, res) => {
  try {
    console.log(">>> TENTATIVO CREAZIONE PAGINA:", req.body); 
    const newPage = new Page(req.body);
    await newPage.save();
    console.log(">>> PAGINA SALVATA CON SUCCESSO!");
    res.json(newPage);
  } catch (err) {
    console.error(">>> ERRORE CRITICO DB:", err); 
    if (err.code === 11000) {
        return res.status(400).json({ message: "Esiste già una pagina con questo URL (Slug)." });
    }
    res.status(500).json({ message: "Errore Server: " + err.message });
  }
});

// Aggiorna Pagina
app.put('/api/pages/:id', async (req, res) => {
  try {
    const updated = await Page.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) { res.status(500).json({ message: "Errore aggiornamento" }); }
});

// Cancella Pagina
app.delete('/api/pages/:id', async (req, res) => {
  try {
    await Page.findByIdAndDelete(req.params.id);
    res.json({ message: "Pagina eliminata" });
  } catch (err) { res.status(500).json({ message: "Errore eliminazione" }); }
});

// Leggi Tutte le Pagine
app.get('/api/pages', async (req, res) => {
  try {
    const pages = await Page.find().sort({ updatedAt: -1 });
    res.json(pages);
  } catch (err) { 
    console.error("Errore lettura pagine:", err);
    res.status(500).json({ message: "Errore server lettura" }); 
  }
});

// Rotta per Slug (Pubblico)
app.get('/api/pages/slug/:slugname', async (req, res) => {
  try {
    const page = await Page.findOne({ slug: req.params.slugname });
    if (!page) return res.status(404).json({ message: "Pagina inesistente" });
    res.json(page);
  } catch (err) { 
    res.status(500).json({ message: "Errore server ricerca" }); 
  }
});

// Rotta per ID (Editor)
app.get('/api/pages/edit/:id', async (req, res) => {
  try {
    const page = await Page.findById(req.params.id);
    if (!page) return res.status(404).json({ message: "Pagina non trovata" });
    res.json(page);
  } catch (err) { 
    res.status(500).json({ message: "Errore server recupero ID" }); 
  }
});

// --- REGISTRAZIONE CON PIN (CORRETTA E SENZA ERRORI) ---
app.post('/api/register', async (req, res) => {
  const { email, nome, cognome, password, livello } = req.body;

  console.log(">>> REGISTRAZIONE UTENTE:", email);

  try {
    // 1. Controllo se l'utente esiste già
    const existing = await Reader.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email già registrata." });

    // 2. Recupero impostazioni (con fallback di sicurezza se fallisce)
    let currentPricePremium = 1.99;
    let currentPriceFull = 5.99;
    
    try {
        const settings = await Settings.findOne();
        if (settings) {
            currentPricePremium = settings.pricePremium;
            currentPriceFull = settings.priceFull;
        }
    } catch (err) {
        console.log(">>> Info: Impossibile leggere settings, uso prezzi default.");
    }

    // 3. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Logica Livello
    let dbLevel = 'standard';
    let displayPlan = 'Free Account'; 

    const livelloSafe = String(livello || "").toLowerCase();

    if (livelloSafe === 'premium') { 
        dbLevel = 'premium'; 
        displayPlan = `Premium (€${currentPricePremium}/mese)`; 
    }
    else if (livelloSafe === 'abbonamento' || livelloSafe === 'abbonato' || livelloSafe === 'full') { 
        dbLevel = 'abbonato'; 
        displayPlan = `Full Pass (€${currentPriceFull}/mese)`; 
    }

    // 5. Calcolo Scadenza
    let scadenza = null;
    if (dbLevel === 'premium' || dbLevel === 'abbonato') {
        const oggi = new Date();
        scadenza = new Date(oggi.setDate(oggi.getDate() + 30));
    }

    // 6. Genera PIN
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 3600000); 

    // 7. Salva nel Database
    const newReader = new Reader({
      email, nome, cognome,
      password: hashedPassword,
      livello: dbLevel,
      verificationPin: pin,
      verificationPinExpires: expires,
      emailVerificata: false,
      scadenzaAbbonamento: scadenza 
    });

    await newReader.save();

    // 8. Invia Email (HTML DIRETTO per evitare errori di import)
    console.log(">>> INVIO EMAIL PIN A:", email);
    
    try {
      await resend.emails.send({
        from: 'Info@murtheditor.com', // Assicurati che questo dominio sia verificato su Resend, altrimenti usa 'onboarding@resend.dev'
        to: [email],
        subject: `Codice di Verifica: ${pin}`,
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h1 style="color: #2563eb;">Benvenuto in MurthNews!</h1>
                <p>Ciao ${nome}, grazie per esserti registrato.</p>
                <p>Il tuo codice di verifica è:</p>
                <h2 style="background: #f3f4f6; padding: 10px; display: inline-block; letter-spacing: 5px; border-radius: 8px;">${pin}</h2>
                <p>Piano selezionato: <strong>${displayPlan}</strong></p>
                <br/>
                <small>Se non sei stato tu, ignora questa email.</small>
            </div>
        `
      });
    } catch (e) { 
      console.error("❌ ERRORE RESEND (L'utente è stato comunque salvato):", e.response?.data || e.message); 
      // Non blocchiamo la registrazione se l'email fallisce, ma lo notifichiamo nel log
    }

    res.status(201).json({ message: "Registrazione completata, controlla l'email per il PIN." });

  } catch (error) {
    console.error(">>> ERRORE CRITICO SERVER:", error); // Guarda qui nel terminale se fallisce ancora
    res.status(500).json({ message: "Errore interno del server: " + error.message });
  }
});

// --- NUOVA ROTTA: RINVIA PIN ---
app.post('/api/resend-pin', async (req, res) => {
  const { email } = req.body;
  try {
    const reader = await Reader.findOne({ email });
    if (!reader) return res.status(404).json({ message: "Utente non trovato." });

    // Genera nuovo PIN
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    reader.verificationPin = newPin;
    reader.verificationPinExpires = new Date(Date.now() + 3600000); // +1 ora
    await reader.save();

    // Ricalcola il nome del piano per l'email (estetica)
    let planDisplay = "Piano Standard";
    if (reader.livello === 'premium') planDisplay = "Premium";
    if (reader.livello === 'abbonato') planDisplay = "Full Abbonamento";

    // Invia Email
    const emailHtml = getVerificationEmailHtml(newPin, reader.nome, planDisplay);
    await resend.emails.send({
        from: 'Info@murtheditor.com',
        to: [email],
        subject: `Nuovo codice di verifica: ${newPin}`,
        html: emailHtml
    });

    res.json({ success: true, message: "Codice rinviato!" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Errore invio" });
  }
});

// --- NUOVA ROTTA: VERIFICA PIN (CORRETTA) ---
app.post('/api/verify-pin', async (req, res) => {
  const { email, pin } = req.body;

  try {
    const reader = await Reader.findOne({ email });
    if (!reader) return res.status(404).json({ message: "Utente non trovato." });

    // Controlla se il PIN corrisponde e non è scaduto
    if (reader.verificationPin !== pin) {
      return res.status(400).json({ message: "PIN non valido." });
    }
    if (reader.verificationPinExpires < Date.now()) {
      return res.status(400).json({ message: "PIN scaduto. Registrati di nuovo." });
    }

    // Se OK: Verifica l'utente e pulisci il PIN
    reader.emailVerificata = true;
    reader.verificationPin = undefined;
    reader.verificationPinExpires = undefined;
    await reader.save();

    // Login automatico: Genera Token
    const token = jwt.sign({ id: reader._id, role: 'reader' }, "SEGRETISSIMO", { expiresIn: '7d' });

    // 🔥 FIX: Inviamo TUTTO l'oggetto reader (così include le date!)
    const readerData = reader.toObject();
    delete readerData.password; // Rimuoviamo la password per sicurezza

    res.json({ 
      success: true, 
      token, 
      user: readerData // <--- ORA CONTIENE dataIscrizione E scadenzaAbbonamento
    });

  } catch (error) {
    res.status(500).json({ message: "Errore verifica" });
  }
});


// --- LOGIN UNIFICATO (CORRETTO) ---
app.post('/api/login', async (req, res) => {
  const { email, password, username } = req.body;

  try {
    // CASO A: LOGIN ADMIN (Usa username)
    if (username) {
       const user = await User.findOne({ username });
       if (!user) return res.status(404).json({ message: "Admin non trovato" });
       
       const isMatch = await bcrypt.compare(password, user.password);
       if (!isMatch) return res.status(400).json({ message: "Password errata" });

       const token = jwt.sign({ id: user._id, role: user.role }, "SEGRETISSIMO", { expiresIn: '1d' });
       return res.json({ token, user: { ...user.toObject(), password: undefined } });
    }

    // CASO B: LOGIN LETTORE (Usa email)
    if (email) {
      const reader = await Reader.findOne({ email });
      if (!reader) return res.status(404).json({ message: "Utente non trovato." });

      const isMatch = await bcrypt.compare(password, reader.password);
      if (!isMatch) return res.status(400).json({ message: "Password errata." });

      const token = jwt.sign({ id: reader._id, role: 'reader' }, "SEGRETISSIMO", { expiresIn: '7d' });
      
      // 🔥 FIX: Inviamo TUTTO l'oggetto reader
      const readerData = reader.toObject();
      delete readerData.password; // Rimuoviamo la password per sicurezza

      return res.json({ 
        token, 
        user: readerData // <--- ORA CONTIENE dataIscrizione E scadenzaAbbonamento
      });
    }

    return res.status(400).json({ message: "Dati mancanti (serve email o username)" });

  } catch (err) {
    console.error("Errore Login:", err);
    res.status(500).json({ message: "Errore server login." });
  }
});

// --- AGGIORNA PIANO UTENTE ---
app.put('/api/user/update-plan', async (req, res) => {
  const { email, newLevel } = req.body;

  try {
    const reader = await Reader.findOne({ email });
    if (!reader) return res.status(404).json({ message: "Utente non trovato" });

    // 1. Aggiorna Livello
    reader.livello = newLevel;

    // 2. Gestione Scadenza
    if (newLevel === 'premium' || newLevel === 'abbonato') {
        const oggi = new Date();
        // Rinnova per 30 giorni da oggi
        reader.scadenzaAbbonamento = new Date(oggi.setDate(oggi.getDate() + 30));
    } else {
        // Se torna Free, rimuovi scadenza
        reader.scadenzaAbbonamento = null;
    }

    await reader.save();

    // INVIO EMAIL DOWNGRADE
    try {
        await resend.emails.send({
            from: 'Info@murtheditor.com',
            to: [reader.email],
            subject: 'Il tuo piano è ora Free',
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2>Ciao ${reader.nome},</h2>
                    <p>Ti confermiamo che il tuo account è stato aggiornato al piano <strong>Free Start</strong>.</p>
                    <p>Non hai più accesso ai contenuti Premium/Full, ma puoi continuare a leggere le notizie gratuite.</p>
                    <br/>
                    <p>Speriamo di rivederti presto tra gli abbonati!</p>
                </div>
            `
        });
    } catch (e) { console.error("Errore invio email downgrade:", e); }

    // Ritorna l'utente aggiornato (senza password)
    const userData = reader.toObject();
    delete userData.password;

    res.json({ success: true, user: userData, message: "Piano aggiornato con successo!" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Errore aggiornamento piano" });
  }
});

app.post('/api/users/create', async (req, res) => {
  try {
    // Aggiungo profileImage al destructuring
    const { nome, cognome, email, role, biography, foto, profileImage, telefono } = req.body;
    
    if (!nome || !cognome || !email) return res.status(400).json({ message: "Dati mancanti." });
    
    const baseName = `${nome}${cognome}`;
    const username = await generateUniqueUsername(baseName);
    const plainPassword = Math.random().toString(36).slice(-10);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);
    
    // Carichiamo l'immagine su Cloudinary se è base64
    let finalPhotoUrl = "";
    // Se arriva foto o profileImage, usiamo quella
    const imgToUpload = profileImage || foto; 

    if (imgToUpload && imgToUpload.startsWith('data:')) {
        finalPhotoUrl = await uploadImage(imgToUpload);
    } else {
        finalPhotoUrl = imgToUpload || "";
    }

    const newUser = new User({ 
        username, 
        password: hashedPassword, 
        email, 
        nome, 
        cognome, 
        role, 
        biography: biography || "", 
        telefono: telefono || "", 
        isBlocked: false, 
        theme: 'light',
        
        // *** SALVA IN ENTRAMBI I CAMPI ***
        foto: finalPhotoUrl, 
        profileImage: finalPhotoUrl 
    });
    
    await newUser.save();
    try { await resend.emails.send({ from: 'onboarding@resend.dev', to: email, subject: 'Benvenuto', html: `<p>User: ${username} Pass: ${plainPassword}</p>` }); } catch (e) {}
    res.json({ message: "Creato", username });
  } catch (err) { 
      console.error(err);
      res.status(500).json({ message: "Errore creazione: " + err.message }); 
  }
});

// 1. Leggi tutti gli utenti
app.get('/api/users', async (req, res) => { 
    const users = await User.find({}, '-password'); 
    res.json(users); 
});

// 2. NUOVA ROTTA: Lista Utenti Online (Attivi negli ultimi 5 minuti)
app.get('/api/users/online', async (req, res) => {
    try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        // Cerca chi ha lastActiveAt maggiore di 5 minuti fa
        const onlineUsers = await User.find({ lastActiveAt: { $gte: fiveMinutesAgo } })
                                      .select('nome foto profileImage username role');
        res.json(onlineUsers);
    } catch (err) {
        res.status(500).json([]);
    }
});

// 3. Leggi Utente singolo + AGGIORNA STATO (Heartbeat)
app.get('/api/users/:id', async (req, res) => { 
    // Prima di restituire i dati, aggiorniamo l'orario "lastActiveAt"
    await User.findByIdAndUpdate(req.params.id, { lastActiveAt: new Date() });
    
    const user = await User.findById(req.params.id, '-password'); 
    res.json(user); 
});

// 4. Aggiorna Utente (CON FIX FOTO E CLOUDINARY)
app.put('/api/users/:id', async (req, res) => { 
    try {
        const updates = req.body; 
        
        // Gestione Password
        if(updates.password && updates.password.trim() !== "") { 
            updates.password = await bcrypt.hash(updates.password, 10); 
        } else { 
            delete updates.password; 
        }

        // *** FIX FOTO: Sincronizza i due campi ***
        // Controlliamo se è arrivata una nuova immagine (in uno dei due campi)
        const incomingImg = updates.profileImage || updates.foto;
        
        if (incomingImg) {
            // Se è una stringa Base64 (nuova foto caricata), facciamo l'upload
            if (incomingImg.startsWith('data:')) {
                const uploadedUrl = await uploadImage(incomingImg);
                updates.profileImage = uploadedUrl;
                updates.foto = uploadedUrl; 
            } else {
                // Se è già un URL (non cambiata), allineiamo comunque i campi
                updates.profileImage = incomingImg;
                updates.foto = incomingImg;
            }
        }

        const user = await User.findByIdAndUpdate(req.params.id, updates, {new:true}); 
        res.json({message:"Ok", user}); 
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Errore aggiornamento" });
    }
});

// 3. Elimina Utente Staff (Redattore/Admin)
app.delete('/api/users/:id', async (req, res) => { 
    console.log(">>> RICHIESTA ELIMINAZIONE STAFF (USER):", req.params.id);
    
    try {
        // Usa il modello 'User' (Staff), NON 'Reader'
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        
        if (!deletedUser) {
            console.log("❌ Utente Staff non trovato con questo ID.");
            return res.status(404).json({ message: "Utente Staff non trovato." });
        }

        console.log("✅ Utente Staff eliminato:", deletedUser.username);
        res.json({ message: "Eliminato con successo." }); 
    } catch (err) {
        console.error("Errore server eliminazione:", err);
        res.status(500).json({ message: "Errore eliminazione" });
    }
});

// --- LEGGI PROFILO COMPLETO (Per la scheda utente dettagliata) ---
app.get('/api/users/profile/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Utente non trovato" });
    
    const userData = { 
        _id: user._id, 
        username: user.username, 
        nome: user.nome, 
        cognome: user.cognome, 
        role: user.role, 
        biography: user.biography, 
        foto: user.foto, 
        profileImage: user.profileImage || user.foto,
        createdAt: user.createdAt,

        // --- NUOVI CAMPI PER LA SCHEDA DETTAGLIATA ---
        email: user.email,             // Email registrazione
        internalEmail: user.internalEmail, // Webmail
        telefono: user.telefono        // Cellulare
    };
    
    res.json(userData);
  } catch (err) { res.status(500).json({ message: "Errore server" }); }
});

// --- CATEGORIE ---
app.get('/api/categories', async (req, res) => { try { const cats = await Category.find().sort({ name: 1 }); res.json(cats); } catch(err) { res.status(500).json({message: "Errore server"}); } });
app.post('/api/categories', async (req, res) => { try { const { name } = req.body; if (!name) return res.status(400).json({ message: "Nome mancante" }); const existing = await Category.findOne({ name }); if (existing) return res.status(400).json({ message: "Già esistente" }); const newCat = new Category({ name }); await newCat.save(); res.json(newCat); } catch (err) { res.status(500).json({ message: "Errore creazione" }); } });
app.delete('/api/categories/:id', async (req, res) => { try { await Category.findByIdAndDelete(req.params.id); res.json({ message: "Eliminata" }); } catch (err) { res.status(500).json({ message: "Errore cancellazione" }); } });


// ==========================================
// SEZIONE MESSAGGI & EMAIL (FIX COMPLETO)
// ==========================================

// 1. LEGGI MESSAGGI (GET) - Case Insensitive & Regex
app.get('/api/messages', async (req, res) => {
  try {
    const { username } = req.query; 
    if (!username) return res.json([]); 

    console.log(`>>> RICHIESTA MESSAGGI PER: ${username}`);
    const userRegex = new RegExp(`^${username}$`, 'i');

    const messages = await Message.find({
        $or: [
            { sender: { $regex: userRegex } },
            { recipient: { $regex: userRegex } },
            { recipient: 'global' }
        ]
    }).sort({ createdAt: -1 });
    
    console.log(`>>> TROVATI ${messages.length} MESSAGGI.`);
    res.json(messages);
  } catch (err) {
    console.error("Errore lettura messaggi:", err);
    res.status(500).json({ message: "Errore nel recupero messaggi" });
  }
});

// 2. INVIA NUOVO MESSAGGIO (POST)
app.post('/api/messages', async (req, res) => {
  try {
    const data = req.body;
    
    // Upload Immagine
    if (data.image) data.image = await uploadImage(data.image);

    // Pulizia Destinatario (Minuscolo e Trim)
    let cleanRecipient = (data.recipient || 'global').trim().toLowerCase();

    const newMessage = new Message({
      sender: data.sender,
      senderName: data.senderName,
      senderRole: data.senderRole,
      recipient: cleanRecipient, 
      text: data.text,
      image: data.image || "", 
      isNotice: data.isNotice || false,
      read: false,
      folder: 'inbox', 
      
      // Campi Email
      isEmail: data.isEmail || false,
      senderEmail: data.senderEmail || "",
      subject: data.subject || "(Nessun Oggetto)",
      
      createdAt: new Date()
    });

    const saved = await newMessage.save();
    console.log(`>>> MESSAGGIO INVIATO A: ${cleanRecipient}`);
    res.status(201).json(saved);
  } catch (err) { 
    console.error("Errore invio:", err);
    res.status(500).json({ message: "Errore database invio messaggio" }); 
  }
});

// 3. AGGIORNA CARTELLE / READ (PUT)
app.put('/api/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body; // { folder: 'trash' } oppure { read: true }
    
    console.log(`>>> UPDATE MSG ${id} CON:`, updates);

    const updatedMessage = await Message.findByIdAndUpdate(id, updates, { new: true });

    if (!updatedMessage) return res.status(404).json({ message: "Messaggio non trovato" });
    
    res.json(updatedMessage);
  } catch (err) {
    console.error(">>> ERRORE AGGIORNAMENTO:", err);
    res.status(500).json({ message: "Errore server aggiornamento" });
  }
});

// 4. ELIMINA DEFINITIVAMENTE (DELETE)
app.delete('/api/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`>>> ELIMINAZIONE HARD MSG: ${id}`);
    const deleted = await Message.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Messaggio non trovato" });
    res.json({ message: "Messaggio eliminato definitivamente" });
  } catch (err) {
    res.status(500).json({ message: "Errore eliminazione messaggio" });
  }
});

// 5. ELIMINA CONVERSAZIONE (DELETE)
app.delete('/api/messages/conversation/:partner', async (req, res) => {
  try {
    const { partner } = req.params;     
    const { username } = req.query;     
    if (!username || !partner) return res.status(400).json({ message: "Dati mancanti" });

    const userRegex = new RegExp(`^${username}$`, 'i');
    const partnerRegex = new RegExp(`^${partner}$`, 'i');

    await Message.deleteMany({
      $or: [
        { sender: { $regex: userRegex }, recipient: { $regex: partnerRegex } },
        { sender: { $regex: partnerRegex }, recipient: { $regex: userRegex } }
      ]
    });
    res.json({ message: "Conversazione eliminata" });
  } catch (err) {
    res.status(500).json({ message: "Errore eliminazione chat" });
  }
});

// 6. SEGNA CHAT COME LETTA (PUT)
app.put('/api/messages/read/:partner', async (req, res) => {
  try {
    const { partner } = req.params;     
    const { username } = req.body;      

    await Message.updateMany(
      { sender: partner, recipient: username, read: false },
      { $set: { read: true } }
    );
    res.json({ message: "Messaggi segnati come letti" });
  } catch (err) {
    res.status(500).json({ message: "Errore aggiornamento letti" });
  }
});


// --- 1. NUOVO SCHEMA BREAKING NEWS ---
const BreakingSchema = new mongoose.Schema({
  text: { type: String, required: true }, // Il testo dell'alert
  link: { type: String, default: "" },    // Il link (opzionale)
  createdAt: { type: Date, default: Date.now }
});
const Breaking = mongoose.model('Breaking', BreakingSchema);

// --- 2. ROTTE PER GESTIRE LE BREAKING NEWS ---

// CREA UNA NUOVA BREAKING NEWS
app.post('/api/breaking', async (req, res) => {
  try {
    const { text, link } = req.body;
    const newAlert = new Breaking({ text, link });
    await newAlert.save();
    res.json(newAlert);
  } catch (err) { res.status(500).json({ message: "Errore creazione alert" }); }
});

// LEGGI LE BREAKING NEWS (Ultime 5)
app.get('/api/breaking', async (req, res) => {
  try {
    // Prende le ultime 5 in ordine di tempo
    const alerts = await Breaking.find().sort({ createdAt: -1 }).limit(5);
    res.json(alerts);
  } catch (err) { res.status(500).json({ message: "Errore lettura alert" }); }
});

// CANCELLA UNA BREAKING NEWS
app.delete('/api/breaking/:id', async (req, res) => {
  try {
    await Breaking.findByIdAndDelete(req.params.id);
    res.json({ message: "Alert eliminato" });
  } catch (err) { res.status(500).json({ message: "Errore eliminazione" }); }
});

// --- NEWS (CRUD + UPLOAD) ---
app.get('/api/news', async (req, res) => { try { const { author } = req.query; const filter = author ? { author: author } : {}; const news = await News.find(filter).sort({ createdAt: -1 }); res.json(news); } catch (err) { res.status(500).json({ message: "Errore server" }); } });
app.get('/api/news/:id', async (req, res) => { try { const article = await News.findById(req.params.id); if(!article) return res.status(404).json({message: "Non trovato"}); res.json(article); } catch(err) { res.status(500).json({message: "Errore server"}); } });
app.delete('/api/news/:id', async (req, res) => { try { await News.findByIdAndDelete(req.params.id); res.json({message: "Eliminato"}); } catch(err) { res.status(500).json({message: "Errore eliminazione"}); } });

// --- SISTEMA DI BLOCCO ARTICOLI (LOCKING) ---
// 👇 INCOLLA QUESTO PRIMA DI app.post('/api/news'...) 👇

// 1. Tenta di BLOCCARE l'articolo
app.post('/api/news/lock/:id', async (req, res) => {
    try {
        const { username } = req.body;
        const article = await News.findById(req.params.id);
        
        if (!article) return res.status(404).json({ msg: "Non trovato" });

        const now = new Date();
        
        // Se l'articolo ha un lock
        if (article.lockedBy && article.lockedAt) {
            // Calcola da quanto tempo è bloccato
            const diffMins = (now - new Date(article.lockedAt)) / 1000 / 60;
            
            // Se è bloccato da UN ALTRO UTENTE ed è recente (< 5 min)
            if (article.lockedBy !== username && diffMins < 5) {
                // RITORNA FALSE: È BLOCCATO!
                return res.json({ 
                    success: false, 
                    lockedBy: article.lockedBy 
                });
            }
        }

        // ALTRIMENTI: Bloccalo per me (o rinnova il mio blocco)
        article.lockedBy = username;
        article.lockedAt = now;
        await article.save();

        res.json({ success: true });

    } catch (e) { 
        console.error("Errore Lock:", e);
        res.status(500).json({ error: e.message }); 
    }
});

// 2. SBLOCCA l'articolo
app.post('/api/news/unlock/:id', async (req, res) => {
    try {
        const { username } = req.body;
        const article = await News.findById(req.params.id);

        // Sblocco solo se ero io il proprietario del lock
        if (article && article.lockedBy === username) {
            article.lockedBy = null;
            article.lockedAt = null;
            await article.save();
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
// ----------------------------------------------------

// CREA NEWS (Con Log Attività)
app.post('/api/news', async (req, res) => {
  try {
    const data = req.body; 

    // --- FIX CORRETTO: Usa 'data' ---
    if (data.scheduledAt && new Date(data.scheduledAt) > new Date() && data.status !== 'Bozza') {
        data.status = 'Programmato';
    }
    // --------------------------------

    // Upload Cover
    if (data.coverImage) data.coverImage = await uploadImage(data.coverImage);
    
    // Upload Gallery
    if (data.gallery && data.gallery.length > 0) {
        data.gallery = await Promise.all(data.gallery.map(img => uploadImage(img)));
    }

    // Crea Categoria
    if (data.category) { 
        const catExists = await Category.findOne({ name: data.category }); 
        if (!catExists) await Category.create({ name: data.category }); 
    }

    // Crea Slug
    if(!data.slug && data.title) {
        data.slug = data.title.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }

    if (!data.layoutConfig || !data.layoutConfig.mode) {
        console.log("🎨 L'IA sta disegnando il layout per:", data.title);
        data.layoutConfig = await generateLayoutConfig(data.title, data.subtitle, data.content);
    }

    const newArticle = new News(data);
    await newArticle.save();

    // 👇 LOG ATTIVITÀ: CREAZIONE 👇
    createLog("Creazione Articolo", data.author || "Redazione", `Titolo: ${data.title}`, req);

    res.json(newArticle);
  } catch (err) { 
      console.error(err);
      res.status(500).json({ message: "Errore server: " + err.message }); 
  }
});

// AGGIORNA NEWS (Con Log Attività)
app.put('/api/news/:id', async (req, res) => {
    try {
        const updateData = req.body;
        updateData.lastUpdate = new Date(); // Reset timer 3 ore
        // Recuperiamo l'articolo vecchio per il log (opzionale, ma utile)
        const oldNews = await News.findById(req.params.id);

        // --- FIX LOGICA PROGRAMMAZIONE ---
        if (updateData.scheduledAt && new Date(updateData.scheduledAt) > new Date() && updateData.status !== 'Bozza') {
            updateData.status = 'Programmato';
        }
        // ---------------------------------

        // Upload Cover
        if (updateData.coverImage && updateData.coverImage.startsWith('data:')) {
            updateData.coverImage = await uploadImage(updateData.coverImage);
        }
        
        // Upload Gallery
        if (updateData.gallery && updateData.gallery.length > 0) {
             const processedGallery = await Promise.all(updateData.gallery.map(img => 
                 img.startsWith('data:') ? uploadImage(img) : img
             ));
             updateData.gallery = processedGallery;
        }

        // 👇 CORREZIONE IA: RICALCOLO LAYOUT COMPLETO 👇
        if (updateData.title || updateData.subtitle || updateData.content) {
             const currentTitle = updateData.title || oldNews.title;
             const currentSub = updateData.subtitle || (oldNews.subtitle || "");
             const currentContent = updateData.content || (oldNews.content || "");
             
             console.log("🎨 Ricalcolo Layout IA (Art Director) per modifica...");
             // Chiamiamo la nuova funzione generateLayoutConfig e salviamo in layoutConfig
             updateData.layoutConfig = await generateLayoutConfig(currentTitle, currentSub, currentContent);
        }
        // 👆 FINE CORREZIONE 👆

        const updated = await News.findByIdAndUpdate(req.params.id, updateData, {new: true});

        // 👇 LOG ATTIVITÀ: MODIFICA 👇
        const author = updateData.author || (oldNews ? oldNews.author : "Redattore");
        createLog("Modifica Articolo", author, `Modificato: ${oldNews ? oldNews.title : 'Articolo'}`, req);

        res.json(updated);
    } catch(err) { 
        console.error("Errore Update:", err);
        res.status(500).json({message: "Errore aggiornamento: " + err.message}); 
    }
});

// ELIMINA NEWS (Mancava nel tuo snippet, aggiungilo per tracciare le cancellazioni!)
app.delete('/api/news/:id', async (req, res) => {
    try {
        const newsToDelete = await News.findById(req.params.id);
        if (newsToDelete) {
            await News.findByIdAndDelete(req.params.id);
            // 👇 LOG ATTIVITÀ: CANCELLAZIONE 👇
            createLog("Eliminazione Articolo", "Admin", `Cancellato: ${newsToDelete.title}`, req);
        }
        res.json({ message: "Articolo eliminato" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// AGGIUNGI UN AGGIORNAMENTO LIVE (Timeline)
app.post('/api/news/:id/live-update', async (req, res) => {
    try {
        const { text } = req.body;
        
        // Validazione base: se il testo è vuoto, non salvare nulla
        if (!text || text.trim() === "") {
            return res.status(400).json({ message: "Il testo dell'aggiornamento non può essere vuoto" });
        }

        const article = await News.findById(req.params.id);
        if (!article) return res.status(404).json({ message: "News non trovata" });

        // Aggiungi l'aggiornamento (pulendo gli spazi extra all'inizio e alla fine)
        article.liveUpdates.push({ 
            text: text.trim(), 
            time: new Date() 
        });
        
        // Se aggiungo un aggiornamento, attivo automaticamente la diretta
        article.isLive = true; 
        article.lastUpdate = new Date(); // Reset timer 3 ore per la diretta

        await article.save();
        res.json(article);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- INTERRUTTORE DIRETTA (ON/OFF) ---
app.put('/api/news/:id/toggle-live', async (req, res) => {
    try {
        const { isLive } = req.body; // Riceve true o false
        
        const article = await News.findByIdAndUpdate(
            req.params.id,
            { isLive: isLive }, // Aggiorna SOLO questo campo
            { new: true }
        );
        
        console.log(`>>> DIRETTA ${isLive ? 'ATTIVATA' : 'DISATTIVATA'} PER: ${article.title}`);
        res.json(article);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ELIMINA AGGIORNAMENTO LIVE
app.delete('/api/news/:id/live-update/:updateId', async (req, res) => {
    try {
        const { id, updateId } = req.params;
        
        // Usiamo $pull per rimuovere l'elemento specifico dall'array tramite il suo _id
        const article = await News.findByIdAndUpdate(
            id,
            { $pull: { liveUpdates: { _id: updateId } } },
            { new: true } // Restituisce l'articolo aggiornato
        );
        res.json(article);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- GESTIONE MEDIA LIBRARY (Con Log) ---

// 1. Carica foto
app.post('/api/media', async (req, res) => {
    try {
        const newMedia = new Media(req.body);
        await newMedia.save();
        // Log Upload
        createLog("Upload Media", "Utente", "Caricata nuova foto in galleria", req);
        res.json(newMedia);
    } catch(e) { res.status(500).json({error:e.message}); }
});

// 2. Leggi foto
app.get('/api/media', async (req, res) => {
    const media = await Media.find().sort({ createdAt: -1 });
    res.json(media);
});

// 3. Elimina foto
app.delete('/api/media/:id', async (req, res) => {
    await Media.findByIdAndDelete(req.params.id);
    // Log Eliminazione Media
    createLog("Eliminazione Media", "Admin", "Rimossa foto dalla galleria", req);
    res.json({message:'Deleted'});
});

// --- GESTIONE PERMESSI (Con Log) ---

// Utente chiede accesso
app.post('/api/media/request', async (req, res) => {
    const { userId } = req.body;
    await User.findByIdAndUpdate(userId, { pendingMediaRequest: true });
    
    const msg = new Message({
        sender: 'SISTEMA', senderName: 'SISTEMA', recipient: 'notices',
        text: `🔐 RICHIESTA ACCESSO MEDIA: Un utente ha chiesto di accedere alla galleria.`,
        isNotice: true
    });
    await msg.save();
    res.json({message:'Richiesta inviata'});
});

// Redattore approva/rifiuta
app.post('/api/media/approve', async (req, res) => {
    const { userId, allow } = req.body;
    
    let updates = { pendingMediaRequest: false };
    const userTarget = await User.findById(userId);

    if (allow) {
        updates.hasMediaAccess = true;
        updates.mediaAccessExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); 
        // Log Approvazione
        createLog("Permessi Media", "Redattore", `Concesso accesso a: ${userTarget ? userTarget.nome : userId}`, req);
    } else {
        updates.hasMediaAccess = false;
        updates.mediaAccessExpiresAt = null;
        // Log Rifiuto
        createLog("Permessi Media", "Redattore", `Negato accesso a: ${userTarget ? userTarget.nome : userId}`, req);
    }

    await User.findByIdAndUpdate(userId, updates);
    res.json({message:'Permessi aggiornati'});
});

// --- AUTOMAZIONE: CRON JOB (Ogni minuto) ---
cron.schedule('* * * * *', async () => {
    const now = new Date();
    try {
        // 1. PUBBLICAZIONE NEWS PROGRAMMATE
        // (Usiamo updateMany che è più efficiente del ciclo for)
        const published = await News.updateMany(
            { status: 'Programmato', scheduledAt: { $lte: now } },
            { $set: { status: 'Pubblicato' } }
        );
        if (published.modifiedCount > 0) {
            console.log(`🚀 PUBBLICATO AUTOMATICAMENTE: ${published.modifiedCount} articoli.`);
            createLog("Pubblicazione Auto", "Sistema", `Pubblicati ${published.modifiedCount} articoli`);
        }

        // 2. REVOCA PERMESSI MEDIA SCADUTI (STAFF)
        const expiredStaff = await User.updateMany(
            { hasMediaAccess: true, mediaAccessExpiresAt: { $lte: now } },
            { $set: { hasMediaAccess: false, mediaAccessExpiresAt: null } }
        );
        if (expiredStaff.modifiedCount > 0) {
            console.log(`🔒 REVOCATI PERMESSI MEDIA A ${expiredStaff.modifiedCount} UTENTI STAFF.`);
        }

        // 👇 3. NUOVO: DOWNGRADE ABBONAMENTI LETTORI SCADUTI 👇
        const expiredReaders = await Reader.updateMany(
            { 
                livello: { $ne: 'standard' },     // Prendi chi NON è free
                scadenzaAbbonamento: { $lt: now } // E la cui data è passata (ieri o prima)
            },
            { 
                $set: { livello: 'standard', scadenzaAbbonamento: null } // Rimetti Free
            }
        );

        if (expiredReaders.modifiedCount > 0) {
            console.log(`📉 DOWNGRADE AUTO: ${expiredReaders.modifiedCount} abbonamenti scaduti riportati a Free.`);
        }

    } catch (err) { console.error("❌ Errore Cron Job:", err); }
});

// LISTA UTENTI ONLINE
app.get('/api/users/online', async (req, res) => {
    try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const onlineUsers = await User.find({ lastActiveAt: { $gte: fiveMinutesAgo } })
                                      .select('nome foto profileImage username role');
        res.json(onlineUsers);
    } catch (err) { res.status(500).json([]); }
});

// --- ROTTA IA: MAGIC TITLE GENERATOR ---
app.post('/api/generate-ai-title', async (req, res) => {
    try {
        const { draftText } = req.body;
        if (!draftText || draftText.length < 5) return res.status(400).json({ message: "Testo troppo breve." });

        console.log("🤖 IA al lavoro...");
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "Sei un caporedattore. Genera un titolo di giornale (max 15 parole) accattivante basato sul testo fornito. Rispondi SOLO con il titolo." },
                { role: "user", content: draftText }
            ],
            temperature: 0.7, max_tokens: 100,
        });

        const aiTitle = completion.choices[0].message.content.trim().replace(/^"|"$/g, '');
        
        // Log Uso IA (Opzionale, se vuoi tracciare quanto usano l'IA)
        createLog("Uso IA", "Redattore", "Generato titolo con IA", req);

        res.json({ title: aiTitle });
    } catch (error) {
        console.error("❌ Errore OpenAI:", error.message);
        res.status(500).json({ message: "Errore generazione IA." });
    }
});

// --- SISTEMA DI BLOCCO ARTICOLI (LOCKING) ---

// 1. Tenta di BLOCCARE l'articolo per l'utente corrente
app.post('/api/news/lock/:id', async (req, res) => {
    try {
        const { username } = req.body;
        const article = await News.findById(req.params.id);
        
        if (!article) return res.status(404).json({ msg: "Non trovato" });

        const now = new Date();
        const lockTime = new Date(article.lockedAt);
        const diffMins = (now - lockTime) / 1000 / 60;

        // SE l'articolo è già bloccato da qualcun altro E il blocco è recente (< 5 min)
        if (article.lockedBy && article.lockedBy !== username && diffMins < 5) {
            // RITORNA ERRORE: È BLOCCATO!
            return res.json({ 
                success: false, 
                lockedBy: article.lockedBy 
            });
        }

        // ALTRIMENTI: Bloccalo per me (o rinnova il mio blocco)
        article.lockedBy = username;
        article.lockedAt = now;
        await article.save();

        res.json({ success: true });

    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. SBLOCCA l'articolo (quando esco dalla pagina)
app.post('/api/news/unlock/:id', async (req, res) => {
    try {
        const { username } = req.body;
        const article = await News.findById(req.params.id);

        // Sblocco solo se ero io quello che l'aveva bloccato
        if (article && article.lockedBy === username) {
            article.lockedBy = null;
            article.lockedAt = null;
            await article.save();
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. CHAT ASSISTANT (Versione Corretta con libreria ufficiale)
app.post('/api/ai/ask', async (req, res) => {
    try {
        const { messages } = req.body;
        
        // Usiamo la libreria 'openai' configurata in alto, NON axios
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "Sei l'assistente IA della redazione MurthCMS. Rispondi in modo professionale, sintetico e utile per giornalisti." },
                ...messages
            ],
            max_tokens: 500
        });

        res.json(completion.choices[0].message);
    } catch (error) {
        console.error("Errore AI Chat:", error); // Vedrai l'errore preciso nel terminale
        res.status(500).json({ message: "Il cervello IA non risponde. Controlla la chiave API." });
    }
});

// ==========================================
// 1. CREA SESSIONE DI PAGAMENTO (PREZZI DINAMICI + CONTROLLO BLOCCO)
// ==========================================
app.post('/api/create-checkout-session', async (req, res) => {
  const { plan, userEmail, userId } = req.body;

  try {
      // 1. LEGGIAMO LE IMPOSTAZIONI DAL DB
      const settings = await Settings.findOne();
      
      // 🔥 CONTROLLO BLOCCO: Se l'interruttore è spento (false), fermiamo tutto.
      if (settings && settings.areSubscriptionsOpen === false) {
          return res.status(403).json({ error: "Le iscrizioni Premium sono momentaneamente chiuse dal gestore." });
      }

      // 2. RECUPERO PREZZI (Se non ci sono settings, usiamo i default)
      const dbPricePremium = settings ? settings.pricePremium : 1.99;
      const dbPriceFull = settings ? settings.priceFull : 5.99;

      let priceAmount = 0;
      let productName = "";

      if (plan === 'premium') {
          // Stripe vuole i centesimi (es: 1.99 -> 199)
          priceAmount = Math.round(dbPricePremium * 100); 
          productName = "Abbonamento Premium";
      } else if (plan === 'abbonato') {
          priceAmount = Math.round(dbPriceFull * 100); 
          productName = "Full Pass";
      } else {
          return res.status(400).json({ error: "Piano non valido" });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [{
            price_data: {
              currency: 'eur',
              product_data: { name: productName },
              unit_amount: priceAmount, // Usa il prezzo aggiornato dal DB
              recurring: { interval: 'month' },
            },
            quantity: 1,
        }],
        customer_email: userEmail,
        metadata: { userId: userId, plan: plan }, 
        success_url: `${CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${CLIENT_URL}/dashboard/subscription`,
      });

      res.json({ url: session.url });

  } catch (error) {
    console.error("Errore Stripe:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. CONFERMA PAGAMENTO + INVIO FATTURA PDF
// ==========================================
app.post('/api/verify-payment', async (req, res) => {
    const { sessionId } = req.body;
    try {
        // 1. Recuperiamo la sessione da Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status === 'paid') {
            const userId = session.metadata.userId;
            const newLevel = session.metadata.plan;
            const subscriptionId = session.subscription; 

            // 2. RECUPERIAMO IL PDF DELLA FATTURA DA STRIPE
            let invoicePdfUrl = "#";
            if (session.invoice) {
                const invoice = await stripe.invoices.retrieve(session.invoice);
                invoicePdfUrl = invoice.invoice_pdf; // <-- Link diretto al PDF
            }

            // 3. Aggiorniamo il Database locale
            const reader = await Reader.findById(userId);
            if (!reader) return res.status(404).json({ message: "Utente non trovato" });

            reader.livello = newLevel;
            reader.stripeSubscriptionId = subscriptionId;
            reader.isCanceled = false;
            
            const oggi = new Date();
            reader.scadenzaAbbonamento = new Date(oggi.setDate(oggi.getDate() + 30));

            await reader.save();

            // 4. INVIO EMAIL CON LINK FATTURA
            console.log(">>> INVIO EMAIL CON FATTURA A:", reader.email);
            try {
                await resend.emails.send({
                    from: 'Info@murtheditor.com',
                    to: [reader.email],
                    subject: `Ricevuta di Pagamento - ${newLevel.toUpperCase()}`,
                    html: `
                        <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6;">
                            <h2>Grazie ${reader.nome}!</h2>
                            <p>Il tuo abbonamento <strong>${newLevel.toUpperCase()}</strong> è stato attivato con successo.</p>
                            
                            <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                <p style="margin:0;"><strong>Importo pagato:</strong> Conferma Stripe</p>
                                <p style="margin:0;"><strong>Scadenza:</strong> ${reader.scadenzaAbbonamento.toLocaleDateString('it-IT')}</p>
                            </div>

                            <p>Abbiamo generato la tua fattura/ricevuta fiscale. Puoi scaricarla qui sotto:</p>
                            
                            <a href="${invoicePdfUrl}" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                                📄 Scarica Fattura PDF
                            </a>

                            <br/><br/>
                            <hr style="border:0; border-top:1px solid #eee;">
                            <p style="font-size: 0.8rem; color: #666;">Se il bottone non funziona, clicca qui: <a href="${invoicePdfUrl}">${invoicePdfUrl}</a></p>
                        </div>
                    `
                });
            } catch (e) { console.error("Errore invio email fattura:", e.message); }

            const userData = reader.toObject(); delete userData.password;
            return res.json({ success: true, user: userData });

        } else {
            return res.status(400).json({ success: false, message: "Pagamento non riuscito." });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Errore server." });
    }
});



// ==========================================
// 4. ANNULLA RINNOVO (Nuova Rotta)
// ==========================================
app.post('/api/cancel-subscription', async (req, res) => {
    const { userId } = req.body;
    try {
        const reader = await Reader.findById(userId);
        if (!reader) return res.status(404).json({ message: "Utente non trovato" });

        if (reader.stripeSubscriptionId) {
            // Diciamo a Stripe: "Cancella alla fine del periodo, non subito"
            await stripe.subscriptions.update(reader.stripeSubscriptionId, {
                cancel_at_period_end: true
            });
        }

        // Aggiorniamo il DB locale
        reader.isCanceled = true;
        await reader.save();

        // ... (dentro /api/cancel-subscription, dopo await reader.save())

        // INVIO EMAIL DISDETTA
        try {
            await resend.emails.send({
                from: 'Info@murtheditor.com',
                to: [reader.email],
                subject: 'Conferma Disdetta Rinnovo',
                html: `
                    <div style="font-family: sans-serif; padding: 20px; color: #333;">
                        <h2>Ciao ${reader.nome},</h2>
                        <p>Come richiesto, abbiamo annullato il rinnovo automatico del tuo abbonamento.</p>
                        <p>Non ti verrà addebitato nulla il mese prossimo.</p>
                        <p><strong>Nota bene:</strong> Potrai continuare a usare i vantaggi Premium fino alla scadenza naturale (${new Date(reader.scadenzaAbbonamento).toLocaleDateString('it-IT')}).</p>
                    </div>
                `
            });
        } catch (e) { console.error("Errore invio email disdetta:", e); }

        // ... (poi c'è il return res.json)

        const userData = reader.toObject(); delete userData.password;
        res.json({ success: true, user: userData });

    } catch (error) {
        console.error("Errore Cancellazione:", error);
        // Se non riusciamo a cancellare su Stripe (es. ID vecchio), aggiorniamo comunque locale
        // per non bloccare l'utente
        res.status(500).json({ message: "Errore durante la disdetta" });
    }
});

// --- 🧪 ROTTA DI TEST: FORZA SCADENZA ABBONAMENTO ---
app.post('/api/debug/expire-now', async (req, res) => {
    const { email } = req.body;
    try {
        // Imposta la scadenza a 24 ore fa
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const reader = await Reader.findOneAndUpdate(
            { email },
            { scadenzaAbbonamento: yesterday },
            { new: true }
        );

        if(!reader) return res.status(404).json({msg: "Utente non trovato"});

        res.json({ 
            success: true, 
            message: `Fatto! La scadenza di ${reader.nome} è ora: ${yesterday.toLocaleString()}. Attendi 1 minuto per il downgrade automatico.` 
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- NEWS PER INTERESSI (FILTRO CATEGORIE) ---
app.post('/api/news/by-interests', async (req, res) => {
    try {
        const { interests } = req.body; // Array di categorie es: ["Tech", "Sport"]
        
        if (!interests || interests.length === 0) {
            return res.json([]); // Se non ha interessi, ritorna vuoto
        }

        // Cerca notizie la cui categoria è inclusa nella lista interessi
        // Ordina per data (più recenti prima)
        const news = await News.find({ category: { $in: interests }, status: 'Pubblicato' })
                               .sort({ createdAt: -1 })
                               .limit(50); // Limite ragionevole
        res.json(news);
    } catch (err) {
        res.status(500).json({ message: "Errore recupero news interessi" });
    }
});

// --- ROTTA LETTURA NEWS TRAMITE SLUG (DEBUG) ---
app.get('/api/news/slug/:slug', async (req, res) => {
    // 1. Stampiamo nel terminale cosa sta cercando il sito
    console.log("--> RICHIESTA NEWS. Cerco slug:", req.params.slug);

    try {
        // 2. Cerca nel DB
        const news = await News.findOne({ slug: req.params.slug });
        
        if (!news) {
            console.log("❌ ERRORE: Notizia non trovata nel DB per questo slug.");
            return res.status(404).json({ message: "Articolo non trovato" });
        }
        
        // 3. Incrementa views e rispondi
        news.views += 1;
        await news.save();

        console.log("✅ TROVATA:", news.title);
        res.json(news);

    } catch (err) {
        console.error("❌ ERRORE SERVER:", err);
        res.status(500).json({ message: "Errore server" });
    }
});

// --- RECUPERO DATI PROFILO (SMART) ---
app.get('/api/reader/status/:id', async (req, res) => {
    try {
        const id = req.params.id;
        
        // TENTATIVO A: È un Redattore/Admin? (User) -> Priorità alta per la pagina Autore
        let profile = await User.findById(id);
        
        if (profile) {
            // È un redattore! Restituisci i dati compresi i follower
            const data = profile.toObject();
            delete data.password;
            // Assicuriamoci che il numero esista
            data.followersCount = data.followersCount || 0; 
            return res.json(data);
        }

        // TENTATIVO B: È un Lettore? (Reader)
        profile = await Reader.findById(id);
        
        if (profile) {
            const data = profile.toObject();
            delete data.password;
            return res.json(data);
        }

        // TENTATIVO C: Nessuno dei due
        return res.status(404).json({ error: "Profilo non trovato" });

    } catch(e) { 
        res.status(500).json({ error: e.message }); 
    }
});

// --- GESTIONE LIKE E SALVATAGGI ---

// --- VERSIONE DEBUG PER IL LIKE ---
app.post('/api/user/toggle-like', async (req, res) => {
    // 1. VEDIAMO SE IL SERVER RICEVE IL CLICK
    console.log("🔥 CLICK RILEVATO! Dati ricevuti dal Frontend:", req.body); 

    try {
        const { userId, articleId } = req.body;
        
        // 2. CERCHIAMO L'UTENTE (READER)
        const reader = await Reader.findById(userId);
        if (!reader) {
            console.log("❌ ERRORE: Nessun READER trovato con questo ID:", userId);
            // PROVA: Magari sei loggato come ADMIN (User) e non come LETTORE (Reader)?
            const admin = await User.findById(userId);
            if (admin) console.log("⚠️ ATTENZIONE: Questo ID appartiene a un ADMIN, non a un Reader. I like sono solo per i Reader.");
            
            return res.status(404).json({ message: "Utente non trovato nel database Reader" });
        }
        console.log("✅ UTENTE TROVATO:", reader.email);

        // 3. CERCHIAMO L'ARTICOLO
        const article = await News.findById(articleId);
        if (!article) {
            console.log("❌ ERRORE: Articolo non trovato con ID:", articleId);
            return res.status(404).json({ message: "Articolo non trovato" });
        }
        console.log("✅ ARTICOLO TROVATO:", article.title);

        // 4. LOGICA LIKE
        if (!reader.likedArticles) {
            console.log("⚠️ L'array likedArticles non esisteva, lo creo ora.");
            reader.likedArticles = [];
        }
        
        const index = reader.likedArticles.indexOf(articleId);
        let isLiked = false;

        if (index === -1) {
            console.log("❤️ METTO IL LIKE");
            reader.likedArticles.push(articleId);
            article.likes = (article.likes || 0) + 1;
            isLiked = true;
        } else {
            console.log("💔 TOLGO IL LIKE");
            reader.likedArticles.splice(index, 1);
            article.likes = Math.max(0, (article.likes || 0) - 1);
            isLiked = false;
        }

        // 5. SALVATAGGIO
        await reader.save();
        await article.save();
        console.log("💾 SALVATAGGIO RIUSCITO NEL DB!");

        const userData = reader.toObject();
        delete userData.password;

        res.json({ success: true, likes: article.likes, user: userData });

    } catch (err) {
        console.error("❌ ERRORE CRITICO SERVER:", err);
        res.status(500).json({ message: "Errore server interno" });
    }
});

// 2. TOGGLE SAVE (Salva / Rimuovi dai preferiti) - VERSIONE DEBUG
app.post('/api/user/toggle-save', async (req, res) => {
    console.log("💾 RICHIESTA SALVATAGGIO RICEVUTA:", req.body); // LOG 1

    try {
        const { userId, articleId } = req.body;
        
        // 1. CERCHIAMO IL READER (Non User!)
        const reader = await Reader.findById(userId);
        
        if (!reader) {
            console.log("❌ ERRORE: Reader non trovato con ID:", userId);
            return res.status(404).json({ message: "Utente non trovato" });
        }

        // 2. Controllo array
        if (!reader.savedArticles) {
            console.log("⚠️ Array savedArticles mancante, lo creo.");
            reader.savedArticles = [];
        }

        const index = reader.savedArticles.indexOf(articleId);
        let isSaved = false;

        if (index === -1) {
            // AGGIUNGI
            console.log("📥 AGGIUNGO AI PREFERITI");
            reader.savedArticles.push(articleId);
            isSaved = true;
        } else {
            // RIMUOVI
            console.log("🗑️ RIMUOVO DAI PREFERITI");
            reader.savedArticles.splice(index, 1);
            isSaved = false;
        }

        await reader.save();
        console.log("✅ DB AGGIORNATO CON SUCCESSO!");

        // Rimuovi password prima di inviare
        const userData = reader.toObject();
        delete userData.password;

        res.json({ success: true, isSaved, user: userData });

    } catch (err) {
        console.error("❌ ERRORE SAVE:", err);
        res.status(500).json({ message: "Errore server" });
    }
});

// 3. RECUPERA LIBRERIA (Versione FIXATA che pulisce i null)
app.get('/api/user/:id/library', async (req, res) => {
    try {
        const reader = await Reader.findById(req.params.id)
            .populate('savedArticles')
            .populate('likedArticles');
        
        if (!reader) return res.status(404).json({ message: "Reader not found" });

        // FILTRO DI SICUREZZA: Rimuove articoli che magari sono stati cancellati dal DB
        const cleanSaved = (reader.savedArticles || []).filter(item => item !== null && item.title);
        const cleanLiked = (reader.likedArticles || []).filter(item => item !== null && item.title);

        res.json({ 
            saved: cleanSaved, 
            liked: cleanLiked 
        });
    } catch (err) {
        console.error("Errore Library:", err);
        res.status(500).json({ message: "Errore server" });
    }
});

// ROTTA SEGUI: READER (Lettore) -> USER (Redattore)
app.put('/api/reader/follow', async (req, res) => {
    const { userId, targetId } = req.body;
    console.log(`>>> FOLLOW: Reader ${userId} vuole seguire User ${targetId}`);

    try {
        // 1. TROVA IL LETTORE (Chi clicca)
        const follower = await Reader.findById(userId);
        if (!follower) return res.status(404).json({ message: "Lettore non trovato" });

        // 2. TROVA IL REDATTORE (Montepeloso - Tabella User)
        const author = await User.findById(targetId);
        if (!author) {
            console.log("❌ ERRORE: L'autore non è trovato nella tabella USER.");
            return res.status(404).json({ message: "Redattore non trovato" });
        }

        // 3. AGGIORNA
        const isFollowing = follower.following.includes(targetId);

        if (isFollowing) {
            // SMETTI DI SEGUIRE
            follower.following = follower.following.filter(id => id.toString() !== targetId);
            
            // Decrementa contatore Redattore
            const current = author.followersCount || 0;
            author.followersCount = Math.max(0, current - 1);
            console.log(">>> UNFOLLOW. Nuovo count:", author.followersCount);
        } else {
            // INIZIA A SEGUIRE
            follower.following.push(targetId);
            
            // Incrementa contatore Redattore
            const current = author.followersCount || 0;
            author.followersCount = current + 1;
            console.log(">>> FOLLOW. Nuovo count:", author.followersCount);
        }

        // 4. SALVA
        await follower.save();
        await author.save(); // <--- ORA SALVERÀ PERCHÉ HAI MESSO IL CAMPO NELLO SCHEMA

        res.json({ 
            success: true, 
            message: isFollowing ? "Unfollowed" : "Followed", 
            currentFollowing: follower.following,
            newCount: author.followersCount 
        });

    } catch (err) {
        console.error("Errore server:", err);
        res.status(500).json({ message: "Errore interno" });
    }
});

// ==========================================
// INVIO EMAIL CONTATTO (READER -> CMS + SMTP)
// ==========================================
app.post('/api/contact/author', async (req, res) => {
    const { senderName, senderEmail, recipientEmail, subject, message } = req.body;

    // 1. Validazione
    if (!recipientEmail) return res.status(400).json({ message: "Email destinatario mancante." });

    console.log(`>>> CONTATTO: Da ${senderEmail} a ${recipientEmail}`);

    try {
        // 2. TROVIAMO L'UTENTE CMS (EDITORE) TRAMITE LA MAIL
        // Cerchiamo sia nella mail interna che in quella di registrazione
        const editor = await User.findOne({ 
            $or: [{ internalEmail: recipientEmail }, { email: recipientEmail }] 
        });

        if (!editor) {
            console.log("⚠️ Editore non trovato nel DB, invio solo SMTP.");
        } else {
            console.log(`✅ Editore trovato: ${editor.username}. Salvo nel CMS...`);
            
            // 3. SALVIAMO NEL DATABASE (Così appare nella Webmail interna!)
            const internalMsg = new Message({
                sender: "external_reader",      // Flag per dire che è esterno
                senderName: senderName,         // Nome del lettore (es. Mario Rossi)
                senderRole: "Lettore",
                recipient: editor.username,     // FONDAMENTALE: Lo username dell'editore
                
                subject: subject,
                text: message,
                
                isEmail: true,                  // Dice al CMS "Questa è un'email"
                senderEmail: senderEmail,       // L'email vera del lettore
                folder: 'inbox',                // Cartella in arrivo
                read: false,
                createdAt: new Date()
            });

            await internalMsg.save();
            console.log("💾 Messaggio salvato nel DB Messages!");
        }

        // 4. INVIO REALE (SMTP/RESEND) - Opzionale ma consigliato per notifica
        await resend.emails.send({
            from: 'Info@murtheditor.com',
            to: [recipientEmail],
            reply_to: senderEmail,
            subject: `[Dal Sito] ${subject}`,
            html: `
                <p><strong>Nuovo messaggio da:</strong> ${senderName} (${senderEmail})</p>
                <p><strong>Oggetto:</strong> ${subject}</p>
                <hr>
                <p>${message}</p>
                <br>
                <small>Messaggio salvato anche nella tua Webmail interna.</small>
            `
        });

        res.status(200).json({ success: true, message: "Inviato e salvato!" });

    } catch (error) {
        console.error("❌ ERRORE:", error);
        res.status(500).json({ error: "Errore durante l'invio." });
    }
});

// --- RICERCA ---
app.get('/api/search/news', async (req, res) => { try { const { q } = req.query; if (!q) return res.json([]); const searchRegex = new RegExp(q, 'i'); const filter = { $or: [ { title: searchRegex }, { summary: searchRegex }, { content: searchRegex }, { author: searchRegex } ] }; const results = await News.find(filter).sort({ createdAt: -1 }); res.json(results); } catch (err) { res.status(500).json([]); } });
app.get('/api/search/users', async (req, res) => { try { const { q } = req.query; const searchRegex = new RegExp(q, 'i'); const users = await User.find({ $or: [{ username: searchRegex }, { nome: searchRegex }, { cognome: searchRegex }] }).select('-password'); res.json(users); } catch (err) { res.status(500).json([]); } });

// --- INIZIO MODIFICA PER NAMECHEAP ---
const path = require('path');

// 1. Diciamo al server: "La cartella 'public' contiene il sito web"
app.use(express.static(path.join(__dirname, 'public')));

// 2. Qualsiasi pagina visitata che non sia un'API, rimanda alla Home di React
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// --- FINE MODIFICA ---

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`>>> Server MurthEditor attivo su porta ${PORT}`);
});