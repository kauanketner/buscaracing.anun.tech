# Busca Racing — Contexto do Projeto

> **Este arquivo é mantido para que qualquer IA (ou humano novo) entenda o projeto em 5 minutos.**
> Sempre que o projeto mudar de forma estrutural (novo módulo, nova tabela, mudança de deploy, etc.), atualize este README no mesmo commit.

---

## 1. O que é

Site e back-office da **Busca Racing**, loja de motos.

- Site público: <https://buscaracing.com>
- Admin: <https://buscaracing.com/admin> (senha única)

Domínios funcionais:
- **Catálogo de motos** (anúncios públicos + controle interno de estoque)
- **Blog** (posts com editor rich-text)
- **Oficina** (ordens de serviço, histórico, garantias)
- **Configuração do site** (logo, hero, banners, contato)
- **[em projeto]** `/admin/tecnico` — PWA para técnicos da oficina executarem/atualizarem OS atribuídas a eles

---

## 2. Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | **Next.js 14.2.29** (App Router, `output: 'standalone'`) |
| UI | React 18, **CSS Modules** (plain CSS quando precisa de seletor global) |
| Tipos | TypeScript **strict** (`tsconfig.json` target ES5, módulos ESM) |
| Banco | **SQLite** via `better-sqlite3` (WAL mode) |
| Editor | TipTap (blog) |
| Imagens | `sharp` (conversão WebP) |
| Auth | Senha única do admin via cookie HTTP-only (`admin_session`) |
| Deploy | Docker (multi-stage) → VM com `sitectl` + Caddy |
| CI/CD | **GitHub Actions** (push em `main` → SSH forced-command → `sitectl deploy`) |

---

## 3. Estrutura de pastas

```
app/                      App Router do Next.js
  page.tsx                  Home pública
  layout.tsx                Layout público
  globals.css               Estilos globais + reset
  moto/[id]/                Página de anúncio (pública)
  pecas/ acessorios/ produtos/
  blog/[slug]/
  contato/  venda-sua-moto/
  catalogo.xml/ sitemap.ts/ robots.ts
  admin/                    Back-office (client-side gate via cookie)
    layout.tsx              Shell com sidebar + header + HeaderActionsContext
    page.tsx                Dashboard
    motos/                  CRUD de anúncios + estoque
    oficina/                OS, status, histórico, garantia
      page.tsx              Lista
      [id]/page.tsx         Detalhe da OS (ação primária + kebab ⋯)
      OrdemModal.tsx        Criar/editar OS (modal)
      AtualizarStatusModal.tsx
      FecharModal.tsx       Fluxo de finalização com valor_final
      GarantiaModal.tsx     Cria OS-garantia a partir de uma finalizada
    blog/ config/ login/
  api/                      Route handlers
    auth/route.ts             POST login/logout + GET isAdmin
    motos/  motos/[id]/  motos/selector/
    oficina/  oficina/[id]/
    config/  config/mecanicos/ vendedores/ logo/ image/ images/
    admin/motos/              (rotas sensíveis protegidas pelo matcher)
    fotos/  upload/  marcas/  stats/  blog/

components/               Compartilhados (public + admin)
  Header, Footer, SiteChrome, MotoCard, BlogCard,
  BlogEditor, Toast, JsonLd

lib/
  db.ts                   Singleton SQLite + migrations idempotentes
  auth.ts                 verifyPassword / createSession / isAuthenticated
  motos.ts                Helpers de CRUD de moto
  oficina-status.ts       Taxonomia de status + validação de transições
  upload.ts               Upload/conversão WebP via sharp

middleware.ts             Protege /admin/* e /api/admin/* via cookie
public/                   Estáticos (favicon, ícones, logos default)
docs/plans/               Design docs e planos (este projeto usa brainstorming → plano)
.github/workflows/        deploy.yml (CI/CD)
```

Aliases: `@/*` → raiz (ex.: `@/lib/db`).

---

## 4. Banco de dados

Arquivo: `buscaracing.db` (em dev na raiz; em prod em `/data/buscaracing.db` dentro do container). Sempre **WAL** (há `.db-wal` e `.db-shm`).

Schema é criado/migrado em `lib/db.ts → initSchema()`, **sempre idempotente** (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE` guardado por `PRAGMA table_info`). Nunca escreva migrations destrutivas.

### Tabelas principais

**`motos`** — anúncios. Mistura campos públicos (preço, modelo, foto) com campos **admin-only** listados em `MOTOS_ADMIN_ONLY_COLS` (placa, chassi, renavam, valor_compra, dados de venda, etc.). Use `stripAdminFields()` antes de expor publicamente.

**`fotos`** — galeria de cada moto (`moto_id FK`, `ordem`).

**`posts`** — blog (slug único, `publicado` flag, HTML rich-text).

**`configuracoes`** — chave/valor (logo, hero, contatos, imagens de categoria).

**`vendedores`** e **`mecanicos`** — cadastros simples (nome, telefone, email, `ativo`). Hoje `mecanicos` é só **referência**: o campo `oficina_ordens.mecanico` é texto livre (não FK).

**`oficina_ordens`** — ordens de serviço.
- Cliente: `cliente_nome / telefone / email`.
- Moto: pode vincular do estoque (`moto_id FK → motos`) **ou** preencher manual (`moto_marca / moto_modelo / moto_ano / moto_placa / moto_km`).
- Serviço: `servico_descricao`, `observacoes`, `mecanico` (texto), `valor_estimado`, `valor_final`.
- Status: string validada por `lib/oficina-status.ts` (ver §6).
- Datas: `data_entrada`, `data_prevista`, `data_conclusao`.
- **Garantia:** `garantia_de_id` aponta pra uma OS finalizada anterior — quando o cliente retorna pelo mesmo problema, abre-se uma **nova OS** linkada.

**`oficina_historico`** — uma linha por mudança de status (`status_anterior`, `status_novo`, `mensagem`, `autor`, `created_at`). Timeline no detalhe da OS renderiza daqui.

---

## 5. Autenticação

**Modelo atual:** senha única compartilhada do admin.

- `ADMIN_PASSWORD` (env) — se não definida, cai pro default (`Anuntech@10`). Em produção está setada.
- Login em `POST /api/auth { action: 'login', password }` → cria cookie `admin_session` (HTTP-only, 24h, `sameSite=lax`).
- Logout em `POST /api/auth { action: 'logout' }`.
- Middleware (`middleware.ts`) protege `/admin/:path*` e `/api/admin/:path*`. As APIs de domínio (`/api/oficina`, `/api/motos`) fazem o check **dentro do handler** via `isAuthenticated()`.

**Planejado:** expansão para login por **PIN por técnico** no módulo `/admin/tecnico` (decisão registrada; design em andamento em `docs/plans/`).

---

## 6. Oficina — regras de negócio

Taxonomia em `lib/oficina-status.ts`:

```
aberta → diagnostico → em_servico → [aguardando_peca | aguardando_aprovacao |
                                     aguardando_administrativo | agendar_entrega |
                                     lavagem] → (fechamento) → finalizada
                                                             → cancelada
```

- Entre status não-terminais, **qualquer transição** é permitida (fluxo não-linear).
- `finalizada` e `cancelada` são **terminais**: não voltam.
- `finalizada` só é atingida pelo fluxo **"Fechar OS"** (exige `valor_final`). Não aparece no select genérico do modal de status.
- Para retomar atendimento de uma OS finalizada, abre-se uma **garantia**: cria uma OS nova com `garantia_de_id` apontando pra original.
- Todo `POST/PUT` que muda status insere uma linha em `oficina_historico`.

**UX do detalhe da OS** (`app/admin/oficina/[id]/page.tsx`):
- Ação primária contextual no topo: **Atualizar status** (ativa) ou **Abrir garantia** (finalizada).
- Menu **⋯** com: Fechar OS, Imprimir, Editar e — separado por divisor — Excluir.
- Cartões com Cliente, Moto, Serviço, Datas, Valores e a **Timeline** histórica (inclui a timeline da OS original quando é garantia, e lista de garantias filhas).

---

## 7. Estilos — convenção importante

**Regra:** usar CSS Modules (`.module.css`) para escopo local. Se precisar de seletor global (ex.: `body`, `@media print { * { … } }`, regras de classe injetada em `window.print()`), usar **plain CSS** (arquivo `.css` sem `.module`) importado diretamente — CSS Modules **reclamam** de seletores globais em build.

Exemplo vivo: `app/admin/oficina/[id]/print.css` (plain) + `detail.module.css` (módulo).

Fontes em uso: **Bebas Neue**, **Barlow**, **Barlow Condensed** (declaradas em `globals.css`).

Cor de marca: `#27367D` (azul) / `#DC2627` (vermelho hover).

---

## 8. Deploy

### Produção

- **Domínio:** `buscaracing.com` (NÃO `buscaracing.anun.tech` — esse é só o nome do repo GitHub).
- **VM:** `178.156.255.162`, acesso root via SSH.
- Orquestração: `/srv/platform/bin/sitectl` controla o container `site_buscaracing_com` e serve via **Caddy** (TLS automático).
- Código em `/srv/sites/buscaracing.com`.
- Volume persistente: `/data` (mantém `buscaracing.db`, `fotos/`, `uploads/`).

### CI/CD (`.github/workflows/deploy.yml`)

Push em `main` **OU** "Run workflow" manual dispara:

1. Monta chave SSH **dedicada** (secret `DEPLOY_SSH_KEY`) + `known_hosts` (`DEPLOY_KNOWN_HOSTS`).
2. SSH pro host (`DEPLOY_HOST` + `DEPLOY_USER`).
3. A `authorized_keys` da VM está **pinada com `command="/srv/platform/bin/sitectl deploy --domain buscaracing.com"`** — o comando remoto do SSH é ignorado e só o deploy roda. Isso restringe a chave a apenas deployar.
4. Após o deploy, job faz `curl https://buscaracing.com/` por até 5 tentativas até receber HTTP 200.

### Deploy local/manual

```bash
ssh root@178.156.255.162 /srv/platform/bin/sitectl deploy --domain buscaracing.com
```

---

## 9. Como rodar localmente

```bash
npm install          # instala (requer Python + build-essentials pra better-sqlite3)
npm run dev          # Next.js em http://localhost:3000
```

Variáveis (todas opcionais em dev):
- `ADMIN_PASSWORD` — default `Anuntech@10`.
- `DB_PATH` — default `./buscaracing.db`.
- `DATA_DIR` — base pra uploads/fotos quando diferente da raiz.

Banco é criado/migrado no primeiro acesso.

Typecheck: `./node_modules/.bin/tsc --noEmit`.

---

## 10. Convenções de código

- **TypeScript strict.** Evitar `any`. Em routes `unknown` + `instanceof Error` pro tratamento de erro.
- `export const dynamic = 'force-dynamic'` em rotas que mexem no DB (evita cache do App Router).
- Client components marcam `'use client'` no topo.
- Rotas sensíveis checam auth **dentro do handler** (`if (!isAuthenticated(request)) return 401`).
- Idempotência em migrations: `IF NOT EXISTS` + introspecção via `PRAGMA`.
- Toast de erro/sucesso via `components/Toast.tsx` + `useToast()`.
- Ações do header (sidebar/topbar admin) injetadas via **`HeaderActionsContext`** (cada página registra seus botões ao montar, limpa ao desmontar).

---

## 11. Workflow de design

Projetos novos/features passam por:

1. **Brainstorming** (`superpowers:brainstorming`) — entender ideia, propor alternativas, validar design.
2. **Design doc** em `docs/plans/YYYY-MM-DD-<topico>-design.md` (commitado).
3. **Plan doc** (`superpowers:writing-plans`) — plano passo-a-passo.
4. Implementação com TDD quando aplicável.

Não pular o design, mesmo em features "simples".

---

## 12. Gotchas / coisas que já morderam

- **`shell cwd` reseta entre chamadas do Bash tool** neste ambiente — sempre usar `cd <absoluto> && <cmd>` em uma só linha.
- **CSS Modules não aceitam seletores globais.** Se precisar, mover para plain CSS.
- O domínio `buscaracing.anun.tech` **não existe em DNS**; é só o nome do repositório.
- `oficina_ordens.mecanico` é **texto livre**, não FK — qualquer feature que referencie um técnico específico precisa decidir: virar FK? ou manter como texto e adicionar uma coluna nova (ex.: `tecnico_id`)?
- `better-sqlite3` é **síncrono** — OK porque o SQLite é local e rápido, mas não bloquear em operações longas.
- `_backup/` é o código antigo (Express); **ignorado** no `tsconfig`. Nunca referenciar.

---

## 13. Como atualizar este README

Trate como código. Sempre que:

- Adicionar módulo (`app/admin/xxx`)
- Criar tabela nova
- Trocar modelo de auth
- Mudar infra de deploy
- Introduzir nova convenção

…atualize as seções relevantes **no mesmo commit** da mudança. A seção 1 ("em projeto") lista o que está em design e deve migrar pras seções 4–6 quando entregue.
