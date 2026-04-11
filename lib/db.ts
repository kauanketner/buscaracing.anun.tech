import Database from 'better-sqlite3';
import path from 'path';

const ROOT = process.cwd();
const DATA_DIR = process.env.DATA_DIR || ROOT;
const DB_PATH = process.env.DB_PATH || path.join(ROOT, 'buscaracing.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
  }
  return _db;
}

export function initDb(): void {
  const db = getDb();

  db.exec(`
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

    CREATE TABLE IF NOT EXISTS posts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo      TEXT NOT NULL,
      slug        TEXT NOT NULL UNIQUE,
      resumo      TEXT DEFAULT '',
      conteudo    TEXT NOT NULL,
      imagem_capa TEXT,
      categoria   TEXT DEFAULT 'geral',
      tags        TEXT DEFAULT '',
      publicado   INTEGER DEFAULT 0,
      autor       TEXT DEFAULT 'Busca Racing',
      meta_title  TEXT,
      meta_desc   TEXT,
      created_at  TEXT DEFAULT (datetime('now','localtime')),
      updated_at  TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  // Seed default configuration keys
  const insert = db.prepare(
    "INSERT OR IGNORE INTO configuracoes(chave, valor) VALUES(?, '')"
  );
  const seedKeys = [
    'logo', 'telefone', 'whatsapp', 'email', 'endereco',
    'hero_img', 'cat_rua_img', 'cat_offroad_img', 'cat_quad_img', 'cat_infantil_img',
  ];
  for (const k of seedKeys) {
    insert.run(k);
  }
}

export default getDb;
