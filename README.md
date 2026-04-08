# Codestech Plug-and-Play Site Template

Base oficial para replicar sites comerciais com SDR, formulário e tracking sem misturar regras de clientes.

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
utils/
  tracking/
  lead/
  branding/
scripts/
api/
```

## Como funciona

1. `scripts/bootstrap.js` carrega config do cliente (`config/clients/*.json`).
2. Loader mescla com pack de segmento (`config/segments/*.json`).
3. Landing, form e SDR recebem a configuração final.
4. SDR envia para `POST /sdr/chat` usando `SDR_API_BASE_URL` vindo de `/api/sdr-config`.

## Variáveis de ambiente

- `SDR_API_BASE_URL=https://leads-api.schoolia.online`

## Criar novo cliente

1. Gerar arquivo base:
   - `node scripts/create-client-config.mjs <client-slug> <segment>`
2. Editar `config/clients/<client-slug>.json`.
3. Abrir site com `?client=<client-slug>` para testar.
4. Ajustar `meta[name="site-client-slug"]` em `index.html` quando quiser fixar um cliente padrão.

## Schema

Schema oficial em:

- `config/schema/site-config.schema.json`
