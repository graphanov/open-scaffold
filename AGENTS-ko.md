<!-- TRANSLATION: This is a machine-assisted Korean translation. The canonical source is the English AGENTS.md. Report discrepancies at https://github.com/graphanov/open-scaffold/issues. Last synced: 2026-05-21. -->

<!-- PAIRED TRANSLATION VIEW: this file and CLAUDE-ko.md carry the same translated project facts in formats each tool reads natively. Edits here MUST be mirrored in CLAUDE-ko.md. See docs/decisions/README.md for the rationale and drift trade-off. -->

# 에이전트 지침

이 프로젝트는 [open-scaffold](https://github.com/graphanov/open-scaffold)이며, 에이전트가 오케스트레이션하는 개발을 위한 런타임 중립적이고 리포지토리 네이티브인 운영 체계입니다. 미션, 로드맵, 불변 계획, 수정 프로토콜, 결정, 증거, 실행 패킷, 세션 인계 관행으로 이루어진 지속적인 프로젝트 구조를 제공하여 모든 에이전트 또는 오케스트레이터(Hermes, Claw/OpenClaw, Claude Code, Codex, Gemini 또는 유사 도구)가 커밋 #1부터 별도의 재설명 없이 리포지토리에서 작업할 수 있게 합니다.

## Layered architecture

open-scaffold에는 여러 계층이 있습니다. **핵심 시스템**은 프레임워크에 독립적인 리포지토리 규율입니다: 미션, 로드맵, 계획, 수정, 증거, 실행 패킷, 운영자 보고서, 인계. Hermes, Claw/OpenClaw, Claude Code, Codex, Gemini 같은 **오케스트레이터/에이전트**는 이 기반 위에서 작동할 수 있습니다. OMC 및 OMX 같은 **런타임 하네스**는 워크플로 모드로 Claude Code/Codex를 확장하지만, Hermes나 Claw 같은 오케스트레이터와 동일하지 않습니다. 온톨로지는 `docs/OPEN_SCAFFOLD_SYSTEM.md`, task/run/operator-surface 정체성은 `docs/TASK_RUN_MODEL.md`, issue/PR/Codex-review 추적성은 `docs/GITHUB_WORKFLOW.md`, 단계별 지침은 `docs/WORKFLOW.md`를 참고하세요.

## Project facts

- **미션의 진실 공급원:** `MISSION.md` — 목표, 비목표, 범위 전환의 변경 이력입니다.
- **방향의 로드맵 공급원:** `ROADMAP.md` — 제품/시스템 마일스톤과 로드맵 항목에서 issue/task, 계획, 실행 패킷, PR, 릴리스 노트로 이어지는 self-dogfood 체인입니다.
- **시스템 온톨로지:** `docs/OPEN_SCAFFOLD_SYSTEM.md` — Open Scaffold 핵심, 오케스트레이터/에이전트, OMC/OMX 런타임 하네스, 태스크 브리지, glass-cockpit 표면, GitHub의 경계 지도입니다.
- **태스크/실행 모델:** `docs/TASK_RUN_MODEL.md` — 지속적인 작업을 위한 `task_id`, 한 번의 실행 시도를 위한 `run_id`, 운영자 프롬프트를 위한 `question_id`, 선택적 바인딩인 chat/thread ids입니다.
- **슬라이스 종료 프로토콜:** `docs/SLICE_CLOSE_PROTOCOL.md` — 증거 영수증, postflight 결정, 승인 강도, 수정 라우팅, 다음 슬라이스 상속입니다.
- **Glass cockpit 프로토콜:** `docs/GLASS_COCKPIT_PROTOCOL.md` — 상태, 차단 요소, 질문, 승인, 증거 영수증, PR 링크, build-in-public 스트림을 위한 이벤트 어휘입니다.
- **런타임 바인딩 계약:** `docs/RUNTIME_BINDING_CONTRACT.md` — 핵심 외부에서 실행 패킷을 소비하는 OMC/OMX/plain-agent/human 바인딩의 수명주기/책임입니다.
- **GitHub 워크플로:** `docs/GITHUB_WORKFLOW.md` — issue → task/run → branch/PR → CI/Codex review → human approval → merge 추적성입니다.
- **계획 디렉터리:** `.osc/plans/` — 단계 하위 폴더(`active/`, `backlog/`, `done/`, `blocked/`)로 구성된 불변 계획 파일입니다. task/feature 슬라이스당 하나이며 `.osc/plans/handoff-template.md`의 7개 섹션 스키마를 따릅니다. 폴더가 곧 상태입니다 — 이동 규칙은 `.osc/plans/WORKFLOW.md`를 보세요.
- **수정:** 새로운 학습 내용은 부모 계획과 같은 단계 폴더에 `<plan-slug>-amendment-<n>.md`로 생성되며, `osc amend <plan-slug> --message "<what changed>"` / `npx open-scaffold amend ...` 또는 셸 대체 명령 `./amend.sh <plan-slug>`로 스캐폴딩됩니다. 계획은 제자리에서 편집하지 않으며, 수정 파일과 MISSION.md의 변경 이력은 직접 작성하지 않습니다.
- **수명주기 헬퍼:** npm/day-two 경로에서는 `osc amend <plan-slug> --message "<what changed>"` 및 `osc close <plan-slug> --message "<what shipped>"`를 선호하세요. 셸 대체 명령은 계속 `./amend.sh <plan-slug>` 및 `./close.sh <plan-slug>`이며, 스크립트는 `--stage`, `--backlog` 같은 스크립트별 플래그를 유지합니다.
- **빠른 규칙:** `.osc/RULES.md` — 간결한 비협상 원칙입니다. 프로젝트 구조에 대한 주요 작업 전에 다시 읽으세요.
- **결정 디렉터리:** `docs/decisions/README.md` — 공개 설계 선택 페이지입니다. 전체 ADR 기록은 내부적으로 `.osc-dev/decisions/`에 있으며 공개로 배포되지 않습니다.
- **릴리스 / 증거 노트:** `.osc/releases/`는 GitHub Releases가 너무 무겁거나 아직 만들지 않았을 때 의미 있는 제품 슬라이스를 위한 scaffold-native 릴리스 증거를 기록합니다. 노트는 로드맵 항목, issue/task, 계획, 실행 ID, PR, 검증, 후속 작업을 인용해야 합니다.
- **소유자 작업공간:** `.osc-dev/` — gitignored 상태이며, 복제된 템플릿이 아니라 open-scaffold 자체를 작업할 때만 채워집니다. `plans/`, `decisions/`, `specs/`, `snapshots/`에 전체 결정 기록을 보관합니다. **스캐폴드 자체의 아키텍처 변경을 제안하기 전에 먼저 `.osc-dev/plans/`와 `.osc-dev/decisions/`를 읽으세요** — 많은 설계 질문이 이미 거기서 조사되었습니다. Grep/Glob 도구는 기본적으로 gitignored 경로를 건너뜁니다. 검색할 때 `.osc-dev/`를 명시적으로 포함하세요.
- **워크플로 지도:** `docs/WORKFLOW.md` — 단계-도구-명령 치트시트입니다.
- **부트스트랩:** `bootstrap.sh` — 선택적이고 멱등적인 설정입니다. lazy 디렉터리를 만들고 MISSION.md 변경 이력에 도장을 찍습니다.

## Operating rules

1. **코드를 제안하거나 작성하기 전에 `MISSION.md`를 읽으세요.** 이 파일에 `<!-- mission:unset -->` 마커나 리터럴 `TODO: define mission`가 있으면 미션이 정의되지 않은 것으로 간주하세요. 진행하기 전에 사용자에게 미션을 정의하도록 안내하세요(`./bootstrap.sh` 또는 직접 편집). 사용자가 명시적으로 건너뛰라고 지시하면 예외입니다.
2. **모든 중요 변경은 `.osc/plans/`의 계획 파일로 추적되어야 합니다.** 해당 계획은 handoff 템플릿 스키마를 따라야 합니다.
3. **계획을 제자리에서 편집하지 마세요.** 새 정보가 계획의 목표나 승인 기준을 바꾸면 `osc amend <plan-slug> --message "<what changed>"` 또는 `./amend.sh <plan-slug>`를 실행하세요 — 헬퍼가 수정 파일 번호를 자동으로 매기고, 5개 섹션 스키마를 스캐폴딩하며, MISSION.md의 변경 이력에 도장을 찍습니다. 헬퍼가 남긴 `TODO:` 섹션을 채우세요. 수정 파일을 직접 작성하지 말고, 수정을 위해 MISSION.md의 변경 이력을 직접 편집하지 말고, 부모 계획 파일을 수정하지 마세요.
4. **검증은 승인 기준으로 추적됩니다.** 분위기가 아니라 계획의 승인 기준에 대해 `./verify.sh`와 모든 어댑터 네이티브 검증을 실행하세요.
5. **"더 똑똑해졌을 때"**(범위를 합법적으로 바꾸는 새 정보가 들어왔을 때)는 수정 흐름을 대화식으로 진행하세요: (a) 무엇이 구체적으로 바뀌었고 왜 바뀌었는지 사용자에게 묻고, (b) 사용자의 표현으로 다시 요약하고, (c) `osc amend <plan-slug> --message "<what changed>"` 또는 `./amend.sh <plan-slug>`를 실행하고, (d) 생성된 수정 파일에서 헬퍼가 남긴 `TODO:` 섹션을 그 요약으로 채우고, (e) 스테이징하기 전에 검토용 diff를 보여주세요. 새 기능을 조용히 통합하지 말고, 정당한 진화를 거부하지 마세요.
6. **어느 단계에 있는지 또는 어떤 도구가 맞는지 확실하지 않으면 `docs/WORKFLOW.md`를 참고하세요.**
7. **중요한 코드 변경 전에 준수 검사를 실행하세요.** `./verify.sh --quick --quiet`를 실행하고 종료 코드를 확인하세요. 종료 코드 0: 조용히 진행합니다(검증을 언급하지 마세요). 종료 코드 1: 실패 출력을 읽고, 첫 번째 실패 검사에서 강하게 차단하며 안내하세요. 검사는 점진적 공개를 사용합니다: 미션 검사가 먼저 실행되고, 계획 검사는 미션이 정의된 뒤에만 활성화됩니다. 미션이 정의되지 않았으면 미션 정의로 안내하세요. 미션은 정의되어 있지만 계획이 없으면 계획 생성을 안내하세요. `--quiet` 플래그는 성공 시 출력을 억제하지만 문제가 있으면 실패 세부 정보를 출력합니다. 셸 명령을 실행할 수 없다면 직접 확인하세요: 먼저 `MISSION.md`에 `<!-- mission:unset -->`가 없는지 검증하고, 미션이 정의된 경우에만 `.osc/plans/`와 그 단계 하위 폴더(`active/`, `backlog/`, `done/`, `blocked/`)에 템플릿 외의 계획 파일이 하나 이상 있는지 확인하세요.
8. **계획에서 위임 기회를 감지하세요.** `.osc/plans/`의 계획을 실행할 때 `## Execution strategy` 섹션이 있는지 확인하세요. 있으면 병렬 그룹과 의존성을 읽고, 사용자에게 병렬화(구체적인 그룹과 태스크 이름)를 제안하며, 병렬로 표시된 태스크가 파일을 공유하거나 선언되지 않은 의존성이 있으면 경고하세요. 실행에 OMC/OMX 또는 다른 하네스가 필요할 때는 채팅 스레드나 런타임 세션을 canonical state로 취급하지 말고 바인딩된 실행 패키지(`osc run <plan> --task-id ... --executor ...`)를 만들거나 요청하세요. 코드/공개 문서 변경의 경우 같은 추적을 GitHub PR 템플릿으로 가져가고 가능하면 Codex review를 트리거하세요. 없으면 정상적으로 진행하세요 — 이 섹션은 선택 사항입니다. 유능한 에이전트가 없는 설정에서는 `./delegate.sh <plan-path>`가 Execution Strategy 섹션에서 실행 가능한 터미널 프롬프트를 생성합니다.

## Scope evolution protocol

전체 규칙은 `.osc/plans/README.md`에 있습니다(200단어 미만). 요약: 계획은 불변입니다. 수정은 번호 순서대로 위에 겹쳐집니다. MISSION.md의 변경 이력은 모든 전환을 기록합니다. 에이전트는 원래 계획과 모든 수정을 순서대로 읽습니다. **수정은 `osc amend <plan-slug> --message "<what changed>"` 또는 `./amend.sh <plan-slug>`로 기계적으로 스캐폴딩됩니다** — 헬퍼가 파일 번호를 자동으로 매기고, 5개 섹션 스키마(Parent / Date / Learning / New direction / Impact on acceptance criteria)를 작성하며, MISSION.md의 변경 이력에 도장을 찍습니다. 에이전트는 헬퍼가 남긴 `TODO:` 섹션을 채우며, 수정 파일을 직접 작성하거나 수정 기록 관리를 위해 MISSION.md를 직접 편집하지 않습니다.

## Verification marker convention

`MISSION.md`는 기계가 감지할 수 있는 "미션이 아직 정의되지 않음" 마커로 `<!-- mission:unset -->`를 포함하여 배포됩니다. 검증 도구(어댑터 네이티브 명령, 커스텀 스크립트, 코드 리뷰어)는 이 마커가 있으면 범위 확장 작업의 차단 요소로 취급해야 합니다. open-scaffold는 이 마커를 정의하고, 소비하는 도구가 그것을 어떻게 준수할지 결정합니다.
