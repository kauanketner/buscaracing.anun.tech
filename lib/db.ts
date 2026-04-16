import Database from 'better-sqlite3';
import crypto from 'crypto';
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
  // Mecânico responsável pela OS (FK lógica pra mecanicos.id)
  // Rename idempotente: deploys antigos têm `tecnico_id`; renomeamos para `mecanico_id`.
  if (existingOfCols.has('tecnico_id') && !existingOfCols.has('mecanico_id')) {
    db.exec('ALTER TABLE oficina_ordens RENAME COLUMN tecnico_id TO mecanico_id');
    existingOfCols.delete('tecnico_id');
    existingOfCols.add('mecanico_id');
  }
  addOfCol('mecanico_id', 'INTEGER');
  // Rename do índice (idempotente): DROP o antigo se existir, CREATE o novo.
  db.exec('DROP INDEX IF EXISTS idx_oficina_tecnico_id');
  db.exec('CREATE INDEX IF NOT EXISTS idx_oficina_mecanico_id ON oficina_ordens(mecanico_id)');

  // ----- Migrations: PIN columns on mecanicos (módulo /mecanico) -----
  const existingMecCols = new Set(
    (db.prepare('PRAGMA table_info(mecanicos)').all() as { name: string }[]).map((c) => c.name),
  );
  const addMecCol = (name: string, definition: string): void => {
    if (!existingMecCols.has(name)) {
      db.exec(`ALTER TABLE mecanicos ADD COLUMN ${name} ${definition}`);
      existingMecCols.add(name);
    }
  };
  addMecCol('pin_hash', "TEXT DEFAULT ''");           // scrypt:<salt_b64>:<hash_b64>
  addMecCol('pin_ativo', 'INTEGER DEFAULT 0');        // 0 = sem acesso ao /mecanico
  addMecCol('pin_trocado_em', 'TEXT');

  // ----- Rate-limit de tentativas de PIN -----
  // Rename idempotente: deploys antigos têm `tecnico_login_attempts`; renomeamos.
  const hasOldAttemptsTable = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='tecnico_login_attempts'",
    )
    .get() as { name: string } | undefined;
  const hasNewAttemptsTable = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='mecanico_login_attempts'",
    )
    .get() as { name: string } | undefined;
  if (hasOldAttemptsTable && !hasNewAttemptsTable) {
    db.exec('ALTER TABLE tecnico_login_attempts RENAME TO mecanico_login_attempts');
    // Renomeia a coluna antiga `tecnico_id` para `mecanico_id`.
    const attemptCols = new Set(
      (db
        .prepare('PRAGMA table_info(mecanico_login_attempts)')
        .all() as { name: string }[]).map((c) => c.name),
    );
    if (attemptCols.has('tecnico_id') && !attemptCols.has('mecanico_id')) {
      db.exec(
        'ALTER TABLE mecanico_login_attempts RENAME COLUMN tecnico_id TO mecanico_id',
      );
    }
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS mecanico_login_attempts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      ip          TEXT    NOT NULL,
      mecanico_id INTEGER,
      success     INTEGER NOT NULL,
      created_at  TEXT    DEFAULT (datetime('now','localtime'))
    );
    DROP INDEX IF EXISTS idx_login_attempts_ip_time;
    CREATE INDEX IF NOT EXISTS idx_mec_login_attempts_ip_time
      ON mecanico_login_attempts(ip, created_at);
  `);
  // Limpeza: tentativas com mais de 7 dias são irrelevantes
  db.exec("DELETE FROM mecanico_login_attempts WHERE created_at < datetime('now','-7 days')");

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
  // Fichamento mecânico (podem ser expostos publicamente)
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

  // ----- Fase 1: Estoque — estado e origem -----
  addCol('estado', "TEXT DEFAULT 'avaliacao'");
  addCol('origem', "TEXT DEFAULT 'compra_direta'");
  addCol('troca_venda_id', 'INTEGER');
  addCol('consignacao_id', 'INTEGER');
  db.exec('CREATE INDEX IF NOT EXISTS idx_motos_estado ON motos(estado)');
  // Migrar dados existentes para o campo estado
  db.exec(`
    UPDATE motos SET estado='entregue'   WHERE vendida=1 AND (estado='avaliacao' OR estado IS NULL OR estado='');
    UPDATE motos SET estado='anunciada'  WHERE ativo=1 AND vendida=0 AND (estado='avaliacao' OR estado IS NULL OR estado='');
    UPDATE motos SET estado='disponivel' WHERE ativo=0 AND vendida=0 AND (estado='avaliacao' OR estado IS NULL OR estado='');
  `);
  // Migrar tipo_entrada → origem
  db.exec(`
    UPDATE motos SET origem='consignada' WHERE tipo_entrada='consignada' AND (origem='compra_direta' OR origem IS NULL OR origem='');
  `);

  // ----- Fase 2: vendedores extra columns -----
  const existingVendCols = new Set(
    (db.prepare('PRAGMA table_info(vendedores)').all() as { name: string }[]).map((c) => c.name),
  );
  const addVendCol = (name: string, definition: string): void => {
    if (!existingVendCols.has(name)) {
      db.exec(`ALTER TABLE vendedores ADD COLUMN ${name} ${definition}`);
      existingVendCols.add(name);
    }
  };
  addVendCol('tipo', "TEXT DEFAULT 'interno'");   // interno | externo
  addVendCol('pix_chave', "TEXT DEFAULT ''");
  // Fase 5: PIN access for vendedor PWA
  addVendCol('pin_hash', "TEXT DEFAULT ''");
  addVendCol('pin_ativo', 'INTEGER DEFAULT 0');
  addVendCol('pin_trocado_em', 'TEXT');

  // ----- Fase 5: vendedor login attempts -----
  db.exec(`
    CREATE TABLE IF NOT EXISTS vendedor_login_attempts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      ip          TEXT    NOT NULL,
      vendedor_id INTEGER,
      success     INTEGER NOT NULL,
      created_at  TEXT    DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_vend_login_ip_time
      ON vendedor_login_attempts(ip, created_at);
  `);
  db.exec("DELETE FROM vendedor_login_attempts WHERE created_at < datetime('now','-7 days')");

  // ----- Fase 2: vendas, reservas, comissoes, lancamentos -----
  db.exec(`
    CREATE TABLE IF NOT EXISTS vendas (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      moto_id         INTEGER NOT NULL REFERENCES motos(id),
      comprador_nome  TEXT NOT NULL,
      comprador_tel   TEXT DEFAULT '',
      comprador_email TEXT DEFAULT '',
      vendedor_id     INTEGER REFERENCES vendedores(id),
      vendedor_tipo   TEXT DEFAULT 'interno',
      valor_venda     REAL NOT NULL,
      valor_sinal     REAL DEFAULT 0,
      forma_pagamento TEXT DEFAULT '',
      troca_moto_id   INTEGER,
      troca_valor     REAL,
      comissao_valor  REAL DEFAULT 0,
      observacoes     TEXT DEFAULT '',
      data_venda      TEXT DEFAULT (date('now','localtime')),
      created_at      TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_vendas_moto ON vendas(moto_id);
    CREATE INDEX IF NOT EXISTS idx_vendas_data ON vendas(data_venda);

    CREATE TABLE IF NOT EXISTS reservas (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      moto_id         INTEGER NOT NULL REFERENCES motos(id),
      cliente_nome    TEXT NOT NULL,
      cliente_tel     TEXT DEFAULT '',
      valor_sinal     REAL DEFAULT 500,
      dias_prazo      INTEGER DEFAULT 7,
      data_inicio     TEXT DEFAULT (date('now','localtime')),
      data_expira     TEXT,
      status          TEXT DEFAULT 'ativa',
      venda_id        INTEGER,
      created_at      TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_reservas_moto ON reservas(moto_id);
    CREATE INDEX IF NOT EXISTS idx_reservas_status ON reservas(status);

    CREATE TABLE IF NOT EXISTS comissoes (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      venda_id        INTEGER NOT NULL REFERENCES vendas(id),
      vendedor_id     INTEGER NOT NULL REFERENCES vendedores(id),
      valor           REAL NOT NULL,
      pago            INTEGER DEFAULT 0,
      data_pagamento  TEXT,
      created_at      TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS lancamentos (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo            TEXT NOT NULL,
      categoria       TEXT NOT NULL,
      valor           REAL NOT NULL,
      descricao       TEXT DEFAULT '',
      ref_tipo        TEXT,
      ref_id          INTEGER,
      data            TEXT DEFAULT (date('now','localtime')),
      created_at      TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_lanc_data ON lancamentos(data);
    CREATE INDEX IF NOT EXISTS idx_lanc_ref ON lancamentos(ref_tipo, ref_id);
  `);

  // ----- Fase 3: consignacoes -----
  db.exec(`
    CREATE TABLE IF NOT EXISTS consignacoes (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      moto_id         INTEGER NOT NULL REFERENCES motos(id),
      dono_nome       TEXT NOT NULL,
      dono_telefone   TEXT DEFAULT '',
      dono_email      TEXT DEFAULT '',
      dono_pix        TEXT DEFAULT '',
      margem_pct      REAL DEFAULT 12,
      custo_revisao   REAL DEFAULT 0,
      valor_repasse   REAL,
      repasse_pago    INTEGER DEFAULT 0,
      data_entrada    TEXT DEFAULT (date('now','localtime')),
      data_retirada   TEXT,
      status          TEXT DEFAULT 'ativa',
      token           TEXT,
      created_at      TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_consig_moto ON consignacoes(moto_id);
    CREATE INDEX IF NOT EXISTS idx_consig_token ON consignacoes(token);
    CREATE INDEX IF NOT EXISTS idx_consig_status ON consignacoes(status);
  `);

  // ----- Fase 6: token column on vendas (comprador portal) -----
  const existingVendasCols = new Set(
    (db.prepare('PRAGMA table_info(vendas)').all() as { name: string }[]).map((c) => c.name),
  );
  if (!existingVendasCols.has('token')) {
    db.exec("ALTER TABLE vendas ADD COLUMN token TEXT DEFAULT ''");
    db.exec('CREATE INDEX IF NOT EXISTS idx_vendas_token ON vendas(token)');
  }

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

  // Seed slug do módulo /mecanico (12 chars base32 aleatórios).
  // Migração idempotente: se já existe a chave antiga `mecanico_url_slug`, renomeia
  // para `mecanico_url_slug` preservando o valor.
  const legacySlug = db
    .prepare("SELECT valor FROM configuracoes WHERE chave='mecanico_url_slug'")
    .get() as { valor: string } | undefined;
  const newSlug = db
    .prepare("SELECT valor FROM configuracoes WHERE chave='mecanico_url_slug'")
    .get() as { valor: string } | undefined;
  if (legacySlug && legacySlug.valor && (!newSlug || !newSlug.valor)) {
    db.prepare(
      "INSERT INTO configuracoes(chave, valor) VALUES('mecanico_url_slug', ?) " +
        'ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor',
    ).run(legacySlug.valor);
  }
  db.exec("DELETE FROM configuracoes WHERE chave='mecanico_url_slug'");
  // Se ainda não existe (com valor), gera um novo.
  const currentSlug = db
    .prepare("SELECT valor FROM configuracoes WHERE chave='mecanico_url_slug'")
    .get() as { valor: string } | undefined;
  if (!currentSlug || !currentSlug.valor) {
    const slug = generateMecanicoSlug();
    db.prepare(
      "INSERT INTO configuracoes(chave, valor) VALUES('mecanico_url_slug', ?) " +
        'ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor',
    ).run(slug);
  }

  // Seed slug do módulo /v (vendedor PWA)
  const vendedorSlug = db
    .prepare("SELECT valor FROM configuracoes WHERE chave='vendedor_url_slug'")
    .get() as { valor: string } | undefined;
  if (!vendedorSlug || !vendedorSlug.valor) {
    const slug = generateMecanicoSlug(); // reuse same slug generator
    db.prepare(
      "INSERT INTO configuracoes(chave, valor) VALUES('vendedor_url_slug', ?) " +
        'ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor',
    ).run(slug);
  }
}

/** Gera um slug base32 (a-z, 2-7) de 12 caracteres. ~60 bits de entropia. */
export function generateMecanicoSlug(): string {
  // 8 bytes → 64 bits de entropia; transformamos em 13 chars base32 e cortamos pra 12.
  const bytes = crypto.randomBytes(8);
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
  // Agrupa os bits em um bitstream contínuo e puxa 5 bits por caractere.
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < bytes.length; i++) {
    buffer = (buffer << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      const idx = (buffer >>> bits) & 0x1f;
      out += alphabet[idx];
    }
  }
  if (bits > 0) {
    const idx = (buffer << (5 - bits)) & 0x1f;
    out += alphabet[idx];
  }
  return out.slice(0, 12);
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
  'estado',
  'origem',
  'troca_venda_id',
  'consignacao_id',
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
