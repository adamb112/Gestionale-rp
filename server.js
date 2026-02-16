const express = require("express");
const session = require("express-session");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const app = express();
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

app.get("/", (req, res) => {
  if (!req.session.user) return res.send("Non loggato. Vai su /login");
  res.send("Benvenuto " + req.session.user.email);
});

app.get("/login", (req, res) => {
  res.send(`
    <form method="POST">
      Email: <input name="email"/><br/>
      Password: <input name="password" type="password"/><br/>
      <button>Login</button>
    </form>
  `);
});

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

app.listen(process.env.PORT || 3000, () => {
  console.log("Server avviato");
});
