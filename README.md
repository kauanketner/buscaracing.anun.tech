# Busca Racing — Contexto do Projeto

> **Este arquivo e mantido para que qualquer IA (ou humano novo) entenda o projeto em 5 minutos.**

---

## 1. O que e

Site + sistema de gestao completo da **Busca Racing**, loja de motos.

- Site publico: <https://buscaracing.com>
- Admin: <https://buscaracing.com/admin> (senha unica)

### Dominios funcionais

| Area | Descricao |
|------|-----------|
| **Estoque** | Ciclo de vida completo da moto: entrada (compra/consignada/troca) → oficina → anuncio → reserva → venda → entrega |
| **Vendas** | Registro de vendas com troca, reservas (R$500/7d), comissoes (R$200 interno / R$400 externo) |
| **Consignadas** | Motos de terceiros com margem 12%, repasse automatico, portal publico do consignante |
| **Oficina** | Ordens de servico, historico, garantias, link automatico com estoque |
| **Financeiro** | Fluxo de caixa automatico (lancamentos gerados por vendas/compras/comissoes/repasses) |
| **CRM** | Visao unificada de clientes (compradores + oficina + leads + reservas) |
| **Contratos** | Geracao de PDF: compra, consignacao, venda, OS, reserva, entrega |
| **Blog** | Posts com editor rich-text |
| **Config** | Logo, imagens, contatos, vendedores |

### Apps moveis (PWAs)

| App | URL | Auth | Funcao |
|-----|-----|------|--------|
| **Mecanico** | `/m/<slug>` | PIN 6 digitos | Ver e atualizar OSs atribuidas |
| **Vendedor** | `/v/<slug>` | PIN 6 digitos | Ver motos, registrar leads, ver comissoes |
| **Consignante** | `/c/<token>` | Token unico (sem login) | Acompanhar status da moto consignada |
| **Comprador** | `/compra/<token>` | Token unico (sem login) | Ver dados da compra, agendar revisao |

---

## 2. Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | **Next.js 14.2.29** (App Router, `output: 'standalone'`) |
| UI | React 18, **CSS Modules** (plain CSS para seletores globais) |
| Tipos | TypeScript **strict** (target ES5) |
| Banco | **SQLite** via `better-sqlite3` (WAL mode) |
| PDF | **pdfkit** (geracao server-side) |
| Editor | TipTap (blog) |
| Imagens | `sharp` (conversao WebP) |
| Auth | Cookie HTTP-only: `admin_session`, `mecanico_session`, `vendedor_session` |
| Deploy | Docker (multi-stage) → VM com `sitectl` + Caddy |
| CI/CD | **GitHub Actions** (push em `main` → deploy automatico) |

---

## 3. Estrutura de pastas

```
app/
  page.tsx                    Home publica
  layout.tsx                  Layout publico (SiteChrome: header/footer)
  moto/[id]/                  Pagina de anuncio
  blog/[slug]/ contato/ pecas/ acessorios/ produtos/
  catalogo.xml/ sitemap.ts/ robots.ts

  admin/                      Back-office (cookie gate)
    layout.tsx                Shell: sidebar + header + HeaderActionsContext
    page.tsx                  Dashboard (feed + KPIs + alertas)
    motos/                    ESTOQUE (ciclo de vida da moto)
      page.tsx                Lista com filtro por estado
      MotoModal.tsx           Editar moto
      EntradaModal.tsx        Wizard "Chegou moto" (3 origens)
      ReservaModal.tsx        Reservar moto (sinal R$500)
      VendaModal.tsx          Fechar venda (troca + comissao)
    oficina/                  OFICINA (OS)
      page.tsx                Lista de OSs
      [id]/page.tsx           Detalhe (status + kebab + timeline)
      OrdemModal.tsx          Criar/editar OS
      AtualizarStatusModal.tsx / FecharModal.tsx / GarantiaModal.tsx
    vendas/                   VENDAS (historico)
      page.tsx                Lista + cards resumo + links portal comprador
    consignacoes/             CONSIGNADAS
      page.tsx                Lista + repasses + link consignante
    financeiro/               FINANCEIRO
      page.tsx                Lancamentos + comissoes + repasses (3 abas)
    clientes/                 CRM
      page.tsx                Lista unificada com timeline expandivel
    mecanicos/                MECANICOS (CRUD + PIN + slug)
    blog/ config/ login/

  m/[slug]/                   PWA MECANICO
    login/ ordens/ os/[id]/
  v/[slug]/                   PWA VENDEDOR
    login/ motos/ leads/ perfil/ BottomNav.tsx
  c/[token]/                  PORTAL CONSIGNANTE
  compra/[token]/             PORTAL COMPRADOR

  api/
    auth/                     Login/logout admin
    motos/ motos/[id]/        CRUD motos + PATCH estado + oficina + reserva + venda
    oficina/ oficina/[id]/    CRUD OS (auto-transicao moto ao finalizar)
    vendas/                   GET lista + POST criar venda
    vendas/public/[token]/    Portal comprador (publico) + agendar revisao
    consignacoes/             CRUD consignacoes
    consignacoes/public/[token]/  Portal consignante (publico)
    financeiro/               Lancamentos + comissoes + repasses
    financeiro/comissao/[id]/ Marcar comissao paga
    financeiro/repasse/[id]/  Marcar repasse pago
    contratos/[tipo]/[id]/    Gerar PDF de contrato
    vendedor/                 APIs do PWA vendedor (login, me, motos, leads)
    mecanico/                 APIs do PWA mecanico (login, me, ordens, manifest)
    admin/mecanicos/          CRUD mecanicos + PIN + slug
    admin/vendedores/         PIN vendedores + slug
    config/ stats/ fotos/ upload/ marcas/ blog/

components/
  Header, Footer, SiteChrome  Layout publico
  Toast                       Sistema de notificacoes
  ContratoPdfButton            Botao reutilizavel para gerar PDF
  MotoCard, BlogCard, JsonLd   Cards e SEO

lib/
  db.ts                       Singleton SQLite + todas as migrations (idempotentes)
  auth.ts                     Auth admin (senha + cookie)
  mecanico-auth.ts            PIN scrypt + HMAC cookie + rate limit (mecanico)
  vendedor-auth.ts            PIN scrypt + HMAC cookie + rate limit (vendedor)
  moto-estados.ts             Estados da moto + labels + cores + constantes
  motos.ts                    Helpers CRUD moto
  oficina-status.ts           Taxonomia de status OS + validacao
  pdf-contrato.ts             Geracao de 6 tipos de contrato PDF (pdfkit)
  upload.ts                   Upload/conversao WebP

middleware.ts                 Protege /admin/*, /api/admin/*, /api/mecanico/*, /api/vendedor/*
```

---

## 4. Banco de dados

Arquivo: `buscaracing.db`. Schema criado/migrado em `lib/db.ts` (sempre idempotente).

### Tabelas

| Tabela | Funcao |
|--------|--------|
| `motos` | Estoque. Campos publicos + admin-only (`MOTOS_ADMIN_ONLY_COLS`). Colunas-chave: `estado` (avaliacao/em_oficina/disponivel/anunciada/reservada/vendida/em_revisao/entregue/retirada), `origem` (compra_direta/consignada/troca) |
| `fotos` | Galeria de cada moto (`moto_id`, `ordem`) |
| `vendas` | Registro de vendas: moto_id, comprador, vendedor, valor, forma_pgto, troca, comissao, `token` (portal comprador) |
| `reservas` | Sinais R$500 com prazo 7d: moto_id, cliente, valor_sinal, data_expira, status (ativa/convertida/expirada/cancelada) |
| `consignacoes` | Motos de terceiros: dono, margem 12%, custo_revisao, valor_repasse, `token` (portal consignante), status |
| `comissoes` | Comissao por venda: vendedor_id, valor (200/400), pago flag |
| `lancamentos` | Livro-caixa automatico: tipo (entrada/saida), categoria, valor, ref_tipo+ref_id |
| `leads` | Clientes interessados: nome, tel, moto_id, vendedor_id, origem, status |
| `oficina_ordens` | OS: cliente, moto (vinculada ou manual), servico, status, valores, datas |
| `oficina_historico` | Timeline de mudancas de status + notas |
| `vendedores` | Nome, tel, tipo (interno/externo), pin_hash, pin_ativo, pix_chave |
| `mecanicos` | Nome, tel, especialidade, pin_hash, pin_ativo |
| `posts` | Blog |
| `configuracoes` | Chave/valor (logo, contatos, slugs dos PWAs) |
| `mecanico_login_attempts` | Rate limit mecanico |
| `vendedor_login_attempts` | Rate limit vendedor |

### Ciclo de vida da moto (estado)

```
ENTRADA                           SAIDA
  compra_direta ─┐                 ┌─ entregue
  consignada   ──┼→ avaliacao      ├─ retirada (so consignada)
  troca        ──┘      │
                   [em_oficina] ← opcional
                        │
                   [disponivel]
                        │
                   [anunciada] → site publico
                        │
                   [reservada] ← R$500, 7 dias
                        │
                    [vendida]
                        │
              ┌─────────┴─────────┐
              │ consignada        │ compra/troca
              ▼                   ▼
         [em_revisao]        [entregue]
         (dono paga)
              │
         [entregue]
```

Auto-transicoes:
- OS finalizada + moto `em_oficina` → moto vira `disponivel`
- OS finalizada + moto `em_revisao` → moto vira `entregue` + calcula custo_revisao no repasse

---

## 5. Autenticacao

### Admin (`admin_session`)
- Senha unica via `ADMIN_PASSWORD` (default `Anuntech@10`)
- Cookie HTTP-only, 24h

### Mecanico (`mecanico_session`)
- PIN 6 digitos (scrypt hash)
- Cookie HMAC-SHA256, 30 dias
- Rate limit: 5 falhas/15min por IP
- URL: `/m/<slug>` (slug rotacionavel em `configuracoes.mecanico_url_slug`)
- Env: `MECANICO_SESSION_SECRET` (obrigatoria em prod)

### Vendedor (`vendedor_session`)
- Mesma arquitetura do mecanico
- URL: `/v/<slug>` (`configuracoes.vendedor_url_slug`)
- Env: `VENDEDOR_SESSION_SECRET` (obrigatoria em prod)

### Consignante e Comprador
- Token unico por registro (sem login)
- URLs: `/c/<token>` e `/compra/<token>`

---

## 6. Fluxo de dinheiro (automatico)

Toda acao gera lancamentos automaticamente:

| Evento | Tipo | Categoria |
|--------|------|-----------|
| Compra de moto | saida | compra_moto |
| Reserva (sinal) | entrada | sinal_reserva |
| Cancelamento reserva | saida | devolucao_sinal |
| Venda fechada | entrada | venda_moto |
| Comissao vendedor | saida | comissao |
| Repasse consignada | saida | repasse_consignada |
| Moto de troca (avaliacao) | saida | compra_moto |

---

## 7. Contratos PDF

6 tipos gerados server-side via `pdfkit` em `lib/pdf-contrato.ts`:

| Tipo | API | Conteudo |
|------|-----|----------|
| `compra` | `/api/contratos/compra/[motoId]` | Dados veiculo + vendedor + clausulas |
| `consignacao` | `/api/contratos/consignacao/[consigId]` | Dono + margem + responsabilidades |
| `venda` | `/api/contratos/venda/[vendaId]` | Comprador + preco + garantia 90d |
| `os` | `/api/contratos/os/[ordemId]` | Autorizacao de servico |
| `reserva` | `/api/contratos/reserva/[reservaId]` | Recibo de sinal + condicoes |
| `entrega` | `/api/contratos/entrega/[vendaId]` | Checklist + assinatura de recebimento |

Todos com: cabecalho Busca Racing, secoes, clausulas, campo de data + 2 assinaturas.

---

## 8. Oficina — regras de negocio

Status em `lib/oficina-status.ts`:
```
aberta → diagnostico → em_servico → [aguardando_peca | aguardando_aprovacao |
                                     aguardando_administrativo | agendar_entrega |
                                     lavagem] → finalizada | cancelada
```
- `finalizada` e `cancelada` sao terminais
- `finalizada` requer fluxo "Fechar OS" com `valor_final`
- Garantia: nova OS com `garantia_de_id` apontando pra original
- Todo cambio de status grava em `oficina_historico`

---

## 9. Nav do admin

```
Dashboard | Estoque | Oficina | Vendas | Consignadas | Financeiro | Clientes | Mecanicos | Blog | Config
```

---

## 10. Deploy

- **Dominio:** `buscaracing.com`
- **VM:** `178.156.255.162`, SSH root
- Orquestracao: `sitectl` + Caddy (TLS automatico)
- Volume persistente: `/data` (DB + fotos + uploads)
- CI/CD: push em `main` → GitHub Actions → SSH → deploy

### Rodar localmente

```bash
npm install
npm run dev    # http://localhost:3000
```

Envs opcionais em dev:
- `ADMIN_PASSWORD` (default `Anuntech@10`)
- `MECANICO_SESSION_SECRET`, `VENDEDOR_SESSION_SECRET` (defaults inseguros em dev)
- `DB_PATH`, `DATA_DIR`

---

## 11. Convencoes

- TypeScript strict, sem `any`
- `export const dynamic = 'force-dynamic'` em rotas com DB
- CSS Modules para escopo local; plain CSS para seletores globais
- Fontes: Bebas Neue, Barlow, Barlow Condensed
- Cores: `#27367D` (azul), `#DC2627` (vermelho hover), `#FDFDFB` (fundo)
- Migrations idempotentes: `IF NOT EXISTS` + `PRAGMA table_info`
- Toast via `useToast()` de `components/Toast.tsx`
- Header actions via `HeaderActionsContext`
- Middleware so checa presenca de cookie; validacao real no handler

---

## 12. Gotchas

- `oficina_ordens.mecanico` e texto legado; fonte de verdade e `mecanico_id FK → mecanicos.id`
- Middleware roda no Edge — nada de `getDb()` ou `scryptSync` la
- `better-sqlite3` e sincrono — OK porque SQLite e local
- `_backup/` e codigo antigo (Express), ignorado no tsconfig
- `buscaracing.anun.tech` e so nome do repo; dominio real e `buscaracing.com`
- O site publico filtra motos por `estado IN ('anunciada','reservada')`, NAO mais por `ativo=1`
- `motos.ativo` e mantido em sync pelo PATCH handler para backward compat
