<!-- TRANSLATION: This is a machine-assisted Korean translation. The canonical source is the English CLAUDE.md. Report discrepancies at https://github.com/graphanov/open-scaffold/issues. Last synced: 2026-05-21. -->

<!-- PAIRED TRANSLATION VIEW: this file and AGENTS-ko.md carry the same translated project facts in formats each tool reads natively. Edits here MUST be mirrored in AGENTS-ko.md. See docs/decisions/README.md for the rationale and drift trade-off. -->

# 프로젝트 컨텍스트

이 프로젝트는 [open-scaffold](https://github.com/graphanov/open-scaffold)이며, 에이전트가 오케스트레이션하는 개발을 위한 런타임 중립적이고 리포지토리 네이티브인 운영 체계입니다. 미션, 로드맵, 불변 계획, 수정 프로토콜, 결정, 증거, 실행 패킷, 세션 인계 관행으로 이루어진 지속적인 프로젝트 구조를 제공하여 모든 에이전트 또는 오케스트레이터가 커밋 #1부터 별도의 재설명 없이 이 리포지토리에서 작업할 수 있게 합니다. 이 파일을 먼저 읽은 다음, 프로젝트가 실제로 무엇인지 확인하려면 `MISSION.md`를 참고하세요.

## Layered architecture

open-scaffold에는 여러 계층이 있습니다. **핵심 시스템**은 프레임워크에 독립적인 리포지토리 규율입니다: 미션, 로드맵, 계획, 수정, 증거, 실행 패킷, 운영자 보고서, 인계. Hermes, Claw/OpenClaw, Claude Code, Codex, Gemini 같은 **오케스트레이터/에이전트**는 이 기반 위에서 작동할 수 있습니다. OMC 및 OMX 같은 **런타임 하네스**는 워크플로 모드로 Claude Code/Codex를 확장하지만, Hermes나 Claw 같은 오케스트레이터와 동일하지 않습니다. 온톨로지는 `docs/OPEN_SCAFFOLD_SYSTEM.md`, task/run/operator-surface 정체성은 `docs/TASK_RUN_MODEL.md`, issue/PR/Codex-review 추적성은 `docs/GITHUB_WORKFLOW.md`, 단계별 지침은 `docs/WORKFLOW.md`를 참고하세요.

## Where things live

- **`MISSION.md`** — 프로젝트의 미션, 목표, 비목표입니다. 우리가 *무엇을* 만드는지에 대한 진실 공급원입니다. 모든 범위 전환을 기록하는 명시적인 `## Changelog` 섹션을 포함합니다.
- **`ROADMAP.md`** — 제품/시스템 마일스톤과 로드맵 항목에서 issue/task, 계획, 실행 패킷, PR, 릴리스 노트로 이어지는 self-dogfood 체인입니다.
- **`docs/OPEN_SCAFFOLD_SYSTEM.md`** — Open Scaffold 핵심, 오케스트레이터/에이전트, OMC/OMX 런타임 하네스, 태스크 브리지, glass-cockpit 표면, GitHub의 경계 지도입니다.
- **`docs/TASK_RUN_MODEL.md`** — 태스크/실행/운영자 표면 정체성 모델입니다: `task_id`, `run_id`, `question_id`, 런타임 바인딩, chat/thread 바인딩.
- **`docs/SLICE_CLOSE_PROTOCOL.md`** — 증거 영수증, postflight 결정, 승인 강도, 수정 라우팅, 다음 슬라이스 상속입니다.
- **`docs/GLASS_COCKPIT_PROTOCOL.md`** — 상태, 차단 요소, 질문, 승인, 증거 영수증, PR 링크, build-in-public 스트림을 위한 이벤트 어휘입니다.
- **`docs/RUNTIME_BINDING_CONTRACT.md`** — 핵심 외부에서 실행 패킷을 소비하는 OMC/OMX/plain-agent/human 바인딩의 수명주기/책임입니다.
- **`docs/GITHUB_WORKFLOW.md`** — GitHub issue, PR 템플릿, Codex connector review, CI, merge/release 추적성입니다.
- **`.osc/plans/`** — 단계 하위 폴더(`active/`, `backlog/`, `done/`, `blocked/`)로 구성된 계획 파일입니다. 폴더가 곧 상태입니다. 계획은 커밋된 뒤에는 **불변**입니다. 새로운 학습 내용은 부모와 같은 단계 폴더에 `<slug>-amendment-<n>.md`라는 수정 파일이 됩니다. `.osc/plans/handoff-template.md`의 handoff 템플릿은 모든 계획이 따르는 정확한 7개 섹션 스키마를 정의합니다. 단계 폴더 간 이동 규칙은 `.osc/plans/WORKFLOW.md`를 보세요.
- **`docs/decisions/`** — `README.md`는 공개 설계 선택 페이지입니다(짝지어진 보기, 불변 계획, 어댑터 매개 오케스트레이션). 이러한 결정을 뒷받침하는 전체 ADR 기록은 내부적으로 `.osc-dev/decisions/`에 있으며 공개 템플릿과 함께 배포되지 않습니다.
- **`.osc/releases/`** — 의미 있는 제품 슬라이스를 위한 scaffold-native 릴리스/증거 노트입니다. 각 노트는 로드맵 항목, issue/task, 계획, 실행 ID, PR, 검증, 후속 작업을 인용해야 합니다.
- **`.osc-dev/`** (gitignored 상태이며, 복제된 템플릿이 아니라 open-scaffold 자체를 작업할 때만 채워짐) — 소유자의 내부 작업공간으로 `plans/`, `decisions/`(전체 ADR 기록), `specs/`, `snapshots/`를 보관합니다. **스캐폴드 자체의 아키텍처 변경을 제안하기 전에 먼저 `.osc-dev/plans/`와 `.osc-dev/decisions/`를 읽으세요** — 많은 설계 질문이 이미 거기서 조사되었고, 거부된 결정을 다시 도출하면 세션을 낭비합니다. Grep/Glob 도구는 기본적으로 gitignored 경로를 건너뜁니다. 검색할 때 `.osc-dev/`를 명시적으로 포함하세요.
- **`docs/WORKFLOW.md`** — 단계-도구-명령 치트시트입니다. 각 개발 단계에서 어떤 에이전트/스킬을 사용할지 알려 줍니다.
- **`bootstrap.sh`** — 선택적이고 멱등적인 day-one 설정입니다. lazy 디렉터리(`.osc/research/`, `.osc/state/`)를 만들고 MISSION.md의 변경 이력에 부트스트랩 날짜를 찍습니다.
- **수명주기 헬퍼** — npm/day-two 경로에서는 `osc amend <plan-slug> --message "<what changed>"` 및 `osc close <plan-slug> --message "<what shipped>"`를 선호하세요. 셸 대체 명령은 계속 `./amend.sh <plan-slug>` 및 `./close.sh <plan-slug>`이며, 스크립트는 `--stage`, `--backlog` 같은 스크립트별 플래그를 유지합니다.
- **`.osc/RULES.md`** — 간결한 비협상 원칙입니다. 프로젝트 구조에 대한 주요 작업 전에 다시 읽으세요.

## Compliance checks

중요한 코드 변경 전에 `./verify.sh --quick --quiet`를 실행하고 종료 코드를 확인하세요:

- **Exit 0 (모든 검사 통과) →** 조용히 진행합니다. 사용자에게 검증을 언급하지 마세요.
- **Exit 1 (검사 실패) →** 실패 출력을 읽은 뒤 첫 번째 실패 검사에서 강하게 차단하세요:
  - **Mission undefined →** 중지하세요. 다음과 같이 말하세요: "아직 미션이 정의되지 않았습니다. 지금 정의해 봅시다 — 이 프로젝트는 무엇인가요?" 사용자가 MISSION.md를 채우도록 안내하세요(또는 `./bootstrap.sh` 실행). 미션이 정의되거나 사용자가 명시적으로 건너뛰라고 할 때까지 진행하지 마세요. 참고: 계획 검사는 미션 검사 뒤에 게이트되어 있으므로 미션이 정의될 때까지 나타나지 않습니다(점진적 공개).
  - **No plan file →** (미션이 정의된 뒤에만 나타남) 중지하세요. 다음과 같이 말하세요: "이 작업에 대한 계획이 없습니다. 하나 만들어 봅시다 — 무엇을 만들려고 하나요?" handoff 템플릿을 사용해 `.osc/plans/`에 계획을 만드세요. 계획이 있거나 사용자가 명시적으로 건너뛰라고 할 때까지 진행하지 마세요.

`--quiet` 플래그는 모든 검사가 통과하면 출력을 억제하지만(성공 시 소음 없음), 문제가 있으면 실패 세부 정보를 출력합니다. 사용자는 언제든 "검증 건너뛰기", "그냥 해" 또는 유사한 말로 재정의할 수 있습니다. 사용자의 자율성을 존중하되, 기본값은 위반을 먼저 고치는 것입니다.

셸 명령을 실행할 수 없다면 직접 확인하세요: 먼저 `MISSION.md`에 `<!-- mission:unset -->`가 없는지 확인하세요. 미션이 정의된 경우에만 `.osc/plans/`와 그 단계 하위 폴더(`active/`, `backlog/`, `done/`, `blocked/`)에 `README.md` 및 `handoff-template.md` 외의 `.md` 계획 파일이 하나 이상 있는지 확인하세요.

## How to verify

- 방법론 준수를 확인하려면 `./verify.sh`를 실행하세요(전체 준수는 `./verify.sh --strict`). 런타임 하네스 인계가 검증을 감쌀 수 있지만, 승인 기준 증거와 `./verify.sh`가 진실 공급원으로 남습니다.
- MISSION.md는 `<!-- mission:unset -->` 마커와 리터럴 `TODO: define mission`를 포함하여 배포됩니다. 검증 도구는 둘 중 하나가 있으면 "미션이 아직 정의되지 않음"으로 취급해야 합니다. 실제 미션을 작성한 뒤에만 둘 다 제거하세요.
- 모든 feature 슬라이스에 대해 검증은 `.osc/plans/` 아래 계획 파일의 승인 기준으로 다시 추적되어야 합니다.

## Scope evolution protocol

정당한 범위 진화("더 똑똑해졌다" 사례 — 새 정보가 우리가 만들어야 할 것을 바꾸는 경우)는 조용한 편집이 아니라 수정 프로토콜로 포착됩니다. 전체 프로토콜은 `.osc/plans/README.md`에 문서화되어 있습니다(200단어 미만). 짧은 버전:

1. `.osc/plans/`의 계획은 커밋된 뒤에는 불변입니다.
2. 새로운 학습 내용은 부모와 같은 단계 폴더에 `<plan-slug>-amendment-<n>.md` 파일이 됩니다 — 직접 작성하지 말고 **`osc amend <plan-slug> --message "<what changed>"` 또는 `./amend.sh <plan-slug>`로 스캐폴딩해야 합니다**.
3. MISSION.md의 `## Changelog` 섹션은 수정마다 한 줄 항목을 받습니다 — 직접 편집하지 말고 **헬퍼가 도장을 찍습니다**.
4. 에이전트와 사람은 원래 계획과 모든 수정을 번호 순서대로 함께 읽습니다.

계획을 제자리에서 편집하지 마세요. 수정 파일이나 MISSION.md의 변경 이력을 수정 기록 관리 목적으로 직접 편집하지 마세요 — `osc amend` 또는 `amend.sh`가 기계적인 작업을 하게 두세요. 계획 파일이나 수정으로 추적되지 않는 기능을 추가하지 마세요. 새 요구사항이 들어오면 먼저 수정을 작성한 다음 구현하세요.

### Agent-driven amendment flow

사용자가 "더 똑똑해졌다" 순간(새 정보가 계획의 목표, 제약, 승인 기준을 바꾸는 경우)을 알리면 수정 작업을 대화식으로 진행하세요:

1. 계획이 작성된 이후 무엇이 구체적으로 바뀌었고 왜 범위를 바꾸는지 사용자에게 물어보세요. 무엇이든 쓰기 전에 사용자의 말을 그 사람의 표현으로 다시 요약하세요.
2. 리포지토리 루트에서 `osc amend <plan-slug> --message "<what changed>"` 또는 `./amend.sh <plan-slug>`를 실행하세요. 헬퍼는 수정 번호를 자동으로 매기고, 5개 섹션 스키마(Parent / Date / Learning / New direction / Impact on acceptance criteria)를 스캐폴딩하며, MISSION.md의 변경 이력에 도장을 찍습니다.
3. 새 수정 파일에서 헬퍼가 남긴 세 개의 `TODO:` 섹션을 사용자의 요약으로 채우세요. MISSION.md는 직접 건드리지 마세요 — 헬퍼가 이미 도장을 찍었습니다.
4. 스테이징하기 전에 새 수정 파일과 MISSION.md 변경 이력 줄의 diff를 사용자에게 보여 검토를 받으세요. 셸 대체 명령을 사용하는 경우 재실행할 때 `--stage`를 전달하거나, 사용자가 승인한 뒤 수동으로 스테이징하세요.
5. 수정 파일을 직접 작성하지 말고, 수정을 위해 MISSION.md의 변경 이력을 수동 편집하지 말고, 부모 계획 파일을 수정하지 마세요.

## Delegation detection

`.osc/plans/`의 계획을 실행할 때 `## Execution strategy` 섹션이 포함되어 있는지 확인하세요. 있으면:

1. **병렬 그룹과 의존성을 읽으세요.** 어떤 태스크를 동시에 실행할 수 있고 어떤 태스크가 선행 조건을 기다려야 하는지 식별하세요.
2. **사용자에게 위임을 제안하세요:**
   - **OMC 하네스 사용 시:** 적합한 그룹에 대해 `/team`, `/ultrawork`, `/ralph` 같은 Claude Code/OMC 워크플로를 제안하세요. 그룹과 태스크 이름을 명시하세요.
   - **OMX 하네스 사용 시:** `$team`, `$ralph`, `$ultrawork`, `$ralplan` 같은 Codex/OMX 워크플로를 제안하고, 런타임 증거를 다시 스캐폴드 체인으로 승격하세요.
   - **런타임 하네스가 없을 때:** 병렬화 기회를 일반 텍스트로 설명하세요(예: "태스크 T1과 T5는 독립적이므로 별도 세션에서 실행할 수 있습니다"). 어떻게 실행할지는 사용자가 결정합니다.
3. **위험한 병렬화에 대해 경고하세요.** Execution Strategy에서 병렬로 표시된 태스크가 계획의 "Files to touch" 섹션에 나열된 파일을 공유하거나, 태스크의 의존성이 같은 병렬 그룹에 있으면 진행 전에 충돌을 표시하세요.
4. **하네스 실행을 실행 패키지에 바인딩하세요.** 실행에 OMC/OMX 또는 다른 하네스가 필요할 때는 채팅 스레드나 런타임 세션을 canonical state로 취급하지 말고 바인딩된 실행 패키지(`osc run <plan> --task-id ... --executor ...`)를 만들거나 요청하세요. 코드/공개 문서 변경의 경우 같은 추적을 GitHub PR 템플릿으로 가져가고 가능하면 Codex review를 트리거하세요.

계획에 Execution Strategy 섹션이 없으면 정상적으로 진행하세요 — 이 섹션은 선택 사항이며 multi-agent 또는 병렬 작업에만 존재합니다.

유능한 에이전트가 없는 사용자(로컬 LLM, 수동 워크플로)의 경우 `./delegate.sh <plan-path>` 스크립트가 Execution Strategy 섹션을 읽고 별도 터미널 세션에 붙여 넣을 수 있는 실행 가능한 프롬프트를 생성합니다.

## Workflow

단계-도구 치트시트(deep interview, planning, OMC `/ralph`/`/team`, OMX `$ralph`/`$team`, adapter handoffs, verify, amendment capture)는 `docs/WORKFLOW.md`를 보세요.
