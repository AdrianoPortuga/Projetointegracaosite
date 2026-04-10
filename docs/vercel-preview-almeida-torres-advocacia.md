# Vercel Preview - almeida-torres-advocacia (homologacao)

Escopo: homologacao/preview apenas.  
Sem deploy em producao, sem DNS final, sem ativacao de integracoes externas reais.

## 1) Branch e cliente

- Branch: `feat/template-plug-and-play-sdr-whatsbot`
- Cliente: `almeida-torres-advocacia`
- Rota de homologacao no frontend:
  - `/clients/almeida-torres-advocacia/`

## 2) Envs minimas no Vercel (Preview)

Definir no projeto Vercel em **Preview**:

- `SITE_CLIENT_SLUG=almeida-torres-advocacia`
- `OPERATIONAL_MODE=demo`
- `BACKEND_BASE_URL=https://leads-api.schoolia.online` (ou backend de homolog)
- `LEAD_API_TOKEN=<token_homolog>`

Seguranca operacional desta homologacao:

- `whatsapp_enabled=false` (no config do cliente)
- `telegram_enabled=false` (no config do cliente)
- `clickup_list_id=CLICKUP_LIST_HOMOLOG_ADVOCACIA` (placeholder seguro)
- sem DNS final
- sem producao

## 3) Como subir preview

1. Abrir/atualizar PR da branch `feat/template-plug-and-play-sdr-whatsbot`.
2. Esperar Vercel gerar deployment de Preview.
3. Abrir URL do preview e acessar:
   - `/clients/almeida-torres-advocacia/`

## 4) Validacao funcional no preview

1. Abrir `/api/sdr-config` e confirmar:
   - `siteClientSlug=almeida-torres-advocacia`
   - `operationalMode=demo`
   - `localApiBaseUrl=/api`
2. Abrir pagina do cliente:
   - hero/ofertas/faq corretos
3. Abrir widget SDR e enviar mensagem de teste
4. Enviar formulario de teste
5. No DevTools/Network confirmar:
   - `POST /api/sdr/chat`
   - `POST /api/lead/codesagency`

## 5) Checklist curto de logs de deploy

- Vercel build logs:
  - erro de build do frontend
  - erro de import/module
- Runtime logs/frontend:
  - erro de bootstrap (`[site_template] bootstrap error`)
  - erro de widget/form submit
- Proxy `/api/sdr/chat`:
  - status upstream e eventuais `upstream_unreachable`
- Proxy `/api/lead/codesagency`:
  - status upstream e erro de token/401
- Erro de env ausente:
  - `backend_base_url_missing`
- Erro de rota inexistente:
  - `404` para `/api/sdr/chat` ou `/api/lead/codesagency`
- Erro de CORS/proxy/backend:
  - falha upstream (não é esperado CORS no browser com proxy local)

## 6) Gate manual obrigatorio

- Nao fazer deploy de producao
- Nao alterar DNS
- Nao ativar ClickUp/Telegram reais
- Nao ativar Z-API real

