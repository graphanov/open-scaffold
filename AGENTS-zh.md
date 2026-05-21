<!-- TRANSLATION: This is a machine-assisted Chinese (zh) translation. The canonical source is the English AGENTS.md. Report discrepancies at https://github.com/graphanov/open-scaffold/issues. Last synced: 2026-05-21. -->

<!-- PAIRED TRANSLATION VIEW: this file and CLAUDE-zh.md carry the same translated project facts in formats each tool reads natively. Edits here MUST be mirrored in CLAUDE-zh.md. See docs/decisions/README.md for the rationale and drift trade-off. -->

# 代理说明

本项目是 [open-scaffold](https://github.com/graphanov/open-scaffold)，一个运行时中立、仓库原生的操作系统，用于由代理编排的开发。它随附持久化项目结构——使命、路线图、不可变计划、修订协议、决策、证据、运行包以及会话交接实践——使任何代理或编排器（Hermes、Claw/OpenClaw、Claude Code、Codex、Gemini 或类似工具）都能从 commit #1 起在仓库中工作，而无需重新解释。

## Layered architecture

open-scaffold 有多个层次。**core system** 是与框架无关的仓库纪律：使命、路线图、计划、修订、证据、运行包、操作员报告和交接。Hermes、Claw/OpenClaw、Claude Code、Codex、Gemini 等 **Orchestrators/agents** 可以基于这一底层结构工作。OMC 和 OMX 等 **Runtime harnesses** 通过工作流模式扩展 Claude Code/Codex；它们并不等同于 Hermes 或 Claw 这类编排器。有关本体，请查阅 `docs/OPEN_SCAFFOLD_SYSTEM.md`；有关 task/run/operator-surface 身份，请查阅 `docs/TASK_RUN_MODEL.md`；有关 issue/PR/Codex-review 可追踪性，请查阅 `docs/GITHUB_WORKFLOW.md`；有关阶段指导，请查阅 `docs/WORKFLOW.md`。

## Project facts

- **使命的事实来源：** `MISSION.md` — 目标、非目标以及范围转向的变更日志。
- **方向的路线图来源：** `ROADMAP.md` — 产品/系统里程碑，以及从路线图条目到 issue/task、计划、运行包、PR 和发布说明的自我 dogfood 链条。
- **系统本体：** `docs/OPEN_SCAFFOLD_SYSTEM.md` — Open Scaffold core、orchestrators/agents、OMC/OMX runtime harnesses、task bridges、glass-cockpit surfaces 和 GitHub 的边界图。
- **Task/run 模型：** `docs/TASK_RUN_MODEL.md` — 用于持久工作的 `task_id`、用于一次执行尝试的 `run_id`、用于操作员提示的 `question_id`，以及作为可选绑定的 chat/thread ids。
- **Slice close 协议：** `docs/SLICE_CLOSE_PROTOCOL.md` — 证据回执、postflight 决策、批准强度、修正路由以及下一 slice 继承。
- **Glass cockpit 协议：** `docs/GLASS_COCKPIT_PROTOCOL.md` — 用于状态、阻塞项、问题、批准、证据回执、PR 链接以及 build-in-public streams 的事件词汇。
- **Runtime binding 合同：** `docs/RUNTIME_BINDING_CONTRACT.md` — 在 core 之外消费运行包的 OMC/OMX/plain-agent/human 绑定的生命周期/职责。
- **GitHub 工作流：** `docs/GITHUB_WORKFLOW.md` — issue → task/run → branch/PR → CI/Codex review → human approval → merge 的可追踪性。
- **计划目录：** `.osc/plans/` — 不可变计划文件，按阶段子文件夹（`active/`、`backlog/`、`done/`、`blocked/`）组织，每个 task/feature slice 一个文件，并遵循 `.osc/plans/handoff-template.md` 中的 7 节 schema。文件夹本身就是状态——移动规则见 `.osc/plans/WORKFLOW.md`。
- **修订：** 新认知会成为与父计划位于同一阶段文件夹中的 `<plan-slug>-amendment-<n>.md`，由 `osc amend <plan-slug> --message "<what changed>"` / `npx open-scaffold amend ...` 或 shell fallback `./amend.sh <plan-slug>` 搭建。计划绝不原地编辑；修订文件和 MISSION.md 的 changelog 绝不手写。
- **生命周期辅助工具：** 对于 npm/day-two 路径，优先使用 `osc amend <plan-slug> --message "<what changed>"` 和 `osc close <plan-slug> --message "<what shipped>"`。Shell fallbacks 仍为 `./amend.sh <plan-slug>` 和 `./close.sh <plan-slug>`；这些脚本保留其脚本专属 flag，例如 `--stage` 和 `--backlog`。
- **快速规则：** `.osc/RULES.md` — 精简的不可协商原则。对项目结构采取任何重大操作前都要重读。
- **决策目录：** `docs/decisions/README.md` — 公开的设计选择页面。完整 ADR 记录内部保存在 `.osc-dev/decisions/`，不会公开发布。
- **发布 / 证据说明：** `.osc/releases/` 在 GitHub Releases 过重或尚未创建时，为有意义的产品 slice 捕获 scaffold-native 发布证据。说明应引用路线图条目、issue/task、计划、运行 ID、PR、验证和后续工作。
- **所有者工作区：** `.osc-dev/` — gitignored；仅在处理 open-scaffold 本身时填充，不会出现在克隆的模板中。它在 `plans/`、`decisions/`、`specs/` 和 `snapshots/` 中保存完整决策历史。**在提出对 scaffold 本身的架构变更前，先阅读 `.osc-dev/plans/` 和 `.osc-dev/decisions/`**——许多设计问题已经在那里调查过。Grep/Glob 工具默认会跳过 gitignored 路径；搜索时请显式包含 `.osc-dev/`。
- **工作流地图：** `docs/WORKFLOW.md` — 阶段到工具到命令的速查表。
- **Bootstrap：** `bootstrap.sh` — 可选的幂等设置；创建惰性目录并给 MISSION.md changelog 打戳。

## Operating rules

1. **在建议或编写代码之前阅读 `MISSION.md`。** 如果它包含标记 `<!-- mission:unset -->` 或字面量 `TODO: define mission`，则将使命视为未定义。先引导用户定义其使命（通过 `./bootstrap.sh` 或直接编辑），再继续。用户可以通过明确指令覆盖并要求跳过。
2. **每个非平凡变更都必须追踪到一个计划文件**，该文件位于 `.osc/plans/` 并遵循 handoff template schema。
3. **不要原地编辑计划。** 如果新信息改变了计划的目标或验收标准，运行 `osc amend <plan-slug> --message "<what changed>"` 或 `./amend.sh <plan-slug>`——该辅助工具会自动编号修订文件、搭建 5 节 schema，并给 MISSION.md 的 changelog 打戳。填写它留下的 `TODO:` 章节。绝不手写修订文件，绝不手动编辑 MISSION.md 的 changelog 来记录修订，也绝不修改父计划文件。
4. **验证要追踪到验收标准。** 针对计划的验收标准运行 `./verify.sh` 以及任何 adapter-native 验证，而不是凭感觉。
5. **当你“变聪明”时**（出现了会正当地改变范围的新信息），以对话方式驱动修订流程：(a) 询问用户具体发生了什么变化以及原因，(b) 用用户自己的口吻总结给他们，(c) 运行 `osc amend <plan-slug> --message "<what changed>"` 或 `./amend.sh <plan-slug>`，(d) 用他们的总结填写生成的修订文件中的 `TODO:` 章节，(e) 在暂存前向他们展示 diff 供审阅。不要静默集成新功能；不要拒绝合理演进。
6. **查阅 `docs/WORKFLOW.md`**，当你不确定自己处于哪个阶段或哪种工具适合该任务时。
7. **在非平凡代码变更前运行合规检查。** 执行 `./verify.sh --quick --quiet` 并检查退出码。退出码 0：静默继续（不要提及验证）。退出码 1：阅读失败输出，硬性阻止，并按第一个失败检查进行重定向。检查使用渐进披露：先运行使命检查；只有在使命已定义后，计划检查才会激活。如果使命未定义，引导去定义它。如果使命已定义但不存在计划，引导去创建计划。`--quiet` flag 在成功时抑制输出，但出错时会打印失败详情。如果无法执行 shell 命令，则直接检查：先确认 `MISSION.md` 不包含 `<!-- mission:unset -->`；只有使命已定义时，再检查 `.osc/plans/` 及其阶段子文件夹（`active/`、`backlog/`、`done/`、`blocked/`）中是否至少包含一个模板以外的计划文件。
8. **在计划中发现委派机会。** 执行 `.osc/plans/` 中的计划时，检查是否存在 `## Execution strategy` 章节。若存在：阅读并行组与依赖关系，向用户提出并行化建议（点名具体组和任务），并在标记为并行的任务共享文件或存在未声明依赖时发出警告。当执行需要 OMC/OMX 或其他 harness 时，创建或请求绑定的运行包（`osc run <plan> --task-id ... --executor ...`），而不是把 chat thread 或 runtime session 视为规范状态。对于代码/公开文档变更，将同一追踪关系带入 GitHub PR template，并在可用时触发 Codex review。若不存在，则照常继续——该章节是可选的。对于没有能力代理的设置，`./delegate.sh <plan-path>` 会从 Execution Strategy 章节生成可操作的终端提示。

## Scope evolution protocol

完整规则见 `.osc/plans/README.md`（少于 200 词）。摘要：计划不可变；修订按数字顺序叠加；MISSION.md 的 changelog 记录每次转向；代理按顺序读取原始计划及其所有修订。**修订由 `osc amend <plan-slug> --message "<what changed>"` 或 `./amend.sh <plan-slug>` 机械搭建**——辅助工具会自动编号文件、写入 5 节 schema（Parent / Date / Learning / New direction / Impact on acceptance criteria），并给 MISSION.md 的 changelog 打戳。代理填写 `TODO:` 章节；它们绝不手写修订文件，也绝不为了修订记账而手动编辑 MISSION.md。

## Verification marker convention

`MISSION.md` 随附 `<!-- mission:unset -->`，这是机器可检测的“使命尚未定义”标记。验证工具（adapter-native 命令、自定义脚本、代码审阅器）应将其存在视为任何扩展范围工作的阻塞项。open-scaffold 定义该标记；消费工具决定如何遵守它。
