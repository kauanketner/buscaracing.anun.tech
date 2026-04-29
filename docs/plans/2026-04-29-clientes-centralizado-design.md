# Centralização de Cliente — Design

**Data:** 2026-04-29
**Aprovação:** Approach A (tabela real + FK + snapshots imutáveis)

## Problema

Cliente está espalhado em 8 tabelas com nomes diferentes (vendas, oficina_ordens,
reservas, consignacoes, alugueis, leads, pdv_vendas, motos). O CRM em
`/admin/clientes` é uma view virtual que agrega heuristicamente — não dá pra
editar cliente em um lugar só.

## Solução

Tabela `clientes` real com FK opcional em cada tabela. Snapshots permanecem
nas tabelas filhas (auditoria), mas o `cliente_id` aponta pro registro
canônico.

## Schema

```sql
CREATE TABLE clientes (
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
CREATE INDEX idx_clientes_telefone ON clientes(telefone);
CREATE INDEX idx_clientes_cpf      ON clientes(cpf_cnpj);
```

Adiciona `cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL` em:
- `vendas`, `oficina_ordens`, `reservas`, `consignacoes`, `alugueis`,
  `leads`, `pdv_vendas`

## Migration

Idempotente, roda no boot:
1. Lê touchpoints (mesma SQL do CRM virtual)
2. Agrupa por `lower(nome.trim())|digits(telefone)`
3. Insere em `clientes` se não existe
4. Popula `cliente_id` nas tabelas origem via match

## APIs

| Método | Rota | Função |
|---|---|---|
| GET | `/api/clientes` | Lista (busca, filtro ativo) |
| POST | `/api/clientes` | Cria |
| GET | `/api/clientes/[id]` | Detalhe + histórico unificado |
| PUT | `/api/clientes/[id]` | Edita |
| DELETE | `/api/clientes/[id]` | Soft-delete |

## Componente `ClientePicker`

Reutilizável. Autocomplete sobre `/api/clientes?q=` + criação inline.
Retorna `(cliente_id, snapshot_dados)`. Formulários usam `cliente_id`
como FK e os dados como snapshot.

## Tela `/admin/clientes`

Refeita: lista + botão "+ Novo" + click em cliente abre `/admin/clientes/[id]`
com form editável + histórico unificado.

## Formulários atualizados

PDV, VendaModal de moto, ReservaModal, OrdemModal (oficina),
ConsignacaoModal, form de aluguel admin, form de leads admin.

## Trade-offs aceitos

- Snapshots imutáveis: editar nome do cliente NÃO altera vendas antigas
  (auditoria preservada)
- Cliente duplicado pós-migration: ignorar por agora (YAGNI merge UI)
