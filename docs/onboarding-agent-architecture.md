# Arquitetura de Agentes - Codestech Onboarding Factory

Objetivo: usar agentes internamente para acelerar onboarding e implantação de clientes SDR + Form + ClickUp + Telegram + WhatsBot (opcional), com aprovação humana nos pontos críticos.

## 1) Arquitetura proposta

Modelo: **1 Supervisor + 7 subagentes especializados**

- Supervisor (Orchestrator Agent)
- Config Agent
- Knowledge Agent
- Ops Routing Agent
- Infra/Deploy Agent
- WhatsApp/Z-API Agent
- QA/Homologation Agent
- Docs Agent

## 2) Lista de agentes (papel, entrada, saída)

### Supervisor (Orchestrator Agent)

- Entrada:
  - payload do onboarding (`client_slug`, segmento, canais, dados operacionais)
- Responsabilidade:
  - orquestrar execução dos subagentes
  - consolidar pendências e checkpoints de aprovação
- Saída:
  - plano consolidado de implantação
  - checklist final com status por etapa
- Aprovação humana:
  - obrigatória antes de deploy em produção

### Config Agent

- Entrada:
  - briefing comercial + segmento + flags de canais
- Responsabilidade:
  - gerar/atualizar `config/clients/<client_slug>.json`
  - garantir aderência ao schema
- Saída:
  - config válida com:
    - `operational_mode`
    - `channels.*`
    - `lead_routing.*`
    - `sdr.*`
    - `form.fields`
- Arquivos:
  - `config/clients/<client_slug>.json`
- Aprovação humana:
  - validar roteamento final (ids reais de ClickUp/Telegram)

### Knowledge Agent

- Entrada:
  - briefing do cliente (perfil, FAQs, ofertas, regras comerciais)
- Responsabilidade:
  - estruturar base histórica crescente por cliente
- Saída:
  - pacote knowledge mínimo
- Arquivos:
  - `knowledge/clients/<client_slug>/business_profile.json`
  - `knowledge/clients/<client_slug>/faq.json`
  - `knowledge/clients/<client_slug>/offers.json`
  - `knowledge/clients/<client_slug>/qualification_rules.json`
  - `knowledge/clients/<client_slug>/handoff_rules.json`
  - `knowledge/clients/<client_slug>/change_log.md`
- Aprovação humana:
  - revisão de tom/compliance comercial e jurídico

### Ops Routing Agent

- Entrada:
  - config do cliente + parâmetros operacionais
- Responsabilidade:
  - preparar roteamento por módulo/canal:
    - SDR -> ClickUp/Telegram
    - Form -> ClickUp/Telegram
  - garantir payload operacional completo
- Saída:
  - plano de roteamento e validação de campos obrigatórios
- Objetos validados:
  - `client_slug`, `segment`, `canal`, `operational_mode`
  - `site_origin`, `page_path`, `referrer`, `utm_*`
- Aprovação humana:
  - confirmação dos destinos reais de operação

### Infra/Deploy Agent

- Entrada:
  - `client_slug`, domínio, ambiente (demo/prod)
- Responsabilidade:
  - gerar plano Vercel por cliente:
    - envs obrigatórias
    - projeto alvo
    - checklist de redeploy
- Saída:
  - runbook de deploy
  - tabela de envs:
    - `BACKEND_BASE_URL`
    - `LEAD_API_TOKEN`
    - `SITE_CLIENT_SLUG`
    - `OPERATIONAL_MODE`
- Aprovação humana:
  - alterações de domínio/DNS/produção

### WhatsApp/Z-API Agent

- Entrada:
  - `client_slug`, requisitos de WhatsBot, dados de gateway
- Responsabilidade:
  - preparar plano de slug no gateway e integração futura
- Saída:
  - blueprint de integração:
    - slug por cliente
    - regras de roteamento no gateway
    - dependências de número/template
- Aprovação humana:
  - cadastro real de número, autenticação e mensagens em produção

### QA/Homologation Agent

- Entrada:
  - pacote de implantação completo
- Responsabilidade:
  - validar isolamento e funcionalidade fim-a-fim em homolog
- Saída:
  - relatório de QA com bloqueios e pendências
- Testes mínimos:
  - SDR cliente A não usa config do cliente B
  - form respeita campos por cliente
  - payloads com contexto operacional completo
  - proxy local funcionando em `/api/sdr/chat` e `/api/lead/codesagency`
- Aprovação humana:
  - go/no-go para produção

### Docs Agent

- Entrada:
  - outputs de todos os agentes
- Responsabilidade:
  - atualizar documentação operacional
- Saída:
  - changelog de cliente
  - handoff interno para operação
- Arquivos:
  - `knowledge/clients/<client_slug>/change_log.md`
  - `docs/vercel-client-playbook.md` (quando necessário)
- Aprovação humana:
  - validação final de qualidade documental

## 3) Fluxo de execução

1. Usuário interno preenche cadastro de cliente.
2. Supervisor recebe payload e cria plano de execução.
3. Config Agent gera config do cliente.
4. Knowledge Agent gera base histórica inicial.
5. Ops Routing Agent prepara roteamento e valida payloads.
6. Infra/Deploy Agent gera plano de Vercel/envs.
7. WhatsApp/Z-API Agent gera plano de integração futura (quando aplicável).
8. QA Agent executa checklist de homologação.
9. Docs Agent consolida documentação e pendências.
10. Supervisor entrega pacote final + decisões pendentes para aprovação humana.

## 4) Fronteiras de automação

### A) Pode automatizar já

- geração de `config/clients/<client_slug>.json`
- geração de `knowledge/clients/<client_slug>/...`
- validação de schema/config
- geração de checklist/envs/runbook
- smoke tests locais/homolog com payload

### B) Pode preparar, mas depende de aprovação humana

- definição final de `clickup_list_id` e `telegram_chat_id` de produção
- aplicação de envs em projeto Vercel real
- merge para branch de produção
- mudança de `OPERATIONAL_MODE=production`

### C) Não automatizar nesta fase

- DNS/domínio em produção sem revisão
- deploy direto em produção sem aprovação
- cadastro real de número/instância Z-API
- disparo de mensagens reais em produção
- alterações em CRM real sem dupla checagem

## 5) Conexão com a base atual

Arquitetura proposta está alinhada com:

- `config/clients/<client_slug>.json`
- `knowledge/clients/<client_slug>/...`
- proxy local:
  - `/api/sdr/chat`
  - `/api/lead/codesagency`
- envs padrão:
  - `BACKEND_BASE_URL`
  - `LEAD_API_TOKEN`
  - `SITE_CLIENT_SLUG`
  - `OPERATIONAL_MODE`
- integrações:
  - ClickUp
  - Telegram
  - Z-API via slug de cliente no gateway (futuro)

## 6) MVP sugerido (realista)

Escopo do MVP: **Onboarding Agent v1 (interno)**

- Entrada: formulário interno com `client_slug`, segmento, modo, canais
- Execução:
  - Config Agent + Knowledge Agent + QA básico
- Saída:
  - arquivos prontos no repo
  - checklist de deploy Vercel
  - pendências operacionais (tokens/ids)

Entregáveis do MVP:

1. comando/fluxo guiado para criar cliente
2. validação automática de consistência
3. relatório final com “pode homologar?” e pendências

## 7) Implementar primeiro

Prioridade 1 (sem excesso de engenharia):

1. Supervisor simples (pipeline scriptado)
2. Config Agent (template + validação)
3. Knowledge Agent (seed controlado)
4. QA Agent (checklist automatizável)
5. Docs Agent (resumo e change log)

Prioridade 2:

6. Ops Routing Agent com validações mais profundas de integração
7. Infra Agent com integração de API do Vercel

Prioridade 3:

8. WhatsApp/Z-API Agent com integração ativa de gateway
