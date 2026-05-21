<!-- TRANSLATION: This is a machine-assisted Japanese (ja) translation. The canonical source is the English CLAUDE.md. Report discrepancies at https://github.com/graphanov/open-scaffold/issues. Last synced: 2026-05-21. -->

<!-- PAIRED TRANSLATION VIEW: this file and AGENTS-ja.md carry the same translated project facts in formats each tool reads natively. Edits here MUST be mirrored in AGENTS-ja.md. See docs/decisions/README.md for the rationale and drift trade-off. -->

# プロジェクトコンテキスト

このプロジェクトは [open-scaffold](https://github.com/graphanov/open-scaffold) です。これは、エージェントが編成する開発のための、ランタイム中立でリポジトリネイティブなオペレーティングシステムです。ミッション、ロードマップ、不変の計画、修正プロトコル、意思決定、証拠、実行パケット、セッション引き継ぎの慣行からなる永続的なプロジェクト構造を同梱しているため、任意のエージェントまたはオーケストレーターは、commit #1 から再説明なしにこのリポジトリ内で作業できます。最初にこのファイルを読み、その後 `MISSION.md` を参照して、このプロジェクトが実際に何であるかを確認してください。

## Layered architecture

open-scaffold には複数の層があります。**core system** は、フレームワーク非依存のリポジトリ規律です。すなわち、ミッション、ロードマップ、計画、修正、証拠、実行パケット、オペレーター報告、引き継ぎです。Hermes、Claw/OpenClaw、Claude Code、Codex、Gemini などの **Orchestrators/agents** は、この基盤に対して動作できます。OMC や OMX などの **Runtime harnesses** は、ワークフローモードで Claude Code/Codex を拡張しますが、Hermes や Claw のようなオーケストレーターと同等ではありません。オントロジーについては `docs/OPEN_SCAFFOLD_SYSTEM.md`、task/run/operator-surface identity については `docs/TASK_RUN_MODEL.md`、issue/PR/Codex-review のトレーサビリティについては `docs/GITHUB_WORKFLOW.md`、フェーズの指針については `docs/WORKFLOW.md` を参照してください。

## Where things live

- **`MISSION.md`** — プロジェクトのミッション、目標、非目標。私たちが「何を」構築しているかについての信頼できる情報源です。すべてのスコープ転換を記録する明示的な `## Changelog` セクションを含みます。
- **`ROADMAP.md`** — 製品/システムのマイルストーン、およびロードマップ項目から issue/task、計画、実行パケット、PR、リリースノートまでの self-dogfood チェーン。
- **`docs/OPEN_SCAFFOLD_SYSTEM.md`** — Open Scaffold core、orchestrators/agents、OMC/OMX runtime harnesses、task bridges、glass-cockpit surfaces、GitHub の境界マップ。
- **`docs/TASK_RUN_MODEL.md`** — task/run/operator-surface identity model：`task_id`、`run_id`、`question_id`、runtime bindings、chat/thread bindings。
- **`docs/SLICE_CLOSE_PROTOCOL.md`** — 証拠レシート、postflight decisions、承認強度、修正ルーティング、次 slice への継承。
- **`docs/GLASS_COCKPIT_PROTOCOL.md`** — status、blockers、questions、approvals、evidence receipts、PR links、build-in-public streams のためのイベント語彙。
- **`docs/RUNTIME_BINDING_CONTRACT.md`** — core の外で実行パケットを消費する OMC/OMX/plain-agent/human bindings のライフサイクル/責任。
- **`docs/GITHUB_WORKFLOW.md`** — GitHub issue、PR template、Codex connector review、CI、merge/release のトレーサビリティ。
- **`.osc/plans/`** — stage サブフォルダー（`active/`、`backlog/`、`done/`、`blocked/`）に整理された計画ファイル。フォルダー自体がステータスです。計画は commit 後 **不変** です。新しい学びは、親計画と同じ stage フォルダー内の `<slug>-amendment-<n>.md` という名前の修正ファイルになります。`.osc/plans/handoff-template.md` の handoff template は、すべての計画が従う正確な 7 セクション schema を定義します。stage フォルダー間の移動ルールは `.osc/plans/WORKFLOW.md` を参照してください。
- **`docs/decisions/`** — `README.md` は公開用の設計選択ページ（paired views、immutable plans、adapter-mediated orchestration）です。これらの決定を支える完全な ADR 記録は内部的に `.osc-dev/decisions/` にあり、公開テンプレートには同梱されません。
- **`.osc/releases/`** — 意味のある product slices のための scaffold-native なリリース/証拠ノート。各ノートはロードマップ項目、issue/task、計画、run ID、PR、検証、フォローアップ作業を引用するべきです。
- **`.osc-dev/`**（gitignored。open-scaffold 自体に取り組むときだけ配置され、クローンされたテンプレートには含まれません）— 所有者の内部ワークスペースで、`plans/`、`decisions/`（完全な ADR 記録）、`specs/`、`snapshots/` を保持します。**scaffold 自体へのアーキテクチャ変更を提案する前に、まず `.osc-dev/plans/` と `.osc-dev/decisions/` を読んでください**。多くの設計問題はすでにそこで調査されており、却下された決定を再導出することはセッションの無駄になります。Grep/Glob tools はデフォルトで gitignored paths をスキップします。検索時は `.osc-dev/` を明示的に含めてください。
- **`docs/WORKFLOW.md`** — フェーズからツール、コマンドへのチートシート。各開発フェーズでどの agent/skill を使うべきかを示します。
- **`bootstrap.sh`** — 任意の冪等な day-one セットアップ。遅延作成ディレクトリ（`.osc/research/`、`.osc/state/`）を作成し、MISSION.md の changelog に bootstrap 日付をスタンプします。
- **Lifecycle helpers** — npm/day-two パスでは、`osc amend <plan-slug> --message "<what changed>"` と `osc close <plan-slug> --message "<what shipped>"` を優先してください。Shell fallbacks は引き続き `./amend.sh <plan-slug>` と `./close.sh <plan-slug>` です。スクリプトは `--stage` や `--backlog` など、スクリプト固有の flags を保持します。
- **`.osc/RULES.md`** — コンパクトで交渉不可の原則。プロジェクト構造に対する主要な操作の前に再読してください。

## Compliance checks

重要なコード変更の前に、`./verify.sh --quick --quiet` を実行し、終了コードを確認します：

- **終了コード 0（すべてのチェックに合格）→** 静かに進みます。ユーザーに検証のことを言わないでください。
- **終了コード 1（いずれかのチェックが失敗）→** 失敗出力を読み、最初の失敗チェックでハードブロックします：
  - **ミッション未定義 →** 停止します。こう言ってください：「ミッションがまだ定義されていません。今定義しましょう——このプロジェクトは何ですか？」 MISSION.md の記入をユーザーに案内します（または `./bootstrap.sh` を実行します）。ミッションが定義されるか、ユーザーが明示的にスキップすると言うまで進めないでください。注意：計画チェックはミッションチェックの後ろでゲートされています。ミッションが定義されるまで表示されません（段階的開示）。
  - **計画ファイルなし →**（ミッション定義後にのみ表示されます）停止します。こう言ってください：「この作業には計画がありません。作成しましょう——何を作ろうとしていますか？」 handoff template を使用して `.osc/plans/` に計画を作成します。計画が存在するか、ユーザーが明示的にスキップすると言うまで進めないでください。

`--quiet` flag は、すべてのチェックが通ったときに出力を抑制します（成功時はノイズゼロ）が、問題がある場合は失敗詳細を表示します。ユーザーはいつでも「skip verification」「just do it」または類似の表現で上書きできます。ユーザーの自律性を尊重しますが、デフォルトはまず違反を修正することです。

shell commands を実行できない場合は、直接確認してください。まず `MISSION.md` に `<!-- mission:unset -->` が含まれていないことを確認します。ミッションが定義されている場合に限り、`.osc/plans/` とその stage サブフォルダー（`active/`、`backlog/`、`done/`、`blocked/`）に、`README.md` と `handoff-template.md` 以外の `.md` 計画ファイルが少なくとも 1 つあることを確認します。

## How to verify

- `./verify.sh`（または完全なコンプライアンス確認には `./verify.sh --strict`）を実行し、方法論の遵守を確認します。Runtime harness handoffs が検証をラップする場合もありますが、受け入れ基準の証拠と `./verify.sh` が引き続き信頼できる情報源です。
- MISSION.md には `<!-- mission:unset -->` マーカーとリテラル `TODO: define mission`が同梱されています。検証ツールは、いずれかが存在することを「ミッションはまだ定義されていない」と扱うべきです。実際のミッションが書かれたときだけ両方を削除してください。
- 任意の feature slice について、検証は `.osc/plans/` の計画ファイル内の受け入れ基準にさかのぼれる必要があります。

## Scope evolution protocol

正当なスコープ進化（「賢くなった」ケース——新情報によって何を構築すべきかが変わる場合）は、静かな編集ではなく修正プロトコルによって捕捉されます。完全なプロトコルは `.osc/plans/README.md`（200 語未満）に文書化されています。短い版：

1. `.osc/plans/` 内の計画は commit 後、不変です。
2. 新しい学びは、親計画と同じ stage フォルダー内の `<plan-slug>-amendment-<n>.md` ファイルになります。これは **`osc amend <plan-slug> --message "<what changed>"` または `./amend.sh <plan-slug>` によって scaffold される** もので、手書きではありません。
3. MISSION.md の `## Changelog` セクションは修正ごとに 1 行のエントリを受け取ります。これは **ヘルパーがスタンプする** もので、手編集ではありません。
4. エージェントと人間は、元の計画に加えてすべての修正を番号順に読みます。

計画をその場で編集しないでください。修正の記帳のために修正ファイルや MISSION.md の changelog を手編集しないでください。機械的な作業は `osc amend` または `amend.sh` に任せます。計画ファイルまたは修正に追跡できない機能を追加しないでください。新しい要件が届いたら、まず修正を書き、それから実装します。

### Agent-driven amendment flow

ユーザーが「賢くなった」瞬間を示したとき（新情報が計画の目標、制約、または受け入れ基準を変える場合）は、会話で修正を進めます：

1. 計画が書かれてから具体的に何が変わり、なぜスコープが変わるのかをユーザーに尋ねます。何かを書く前に、ユーザーの言葉で要約して返します。
2. リポジトリルートから `osc amend <plan-slug> --message "<what changed>"` または `./amend.sh <plan-slug>` を実行します。ヘルパーは修正を自動採番し、5 セクション schema（Parent / Date / Learning / New direction / Impact on acceptance criteria）を scaffold し、MISSION.md の changelog にスタンプします。
3. ユーザーの要約を使って、新しい修正ファイル内の 3 つの `TODO:` セクションを埋めます。MISSION.md には触れないでください。ヘルパーがすでにスタンプしています。
4. stage する前に、新しい修正ファイルと MISSION.md changelog 行の diff をユーザーに見せてレビューしてもらいます。shell fallback を使っている場合は、再実行時に `--stage` を渡すか、承認後に手動で stage します。
5. 修正ファイルを手書きしないでください。修正のために MISSION.md の changelog を手編集しないでください。親計画ファイルを変更しないでください。

## Delegation detection

`.osc/plans/` の計画を実行するときは、`## Execution strategy` セクションが含まれているか確認します。存在する場合：

1. **並列グループと依存関係を読みます。** どのタスクが同時に実行でき、どのタスクが前提条件を待つ必要があるかを特定します。
2. **ユーザーに委任を提案します：**
   - **OMC harness を使う場合：** 適切なグループには `/team`、`/ultrawork`、`/ralph` などの Claude Code/OMC workflows を提案します。グループとタスクを明示的に名指ししてください。
   - **OMX harness を使う場合：** `$team`、`$ralph`、`$ultrawork`、`$ralplan` などの Codex/OMX workflows を提案し、runtime evidence を scaffold chain に戻すよう促します。
   - **runtime harness がない場合：** 並列化の機会を平文で説明します（例：「タスク T1 と T5 は独立しており、別々のセッションで実行できます」）。どう行動するかはユーザーが決めます。
3. **危険な並列化について警告します。** Execution Strategy で並列とマークされたタスクが、計画の “Files to touch” セクションに列挙されたファイルを共有している場合、またはタスクの依存関係が同じ並列グループ内にある場合は、続行前に競合を指摘します。
4. **harness 実行を実行パッケージにバインドします。** 実行に OMC/OMX または別の harness が必要な場合は、chat thread や runtime session を正準状態として扱うのではなく、バインドされた実行パッケージ（`osc run <plan> --task-id ... --executor ...`）を作成または要求します。コード/公開ドキュメント変更では、同じトレースを GitHub PR template に持ち込み、利用可能なら Codex review をトリガーします。

計画に Execution Strategy セクションがない場合は、通常どおり進めます。このセクションは任意であり、multi-agent または parallel work の場合にのみ存在します。

対応可能なエージェントを持たないユーザー（local LLMs、手動ワークフロー）のために、`./delegate.sh <plan-path>` スクリプトは Execution Strategy セクションを読み、別々の terminal sessions に貼り付け可能な実行可能プロンプトを生成します。

## Workflow

フェーズからツールへのチートシート（deep interview、planning、OMC `/ralph`/`/team`、OMX `$ralph`/`$team`、adapter handoffs、verify、amendment capture）については `docs/WORKFLOW.md` を参照してください。
