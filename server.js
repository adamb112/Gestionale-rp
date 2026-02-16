const express = require("express");
const session = require("express-session");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const path = require("path");

const app = express();
app.use(express.static("public")); // Qui metteremo la grafica
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "segretissimo",
  resave: false,
  saveUninitialized: false
}));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// LOGIN API
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
  } catch (e) { res.status(500).send(e); }
});

// SBLOCCO STAFF API
app.post("/api/unlock-staff", (req, res) => {
    if (!req.session.user) return res.status(401).send();
    const { code } = req.body;
    if (code === "ADMIN2026") { // CAMBIA QUESTO CODICE CON QUELLO CHE VUOI
        req.session.user.role = 'staff';
        res.json({ success: true });
    } else {
        res.json({ success: false, m: "Codice errato" });
    }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(process.env.PORT || 3000);
