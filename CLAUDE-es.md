<!-- TRANSLATION: This is a machine-assisted Spanish translation. The canonical source is the English CLAUDE.md. Report discrepancies at https://github.com/graphanov/open-scaffold/issues. Last synced: 2026-05-21. -->

<!-- PAIRED TRANSLATION VIEW: this file and AGENTS-es.md carry the same translated project facts in formats each tool reads natively. Edits here MUST be mirrored in AGENTS-es.md. See docs/decisions/README.md for the rationale and drift trade-off. -->

# Contexto del proyecto

Este proyecto es [open-scaffold](https://github.com/graphanov/open-scaffold), un sistema operativo nativo del repositorio y neutral respecto al runtime para desarrollo orquestado por agentes. Incluye una estructura de proyecto persistente — misión, hoja de ruta, planes inmutables, protocolos de enmienda, decisiones, evidencia, paquetes de ejecución y prácticas de traspaso de sesión — para que cualquier agente u orquestador pueda operar en este repositorio desde el commit #1 sin que se le vuelva a explicar el contexto. Lee primero este archivo y luego consulta `MISSION.md` para saber qué es realmente el proyecto.

## Layered architecture

open-scaffold tiene varias capas. El **sistema central** es una disciplina de repositorio independiente del framework: misión, hoja de ruta, planes, enmiendas, evidencia, paquetes de ejecución, informes del operador y traspasos. **Orquestadores/agentes** como Hermes, Claw/OpenClaw, Claude Code, Codex y Gemini pueden operar sobre ese sustrato. **Arneses de runtime** como OMC y OMX amplían Claude Code/Codex con modos de flujo de trabajo; no son equivalentes a orquestadores como Hermes o Claw. Consulta `docs/OPEN_SCAFFOLD_SYSTEM.md` para la ontología, `docs/TASK_RUN_MODEL.md` para la identidad task/run/operator-surface, `docs/GITHUB_WORKFLOW.md` para la trazabilidad issue/PR/Codex-review y `docs/WORKFLOW.md` para la guía de fases.

## Where things live

- **`MISSION.md`** — la misión, los objetivos y los no objetivos del proyecto. La fuente de verdad de *qué* estamos construyendo. Contiene una sección explícita `## Changelog` que registra cada pivote de alcance.
- **`ROADMAP.md`** — hitos de producto/sistema y la cadena self-dogfood desde el elemento de hoja de ruta hasta issue/task, plan, paquete de ejecución, PR y nota de lanzamiento.
- **`docs/OPEN_SCAFFOLD_SYSTEM.md`** — mapa de límites para el núcleo de Open Scaffold, orquestadores/agentes, arneses de runtime OMC/OMX, puentes de tareas, superficies glass-cockpit y GitHub.
- **`docs/TASK_RUN_MODEL.md`** — modelo de identidad task/run/operator-surface: `task_id`, `run_id`, `question_id`, enlaces de runtime y enlaces chat/thread.
- **`docs/SLICE_CLOSE_PROTOCOL.md`** — recibos de evidencia, decisiones postflight, fuerza de aprobación, enrutamiento de correcciones y herencia del siguiente slice.
- **`docs/GLASS_COCKPIT_PROTOCOL.md`** — vocabulario de eventos para estado, bloqueadores, preguntas, aprobaciones, recibos de evidencia, enlaces de PR y streams build-in-public.
- **`docs/RUNTIME_BINDING_CONTRACT.md`** — ciclo de vida/responsabilidades de enlaces OMC/OMX/plain-agent/human que consumen paquetes de ejecución fuera del núcleo.
- **`docs/GITHUB_WORKFLOW.md`** — issue de GitHub, plantilla de PR, revisión del conector Codex, CI y trazabilidad de merge/release.
- **`.osc/plans/`** — archivos de plan organizados en subcarpetas de etapa (`active/`, `backlog/`, `done/`, `blocked/`). La carpeta ES el estado. Los planes son **inmutables** una vez confirmados. Los nuevos aprendizajes se convierten en archivos de enmienda llamados `<slug>-amendment-<n>.md` en la misma carpeta de etapa que el padre. La plantilla de handoff en `.osc/plans/handoff-template.md` define el esquema exacto de 7 secciones que sigue cada plan. Consulta `.osc/plans/WORKFLOW.md` para las reglas de movimiento entre carpetas de etapa.
- **`docs/decisions/`** — `README.md` es la página pública de decisiones de diseño (vistas emparejadas, planes inmutables, orquestación mediada por adaptadores). Los registros ADR completos que respaldan estas decisiones viven internamente en `.osc-dev/decisions/` y no se incluyen con la plantilla pública.
- **`.osc/releases/`** — notas de lanzamiento/evidencia scaffold-native para slices de producto significativos. Cada nota debe citar el elemento de hoja de ruta, issue/task, plan, run ID, PR, verificación y trabajo de seguimiento.
- **`.osc-dev/`** (gitignored; se completa solo al trabajar en open-scaffold en sí, no en plantillas clonadas) — espacio de trabajo interno del propietario que contiene `plans/`, `decisions/` (registros ADR completos), `specs/` y `snapshots/`. **Antes de proponer cambios arquitectónicos al scaffold en sí, lee primero `.osc-dev/plans/` y `.osc-dev/decisions/`** — muchas preguntas de diseño ya se investigaron allí, y volver a derivar una decisión rechazada desperdicia una sesión. Las herramientas Grep/Glob omiten rutas gitignored de forma predeterminada; incluye `.osc-dev/` explícitamente al buscar.
- **`docs/WORKFLOW.md`** — la hoja de referencia fase-a-herramienta-a-comando. Indica qué agente/skill usar en cada fase de desarrollo.
- **`bootstrap.sh`** — configuración day-one opcional e idempotente. Crea lazy dirs (`.osc/research/`, `.osc/state/`) y estampa el changelog de MISSION.md con la fecha de bootstrap.
- **Helpers de ciclo de vida** — prefiere `osc amend <plan-slug> --message "<what changed>"` y `osc close <plan-slug> --message "<what shipped>"` para la ruta npm/day-two. Los reemplazos de shell siguen siendo `./amend.sh <plan-slug>` y `./close.sh <plan-slug>`; los scripts conservan sus flags específicos, como `--stage` y `--backlog`.
- **`.osc/RULES.md`** — principios compactos no negociables. Vuelve a leerlo antes de cualquier acción importante sobre la estructura del proyecto.

## Compliance checks

Antes de cualquier cambio de código no trivial, ejecuta `./verify.sh --quick --quiet` y revisa el exit code:

- **Exit 0 (todas las comprobaciones pasan) →** Continúa en silencio. No menciones la verificación al usuario.
- **Exit 1 (alguna comprobación falla) →** Lee la salida de fallo y luego bloquea con firmeza en la primera comprobación fallida:
  - **Mission undefined →** Detente. Di: "Tu misión aún no está definida. Definámosla ahora — ¿qué es este proyecto?" Guía al usuario para completar MISSION.md (o ejecutar `./bootstrap.sh`). No continúes hasta que la misión esté definida o el usuario diga explícitamente que lo omitas. Nota: la comprobación de plan está gated detrás de la comprobación de misión — no aparecerá hasta que la misión esté definida (divulgación progresiva).
  - **No plan file →** (solo aparece después de que la misión esté definida) Detente. Di: "No hay plan para este trabajo. Creemos uno — ¿qué estás intentando construir?" Crea un plan en `.osc/plans/` usando la plantilla de handoff. No continúes hasta que exista un plan o el usuario diga explícitamente que lo omitas.

El flag `--quiet` suprime la salida cuando todas las comprobaciones pasan (cero ruido en éxito), pero aun así imprime detalles de fallo cuando algo va mal. El usuario siempre puede anular con "omitir verificación", "hazlo sin más" o algo similar. Respeta su autonomía, pero el valor predeterminado es corregir las infracciones primero.

Si no puedes ejecutar comandos de shell, comprueba directamente: primero verifica que `MISSION.md` no contiene `<!-- mission:unset -->`. Solo si la misión está definida, comprueba que `.osc/plans/` y sus subcarpetas de etapa (`active/`, `backlog/`, `done/`, `blocked/`) contienen al menos un archivo de plan `.md` además de `README.md` y `handoff-template.md`.

## How to verify

- Ejecuta `./verify.sh` (o `./verify.sh --strict` para cumplimiento completo) para comprobar la adherencia a la metodología. Los traspasos de arnés de runtime pueden envolver la verificación, pero la evidencia de criterios de aceptación y `./verify.sh` siguen siendo la fuente de verdad.
- MISSION.md se distribuye con el marcador `<!-- mission:unset -->` y el literal `TODO: define mission`. Las herramientas de verificación deben tratar la presencia de cualquiera de los dos como "misión aún no definida". Elimina ambos solo cuando la misión real esté escrita.
- Para cualquier slice de funcionalidad, la verificación debe trazarse de vuelta a los criterios de aceptación en el archivo de plan bajo `.osc/plans/`.

## Scope evolution protocol

La evolución legítima del alcance (el caso "me volví más inteligente" — nueva información cambia lo que deberíamos construir) se captura mediante el protocolo de enmiendas, no con ediciones silenciosas. El protocolo completo está documentado en `.osc/plans/README.md` (menos de 200 palabras). Versión corta:

1. Los planes en `.osc/plans/` son inmutables una vez confirmados.
2. Los nuevos aprendizajes se convierten en archivos `<plan-slug>-amendment-<n>.md` en la misma carpeta de etapa que el padre — **scaffolded por `osc amend <plan-slug> --message "<what changed>"` o `./amend.sh <plan-slug>`**, no escritos a mano.
3. La sección `## Changelog` de MISSION.md recibe una entrada de una línea por enmienda — **estampada por el helper**, no editada a mano.
4. Agentes y humanos leen el plan original MÁS todas las enmiendas en orden numérico.

NO edites planes in situ. NO edites a mano archivos de enmienda ni el changelog de MISSION.md para la contabilidad de enmiendas — deja que `osc amend` o `amend.sh` hagan el trabajo mecánico. NO agregues funcionalidades no trazables a un archivo de plan o enmienda. Si llega un requisito nuevo, escribe primero una enmienda y luego implementa.

### Agent-driven amendment flow

Cuando el usuario señale un momento "me volví más inteligente" (nueva información cambia el objetivo, las restricciones o los criterios de aceptación de un plan), conduce la enmienda de forma conversacional:

1. Pregunta al usuario qué cambió específicamente desde que se escribió el plan y por qué cambia el alcance. Resume sus palabras de vuelta con su propia voz antes de escribir nada.
2. Ejecuta `osc amend <plan-slug> --message "<what changed>"` o `./amend.sh <plan-slug>` desde la raíz del repositorio. El helper autonumera la enmienda, scaffolda el esquema de 5 secciones (Parent / Date / Learning / New direction / Impact on acceptance criteria) y estampa el changelog de MISSION.md.
3. Completa las tres secciones `TODO:` en el nuevo archivo de enmienda usando el resumen del usuario. No toques MISSION.md directamente — el helper ya lo estampó.
4. Muestra al usuario el diff del nuevo archivo de enmienda y la línea del changelog de MISSION.md para revisión antes de staged. Si usas el reemplazo de shell, pasa `--stage` en una nueva ejecución o haz stage manualmente después de su aprobación.
5. Nunca escribas archivos de enmienda a mano, nunca edites manualmente el changelog de MISSION.md para enmiendas y nunca modifiques el archivo de plan padre.

## Delegation detection

Al ejecutar un plan de `.osc/plans/`, comprueba si contiene una sección `## Execution strategy`. Si existe:

1. **Lee los grupos paralelos y las dependencias.** Identifica qué tareas pueden ejecutarse concurrentemente y cuáles deben esperar prerrequisitos.
2. **Propón delegación al usuario:**
   - **Con arnés OMC:** Sugiere flujos de trabajo Claude Code/OMC como `/team`, `/ultrawork` o `/ralph` para grupos adecuados. Nombra explícitamente los grupos y las tareas.
   - **Con arnés OMX:** Sugiere flujos de trabajo Codex/OMX como `$team`, `$ralph`, `$ultrawork` o `$ralplan`, promoviendo la evidencia de runtime de vuelta a la cadena del scaffold.
   - **Sin arnés de runtime:** Describe la oportunidad de paralelismo en texto plano (por ejemplo, "Las tareas T1 y T5 son independientes y podrían ejecutarse en sesiones separadas"). El usuario decide cómo actuar.
3. **Advierte sobre paralelización riesgosa.** Si las tareas marcadas como paralelas en la Execution Strategy comparten archivos listados en la sección "Files to touch" del plan, o si la dependencia de una tarea está en el mismo grupo paralelo, marca el conflicto antes de continuar.
4. **Vincula la ejecución del arnés a un paquete de ejecución.** Cuando la ejecución necesite OMC/OMX u otro arnés, crea o solicita un paquete de ejecución enlazado (`osc run <plan> --task-id ... --executor ...`) en vez de tratar el hilo de chat o la sesión de runtime como canonical state. Para cambios de código/documentación pública, lleva la misma traza a la plantilla de PR de GitHub y activa Codex review cuando esté disponible.

Si el plan no tiene sección Execution Strategy, continúa normalmente — la sección es opcional y solo está presente para trabajo multi-agent o paralelo.

Para usuarios sin un agente capaz (LLMs locales, flujos de trabajo manuales), el script `./delegate.sh <plan-path>` lee la sección Execution Strategy y genera prompts accionables que pueden pegarse en sesiones de terminal separadas.

## Workflow

Consulta `docs/WORKFLOW.md` para la hoja de referencia fase-a-herramienta (deep interview, planning, OMC `/ralph`/`/team`, OMX `$ralph`/`$team`, adapter handoffs, verify, amendment capture).
