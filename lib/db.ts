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
    initSchema(_db);
  }
  return _db;
}

export function initDb(): void {
  getDb();
}

function initSchema(db: Database.Database): void {
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

    CREATE INDEX IF NOT EXISTS idx_motos_ativo ON motos(ativo);

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

    CREATE TABLE IF NOT EXISTS vendedores (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nome       TEXT    NOT NULL,
      telefone   TEXT    DEFAULT '',
      email      TEXT    DEFAULT '',
      ativo      INTEGER DEFAULT 1,
      created_at TEXT    DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS mecanicos (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nome       TEXT    NOT NULL,
      telefone   TEXT    DEFAULT '',
      email      TEXT    DEFAULT '',
      especialidade TEXT DEFAULT '',
      ativo      INTEGER DEFAULT 1,
      created_at TEXT    DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS oficina_ordens (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_nome       TEXT    NOT NULL,
      cliente_telefone   TEXT    DEFAULT '',
      cliente_email      TEXT    DEFAULT '',
      moto_id            INTEGER REFERENCES motos(id) ON DELETE SET NULL,
      moto_marca         TEXT    DEFAULT '',
      moto_modelo        TEXT    DEFAULT '',
      moto_ano           INTEGER,
      moto_placa         TEXT    DEFAULT '',
      moto_km            INTEGER,
      servico_descricao  TEXT    DEFAULT '',
      observacoes        TEXT    DEFAULT '',
      mecanico           TEXT    DEFAULT '',
      valor_estimado     REAL,
      valor_final        REAL,
      status             TEXT    NOT NULL DEFAULT 'aberta',
      data_entrada       TEXT    DEFAULT (date('now','localtime')),
      data_prevista      TEXT,
      data_conclusao     TEXT,
      created_at         TEXT    DEFAULT (datetime('now','localtime')),
      updated_at         TEXT    DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_oficina_status ON oficina_ordens(status);
    CREATE INDEX IF NOT EXISTS idx_oficina_data_entrada ON oficina_ordens(data_entrada);
    -- Note: idx_oficina_moto_id is created AFTER the moto_id column migration below
    -- (cannot create index here because legacy DBs may not yet have the column)
  `);

  // ----- Migrations: additional columns on oficina_ordens -----
  const existingOfCols = new Set(
    (db.prepare('PRAGMA table_info(oficina_ordens)').all() as { name: string }[]).map((c) => c.name),
  );
  const addOfCol = (name: string, definition: string): void => {
    if (!existingOfCols.has(name)) {
      db.exec(`ALTER TABLE oficina_ordens ADD COLUMN ${name} ${definition}`);
      existingOfCols.add(name);
    }
  };
  // Vínculo opcional com moto do estoque
  addOfCol('moto_id', 'INTEGER');
  db.exec('CREATE INDEX IF NOT EXISTS idx_oficina_moto_id ON oficina_ordens(moto_id)');
  // Garantia: OS nova referenciando OS finalizada anterior
  addOfCol('garantia_de_id', 'INTEGER');
  db.exec('CREATE INDEX IF NOT EXISTS idx_oficina_garantia_de ON oficina_ordens(garantia_de_id)');

  // ----- Histórico de mudanças de status -----
  db.exec(`
    CREATE TABLE IF NOT EXISTS oficina_historico (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      ordem_id        INTEGER NOT NULL REFERENCES oficina_ordens(id) ON DELETE CASCADE,
      status_anterior TEXT,
      status_novo     TEXT NOT NULL,
      mensagem        TEXT DEFAULT '',
      autor           TEXT DEFAULT '',
      created_at      TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_historico_ordem ON oficina_historico(ordem_id);
  `);

  // ----- Migration: map legacy oficina_ordens.status values to new taxonomy -----
  // old: em_andamento | concluida | entregue   →   new: em_servico | finalizada | finalizada
  db.exec(`
    UPDATE oficina_ordens SET status='em_servico' WHERE status='em_andamento';
    UPDATE oficina_ordens SET status='finalizada' WHERE status IN ('concluida','entregue');
  `);

  // ----- Migrations: additional admin-only columns on motos -----
  const existingCols = new Set(
    (db.prepare('PRAGMA table_info(motos)').all() as { name: string }[]).map((c) => c.name),
  );
  const addCol = (name: string, definition: string): void => {
    if (!existingCols.has(name)) {
      db.exec(`ALTER TABLE motos ADD COLUMN ${name} ${definition}`);
      existingCols.add(name);
    }
  };
  // Controle interno
  addCol('tipo_entrada', "TEXT DEFAULT ''");        // 'compra' | 'consignada'
  addCol('placa', "TEXT DEFAULT ''");
  addCol('chassi', "TEXT DEFAULT ''");
  addCol('renavam', "TEXT DEFAULT ''");
  addCol('numero_motor', "TEXT DEFAULT ''");
  addCol('valor_compra', 'REAL');
  addCol('nome_cliente', "TEXT DEFAULT ''");
  addCol('responsavel_compra', "TEXT DEFAULT ''");
  // Fichamento técnico (podem ser expostos publicamente)
  addCol('modelo', "TEXT DEFAULT ''");
  addCol('ano_fabricacao', 'INTEGER');
  addCol('versao', "TEXT DEFAULT ''");
  addCol('cor', "TEXT DEFAULT ''");
  addCol('combustivel', "TEXT DEFAULT ''");
  addCol('transmissao', "TEXT DEFAULT ''");
  // Venda (admin-only)
  addCol('vendida', 'INTEGER DEFAULT 0');
  addCol('vendedor_id', 'INTEGER');
  addCol('comprador_nome', "TEXT DEFAULT ''");
  addCol('valor_venda_final', 'REAL');
  addCol('data_venda', 'TEXT');

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

/**
 * Colunas que NUNCA devem ser expostas em endpoints públicos.
 * Contém placa, chassi, documentos e dados financeiros/cliente internos.
 */
export const MOTOS_ADMIN_ONLY_COLS = [
  'tipo_entrada',
  'placa',
  'chassi',
  'renavam',
  'numero_motor',
  'valor_compra',
  'nome_cliente',
  'responsavel_compra',
  'vendida',
  'vendedor_id',
  'comprador_nome',
  'valor_venda_final',
  'data_venda',
] as const;

/**
 * Remove colunas admin-only de uma linha de moto antes de expor publicamente.
 */
export function stripAdminFields<T extends Record<string, unknown>>(row: T): Partial<T> {
  const copy: Record<string, unknown> = { ...row };
  for (const col of MOTOS_ADMIN_ONLY_COLS) delete copy[col];
  return copy as Partial<T>;
}

export default getDb;
