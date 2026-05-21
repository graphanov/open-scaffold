<!-- TRANSLATION: This is a machine-assisted Japanese (ja) translation. The canonical source is the English AGENTS.md. Report discrepancies at https://github.com/graphanov/open-scaffold/issues. Last synced: 2026-05-21. -->

<!-- PAIRED TRANSLATION VIEW: this file and CLAUDE-ja.md carry the same translated project facts in formats each tool reads natively. Edits here MUST be mirrored in CLAUDE-ja.md. See docs/decisions/README.md for the rationale and drift trade-off. -->

# エージェント向け指示

このプロジェクトは [open-scaffold](https://github.com/graphanov/open-scaffold) です。これは、エージェントが編成する開発のための、ランタイム中立でリポジトリネイティブなオペレーティングシステムです。ミッション、ロードマップ、不変の計画、修正プロトコル、意思決定、証拠、実行パケット、セッション引き継ぎの慣行からなる永続的なプロジェクト構造を同梱しているため、任意のエージェントまたはオーケストレーター（Hermes、Claw/OpenClaw、Claude Code、Codex、Gemini、または類似のもの）は、commit #1 から再説明なしにリポジトリ内で作業できます。

## Layered architecture

open-scaffold には複数の層があります。**core system** は、フレームワーク非依存のリポジトリ規律です。すなわち、ミッション、ロードマップ、計画、修正、証拠、実行パケット、オペレーター報告、引き継ぎです。Hermes、Claw/OpenClaw、Claude Code、Codex、Gemini などの **Orchestrators/agents** は、この基盤に対して動作できます。OMC や OMX などの **Runtime harnesses** は、ワークフローモードで Claude Code/Codex を拡張しますが、Hermes や Claw のようなオーケストレーターと同等ではありません。オントロジーについては `docs/OPEN_SCAFFOLD_SYSTEM.md`、task/run/operator-surface identity については `docs/TASK_RUN_MODEL.md`、issue/PR/Codex-review のトレーサビリティについては `docs/GITHUB_WORKFLOW.md`、フェーズの指針については `docs/WORKFLOW.md` を参照してください。

## Project facts

- **ミッションの信頼できる情報源：** `MISSION.md` — 目標、非目標、スコープ転換の変更履歴。
- **方向性のロードマップ情報源：** `ROADMAP.md` — 製品/システムのマイルストーン、およびロードマップ項目から issue/task、計画、実行パケット、PR、リリースノートまでの self-dogfood チェーン。
- **システムオントロジー：** `docs/OPEN_SCAFFOLD_SYSTEM.md` — Open Scaffold core、orchestrators/agents、OMC/OMX runtime harnesses、task bridges、glass-cockpit surfaces、GitHub の境界マップ。
- **Task/run モデル：** `docs/TASK_RUN_MODEL.md` — 永続的な作業のための `task_id`、1 回の実行試行のための `run_id`、オペレータープロンプトのための `question_id`、任意のバインディングとしての chat/thread ids。
- **Slice close プロトコル：** `docs/SLICE_CLOSE_PROTOCOL.md` — 証拠レシート、postflight decisions、承認強度、修正ルーティング、次 slice への継承。
- **Glass cockpit プロトコル：** `docs/GLASS_COCKPIT_PROTOCOL.md` — status、blockers、questions、approvals、evidence receipts、PR links、build-in-public streams のためのイベント語彙。
- **Runtime binding 契約：** `docs/RUNTIME_BINDING_CONTRACT.md` — core の外で実行パケットを消費する OMC/OMX/plain-agent/human bindings のライフサイクル/責任。
- **GitHub ワークフロー：** `docs/GITHUB_WORKFLOW.md` — issue → task/run → branch/PR → CI/Codex review → human approval → merge のトレーサビリティ。
- **計画ディレクトリ：** `.osc/plans/` — stage サブフォルダー（`active/`、`backlog/`、`done/`、`blocked/`）に整理された不変の計画ファイル。task/feature slice ごとに 1 つで、`.osc/plans/handoff-template.md` の 7 セクション schema に準拠します。フォルダー自体がステータスです。移動ルールは `.osc/plans/WORKFLOW.md` を参照してください。
- **修正：** 新しい学びは、親計画と同じ stage フォルダー内の `<plan-slug>-amendment-<n>.md` になります。これは `osc amend <plan-slug> --message "<what changed>"` / `npx open-scaffold amend ...`、または shell fallback の `./amend.sh <plan-slug>` によって scaffold されます。計画は決してその場で編集しません。修正ファイルと MISSION.md の changelog は決して手書きしません。
- **ライフサイクル補助ツール：** npm/day-two パスでは、`osc amend <plan-slug> --message "<what changed>"` と `osc close <plan-slug> --message "<what shipped>"` を優先してください。Shell fallbacks は引き続き `./amend.sh <plan-slug>` と `./close.sh <plan-slug>` です。スクリプトは `--stage` や `--backlog` など、スクリプト固有の flags を保持します。
- **クイックルール：** `.osc/RULES.md` — コンパクトで交渉不可の原則。プロジェクト構造に対する主要な操作の前に再読してください。
- **意思決定ディレクトリ：** `docs/decisions/README.md` — 公開用の設計選択ページ。完全な ADR 記録は内部的に `.osc-dev/decisions/` にあり、公開配布されません。
- **リリース / 証拠ノート：** `.osc/releases/` は、GitHub Releases が重すぎる場合やまだ作成されていない場合に、意味のある product slices の scaffold-native なリリース証拠を記録します。ノートにはロードマップ項目、issue/task、計画、run ID、PR、検証、フォローアップ作業を引用するべきです。
- **所有者ワークスペース：** `.osc-dev/` — gitignored です。open-scaffold 自体に取り組むときだけ配置され、クローンされたテンプレートには含まれません。`plans/`、`decisions/`、`specs/`、`snapshots/` に完全な意思決定履歴を保持します。**scaffold 自体へのアーキテクチャ変更を提案する前に、まず `.osc-dev/plans/` と `.osc-dev/decisions/` を読んでください**。多くの設計問題はすでにそこで調査されています。Grep/Glob tools はデフォルトで gitignored paths をスキップします。検索時は `.osc-dev/` を明示的に含めてください。
- **ワークフローマップ：** `docs/WORKFLOW.md` — フェーズからツール、コマンドへのチートシート。
- **Bootstrap：** `bootstrap.sh` — 任意の冪等なセットアップ。遅延作成ディレクトリを作り、MISSION.md changelog にスタンプします。

## Operating rules

1. **コードを提案または作成する前に `MISSION.md` を読んでください。** その中に `<!-- mission:unset -->` マーカー、またはリテラル `TODO: define mission` が含まれる場合、ミッションは未定義として扱います。続行する前に、ユーザーにミッションを定義するよう促してください（`./bootstrap.sh` または直接編集）。ユーザーは、スキップする明示的な指示で上書きできます。
2. **重要な変更はすべて計画ファイルに追跡可能でなければなりません**。その計画ファイルは `.osc/plans/` にあり、handoff template schema に従う必要があります。
3. **計画をその場で編集しないでください。** 新しい情報が計画の目標または受け入れ基準を変える場合は、`osc amend <plan-slug> --message "<what changed>"` または `./amend.sh <plan-slug>` を実行します。このヘルパーは修正ファイルを自動採番し、5 セクション schema を scaffold し、MISSION.md の changelog にスタンプします。残された `TODO:` セクションを埋めてください。修正ファイルを手書きしてはいけません。修正のために MISSION.md の changelog を手編集してはいけません。親計画ファイルを変更してはいけません。
4. **検証は受け入れ基準に追跡します。** `./verify.sh` と任意の adapter-native verification は、雰囲気ではなく計画の受け入れ基準に対して実行してください。
5. **あなたが「賢くなった」とき**（正当にスコープを変える新情報が届いたとき）は、会話として修正フローを進めます。(a) 何が具体的に変わり、なぜ変わったのかをユーザーに尋ねる、(b) ユーザー自身の言葉で要約して返す、(c) `osc amend <plan-slug> --message "<what changed>"` または `./amend.sh <plan-slug>` を実行する、(d) 生成された修正ファイルの `TODO:` セクションをその要約で埋める、(e) stage する前にレビュー用の diff を見せる。新機能を黙って統合してはいけません。正当な進化を拒否してはいけません。
6. **どのフェーズにいるか、またはどのツールがタスクに適しているか不確かなときは `docs/WORKFLOW.md` を参照してください。**
7. **重要なコード変更の前にコンプライアンスチェックを実行してください。** `./verify.sh --quick --quiet` を実行し、終了コードを確認します。終了コード 0：静かに続行します（検証には触れない）。終了コード 1：失敗出力を読み、最初の失敗チェックでハードブロックしてリダイレクトします。チェックは段階的開示を使用します。ミッションチェックが最初に実行され、ミッションが定義された後にのみ計画チェックが有効になります。ミッションが未定義なら、それを定義するようリダイレクトします。ミッションは定義済みだが計画がない場合は、計画を作成するようリダイレクトします。`--quiet` flag は成功時の出力を抑制しますが、問題がある場合は失敗詳細を出力します。shell commands を実行できない場合は、直接確認してください。まず `MISSION.md` に `<!-- mission:unset -->` が含まれていないことを検証し、ミッションが定義されている場合に限り、`.osc/plans/` とその stage サブフォルダー（`active/`、`backlog/`、`done/`、`blocked/`）にテンプレート以外の計画ファイルが少なくとも 1 つあることを確認します。
8. **計画内の委任機会を検出してください。** `.osc/plans/` の計画を実行するときは、`## Execution strategy` セクションがあるか確認します。存在する場合：並列グループと依存関係を読み、ユーザーに並列化を提案し（具体的なグループとタスク名を挙げる）、並列としてマークされたタスクがファイルを共有している、または未宣言の依存関係を持つ場合は警告します。実行に OMC/OMX または別の harness が必要な場合は、chat thread や runtime session を正準状態として扱うのではなく、バインドされた実行パッケージ（`osc run <plan> --task-id ... --executor ...`）を作成または要求します。コード/公開ドキュメントの変更では、同じトレースを GitHub PR template に持ち込み、利用可能なら Codex review をトリガーします。存在しない場合は通常どおり続行します。このセクションは任意です。対応可能なエージェントを持たない環境では、`./delegate.sh <plan-path>` が Execution Strategy セクションから実行可能な terminal prompts を生成します。

## Scope evolution protocol

完全なルールは `.osc/plans/README.md`（200 語未満）にあります。要約：計画は不変です。修正は番号順に上に重ねられます。MISSION.md の changelog はすべての転換を記録します。エージェントは元の計画とすべての修正を順番に読みます。**修正は `osc amend <plan-slug> --message "<what changed>"` または `./amend.sh <plan-slug>` によって機械的に scaffold されます**。ヘルパーはファイルを自動採番し、5 セクション schema（Parent / Date / Learning / New direction / Impact on acceptance criteria）を書き、MISSION.md の changelog にスタンプします。エージェントは `TODO:` セクションを埋めます。修正ファイルを手書きしたり、修正の記帳のために MISSION.md を手編集したりしてはいけません。

## Verification marker convention

`MISSION.md` は、機械的に検出可能な「ミッションはまだ定義されていない」マーカーとして `<!-- mission:unset -->` を同梱しています。検証ツール（adapter-native commands、custom scripts、code reviewers）は、その存在をスコープ拡大型作業のブロッカーとして扱うべきです。open-scaffold はそのマーカーを定義し、利用するツールがそれをどう尊重するかを決めます。
