# Codestech Onboarding Agent MVP (v1)

Ferramenta interna isolada do runtime do site para onboarding auditavel de clientes.

Escopo desta versao:

- Supervisor scriptado/deterministico
- Config Agent
- Knowledge Agent
- QA Agent (validacao minima)
- Docs Agent
- Approval gate humano para `apply`

## Estrutura

```text
internal/onboarding-agent/
  run.mjs
  supervisor.mjs
  schemas/
  agents/
  examples/
  outputs/
```

## Contrato de entrada

Schema oficial:

- `internal/onboarding-agent/schemas/onboarding-request.schema.json`

Entrada por arquivo JSON (`--input`).

## Execucao

Dry-run (recomendado primeiro):

```bash
node internal/onboarding-agent/run.mjs --input internal/onboarding-agent/examples/onboarding-advocacia-mock.json --mode dry-run
```

Apply (somente com aprovacao humana explicita):

```bash
node internal/onboarding-agent/run.mjs --input internal/onboarding-agent/examples/onboarding-advocacia-mock.json --mode apply --approved
```

Provisionamento de Preview no Vercel (dry-run recomendado):

```bash
node internal/onboarding-agent/scripts/provision-vercel-preview.mjs --client-slug almeida-torres-advocacia --dry-run
```

Comportamento do gate:

- `apply` sem `--approved` => bloqueado (NO-GO)
- `apply` com blockers de QA => bloqueado (NO-GO)
- `apply` com QA limpo + aprovado => grava em `config/clients` e `knowledge/clients`

## Artefatos de saida

Cada execucao gera:

- `outputs/<run_id>/onboarding-report.md`
- `outputs/<run_id>/onboarding-report.json`
- `outputs/<run_id>/manual-actions.md`
- `outputs/<run_id>/go-no-go.json`
- `outputs/<run_id>/preview/...` (preview dos arquivos que seriam aplicados)

## O que o QA valida no MVP

- consistencia de `client_slug`, `segment`, `operational_mode`
- canais ativos (`site_sdr`, `form`, `whatsapp`)
- coerencia minima de `clickup_list_id` e `telegram_chat_id`
- coerencia de `form_enabled` com campos de formulario
- gate humano para `apply`
- shape minimo esperado do payload operacional

## Rotina Vercel Provisioning

Documentacao:

- `internal/onboarding-agent/docs/vercel-provisioning.md`
- `internal/onboarding-agent/.env.vercel-preview.example`
