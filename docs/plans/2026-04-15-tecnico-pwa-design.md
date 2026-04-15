# Módulo Técnico / PWA — Design

**Data:** 2026-04-15
**Status:** aprovado, em implementação

## Objetivo

Dar ao time de mecânicos da oficina um **aplicativo separado** (PWA instalável) onde cada técnico:

- Vê só as OSs **atribuídas a ele**.
- Pode **mudar status** e **adicionar observações** na timeline.
- Acessa via celular, instala como ícone na home screen.

Admin continua sendo dono de tudo: cadastra técnicos, atribui OSs, pode rotacionar o link de acesso.

## Decisões de brainstorm

| # | Pergunta | Decisão |
| - | --- | --- |
| 1 | Autenticação | **PIN por técnico** (6 dígitos, scrypt, rate-limited) |
| 2 | Escopo de visibilidade | **Só OSs atribuídas** ao técnico logado |
| 3 | O que pode fazer | **Mudar status + adicionar nota na timeline** |
| 4 | "Mecânico" vs "técnico" | **Mesma entidade** — reusar tabela `mecanicos` |
| 5 | Rota | **`/t/<hash>`** (slug de 12 chars base32, rotacionável) |
| 6 | PWA | **Básico** (instalável, sem offline/push) |

## Arquitetura

```
                   ┌──────────────────────────────┐
                   │   Admin (já existe)          │
                   │   /admin/*                   │
                   │   cookie: admin_session      │
                   │   + /admin/tecnicos (novo)   │
                   └──────────────┬───────────────┘
                                  │ writes
                                  ▼
                   ┌──────────────────────────────┐
                   │   SQLite (mesmo banco)       │
                   │   mecanicos + pin            │
                   │   oficina_ordens + tecnico_id│
                   │   oficina_historico (reuso)  │
                   │   configuracoes.tecnico_slug │
                   └──────────────┬───────────────┘
                                  │ reads
                                  ▼
                   ┌──────────────────────────────┐
                   │   PWA do Técnico (novo)      │
                   │   /t/<hash>/*                │
                   │   cookie: tecnico_session    │
                   └──────────────────────────────┘
```

## Data model

Todas as migrations via `lib/db.ts → initSchema()`, idempotentes.

**`mecanicos`** — adiciona:
```sql
ALTER TABLE mecanicos ADD COLUMN pin_hash       TEXT DEFAULT '';
ALTER TABLE mecanicos ADD COLUMN pin_ativo      INTEGER DEFAULT 0;
ALTER TABLE mecanicos ADD COLUMN pin_trocado_em TEXT;
```

**`oficina_ordens`** — adiciona:
```sql
ALTER TABLE oficina_ordens ADD COLUMN tecnico_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_oficina_tecnico_id ON oficina_ordens(tecnico_id);
```

**`tecnico_login_attempts`** — nova tabela:
```sql
CREATE TABLE IF NOT EXISTS tecnico_login_attempts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ip          TEXT NOT NULL,
  tecnico_id  INTEGER,
  success     INTEGER NOT NULL,
  created_at  TEXT DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time
  ON tecnico_login_attempts(ip, created_at);
```

**`configuracoes`** — seed nova chave:
- `tecnico_url_slug` = 12 chars base32 (gerado no bootstrap se não existir)

**Reuso de `oficina_historico`**: nota sem mudança de status vira linha com `status_anterior = status_novo = atual`, `mensagem = <nota>`, `autor = <nome do técnico>`.

## Auth do técnico

**PIN storage:** `scrypt(pin, saltPerRow, N=16384)` via `crypto.scrypt` nativo do Node. Formato: `scrypt:<salt_b64>:<hash_b64>`.

**Cookie `tecnico_session`:**
- Payload: `<tecnico_id>.<expMs>.<nonce>`
- Assinatura: HMAC-SHA256 com `TECNICO_SESSION_SECRET` (env)
- Formato final: `<payload_b64url>.<sig_b64url>`
- Duração: 30 dias
- Flags: `HttpOnly`, `SameSite=Lax`, `Secure` (prod)

**Rate limit:** 5 falhas em 15 min por IP → `429 Too Many Requests`. Limpeza de `tecnico_login_attempts` > 7 dias no bootstrap.

**Revogação:** admin desativa (`pin_ativo=0`) → toda rota `/api/tecnico/*` revalida contra o banco. Próxima requisição retorna 401 e o cliente redireciona pro login.

## Rotas

### Admin (novas)

```
/admin/tecnicos                    UI: lista + CRUD PIN + rotate slug
GET    /api/admin/tecnicos         lista mecânicos + flags
POST   /api/admin/tecnicos/:id/pin  { pin } → hash + ativa
DELETE /api/admin/tecnicos/:id/pin  desativa
POST   /api/admin/tecnicos/rotate-slug  novo slug
GET    /api/admin/tecnicos/slug    leitura do slug atual
```

### Técnico (novas)

```
/t/[slug]                          redir pra login ou dashboard
/t/[slug]/login                    UI: PIN input
/t/[slug]/                         Lista "minhas OSs"
/t/[slug]/os/[id]                  detalhe

POST   /api/tecnico/login          { pin } → cookie
POST   /api/tecnico/logout         clear cookie
GET    /api/tecnico/me             { id, nome } ou 401
GET    /api/tecnico/ordens         minhas OSs ativas
GET    /api/tecnico/ordens/[id]    OS + histórico (só minha)
PATCH  /api/tecnico/ordens/[id]/status  { status, mensagem? }
POST   /api/tecnico/ordens/[id]/nota    { mensagem }
GET    /api/tecnico/manifest.webmanifest  PWA manifest com start_url dinâmico
```

### Middleware

Adiciona ao matcher:
- `/t/:path*` — passa direto (a page checa slug vs DB e faz 404/redir)
- `/api/tecnico/:path*` — exceto `/login`, exige `tecnico_session` válido

Mantém:
- `/admin/:path*` + `/api/admin/:path*` — `admin_session`

## UX

### Admin — `/admin/tecnicos`

- **Topo:** card com link atual `https://buscaracing.com/t/<slug>` + botão "Rotacionar link" (pede confirmação)
- **Tabela:** nome, telefone, acesso (Ativo / Sem PIN / Desativado), ações:
  - **Definir PIN** — abre modal: digitar PIN de 6 dígitos OU "Gerar aleatório"
  - **Desativar** — zera `pin_ativo`
  - **Ver OSs** — filtra lista da oficina por `tecnico_id`

### Admin — `OrdemModal`

Campo "Mecânico" (texto livre) vira **`<select>`**:
- Opções: mecânicos ativos + "Nenhum" + "Outro (digitar)"
- Ao selecionar um da lista: salva `tecnico_id` + `mecanico = nome`
- Ao escolher "Outro": input aparece, salva só `mecanico` (sem FK)

### Técnico

**Login:** nome "Oficina" neutro + input numérico 6 dígitos + botão Entrar.

**Dashboard:**
- Header: "Olá, <nome>" + botão "Sair"
- Lista de cards por OS: `#id · cliente · moto · placa · badge status` → botão "Abrir"
- Vazio: "Nenhuma OS atribuída a você no momento."

**Detalhe:**
- Cliente (read-only), Moto (read-only), Serviço, Valor estimado, Datas
- Timeline (componente reusado de `/admin/oficina/[id]`)
- **Ação primária grande:** "Atualizar status" → modal com `<select>` (só status não-terminais) + textarea opcional
- **Ação secundária:** "Adicionar observação" → modal só textarea

Sem: excluir, editar cliente/moto, abrir garantia, fechar OS, mudar valor.

## PWA

- `public/tecnico/icon-192.png` e `icon-512.png` (a gerar, placeholder com logo inicial BR)
- `<link rel="manifest" href="/api/tecnico/manifest.webmanifest">` no layout de `/t/[slug]`
- Route `/api/tecnico/manifest.webmanifest`: lê slug atual e retorna:
  ```json
  {
    "name": "Oficina",
    "short_name": "Oficina",
    "start_url": "/t/<slug>/",
    "display": "standalone",
    "theme_color": "#27367D",
    "background_color": "#FDFDFB",
    "icons": [
      { "src": "/tecnico/icon-192.png", "sizes": "192x192", "type": "image/png" },
      { "src": "/tecnico/icon-512.png", "sizes": "512x512", "type": "image/png" }
    ]
  }
  ```
- **Rotação de slug = revoga o PWA instalado** (start_url não existe mais). Desejado.

## SEO / discovery

- `robots.txt` adiciona:
  ```
  Disallow: /t/
  Disallow: /api/tecnico/
  Disallow: /admin/
  ```
- `<meta name="robots" content="noindex, nofollow">` no layout de `/t/[slug]` e `/admin/tecnicos`.

## O que NÃO será implementado (YAGNI)

- Tabela `tecnico_sessions` (cookie é stateless HMAC).
- Tabela `tecnicos` separada (reusa `mecanicos`).
- Prioridade de OS.
- Offline / push / service worker sync.
- Biometria (Web Authn).
- Refresh tokens.

## Testes

Smoke checklist manual + script `scripts/test-tecnico-flow.ts`:
1. seed mecânico + PIN via SQL
2. `POST /api/tecnico/login` → cookie
3. admin atribui OS
4. técnico `GET /ordens` → aparece
5. técnico `PATCH .../status` → histórico registra com autor certo
6. revogar PIN → próximo `GET /ordens` → 401

## Riscos & mitigações

| Risco | Mitigação |
| --- | --- |
| Vazamento de cookie `tecnico_session` | HttpOnly, Secure, HMAC-assinado, curto o suficiente (30d) |
| Brute-force de PIN | scrypt + rate limit 5/15min |
| Admin esquece PIN de técnico | "Gerar aleatório" mostra PIN 1 vez na modal |
| Slug vaza | admin rotaciona em 1 clique, PWA instalado revoga junto |
| Service worker corrompendo sessão | não há — PWA aqui é só manifest + shortcut |

## Arquivos a criar/editar

**Criar:**
- `lib/tecnico-auth.ts`
- `app/t/[slug]/layout.tsx`
- `app/t/[slug]/page.tsx`
- `app/t/[slug]/login/page.tsx`
- `app/t/[slug]/os/[id]/page.tsx`
- `app/t/[slug]/*.module.css`
- `app/api/tecnico/login/route.ts`
- `app/api/tecnico/logout/route.ts`
- `app/api/tecnico/me/route.ts`
- `app/api/tecnico/ordens/route.ts`
- `app/api/tecnico/ordens/[id]/route.ts`
- `app/api/tecnico/ordens/[id]/status/route.ts`
- `app/api/tecnico/ordens/[id]/nota/route.ts`
- `app/api/tecnico/manifest.webmanifest/route.ts`
- `app/api/admin/tecnicos/route.ts`
- `app/api/admin/tecnicos/[id]/pin/route.ts`
- `app/api/admin/tecnicos/rotate-slug/route.ts`
- `app/api/admin/tecnicos/slug/route.ts`
- `app/admin/tecnicos/page.tsx`
- `app/admin/tecnicos/*.module.css`
- `public/tecnico/icon-192.png`, `icon-512.png`
- `public/robots.txt` (se não existir — ou atualizar)
- `scripts/test-tecnico-flow.ts`

**Editar:**
- `lib/db.ts` — migrations
- `middleware.ts` — matcher + lógica
- `app/admin/oficina/OrdemModal.tsx` — dropdown mecânico
- `app/admin/layout.tsx` — item de menu "Técnicos"
- `README.md` — nova seção
