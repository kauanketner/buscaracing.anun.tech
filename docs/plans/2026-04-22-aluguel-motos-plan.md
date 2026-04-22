# Aluguel de Motos — Plano de Implementação

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Adicionar locação de motos ao sistema — página pública com grid + formulário de reserva, backend admin para aprovação/gestão, integração com CRM/financeiro/contratos.

**Architecture:** Reusa tabela `motos` com flag `disponivel_aluguel` e `valor_diaria`. Tabela `alugueis` guarda reservas com máquina de estados (pendente → aprovada → ativa → finalizada). Fluxo é "solicitação + aprovação manual". Integra com sistemas já existentes (lançamentos, CRM unificado, dashboard, contratos PDF).

**Tech Stack:** Next.js 14 App Router, better-sqlite3 (migrations idempotentes), React 18 client components com `'use client'`, CSS Modules reaproveitando padrão de `/admin/vendas` e `/pecas/[categoria]`, pdfkit.

**Verification:** Projeto não tem framework de testes automatizados. Cada task termina em:
1. `npx tsc --noEmit` (typecheck obrigatório)
2. Commit
3. Smoke test com `curl` quando aplicável
Task final tem plano de teste manual completo.

**Reference:** Design doc em `docs/plans/2026-04-22-aluguel-motos-design.md`.

---

## Task 1: Banco de dados (migrations + seed)

**Files:**
- Modify: `lib/db.ts`

**Step 1: Adicionar colunas ao motos + tabela alugueis**

Em `lib/db.ts`, localizar o bloco `initSchema` e:

**a)** Adicionar columns em `motos` via helper `addCol` existente (dentro do bloco de migrations de motos):
```typescript
addCol('disponivel_aluguel', 'INTEGER DEFAULT 0');
addCol('valor_diaria', 'REAL');
```

**b)** Criar tabela `alugueis` (logo depois das outras CREATE TABLE novas, ex: após `consignacoes`):
```typescript
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
`);
```

**c)** Seed de `aluguel_caucao_padrao` em `configuracoes` (junto com o seeding existente):
```typescript
const setDefaultIfEmpty = (k: string, v: string) => {
  const existing = db.prepare('SELECT valor FROM configuracoes WHERE chave=?').get(k) as { valor: string } | undefined;
  if (!existing || !existing.valor) {
    db.prepare("INSERT INTO configuracoes(chave, valor) VALUES(?, ?) ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor").run(k, v);
  }
};
setDefaultIfEmpty('aluguel_caucao_padrao', '500');
```

**Step 2: Typecheck**
```bash
npx tsc --noEmit
```
Expected: EXIT=0

**Step 3: Commit**
```bash
git add lib/db.ts
git commit -m "feat(aluguel): migrations — motos.disponivel_aluguel + tabela alugueis + caucao padrão"
```

---

## Task 2: MotoModal — seção "Aluguel"

**Files:**
- Modify: `app/admin/motos/MotoModal.tsx`

**Step 1: Adicionar state + UI**

Localizar os outros state hooks no componente e adicionar:
```typescript
const [disponivelAluguel, setDisponivelAluguel] = useState(false);
const [valorDiaria, setValorDiaria] = useState('');
```

No `useEffect` que carrega moto existente (localizar `setAtivo(!!m.ativo)` e adicionar abaixo):
```typescript
setDisponivelAluguel(!!(m as Record<string, unknown>).disponivel_aluguel);
setValorDiaria((m as Record<string, unknown>).valor_diaria != null ? String((m as Record<string, unknown>).valor_diaria) : '');
```

No `handleSubmit` (função que monta o FormData), adicionar após os outros `fd.append`:
```typescript
fd.append('disponivel_aluguel', disponivelAluguel ? '1' : '0');
fd.append('valor_diaria', valorDiaria);
```

**Step 2: Adicionar UI no modal**

Localizar a seção "Controle interno" (procure por `tipoEntrada`). Logo abaixo dessa seção (antes do botão de submit), adicionar nova seção:

```tsx
{/* ============== ALUGUEL ============== */}
<div style={{ padding: '1.25rem 0', borderTop: '1px solid #e4e4e0', marginTop: '1rem' }}>
  <h3 style={{
    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
    fontSize: '0.82rem', letterSpacing: '0.15em', textTransform: 'uppercase',
    color: '#27367D', margin: '0 0 0.75rem'
  }}>
    Aluguel
  </h3>
  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: '0.75rem' }}>
    <input type="checkbox" checked={disponivelAluguel}
      onChange={(e) => setDisponivelAluguel(e.target.checked)}
      style={{ width: 'auto' }} />
    <span>Disponível para aluguel no site</span>
  </label>
  {disponivelAluguel && (
    <div className={styles.formGroup}>
      <label>Valor da diária (R$) *</label>
      <input type="number" step="0.01" min="0"
        value={valorDiaria}
        onChange={(e) => setValorDiaria(e.target.value)}
        placeholder="150.00"
        required />
    </div>
  )}
</div>
```

**Step 3: Atualizar backend (parseMotoForm)**

Em `lib/motos.ts`:

**a)** Adicionar ao tipo `MotoUpsertFields`:
```typescript
disponivel_aluguel: 0 | 1;
valor_diaria: number | null;
```

**b)** Adicionar ao array `MOTO_UPSERT_COLUMNS`:
```typescript
'disponivel_aluguel',
'valor_diaria',
```

**c)** Adicionar ao `parseMotoForm`:
```typescript
disponivel_aluguel: fd.get('disponivel_aluguel') === '1' ? 1 : 0,
valor_diaria: numOrNull(fd, 'valor_diaria'),
```

**Step 4: Typecheck + commit**
```bash
npx tsc --noEmit
git add app/admin/motos/MotoModal.tsx lib/motos.ts
git commit -m "feat(aluguel): campos disponivel_aluguel + valor_diaria no MotoModal"
```

---

## Task 3: Configurações — campo caução padrão

**Files:**
- Modify: `app/admin/config/page.tsx`

**Step 1: Localizar o estado de config e adicionar caução**

Procurar por `telefone, whatsapp` ou similar. Adicionar state:
```typescript
const [caucao, setCaucao] = useState('');
```

No `useEffect` de load, após carregar as chaves existentes:
```typescript
setCaucao(cfg.aluguel_caucao_padrao || '500');
```

No handler de salvar (POST/PUT de configuração), incluir:
```typescript
body: JSON.stringify({
  ...dadosExistentes,
  aluguel_caucao_padrao: caucao.trim(),
}),
```

**Step 2: UI — adicionar campo**

Próximo aos outros campos de configuração (ex: contato), adicionar:
```tsx
<div className={styles.formGroup}>
  <label>Valor da caução (aluguel) — R$</label>
  <input type="number" step="0.01" min="0"
    value={caucao}
    onChange={(e) => setCaucao(e.target.value)}
    placeholder="500.00" />
  <span style={{ fontSize: '0.75rem', color: '#777', marginTop: 4, display: 'block' }}>
    Valor único aplicado a todas as reservas de aluguel. O cliente vê na página, paga na retirada.
  </span>
</div>
```

**Step 3: Typecheck + commit**
```bash
npx tsc --noEmit
git add app/admin/config/page.tsx
git commit -m "feat(aluguel): campo caucao padrão em /admin/config"
```

---

## Task 4: APIs públicas de aluguel (list + detail + disponibilidade)

**Files:**
- Create: `app/api/aluguel/motos/route.ts`
- Create: `app/api/aluguel/motos/[id]/route.ts`
- Create: `app/api/aluguel/disponibilidade/[motoId]/route.ts`

**Step 1: Criar os 3 route handlers**

**a) `app/api/aluguel/motos/route.ts`** — lista motos com `disponivel_aluguel=1`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getDb, stripAdminFields } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT * FROM motos WHERE disponivel_aluguel=1 AND valor_diaria IS NOT NULL
         AND estado NOT IN ('entregue', 'retirada')
         ORDER BY destaque DESC, id DESC`,
      )
      .all() as Record<string, unknown>[];
    return NextResponse.json(rows.map((r) => stripAdminFields(r)));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**b) `app/api/aluguel/motos/[id]/route.ts`** — detalhe:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getDb, stripAdminFields } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const db = getDb();
  const moto = db.prepare('SELECT * FROM motos WHERE id=? AND disponivel_aluguel=1').get(Number(id)) as
    | Record<string, unknown>
    | undefined;
  if (!moto) return NextResponse.json({ error: 'Moto não encontrada' }, { status: 404 });

  const fotos = db.prepare('SELECT id, url FROM fotos WHERE moto_id=? ORDER BY ordem ASC').all(Number(id));
  const caucaoRow = db.prepare("SELECT valor FROM configuracoes WHERE chave='aluguel_caucao_padrao'").get() as { valor: string } | undefined;

  return NextResponse.json({
    ...stripAdminFields(moto),
    fotos,
    valor_caucao: caucaoRow ? Number(caucaoRow.valor) : 0,
  });
}
```

**c) `app/api/aluguel/disponibilidade/[motoId]/route.ts`** — retorna datas bloqueadas (expandidas em array):
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ motoId: string }> };

export async function GET(_request: NextRequest, ctx: Ctx) {
  const { motoId } = await ctx.params;
  const db = getDb();
  // Apenas reservas que de fato bloqueiam datas
  const rows = db
    .prepare(
      `SELECT data_inicio, data_fim FROM alugueis
       WHERE moto_id=? AND status IN ('aprovada','ativa')`,
    )
    .all(Number(motoId)) as { data_inicio: string; data_fim: string }[];

  const bloqueadas = new Set<string>();
  for (const r of rows) {
    const start = new Date(r.data_inicio + 'T12:00:00');
    const end = new Date(r.data_fim + 'T12:00:00');
    const cur = new Date(start);
    while (cur <= end) {
      bloqueadas.add(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
  }
  return NextResponse.json({ bloqueadas: Array.from(bloqueadas).sort() });
}
```

**Step 2: Typecheck + commit + smoke test**
```bash
npx tsc --noEmit
git add app/api/aluguel
git commit -m "feat(aluguel): APIs públicas (list, detail, disponibilidade)"
```

Smoke test após deploy:
```bash
curl -s https://buscaracing.com/api/aluguel/motos | head -c 200
# Expected: array JSON (vazio inicialmente)
```

---

## Task 5: API pública de criar reserva

**Files:**
- Create: `app/api/aluguel/reservar/route.ts`

**Step 1: Criar endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

function daysBetween(inicio: string, fim: string): number {
  const a = new Date(inicio + 'T12:00:00').getTime();
  const b = new Date(fim + 'T12:00:00').getTime();
  return Math.round((b - a) / 86400000) + 1; // inclusive
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return !(aEnd < bStart || aStart > bEnd);
}

const CPF_RE = /^\d{11}$/;
const CNH_RE = /^\d{9,11}$/;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      moto_id: number;
      data_inicio: string;
      data_fim: string;
      cliente_nome: string;
      telefone: string;
      email?: string;
      cpf: string;
      cnh: string;
      observacoes?: string;
    };

    const motoId = Number(body.moto_id);
    const inicio = (body.data_inicio || '').trim();
    const fim = (body.data_fim || '').trim();
    const nome = (body.cliente_nome || '').trim();
    const tel = (body.telefone || '').trim();
    const cpf = (body.cpf || '').replace(/\D/g, '');
    const cnh = (body.cnh || '').replace(/\D/g, '');

    // Validações básicas
    if (!motoId) return NextResponse.json({ error: 'moto_id inválido' }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim))
      return NextResponse.json({ error: 'Datas inválidas' }, { status: 400 });
    if (inicio > fim)
      return NextResponse.json({ error: 'data_fim deve ser ≥ data_inicio' }, { status: 400 });
    const hoje = new Date().toISOString().slice(0, 10);
    if (inicio < hoje)
      return NextResponse.json({ error: 'Data de início não pode ser no passado' }, { status: 400 });
    if (!nome || !tel)
      return NextResponse.json({ error: 'Nome e telefone são obrigatórios' }, { status: 400 });
    if (!CPF_RE.test(cpf))
      return NextResponse.json({ error: 'CPF inválido (11 dígitos)' }, { status: 400 });
    if (!CNH_RE.test(cnh))
      return NextResponse.json({ error: 'CNH inválida (9 a 11 dígitos)' }, { status: 400 });

    const db = getDb();

    const moto = db
      .prepare('SELECT id, valor_diaria, disponivel_aluguel FROM motos WHERE id=?')
      .get(motoId) as { id: number; valor_diaria: number | null; disponivel_aluguel: number } | undefined;
    if (!moto || !moto.disponivel_aluguel || !moto.valor_diaria) {
      return NextResponse.json({ error: 'Moto indisponível para aluguel' }, { status: 404 });
    }

    // Checar conflito com reservas aprovadas/ativas
    const conflitos = db
      .prepare(
        `SELECT id FROM alugueis WHERE moto_id=? AND status IN ('aprovada','ativa')
         AND NOT (data_fim < ? OR data_inicio > ?)`,
      )
      .all(motoId, inicio, fim) as { id: number }[];
    if (conflitos.length > 0) {
      return NextResponse.json({ error: 'As datas selecionadas estão indisponíveis' }, { status: 409 });
    }

    const dias = daysBetween(inicio, fim);
    const valorTotal = dias * moto.valor_diaria;

    const caucaoRow = db.prepare("SELECT valor FROM configuracoes WHERE chave='aluguel_caucao_padrao'").get() as { valor: string } | undefined;
    const caucao = caucaoRow ? Number(caucaoRow.valor) || 0 : 0;

    const result = db
      .prepare(
        `INSERT INTO alugueis (
          moto_id, status, data_inicio, data_fim, dias,
          valor_diaria, valor_total, valor_caucao,
          cliente_nome, telefone, email, cpf, cnh, observacoes
        ) VALUES (?, 'pendente', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        motoId, inicio, fim, dias,
        moto.valor_diaria, valorTotal, caucao,
        nome, tel, (body.email || '').trim(),
        cpf, cnh, (body.observacoes || '').trim(),
      );

    return NextResponse.json({
      ok: true,
      id: Number(result.lastInsertRowid),
      valor_total: valorTotal,
      dias,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 2: Atualizar middleware (não proteger)**

Em `middleware.ts`, garantir que `/api/aluguel/*` **não** cai no matcher de auth (é público).

Verificar `matcher` atual — se está `/api/:path*`, precisa excluir. Se é lista específica (`['/api/admin/:path*', ...]`), já tá OK. Provavelmente já está.

**Step 3: Typecheck + commit**
```bash
npx tsc --noEmit
git add app/api/aluguel/reservar/route.ts middleware.ts
git commit -m "feat(aluguel): POST /api/aluguel/reservar com validação e conflito"
```

---

## Task 6: Página pública /aluguel (grid de motos)

**Files:**
- Create: `app/aluguel/page.tsx`
- Create: `app/aluguel/aluguel.module.css`

**Step 1: Criar page server-component**

```tsx
// app/aluguel/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { getDb, stripAdminFields } from '@/lib/db';
import styles from './aluguel.module.css';

export const metadata: Metadata = {
  title: 'Aluguel de Motos',
  description: 'Alugue motos para suas aventuras ou uso diário. Busca Racing — Franco da Rocha SP.',
  alternates: { canonical: 'https://buscaracing.com/aluguel' },
};

export const dynamic = 'force-dynamic';

type Moto = {
  id: number;
  nome: string;
  marca: string;
  modelo?: string;
  ano?: number;
  imagem?: string;
  valor_diaria: number;
};

export default async function AluguelPage() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM motos WHERE disponivel_aluguel=1 AND valor_diaria IS NOT NULL
       AND estado NOT IN ('entregue','retirada')
       ORDER BY destaque DESC, id DESC`,
    )
    .all() as Record<string, unknown>[];
  const motos = rows.map((r) => stripAdminFields(r)) as unknown as Moto[];

  return (
    <>
      <section className={styles.banner}>
        <div className={styles.bannerInner}>
          <div className={styles.breadcrumb}>
            <Link href="/">Home</Link> / Aluguel
          </div>
          <h1 className={styles.title}>
            ALUGUE SUA <span className={styles.titleEm}>MOTO</span>
          </h1>
          <p className={styles.sub}>
            Motos disponíveis para locação — escolha a data, pague só pelos dias que usar.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.container}>
          {motos.length === 0 ? (
            <div className={styles.empty}>
              <h2>Nenhuma moto disponível para aluguel no momento</h2>
              <p>Fale com a gente pelo WhatsApp e avisaremos assim que tiver disponibilidade.</p>
              <a href="https://wa.me/5511947807036?text=Quero%20alugar%20uma%20moto"
                 className={styles.btnWa} target="_blank" rel="noopener noreferrer">
                Falar no WhatsApp
              </a>
            </div>
          ) : (
            <div className={styles.grid}>
              {motos.map((m) => (
                <Link key={m.id} href={`/aluguel/${m.id}`} className={styles.card}>
                  <div className={styles.cardImg}>
                    {m.imagem ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.imagem} alt={m.nome} />
                    ) : (
                      <div className={styles.cardImgPh}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="18" height="18" rx="2" stroke="#ccc" strokeWidth="2" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className={styles.cardBody}>
                    <h3 className={styles.cardName}>{m.nome}</h3>
                    <p className={styles.cardSub}>
                      {m.marca}{m.ano ? ` · ${m.ano}` : ''}
                    </p>
                    <div className={styles.priceRow}>
                      <span className={styles.price}>R$ {Number(m.valor_diaria).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <span className={styles.priceUnit}>/dia</span>
                    </div>
                    <span className={styles.cardCta}>
                      Ver detalhes e reservar
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
```

**Step 2: CSS**

```css
/* app/aluguel/aluguel.module.css */
.banner {
  background: var(--blue);
  padding: 3.5rem 3vw 3rem;
  position: relative;
  overflow: hidden;
}
.bannerInner {
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}
.breadcrumb {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.8rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
  margin-bottom: 0.75rem;
}
.breadcrumb a {
  color: inherit;
  text-decoration: none;
}
.breadcrumb a:hover {
  color: var(--red);
}
.title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(3rem, 6vw, 5.5rem);
  line-height: 0.9;
  color: #fff;
  margin: 0;
}
.titleEm { color: var(--red); }
.sub {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.55);
  max-width: 500px;
  line-height: 1.55;
  margin-top: 0.75rem;
}
.container {
  max-width: 1300px;
  margin: 0 auto;
  padding: 0 3vw;
}
.section {
  padding: 4rem 0;
  background: #FDFDFB;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.5rem;
}
.card {
  background: #fff;
  border: 1px solid #e4e4e0;
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  transition: all 0.25s;
}
.card:hover {
  border-color: var(--blue);
  box-shadow: 0 14px 36px rgba(39, 54, 125, 0.13);
  transform: translateY(-3px);
}
.cardImg {
  width: 100%;
  aspect-ratio: 4/3;
  overflow: hidden;
  background: #f6f6f3;
}
.cardImg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cardImgPh {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cardBody { padding: 1.1rem 1.2rem; }
.cardName {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.35rem;
  color: var(--blue);
  margin: 0;
  letter-spacing: 0.02em;
  line-height: 1.15;
}
.card:hover .cardName { color: var(--red); }
.cardSub {
  font-size: 0.82rem;
  color: #777;
  margin: 2px 0 10px;
}
.priceRow {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.price {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.7rem;
  color: var(--blue);
}
.priceUnit {
  font-size: 0.85rem;
  color: #777;
}
.cardCta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #f1f1ee;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--blue);
}
.card:hover .cardCta { color: var(--red); }
.empty {
  text-align: center;
  padding: 3rem 1rem;
  background: #fafaf7;
  border: 1px dashed #e4e4e0;
}
.empty h2 {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.6rem;
  color: var(--blue);
  margin: 0 0 0.5rem;
}
.empty p {
  color: #666;
  margin: 0 0 1.5rem;
}
.btnWa {
  display: inline-flex;
  align-items: center;
  background: #25d366;
  color: #fff;
  padding: 12px 24px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  text-decoration: none;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: background 0.2s;
}
.btnWa:hover { background: #1ebe5a; }
```

**Step 3: Typecheck + commit**
```bash
npx tsc --noEmit
git add app/aluguel
git commit -m "feat(aluguel): página pública /aluguel com grid de motos"
```

---

## Task 7: Página pública /aluguel/[id] (detalhe + form)

**Files:**
- Create: `app/aluguel/[id]/page.tsx`
- Create: `app/aluguel/[id]/aluguel-detalhe.module.css`
- Create: `app/aluguel/[id]/ReservaForm.tsx` (client component)

**Step 1: Server page** (`app/aluguel/[id]/page.tsx`):
```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb, stripAdminFields } from '@/lib/db';
import ReservaForm from './ReservaForm';
import styles from './aluguel-detalhe.module.css';
import parentStyles from '../aluguel.module.css';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const db = getDb();
  const m = db.prepare('SELECT nome, marca FROM motos WHERE id=? AND disponivel_aluguel=1').get(Number(id)) as
    | { nome: string; marca: string } | undefined;
  if (!m) return { title: 'Moto não encontrada' };
  return {
    title: `Alugar ${m.nome} — Busca Racing`,
    description: `Reserve a ${m.marca} ${m.nome} para aluguel online. Escolha suas datas e entre em contato pela Busca Racing.`,
    alternates: { canonical: `https://buscaracing.com/aluguel/${id}` },
  };
}

type Foto = { id: number; url: string };
type Moto = Record<string, unknown> & { id: number; nome: string; valor_diaria: number };

export default async function AluguelDetalhePage({ params }: Props) {
  const { id } = await params;
  const db = getDb();
  const motoRaw = db.prepare('SELECT * FROM motos WHERE id=? AND disponivel_aluguel=1').get(Number(id)) as
    | Record<string, unknown> | undefined;
  if (!motoRaw) notFound();
  const moto = stripAdminFields(motoRaw) as unknown as Moto;

  const fotos = db.prepare('SELECT id, url FROM fotos WHERE moto_id=? ORDER BY ordem ASC').all(Number(id)) as Foto[];
  const caucaoRow = db.prepare("SELECT valor FROM configuracoes WHERE chave='aluguel_caucao_padrao'").get() as { valor: string } | undefined;
  const caucao = caucaoRow ? Number(caucaoRow.valor) || 0 : 0;

  // Datas bloqueadas (array de YYYY-MM-DD)
  const reservas = db
    .prepare("SELECT data_inicio, data_fim FROM alugueis WHERE moto_id=? AND status IN ('aprovada','ativa')")
    .all(Number(id)) as { data_inicio: string; data_fim: string }[];
  const bloqueadas = new Set<string>();
  for (const r of reservas) {
    const s = new Date(r.data_inicio + 'T12:00:00');
    const e = new Date(r.data_fim + 'T12:00:00');
    const cur = new Date(s);
    while (cur <= e) {
      bloqueadas.add(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
  }

  return (
    <>
      <section className={parentStyles.banner}>
        <div className={parentStyles.bannerInner}>
          <div className={parentStyles.breadcrumb}>
            <Link href="/">Home</Link> / <Link href="/aluguel">Aluguel</Link> / {moto.nome}
          </div>
          <h1 className={parentStyles.title}>{moto.nome.toUpperCase()}</h1>
          <p className={parentStyles.sub}>{String(moto.marca || '')}</p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.grid}>
            <div className={styles.gallery}>
              {moto.imagem ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={String(moto.imagem)} alt={moto.nome} className={styles.heroImg} />
              ) : null}
              {fotos.length > 0 && (
                <div className={styles.fotos}>
                  {fotos.map((f) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={f.id} src={f.url} alt="" className={styles.thumb} />
                  ))}
                </div>
              )}
            </div>

            <div className={styles.sidebar}>
              <div className={styles.priceCard}>
                <div className={styles.priceValue}>
                  R$ {Number(moto.valor_diaria).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  <span className={styles.priceUnit}>/dia</span>
                </div>
                <div className={styles.caucaoInfo}>
                  + caução de R$ {caucao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (devolvida após a entrega)
                </div>
              </div>

              <ReservaForm
                motoId={Number(id)}
                valorDiaria={Number(moto.valor_diaria)}
                valorCaucao={caucao}
                bloqueadas={Array.from(bloqueadas)}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
```

**Step 2: Client form** (`app/aluguel/[id]/ReservaForm.tsx`):
```tsx
'use client';

import { useMemo, useState } from 'react';
import styles from './aluguel-detalhe.module.css';

type Props = {
  motoId: number;
  valorDiaria: number;
  valorCaucao: number;
  bloqueadas: string[];
};

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function diasEntre(inicio: string, fim: string): number {
  if (!inicio || !fim) return 0;
  const a = new Date(inicio + 'T12:00:00').getTime();
  const b = new Date(fim + 'T12:00:00').getTime();
  if (b < a) return 0;
  return Math.round((b - a) / 86400000) + 1;
}

function temConflito(inicio: string, fim: string, bloq: string[]): boolean {
  if (!inicio || !fim) return false;
  const bloqSet = new Set(bloq);
  const cur = new Date(inicio + 'T12:00:00');
  const end = new Date(fim + 'T12:00:00');
  while (cur <= end) {
    if (bloqSet.has(cur.toISOString().slice(0, 10))) return true;
    cur.setDate(cur.getDate() + 1);
  }
  return false;
}

export default function ReservaForm({ motoId, valorDiaria, valorCaucao, bloqueadas }: Props) {
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [cnh, setCnh] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const dias = useMemo(() => diasEntre(inicio, fim), [inicio, fim]);
  const total = dias * valorDiaria;
  const conflito = useMemo(() => temConflito(inicio, fim, bloqueadas), [inicio, fim, bloqueadas]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!inicio || !fim) { setErr('Selecione as datas'); return; }
    if (dias < 1) { setErr('Intervalo inválido'); return; }
    if (conflito) { setErr('Datas selecionadas estão indisponíveis'); return; }
    if (!nome.trim() || !telefone.trim()) { setErr('Nome e telefone obrigatórios'); return; }
    const cpfNum = cpf.replace(/\D/g, '');
    const cnhNum = cnh.replace(/\D/g, '');
    if (cpfNum.length !== 11) { setErr('CPF precisa ter 11 dígitos'); return; }
    if (cnhNum.length < 9 || cnhNum.length > 11) { setErr('CNH precisa ter 9 a 11 dígitos'); return; }

    setSaving(true);
    try {
      const r = await fetch('/api/aluguel/reservar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moto_id: motoId,
          data_inicio: inicio,
          data_fim: fim,
          cliente_nome: nome.trim(),
          telefone: telefone.trim(),
          email: email.trim(),
          cpf: cpfNum,
          cnh: cnhNum,
          observacoes: observacoes.trim(),
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErr(d.error || 'Erro ao enviar reserva');
        return;
      }
      setOk(true);
    } catch {
      setErr('Falha de conexão');
    } finally {
      setSaving(false);
    }
  };

  if (ok) {
    return (
      <div className={styles.success}>
        <div className={styles.successIcon}>✓</div>
        <h3>Recebemos sua solicitação!</h3>
        <p>Em breve entraremos em contato pelo WhatsApp para confirmar sua reserva.</p>
        <a href="https://wa.me/5511947807036?text=Acabei+de+solicitar+uma+reserva+de+aluguel."
           className={styles.successWa} target="_blank" rel="noopener noreferrer">
          Adiantar contato
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={styles.form}>
      <h3 className={styles.formTitle}>Solicitar reserva</h3>

      <div className={styles.row}>
        <div className={styles.field}>
          <label>Data início *</label>
          <input type="date" min={hojeISO()} value={inicio} onChange={(e) => setInicio(e.target.value)} required />
        </div>
        <div className={styles.field}>
          <label>Data fim *</label>
          <input type="date" min={inicio || hojeISO()} value={fim} onChange={(e) => setFim(e.target.value)} required />
        </div>
      </div>

      {dias > 0 && !conflito && (
        <div className={styles.resumo}>
          <div>{dias} {dias === 1 ? 'dia' : 'dias'} × R$ {valorDiaria.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          <strong>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
        </div>
      )}
      {conflito && (
        <div className={styles.conflito}>Datas já reservadas. Escolha outro intervalo.</div>
      )}

      <div className={styles.field}>
        <label>Nome completo *</label>
        <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required />
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label>Telefone *</label>
          <input type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" required />
        </div>
        <div className={styles.field}>
          <label>E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label>CPF *</label>
          <input type="text" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="Apenas números" required />
        </div>
        <div className={styles.field}>
          <label>CNH *</label>
          <input type="text" value={cnh} onChange={(e) => setCnh(e.target.value)} placeholder="Número do registro" required />
        </div>
      </div>
      <div className={styles.field}>
        <label>Observações</label>
        <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} />
      </div>

      {err && <div className={styles.err}>{err}</div>}

      <button type="submit" className={styles.btnSubmit} disabled={saving || !!conflito}>
        {saving ? 'Enviando...' : 'Solicitar reserva'}
      </button>
      <p className={styles.disclaimer}>
        A reserva fica pendente até aprovação — confirmamos por WhatsApp.
      </p>
    </form>
  );
}
```

**Step 3: CSS** (`app/aluguel/[id]/aluguel-detalhe.module.css`):

Reuso de estilos de `pecas/[categoria]`. Criar estilos específicos mínimos:
```css
.container { max-width: 1300px; margin: 0 auto; padding: 0 3vw; }
.section { padding: 3rem 0 4rem; background: #FDFDFB; }
.grid {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 2.5rem;
}
@media (max-width: 900px) {
  .grid { grid-template-columns: 1fr; }
}
.gallery { }
.heroImg { width: 100%; aspect-ratio: 4/3; object-fit: cover; }
.fotos { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin-top: 0.5rem; }
.thumb { width: 100%; aspect-ratio: 1; object-fit: cover; }
.sidebar { display: flex; flex-direction: column; gap: 1.5rem; }

.priceCard { background: var(--blue); color: #fff; padding: 1.5rem; }
.priceValue { font-family: 'Bebas Neue', sans-serif; font-size: 2.5rem; line-height: 1; }
.priceUnit { font-size: 1rem; color: rgba(255,255,255,0.7); margin-left: 6px; }
.caucaoInfo { font-size: 0.82rem; color: rgba(255,255,255,0.7); margin-top: 0.5rem; }

.form { background: #fff; border: 1px solid #e4e4e0; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
.formTitle { font-family: 'Bebas Neue', sans-serif; font-size: 1.5rem; color: var(--blue); margin: 0; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.field { display: flex; flex-direction: column; gap: 4px; }
.field label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #555;
  font-weight: 700;
}
.field input, .field textarea {
  padding: 10px 12px;
  border: 1.5px solid #e4e4e0;
  background: #fafaf8;
  font-family: inherit;
  font-size: 0.92rem;
  outline: none;
}
.field input:focus, .field textarea:focus { border-color: var(--blue); background: #fff; }
.resumo {
  background: #f6f6f3;
  padding: 12px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.92rem;
}
.resumo strong { color: var(--blue); font-size: 1.1rem; }
.conflito {
  background: #fcdcdc;
  color: #8b1820;
  padding: 10px 12px;
  font-size: 0.88rem;
  font-weight: 600;
}
.err {
  background: #fcdcdc;
  color: #8b1820;
  padding: 10px 12px;
  font-size: 0.88rem;
}
.btnSubmit {
  background: var(--blue);
  color: #fff;
  padding: 14px;
  border: none;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.2s;
}
.btnSubmit:hover:not(:disabled) { background: var(--red); }
.btnSubmit:disabled { opacity: 0.5; cursor: not-allowed; }
.disclaimer { font-size: 0.75rem; color: #777; text-align: center; margin: 0; }

.success { text-align: center; padding: 2rem 1rem; background: #d4edda; border: 1px solid #1a7430; }
.successIcon { font-size: 2.5rem; color: #155724; }
.success h3 { font-family: 'Bebas Neue', sans-serif; color: #155724; font-size: 1.6rem; margin: 0.5rem 0; }
.success p { color: #155724; margin: 0 0 1rem; }
.successWa {
  display: inline-block;
  background: #25d366;
  color: #fff;
  padding: 10px 20px;
  text-decoration: none;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.85rem;
}
```

**Step 4: Typecheck + commit**
```bash
npx tsc --noEmit
git add "app/aluguel/[id]"
git commit -m "feat(aluguel): página /aluguel/[id] com galeria e formulário de reserva"
```

---

## Task 8: APIs admin (list + detail + patch status)

**Files:**
- Create: `app/api/admin/alugueis/route.ts`
- Create: `app/api/admin/alugueis/[id]/route.ts`

**Step 1: GET lista** (`app/api/admin/alugueis/route.ts`):
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT a.*,
              m.nome AS moto_nome, m.marca AS moto_marca, m.imagem AS moto_imagem
       FROM alugueis a
       LEFT JOIN motos m ON m.id = a.moto_id
       ORDER BY CASE a.status WHEN 'pendente' THEN 0 WHEN 'aprovada' THEN 1 WHEN 'ativa' THEN 2 ELSE 3 END,
                a.created_at DESC`,
    )
    .all();
  return NextResponse.json(rows);
}
```

**Step 2: PATCH status** (`app/api/admin/alugueis/[id]/route.ts`):
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

const TRANSICOES: Record<string, string[]> = {
  pendente:   ['aprovada', 'recusada'],
  aprovada:   ['ativa', 'cancelada'],
  ativa:      ['finalizada'],
  recusada:   [],
  cancelada:  [],
  finalizada: [],
};

export async function GET(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT a.*, m.nome AS moto_nome, m.marca AS moto_marca, m.imagem AS moto_imagem,
              m.modelo AS moto_modelo, m.ano AS moto_ano, m.placa AS moto_placa
       FROM alugueis a LEFT JOIN motos m ON m.id=a.moto_id WHERE a.id=?`,
    )
    .get(Number(id));
  if (!row) return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const db = getDb();
  const atual = db.prepare('SELECT * FROM alugueis WHERE id=?').get(Number(id)) as
    | Record<string, unknown> | undefined;
  if (!atual) return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 });

  const body = (await request.json()) as {
    status?: string;
    motivo_recusa?: string;
    admin_notas?: string;
    valor_dano?: number;
  };

  const statusAtual = String(atual.status);
  const novoStatus = body.status;

  // Atualizar notas/motivo sem trocar status
  if (!novoStatus) {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (body.admin_notas !== undefined) {
      sets.push('admin_notas=?');
      vals.push(body.admin_notas);
    }
    if (sets.length === 0) return NextResponse.json({ ok: true });
    vals.push(Number(id));
    db.prepare(`UPDATE alugueis SET ${sets.join(', ')} WHERE id=?`).run(...vals);
    return NextResponse.json({ ok: true });
  }

  // Validar transição
  const validas = TRANSICOES[statusAtual] || [];
  if (!validas.includes(novoStatus)) {
    return NextResponse.json({
      error: `Transição inválida: ${statusAtual} → ${novoStatus}`,
    }, { status: 400 });
  }

  const tx = db.transaction(() => {
    const agora = "datetime('now','localtime')";

    if (novoStatus === 'aprovada') {
      // Recusar conflitantes pendentes
      db.prepare(
        `UPDATE alugueis SET status='recusada', motivo_recusa='Conflito de datas'
         WHERE moto_id=? AND status='pendente' AND id != ?
           AND NOT (data_fim < ? OR data_inicio > ?)`,
      ).run(atual.moto_id, Number(id), atual.data_inicio, atual.data_fim);
      db.prepare(`UPDATE alugueis SET status='aprovada', aprovada_em=${agora} WHERE id=?`).run(Number(id));
    } else if (novoStatus === 'recusada') {
      db.prepare('UPDATE alugueis SET status=?, motivo_recusa=? WHERE id=?')
        .run('recusada', (body.motivo_recusa || '').trim(), Number(id));
    } else if (novoStatus === 'cancelada') {
      db.prepare('UPDATE alugueis SET status=?, motivo_recusa=? WHERE id=?')
        .run('cancelada', (body.motivo_recusa || '').trim(), Number(id));
    } else if (novoStatus === 'ativa') {
      db.prepare(`UPDATE alugueis SET status='ativa', retirada_em=${agora} WHERE id=?`).run(Number(id));
      // Lançamento entrada
      db.prepare(
        `INSERT INTO lancamentos (tipo, categoria, valor, descricao, ref_tipo, ref_id)
         VALUES ('entrada', 'aluguel_moto', ?, ?, 'aluguel', ?)`,
      ).run(
        Number(atual.valor_total),
        `Aluguel #${id} — ${atual.cliente_nome}`,
        Number(id),
      );
    } else if (novoStatus === 'finalizada') {
      const dano = Number(body.valor_dano) || 0;
      db.prepare(`UPDATE alugueis SET status='finalizada', devolvida_em=${agora}, valor_dano=? WHERE id=?`)
        .run(dano, Number(id));
      if (dano > 0) {
        db.prepare(
          `INSERT INTO lancamentos (tipo, categoria, valor, descricao, ref_tipo, ref_id)
           VALUES ('entrada', 'dano_aluguel', ?, ?, 'aluguel', ?)`,
        ).run(dano, `Dano/ressarcimento aluguel #${id}`, Number(id));
      }
    }
  });
  tx();

  return NextResponse.json({ ok: true });
}
```

**Step 3: Typecheck + commit**
```bash
npx tsc --noEmit
git add app/api/admin/alugueis
git commit -m "feat(aluguel): APIs admin (list, detail, PATCH com transições + lançamentos)"
```

---

## Task 9: Admin page /admin/alugueis

**Files:**
- Create: `app/admin/alugueis/page.tsx`
- Create: `app/admin/alugueis/page.module.css` (copiar de vendas e customizar se necessário)
- Create: `app/admin/alugueis/AluguelActions.tsx` (component com ações + modal de recusa/devolução)

**Step 1: Copiar CSS base**
```bash
cp app/admin/vendas/page.module.css app/admin/alugueis/page.module.css
```

**Step 2: Admin page client** (`app/admin/alugueis/page.tsx`):
```tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/Toast';
import styles from './page.module.css';
import AluguelActions from './AluguelActions';

type Aluguel = {
  id: number;
  moto_id: number;
  moto_nome: string;
  moto_marca: string;
  moto_imagem: string | null;
  status: string;
  data_inicio: string;
  data_fim: string;
  dias: number;
  valor_diaria: number;
  valor_total: number;
  valor_caucao: number;
  cliente_nome: string;
  telefone: string;
  email: string;
  cpf: string;
  cnh: string;
  observacoes: string;
  admin_notas: string;
  motivo_recusa: string;
  valor_dano: number;
  created_at: string;
  aprovada_em: string | null;
  retirada_em: string | null;
  devolvida_em: string | null;
};

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  pendente:   { label: 'Pendente',   bg: '#fff3cd', color: '#856404' },
  aprovada:   { label: 'Aprovada',   bg: '#d4edda', color: '#155724' },
  ativa:      { label: 'Ativa',      bg: '#cce5ff', color: '#004085' },
  finalizada: { label: 'Finalizada', bg: '#e2e3e5', color: '#383d41' },
  recusada:   { label: 'Recusada',   bg: '#f5c6cb', color: '#721c24' },
  cancelada:  { label: 'Cancelada',  bg: '#f5c6cb', color: '#721c24' },
};

function fmtBRL(v: number): string { return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`; }
function fmtDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');
}

export default function AlugueisAdminPage() {
  const { showToast } = useToast();
  const [alugueis, setAlugueis] = useState<Aluguel[]>([]);
  const [loading, setLoading] = useState(true);
  const [fStatus, setFStatus] = useState('');
  const [search, setSearch] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/alugueis');
      if (r.ok) setAlugueis(await r.json());
    } catch {
      showToast('Erro ao carregar', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { reload(); }, [reload]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return alugueis.filter((a) => {
      if (fStatus && a.status !== fStatus) return false;
      if (q) {
        const t = `${a.cliente_nome} ${a.moto_nome} ${a.telefone} ${a.cpf}`.toLowerCase();
        if (!t.includes(q)) return false;
      }
      return true;
    });
  }, [alugueis, fStatus, search]);

  // Resumo
  const pendentes = alugueis.filter((a) => a.status === 'pendente').length;
  const ativas = alugueis.filter((a) => a.status === 'aprovada' || a.status === 'ativa').length;
  const mesCur = new Date().toISOString().slice(0, 7);
  const faturamento = alugueis
    .filter((a) => (a.retirada_em || '').slice(0, 7) === mesCur && (a.status === 'ativa' || a.status === 'finalizada'))
    .reduce((s, a) => s + Number(a.valor_total || 0), 0);

  return (
    <div className={styles.wrap}>
      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Pendentes</div>
          <div className={styles.cardValue} style={{ color: pendentes > 0 ? '#856404' : undefined }}>
            {pendentes}
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Aprovadas / Ativas</div>
          <div className={styles.cardValue}>{ativas}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Faturamento do mês</div>
          <div className={styles.cardValue}>{fmtBRL(faturamento)}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Total</div>
          <div className={styles.cardValue}>{alugueis.length}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input type="text" placeholder="Buscar por cliente, moto, telefone, CPF..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 260, padding: '10px 14px', border: '1.5px solid #e4e4e0', fontSize: '0.92rem' }} />
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}
          style={{ padding: '10px 14px', border: '1.5px solid #e4e4e0', fontSize: '0.92rem' }}>
          <option value="">Todos status</option>
          <option value="pendente">Pendente</option>
          <option value="aprovada">Aprovada</option>
          <option value="ativa">Ativa</option>
          <option value="finalizada">Finalizada</option>
          <option value="recusada">Recusada</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Moto</th>
              <th>Cliente</th>
              <th>Período</th>
              <th>Valor</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => {
              const st = STATUS_META[a.status] || STATUS_META.pendente;
              return (
                <tr key={a.id}>
                  <td>
                    <div className={styles.tdName}>{a.moto_nome}</div>
                    <div className={styles.tdSub}>{a.moto_marca}</div>
                  </td>
                  <td>
                    <div className={styles.tdName}>{a.cliente_nome}</div>
                    <div className={styles.tdSub}>{a.telefone}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.88rem' }}>
                      {fmtDate(a.data_inicio)} → {fmtDate(a.data_fim)}
                    </div>
                    <div className={styles.tdSub}>{a.dias} {a.dias === 1 ? 'dia' : 'dias'}</div>
                  </td>
                  <td className={styles.tdPreco}>{fmtBRL(a.valor_total)}</td>
                  <td>
                    <span className={styles.badge} style={{ background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <AluguelActions aluguel={a} onChanged={reload} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <div className={styles.empty}>Nenhuma reserva encontrada.</div>
        )}
        {loading && <div className={styles.empty}>Carregando...</div>}
      </div>
    </div>
  );
}
```

**Step 3: Actions component** (`app/admin/alugueis/AluguelActions.tsx`):
```tsx
'use client';

import { useState } from 'react';
import { useToast } from '@/components/Toast';
import styles from './page.module.css';

type Aluguel = {
  id: number; status: string; cliente_nome: string; telefone: string;
  valor_total: number; moto_nome: string; data_inicio: string; data_fim: string;
};

async function patch(id: number, body: Record<string, unknown>) {
  const r = await fetch(`/api/admin/alugueis/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error || 'fail');
  }
}

export default function AluguelActions({ aluguel, onChanged }: { aluguel: Aluguel; onChanged: () => void }) {
  const { showToast } = useToast();
  const [modal, setModal] = useState<'recusar' | 'devolver' | 'cancelar' | null>(null);
  const [motivo, setMotivo] = useState('');
  const [dano, setDano] = useState('');
  const [saving, setSaving] = useState(false);

  const go = async (fn: () => Promise<void>, okMsg: string) => {
    setSaving(true);
    try {
      await fn();
      showToast(okMsg, 'success');
      setModal(null);
      setMotivo('');
      setDano('');
      onChanged();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro', 'error');
    } finally {
      setSaving(false);
    }
  };

  const btnStyle = {
    padding: '4px 10px',
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 700 as const,
    fontSize: '0.72rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    border: 'none',
    cursor: 'pointer',
  };

  const whatsapp = `https://wa.me/${aluguel.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(
    `Olá, ${aluguel.cliente_nome}! Sobre sua reserva de aluguel da ${aluguel.moto_nome}`
  )}`;

  return (
    <>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <a href={whatsapp} target="_blank" rel="noopener noreferrer"
          style={{ ...btnStyle, background: '#25d366', color: '#fff', textDecoration: 'none', display: 'inline-block' }}>
          WhatsApp
        </a>
        {aluguel.status === 'pendente' && (
          <>
            <button style={{ ...btnStyle, background: '#27367D', color: '#fff' }}
              onClick={() => go(() => patch(aluguel.id, { status: 'aprovada' }), 'Reserva aprovada!')}>
              Aprovar
            </button>
            <button style={{ ...btnStyle, background: 'transparent', color: '#dc3545', border: '1px solid #f0b4b9' }}
              onClick={() => setModal('recusar')}>
              Recusar
            </button>
          </>
        )}
        {aluguel.status === 'aprovada' && (
          <>
            <button style={{ ...btnStyle, background: '#27367D', color: '#fff' }}
              onClick={() => go(() => patch(aluguel.id, { status: 'ativa' }), 'Retirada registrada!')}>
              Marcar retirada
            </button>
            <button style={{ ...btnStyle, background: 'transparent', color: '#dc3545', border: '1px solid #f0b4b9' }}
              onClick={() => setModal('cancelar')}>
              Cancelar
            </button>
          </>
        )}
        {aluguel.status === 'ativa' && (
          <button style={{ ...btnStyle, background: '#27367D', color: '#fff' }}
            onClick={() => setModal('devolver')}>
            Marcar devolução
          </button>
        )}
        <a href={`/api/contratos/aluguel/${aluguel.id}`} target="_blank" rel="noopener noreferrer"
          style={{ ...btnStyle, background: 'transparent', color: '#27367D', border: '1px solid #e4e4e0',
                   textDecoration: 'none', display: 'inline-block' }}>
          PDF
        </a>
      </div>

      {modal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 500, padding: '1rem',
        }} onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div style={{ background: '#fff', padding: '1.5rem', maxWidth: 420, width: '100%' }}>
            <h3 style={{ margin: '0 0 1rem', fontFamily: "'Bebas Neue', sans-serif", color: '#27367D' }}>
              {modal === 'recusar' && 'Recusar reserva'}
              {modal === 'cancelar' && 'Cancelar reserva'}
              {modal === 'devolver' && 'Registrar devolução'}
            </h3>
            {modal === 'devolver' ? (
              <>
                <p style={{ fontSize: '0.88rem', color: '#555', marginBottom: 12 }}>
                  Se houve dano à moto, informe o valor do ressarcimento (será somado no financeiro):
                </p>
                <input type="number" step="0.01" min="0"
                  placeholder="0,00 (sem dano, deixe vazio)" value={dano} onChange={(e) => setDano(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e4e4e0', fontSize: '0.92rem', marginBottom: 12 }} />
              </>
            ) : (
              <>
                <p style={{ fontSize: '0.88rem', color: '#555', marginBottom: 12 }}>Motivo (opcional):</p>
                <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e4e4e0', fontSize: '0.92rem', marginBottom: 12 }} />
              </>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={{ ...btnStyle, background: 'transparent', color: '#555', border: '1px solid #e4e4e0', padding: '8px 14px' }}
                onClick={() => setModal(null)} disabled={saving}>
                Voltar
              </button>
              <button
                style={{ ...btnStyle, background: modal === 'devolver' ? '#27367D' : '#dc3545', color: '#fff', padding: '8px 14px' }}
                disabled={saving}
                onClick={() => {
                  if (modal === 'recusar')
                    go(() => patch(aluguel.id, { status: 'recusada', motivo_recusa: motivo }), 'Reserva recusada');
                  else if (modal === 'cancelar')
                    go(() => patch(aluguel.id, { status: 'cancelada', motivo_recusa: motivo }), 'Reserva cancelada');
                  else if (modal === 'devolver')
                    go(() => patch(aluguel.id, { status: 'finalizada', valor_dano: Number(dano) || 0 }), 'Devolução registrada');
                }}
              >
                {saving ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

**Step 4: Typecheck + commit**
```bash
npx tsc --noEmit
git add app/admin/alugueis
git commit -m "feat(aluguel): página /admin/alugueis com cards + filtros + ações por status"
```

---

## Task 10: Nav admin + integrações (CRM, dashboard, sitemap)

**Files:**
- Modify: `app/admin/layout.tsx`
- Modify: `app/api/clientes/route.ts`
- Modify: `app/api/stats/route.ts` (se existir seção de alertas)
- Modify: `app/sitemap.ts`
- Modify: `app/api/vendas/route.ts` (bloquear venda de moto com reserva futura)

**Step 1: Nav admin**

Em `app/admin/layout.tsx`:

**a)** No objeto `PAGE_TITLES`, adicionar:
```typescript
'/admin/alugueis': { title: 'Aluguéis', subtitle: 'Reservas de locação — aprovar, ativar, finalizar' },
```

**b)** No type `NavIcon` e no tipo `NavLink['icon']`, adicionar `'alugueis'`.

**c)** Adicionar ícone novo no `NavIcon`:
```tsx
if (name === 'alugueis') {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" />
      <path d="M8 14h2M14 14h2M8 18h2M14 18h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
```

**d)** Em `NAV_LINKS`, entre Vendas e Consignadas:
```typescript
{ href: '/admin/alugueis', label: 'Aluguéis', icon: 'alugueis' },
```

**Step 2: CRM integrar alugueis**

Em `app/api/clientes/route.ts`, localizar as queries que alimentam touchpoints. Adicionar nova fonte:

```typescript
const alugueis = db
  .prepare(
    `SELECT cliente_nome AS nome, telefone, email, 'aluguel' AS tipo,
            a.id AS ref_id, a.valor_total AS valor,
            a.created_at AS data,
            COALESCE(m.nome, '') AS moto_nome
     FROM alugueis a LEFT JOIN motos m ON m.id = a.moto_id`,
  )
  .all() as Record<string, unknown>[];
```

E juntar com os demais arrays antes do agrupamento (`...compradores, ...oficina, ...leadsRows, ...reservasRows, ...alugueis`).

**Step 3: Dashboard — alerta de pendentes**

Em `app/api/stats/route.ts`, localizar o bloco de `alertas`. Adicionar:
```typescript
const pendentes = (db.prepare("SELECT COUNT(*) AS c FROM alugueis WHERE status='pendente'").get() as { c: number }).c;
if (pendentes > 0) {
  alertas.push({
    tipo: 'aluguel',
    msg: `${pendentes} reserva${pendentes > 1 ? 's' : ''} de aluguel aguardando aprovação`,
  });
}
```

**Step 4: Bloquear venda de moto com reserva futura**

Em `app/api/vendas/route.ts`, no POST antes de inserir a venda:
```typescript
const futuras = db
  .prepare(
    `SELECT COUNT(*) AS c FROM alugueis
     WHERE moto_id=? AND status IN ('aprovada','ativa')
       AND data_fim >= date('now','localtime')`,
  )
  .get(body.moto_id) as { c: number };
if (futuras.c > 0) {
  return NextResponse.json({
    error: `Moto tem ${futuras.c} reserva(s) de aluguel futura(s). Cancele antes de vender.`,
  }, { status: 409 });
}
```

**Step 5: Sitemap**

Em `app/sitemap.ts`, adicionar:
```typescript
{ url: 'https://buscaracing.com/aluguel', lastModified: new Date() },
```
E gerar URLs dinâmicas das motos disponíveis para aluguel (opcional mas bom pra SEO):
```typescript
const aluguelRows = db
  .prepare('SELECT id FROM motos WHERE disponivel_aluguel=1')
  .all() as { id: number }[];
const aluguelUrls = aluguelRows.map((m) => ({
  url: `https://buscaracing.com/aluguel/${m.id}`,
  lastModified: new Date(),
}));
```

**Step 6: Typecheck + commit**
```bash
npx tsc --noEmit
git add app/admin/layout.tsx app/api/clientes app/api/stats app/api/vendas app/sitemap.ts
git commit -m "feat(aluguel): nav + CRM + alerta dashboard + bloqueio venda + sitemap"
```

---

## Task 11: Contrato PDF de aluguel

**Files:**
- Modify: `lib/pdf-contrato.ts`
- Modify: `app/api/contratos/[tipo]/[id]/route.ts`

**Step 1: Adicionar gerador**

Em `lib/pdf-contrato.ts`, adicionar função `gerarContratoAluguel`:

```typescript
export async function gerarContratoAluguel(aluguelId: number): Promise<Buffer> {
  const db = getDb();
  const row = db.prepare(
    `SELECT a.*, m.nome AS moto_nome, m.marca, m.modelo, m.ano, m.placa, m.chassi, m.renavam, m.km
     FROM alugueis a LEFT JOIN motos m ON m.id=a.moto_id WHERE a.id=?`,
  ).get(aluguelId) as Record<string, unknown>;
  if (!row) throw new Error('Aluguel não encontrado');

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  header(doc, 'CONTRATO DE LOCAÇÃO DE VEÍCULO');

  sectionTitle(doc, 'Dados do veículo');
  fieldRow(doc, [['Marca', String(row.marca || '')], ['Modelo', String(row.modelo || row.moto_nome || '')]]);
  fieldRow(doc, [['Ano', String(row.ano || '')], ['Placa', String(row.placa || '')]]);
  field(doc, 'Chassi', String(row.chassi || ''));
  field(doc, 'RENAVAM', String(row.renavam || ''));
  field(doc, 'KM na retirada', row.km ? `${Number(row.km).toLocaleString('pt-BR')} km` : '________________');

  sectionTitle(doc, 'Locatário');
  field(doc, 'Nome', String(row.cliente_nome || ''));
  field(doc, 'CPF', String(row.cpf || ''));
  field(doc, 'CNH', String(row.cnh || ''));
  field(doc, 'Telefone', String(row.telefone || ''));
  field(doc, 'E-mail', String(row.email || ''));

  sectionTitle(doc, 'Período e valores');
  fieldRow(doc, [['Início', fmtDate(row.data_inicio as string)], ['Fim', fmtDate(row.data_fim as string)]]);
  field(doc, 'Dias', String(row.dias || ''));
  field(doc, 'Valor da diária', fmtBRL(row.valor_diaria as number));
  field(doc, 'Valor total', fmtBRL(row.valor_total as number));
  field(doc, 'Caução', fmtBRL(row.valor_caucao as number));

  sectionTitle(doc, 'Cláusulas');
  clausulas(doc, [
    'O LOCATÁRIO recebe o veículo acima em perfeitas condições de uso e se compromete a devolvê-lo nas mesmas condições, salvo desgaste natural.',
    'A LOCADORA recebe caução conforme valor indicado, que será integralmente devolvida após conferência do veículo na data de devolução.',
    'Em caso de danos, multas de trânsito, furto ou extravio ocorridos durante o período de locação, a responsabilidade é integral do LOCATÁRIO.',
    'O combustível é de responsabilidade do LOCATÁRIO. O veículo deve ser devolvido com o mesmo nível de combustível da retirada.',
    'Atrasos na devolução serão cobrados em dobro por dia de atraso.',
    'É vedado o uso do veículo por terceiros não cadastrados neste contrato.',
    'Fica eleito o foro da comarca de Franco da Rocha - SP para dirimir quaisquer questões oriundas do presente contrato.',
  ]);

  signatures(doc, 'Busca Racing (Locadora)', String(row.cliente_nome || 'Locatário'));
  return collectPdf(doc);
}
```

**Step 2: Adicionar ao dispatcher**

Em `app/api/contratos/[tipo]/[id]/route.ts`:

**a)** Import:
```typescript
import { gerarContratoCompra, gerarContratoConsignacao, gerarContratoVenda, gerarContratoOS, gerarReciboReserva, gerarTermoEntrega, gerarContratoAluguel } from '@/lib/pdf-contrato';
```

**b)** Adicionar ao `GENERATORS`:
```typescript
aluguel: gerarContratoAluguel,
```

**c)** Ao `FILENAMES`:
```typescript
aluguel: 'contrato-aluguel',
```

**Step 3: Typecheck + commit + smoke test**
```bash
npx tsc --noEmit
git add lib/pdf-contrato.ts "app/api/contratos/[tipo]/[id]/route.ts"
git commit -m "feat(aluguel): contrato PDF de locação (7º tipo)"
```

---

## Task 12: Verificação integrada + deploy

**Step 1: Typecheck geral**
```bash
npx tsc --noEmit
```
Expected: EXIT=0 (sem erros)

**Step 2: Listar commits e fazer push**
```bash
git log --oneline -12
git push
```

**Step 3: Deploy (VM)**
```bash
ssh root@178.156.255.162 "docker stop site_buscaracing_com 2>/dev/null; docker rm -f site_buscaracing_com 2>/dev/null; sleep 2; /srv/platform/bin/sitectl deploy --domain buscaracing.com"
```
Expected: `Deploy successful: buscaracing.com @ <sha>`

**Step 4: Smoke tests**
```bash
# 1. Página pública
curl -s -o /dev/null -w "GET /aluguel: %{http_code}\n" https://buscaracing.com/aluguel

# 2. API pública (sem motos ainda, retorna [])
curl -s https://buscaracing.com/api/aluguel/motos

# 3. Admin protegido
curl -s -o /dev/null -w "GET /admin/alugueis sem auth: %{http_code}\n" https://buscaracing.com/admin/alugueis
# Expected: 200 (client-side gate) ou redirect

# 4. API admin com cookie
# (usar login do admin e depois GET /api/admin/alugueis)
```

**Step 5: Plano de teste manual (ordem exata)**

1. `/admin/config` → definir valor de caução (ex: 500)
2. `/admin/motos` → editar uma moto → ativar "Disponível para aluguel" + valor da diária (ex: 150) → salvar
3. Abrir `/aluguel` em aba anônima → verificar que a moto aparece com R$150/dia
4. Clicar → `/aluguel/[id]` carrega com formulário
5. Preencher: datas, dados, CPF válido (11 dígitos), CNH (9-11 dígitos) → Solicitar reserva → tela de sucesso
6. Voltar no admin → `/admin/alugueis` → ver reserva em "Pendente"
7. Clicar "Aprovar" → badge vira "Aprovada"
8. Voltar em aba anônima → `/aluguel/[id]` → tentar reservar as mesmas datas → erro "datas indisponíveis"
9. Admin → "Marcar retirada" → status vira "Ativa"
10. Verificar em `/admin/financeiro` → ver lançamento de entrada `aluguel_moto` com o valor
11. Admin → "Marcar devolução" (sem dano) → status "Finalizada"
12. Clicar "PDF" → abrir contrato de locação PDF com todos os dados
13. Verificar em `/admin/clientes` → cliente aparece com aluguel na timeline
14. Tentar vender a moto em `/admin/motos` (se tiver reserva futura `aprovada`, deve bloquear)

**Step 6: Commit final (se ajustes)**
Se smoke test indicar qualquer fix necessário, abrir nova task de correção.

---

## Resumo de commits esperados

1. `feat(aluguel): migrations — motos.disponivel_aluguel + tabela alugueis + caucao padrão`
2. `feat(aluguel): campos disponivel_aluguel + valor_diaria no MotoModal`
3. `feat(aluguel): campo caucao padrão em /admin/config`
4. `feat(aluguel): APIs públicas (list, detail, disponibilidade)`
5. `feat(aluguel): POST /api/aluguel/reservar com validação e conflito`
6. `feat(aluguel): página pública /aluguel com grid de motos`
7. `feat(aluguel): página /aluguel/[id] com galeria e formulário de reserva`
8. `feat(aluguel): APIs admin (list, detail, PATCH com transições + lançamentos)`
9. `feat(aluguel): página /admin/alugueis com cards + filtros + ações por status`
10. `feat(aluguel): nav + CRM + alerta dashboard + bloqueio venda + sitemap`
11. `feat(aluguel): contrato PDF de locação (7º tipo)`
12. (opcional) fixes pós-deploy

**Total: 11-12 commits. Estimativa: 4-6 horas de execução por subagent com revisões entre tasks.**
