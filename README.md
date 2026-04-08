# Codestech Template - Mostruario com SDR

Base plug-and-play para vitrines comerciais com:

- landing orientada por JSON
- SDR widget
- formulario
- tracking
- handoff preparado para pipeline

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

## Resolucao do cliente ativo

Ordem de prioridade:

1. `SITE_CLIENT_SLUG` vindo de `/api/sdr-config` (env do Vercel)
2. `meta[name="site-client-slug"]` em `index.html`
3. `?client=` na URL (fallback tecnico de homologacao)
4. fallback final: `advocacia-demo`

## Demo mode

- `DEMO_MODE=true` (env) ou `demo_mode=true` no JSON do cliente.
- Quando ativo:
  - origem SDR e form saem com prefixo `DEMO_`
  - payload inclui `demo_mode=true`
  - form nao envia para endpoint real por padrao (`demo_allow_live_submit=false`)

## Demos prontas

- `advocacia-demo` (demo principal)
- `AgenciaCarro-demo`
- `imobiliaria-demo`

## Deploy no Vercel (3 projetos)

Sugestao de nomes:

1. `codestech-demo-advocacia`
2. `codestech-demo-agenciacarros`
3. `codestech-demo-imobiliaria`

Envs minimas para cada projeto:

- `SDR_API_BASE_URL=https://leads-api.schoolia.online`
- `SITE_CLIENT_SLUG=<slug do projeto>`
- `DEMO_MODE=true`

Mapeamento de `SITE_CLIENT_SLUG`:

- `codestech-demo-advocacia` -> `advocacia-demo`
- `codestech-demo-agenciacarros` -> `AgenciaCarro-demo`
- `codestech-demo-imobiliaria` -> `imobiliaria-demo`

## Criar novo cliente

```bash
node scripts/create-client-config.mjs <client-slug> <segment>
```

Depois:

1. editar `config/clients/<client-slug>.json`
2. garantir que o segmento existe em `config/segments`
3. publicar em projeto Vercel com `SITE_CLIENT_SLUG=<client-slug>`

## Schema

Schema oficial:

- `config/schema/site-config.schema.json`
