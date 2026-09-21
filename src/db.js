const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, 'vendas.db'));
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, '..', 'sql', 'schema.sql'), 'utf8');
db.exec(schema);

module.exports = db;

const exists = db.prepare('SELECT id FROM usuarios WHERE email = ?').get('admin@demo.com');
if (!exists) { const hash = bcrypt.hashSync('Admin@123', 10); db.prepare('INSERT INTO usuarios (nome,email,senha_hash,perfil) VALUES (?,?,?,?)').run('Administrador','admin@demo.com',hash,'admin'); }
