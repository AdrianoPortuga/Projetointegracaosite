# Checklist de Homologacao - almeida-torres-advocacia

## 1) Preparo local

- Definir envs (arquivo `.env` local ou shell):
  - `SITE_CLIENT_SLUG=almeida-torres-advocacia`
  - `OPERATIONAL_MODE=demo`
  - `BACKEND_BASE_URL=https://leads-api.schoolia.online` (ou backend de homolog)
  - `LEAD_API_TOKEN=<token de homolog>`

## 2) Subir ambiente local

- Rodar preview local do template.
- Abrir:
  - `http://localhost:<porta>/clients/almeida-torres-advocacia/`

## 3) Validar front/base

- Hero e branding carregam como `Almeida & Torres Advocacia`.
- Ofertas e FAQ carregam do cliente.
- Formulario aparece e possui campos esperados.
- Widget SDR abre sem erro de JS.

## 4) Validar fluxo SDR

- Enviar mensagem de teste no widget.
- Confirmar no DevTools request para `POST /api/sdr/chat`.
- Confirmar payload com:
  - `client_slug=almeida-torres-advocacia`
  - `segment=advocacia`
  - `canal=site_sdr`
  - `operational_mode=demo`
  - `route_module=atendimento_advocacia`

## 5) Validar fluxo formulario

- Enviar formulario de teste.
- Confirmar request para `POST /api/lead/codesagency`.
- Confirmar payload com:
  - `client_slug=almeida-torres-advocacia`
  - `segment=advocacia`
  - `canal=form`
  - `operational_mode=demo`
  - `route_module=atendimento_advocacia`

## 6) Validar smoke script

```bash
node scripts/smoke-homolog-almeida-torres.mjs
```

Esperado:

- `OK: smoke homologacao almeida-torres-advocacia`

## 7) Gate humano (manual)

- Nao executar deploy de producao.
- Nao alterar DNS.
- Nao ativar Telegram/Z-API/CRM real sem revisão.

