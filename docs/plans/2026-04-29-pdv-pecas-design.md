# PDV de Peças — Design

**Data:** 2026-04-29
**Autor:** Kauan Ketner + Claude

## Objetivo

Funcionalidade de PDV (Ponto De Venda) para registrar **vendas avulsas de peças**
realizadas no balcão ou via canais externos (site, WhatsApp). Não passa por
ordem de serviço da oficina.

## Decisões aprovadas

| Aspecto | Decisão |
|---|---|
| **Cliente** | Autocomplete sobre CRM virtual + criação inline; snapshot por venda |
| **Estoque** | Bloquear venda se estoque < quantidade (rígido) |
| **Pagamento** | Forma única (pix/dinheiro/débito/crédito) + parcelamento em crédito |
| **Vendedor** | Obrigatório, sem comissão automática (registro p/ ranking) |
| **Recibo** | PDF simples via pdfkit (cabeçalho loja + itens + total + forma + assinatura "atendido por") |
| **Cancelamento** | Soft-delete via `status='cancelada'` + devolve estoque + reverte lançamento |

## Modelo de dados

### `pdv_vendas`

```sql
CREATE TABLE pdv_vendas (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_nome    TEXT NOT NULL,
  cliente_tel     TEXT DEFAULT '',
  cliente_cpf     TEXT DEFAULT '',
  cliente_email   TEXT DEFAULT '',
  vendedor_id     INTEGER REFERENCES vendedores(id),
  canal           TEXT DEFAULT 'balcao',     -- 'balcao' | 'site' | 'whatsapp' | 'outro'
  forma_pagamento TEXT DEFAULT 'pix',
  parcelas        INTEGER DEFAULT 1,
  valor_bruto     REAL NOT NULL,
  desconto        REAL DEFAULT 0,
  valor_total     REAL NOT NULL,
  observacoes     TEXT DEFAULT '',
  status          TEXT DEFAULT 'concluida',
  cancelada_em    TEXT,
  cancelada_motivo TEXT DEFAULT '',
  data_venda      TEXT DEFAULT (date('now','localtime')),
  created_at      TEXT DEFAULT (datetime('now','localtime'))
);
```

### `pdv_itens`

```sql
CREATE TABLE pdv_itens (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  pdv_venda_id    INTEGER NOT NULL REFERENCES pdv_vendas(id) ON DELETE CASCADE,
  peca_id         INTEGER REFERENCES pecas(id) ON DELETE SET NULL,
  nome_snapshot   TEXT NOT NULL,
  codigo_snapshot TEXT DEFAULT '',
  quantidade      INTEGER NOT NULL,
  preco_unitario  REAL NOT NULL,
  created_at      TEXT DEFAULT (datetime('now','localtime'))
);
```

## APIs

| Método | Rota | Função |
|---|---|---|
| `GET` | `/api/pdv` | Lista vendas (filtros de data, canal, vendedor, status) |
| `POST` | `/api/pdv` | Cria venda (transação: valida → cria → baixa estoque → lançamento) |
| `GET` | `/api/pdv/[id]` | Detalhe da venda (com itens) |
| `PATCH` | `/api/pdv/[id]/cancelar` | Marca cancelada + devolve estoque + reverte financeiro |
| `GET` | `/api/pdv/[id]/recibo` | Gera PDF do recibo |

## UI — `/admin/pdv`

Layout 2 colunas:
- **Esquerda (60%)** — busca de peças, grid de cards clicáveis (nome + preço + estoque). Clicar adiciona ao carrinho com qty=1.
- **Direita (40%)** — carrinho editável (qtd, preço, remover), subtotal/desconto/total. Form: cliente (autocomplete CRM), vendedor, pagamento + parcelas, canal, obs, botão Finalizar.

`/admin/pdv/historico` — lista das vendas com filtros + ações (recibo, cancelar). Item de menu **"PDV"** entre Peças e Serviços.

## Recibo PDF

- Cabeçalho: logo BR + endereço + CNPJ
- Título "RECIBO DE VENDA Nº {id}" + data
- Cliente (nome + CPF se preenchido)
- Tabela de itens (nome / qtd / preço / subtotal)
- Totais (subtotal, desconto, total)
- Forma de pagamento (com parcelas se crédito)
- "Atendido por: {vendedor}"
- Aviso "Não é nota fiscal — recibo informativo"

## Integração com sistema existente

- **Estoque**: cada item baixa via transação atômica. Se algum estoque < qty, aborta tudo. Cria movimentação em `pecas_movimentacoes` com `ref_tipo='pdv'`.
- **Financeiro**: lançamento `tipo='entrada' categoria='venda_peca' ref_tipo='pdv' ref_id=venda_id`.
- **Cancelamento**: devolve estoque (movimentação `entrada` com `ref_tipo='pdv-cancel'`) + apaga lançamento original (auditável via `cancelada_em`).
- **CRM virtual** (`/admin/clientes`): adicionar JOIN com `pdv_vendas` no agregador.
- **Cleanup ao deletar peça**: `peca_id` já tem `ON DELETE SET NULL` — preserva histórico.
- **Cleanup ao deletar moto**: nada a fazer (PDV não vincula moto).
