# Provisionamento Preview no Vercel (Onboarding Agent)

## Objetivo

Automatizar a etapa de homologacao/preview:

- verificar se projeto existe no Vercel
- criar projeto (quando ausente)
- aplicar envs minimas em `preview`
- gerar relatorio auditavel

Fora do escopo:

- deploy em producao
- DNS final
- ativacao real de canais externos

## Script

- `internal/onboarding-agent/scripts/provision-vercel-preview.mjs`

## Envs minimas (preview)

- `SITE_CLIENT_SLUG`
- `OPERATIONAL_MODE`
- `BACKEND_BASE_URL`
- `LEAD_API_TOKEN`

## Secrets de execucao

- `VERCEL_TOKEN` (obrigatorio para execucao real)
- `VERCEL_TEAM_ID` (opcional, quando aplicavel)

Template:

- `internal/onboarding-agent/.env.vercel-preview.example`

## Uso

Dry-run:

```bash
node internal/onboarding-agent/scripts/provision-vercel-preview.mjs \
  --client-slug almeida-torres-advocacia \
  --project-name codestech-homolog-almeida-torres \
  --repo AdrianoPortuga/Projetointegracaosite \
  --provider auto \
  --dry-run
```

Execucao real (preview apenas):

```bash
node internal/onboarding-agent/scripts/provision-vercel-preview.mjs \
  --client-slug almeida-torres-advocacia \
  --project-name codestech-homolog-almeida-torres \
  --repo AdrianoPortuga/Projetointegracaosite \
  --provider api
```

Providers suportados:

- `api` (REST Vercel)
- `cli` (Vercel CLI)
- `auto` (tenta API e fallback para CLI)

## Saida

Cada run gera:

- `internal/onboarding-agent/outputs/vercel-provision/<run_id>/vercel-provision-report.json`
- `internal/onboarding-agent/outputs/vercel-provision/<run_id>/vercel-provision-report.md`

## Permissoes minimas recomendadas

### GitHub

- GitHub App ou usuario tecnico com acesso somente ao repo:
  - `AdrianoPortuga/Projetointegracaosite`
- Permissoes de repo:
  - leitura de conteudo + leitura/escrita de PR (se for automatizar PR)
  - sem necessidade de permissao org-wide adicional para essa rotina

### Vercel

- Token com escopo minimo para:
  - ler projetos
  - criar projeto (se permitido)
  - criar/atualizar env vars em Preview
- Se operar via team:
  - informar `VERCEL_TEAM_ID`

## Checklist de seguranca

- nao hardcodar tokens no codigo
- usar apenas secrets de ambiente
- manter `OPERATIONAL_MODE=demo` na homologacao
- validar relatorio antes de qualquer acao manual adicional
- manter deploy/DNS/integrações externas reais sob gate humano

