require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const db = require('./db');
const { authRequired, roleRequired } = require('./auth');

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET não configurado. Copie .env.example para .env.');

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true }));
app.use(express.json({ limit: '100kb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 200, standardHeaders: true }));
app.use(express.static('public'));

const loginSchema = z.object({ email: z.string().email(), senha: z.string().min(6).max(100) });

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ erro: 'Dados de login inválidos.' });
  const { email, senha } = parsed.data;
  const user = db.prepare('SELECT id, nome, email, senha_hash, perfil FROM usuarios WHERE email = ?').get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(senha, user.senha_hash)) return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
  const token = jwt.sign({ id: user.id, nome: user.nome, email: user.email, perfil: user.perfil }, process.env.JWT_SECRET, { expiresIn: '2h' });
  res.json({ token, usuario: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil } });
});

app.get('/api/kpis', authRequired, (req, res) => {
  const kpi = db.prepare(`SELECT
    COALESCE(SUM(CASE WHEN status='Pago' THEN faturamento ELSE 0 END),0) faturamento_pago,
    SUM(CASE WHEN status='Pago' THEN 1 ELSE 0 END) vendas_pagas,
    COALESCE(AVG(CASE WHEN status='Pago' THEN faturamento END),0) ticket_medio,
    COALESCE(SUM(CASE WHEN status='Pago' THEN quantidade ELSE 0 END),0) itens_vendidos
    FROM vendas`).get();
  res.json(kpi);
});

app.get('/api/vendas-mensais', authRequired, (req, res) => {
  const rows = db.prepare(`SELECT substr(data,1,7) mes, ROUND(SUM(CASE WHEN status='Pago' THEN faturamento ELSE 0 END),2) faturamento
    FROM vendas GROUP BY substr(data,1,7) ORDER BY mes`).all();
  res.json(rows);
});

app.get('/api/vendedores', authRequired, (req, res) => {
  const rows = db.prepare(`SELECT vendedor, ROUND(SUM(CASE WHEN status='Pago' THEN faturamento ELSE 0 END),2) faturamento
    FROM vendas GROUP BY vendedor ORDER BY faturamento DESC`).all();
  res.json(rows);
});

app.get('/api/produtos', authRequired, (req, res) => {
  const rows = db.prepare(`SELECT produto, SUM(CASE WHEN status='Pago' THEN quantidade ELSE 0 END) itens, ROUND(SUM(CASE WHEN status='Pago' THEN faturamento ELSE 0 END),2) faturamento
    FROM vendas GROUP BY produto ORDER BY faturamento DESC`).all();
  res.json(rows);
});

app.get('/api/vendas', authRequired, roleRequired('admin','analista'), (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const rows = db.prepare('SELECT * FROM vendas ORDER BY data DESC LIMIT ?').all(limit);
  res.json(rows);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`Sistema rodando em http://localhost:${port}`));
