# Codestech Onboarding Agent MVP - Operacao

## Onde o MVP foi implementado

- `internal/onboarding-agent/`

Ferramenta interna, isolada do bundle/runtime do site.

## Comando de onboarding

Dry-run:

```bash
node internal/onboarding-agent/run.mjs --input <payload.json> --mode dry-run
```

Apply com gate humano:

```bash
node internal/onboarding-agent/run.mjs --input <payload.json> --mode apply --approved
```

Observacao:

- sem `--approved`, o `apply` sempre bloqueia.

## Contrato oficial do payload

- `internal/onboarding-agent/schemas/onboarding-request.schema.json`

Campos base:

- `client_slug`
- `segment`
- `operational_mode`
- `channels`
- `brand`
- `offers`
- `faq`
- `clickup_list_id`
- `telegram_chat_id`
- `uses_whatsbot`
- `site_domain`
- `vercel_project_name`

## Saidas padronizadas

Cada run gera em `internal/onboarding-agent/outputs/<run_id>/`:

- `onboarding-report.md`
- `onboarding-report.json`
- `manual-actions.md`
- `go-no-go.json`
- `preview/...`

## Validacao minima coberta pelo QA Agent

- consistencia de `client_slug`, `segment`, `operational_mode`
- flags de canal (`site_sdr`, `form`, `whatsapp`)
- coerencia de IDs de roteamento (`clickup_list_id`, `telegram_chat_id`)
- coerencia de `form_enabled` com campos
- gate humano de `apply`
- shape minimo de payload operacional para SDR/Form

## Teste minimo do MVP

```bash
node internal/onboarding-agent/scripts/run-mvp-tests.mjs
```

Casos de teste:

- advocacia mock (esperado GO em dry-run)
- imobiliaria mock com pendencia de ClickUp (esperado NO-GO em dry-run)

