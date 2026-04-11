# Next.js Migration + Blog + SEO Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrar o site Busca Racing de HTML+Express para Next.js App Router com blog completo (TipTap), SEO full-stack e admin panel.

**Architecture:** Next.js 14 App Router com API Routes substituindo Express. SQLite via better-sqlite3 (sync). TipTap para editor rich text. CSS Modules para estilos. Docker standalone output para deploy.

**Tech Stack:** Next.js 14, TypeScript, React 18, better-sqlite3, TipTap, CSS Modules, Docker, formidable (uploads)

**Design doc:** `docs/plans/2026-04-10-nextjs-migration-blog-seo-design.md`

---

## Fase 1: Scaffold Next.js + Infraestrutura

### Task 1: Inicializar projeto Next.js

**Files:**
- Create: `package.json` (substituir o existente)
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `.gitignore` (atualizar)

**Step 1: Criar backup do projeto atual**

```bash
cd /Users/kauan/Desktop/buscaracing.anun.tech
mkdir -p _backup
cp server.js _backup/
cp *.html _backup/
cp package.json _backup/
cp Dockerfile _backup/
cp docker-entrypoint.sh _backup/
```

**Step 2: Inicializar Next.js**

```bash
npx create-next-app@14 temp-next --typescript --app --src-dir=false --tailwind=no --eslint=yes --import-alias="@/*" --use-npm
```

**Step 3: Mover arquivos do Next.js para o projeto**

```bash
cp temp-next/package.json ./package.json
cp temp-next/tsconfig.json ./tsconfig.json
cp temp-next/next.config.mjs ./next.config.mjs
cp temp-next/.eslintrc.json ./.eslintrc.json
cp -r temp-next/app ./app
cp -r temp-next/public ./public 2>/dev/null || true
rm -rf temp-next
```

**Step 4: Instalar dependencias**

```bash
npm install better-sqlite3 formidable
npm install -D @types/better-sqlite3 @types/formidable
```

**Step 5: Configurar next.config.mjs**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'buscaracing.com' },
    ],
  },
};

export default nextConfig;
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 14 com TypeScript"
```

---

### Task 2: Camada de banco de dados (lib/db.ts)

**Files:**
- Create: `lib/db.ts`

**Step 1: Criar lib/db.ts**

```typescript
import Database from 'better-sqlite3';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || process.cwd();
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'buscaracing.db');

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initDb();
  }
  return db;
}

function initDb() {
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
}

export default getDb;
```

**Step 2: Commit**

```bash
git add lib/db.ts
git commit -m "feat: camada de banco de dados SQLite com better-sqlite3"
```

---

### Task 3: Helpers de autenticacao (lib/auth.ts)

**Files:**
- Create: `lib/auth.ts`
- Create: `middleware.ts`

**Step 1: Criar lib/auth.ts**

```typescript
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Anuntech@10';
const SESSION_SECRET = 'br-secret-2024-xk9z';

export function verifyPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

export function createSession(): string {
  const token = Buffer.from(`${SESSION_SECRET}:${Date.now()}`).toString('base64');
  return token;
}

export function isAuthenticated(request: NextRequest): boolean {
  const sessionCookie = request.cookies.get('admin_session');
  if (!sessionCookie?.value) return false;
  try {
    const decoded = Buffer.from(sessionCookie.value, 'base64').toString();
    return decoded.startsWith(SESSION_SECRET + ':');
  } catch {
    return false;
  }
}
```

**Step 2: Criar middleware.ts (protege rotas /admin e /api/admin)**

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protege rotas admin (exceto login)
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (pathname === '/api/auth' && request.method === 'POST') {
      return NextResponse.next();
    }
    if (!isAuthenticated(request)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // Para paginas admin, deixa carregar (o componente mostra login)
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
```

**Step 3: Commit**

```bash
git add lib/auth.ts middleware.ts
git commit -m "feat: autenticacao com cookies + middleware de protecao"
```

---

### Task 4: Helper de upload (lib/upload.ts)

**Files:**
- Create: `lib/upload.ts`

**Step 1: Criar lib/upload.ts**

```typescript
import path from 'path';
import fs from 'fs';

const DATA_DIR = process.env.DATA_DIR || process.cwd();
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
export const FOTOS_DIR = path.join(DATA_DIR, 'fotos');

// Garante que as pastas existam
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(FOTOS_DIR)) fs.mkdirSync(FOTOS_DIR, { recursive: true });

export function generateFilename(originalName: string): string {
  const ext = path.extname(originalName);
  const random = Math.random().toString(36).slice(2);
  return `${Date.now()}-${random}${ext}`;
}

export async function saveFile(
  file: File,
  destDir: string = UPLOADS_DIR
): Promise<string> {
  const filename = generateFilename(file.name);
  const filepath = path.join(destDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filepath, buffer);
  const prefix = destDir === FOTOS_DIR ? '/fotos/' : '/uploads/';
  return `${prefix}${filename}`;
}
```

**Step 2: Commit**

```bash
git add lib/upload.ts
git commit -m "feat: helper de upload de arquivos"
```

---

## Fase 2: API Routes (substituir Express)

### Task 5: API de autenticacao

**Files:**
- Create: `app/api/auth/route.ts`

**Step 1: Criar app/api/auth/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, createSession, isAuthenticated } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, password } = body;

  if (action === 'login') {
    if (!verifyPassword(password)) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
    }
    const token = createSession();
    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400, // 24h
      path: '/',
    });
    return response;
  }

  if (action === 'logout') {
    const response = NextResponse.json({ success: true });
    response.cookies.delete('admin_session');
    return response;
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ isAdmin: isAuthenticated(request) });
}
```

**Step 2: Commit**

```bash
git add app/api/auth/route.ts
git commit -m "feat: API route de autenticacao"
```

---

### Task 6: API de motos (CRUD)

**Files:**
- Create: `app/api/motos/route.ts`
- Create: `app/api/motos/[id]/route.ts`
- Create: `app/api/motos/[id]/fotos/route.ts`
- Create: `app/api/admin/motos/route.ts`

**Step 1: Criar app/api/motos/route.ts (GET publico + POST admin)**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { saveFile } from '@/lib/upload';
import { isAuthenticated } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const categoria = searchParams.get('categoria');
  const marca = searchParams.get('marca');
  const condicao = searchParams.get('condicao');
  const destaque = searchParams.get('destaque');
  const q = searchParams.get('q');

  let sql = 'SELECT * FROM motos WHERE ativo=1';
  const params: any[] = [];

  if (categoria) { sql += ' AND categoria=?'; params.push(categoria); }
  if (marca) { sql += ' AND marca=?'; params.push(marca); }
  if (condicao) { sql += ' AND condicao=?'; params.push(condicao); }
  if (destaque) { sql += ' AND destaque=1'; }
  if (q) {
    const t = `%${q}%`;
    sql += ' AND (nome LIKE ? OR marca LIKE ? OR descricao LIKE ?)';
    params.push(t, t, t);
  }
  sql += ' ORDER BY destaque DESC, id DESC';

  const motos = db.prepare(sql).all(...params);
  return NextResponse.json(motos);
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const formData = await request.formData();
  const nome = formData.get('nome') as string;
  const marca = formData.get('marca') as string;
  const categoria = formData.get('categoria') as string || 'outros';
  const condicao = formData.get('condicao') as string || 'nova';
  const preco = formData.get('preco') ? Number(formData.get('preco')) : null;
  const preco_original = formData.get('preco-original') ? Number(formData.get('preco-original')) : null;
  const descricao = formData.get('descricao') as string || '';
  const destaque = formData.get('destaque') === '1' ? 1 : 0;
  const ativo = formData.get('ativo') !== '0' ? 1 : 0;
  const ano = formData.get('ano') ? Number(formData.get('ano')) : null;
  const km = formData.get('km') ? Number(formData.get('km')) : null;

  let imagem: string | null = null;
  const file = formData.get('imagem') as File | null;
  if (file && file.size > 0) {
    imagem = await saveFile(file);
  }

  const result = db.prepare(`
    INSERT INTO motos(nome,marca,categoria,condicao,preco,preco_original,descricao,imagem,destaque,ativo,ano,km)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(nome, marca, categoria, condicao, preco, preco_original, descricao, imagem, destaque, ativo, ano, km);

  return NextResponse.json({ id: result.lastInsertRowid });
}
```

**Step 2: Criar app/api/motos/[id]/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { saveFile } from '@/lib/upload';
import { isAuthenticated } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getDb();
  const moto = db.prepare('SELECT * FROM motos WHERE id=?').get(params.id);
  if (!moto) return NextResponse.json({ error: 'Nao encontrada' }, { status: 404 });
  return NextResponse.json(moto);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const old = db.prepare('SELECT * FROM motos WHERE id=?').get(params.id) as any;
  if (!old) return NextResponse.json({ error: 'Nao encontrada' }, { status: 404 });

  const formData = await request.formData();
  const nome = formData.get('nome') as string;
  const marca = formData.get('marca') as string;
  const categoria = formData.get('categoria') as string;
  const condicao = formData.get('condicao') as string;
  const preco = formData.get('preco') ? Number(formData.get('preco')) : null;
  const preco_original = formData.get('preco-original') ? Number(formData.get('preco-original')) : null;
  const descricao = formData.get('descricao') as string || '';
  const destaque = formData.get('destaque') === '1' ? 1 : 0;
  const ativo = formData.get('ativo') !== '0' ? 1 : 0;
  const ano = formData.get('ano') ? Number(formData.get('ano')) : null;
  const km = formData.get('km') ? Number(formData.get('km')) : null;

  let imagem = old.imagem;
  const file = formData.get('imagem') as File | null;
  if (file && file.size > 0) {
    imagem = await saveFile(file);
  } else {
    const imagem_atual = formData.get('imagem_atual') as string | null;
    if (imagem_atual !== undefined && imagem_atual !== null) imagem = imagem_atual;
  }

  db.prepare(`
    UPDATE motos SET nome=?,marca=?,categoria=?,condicao=?,preco=?,preco_original=?,
    descricao=?,imagem=?,destaque=?,ativo=?,ano=?,km=? WHERE id=?
  `).run(nome, marca, categoria, condicao, preco, preco_original, descricao, imagem, destaque, ativo, ano, km, params.id);

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  db.prepare('DELETE FROM fotos WHERE moto_id=?').run(params.id);
  db.prepare('DELETE FROM motos WHERE id=?').run(params.id);
  return NextResponse.json({ success: true });
}
```

**Step 3: Criar app/api/motos/[id]/fotos/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { saveFile, FOTOS_DIR } from '@/lib/upload';
import { isAuthenticated } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getDb();
  const fotos = db.prepare('SELECT * FROM fotos WHERE moto_id=? ORDER BY ordem').all(params.id);
  return NextResponse.json(
    fotos.map((f: any) => ({ ...f, url: `/fotos/${f.filename}` }))
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const formData = await request.formData();
  const files = formData.getAll('fotos') as File[];

  const maxOrdem = db.prepare('SELECT MAX(ordem) as m FROM fotos WHERE moto_id=?').get(params.id) as any;
  let ordem = (maxOrdem?.m || 0) + 1;

  const inserted = [];
  for (const file of files) {
    if (file.size === 0) continue;
    const savedPath = await saveFile(file, FOTOS_DIR);
    const filename = savedPath.replace('/fotos/', '');
    const result = db.prepare('INSERT INTO fotos(moto_id,filename,ordem) VALUES(?,?,?)').run(params.id, filename, ordem++);
    inserted.push({ id: result.lastInsertRowid, filename, url: savedPath, ordem: ordem - 1 });
  }

  return NextResponse.json(inserted);
}
```

**Step 4: Criar app/api/admin/motos/route.ts (lista todas, incluindo inativas)**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = getDb();
  const motos = db.prepare('SELECT * FROM motos ORDER BY id DESC').all();
  return NextResponse.json(motos);
}
```

**Step 5: Commit**

```bash
git add app/api/motos/ app/api/admin/
git commit -m "feat: API routes CRUD de motos + fotos"
```

---

### Task 7: API de blog (CRUD)

**Files:**
- Create: `app/api/blog/route.ts`
- Create: `app/api/blog/[id]/route.ts`

**Step 1: Criar app/api/blog/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

function generateSlug(titulo: string): string {
  return titulo
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// GET publico: posts publicados. Com ?admin=1: todos (requer auth)
export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const admin = searchParams.get('admin');
  const categoria = searchParams.get('categoria');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '12');
  const offset = (page - 1) * limit;

  if (admin === '1') {
    if (!isAuthenticated(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const posts = db.prepare('SELECT * FROM posts ORDER BY id DESC').all();
    return NextResponse.json(posts);
  }

  let sql = 'SELECT id,titulo,slug,resumo,imagem_capa,categoria,tags,autor,created_at FROM posts WHERE publicado=1';
  const params: any[] = [];
  if (categoria) { sql += ' AND categoria=?'; params.push(categoria); }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const posts = db.prepare(sql).all(...params);
  const total = db.prepare('SELECT COUNT(*) as count FROM posts WHERE publicado=1' + (categoria ? ' AND categoria=?' : '')).get(...(categoria ? [categoria] : [])) as any;

  return NextResponse.json({ posts, total: total.count, page, limit });
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const body = await request.json();
  const { titulo, resumo, conteudo, imagem_capa, categoria, tags, publicado, autor, meta_title, meta_desc } = body;

  let slug = body.slug || generateSlug(titulo);

  // Garante slug unico
  const existing = db.prepare('SELECT id FROM posts WHERE slug=?').get(slug);
  if (existing) slug += '-' + Date.now().toString(36);

  const result = db.prepare(`
    INSERT INTO posts(titulo,slug,resumo,conteudo,imagem_capa,categoria,tags,publicado,autor,meta_title,meta_desc)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)
  `).run(titulo, slug, resumo || '', conteudo, imagem_capa || null, categoria || 'geral', tags || '', publicado ? 1 : 0, autor || 'Busca Racing', meta_title || null, meta_desc || null);

  return NextResponse.json({ id: result.lastInsertRowid, slug });
}
```

**Step 2: Criar app/api/blog/[id]/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getDb();
  // Aceita id numerico ou slug
  const post = db.prepare('SELECT * FROM posts WHERE id=? OR slug=?').get(params.id, params.id);
  if (!post) return NextResponse.json({ error: 'Post nao encontrado' }, { status: 404 });
  return NextResponse.json(post);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const body = await request.json();
  const { titulo, slug, resumo, conteudo, imagem_capa, categoria, tags, publicado, autor, meta_title, meta_desc } = body;

  db.prepare(`
    UPDATE posts SET titulo=?,slug=?,resumo=?,conteudo=?,imagem_capa=?,categoria=?,tags=?,
    publicado=?,autor=?,meta_title=?,meta_desc=?,updated_at=datetime('now','localtime') WHERE id=?
  `).run(titulo, slug, resumo || '', conteudo, imagem_capa || null, categoria || 'geral', tags || '', publicado ? 1 : 0, autor || 'Busca Racing', meta_title || null, meta_desc || null, params.id);

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  db.prepare('DELETE FROM posts WHERE id=?').run(params.id);
  return NextResponse.json({ success: true });
}
```

**Step 3: Commit**

```bash
git add app/api/blog/
git commit -m "feat: API routes CRUD de blog posts"
```

---

### Task 8: API de configuracoes + stats + upload

**Files:**
- Create: `app/api/config/route.ts`
- Create: `app/api/config/logo/route.ts`
- Create: `app/api/config/image/route.ts`
- Create: `app/api/config/images/route.ts`
- Create: `app/api/stats/route.ts`
- Create: `app/api/upload/route.ts`
- Create: `app/api/marcas/route.ts`
- Create: `app/api/fotos/[id]/route.ts`

**Step 1: Criar todas as API routes restantes (seguindo o padrao do server.js original)**

Cada route replica a logica existente no Express, usando `getDb()` e `better-sqlite3` sync.

Rotas chave:
- `GET /api/config` - retorna todas configs como objeto
- `PUT /api/config` - atualiza configs (telefone, whatsapp, email, endereco)
- `POST /api/config/logo` - upload de logo
- `POST /api/config/image` - upload de imagem de config (hero, categorias)
- `GET /api/config/images` - retorna imagens de hero + categorias
- `GET /api/stats` - retorna total, ativas, destaques, por_categoria
- `POST /api/upload` - upload generico (retorna URL)
- `GET /api/marcas` - lista marcas distintas
- `PUT /api/fotos/[id]` - reordenar foto
- `DELETE /api/fotos/[id]` - deletar foto

**Step 2: Commit**

```bash
git add app/api/
git commit -m "feat: API routes de config, stats, upload, marcas, fotos"
```

---

## Fase 3: Componentes Compartilhados

### Task 9: Layout global + Header + Footer

**Files:**
- Create: `app/layout.tsx`
- Create: `app/globals.css`
- Create: `components/Header.tsx`
- Create: `components/Header.module.css`
- Create: `components/Footer.tsx`
- Create: `components/Footer.module.css`

**Step 1: Criar globals.css com variaveis CSS e reset**

Extrair do index.html atual: variaveis (--blue, --red, --white, --deep, --muted), fontes (Bebas Neue, Barlow Condensed, Barlow), reset basico.

**Step 2: Criar layout.tsx com metadata base**

```typescript
import type { Metadata } from 'next';
import { Barlow, Barlow_Condensed } from 'next/font/google';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import './globals.css';

const barlow = Barlow({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-barlow' });
const barlowCondensed = Barlow_Condensed({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-barlow-condensed' });

export const metadata: Metadata = {
  metadataBase: new URL('https://buscaracing.com'),
  title: {
    default: 'Busca Racing | Motos Multi Marcas em Franco da Rocha - SP',
    template: '%s | Busca Racing',
  },
  description: 'Loja de motos multi marcas em Franco da Rocha - SP. Motos de rua, offroad, quadriciclos e bikes infantis. Desde 2020.',
  keywords: ['motos', 'comprar moto', 'moto usada', 'moto nova', 'Franco da Rocha', 'quadriciclo', 'offroad', 'Busca Racing'],
  authors: [{ name: 'Busca Racing' }],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://buscaracing.com',
    siteName: 'Busca Racing',
    title: 'Busca Racing | Motos Multi Marcas em Franco da Rocha - SP',
    description: 'Loja de motos multi marcas. Motos de rua, offroad, quadriciclos e bikes infantis.',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://buscaracing.com' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
```

**Step 3: Criar Header.tsx e Footer.tsx como componentes React**

Migrar o HTML/CSS inline do header e footer do index.html atual para componentes React com CSS Modules. Manter visual identico: logo BUSCA RACING, nav links, telefone CTA, hamburger menu, footer com contato + links + copyright + credito Anuntech.

**Step 4: Commit**

```bash
git add app/layout.tsx app/globals.css components/
git commit -m "feat: layout global com Header, Footer e metadata SEO base"
```

---

### Task 10: Componente JsonLd

**Files:**
- Create: `components/JsonLd.tsx`

**Step 1: Criar componente reutilizavel de JSON-LD**

```typescript
export default function JsonLd({ data }: { data: Record<string, any> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// Schemas prontos
export function localBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Busca Racing',
    description: 'Loja de motos multi marcas em Franco da Rocha - SP',
    url: 'https://buscaracing.com',
    telephone: '+5511947807036',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Av. Villa Verde, 1212 - Vila Verde',
      addressLocality: 'Franco da Rocha',
      addressRegion: 'SP',
      postalCode: '07813-000',
      addressCountry: 'BR',
    },
    openingHoursSpecification: [
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday'], opens: '08:00', closes: '18:00' },
      { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Saturday', opens: '08:00', closes: '13:00' },
    ],
  };
}

export function productSchema(moto: any) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${moto.nome} ${moto.marca}`,
    description: moto.descricao,
    image: moto.imagem ? `https://buscaracing.com${moto.imagem}` : undefined,
    brand: { '@type': 'Brand', name: moto.marca },
    offers: moto.preco ? {
      '@type': 'Offer',
      price: moto.preco,
      priceCurrency: 'BRL',
      availability: 'https://schema.org/InStock',
      itemCondition: moto.condicao === 'nova' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
    } : undefined,
  };
}

export function blogPostSchema(post: any) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.titulo,
    description: post.resumo,
    image: post.imagem_capa ? `https://buscaracing.com${post.imagem_capa}` : undefined,
    author: { '@type': 'Organization', name: post.autor || 'Busca Racing' },
    publisher: { '@type': 'Organization', name: 'Busca Racing' },
    datePublished: post.created_at,
    dateModified: post.updated_at || post.created_at,
    url: `https://buscaracing.com/blog/${post.slug}`,
  };
}
```

**Step 2: Adicionar LocalBusiness JSON-LD ao layout.tsx**

**Step 3: Commit**

```bash
git add components/JsonLd.tsx app/layout.tsx
git commit -m "feat: componente JSON-LD com schemas LocalBusiness, Product, BlogPosting"
```

---

### Task 11: Componentes MotoCard e BlogCard

**Files:**
- Create: `components/MotoCard.tsx`
- Create: `components/MotoCard.module.css`
- Create: `components/BlogCard.tsx`
- Create: `components/BlogCard.module.css`

**Step 1: Criar MotoCard.tsx**

Migrar o card de moto do produtos.html (imagem, nome, marca, preco, badges de categoria/condicao) para componente React com next/image e CSS Module.

**Step 2: Criar BlogCard.tsx**

Card com imagem de capa, titulo, resumo, categoria badge, data. Link para `/blog/[slug]`.

**Step 3: Commit**

```bash
git add components/MotoCard.tsx components/MotoCard.module.css components/BlogCard.tsx components/BlogCard.module.css
git commit -m "feat: componentes MotoCard e BlogCard"
```

---

## Fase 4: Paginas Publicas

### Task 12: Homepage (app/page.tsx)

**Files:**
- Create: `app/page.tsx`
- Create: `app/page.module.css`

**Step 1: Migrar index.html para React**

Migrar seções: hero (com SVG da moto, eyebrow "Desde 2020", CTA), destaques (grid de MotoCards), categorias (4 cards com imagens), stats, CTA final. Mesmo visual, mesmos efeitos (hero-lines, stripes, glow). Usar next/image para imagens otimizadas.

**Step 2: Commit**

```bash
git add app/page.tsx app/page.module.css
git commit -m "feat: homepage migrada para Next.js"
```

---

### Task 13: Pagina de produtos (app/produtos/page.tsx)

**Files:**
- Create: `app/produtos/page.tsx`
- Create: `app/produtos/page.module.css`

**Step 1: Migrar produtos.html para React**

Client component com filtros (busca, categoria, condicao, marca), grid de MotoCards, paginacao. Fetch de `/api/motos` com query params.

Metadata:
```typescript
export const metadata: Metadata = {
  title: 'Motos a Venda',
  description: 'Confira nosso estoque de motos novas e usadas. Motos de rua, offroad, quadriciclos e bikes infantis em Franco da Rocha - SP.',
  alternates: { canonical: 'https://buscaracing.com/produtos' },
};
```

**Step 2: Commit**

```bash
git add app/produtos/
git commit -m "feat: pagina de produtos com filtros e paginacao"
```

---

### Task 14: Pagina de detalhe da moto (app/moto/[id]/page.tsx)

**Files:**
- Create: `app/moto/[id]/page.tsx`
- Create: `app/moto/[id]/page.module.css`

**Step 1: Migrar moto.html para React**

Server component com `generateMetadata()` dinamico. Busca moto do DB diretamente (server-side). Gallery com lightbox. Specs, preco, descricao, botoes WhatsApp. JSON-LD Product.

```typescript
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const db = getDb();
  const moto = db.prepare('SELECT * FROM motos WHERE id=?').get(params.id) as any;
  if (!moto) return { title: 'Moto nao encontrada' };
  return {
    title: `${moto.nome} ${moto.marca}${moto.ano ? ' ' + moto.ano : ''}`,
    description: moto.descricao || `${moto.nome} ${moto.marca} - ${moto.condicao} - Busca Racing`,
    openGraph: {
      title: `${moto.nome} ${moto.marca}`,
      description: moto.descricao,
      images: moto.imagem ? [{ url: moto.imagem }] : [],
    },
    alternates: { canonical: `https://buscaracing.com/moto/${moto.id}` },
  };
}
```

**Step 2: Commit**

```bash
git add app/moto/
git commit -m "feat: pagina de detalhe da moto com SEO dinamico"
```

---

### Task 15: Paginas pecas, acessorios, contato, venda-sua-moto

**Files:**
- Create: `app/pecas/page.tsx` + CSS Module
- Create: `app/acessorios/page.tsx` + CSS Module
- Create: `app/contato/page.tsx` + CSS Module
- Create: `app/venda-sua-moto/page.tsx` + CSS Module

**Step 1: Migrar cada pagina mantendo visual identico**

Cada uma com metadata estatico e canonical apropriado. Contato com mapa Google Maps iframe. Venda-sua-moto com form que envia via WhatsApp.

**Step 2: Commit**

```bash
git add app/pecas/ app/acessorios/ app/contato/ app/venda-sua-moto/
git commit -m "feat: paginas pecas, acessorios, contato e venda-sua-moto"
```

---

## Fase 5: Blog Frontend

### Task 16: Listagem de blog (app/blog/page.tsx)

**Files:**
- Create: `app/blog/page.tsx`
- Create: `app/blog/page.module.css`

**Step 1: Criar pagina de listagem**

Grid de BlogCards com paginacao. Filtro por categoria (Dicas, Novidades, Comparativos, Manutencao). Fetch server-side do DB.

Metadata:
```typescript
export const metadata: Metadata = {
  title: 'Blog',
  description: 'Dicas, novidades e comparativos de motos. Tudo sobre o mundo das duas rodas.',
  alternates: { canonical: 'https://buscaracing.com/blog' },
};
```

**Step 2: Commit**

```bash
git add app/blog/
git commit -m "feat: pagina de listagem do blog"
```

---

### Task 17: Post individual (app/blog/[slug]/page.tsx)

**Files:**
- Create: `app/blog/[slug]/page.tsx`
- Create: `app/blog/[slug]/page.module.css`

**Step 1: Criar pagina do post**

Server component. Busca post por slug. Renderiza HTML do TipTap com `dangerouslySetInnerHTML`. Imagem de capa hero. Titulo H1, data, autor, categoria. Posts relacionados (mesma categoria, limit 3). Botao compartilhar WhatsApp. JSON-LD BlogPosting.

```typescript
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const db = getDb();
  const post = db.prepare('SELECT * FROM posts WHERE slug=? AND publicado=1').get(params.slug) as any;
  if (!post) return { title: 'Post nao encontrado' };
  return {
    title: post.meta_title || post.titulo,
    description: post.meta_desc || post.resumo,
    openGraph: {
      type: 'article',
      title: post.meta_title || post.titulo,
      description: post.meta_desc || post.resumo,
      images: post.imagem_capa ? [{ url: post.imagem_capa }] : [],
      publishedTime: post.created_at,
      modifiedTime: post.updated_at,
      authors: [post.autor],
    },
    alternates: { canonical: `https://buscaracing.com/blog/${post.slug}` },
  };
}
```

**Step 2: Commit**

```bash
git add app/blog/\[slug\]/
git commit -m "feat: pagina de post individual com SEO dinamico e JSON-LD"
```

---

## Fase 6: SEO (sitemap, robots, catalogo)

### Task 18: Sitemap dinamico

**Files:**
- Create: `app/sitemap.ts`

**Step 1: Criar app/sitemap.ts**

```typescript
import { MetadataRoute } from 'next';
import getDb from '@/lib/db';

export default function sitemap(): MetadataRoute.Sitemap {
  const db = getDb();
  const baseUrl = 'https://buscaracing.com';

  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 1 },
    { url: `${baseUrl}/produtos`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${baseUrl}/pecas`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/acessorios`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/contato`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/venda-sua-moto`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.8 },
  ];

  const motos = db.prepare('SELECT id, created_at FROM motos WHERE ativo=1').all() as any[];
  const motoPages = motos.map((m) => ({
    url: `${baseUrl}/moto/${m.id}`,
    lastModified: new Date(m.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const posts = db.prepare('SELECT slug, updated_at, created_at FROM posts WHERE publicado=1').all() as any[];
  const blogPages = posts.map((p) => ({
    url: `${baseUrl}/blog/${p.slug}`,
    lastModified: new Date(p.updated_at || p.created_at),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...motoPages, ...blogPages];
}
```

**Step 2: Commit**

```bash
git add app/sitemap.ts
git commit -m "feat: sitemap.xml dinamico com motos e blog posts"
```

---

### Task 19: Robots.txt

**Files:**
- Create: `app/robots.ts`

**Step 1: Criar app/robots.ts**

```typescript
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: 'https://buscaracing.com/sitemap.xml',
  };
}
```

**Step 2: Commit**

```bash
git add app/robots.ts
git commit -m "feat: robots.txt bloqueando /admin/ e /api/"
```

---

### Task 20: Feed XML catalogo Meta/Facebook

**Files:**
- Create: `app/catalogo.xml/route.ts`

**Step 1: Migrar a logica do endpoint /catalogo.xml do server.js atual para uma API route Next.js**

Mesma logica, mesmo formato XML. Usa getDb() ao inves do Express.

**Step 2: Commit**

```bash
git add app/catalogo.xml/
git commit -m "feat: feed XML catalogo Meta/Facebook"
```

---

## Fase 7: Admin Panel

### Task 21: Layout admin + dashboard

**Files:**
- Create: `app/admin/layout.tsx`
- Create: `app/admin/layout.module.css`
- Create: `app/admin/page.tsx`

**Step 1: Criar layout admin**

Client component com sidebar (logo, nav: Dashboard, Motos, Blog, Config, Logout), login screen (quando nao autenticado), toast notifications. Migrar visual do admin.html atual (sidebar dark blue, cards, badges).

**Step 2: Criar dashboard com stats**

4 stat cards + chart por categoria. Fetch /api/stats.

**Step 3: Commit**

```bash
git add app/admin/
git commit -m "feat: admin layout com sidebar, login e dashboard"
```

---

### Task 22: Admin CRUD motos

**Files:**
- Create: `app/admin/motos/page.tsx`
- Create: `app/admin/motos/page.module.css`

**Step 1: Migrar gestao de motos do admin.html**

Tabela paginada com filtros (busca, categoria, condicao, ativo). Modal add/edit com upload de imagem + galeria. Coluna "dias em estoque" (vermelho > 30 dias). Delete com confirmacao. Mesmo visual.

**Step 2: Commit**

```bash
git add app/admin/motos/
git commit -m "feat: admin CRUD motos com tabela, filtros e modal"
```

---

### Task 23: Admin CRUD blog (TipTap editor)

**Files:**
- Create: `app/admin/blog/page.tsx`
- Create: `app/admin/blog/page.module.css`
- Create: `components/BlogEditor.tsx`

**Step 1: Instalar TipTap**

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link @tiptap/extension-placeholder @tiptap/extension-underline
```

**Step 2: Criar BlogEditor.tsx (client component)**

```typescript
'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';

// Toolbar: Bold, Italic, Underline, H2, H3, BulletList, OrderedList, Link, Image, Code
// Props: content (HTML string), onChange (callback)
```

**Step 3: Criar pagina admin/blog**

Listagem de posts (tabela com titulo, categoria, status publicado/rascunho, data, acoes). Modal/pagina de edicao com campos: titulo, slug (auto-gerado), resumo, imagem de capa (upload), categoria (select), tags (input), TipTap editor para conteudo, meta_title, meta_desc, toggle publicado. Delete com confirmacao.

**Step 4: Commit**

```bash
git add components/BlogEditor.tsx app/admin/blog/
git commit -m "feat: admin blog com TipTap editor"
```

---

### Task 24: Admin configuracoes

**Files:**
- Create: `app/admin/config/page.tsx`
- Create: `app/admin/config/page.module.css`

**Step 1: Migrar painel de configuracoes do admin.html**

Upload de logo, 5 slots de imagem (hero, categorias), form de contato (telefone, whatsapp, email, endereco). Mesmo visual.

**Step 2: Commit**

```bash
git add app/admin/config/
git commit -m "feat: admin configuracoes com upload de logo e imagens"
```

---

## Fase 8: Static files + Docker + Deploy

### Task 25: Servir uploads como static files

**Files:**
- Modify: `next.config.mjs`
- Modify: `app/layout.tsx`

**Step 1: Configurar rewrites no next.config.mjs para servir /uploads/ e /fotos/ do DATA_DIR**

Como o Next.js nao serve arquivos fora de /public, criar API routes que servem os arquivos estaticos:

```typescript
// app/uploads/[...path]/route.ts
// app/fotos/[...path]/route.ts
// Le o arquivo do disco e retorna com Content-Type correto
```

**Step 2: Commit**

```bash
git add app/uploads/ app/fotos/ next.config.mjs
git commit -m "feat: servir uploads e fotos do DATA_DIR"
```

---

### Task 26: Dockerfile + docker-entrypoint.sh

**Files:**
- Create: `Dockerfile` (substituir)
- Create: `docker-entrypoint.sh` (substituir)

**Step 1: Criar Dockerfile multi-stage para Next.js standalone**

```dockerfile
FROM node:20-alpine AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
RUN apk add --no-cache python3 make g++
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATA_DIR=/data
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
```

**Step 2: Criar docker-entrypoint.sh**

```bash
#!/bin/sh
set -e
DATA_DIR="${DATA_DIR:-/data}"
mkdir -p "$DATA_DIR/uploads" "$DATA_DIR/fotos"
exec node server.js
```

**Step 3: Commit**

```bash
git add Dockerfile docker-entrypoint.sh
git commit -m "feat: Dockerfile multi-stage para Next.js standalone"
```

---

### Task 27: Limpar arquivos antigos

**Files:**
- Delete: `server.js`
- Delete: `index.html`, `moto.html`, `produtos.html`, `pecas.html`, `acessorios.html`, `contato.html`, `venda-sua-moto.html`, `admin.html`
- Keep: `_backup/` (referencia)

**Step 1: Remover arquivos HTML e server.js antigos**

```bash
rm -f server.js index.html moto.html produtos.html pecas.html acessorios.html contato.html venda-sua-moto.html admin.html
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: remover arquivos HTML e Express antigos"
```

---

### Task 28: Testar build + deploy

**Step 1: Build local**

```bash
npm run build
```

Verificar que compila sem erros.

**Step 2: Push + deploy**

```bash
git push origin main
ssh root@178.156.255.162 "sitectl deploy --domain buscaracing.com"
```

**Step 3: Verificar**

- Homepage carrega com visual identico
- `/produtos` lista motos
- `/moto/[id]` mostra detalhe
- `/blog` mostra listagem (vazia por enquanto)
- `/admin` mostra login e dashboard
- `/sitemap.xml` retorna XML valido
- `/robots.txt` retorna regras corretas
- `/catalogo.xml` retorna feed Meta

**Step 4: Commit final**

```bash
git commit -m "chore: deploy Next.js v1 em producao"
```

---

## Resumo de Fases

| Fase | Tasks | Descricao |
|------|-------|-----------|
| 1 | 1-4 | Scaffold + infra (db, auth, upload) |
| 2 | 5-8 | API Routes (substituir Express) |
| 3 | 9-11 | Componentes compartilhados (layout, header, footer, cards, JSON-LD) |
| 4 | 12-15 | Paginas publicas (home, produtos, moto, pecas, acessorios, contato, venda) |
| 5 | 16-17 | Blog frontend (listagem + post individual) |
| 6 | 18-20 | SEO (sitemap, robots, catalogo XML) |
| 7 | 21-24 | Admin panel (dashboard, motos, blog/TipTap, config) |
| 8 | 25-28 | Static files, Docker, limpeza, deploy |
