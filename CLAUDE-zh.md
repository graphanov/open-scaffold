<!-- TRANSLATION: This is a machine-assisted Chinese (zh) translation. The canonical source is the English CLAUDE.md. Report discrepancies at https://github.com/graphanov/open-scaffold/issues. Last synced: 2026-05-21. -->

<!-- PAIRED TRANSLATION VIEW: this file and AGENTS-zh.md carry the same translated project facts in formats each tool reads natively. Edits here MUST be mirrored in AGENTS-zh.md. See docs/decisions/README.md for the rationale and drift trade-off. -->

# 项目上下文

本项目是 [open-scaffold](https://github.com/graphanov/open-scaffold)，一个运行时中立、仓库原生的操作系统，用于由代理编排的开发。它随附持久化项目结构——使命、路线图、不可变计划、修订协议、决策、证据、运行包以及会话交接实践——使任何代理或编排器都能从 commit #1 起在此仓库中工作，而无需重新解释。先阅读此文件，再查阅 `MISSION.md` 了解项目实际要做什么。

## Layered architecture

open-scaffold 有多个层次。**core system** 是与框架无关的仓库纪律：使命、路线图、计划、修订、证据、运行包、操作员报告和交接。Hermes、Claw/OpenClaw、Claude Code、Codex、Gemini 等 **Orchestrators/agents** 可以基于这一底层结构工作。OMC 和 OMX 等 **Runtime harnesses** 通过工作流模式扩展 Claude Code/Codex；它们并不等同于 Hermes 或 Claw 这类编排器。有关本体，请查阅 `docs/OPEN_SCAFFOLD_SYSTEM.md`；有关 task/run/operator-surface 身份，请查阅 `docs/TASK_RUN_MODEL.md`；有关 issue/PR/Codex-review 可追踪性，请查阅 `docs/GITHUB_WORKFLOW.md`；有关阶段指导，请查阅 `docs/WORKFLOW.md`。

## Where things live

- **`MISSION.md`** — 项目的使命、目标和非目标。它是我们正在构建“什么”的事实来源。包含一个明确的 `## Changelog` 章节，用于记录每次范围转向。
- **`ROADMAP.md`** — 产品/系统里程碑，以及从路线图条目到 issue/task、计划、运行包、PR 和发布说明的自我 dogfood 链条。
- **`docs/OPEN_SCAFFOLD_SYSTEM.md`** — Open Scaffold core、orchestrators/agents、OMC/OMX runtime harnesses、task bridges、glass-cockpit surfaces 和 GitHub 的边界图。
- **`docs/TASK_RUN_MODEL.md`** — task/run/operator-surface 身份模型：`task_id`、`run_id`、`question_id`、runtime bindings 以及 chat/thread bindings。
- **`docs/SLICE_CLOSE_PROTOCOL.md`** — 证据回执、postflight 决策、批准强度、修正路由以及下一 slice 继承。
- **`docs/GLASS_COCKPIT_PROTOCOL.md`** — 用于状态、阻塞项、问题、批准、证据回执、PR 链接以及 build-in-public streams 的事件词汇。
- **`docs/RUNTIME_BINDING_CONTRACT.md`** — 在 core 之外消费运行包的 OMC/OMX/plain-agent/human 绑定的生命周期/职责。
- **`docs/GITHUB_WORKFLOW.md`** — GitHub issue、PR template、Codex connector review、CI 以及 merge/release 可追踪性。
- **`.osc/plans/`** — 按阶段子文件夹（`active/`、`backlog/`、`done/`、`blocked/`）组织的计划文件。文件夹本身就是状态。计划一旦提交即为**不可变**。新认知会成为与父计划位于同一阶段文件夹中的 `<slug>-amendment-<n>.md` 修订文件。`.osc/plans/handoff-template.md` 中的 handoff template 定义了每个计划遵循的精确 7 节 schema。阶段文件夹之间的移动规则见 `.osc/plans/WORKFLOW.md`。
- **`docs/decisions/`** — `README.md` 是公开的设计选择页面（paired views、immutable plans、adapter-mediated orchestration）。支撑这些决策的完整 ADR 记录内部保存在 `.osc-dev/decisions/`，不会随公开模板发布。
- **`.osc/releases/`** — 为有意义的产品 slice 提供 scaffold-native 发布/证据说明。每条说明应引用路线图条目、issue/task、计划、运行 ID、PR、验证和后续工作。
- **`.osc-dev/`**（gitignored；仅在处理 open-scaffold 本身时填充，不会出现在克隆的模板中）— 所有者内部工作区，保存 `plans/`、`decisions/`（完整 ADR 记录）、`specs/` 和 `snapshots/`。**在提出对 scaffold 本身的架构变更前，先阅读 `.osc-dev/plans/` 和 `.osc-dev/decisions/`**——许多设计问题已经在那里调查过，重新推导一个已被拒绝的决策会浪费一个会话。Grep/Glob 工具默认会跳过 gitignored 路径；搜索时请显式包含 `.osc-dev/`。
- **`docs/WORKFLOW.md`** — 阶段到工具到命令的速查表。说明每个开发阶段该使用哪个代理/skill。
- **`bootstrap.sh`** — 可选的幂等 day-one 设置。创建惰性目录（`.osc/research/`、`.osc/state/`），并用 bootstrap 日期给 MISSION.md 的 changelog 打戳。
- **生命周期辅助工具** — 对于 npm/day-two 路径，优先使用 `osc amend <plan-slug> --message "<what changed>"` 和 `osc close <plan-slug> --message "<what shipped>"`。Shell fallbacks 仍为 `./amend.sh <plan-slug>` 和 `./close.sh <plan-slug>`；这些脚本保留其脚本专属 flag，例如 `--stage` 和 `--backlog`。
- **`.osc/RULES.md`** — 精简的不可协商原则。对项目结构采取任何重大操作前都要重读。

## Compliance checks

在任何非平凡代码变更之前，运行 `./verify.sh --quick --quiet` 并检查退出码：

- **退出码 0（所有检查通过）→** 静默继续。不要向用户提及验证。
- **退出码 1（任一检查失败）→** 阅读失败输出，然后在第一个失败检查处硬性阻止：
  - **使命未定义 →** 停止。说：“你的使命尚未定义。我们现在来定义它——这个项目是什么？” 引导用户填写 MISSION.md（或运行 `./bootstrap.sh`）。在使命被定义之前不要继续，除非用户明确要求跳过。注意：计划检查受使命检查门控——在使命定义之前它不会出现（渐进披露）。
  - **没有计划文件 →**（只会在使命已定义后出现）停止。说：“这项工作没有计划。我们来创建一个——你想构建什么？” 使用 handoff template 在 `.osc/plans/` 中创建计划。在计划存在之前不要继续，除非用户明确要求跳过。

`--quiet` flag 会在所有检查通过时抑制输出（成功时零噪音），但在出错时仍会打印失败详情。用户始终可以用“skip verification”、“just do it”或类似说法覆盖。尊重他们的自主权，但默认做法是先修复违规。

如果无法执行 shell 命令，则直接检查：先检查 `MISSION.md` 不包含 `<!-- mission:unset -->`。只有使命已定义时，再检查 `.osc/plans/` 及其阶段子文件夹（`active/`、`backlog/`、`done/`、`blocked/`）中是否至少包含一个除 `README.md` 和 `handoff-template.md` 之外的 `.md` 计划文件。

## How to verify

- 运行 `./verify.sh`（或运行 `./verify.sh --strict` 进行完整合规检查）以检查方法论遵循情况。Runtime harness handoffs 可能会包装验证，但验收标准证据和 `./verify.sh` 仍是真相来源。
- MISSION.md 随附标记 `<!-- mission:unset -->` 和字面量 `TODO: define mission`。验证工具应将任一存在视为“使命尚未定义”。只有在写入真实使命时才移除二者。
- 对于任何 feature slice，验证都必须追溯到 `.osc/plans/` 下计划文件中的验收标准。

## Scope evolution protocol

合理的范围演进（“我变聪明了”的情况——新信息改变我们应该构建什么）通过修订协议捕获，而不是静默编辑。完整协议记录在 `.osc/plans/README.md` 中（少于 200 词）。简短版本：

1. `.osc/plans/` 中的计划一旦提交即不可变。
2. 新认知会成为与父计划位于同一阶段文件夹中的 `<plan-slug>-amendment-<n>.md` 文件——**由 `osc amend <plan-slug> --message "<what changed>"` 或 `./amend.sh <plan-slug>` 搭建**，不是手写。
3. MISSION.md 的 `## Changelog` 章节为每个修订获得一行记录——**由辅助工具打戳**，不是手动编辑。
4. 代理和人类按数字顺序读取原始计划以及所有修订。

不要原地编辑计划。不要为了修订记账而手动编辑修订文件或 MISSION.md 的 changelog——让 `osc amend` 或 `amend.sh` 完成机械工作。不要添加无法追踪到计划文件或修订的功能。如果出现新需求，先编写修订，然后再实现。

### Agent-driven amendment flow

当用户发出“我变聪明了”的信号（新信息改变了计划的目标、约束或验收标准）时，以对话方式驱动修订：

1. 询问用户自计划写成以来具体发生了什么变化，以及为什么它会改变范围。在写任何内容之前，用他们自己的口吻总结给他们。
2. 从仓库根目录运行 `osc amend <plan-slug> --message "<what changed>"` 或 `./amend.sh <plan-slug>`。辅助工具会自动编号修订、搭建 5 节 schema（Parent / Date / Learning / New direction / Impact on acceptance criteria），并给 MISSION.md 的 changelog 打戳。
3. 使用用户的总结填写新修订文件中的三个 `TODO:` 章节。不要直接触碰 MISSION.md——辅助工具已经为它打戳。
4. 在暂存前向用户展示新修订文件和 MISSION.md changelog 行的 diff 供审阅。如果使用 shell fallback，请在重新运行时传入 `--stage`，或在他们批准后手动暂存。
5. 绝不手写修订文件，绝不为了修订而手动编辑 MISSION.md 的 changelog，也绝不修改父计划文件。

## Delegation detection

执行 `.osc/plans/` 中的计划时，检查它是否包含 `## Execution strategy` 章节。若存在：

1. **阅读并行组和依赖关系。** 识别哪些任务可以并发运行，哪些任务必须等待先决条件。
2. **向用户提出委派建议：**
   - **使用 OMC harness：** 为合适的组建议 Claude Code/OMC 工作流，例如 `/team`、`/ultrawork` 或 `/ralph`。明确点名组和任务。
   - **使用 OMX harness：** 建议 Codex/OMX 工作流，例如 `$team`、`$ralph`、`$ultrawork` 或 `$ralplan`，并将 runtime evidence 提升回 scaffold 链条。
   - **没有 runtime harness：** 用普通文本描述并行机会（例如，“任务 T1 和 T5 相互独立，可以在独立会话中运行”）。由用户决定如何行动。
3. **对有风险的并行化发出警告。** 如果 Execution Strategy 中标记为并行的任务共享了计划 “Files to touch” 章节列出的文件，或某任务的依赖也在同一并行组内，请在继续前标记冲突。
4. **将 harness 执行绑定到运行包。** 当执行需要 OMC/OMX 或其他 harness 时，创建或请求绑定的运行包（`osc run <plan> --task-id ... --executor ...`），而不是把 chat thread 或 runtime session 视为规范状态。对于代码/公开文档变更，将同一追踪关系带入 GitHub PR template，并在可用时触发 Codex review。

如果计划没有 Execution Strategy 章节，则照常继续——该章节是可选的，仅存在于多代理或并行工作中。

对于没有能力代理的用户（本地 LLM、手动工作流），`./delegate.sh <plan-path>` 脚本会读取 Execution Strategy 章节，并生成可粘贴到独立终端会话中的可操作提示。

## Workflow

参见 `docs/WORKFLOW.md`，了解阶段到工具的速查表（deep interview、planning、OMC `/ralph`/`/team`、OMX `$ralph`/`$team`、adapter handoffs、verify、amendment capture）。
