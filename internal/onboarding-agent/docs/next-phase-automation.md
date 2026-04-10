# Extensao proposta do Onboarding Agent (fase homologacao)

Objetivo: manter `dry-run/apply` seguro e passar a gerar automaticamente artefatos de homologacao do cliente.

## O que automatizar na proxima fase

1. Scaffold de site-base por cliente
- gerar `clients/<client_slug>/index.html` com `meta site-client-slug`
- manter pagina editavel para homologacao interna

2. Binding frontend/config
- validar que `config/clients/<client_slug>.json` e `knowledge/clients/<client_slug>/...` existem
- validar endpoints de proxy configurados:
  - `/api/sdr/chat`
  - `/api/lead/codesagency`

3. Envs de exemplo por cliente
- gerar `.env.example` parcial por cliente (sem segredos)
- campos:
  - `SITE_CLIENT_SLUG`
  - `OPERATIONAL_MODE`
  - `BACKEND_BASE_URL`
  - `LEAD_API_TOKEN=<definir_manual>`

4. Checklist de homologacao
- gerar `docs/homologacao-<client_slug>.md` com passos operacionais

5. Smoke test basico por cliente
- gerar script:
  - valida arquivo da pagina
  - valida payload SDR/Form
  - valida handlers de proxy com mocks

## Gates humanos que permanecem obrigatorios

- deploy em producao
- DNS/dominios finais
- secrets reais
- ClickUp/Telegram/Z-API reais
- CRM real e mensagens reais

