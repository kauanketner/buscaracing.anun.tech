# Design: Aluguel de Motos

> Aprovado em brainstorming com o dono. Feature adiciona locação de motos
> sobre a infra existente de estoque e reservas/CRM.

## 1. Decisões de alto nível

| Tópico | Decisão |
|--------|---------|
| Fluxo da reserva | **Solicitação + aprovação manual** (B). Cliente envia pedido → admin aprova ou recusa. |
| Modelo de preço | **Diária única** (A). Valor = dias × `valor_diaria`. |
| Estoque | **Mesmo catálogo de motos** (B). Flag `disponivel_aluguel` + `valor_diaria` na tabela `motos`. |
| Dados do cliente | **Completos no form** (B). Nome, telefone, e-mail, CPF, CNH obrigatórios. |
| Caução | **Valor único padrão** (C). Chave em `configuracoes`, editável no admin. |

## 2. Banco de dados

### Tabela `motos` — 2 colunas novas (via `addCol` idempotente)
- `disponivel_aluguel INTEGER DEFAULT 0`
- `valor_diaria REAL` — NULL quando não aplicável

### Tabela nova `alugueis`
```sql
CREATE TABLE IF NOT EXISTS alugueis (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  moto_id         INTEGER NOT NULL REFERENCES motos(id),
  status          TEXT    NOT NULL DEFAULT 'pendente',
    -- pendente | aprovada | recusada | ativa | finalizada | cancelada
  data_inicio     TEXT    NOT NULL,         -- YYYY-MM-DD
  data_fim        TEXT    NOT NULL,         -- YYYY-MM-DD (inclusive)
  dias            INTEGER NOT NULL,
  valor_diaria    REAL    NOT NULL,         -- snapshot no momento da reserva
  valor_total     REAL    NOT NULL,
  valor_caucao    REAL    NOT NULL DEFAULT 0,
  cliente_nome    TEXT    NOT NULL,
  telefone        TEXT    NOT NULL,
  email           TEXT    DEFAULT '',
  cpf             TEXT    NOT NULL,
  cnh             TEXT    NOT NULL,
  observacoes     TEXT    DEFAULT '',        -- cliente escreve
  admin_notas     TEXT    DEFAULT '',        -- admin anota
  motivo_recusa   TEXT    DEFAULT '',
  valor_dano      REAL    DEFAULT 0,         -- preenchido se houver na devolução
  created_at      TEXT    DEFAULT (datetime('now','localtime')),
  aprovada_em     TEXT,
  retirada_em     TEXT,
  devolvida_em    TEXT
);
CREATE INDEX IF NOT EXISTS idx_alugueis_moto ON alugueis(moto_id);
CREATE INDEX IF NOT EXISTS idx_alugueis_status ON alugueis(status);
CREATE INDEX IF NOT EXISTS idx_alugueis_datas ON alugueis(data_inicio, data_fim);
```

### Configuração nova
- `aluguel_caucao_padrao` em `configuracoes` — valor inicial R$ 500, editável.

## 3. Fluxo público

### URLs
- `/aluguel` — grid de motos disponíveis
- `/aluguel/[id]` — detalhe da moto + formulário

### APIs públicas (sem auth)
- `GET /api/aluguel/motos` — retorna motos com `disponivel_aluguel=1`. Dados mínimos (sem admin-only).
- `GET /api/aluguel/motos/[id]` — detalhe + fotos.
- `GET /api/aluguel/disponibilidade/[motoId]` — array de datas bloqueadas (reservas com status `aprovada` ou `ativa`).
- `POST /api/aluguel/reservar` — cria reserva com status `pendente`.
  - Valida: datas futuras, moto existe e tem `disponivel_aluguel=1`, intervalo não conflita com `aprovada`/`ativa`, CPF/CNH formato válido.
  - Calcula `dias`, `valor_total = dias × valor_diaria`, snapshot de `valor_caucao` = configuracoes.aluguel_caucao_padrao.

### UX
- **Grid** (`/aluguel`): cards no mesmo padrão visual de `/pecas/[categoria]` — foto, nome, ano, **R$ X/dia**, CTA "Ver detalhes".
- **Detalhe** (`/aluguel/[id]`): banner + fotos + specs + formulário com:
  - 2 date inputs lado a lado, `min` = hoje
  - Resumo live: "N dias × R$ X = R$ Y"
  - Caução informada separadamente
  - Campos: nome, telefone, email, CPF (máscara), CNH
  - Botão "Solicitar reserva"
  - Após sucesso: tela "Recebemos seu pedido" + CTA WhatsApp

### Bloqueio de datas
- Não usar biblioteca externa de calendário — usar `<input type="date" min/max>` simples + validação ao submeter (API rejeita conflito).
- Opcional futuro: mostrar lista de "próximos dias disponíveis" acima do form.

## 4. Fluxo admin

### Nav
Novo item **"Aluguéis"** entre **Vendas** e **Consignadas**.

### Página `/admin/alugueis`

**Cards resumo:**
- Pendentes (amarelo — ação requerida)
- Aprovadas ativas agora
- Faturamento do mês (soma `valor_total` de `ativa` + `finalizada`)
- Total geral

**Filtros:** status · período · moto · busca por nome

**Tabela:** Moto · Cliente · Período · Valor · Status · Ações

**Máquina de estados:**
```
  pendente ─▶ aprovada ─▶ ativa ─▶ finalizada
       │         │         │
    recusada  cancelada  devolvida_com_dano
```

**Ações por status:**
- `pendente`: **Aprovar** (primary) · Recusar com motivo · WhatsApp · Ver detalhes
- `aprovada`: **Marcar retirada** (primary) · Cancelar · Imprimir contrato
- `ativa`: **Marcar devolução** (primary, abre modal com valor_dano opcional)
- `finalizada`/`recusada`/`cancelada`: só visualização + imprimir

**Modal de aprovação:**
- Ao clicar em "Aprovar", sistema:
  1. Checa conflitos com outras `pendentes` sobrepondo datas → lista elas
  2. Se admin confirmar, aprova a atual e **recusa as conflitantes** automaticamente com motivo "Conflito de datas"
  3. Registra `aprovada_em`

### Edição de moto para aluguel
Em `MotoModal.tsx` (admin de motos), adicionar seção "**Aluguel**":
- Toggle "Disponível para aluguel"
- Input "Valor da diária (R$)" — só habilita se toggle=on

### Configuração
Em `/admin/config` adicionar campo "**Valor da caução (aluguel)**" — input único, salva em `configuracoes.aluguel_caucao_padrao`.

## 5. Integrações

### Financeiro (lançamentos automáticos)
- **Aprovar:** não gera nada
- **Marcar retirada:** `INSERT INTO lancamentos (tipo, categoria, valor, descricao, ref_tipo, ref_id) VALUES ('entrada', 'aluguel_moto', valor_total, 'Aluguel #N — Cliente X', 'aluguel', N)`
- **Marcar devolução com dano:** lançamento adicional `('entrada', 'dano_aluguel', valor_dano, ..., 'aluguel', N)`
- **Cancelar aprovada após retirada:** não aplicável (só cancela antes de ativar)

### CRM
Query de `/api/clientes` ganha fonte extra `alugueis`:
```sql
SELECT cliente_nome AS nome, telefone, email, 'aluguel' AS tipo,
       id AS ref_id, valor_total AS valor, created_at AS data, ...
FROM alugueis
```
Badge nova: "N aluguéis" em cor própria.

### Dashboard
- Novo alerta: "X reservas pendentes aguardando aprovação" (se houver)
- Feed: eventos de "Nova reserva de aluguel" quando criadas

### Contratos PDF
- 7º tipo: `aluguel` em `lib/pdf-contrato.ts` + `/api/contratos/aluguel/[id]`
- Conteúdo: dados da moto, cliente (nome + CPF + CNH), período, diária × dias = total, caução, cláusulas padrão de locação (responsabilidade do locatário, devolução nas mesmas condições, cobertura de combustível, ressarcimento em caso de dano, foro).
- Botão "Imprimir contrato" disponível a partir do status `aprovada`.

## 6. Conflitos e edge cases

| Situação | Tratamento |
|---|---|
| Cliente tenta reservar datas ocupadas (`aprovada`/`ativa`) | API retorna 409 + mensagem. Date picker tenta prevenir. |
| 2 clientes pedem mesmas datas (ambos `pendente`) | Admin aprova um → sistema recusa conflitantes com motivo "Conflito de datas". |
| Admin cancela reserva `aprovada` | Status → `cancelada`. Datas liberam automaticamente. |
| Cliente não retira (no-show) | Admin cancela manualmente após a data. Nenhuma penalidade automática. |
| Moto vendida com reservas futuras `aprovada` | API de venda **bloqueia** com `409` + lista reservas. Admin escolhe cancelar antes. |
| Moto vai pra oficina durante aluguel ativo | Admin cancela/finaliza o aluguel manualmente — fluxo é exceção rara. |

## 7. Arquivos afetados

### Novos
- `app/aluguel/page.tsx` — grid público
- `app/aluguel/aluguel.module.css`
- `app/aluguel/[id]/page.tsx` — detalhe + form
- `app/aluguel/[id]/aluguel-detalhe.module.css`
- `app/api/aluguel/motos/route.ts`
- `app/api/aluguel/motos/[id]/route.ts`
- `app/api/aluguel/disponibilidade/[motoId]/route.ts`
- `app/api/aluguel/reservar/route.ts`
- `app/admin/alugueis/page.tsx`
- `app/admin/alugueis/page.module.css`
- `app/admin/alugueis/AluguelDetalheModal.tsx` (aprovação/devolução/cancel)
- `app/api/admin/alugueis/route.ts` (GET list)
- `app/api/admin/alugueis/[id]/route.ts` (PATCH status)

### Modificados
- `lib/db.ts` — migrations + seed caução
- `app/admin/motos/MotoModal.tsx` — seção Aluguel
- `app/admin/config/page.tsx` — campo caução padrão
- `app/admin/layout.tsx` — nav "Aluguéis"
- `app/api/clientes/route.ts` — adicionar alugueis como fonte CRM
- `app/api/stats/route.ts` — alerta de pendentes + feed
- `app/api/vendas/route.ts` — validar se moto tem aluguéis futuros antes de vender
- `lib/pdf-contrato.ts` — função `gerarContratoAluguel`
- `app/api/contratos/[tipo]/[id]/route.ts` — tipo `aluguel`
- `components/SiteChrome.tsx` + `public/robots.txt` — não bloquear `/aluguel` (é público/SEO)
- `app/sitemap.ts` — incluir `/aluguel`

## 8. Fora de escopo (para versões futuras)

- Pagamento online (PIX integrado)
- Notificação automática por e-mail/WhatsApp
- App do cliente pra acompanhar reserva
- Múltiplos preços por temporada
- Regras de desconto
- Sistema de reviews
