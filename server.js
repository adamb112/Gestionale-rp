const express = require("express");
const session = require("express-session");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: "segretissimo",
  resave: false,
  saveUninitialized: false
}));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Funzione per verificare login
function checkAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

// ROUTE DASHBOARD PRINCIPALE
app.get("/", checkAuth, async (req, res) => {
  const user = req.session.user;

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Gestionale RP</title>
        <style>
            body { margin:0; font-family: Arial; background:#0f172a; color:white; }
            .navbar { background:#1e293b; padding:15px; display:flex; justify-content:space-between; }
            .sidebar { width:200px; float:left; background:#1e293b; height:100vh; padding:15px; }
            .sidebar a { display:block; color:white; text-decoration:none; margin-bottom:10px; }
            .content { margin-left:220px; padding:30px; }
            .card { background:#1e293b; padding:20px; border-radius:10px; margin-bottom:20px; }
        </style>
    </head>
    <body>
        <div class="navbar">
            <h1>Gestionale RP</h1>
            <a href="/logout" style="color:white;">Logout</a>
        </div>

        <div class="sidebar">
            <a href="/profile">Profilo</a>
            <a href="/sanzioni">Sanzioni</a>
            ${user.role === 'staff' ? '<a href="/staff">Staff Panel</a>' : ''}
        </div>

        <div class="content">
            <div class="card">
                <h2>Benvenuto ${user.email}</h2>
                <p>Balance: ${user.balance || 0}</p>
                <p>Tempo Totale: ${user.tempo_totale || 0}</p>
                <p>Tempo Settimanale: ${user.tempo_settimanale || 0}</p>
                <p>Lavoro: ${user.lavoro || 'Nessuno'}</p>
            </div>
        </div>
    </body>
    </html>
  `);
});

// ROUTE LOGIN
app.get("/login", (req, res) => {
  if (req.session.user) return res.redirect("/");
  res.send(`
    <form method="POST" style="margin:50px;">
      <h2>Login Gestionale RP</h2>
      Email: <input name="email"/><br/><br/>
      Password: <input name="password" type="password"/><br/><br/>
      <button>Login</button>
    </form>
  `);
});

// POST LOGIN
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
  if (result.rows.length === 0) return res.send("Utente non trovato");
  const user = result.rows[0];
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.send("Password errata");
  req.session.user = user;
  res.redirect("/");
});

// LOGOUT
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

// ROUTE PROFILO
app.get("/profile", checkAuth, (req,res)=>{
    const u = req.session.user;
    res.send(`
      <h1>Profilo di ${u.email}</h1>
      <p>Balance: ${u.balance || 0}</p>
      <p>Tempo Totale: ${u.tempo_totale || 0}</p>
      <p>Tempo Settimanale: ${u.tempo_settimanale || 0}</p>
      <p>Lavoro: ${u.lavoro || 'Nessuno'}</p>
      <a href="/">Torna alla dashboard</a>
    `);
});

// ROUTE SANZIONI
app.get("/sanzioni", checkAuth, (req,res)=>{
    const u = req.session.user;
    res.send(`
      <h1>Sanzioni di ${u.email}</h1>
      <p>Multe: ${u.multe || 0}</p>
      <p>Ban: ${u.ban || 0}</p>
      <p>Mute: ${u.mute || 0}</p>
      <p>Morti: ${u.morti || 0}</p>
      <a href="/">Torna alla dashboard</a>
    `);
});

// ROUTE STAFF
app.get("/staff", checkAuth, (req,res)=>{
    const u = req.session.user;
    if(u.role !== 'staff') return res.send("Non autorizzato");
    res.send(`
      <h1>Staff Panel</h1>
      <p>Qui puoi modificare balance, lavoro, sanzioni...</p>
      <a href="/">Torna alla dashboard</a>
    `);
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server avviato");
});

