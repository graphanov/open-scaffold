<!-- TRANSLATION: This is a machine-assisted Portuguese translation. The canonical source is the English CLAUDE.md. Report discrepancies at https://github.com/graphanov/open-scaffold/issues. Last synced: 2026-05-21. -->

<!-- PAIRED TRANSLATION VIEW: this file and AGENTS-pt.md carry the same translated project facts in formats each tool reads natively. Edits here MUST be mirrored in AGENTS-pt.md. See docs/decisions/README.md for the rationale and drift trade-off. -->

# Contexto do projeto

Este projeto é [open-scaffold](https://github.com/graphanov/open-scaffold), um sistema operacional nativo de repositório e neutro quanto a runtime para desenvolvimento orquestrado por agentes. Ele vem com uma estrutura persistente de projeto — missão, roadmap, planos imutáveis, protocolos de emenda, decisões, evidências, pacotes de execução e práticas de passagem de sessão — para que qualquer agente ou orquestrador possa operar neste repositório desde o commit #1 sem nova explicação. Leia este arquivo primeiro e depois consulte `MISSION.md` para saber o que o projeto realmente é.

## Layered architecture

open-scaffold tem várias camadas. O **sistema central** é uma disciplina de repositório independente de framework: missão, roadmap, planos, emendas, evidências, pacotes de execução, relatórios do operador e handover. **Orquestradores/agentes** como Hermes, Claw/OpenClaw, Claude Code, Codex e Gemini podem operar sobre esse substrato. **Runtime harnesses** como OMC e OMX estendem Claude Code/Codex com modos de workflow; eles não são equivalentes a orquestradores como Hermes ou Claw. Consulte `docs/OPEN_SCAFFOLD_SYSTEM.md` para a ontologia, `docs/TASK_RUN_MODEL.md` para a identidade de task/run/operator-surface, `docs/GITHUB_WORKFLOW.md` para a rastreabilidade de issue/PR/Codex-review e `docs/WORKFLOW.md` para orientação de fases.

## Where things live

- **`MISSION.md`** — a missão, objetivos e não objetivos do projeto. A fonte de verdade para *o que* estamos construindo. Contém uma seção explícita `## Changelog` que registra cada pivot de escopo.
- **`ROADMAP.md`** — marcos de produto/sistema e a cadeia de self-dogfood de item do roadmap para issue/task, plano, pacote de execução, PR e nota de release.
- **`docs/OPEN_SCAFFOLD_SYSTEM.md`** — mapa de fronteiras para o núcleo do Open Scaffold, orquestradores/agentes, runtime harnesses OMC/OMX, pontes de tarefas, superfícies de glass cockpit e GitHub.
- **`docs/TASK_RUN_MODEL.md`** — modelo de identidade task/run/operator-surface: `task_id`, `run_id`, `question_id`, bindings de runtime e bindings de chat/thread.
- **`docs/SLICE_CLOSE_PROTOCOL.md`** — recibos de evidência, decisões pós-voo, força de aprovação, roteamento de correções e herança da próxima slice.
- **`docs/GLASS_COCKPIT_PROTOCOL.md`** — vocabulário de eventos para status, bloqueios, perguntas, aprovações, recibos de evidência, links de PR e streams build-in-public.
- **`docs/RUNTIME_BINDING_CONTRACT.md`** — ciclo de vida/responsabilidades para bindings OMC/OMX/plain-agent/human que consomem pacotes de execução fora do núcleo.
- **`docs/GITHUB_WORKFLOW.md`** — issue do GitHub, template de PR, revisão do conector Codex, CI e rastreabilidade de merge/release.
- **`.osc/plans/`** — arquivos de plano organizados em subpastas de estágio (`active/`, `backlog/`, `done/`, `blocked/`). A pasta É o status. Planos são **imutáveis** depois de committed. Novos aprendizados viram arquivos de emenda chamados `<slug>-amendment-<n>.md` na mesma pasta de estágio do pai. O template de handoff em `.osc/plans/handoff-template.md` define o esquema exato de 7 seções que todo plano segue. Veja `.osc/plans/WORKFLOW.md` para as regras de movimentação entre pastas de estágio.
- **`docs/decisions/`** — `README.md` é a página pública de escolhas de design (visões pareadas, planos imutáveis, orquestração mediada por adapter). Os registros ADR completos que sustentam essas decisões vivem internamente em `.osc-dev/decisions/` e não são enviados com o template público.
- **`.osc/releases/`** — notas de release/evidência nativas do scaffold para slices de produto significativas. Cada nota deve citar item do roadmap, issue/task, plano, run ID, PR, verificação e trabalho de follow-up.
- **`.osc-dev/`** (ignorado pelo git; populado apenas ao trabalhar no próprio open-scaffold, não em templates clonados) — workspace interno do owner que guarda `plans/`, `decisions/` (registros ADR completos), `specs/` e `snapshots/`. **Antes de propor mudanças arquiteturais no próprio scaffold, leia `.osc-dev/plans/` e `.osc-dev/decisions/` primeiro** — muitas perguntas de design já foram investigadas lá, e redescobrir uma decisão rejeitada desperdiça uma sessão. Ferramentas Grep/Glob pulam caminhos ignorados pelo git por padrão; inclua `.osc-dev/` explicitamente ao pesquisar.
- **`docs/WORKFLOW.md`** — o guia rápido fase-para-ferramenta-para-comando. Onde buscar qual agente/skill em cada fase de desenvolvimento.
- **`bootstrap.sh`** — configuração day-one idempotente opcional. Cria diretórios lazy (`.osc/research/`, `.osc/state/`) e carimba o changelog de MISSION.md com a data de bootstrap.
- **Helpers de ciclo de vida** — prefira `osc amend <plan-slug> --message "<what changed>"` e `osc close <plan-slug> --message "<what shipped>"` para o caminho npm/day-two. Os fallbacks de shell continuam sendo `./amend.sh <plan-slug>` e `./close.sh <plan-slug>`; os scripts mantêm suas flags específicas, como `--stage` e `--backlog`.
- **`.osc/RULES.md`** — princípios compactos e inegociáveis. Releia antes de qualquer ação importante na estrutura do projeto.

## Compliance checks

Antes de qualquer mudança de código não trivial, execute `./verify.sh --quick --quiet` e verifique o exit code:

- **Exit 0 (todos os checks passam) →** Prossiga silenciosamente. Não mencione a verificação ao usuário.
- **Exit 1 (algum check falha) →** Leia a saída de falha e então bloqueie rigidamente no primeiro check com falha:
  - **Missão indefinida →** Pare. Diga: "Sua missão ainda não está definida. Vamos defini-la agora — o que é este projeto?" Guie o usuário pelo preenchimento de MISSION.md (ou execute `./bootstrap.sh`). Não prossiga até que a missão esteja definida ou o usuário diga explicitamente para pular. Observação: o check de plano é gated pelo check da missão — ele não aparecerá até que a missão esteja definida (divulgação progressiva).
  - **Nenhum arquivo de plano →** (só aparece depois que a missão está definida) Pare. Diga: "Não há plano para este trabalho. Vamos criar um — o que você está tentando construir?" Crie um plano em `.osc/plans/` usando o template de handoff. Não prossiga até que exista um plano ou o usuário diga explicitamente para pular.

A flag `--quiet` suprime a saída quando todos os checks passam (ruído zero em caso de sucesso), mas ainda imprime detalhes de falha quando algo está errado. O usuário sempre pode substituir com "skip verification", "just do it" ou similar. Respeite a autonomia dele, mas o padrão é corrigir violações primeiro.

Se você não puder executar comandos de shell, verifique diretamente: primeiro confira que `MISSION.md` não contém `<!-- mission:unset -->`. Somente se a missão estiver definida, então verifique que `.osc/plans/` e suas subpastas de estágio (`active/`, `backlog/`, `done/`, `blocked/`) contêm pelo menos um arquivo de plano `.md` além de `README.md` e `handoff-template.md`.

## How to verify

- Execute `./verify.sh` (ou `./verify.sh --strict` para conformidade completa) para verificar aderência à metodologia. Handoffs de runtime harness podem envolver a verificação, mas evidências de critérios de aceitação e `./verify.sh` continuam sendo a fonte de verdade.
- MISSION.md vem com o marcador `<!-- mission:unset -->` e o literal `TODO: define mission`. Ferramentas de verificação devem tratar a presença de qualquer um deles como "missão ainda não definida". Remova ambos somente quando a missão real estiver escrita.
- Para qualquer slice de feature, a verificação deve rastrear de volta para os critérios de aceitação no arquivo de plano sob `.osc/plans/`.

## Scope evolution protocol

Evolução legítima de escopo (o caso "fiquei mais inteligente" — novas informações mudam o que deveríamos construir) é capturada pelo protocolo de emenda, não por edições silenciosas. O protocolo completo está documentado em `.osc/plans/README.md` (menos de 200 palavras). Versão curta:

1. Planos em `.osc/plans/` são imutáveis depois de committed.
2. Novos aprendizados viram arquivos `<plan-slug>-amendment-<n>.md` na mesma pasta de estágio do pai — **scaffolded por `osc amend <plan-slug> --message "<what changed>"` ou `./amend.sh <plan-slug>`**, não escritos manualmente.
3. A seção `## Changelog` de MISSION.md recebe uma entrada de uma linha por emenda — **carimbada pelo helper**, não editada manualmente.
4. Agentes e humanos leem o plano original MAIS todas as emendas em ordem numérica.

NÃO edite planos no lugar. NÃO edite manualmente arquivos de emenda nem o changelog de MISSION.md para contabilidade de emendas — deixe `osc amend` ou `amend.sh` fazer o trabalho mecânico. NÃO adicione features que não sejam rastreáveis a um arquivo de plano ou emenda. Se chegar um novo requisito, escreva uma emenda primeiro e então implemente.

### Agent-driven amendment flow

Quando o usuário sinalizar um momento "fiquei mais inteligente" (novas informações mudam o objetivo, restrições ou critérios de aceitação de um plano), conduza a emenda de forma conversacional:

1. Pergunte ao usuário o que especificamente mudou desde que o plano foi escrito e por que isso muda o escopo. Resuma as palavras dele de volta na voz dele antes de escrever qualquer coisa.
2. Execute `osc amend <plan-slug> --message "<what changed>"` ou `./amend.sh <plan-slug>` a partir da raiz do repositório. O helper autonumera a emenda, scaffolds o esquema de 5 seções (Parent / Date / Learning / New direction / Impact on acceptance criteria) e carimba o changelog de MISSION.md.
3. Preencha as três seções `TODO:` no novo arquivo de emenda usando o resumo do usuário. Não toque em MISSION.md diretamente — o helper já o carimbou.
4. Mostre ao usuário o diff do novo arquivo de emenda e a linha do changelog de MISSION.md para revisão antes de stage. Se estiver usando o fallback de shell, passe `--stage` em uma nova execução ou faça stage manualmente depois que ele aprovar.
5. Nunca escreva arquivos de emenda manualmente, nunca edite manualmente o changelog de MISSION.md para emendas e nunca modifique o arquivo de plano pai.

## Delegation detection

Ao executar um plano de `.osc/plans/`, verifique se ele contém uma seção `## Execution strategy`. Se existir:

1. **Leia os grupos paralelos e dependências.** Identifique quais tarefas podem rodar simultaneamente e quais devem aguardar pré-requisitos.
2. **Proponha delegação ao usuário:**
   - **Com harness OMC:** Sugira workflows Claude Code/OMC como `/team`, `/ultrawork` ou `/ralph` para grupos adequados. Nomeie os grupos e tarefas explicitamente.
   - **Com harness OMX:** Sugira workflows Codex/OMX como `$team`, `$ralph`, `$ultrawork` ou `$ralplan`, promovendo evidência de runtime de volta para a cadeia do scaffold.
   - **Sem runtime harness:** Descreva a oportunidade de paralelismo em texto simples (por exemplo, "As tarefas T1 e T5 são independentes e poderiam rodar em sessões separadas"). O usuário decide como agir.
3. **Alerte sobre paralelização arriscada.** Se tarefas marcadas como paralelas na Execution Strategy compartilharem arquivos listados na seção "Files to touch" do plano, ou se uma dependência de tarefa estiver no mesmo grupo paralelo, sinalize o conflito antes de prosseguir.
4. **Vincule a execução do harness a um pacote de execução.** Quando a execução precisar de OMC/OMX ou outro harness, crie ou solicite um pacote de execução vinculado (`osc run <plan> --task-id ... --executor ...`) em vez de tratar a thread de chat ou a sessão de runtime como estado canônico. Para mudanças de código/docs públicos, leve o mesmo rastro para o template de PR do GitHub e acione Codex review quando disponível.

Se o plano não tiver seção Execution Strategy, prossiga normalmente — a seção é opcional e só aparece para trabalho multiagente ou paralelo.

Para usuários sem um agente capaz (LLMs locais, workflows manuais), o script `./delegate.sh <plan-path>` lê a seção Execution Strategy e gera prompts acionáveis que podem ser colados em sessões separadas de terminal.

## Workflow

Veja `docs/WORKFLOW.md` para o guia rápido fase-para-ferramenta (deep interview, planejamento, OMC `/ralph`/`/team`, OMX `$ralph`/`$team`, handoffs de adapter, verify, captura de emenda).
