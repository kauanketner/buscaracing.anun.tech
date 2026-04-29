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

    CREATE TABLE IF NOT EXISTS pecas (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      nome            TEXT    NOT NULL,
      categoria       TEXT    NOT NULL DEFAULT 'outros',
      descricao       TEXT    DEFAULT '',
      preco           REAL,
      preco_original  REAL,
      imagem          TEXT,
      marca_moto      TEXT    DEFAULT '',
      modelo_compat   TEXT    DEFAULT '',
      codigo          TEXT    DEFAULT '',
      destaque        INTEGER DEFAULT 0,
      ativo           INTEGER DEFAULT 1,
      created_at      TEXT    DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_pecas_categoria ON pecas(categoria);
    CREATE INDEX IF NOT EXISTS idx_pecas_ativo ON pecas(ativo);

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

    -- Compradores: equipe interna que vai a leiloes/lojistas/particulares
    -- comprar motos pra compor o estoque (responsavel_compra das motos)
    CREATE TABLE IF NOT EXISTS compradores (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nome       TEXT    NOT NULL,
      telefone   TEXT    DEFAULT '',
      email      TEXT    DEFAULT '',
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
  // ----- Aluguel: disponibilidade e valor de diária -----
  addCol('disponivel_aluguel', 'INTEGER DEFAULT 0');
  addCol('valor_diaria', 'REAL');
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

  // ----- Aluguel: solicitações de aluguel de motos -----
  db.exec(`
    CREATE TABLE IF NOT EXISTS alugueis (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      moto_id         INTEGER NOT NULL REFERENCES motos(id),
      status          TEXT    NOT NULL DEFAULT 'pendente',
      data_inicio     TEXT    NOT NULL,
      data_fim        TEXT    NOT NULL,
      dias            INTEGER NOT NULL,
      valor_diaria    REAL    NOT NULL,
      valor_total     REAL    NOT NULL,
      valor_caucao    REAL    NOT NULL DEFAULT 0,
      cliente_nome    TEXT    NOT NULL,
      telefone        TEXT    NOT NULL,
      email           TEXT    DEFAULT '',
      cpf             TEXT    NOT NULL,
      cnh             TEXT    NOT NULL,
      observacoes     TEXT    DEFAULT '',
      admin_notas     TEXT    DEFAULT '',
      motivo_recusa   TEXT    DEFAULT '',
      valor_dano      REAL    DEFAULT 0,
      created_at      TEXT    DEFAULT (datetime('now','localtime')),
      aprovada_em     TEXT,
      retirada_em     TEXT,
      devolvida_em    TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_alugueis_moto ON alugueis(moto_id);
    CREATE INDEX IF NOT EXISTS idx_alugueis_status ON alugueis(status);
    CREATE INDEX IF NOT EXISTS idx_alugueis_datas ON alugueis(data_inicio, data_fim);

    -- Peças usadas em cada OS (snapshot de nome/preço para histórico mesmo
    -- se a peça for editada ou removida do catálogo)
    CREATE TABLE IF NOT EXISTS os_pecas (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      ordem_id        INTEGER NOT NULL REFERENCES oficina_ordens(id) ON DELETE CASCADE,
      peca_id         INTEGER REFERENCES pecas(id) ON DELETE SET NULL,
      nome_snapshot   TEXT    NOT NULL,
      codigo_snapshot TEXT    DEFAULT '',
      quantidade      INTEGER NOT NULL DEFAULT 1,
      preco_unitario  REAL    NOT NULL DEFAULT 0,
      created_at      TEXT    DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_os_pecas_ordem ON os_pecas(ordem_id);

    -- Movimentações de estoque de peças (entrada/saida)
    CREATE TABLE IF NOT EXISTS pecas_movimentacoes (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      peca_id       INTEGER NOT NULL REFERENCES pecas(id) ON DELETE CASCADE,
      tipo          TEXT NOT NULL,            -- 'entrada' | 'saida'
      quantidade    INTEGER NOT NULL,
      descricao     TEXT DEFAULT '',
      ref_tipo      TEXT DEFAULT 'manual',    -- 'manual' | 'os'
      ref_id        INTEGER,                  -- id da OS se for 'os'
      created_at    TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_pecas_mov_peca ON pecas_movimentacoes(peca_id);
    CREATE INDEX IF NOT EXISTS idx_pecas_mov_created ON pecas_movimentacoes(created_at);

    -- PDV: vendas avulsas de peças (balcão / site / WhatsApp), sem OS
    CREATE TABLE IF NOT EXISTS pdv_vendas (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_nome    TEXT NOT NULL,
      cliente_tel     TEXT DEFAULT '',
      cliente_cpf     TEXT DEFAULT '',
      cliente_email   TEXT DEFAULT '',
      vendedor_id     INTEGER REFERENCES vendedores(id),
      canal           TEXT DEFAULT 'balcao',     -- 'balcao' | 'site' | 'whatsapp' | 'outro'
      forma_pagamento TEXT DEFAULT 'pix',        -- 'pix' | 'dinheiro' | 'debito' | 'credito'
      parcelas        INTEGER DEFAULT 1,         -- só relevante p/ credito
      valor_bruto     REAL NOT NULL,             -- soma dos itens
      desconto        REAL DEFAULT 0,
      valor_total     REAL NOT NULL,
      observacoes     TEXT DEFAULT '',
      status          TEXT DEFAULT 'concluida',  -- 'concluida' | 'cancelada'
      cancelada_em    TEXT,
      cancelada_motivo TEXT DEFAULT '',
      data_venda      TEXT DEFAULT (date('now','localtime')),
      created_at      TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_pdv_vendas_data ON pdv_vendas(data_venda);
    CREATE INDEX IF NOT EXISTS idx_pdv_vendas_status ON pdv_vendas(status);
    CREATE INDEX IF NOT EXISTS idx_pdv_vendas_vendedor ON pdv_vendas(vendedor_id);

    CREATE TABLE IF NOT EXISTS pdv_itens (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      pdv_venda_id    INTEGER NOT NULL REFERENCES pdv_vendas(id) ON DELETE CASCADE,
      peca_id         INTEGER REFERENCES pecas(id) ON DELETE SET NULL,
      nome_snapshot   TEXT NOT NULL,
      codigo_snapshot TEXT DEFAULT '',
      quantidade      INTEGER NOT NULL,
      preco_unitario  REAL NOT NULL,
      created_at      TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_pdv_itens_venda ON pdv_itens(pdv_venda_id);

    -- Catálogo de serviços (espelho simplificado de pecas — sem estoque/imagem)
    CREATE TABLE IF NOT EXISTS servicos (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nome        TEXT    NOT NULL,
      codigo      TEXT    DEFAULT '',
      categoria   TEXT    DEFAULT 'outros',
      descricao   TEXT    DEFAULT '',
      preco       REAL,
      ativo       INTEGER DEFAULT 1,
      created_at  TEXT    DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_servicos_categoria ON servicos(categoria);
    CREATE INDEX IF NOT EXISTS idx_servicos_ativo ON servicos(ativo);

    -- Serviços lançados em cada OS (snapshot de nome/preço; espelho de os_pecas)
    CREATE TABLE IF NOT EXISTS os_servicos (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      ordem_id        INTEGER NOT NULL REFERENCES oficina_ordens(id) ON DELETE CASCADE,
      servico_id      INTEGER REFERENCES servicos(id) ON DELETE SET NULL,
      nome_snapshot   TEXT    NOT NULL,
      codigo_snapshot TEXT    DEFAULT '',
      quantidade      INTEGER NOT NULL DEFAULT 1,
      preco_unitario  REAL    NOT NULL DEFAULT 0,
      created_at      TEXT    DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_os_servicos_ordem ON os_servicos(ordem_id);

    -- Categorias gerenciáveis (motos + peças em tabela única por tipo)
    CREATE TABLE IF NOT EXISTS categorias (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo        TEXT NOT NULL,             -- 'moto' | 'peca'
      slug        TEXT NOT NULL,
      label       TEXT NOT NULL,
      descricao   TEXT DEFAULT '',
      ordem       INTEGER DEFAULT 0,
      ativo       INTEGER DEFAULT 1,
      created_at  TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(tipo, slug)
    );
    CREATE INDEX IF NOT EXISTS idx_categorias_tipo ON categorias(tipo);
  `);

  // ----- Pecas: coluna estoque_qtd (migration idempotente) -----
  const existingPecasCols = new Set(
    (db.prepare('PRAGMA table_info(pecas)').all() as { name: string }[]).map((c) => c.name),
  );
  if (!existingPecasCols.has('estoque_qtd')) {
    db.exec('ALTER TABLE pecas ADD COLUMN estoque_qtd INTEGER DEFAULT 0');
  }
  if (!existingPecasCols.has('estoque_min')) {
    db.exec('ALTER TABLE pecas ADD COLUMN estoque_min INTEGER DEFAULT 0');
  }

  // ----- Seed categorias (idempotente) -----
  const catCount = (db.prepare('SELECT COUNT(*) AS c FROM categorias').get() as { c: number }).c;
  if (catCount === 0) {
    const insertCat = db.prepare(
      'INSERT OR IGNORE INTO categorias (tipo, slug, label, descricao, ordem) VALUES (?, ?, ?, ?, ?)',
    );
    // Motos
    const motos = [
      ['motos-rua', 'Motos de Rua', 'Motos de uso urbano e estrada', 1],
      ['offroad', 'Offroad', 'Motos para trilha, enduro e motocross', 2],
      ['quadriciclos', 'Quadriciclos', 'ATVs e quadriciclos', 3],
      ['infantil', 'Infantil', 'Motos infantis e elétricas', 4],
      ['outros', 'Outros', 'Outras categorias', 99],
    ];
    for (const [slug, label, desc, ordem] of motos) {
      insertCat.run('moto', slug, label, desc, ordem);
    }
    // Peças
    const pecasCat = [
      ['motor', 'Motor e Transmissão', 'Pistões, anéis, juntas, correntes, kit relação, embreagem e mais.', 1],
      ['freios', 'Freios', 'Pastilhas, discos, manetes, cabos e fluidos de freio.', 2],
      ['suspensao', 'Suspensão', 'Amortecedores, molas, bengalas, retentores e kits de reparo.', 3],
      ['eletrica', 'Elétrica', 'Baterias, velas, CDI, reguladores, chicotes e lâmpadas.', 4],
      ['carenagem', 'Carenagem e Plásticos', 'Carenagens, para-lamas, laterais e peças plásticas.', 5],
      ['pneus-rodas', 'Pneus e Rodas', 'Pneus de rua, trilha e misto. Câmaras, aros e cubos.', 6],
      ['outros', 'Outros', 'Outras peças e acessórios diversos.', 99],
    ];
    for (const [slug, label, desc, ordem] of pecasCat) {
      insertCat.run('peca', slug, label, desc, ordem);
    }
  }

  // ----- Fase 6: token column on vendas (comprador portal) -----
  const existingVendasCols = new Set(
    (db.prepare('PRAGMA table_info(vendas)').all() as { name: string }[]).map((c) => c.name),
  );
  if (!existingVendasCols.has('token')) {
    db.exec("ALTER TABLE vendas ADD COLUMN token TEXT DEFAULT ''");
    db.exec('CREATE INDEX IF NOT EXISTS idx_vendas_token ON vendas(token)');
  }
  if (!existingVendasCols.has('comprador_endereco')) {
    db.exec("ALTER TABLE vendas ADD COLUMN comprador_endereco TEXT DEFAULT ''");
  }
  if (!existingVendasCols.has('comprador_cpf')) {
    db.exec("ALTER TABLE vendas ADD COLUMN comprador_cpf TEXT DEFAULT ''");
  }

  // Comprovantes de venda (PIX, transferência, nota assinada, etc.)
  db.exec(`
    CREATE TABLE IF NOT EXISTS venda_comprovantes (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      venda_id     INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
      url          TEXT NOT NULL,
      nome_arquivo TEXT DEFAULT '',
      tipo_mime    TEXT DEFAULT '',
      descricao    TEXT DEFAULT '',
      created_at   TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_venda_comprov_venda ON venda_comprovantes(venda_id);

    -- Comprovantes de reserva (sinal pago, conversa cliente, etc.) — espelho de venda_comprovantes
    CREATE TABLE IF NOT EXISTS reserva_comprovantes (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      reserva_id   INTEGER NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
      url          TEXT NOT NULL,
      nome_arquivo TEXT DEFAULT '',
      tipo_mime    TEXT DEFAULT '',
      descricao    TEXT DEFAULT '',
      created_at   TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_reserva_comprov_reserva ON reserva_comprovantes(reserva_id);
  `);

  // ----- Checklists -----
  db.exec(`
    CREATE TABLE IF NOT EXISTS checklists (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo      TEXT NOT NULL,
      descricao   TEXT DEFAULT '',
      token       TEXT NOT NULL,
      ativo       INTEGER DEFAULT 1,
      created_at  TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_checklists_token ON checklists(token);

    CREATE TABLE IF NOT EXISTS checklist_itens (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      checklist_id  INTEGER NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
      tipo          TEXT NOT NULL DEFAULT 'checkbox',
      label         TEXT NOT NULL,
      ordem         INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_checklist_itens_checklist ON checklist_itens(checklist_id);

    CREATE TABLE IF NOT EXISTS checklist_respostas (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      checklist_id    INTEGER NOT NULL REFERENCES checklists(id),
      preenchido_por  TEXT NOT NULL,
      created_at      TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_checklist_resp_checklist ON checklist_respostas(checklist_id);

    CREATE TABLE IF NOT EXISTS checklist_resposta_itens (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      resposta_id     INTEGER NOT NULL REFERENCES checklist_respostas(id) ON DELETE CASCADE,
      item_id         INTEGER NOT NULL REFERENCES checklist_itens(id),
      valor_checkbox  INTEGER DEFAULT 0,
      valor_texto     TEXT DEFAULT '',
      valor_foto      TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS checklist_agendamentos (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      checklist_id    INTEGER NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
      horario         TEXT NOT NULL,
      dias_semana     TEXT DEFAULT '1,2,3,4,5',
      numeros         TEXT NOT NULL,
      mensagem        TEXT DEFAULT '',
      ativo           INTEGER DEFAULT 1,
      ultimo_envio    TEXT,
      created_at      TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_checklist_agend ON checklist_agendamentos(checklist_id);
  `);

  // Seed default configuration keys
  const insert = db.prepare(
    "INSERT OR IGNORE INTO configuracoes(chave, valor) VALUES(?, '')"
  );
  const seedKeys = [
    'logo', 'telefone', 'whatsapp', 'email', 'endereco',
    'hero_img', 'cat_rua_img', 'cat_offroad_img', 'cat_quad_img', 'cat_infantil_img',
    'wts_from', 'wts_template_id',
    'venda_notif_template_id', 'venda_notif_numeros',
  ];
  // Seed WTS defaults if empty
  const setDefault = (k: string, v: string) => {
    const existing = db.prepare('SELECT valor FROM configuracoes WHERE chave=?').get(k) as { valor: string } | undefined;
    if (!existing || !existing.valor) {
      db.prepare("INSERT INTO configuracoes(chave, valor) VALUES(?, ?) ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor").run(k, v);
    }
  };
  setDefault('wts_from', '551151073435');
  setDefault('wts_template_id', '58f53_checklistlembrete');
  setDefault('aluguel_caucao_padrao', '500');
  setDefault('venda_notif_template_id', 'venda_realizada');
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

  // ───────────────────────────────────────────────────────────────────
  // Leads — captados pelo vendedor PWA / formulários
  // (tabela referenciada em /api/vendedor/leads e /api/clientes;
  // estava implícita em DBs antigos mas faltava CREATE TABLE explícito)
  // ───────────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      moto_id     INTEGER REFERENCES motos(id) ON DELETE SET NULL,
      vendedor_id INTEGER REFERENCES vendedores(id) ON DELETE SET NULL,
      nome        TEXT NOT NULL,
      telefone    TEXT DEFAULT '',
      origem      TEXT DEFAULT '',
      notas       TEXT DEFAULT '',
      created_at  TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_leads_vendedor ON leads(vendedor_id);
    CREATE INDEX IF NOT EXISTS idx_leads_moto ON leads(moto_id);
  `);

  // ───────────────────────────────────────────────────────────────────
  // Centralização de cliente — tabela `clientes` + cliente_id em tabelas filhas
  // (Approach A do design 2026-04-29-clientes-centralizado-design.md)
  // ───────────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS clientes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nome        TEXT NOT NULL,
      telefone    TEXT DEFAULT '',
      email       TEXT DEFAULT '',
      cpf_cnpj    TEXT DEFAULT '',
      endereco    TEXT DEFAULT '',
      observacoes TEXT DEFAULT '',
      ativo       INTEGER DEFAULT 1,
      created_at  TEXT DEFAULT (datetime('now','localtime')),
      updated_at  TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(telefone);
    CREATE INDEX IF NOT EXISTS idx_clientes_cpf      ON clientes(cpf_cnpj);
    CREATE INDEX IF NOT EXISTS idx_clientes_ativo    ON clientes(ativo);
  `);

  // Adiciona cliente_id em cada tabela filha (idempotente)
  const addClienteIdCol = (tabela: string): void => {
    const cols = (db.prepare(`PRAGMA table_info(${tabela})`).all() as { name: string }[]).map(
      (c) => c.name,
    );
    if (!cols.includes('cliente_id')) {
      db.exec(`ALTER TABLE ${tabela} ADD COLUMN cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_${tabela}_cliente_id ON ${tabela}(cliente_id)`);
    }
  };
  for (const t of ['vendas', 'oficina_ordens', 'reservas', 'consignacoes', 'alugueis', 'leads', 'pdv_vendas']) {
    try { addClienteIdCol(t); } catch { /* tabela pode não existir em DBs antigos */ }
  }

  // Migração idempotente: liga registros sem cliente_id a clientes existentes
  // (ou cria novos). Sempre roda — só toca registros com cliente_id IS NULL.
  linkarSnapshotsRestantes(db);
}

/**
 * Para cada tabela com snapshot de cliente, processa os registros que ainda
 * não têm `cliente_id` e os linka a um cliente existente (matched por nome
 * normalizado + dígitos do telefone) ou cria um cliente novo.
 *
 * É idempotente: pode rodar a cada boot. Não duplica clientes nem reprocessa
 * registros já linkados.
 */
function linkarSnapshotsRestantes(db: Database.Database): void {
  const sources: Array<{
    tabela: string;
    sql: string;
    extractor: (r: Record<string, unknown>) => {
      ref_id: number;
      nome: string;
      telefone: string;
      email: string;
      cpf_cnpj: string;
      endereco: string;
    };
  }> = [
    {
      tabela: 'vendas',
      sql: `SELECT id, comprador_nome AS nome, comprador_tel AS telefone,
                   comprador_email AS email, comprador_cpf AS cpf,
                   comprador_endereco AS endereco
            FROM vendas WHERE cliente_id IS NULL`,
      extractor: (r) => ({
        ref_id: Number(r.id), nome: String(r.nome || ''), telefone: String(r.telefone || ''),
        email: String(r.email || ''), cpf_cnpj: String(r.cpf || ''), endereco: String(r.endereco || ''),
      }),
    },
    {
      tabela: 'oficina_ordens',
      sql: `SELECT id, cliente_nome AS nome, cliente_telefone AS telefone, cliente_email AS email
            FROM oficina_ordens WHERE cliente_id IS NULL`,
      extractor: (r) => ({
        ref_id: Number(r.id), nome: String(r.nome || ''), telefone: String(r.telefone || ''),
        email: String(r.email || ''), cpf_cnpj: '', endereco: '',
      }),
    },
    {
      tabela: 'reservas',
      sql: `SELECT id, cliente_nome AS nome, cliente_tel AS telefone
            FROM reservas WHERE cliente_id IS NULL`,
      extractor: (r) => ({
        ref_id: Number(r.id), nome: String(r.nome || ''), telefone: String(r.telefone || ''),
        email: '', cpf_cnpj: '', endereco: '',
      }),
    },
    {
      tabela: 'consignacoes',
      sql: `SELECT id, dono_nome AS nome, dono_telefone AS telefone, dono_email AS email
            FROM consignacoes WHERE cliente_id IS NULL`,
      extractor: (r) => ({
        ref_id: Number(r.id), nome: String(r.nome || ''), telefone: String(r.telefone || ''),
        email: String(r.email || ''), cpf_cnpj: '', endereco: '',
      }),
    },
    {
      tabela: 'alugueis',
      sql: `SELECT id, cliente_nome AS nome, telefone, email, cpf
            FROM alugueis WHERE cliente_id IS NULL`,
      extractor: (r) => ({
        ref_id: Number(r.id), nome: String(r.nome || ''), telefone: String(r.telefone || ''),
        email: String(r.email || ''), cpf_cnpj: String(r.cpf || ''), endereco: '',
      }),
    },
    {
      tabela: 'leads',
      sql: `SELECT id, nome, telefone FROM leads WHERE cliente_id IS NULL`,
      extractor: (r) => ({
        ref_id: Number(r.id), nome: String(r.nome || ''), telefone: String(r.telefone || ''),
        email: '', cpf_cnpj: '', endereco: '',
      }),
    },
    {
      tabela: 'pdv_vendas',
      sql: `SELECT id, cliente_nome AS nome, cliente_tel AS telefone,
                   cliente_email AS email, cliente_cpf AS cpf
            FROM pdv_vendas WHERE cliente_id IS NULL`,
      extractor: (r) => ({
        ref_id: Number(r.id), nome: String(r.nome || ''), telefone: String(r.telefone || ''),
        email: String(r.email || ''), cpf_cnpj: String(r.cpf || ''), endereco: '',
      }),
    },
  ];

  // Helper local de upsert (espelho de lib/clientes-helper.ts pra evitar dep circular)
  const upsertCliente = (snap: { nome: string; telefone: string; email: string; cpf_cnpj: string; endereco: string }): number | null => {
    const nome = snap.nome.trim();
    if (!nome) return null;
    const tel = snap.telefone.trim();
    const telDigits = tel.replace(/\D/g, '');
    const nomeNorm = nome.toLowerCase().replace(/\s+/g, ' ');

    let clienteId: number | null = null;
    if (telDigits.length > 0) {
      const candidatos = db
        .prepare("SELECT id, telefone FROM clientes WHERE LOWER(TRIM(REPLACE(nome, '  ', ' '))) = ? AND ativo = 1")
        .all(nomeNorm) as { id: number; telefone: string }[];
      for (const c of candidatos) {
        const cTel = (c.telefone || '').replace(/\D/g, '');
        if (cTel === telDigits) { clienteId = c.id; break; }
      }
    } else {
      const semTel = db
        .prepare("SELECT id FROM clientes WHERE LOWER(TRIM(REPLACE(nome, '  ', ' '))) = ? AND ativo = 1")
        .all(nomeNorm) as { id: number }[];
      if (semTel.length === 1) clienteId = semTel[0].id;
    }

    if (clienteId == null) {
      try {
        const result = db
          .prepare(`INSERT INTO clientes (nome, telefone, email, cpf_cnpj, endereco) VALUES (?, ?, ?, ?, ?)`)
          .run(nome, tel, snap.email, snap.cpf_cnpj, snap.endereco);
        clienteId = Number(result.lastInsertRowid);
      } catch { return null; }
    }
    return clienteId;
  };

  const tx = db.transaction(() => {
    for (const src of sources) {
      let rows: Record<string, unknown>[];
      try {
        rows = db.prepare(src.sql).all() as Record<string, unknown>[];
      } catch {
        // tabela pode não existir ou não ter cliente_id ainda — segue
        continue;
      }
      for (const r of rows) {
        const snap = src.extractor(r);
        if (!snap.nome.trim()) continue;
        const cid = upsertCliente(snap);
        if (cid != null) {
          try {
            db.prepare(`UPDATE ${src.tabela} SET cliente_id = ? WHERE id = ?`).run(cid, snap.ref_id);
          } catch { /* silencioso */ }
        }
      }
    }
  });
  tx();
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
