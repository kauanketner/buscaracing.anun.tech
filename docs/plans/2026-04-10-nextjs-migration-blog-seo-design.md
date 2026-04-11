# Design: Migrar Busca Racing para Next.js + Blog + SEO

**Data:** 2026-04-10
**Status:** Aprovado

## Contexto

O site Busca Racing atualmente roda como HTML estático + Express + SQLite. A migração para Next.js visa:
1. Implementar SEO completo (metatags, OG, JSON-LD, sitemap, robots.txt)
2. Adicionar sistema de blog com editor rich text (TipTap)
3. Eliminar duplicacao de HTML (7 arquivos com header/footer copiados)
4. Manter o visual identico ao atual

## Decisoes Arquiteturais

- **Tudo em Next.js** (App Router, TypeScript) - frontend publico + admin + API routes
- **Editor rich text**: TipTap (ProseMirror-based, React-native, open-source)
- **Banco de dados**: SQLite via `better-sqlite3` (sincrono, compativel com Next.js)
- **Visual**: Mesmo design atual migrado para CSS Modules
- **Deploy**: Docker container unico, mesmo fluxo sitectl

## Estrutura do Projeto

```
buscaracing/
  app/
    layout.tsx              - Layout global (fonts, metadata base)
    page.tsx                - Homepage (hero, destaques, categorias)
    produtos/page.tsx       - Catalogo com filtros
    moto/[id]/page.tsx      - Detalhe da moto (SSR, metadata dinamica)
    pecas/page.tsx
    acessorios/page.tsx
    contato/page.tsx
    venda-sua-moto/page.tsx
    blog/
      page.tsx              - Listagem de posts (paginacao, categorias)
      [slug]/page.tsx       - Post individual (SSR, metadata dinamica)
    admin/
      page.tsx              - Dashboard
      motos/page.tsx        - CRUD motos
      blog/page.tsx         - CRUD posts (TipTap editor)
      config/page.tsx       - Configuracoes
    api/
      motos/route.ts        - GET/POST motos
      motos/[id]/route.ts   - GET/PUT/DELETE moto
      motos/[id]/fotos/route.ts
      blog/route.ts         - GET/POST posts
      blog/[id]/route.ts    - GET/PUT/DELETE post
      config/route.ts       - GET/PUT configuracoes
      auth/route.ts         - Login/logout/check
      stats/route.ts        - Dashboard stats
      upload/route.ts       - Upload generico
    sitemap.xml/route.ts    - Sitemap dinamico
    robots.txt/route.ts     - Robots.txt
    catalogo.xml/route.ts   - Feed Meta/Facebook
  components/
    Header.tsx
    Footer.tsx
    MotoCard.tsx
    BlogCard.tsx
    BlogEditor.tsx          - TipTap editor (client component)
    JsonLd.tsx
  lib/
    db.ts                   - SQLite wrapper (better-sqlite3)
    auth.ts                 - Helpers de autenticacao
  public/
  next.config.mjs
  Dockerfile
  docker-entrypoint.sh
  package.json
```

## Banco de Dados

Tabelas existentes (`motos`, `configuracoes`, `fotos`) permanecem iguais.

Nova tabela:

```sql
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
```

## SEO

| Item | Implementacao |
|------|--------------|
| Metatags | `generateMetadata()` nativo do Next.js em cada page |
| Open Graph | `openGraph` no metadata (titulo, descricao, imagem, URL) |
| JSON-LD | Componente JsonLd - LocalBusiness no layout, Product nas motos, BlogPosting nos posts |
| Sitemap | `app/sitemap.xml/route.ts` - lista todas paginas + motos + posts |
| Robots.txt | `app/robots.txt/route.ts` - bloqueia /admin/, /api/, aponta sitemap |
| Canonical | `alternates.canonical` no metadata de cada pagina |
| Imagens | `next/image` com alt descritivo |
| Semantica | Tags article, section, main, nav, hierarquia H1-H2-H3 |

## Blog - Admin

- Listagem com filtro por categoria e status (rascunho/publicado)
- Criar/editar post com TipTap editor
- Campos: titulo, slug (auto-gerado), resumo, imagem de capa, categoria, tags, conteudo, meta title, meta description, toggle publicado/rascunho
- Excluir post com confirmacao

## Blog - Frontend

- `/blog` - Grid de cards com paginacao
- `/blog/[slug]` - Post completo com imagem hero, metadata, posts relacionados, botao compartilhar WhatsApp, JSON-LD BlogPosting

## Migracoes Tecnicas

| De | Para |
|----|------|
| Express routes | Next.js API Routes (app/api/) |
| sqlite3 (async) | better-sqlite3 (sync) |
| Multer | formidable ou Next.js native uploads |
| express-session | cookies + Next.js middleware |
| HTML inline CSS/JS | React components + CSS Modules |
| 7 HTMLs duplicados | Componentes compartilhados (Header, Footer) |

## Docker

Multi-stage build com `next build` standalone output. Mesmo volume `/data` para SQLite + uploads + fotos.

## Visual

Identico ao atual: cores (#27367D, #DC2627), fontes (Bebas Neue, Barlow), clip-path nos botoes, layout responsivo.
