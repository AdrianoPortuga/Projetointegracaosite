# Chat Atendimento Template - Operacional por Cliente

Base plug-and-play para onboarding real de clientes com:

- site + SDR
- formulario opcional
- roteamento preparado para ClickUp e Telegram
- base historica por cliente
- proxy local para backend central

Playbook operacional de implantação por cliente:

- `docs/vercel-client-playbook.md`

## Estrutura

```text
components/
  sdr/
  forms/
  landing/
config/
  schema/
  segments/
  clients/
knowledge/
  clients/<client_slug>/
    business_profile.json
    faq.json
    offers.json
    qualification_rules.json
    handoff_rules.json
    change_log.md
utils/
  tracking/
  lead/
  branding/
scripts/
api/
```

## Proxy local (mesmo dominio do cliente)

O browser nao chama mais diretamente a API externa.

Rotas locais:

- `POST /api/sdr/chat`
- `POST /api/lead/codesagency`

Essas rotas fazem proxy para o backend central configurado em env.

Arquivos:

- `api/_lib/proxy.js`
- `api/sdr/chat.js`
- `api/lead/codesagency.js`

## Isolamento por cliente e canal

- Namespace padrao: `<client_slug>::<segment>::<operational_mode>::<canal>`
- Canais usados:
  - `site_sdr`
  - `form`
  - `whatsapp` (futuro)
- O widget SDR usa `localStorage` namespaced para nao misturar historico entre clientes.

## Resolucao de cliente ativo

Prioridade:

1. `SITE_CLIENT_SLUG` via `/api/sdr-config`
2. `meta[name="site-client-slug"]`
3. `?client=` (fallback tecnico)
4. fallback final `advocacia-demo`

## Modo operacional

- `operational_mode` em `config/clients/<slug>.json`: `demo` ou `production`
- Pode ser sobrescrito por env `OPERATIONAL_MODE`
- Compatibilidade: `DEMO_MODE=true` ainda funciona e vira `operational_mode=demo`

Efeito em `demo`:

- origem de SDR/form com prefixo `DEMO_`
- payload inclui `demo_mode=true`
- formulario nao envia para endpoint real por padrao (`demo_allow_live_submit=false`)

## Roteamento por cliente/modulo

Cada payload de SDR/form inclui:

- `client_slug`
- `segment`
- `canal`
- `operational_mode`
- `site_origin`
- `page_path`
- `referrer`
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
- `clickup_enabled`, `clickup_list_id`
- `telegram_enabled`, `telegram_chat_id`
- `route_module`

## Rotas usadas no frontend

- SDR -> `lead_routing.sdr_endpoint_path` (padrao: `/api/sdr/chat`)
- Form -> `lead_routing.form_endpoint_path` (padrao: `/api/lead/codesagency`)

## Clientes de exemplo prontos

- `advocacia-demo`
- `AgenciaCarro-demo`
- `imobiliaria-demo`

Todos com:

- config completa (`config/clients`)
- knowledge base minima (`knowledge/clients/<slug>`)
- flags de canais
- roteamento preparado

## Novo cliente (onboarding rapido)

```bash
node scripts/create-client-config.mjs <client-slug> <segment> <demo|production>
```

Exemplo:

```bash
node scripts/create-client-config.mjs cliente-alpha advocacia production
```

Esse comando cria:

1. `config/clients/<client-slug>.json`
2. `knowledge/clients/<client-slug>/` com os 6 arquivos base

## Envs de runtime (Vercel)

- `BACKEND_BASE_URL=https://leads-api.schoolia.online`
- `SDR_API_BASE_URL=https://leads-api.schoolia.online` (compatibilidade)
- `LEAD_API_TOKEN=<token server-side para /lead/codesagency>`
- `SITE_CLIENT_SLUG=advocacia-demo`
- `OPERATIONAL_MODE=demo` (ou `production`)
- `DEMO_MODE=true` (compatibilidade legada)

Descricao rapida das 4 envs oficiais:

- `BACKEND_BASE_URL`: upstream central da Lead API para o proxy local.
- `LEAD_API_TOKEN`: token server-side para `/api/lead/codesagency`.
- `SITE_CLIENT_SLUG`: cliente ativo no projeto.
- `OPERATIONAL_MODE`: define `demo` ou `production`.

## Modelo de entrega por modulo

- Modelo 1: `site_sdr_enabled=true`, `form_enabled=false`
- Modelo 2: `site_sdr_enabled=true`, `form_enabled=true`
- Modelo 3: `site_sdr_enabled=true`, `form_enabled=true`, `whatsapp_enabled=true` (futuro)

## Schema

- `config/schema/site-config.schema.json`
