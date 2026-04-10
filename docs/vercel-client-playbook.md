# Playbook Vercel Por Cliente (Proxy Local)

Guia operacional para criar e publicar clientes no template sem depender de memoria manual.

## 1) Envs oficiais

Definir sempre no projeto Vercel:

- `BACKEND_BASE_URL`
  - URL base da Lead API central.
  - Exemplo: `https://leads-api.schoolia.online`
- `LEAD_API_TOKEN`
  - Token server-side usado no proxy `/api/lead/codesagency` (header `X-API-Token`).
- `SITE_CLIENT_SLUG`
  - Cliente ativo naquele projeto.
  - Precisa bater exatamente com `config/clients/<slug>.json` (case-sensitive em Linux/Vercel).
- `OPERATIONAL_MODE`
  - `demo` ou `production`.
  - Controla comportamento operacional do cliente.

Compatibilidade legada:

- `SDR_API_BASE_URL` (fallback para upstream)
- `DEMO_MODE` (fallback para modo demo)

## 2) Fluxo padrão para novo cliente

1. Definir `client_slug` e segmento.
2. Rodar:
   - `node scripts/create-client-config.mjs <client-slug> <segment> <demo|production>`
3. Editar `config/clients/<client-slug>.json`.
4. Editar `knowledge/clients/<client-slug>/`:
   - `business_profile.json`
   - `faq.json`
   - `offers.json`
   - `qualification_rules.json`
   - `handoff_rules.json`
   - `change_log.md`
5. Commit/push/PR.
6. Criar projeto no Vercel.
7. Configurar envs oficiais.
8. Conectar dominio.
9. Redeploy.
10. Validar proxy local + SDR + form + payload operacional.

## 3) Demo vs produção

Usar `OPERATIONAL_MODE=demo` quando:

- vitrine comercial
- homologacao controlada
- sem envio real (ou com envio explicitamente controlado)

Usar `OPERATIONAL_MODE=production` quando:

- cliente real validado
- token e roteamento ativos
- checklist operacional completo aprovado

## 4) Falhas comuns e sinais

- `LEAD_API_TOKEN` ausente/errado:
  - `/api/lead/codesagency` retorna `401` do upstream.
  - form falha com `HTTP 401`.
- `BACKEND_BASE_URL` errado:
  - proxy retorna `502 upstream_unreachable`.
  - SDR e form falham mesmo sem CORS no navegador.
- `SITE_CLIENT_SLUG` incorreto:
  - erro no carregamento de config (`404` em `config/clients/<slug>.json`).
  - landing quebra no bootstrap.
- endpoint de proxy errado no client config:
  - requests indo para rota inexistente (`404`) no próprio projeto.

## 5) Validação pós-deploy (obrigatória)

1. Abrir `https://<dominio>/api/sdr-config`:
   - conferir `localApiBaseUrl`, `siteClientSlug`, `operationalMode`.
2. No DevTools Network confirmar chamadas locais:
   - `POST /api/sdr/chat`
   - `POST /api/lead/codesagency`
3. Validar tela:
   - hero, CTA, FAQ, offers do cliente.
4. Validar SDR:
   - abre, envia, responde.
5. Validar formulário:
   - renderiza campos corretos do cliente.
6. Validar payload (request body):
   - `client_slug`, `segment`, `canal`, `operational_mode`
   - `site_origin`, `page_path`, `referrer`
   - `utm_*` quando houver.

## 6) Integração operacional (ClickUp, Telegram, WhatsBot)

No `config/clients/<slug>.json`, revisar:

- `lead_routing.clickup_enabled`
- `lead_routing.clickup_list_id`
- `lead_routing.telegram_enabled`
- `lead_routing.telegram_chat_id`
- `lead_routing.route_module`

Próxima camada (gateway):

- mapear `client_slug` para roteamento Z-API/WhatsBot no backend/gateway.
- manter esse mapeamento versionado por cliente.

## 7) Checklist rápido de implantação

1. `create-client-config` executado.
2. `config/clients` e `knowledge/clients` preenchidos.
3. PR aprovado e mergeado.
4. Projeto Vercel criado.
5. Envs oficiais configuradas.
6. Redeploy executado.
7. `/api/sdr-config` validado.
8. SDR e form validados em produção/homolog.
