# Design: Sistema de Gestao da Loja

> Aprovado em conversa com o dono. Filosofia: a equipe segue o processo
> sem perceber — o sistema **e** o trabalho.

## 1. Filosofia

Ninguem interage com "modulos" (Estoque, CRM, Financeiro). A equipe
interage com **acoes naturais** ("Chegou moto", "Manda pra oficina",
"Reservar", "Fechar venda") e os dados sao capturados automaticamente.

## 2. Integracao com o sistema atual

### O que ja existe e reaproveita

| Recurso | Tabela/Pagina | Adaptacao |
|---------|---------------|-----------|
| Motos (anuncios) | `motos` + `/admin/motos` | Vira "Estoque". Adiciona coluna `estado`. |
| Oficina (OS) | `oficina_ordens` + `/admin/oficina` | Sem mudanca na OS. Vinculo `moto_id` ja existe. |
| Mecanicos + PWA | `mecanicos` + `/m/<slug>` | Intacto. |
| Vendedores | `vendedores` | Adiciona `tipo` (interno/externo) e `pix_chave`. |
| Fotos de motos | upload existente | Reaproveita. |

### O que muda em tabelas existentes

**`motos`** — nova coluna `estado`:
```
estado TEXT DEFAULT 'avaliacao'
  -- avaliacao | em_oficina | disponivel | anunciada
  -- reservada | vendida | em_revisao | entregue | retirada
```
Migracao dos dados existentes:
- `vendida=1` → `estado='entregue'`
- `ativo=1 AND vendida=0` → `estado='anunciada'`
- `ativo=0 AND vendida=0` → `estado='disponivel'`

Nova coluna `origem`:
```
origem TEXT DEFAULT 'compra_direta'
  -- compra_direta | consignada | troca
```
Migracao: `tipo_entrada='consignada'` → `origem='consignada'`, resto →
`origem='compra_direta'`.

Novas colunas:
- `troca_venda_id INTEGER` — FK p/ venda que gerou a troca (NULL = nao e troca)
- `consignacao_id INTEGER` — FK p/ consignacoes (NULL = nao e consignada)

Site publico: query muda de `WHERE ativo=1` para
`WHERE estado IN ('anunciada','reservada')`. `ativo` vira computed
(view / getter) pra nao quebrar nada.

**`vendedores`** — novas colunas:
- `tipo TEXT DEFAULT 'interno'` — interno | externo
- `pix_chave TEXT DEFAULT ''`

### Novas tabelas

**`vendas`** — registro de cada venda fechada
```sql
CREATE TABLE vendas (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  moto_id         INTEGER NOT NULL REFERENCES motos(id),
  comprador_nome  TEXT NOT NULL,
  comprador_tel   TEXT DEFAULT '',
  comprador_email TEXT DEFAULT '',
  vendedor_id     INTEGER REFERENCES vendedores(id),
  vendedor_tipo   TEXT DEFAULT 'interno',  -- snapshot
  valor_venda     REAL NOT NULL,
  valor_sinal     REAL DEFAULT 0,
  forma_pagamento TEXT DEFAULT '',  -- pix | dinheiro | financiamento | cartao | misto
  troca_moto_id   INTEGER,  -- FK p/ moto que entrou como troca (NULL = sem troca)
  troca_valor     REAL,     -- valor avaliado da moto de troca
  comissao_valor  REAL DEFAULT 0,
  observacoes     TEXT DEFAULT '',
  data_venda      TEXT DEFAULT (date('now','localtime')),
  created_at      TEXT DEFAULT (datetime('now','localtime'))
);
```

**`consignacoes`** — acordo com dono externo
```sql
CREATE TABLE consignacoes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  moto_id         INTEGER NOT NULL REFERENCES motos(id),
  dono_nome       TEXT NOT NULL,
  dono_telefone   TEXT DEFAULT '',
  dono_email      TEXT DEFAULT '',
  dono_pix        TEXT DEFAULT '',
  margem_pct      REAL DEFAULT 12,  -- % da loja
  custo_revisao   REAL DEFAULT 0,   -- preenchido pos-venda
  valor_repasse   REAL,             -- calculado: (100-margem)% * preco - revisao
  repasse_pago    INTEGER DEFAULT 0,
  data_entrada    TEXT DEFAULT (date('now','localtime')),
  data_retirada   TEXT,  -- preenchido se dono retirou
  created_at      TEXT DEFAULT (datetime('now','localtime'))
);
```

**`reservas`** — sinal de R$500
```sql
CREATE TABLE reservas (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  moto_id         INTEGER NOT NULL REFERENCES motos(id),
  cliente_nome    TEXT NOT NULL,
  cliente_tel     TEXT DEFAULT '',
  valor_sinal     REAL DEFAULT 500,
  dias_prazo      INTEGER DEFAULT 7,
  data_inicio     TEXT DEFAULT (date('now','localtime')),
  data_expira     TEXT,  -- calculado: data_inicio + dias_prazo
  status          TEXT DEFAULT 'ativa',  -- ativa | convertida | expirada | cancelada
  venda_id        INTEGER,  -- preenchido quando converte em venda
  created_at      TEXT DEFAULT (datetime('now','localtime'))
);
```

**`leads`** — cliente interessado em moto
```sql
CREATE TABLE leads (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  moto_id         INTEGER REFERENCES motos(id),
  vendedor_id     INTEGER REFERENCES vendedores(id),
  nome            TEXT NOT NULL,
  telefone        TEXT DEFAULT '',
  origem          TEXT DEFAULT '',  -- instagram | site | indicacao | presencial | whatsapp
  notas           TEXT DEFAULT '',
  status          TEXT DEFAULT 'novo',  -- novo | em_contato | reservou | comprou | perdido
  created_at      TEXT DEFAULT (datetime('now','localtime'))
);
```

**`lancamentos`** — livro-caixa automatico
```sql
CREATE TABLE lancamentos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo            TEXT NOT NULL,  -- entrada | saida
  categoria       TEXT NOT NULL,
    -- compra_moto | venda_moto | oficina_receita | oficina_custo
    -- comissao | repasse_consignada | sinal_reserva | devolucao_sinal
    -- despesa_geral
  valor           REAL NOT NULL,
  descricao       TEXT DEFAULT '',
  ref_tipo        TEXT,  -- moto | venda | reserva | consignacao | oficina
  ref_id          INTEGER,
  data            TEXT DEFAULT (date('now','localtime')),
  created_at      TEXT DEFAULT (datetime('now','localtime'))
);
CREATE INDEX idx_lanc_data ON lancamentos(data);
CREATE INDEX idx_lanc_ref ON lancamentos(ref_tipo, ref_id);
```

**`comissoes`** — rastreamento de pagamento
```sql
CREATE TABLE comissoes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  venda_id        INTEGER NOT NULL REFERENCES vendas(id),
  vendedor_id     INTEGER NOT NULL REFERENCES vendedores(id),
  valor           REAL NOT NULL,  -- 200 (interno) ou 400 (externo)
  pago            INTEGER DEFAULT 0,
  data_pagamento  TEXT,
  created_at      TEXT DEFAULT (datetime('now','localtime'))
);
```

## 3. Maquina de estados da moto

```
Estado         | Transicoes possiveis          | Quem aciona        | Automacoes
---------------|-------------------------------|--------------------|---------------------------
avaliacao      | em_oficina, anunciada,        | Admin              |
               | disponivel                    |                    |
em_oficina     | disponivel                    | Auto (OS finaliza) | OS.status='finalizada' → moto.estado='disponivel'
disponivel     | anunciada, em_oficina         | Admin              |
anunciada      | reservada, vendida,           | Admin/Vendedor     |
               | disponivel, retirada          |                    |
reservada      | vendida, anunciada            | Admin/Vendedor     | Timer 7d → se expirar, volta 'anunciada' + devolve sinal
vendida        | em_revisao, entregue          | Admin              | Se consignada → cria OS revisao. Se nao → direto entregue.
em_revisao     | entregue                      | Auto (OS finaliza) | Calcula custo_revisao no repasse do consignante.
entregue       | (final)                       | Admin              | Gera link app comprador.
retirada       | (final, so consignada)        | Admin              | Marca consignacao como retirada.
```

## 4. Navegacao do admin

```
Atual:     Dashboard | Anuncios | Oficina | Mecanicos | Blog | Config

Novo:      Dashboard | Estoque  | Oficina | Vendas | Mecanicos | Blog | Config
                        (era Anuncios)       (novo)
```

**Dashboard** ganha:
- Feed de atividade (timeline do dia)
- Cards: motos em estoque, vendas do mes, margem acumulada, comissoes a pagar, repasses pendentes
- Alertas: reserva expirando, consignada parada, OS atrasada

**Estoque** (evolucao de Anuncios):
- Lista com filtro por estado (todas | em oficina | anunciada | reservada | vendida)
- Acoes contextuais por estado (botoes mudam)
- Modal "Chegou moto" (wizard: origem → dados → fotos)

**Vendas**:
- Lista de vendas com filtros (mes, vendedor, forma pgto)
- Resumo: total vendido, margem, comissoes
- Detalhe da venda com timeline

## 5. Apps moveis (PWAs)

### App Vendedor (`/v/<slug>`)
Mesma arquitetura do mecanico: slug rotacionavel, login por PIN,
cookie HTTP-only.

Telas:
- Home: motos disponiveis (cards com foto, preco, dias em estoque)
- Detalhe moto: "Novo interesse" | "Reservar" | "Fechar venda"
- Minhas vendas: lista + comissao acumulada
- Perfil: nome, comissao do mes

### App Consignante (`/c/<token>`)
Token unico por consignacao (nao por pessoa — um dono com 2 motos
recebe 2 links).

Telas:
- Status da moto (estado + foto + dias anunciada)
- Visitas/leads (contador, sem dados pessoais)
- Quando vender: detalhes da venda, custo revisao, valor a receber

### App Comprador (`/compra/<token>`)
Token unico por venda.

Telas:
- Dados da moto comprada (fotos, dados)
- Informacoes da compra (data, valor, forma pgto)
- Garantia: prazo, como acionar
- Botao: "Agendar revisao" (abre OS pre-preenchida na oficina)

## 6. Fluxo de dinheiro (lancamentos automaticos)

| Evento | Tipo | Categoria | Valor |
|--------|------|-----------|-------|
| Moto comprada (compra_direta) | saida | compra_moto | -custo_compra |
| Reserva (sinal) | entrada | sinal_reserva | +500 |
| Reserva cancelada | saida | devolucao_sinal | -500 |
| Venda fechada | entrada | venda_moto | +valor_venda |
| Comissao gerada | saida | comissao | -200 ou -400 |
| Repasse consignada | saida | repasse_consignada | -(88% * venda - revisao) |
| OS finalizada (oficina externa) | entrada | oficina_receita | +valor_final |
| Custo revisao consignada | entrada | oficina_receita | +custo (dono paga) |

## 7. Fases de implementacao

### Fase 1: Estoque (alicerce)
- Coluna `estado` + `origem` na tabela `motos`
- Migracao dos dados existentes
- Renomear nav "Anuncios" → "Estoque"
- Filtros por estado na lista
- Botoes contextuais por estado
- Wizard "Chegou moto" (3 origens)
- Botao "Manda pra oficina" (cria OS com moto_id)
- Auto-transicao: OS finalizada → moto volta pra `disponivel`
- Site publico: `WHERE estado IN ('anunciada','reservada')`

### Fase 2: Vendas + Reserva + Troca
- Tabelas `vendas`, `reservas`, `comissoes`
- Fluxo "Reservar" com timer 7 dias
- Fluxo "Fechar venda" (wizard com troca)
- `vendedores.tipo` (interno/externo)
- Pagina /admin/vendas (lista + detalhe)
- Lancamentos automaticos (vendas, sinal, comissao)

### Fase 3: Consignadas
- Tabela `consignacoes`
- Variante do wizard "Chegou moto" (consignada)
- Fluxo pos-venda: cria OS revisao, calcula repasse
- Aba/filtro "Consignadas" no Estoque
- PWA do consignante (`/c/<token>`)

### Fase 4: Dashboard + Financeiro
- Tabela `lancamentos` (auto-populada pelas fases anteriores)
- Dashboard com feed + KPIs + alertas
- Tela financeiro: fluxo de caixa, filtros por periodo
- Comissoes a pagar, repasses pendentes

### Fase 5: App Vendedor
- PWA `/v/<slug>` (mesma arquitetura mecanico)
- Tabela `leads`
- Telas: motos, lead, reservar, vender, comissoes

### Fase 6: App Comprador
- PWA `/compra/<token>`
- Portal pos-venda
- Agendar revisao

### Fase 7: CRM
- Unificar clientes (comprador, oficina, lead) em visao unica
- Historico completo por pessoa

## 8. Premissas e decisoes

- Troca = 2 operacoes ligadas (venda + entrada). Ligadas por `troca_moto_id` / `troca_venda_id`.
- Consignada: margem loja 12%. Oficina pos-venda paga pelo dono (desconta do repasse).
- Reserva: R$500 fixo, 7 dias. Se desistir, devolve o sinal.
- Comissao vendedor: R$200 interno, R$400 externo (fixo por venda).
- Vendedor externo = amigo que trouxe o cliente. Cadastro simples, nao precisa de app.
- `motos.ativo` continua funcionando (computed: `estado IN ('anunciada','reservada')`) pra nao quebrar site publico durante migracao.
