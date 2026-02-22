const express = require("express");
const session = require("express-session");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const path = require("path");

const app = express();

// Configurazione cartella pubblica per la grafica (HTML, CSS, JS)
app.use(express.static("public")); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurazione sessione per mantenere l'utente loggato
app.use(session({
  secret: "chiave_segreta_per_il_tuo_rp",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // La sessione dura 24 ore
}));

// Connessione al Database di Render (PostgreSQL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- API REGISTRAZIONE (CON LOGIN AUTOMATICO) ---
app.post("/api/register", async (req, res) => {
  const { email, nick, password } = req.body;
  try {
    // 1. Criptiamo la password per sicurezza
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 2. Inseriamo l'utente nel database
    // Default: Balance 0, Lavoro Disoccupato, Ruolo user
    const query = `
      INSERT INTO users (email, nickname, password, balance, lavoro, role) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *`;
    const values = [email, nick, hashedPassword, 0, 'Disoccupato', 'user'];
    
    const result = await pool.query(query, values);
    const newUser = result.rows[0];

    // 3. LOGIN AUTOMATICO: Salviamo l'utente nella sessione appena creato
    req.session.user = newUser;
    
    // Mandiamo i dati al sito per entrare nella dashboard
    res.json(newUser);
  } catch (e) {
    console.error("Errore registrazione:", e);
    res.status(500).json({ m: "Errore: Email o Nickname già esistenti" });
  }
});

// --- API LOGIN ---
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    if (result.rows.length === 0) return res.status(404).json({ m: "Utente non trovato" });
    
    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password);
    
    if (!ok) return res.status(401).json({ m: "Password errata" });
    
    req.session.user = user;
    res.json(user);
  } catch (e) { 
    res.status(500).json({ m: "Errore del server" }); 
  }
});

// --- API SBLOCCO STAFF (CODICE SEGRETO) ---
app.post("/api/unlock-staff", (req, res) => {
    if (!req.session.user) return res.status(401).send();
    const { code } = req.body;
    
    if (code === "ADMIN2026") { 
        req.session.user.role = 'staff';
        // In un caso reale qui dovresti fare anche un UPDATE sul database
        res.json({ success: true });
    } else {
        res.json({ success: false, m: "Codice errato" });
    }
});

// Serve il file index.html per qualsiasi altra rotta
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server gestionale avviato sulla porta ${PORT}`);
});
