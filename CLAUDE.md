# CLAUDE.md — Contexto para IAs

> Leia este arquivo + README.md antes de qualquer acao no projeto.

## Resumo rapido

Sistema de gestao de loja de motos (Busca Racing). Next.js 14 + SQLite + CSS Modules.
O admin gerencia estoque, vendas, oficina, consignadas, financeiro e CRM.
4 PWAs moveis (mecanico, vendedor, consignante, comprador).
Contratos em PDF gerados server-side.

## Comandos uteis

```bash
npm run dev          # Dev server http://localhost:3000
npx tsc --noEmit     # Typecheck (SEMPRE rodar antes de commitar)
npm run build        # Build de producao (pode demorar)
```

## Onde encontrar o que

| Preciso de... | Olhar em... |
|---------------|-------------|
| Schema do banco | `lib/db.ts` (funcao `initSchema`) |
| Estados da moto | `lib/moto-estados.ts` |
| Status da oficina | `lib/oficina-status.ts` |
| Auth mecanico | `lib/mecanico-auth.ts` |
| Auth vendedor | `lib/vendedor-auth.ts` |
| Geracao de PDF | `lib/pdf-contrato.ts` |
| Middleware (rotas protegidas) | `middleware.ts` |
| Layout admin (nav, icons) | `app/admin/layout.tsx` |
| Site publico (header/footer) | `components/SiteChrome.tsx` |
| Admin-only columns | `MOTOS_ADMIN_ONLY_COLS` em `lib/db.ts` |

## Padrao de criacao de novas features

1. **DB migration**: adicionar em `lib/db.ts` dentro de `initSchema()`, sempre idempotente
2. **API route**: `app/api/<recurso>/route.ts` com `export const dynamic = 'force-dynamic'`
3. **Admin page**: `app/admin/<recurso>/page.tsx` (client component com `'use client'`)
4. **CSS**: usar CSS Module do proprio diretorio ou reusar de outro (ex: `../vendas/page.module.css`)
5. **Nav**: adicionar em `app/admin/layout.tsx` — atualizar `PAGE_TITLES`, `NavIcon`, `NavLink type`, `NAV_LINKS`
6. **PWA**: criar em `app/<letra>/[slug_ou_token]/` + excluir em `SiteChrome.tsx` + `robots.txt` + `middleware.ts`

## Regras importantes

- **Nunca expor dados admin-only na API publica** — usar `stripAdminFields()`
- **Site publico filtra por `estado`**, nao por `ativo` — `WHERE estado IN ('anunciada','reservada')`
- **Middleware roda no Edge** — so checar presenca de cookie, nao acessar DB
- **Migrations NUNCA destrutivas** — usar `IF NOT EXISTS`, `PRAGMA table_info`, `ALTER TABLE ADD COLUMN`
- **Todos os modais com form** precisam de `style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0, overflow:'hidden' }}` no `<form>` para scroll funcionar
- **Ao criar moto**: estado inicial = `avaliacao`, ativo = 0
- **Ao vender consignada**: estado = `em_revisao` (nao `vendida`), cria OS automaticamente
- **Comissoes**: R$200 vendedor interno, R$400 externo — valor fixo, nao percentual

## Variaveis de ambiente (producao)

| Var | Obrigatoria | Descricao |
|-----|-------------|-----------|
| `ADMIN_PASSWORD` | Sim | Senha do admin |
| `MECANICO_SESSION_SECRET` | Sim | HMAC secret do cookie mecanico |
| `VENDEDOR_SESSION_SECRET` | Sim | HMAC secret do cookie vendedor |
| `DB_PATH` | Nao | Caminho do SQLite (default: `./buscaracing.db`) |
| `DATA_DIR` | Nao | Base para uploads |
| `DELETE_PASSWORD` | Nao | Senha para deletar motos (default: `Anuntech@2001`) |

## Design docs

Consultar `docs/plans/` para documentos de design e planos de implementacao:
- `2026-04-15-gestao-loja-design.md` — design completo do sistema de gestao (7 fases)
- `2026-04-15-fase1-estoque-plan.md` — plano detalhado da Fase 1
- `2026-04-15-mecanico-pwa-design.md` — design do PWA do mecanico
