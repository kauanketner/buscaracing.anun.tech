# Fase 1: Estoque — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the existing "Anuncios" (moto listings) into a full inventory lifecycle system where motos have states (avaliacao → entregue) and contextual actions, with a "Chegou moto" wizard and auto-linking to oficina.

**Architecture:** Extend the existing `motos` table with `estado` and `origem` columns. Migrate existing data. Replace the nav/filter UI from "Anunciada/Pausada" binary to a multi-state lifecycle. Add wizard modal for moto entry. Auto-transition moto state when linked OS completes.

**Tech Stack:** Next.js 14 App Router, better-sqlite3, React 18 client components, CSS Modules.

---

## Task 1: DB migration — add `estado` and `origem` columns to motos

**Files:**
- Modify: `lib/db.ts` (after line 259, in the motos migration block)

**Step 1: Add columns and migrate data**

In `lib/db.ts`, after the existing motos `addCol` block (line 259), add:

```typescript
// ----- Fase 1: Estoque — estado e origem -----
addCol('estado', "TEXT DEFAULT 'avaliacao'");
addCol('origem', "TEXT DEFAULT 'compra_direta'");
addCol('troca_venda_id', 'INTEGER');
addCol('consignacao_id', 'INTEGER');
db.exec('CREATE INDEX IF NOT EXISTS idx_motos_estado ON motos(estado)');

// Migracao de dados existentes para o novo campo estado:
// vendida=1 → entregue; ativo=1 → anunciada; ativo=0 → disponivel
db.exec(`
  UPDATE motos SET estado='entregue'   WHERE vendida=1  AND (estado='avaliacao' OR estado IS NULL OR estado='');
  UPDATE motos SET estado='anunciada'  WHERE ativo=1 AND vendida=0 AND (estado='avaliacao' OR estado IS NULL OR estado='');
  UPDATE motos SET estado='disponivel' WHERE ativo=0 AND vendida=0 AND (estado='avaliacao' OR estado IS NULL OR estado='');
`);
// Migracao tipo_entrada → origem
db.exec(`
  UPDATE motos SET origem='consignada'    WHERE tipo_entrada='consignada' AND (origem='compra_direta' OR origem IS NULL OR origem='');
  UPDATE motos SET origem='compra_direta' WHERE (tipo_entrada IS NULL OR tipo_entrada='' OR tipo_entrada='compra') AND (origem='compra_direta' OR origem IS NULL OR origem='');
`);
```

**Step 2: Add helper constants**

Create new file `lib/moto-estados.ts`:

```typescript
export const MOTO_ESTADOS = [
  'avaliacao',
  'em_oficina',
  'disponivel',
  'anunciada',
  'reservada',
  'vendida',
  'em_revisao',
  'entregue',
  'retirada',
] as const;

export type MotoEstado = (typeof MOTO_ESTADOS)[number];

export const MOTO_ESTADO_LABELS: Record<MotoEstado, string> = {
  avaliacao: 'Avaliacao',
  em_oficina: 'Em oficina',
  disponivel: 'Disponivel',
  anunciada: 'Anunciada',
  reservada: 'Reservada',
  vendida: 'Vendida',
  em_revisao: 'Em revisao',
  entregue: 'Entregue',
  retirada: 'Retirada',
};

export const MOTO_ORIGENS = ['compra_direta', 'consignada', 'troca'] as const;
export type MotoOrigem = (typeof MOTO_ORIGENS)[number];

export const MOTO_ORIGEM_LABELS: Record<MotoOrigem, string> = {
  compra_direta: 'Compra direta',
  consignada: 'Consignada',
  troca: 'Troca',
};

/** States visible on the public site */
export const ESTADOS_PUBLICOS: MotoEstado[] = ['anunciada', 'reservada'];

/** States that are terminal (no more transitions) */
export const ESTADOS_TERMINAIS: MotoEstado[] = ['entregue', 'retirada'];

/** Which actions are available per state */
export const ESTADO_ACOES: Record<MotoEstado, string[]> = {
  avaliacao:   ['oficina', 'anunciar', 'disponivel'],
  em_oficina:  [],  // auto-transitions when OS finishes
  disponivel:  ['oficina', 'anunciar'],
  anunciada:   ['reservar', 'vender', 'pausar', 'retirar'],
  reservada:   ['vender', 'cancelar_reserva'],
  vendida:     ['entregar'],
  em_revisao:  [],  // auto-transitions when OS finishes
  entregue:    [],
  retirada:    [],
};
```

**Step 3: Run typecheck**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add lib/db.ts lib/moto-estados.ts
git commit -m "feat(estoque): add estado/origem columns to motos + state constants"
```

---

## Task 2: Update public site queries to use `estado`

**Files:**
- Modify: `app/api/motos/route.ts` (line 19, change WHERE clause)
- Modify: `app/page.tsx` (lines 33-38, change WHERE clause)
- Modify: `lib/db.ts` (lines 331-354, update stripAdminFields)

**Step 1: Update public API**

In `app/api/motos/route.ts`, change the WHERE clause (line 19) from:
```
WHERE ativo=1
```
to:
```
WHERE estado IN ('anunciada','reservada')
```

**Step 2: Update home page**

In `app/page.tsx`, change:
- Line 33: `WHERE ativo=1 AND destaque=1` → `WHERE estado IN ('anunciada','reservada') AND destaque=1`
- Line 38: `WHERE ativo=1` → `WHERE estado IN ('anunciada','reservada')`

**Step 3: Add `estado` and `origem` to MOTOS_ADMIN_ONLY_COLS**

In `lib/db.ts` (line 331), add to the admin-only array: `'estado'`, `'origem'`, `'troca_venda_id'`, `'consignacao_id'`. These should NOT be exposed to the public API.

**Step 4: Run typecheck**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add app/api/motos/route.ts app/page.tsx lib/db.ts
git commit -m "feat(estoque): public site uses estado instead of ativo flag"
```

---

## Task 3: Rename nav "Anuncios" → "Estoque" + add filter by estado

**Files:**
- Modify: `app/admin/layout.tsx` (lines 12, 107-114 — title + nav link)
- Modify: `app/admin/motos/page.tsx` (lines 51-57 + filter UI)

**Step 1: Update admin layout**

In `app/admin/layout.tsx`:
- Line 12 (PAGE_TITLES): change `/admin/motos` entry from `'Anuncios'` to `'Estoque'`, subtitle to `'Controle completo do estoque de motos'`
- Line 109 (NAV_LINKS): change label from `'Anuncios'` to `'Estoque'`
- Keep icon as `'motos'` (reuse same SVG)

**Step 2: Replace ativo filter with estado filter**

In `app/admin/motos/page.tsx`:
- Replace state `fAtivo` with `fEstado` (string, default `''` = all)
- In the useMemo filter (line ~104-116), replace the `ativo` check with:
  ```typescript
  if (fEstado) filtered = filtered.filter((m) => m.estado === fEstado);
  ```
- In the filter UI (line ~190), replace the Anunciada/Pausada dropdown with:
  ```tsx
  <select value={fEstado} onChange={(e) => { setFEstado(e.target.value); setCurrentPage(1); }}>
    <option value="">Todos os estados</option>
    <option value="avaliacao">Avaliacao</option>
    <option value="em_oficina">Em oficina</option>
    <option value="disponivel">Disponivel</option>
    <option value="anunciada">Anunciada</option>
    <option value="reservada">Reservada</option>
    <option value="vendida">Vendida</option>
    <option value="entregue">Entregue</option>
  </select>
  ```

**Step 3: Add estado badge to moto cards**

In each moto card in the list, show a colored badge with the estado label.
Use the same badge pattern as oficina (small `<span>` with background color per state).

**Step 4: Run typecheck**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add app/admin/layout.tsx app/admin/motos/page.tsx
git commit -m "feat(estoque): rename Anuncios→Estoque + filter by estado"
```

---

## Task 4: Contextual action buttons per estado

**Files:**
- Modify: `app/admin/motos/page.tsx` (moto card actions area)
- Modify: `app/api/motos/[id]/route.ts` (add PATCH for estado transitions)

**Step 1: Add PATCH endpoint for estado transitions**

In `app/api/motos/[id]/route.ts`, add a PATCH handler:

```typescript
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
  }
  const { id } = await params;
  const db = getDb();
  const moto = db.prepare('SELECT id, estado, origem FROM motos WHERE id=?').get(Number(id)) as { id: number; estado: string; origem: string } | undefined;
  if (!moto) return NextResponse.json({ error: 'Moto nao encontrada' }, { status: 404 });

  const body = await request.json();
  const novoEstado = body.estado as string;

  // Validate transition
  const allowed = ESTADO_ACOES[moto.estado as MotoEstado] || [];
  // Map action names to target states
  const actionToState: Record<string, string> = {
    oficina: 'em_oficina',
    anunciar: 'anunciada',
    disponivel: 'disponivel',
    pausar: 'disponivel',
    reservar: 'reservada',
    vender: 'vendida',
    entregar: 'entregue',
    cancelar_reserva: 'anunciada',
    retirar: 'retirada',
  };

  if (novoEstado && !ESTADOS_TERMINAIS.includes(moto.estado as MotoEstado)) {
    db.prepare('UPDATE motos SET estado=? WHERE id=?').run(novoEstado, moto.id);
    // Keep ativo in sync for backward compat
    const isPublic = ESTADOS_PUBLICOS.includes(novoEstado as MotoEstado) ? 1 : 0;
    db.prepare('UPDATE motos SET ativo=? WHERE id=?').run(isPublic, moto.id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Transicao invalida' }, { status: 400 });
}
```

**Step 2: Show contextual buttons in moto list**

In `app/admin/motos/page.tsx`, in each moto card, replace the static Edit/Sell/Delete buttons with buttons based on the moto's estado using `ESTADO_ACOES`:

- `avaliacao`: "Manda pra oficina" (primary) + kebab (Anunciar direto, Editar)
- `em_oficina`: badge "Em oficina — OS #N" (no actions, auto-transitions)
- `disponivel`: "Anunciar" (primary) + kebab (Manda pra oficina, Editar)
- `anunciada`: "Reservar" / "Vender" + kebab (Pausar, Editar)
- `reservada`: "Fechar venda" + kebab (Cancelar reserva, Editar)
- `vendida`: "Entregar" + kebab (Editar)
- `entregue`: badge only (no actions)

Each button calls PATCH `/api/motos/[id]` with the target estado.

**Step 3: Run typecheck + manual test**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add app/admin/motos/page.tsx app/api/motos/[id]/route.ts
git commit -m "feat(estoque): contextual action buttons per moto estado"
```

---

## Task 5: "Chegou moto" wizard modal

**Files:**
- Create: `app/admin/motos/EntradaModal.tsx`
- Create: `app/admin/motos/entrada.module.css`
- Modify: `app/admin/motos/page.tsx` (add button to open wizard + HeaderActions)

**Step 1: Create the wizard modal**

`EntradaModal.tsx` is a 2-step wizard:

Step 1 (Origem): 3 large buttons — "Comprei" | "Consignada" | "Troca"
Step 2 (Dados): form fields that vary by origem:
- **Comprei:** marca, modelo, ano, placa, km, fotos, valor_compra, de quem comprou
- **Consignada:** marca, modelo, ano, placa, km, fotos, dono_nome, dono_tel, margem (pre-filled 12%)
- **Troca:** same as Comprei but with field `troca_venda_id` (which sale generated this trade-in — dropdown or manual entry)

On submit:
- POST to `/api/motos` (existing endpoint) with the extended fields
- If consignada: also POST to `/api/consignacoes` (future, for now just save origem='consignada' on moto)
- Moto created with `estado='avaliacao'` and correct `origem`

**Step 2: Wire into page**

In `app/admin/motos/page.tsx`, inject "Chegou moto" button via HeaderActionsContext (same pattern as mecanicos page).

**Step 3: Run typecheck**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add app/admin/motos/EntradaModal.tsx app/admin/motos/entrada.module.css app/admin/motos/page.tsx
git commit -m "feat(estoque): wizard 'Chegou moto' with 3 origens"
```

---

## Task 6: "Manda pra oficina" — create OS linked to moto

**Files:**
- Modify: `app/admin/motos/page.tsx` (handler for oficina button)
- Create: `app/api/motos/[id]/oficina/route.ts` (POST creates OS)

**Step 1: Create API route**

`app/api/motos/[id]/oficina/route.ts`:

```typescript
// POST /api/motos/[id]/oficina — creates OS linked to this moto
export async function POST(request: NextRequest, { params }: Props) {
  const { id } = await params;
  const db = getDb();
  const moto = db.prepare('SELECT * FROM motos WHERE id=?').get(Number(id));
  if (!moto) return NextResponse.json({ error: 'Moto nao encontrada' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const descricao = body.descricao || 'Revisao/preparacao para venda';

  const result = db.prepare(`
    INSERT INTO oficina_ordens (cliente_nome, moto_id, moto_marca, moto_modelo, moto_ano, moto_placa, moto_km, servico_descricao, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'aberta')
  `).run(
    moto.nome_cliente || 'Estoque',
    moto.id,
    moto.marca,
    moto.modelo || moto.nome,
    moto.ano,
    moto.placa || '',
    moto.km,
    descricao,
  );

  // Transition moto state
  db.prepare("UPDATE motos SET estado='em_oficina', ativo=0 WHERE id=?").run(moto.id);

  return NextResponse.json({ ok: true, ordem_id: result.lastInsertRowid });
}
```

**Step 2: Wire button in page**

The "Manda pra oficina" button calls `POST /api/motos/[id]/oficina`, then reloads the list.

**Step 3: Run typecheck**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add app/api/motos/[id]/oficina/route.ts app/admin/motos/page.tsx
git commit -m "feat(estoque): 'Manda pra oficina' creates linked OS"
```

---

## Task 7: Auto-transition — OS finalizada → moto.estado = 'disponivel'

**Files:**
- Modify: `app/api/oficina/[id]/route.ts` (the PUT handler that updates OS status)
- Modify: `app/admin/oficina/FecharModal.tsx` or the status update flow

**Step 1: Add auto-transition logic**

In the oficina status update flow, when an OS transitions to `finalizada`:
1. Check if the OS has a `moto_id`
2. If yes, check the moto's current `estado`
3. If `em_oficina` → set to `disponivel`
4. If `em_revisao` (consignada post-sale) → set to `entregue`

This goes in the PUT handler for `/api/oficina/[id]/route.ts`, after the status update succeeds:

```typescript
// Auto-transition linked moto when OS is finalized
if (newStatus === 'finalizada' && ordem.moto_id) {
  const moto = db.prepare('SELECT id, estado FROM motos WHERE id=?').get(ordem.moto_id);
  if (moto) {
    if (moto.estado === 'em_oficina') {
      db.prepare("UPDATE motos SET estado='disponivel' WHERE id=?").run(moto.id);
    } else if (moto.estado === 'em_revisao') {
      db.prepare("UPDATE motos SET estado='entregue' WHERE id=?").run(moto.id);
    }
  }
}
```

**Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add app/api/oficina/[id]/route.ts
git commit -m "feat(estoque): auto-transition moto when linked OS finalizes"
```

---

## Task 8: Update MotoModal for estado-aware editing

**Files:**
- Modify: `app/admin/motos/MotoModal.tsx` (show estado/origem fields, adjust form)

**Step 1: Show estado and origem in the modal**

Add read-only display of current `estado` (badge) and `origem` at the top of the modal when editing.

Do NOT allow manual editing of estado — it changes only via action buttons.

Add `origem` to the form for new motos (but this is handled by EntradaModal wizard for new entries — MotoModal is for editing existing).

**Step 2: Keep ativo toggle working**

The existing `ativo` checkbox in MotoModal should map to estado:
- Toggling ativo ON → estado = 'anunciada'
- Toggling ativo OFF → estado = 'disponivel'

This maintains backward compat while the new flow takes over.

**Step 3: Run typecheck**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add app/admin/motos/MotoModal.tsx
git commit -m "feat(estoque): show estado/origem in MotoModal edit view"
```

---

## Task 9: Final integration — verify public site + admin flow

**Step 1: Typecheck**

```bash
npx tsc --noEmit
```

**Step 2: Start dev server and verify:**

1. Public site: only shows motos with estado='anunciada' or 'reservada'
2. Admin Estoque: shows all motos with estado filter dropdown
3. "Chegou moto" wizard creates moto with estado='avaliacao'
4. "Manda pra oficina" creates OS and transitions to 'em_oficina'
5. Closing the OS transitions moto to 'disponivel'
6. "Anunciar" transitions to 'anunciada' (visible on public site)
7. Estado badge shows correctly on each card

**Step 3: Final commit + push**

```bash
git push
```
