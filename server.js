const express  = require('express');
const sqlite3  = require('sqlite3').verbose();
const session  = require('express-session');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');

const app  = express();
const PORT = process.env.PORT || 4200;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Anuntech@10';
const ROOT    = __dirname;
const UPLOADS = path.join(ROOT, 'uploads');
const FOTOS   = path.join(ROOT, 'fotos');   // pasta exclusiva para galeria de fotos das motos

if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });
if (!fs.existsSync(FOTOS))   fs.mkdirSync(FOTOS,   { recursive: true });

// ── DATABASE ──────────────────────────────────────────────────────────────
const DB_PATH = process.env.DB_PATH || path.join(ROOT, 'buscaracing.db');
const db = new sqlite3.Database(DB_PATH);

const dbRun = (sql, params = []) => new Promise((resolve, reject) =>
  db.run(sql, params, function (err) { err ? reject(err) : resolve(this); })
);
const dbGet = (sql, params = []) => new Promise((resolve, reject) =>
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row))
);
const dbAll = (sql, params = []) => new Promise((resolve, reject) =>
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows))
);
const dbExec = (sql) => new Promise((resolve, reject) =>
  db.exec(sql, (err) => err ? reject(err) : resolve())
);

async function initDb() {
  await dbRun('PRAGMA journal_mode=WAL');

  await dbExec(`
    CREATE TABLE IF NOT EXISTS motos (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      nome           TEXT    NOT NULL,
      marca          TEXT    NOT NULL,
      categoria      TEXT    NOT NULL DEFAULT 'outros',
      condicao       TEXT    NOT NULL DEFAULT 'nova',
      preco          REAL,
      preco_original REAL,
      ano            INTEGER,
      km             INTEGER,
      descricao      TEXT    DEFAULT '',
      imagem         TEXT,
      destaque       INTEGER DEFAULT 0,
      ativo          INTEGER DEFAULT 1,
      created_at     TEXT    DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS configuracoes (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS fotos (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      moto_id    INTEGER NOT NULL REFERENCES motos(id) ON DELETE CASCADE,
      filename   TEXT    NOT NULL,
      ordem      INTEGER DEFAULT 0,
      created_at TEXT    DEFAULT (datetime('now','localtime'))
    );
  `);

  for (const k of ['logo', 'telefone', 'whatsapp', 'email', 'endereco',
                    'hero_img', 'cat_rua_img', 'cat_offroad_img', 'cat_quad_img', 'cat_infantil_img']) {
    await dbRun("INSERT OR IGNORE INTO configuracoes(chave,valor) VALUES(?,?)", [k, '']);
  }

  const existing = await dbGet('SELECT 1 FROM motos LIMIT 1');
  if (!existing) {
    const demos = [
      ['CB 650R Neo Sports','Honda',     'motos-rua',   'nova',  45900, null, 'Motor inline-4 649cc, design neo-retro com performance moderna.',1,1,2024,0],
      ['MT-07',            'Yamaha',     'motos-rua',   'nova',  52900, null, 'Naked esportiva 689cc com agilidade extrema.',1,1,2024,0],
      ['Z400',             'Kawasaki',   'motos-rua',   'nova',  35900, null, 'Naked 399cc com design agressivo e ótimo custo-benefício.',0,1,2024,0],
      ['XRE 300',          'Honda',      'motos-rua',   'usada', 18500, null, 'Adventure versátil para cidade e trilhas leves.',0,1,2022,15000],
      ['250 SX-F',         'KTM',        'offroad',     'nova',  68500, null, 'Motocross 4T de alto desempenho, campeão mundial.',1,1,2024,0],
      ['125cc Trilha',     'MXF',        'offroad',     'nova',   9800, null, 'Moto de trilha 125cc ideal para iniciantes no off-road.',0,1,2024,0],
      ['CForce 450',       'CF Moto',    'quadriciclos','nova',  31200, null, 'ATV 450cc para trabalho e lazer off-road com muito torque.',0,1,2024,0],
      ['Baby 50',          'MXF',        'infantil',    'nova',   4800, null, 'Minibike 50cc para iniciantes com segurança e diversão.',1,1,2024,0],
    ];
    for (const d of demos) {
      await dbRun(
        `INSERT INTO motos(nome,marca,categoria,condicao,preco,preco_original,descricao,destaque,ativo,ano,km)
         VALUES(?,?,?,?,?,?,?,?,?,?,?)`, d
      );
    }
  }
}

// ── MIDDLEWARE ────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS));
app.use('/fotos',   express.static(FOTOS));
app.use(express.static(ROOT));
app.use(session({
  secret: 'br-secret-2024-xk9z',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 86400000 }
}));

// Multer para imagem principal (uploads/)
const storageMain = multer.diskStorage({
  destination: UPLOADS,
  filename: (_, f, cb) =>
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(f.originalname)}`)
});
const upload = multer({
  storage: storageMain,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, f, cb) => cb(null, /\.(jpe?g|png|webp|gif)$/i.test(f.originalname))
});

// Multer para galeria de fotos (fotos/)
const storageFotos = multer.diskStorage({
  destination: FOTOS,
  filename: (_, f, cb) =>
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(f.originalname)}`)
});
const uploadFotos = multer({
  storage: storageFotos,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_, f, cb) => cb(null, /\.(jpe?g|png|webp|gif)$/i.test(f.originalname))
});

const auth = (req, res, next) =>
  req.session.isAdmin ? next() : res.status(401).json({ error: 'Não autorizado' });

// ── AUTH ──────────────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  if (req.body.senha === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: 'Senha incorreta' });
  }
});

app.post('/api/logout', (req, res) =>
  req.session.destroy(() => res.json({ ok: true }))
);

app.get('/api/auth/check', (req, res) =>
  res.json({ isAdmin: !!req.session.isAdmin })
);

// ── PUBLIC: MOTOS ────────────────────────────────────────────────────────
app.get('/api/motos', async (req, res) => {
  try {
    let sql = 'SELECT * FROM motos WHERE ativo=1';
    const p = [];
    const { categoria, marca, condicao, destaque, q } = req.query;
    if (categoria) { sql += ' AND categoria=?'; p.push(categoria); }
    if (marca)     { sql += ' AND marca=?';     p.push(marca); }
    if (condicao)  { sql += ' AND condicao=?';  p.push(condicao); }
    if (destaque)  { sql += ' AND destaque=1'; }
    if (q) {
      const t = `%${q}%`;
      sql += ' AND (nome LIKE ? OR marca LIKE ? OR descricao LIKE ?)';
      p.push(t, t, t);
    }
    sql += ' ORDER BY destaque DESC, id DESC';
    res.json(await dbAll(sql, p));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/motos/:id', async (req, res) => {
  try {
    const m = await dbGet('SELECT * FROM motos WHERE id=?', [req.params.id]);
    m ? res.json(m) : res.status(404).json({ error: 'Não encontrada' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/marcas', async (_, res) => {
  try {
    const rows = await dbAll('SELECT DISTINCT marca FROM motos WHERE ativo=1 ORDER BY marca');
    res.json(rows.map(r => r.marca));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/config/logo', async (_, res) => {
  try {
    const c = await dbGet("SELECT valor FROM configuracoes WHERE chave='logo'");
    res.json({ logo: c?.valor || '' });
  } catch (e) {
    res.json({ logo: '' });
  }
});

// ── PUBLIC: FOTOS DA MOTO ────────────────────────────────────────────────
app.get('/api/motos/:id/fotos', async (req, res) => {
  try {
    const rows = await dbAll(
      'SELECT * FROM fotos WHERE moto_id=? ORDER BY ordem ASC, id ASC',
      [req.params.id]
    );
    // retorna URL pública para cada foto
    res.json(rows.map(r => ({ ...r, url: `/fotos/${r.filename}` })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── ADMIN: MOTOS ─────────────────────────────────────────────────────────
app.get('/api/admin/motos', auth, async (_, res) => {
  try {
    res.json(await dbAll('SELECT * FROM motos ORDER BY id DESC'));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/motos', auth, upload.single('imagem'), async (req, res) => {
  try {
    const { nome, marca, categoria, condicao, preco, preco_original,
            descricao, destaque, ativo, ano, km } = req.body;
    const imagem = req.file ? `/uploads/${req.file.filename}` : null;
    const r = await dbRun(
      `INSERT INTO motos(nome,marca,categoria,condicao,preco,preco_original,descricao,imagem,destaque,ativo,ano,km)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
      [nome, marca, categoria||'outros', condicao||'nova',
       preco||null, preco_original||null, descricao||'',
       imagem, destaque?1:0, ativo!=='0'?1:0, ano||null, km||null]
    );
    res.json({ id: r.lastID });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/motos/:id', auth, upload.single('imagem'), async (req, res) => {
  try {
    const old = await dbGet('SELECT * FROM motos WHERE id=?', [req.params.id]);
    if (!old) return res.status(404).json({ error: 'Não encontrada' });
    const { nome, marca, categoria, condicao, preco, preco_original,
            descricao, destaque, ativo, ano, km, imagem_atual } = req.body;
    const imagem = req.file
      ? `/uploads/${req.file.filename}`
      : (imagem_atual !== undefined ? imagem_atual : old.imagem);
    await dbRun(
      `UPDATE motos SET nome=?,marca=?,categoria=?,condicao=?,preco=?,preco_original=?,
        descricao=?,imagem=?,destaque=?,ativo=?,ano=?,km=? WHERE id=?`,
      [nome, marca, categoria||'outros', condicao||'nova',
       preco||null, preco_original||null, descricao||'',
       imagem, destaque?1:0, ativo!=='0'?1:0, ano||null, km||null, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/motos/:id', auth, async (req, res) => {
  try {
    // Apaga fotos do disco antes de deletar a moto
    const fotos = await dbAll('SELECT filename FROM fotos WHERE moto_id=?', [req.params.id]);
    for (const f of fotos) {
      const fp = path.join(FOTOS, f.filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    await dbRun('DELETE FROM motos WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── ADMIN: FOTOS DA MOTO ─────────────────────────────────────────────────
// Upload de múltiplas fotos para uma moto
app.post('/api/motos/:id/fotos', auth, uploadFotos.array('fotos', 20), async (req, res) => {
  try {
    const motoId = req.params.id;
    const moto = await dbGet('SELECT id FROM motos WHERE id=?', [motoId]);
    if (!moto) return res.status(404).json({ error: 'Moto não encontrada' });

    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: 'Nenhuma foto enviada' });

    // Pega a maior ordem atual
    const maxOrdem = await dbGet(
      'SELECT COALESCE(MAX(ordem),0) AS m FROM fotos WHERE moto_id=?', [motoId]
    );
    let ordem = (maxOrdem?.m || 0) + 1;

    const inseridas = [];
    for (const file of req.files) {
      const r = await dbRun(
        'INSERT INTO fotos(moto_id, filename, ordem) VALUES(?,?,?)',
        [motoId, file.filename, ordem++]
      );
      inseridas.push({ id: r.lastID, url: `/fotos/${file.filename}`, filename: file.filename });
    }
    res.json({ ok: true, fotos: inseridas });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Reordenar fotos
app.put('/api/fotos/:id/ordem', auth, async (req, res) => {
  try {
    await dbRun('UPDATE fotos SET ordem=? WHERE id=?', [req.body.ordem, req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Deletar foto individual
app.delete('/api/fotos/:id', auth, async (req, res) => {
  try {
    const foto = await dbGet('SELECT * FROM fotos WHERE id=?', [req.params.id]);
    if (!foto) return res.status(404).json({ error: 'Foto não encontrada' });
    const fp = path.join(FOTOS, foto.filename);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    await dbRun('DELETE FROM fotos WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── ADMIN: STATS ─────────────────────────────────────────────────────────
app.get('/api/stats', auth, async (_, res) => {
  try {
    const [total, ativas, destaque, por_categoria] = await Promise.all([
      dbGet('SELECT COUNT(*) c FROM motos'),
      dbGet('SELECT COUNT(*) c FROM motos WHERE ativo=1'),
      dbGet('SELECT COUNT(*) c FROM motos WHERE destaque=1 AND ativo=1'),
      dbAll('SELECT categoria, COUNT(*) n FROM motos WHERE ativo=1 GROUP BY categoria ORDER BY n DESC')
    ]);
    res.json({ total: total.c, ativas: ativas.c, destaque: destaque.c, por_categoria });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── ADMIN: CONFIGURAÇÕES ─────────────────────────────────────────────────
app.get('/api/configuracoes', auth, async (_, res) => {
  try {
    const rows = await dbAll('SELECT chave, valor FROM configuracoes');
    res.json(Object.fromEntries(rows.map(r => [r.chave, r.valor])));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/configuracoes', auth, async (req, res) => {
  try {
    for (const [k, v] of Object.entries(req.body)) {
      await dbRun("UPDATE configuracoes SET valor=? WHERE chave=?", [v, k]);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/config/logo', auth, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    const logoPath = `/uploads/${req.file.filename}`;
    await dbRun("UPDATE configuracoes SET valor=? WHERE chave='logo'", [logoPath]);
    res.json({ logo: logoPath });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Upload genérico de imagem de config (hero, categorias)
const ALLOWED_IMG_KEYS = ['hero_img','cat_rua_img','cat_offroad_img','cat_quad_img','cat_infantil_img'];
app.post('/api/config/image', auth, upload.single('file'), async (req, res) => {
  try {
    const chave = req.body.chave;
    if (!ALLOWED_IMG_KEYS.includes(chave)) return res.status(400).json({ error: 'Chave inválida' });
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    const url = `/uploads/${req.file.filename}`;
    await dbRun('UPDATE configuracoes SET valor=? WHERE chave=?', [url, chave]);
    res.json({ chave, url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Leitura pública das imagens de config (hero + categorias)
app.get('/api/config/images', async (_, res) => {
  try {
    const rows = await dbAll(
      "SELECT chave, valor FROM configuracoes WHERE chave IN ('hero_img','cat_rua_img','cat_offroad_img','cat_quad_img','cat_infantil_img')"
    );
    res.json(Object.fromEntries(rows.map(r => [r.chave, r.valor])));
  } catch (e) {
    res.json({});
  }
});

// ── START ─────────────────────────────────────────────────────────────────
initDb()
  .then(() => {
    app.listen(PORT, () =>
      console.log(`\n🏍️  Busca Racing rodando em http://localhost:${PORT}\n`)
    );
  })
  .catch(err => {
    console.error('Erro ao inicializar banco:', err);
    process.exit(1);
  });
