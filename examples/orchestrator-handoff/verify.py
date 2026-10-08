#!/usr/bin/env python3
"""Offline saved-record consistency checks. No execution, dispatch or semantic grading."""
import argparse
import hashlib
import json
import math
import re
import sys
from datetime import datetime
from pathlib import Path, PurePosixPath

sys.dont_write_bytecode = True
import formatter

FILES = {'README.md', 'assessment-independent.json', 'assessment-primary.json',
         'formatter.py', 'results.json', 'study.json', 'verify.py'}
SCHEDULE = [['plain', 'osc'], ['osc', 'plain'], ['plain', 'osc']]
TASKS = {'A': 'fixture-token-parser', 'B': 'fixture-capture-integration', 'C': 'fixture-evidence-docs'}
FACT_IDS = [w + str(n) for w in 'ABC' for n in range(1, 5)]
CRITICAL = ['A2', 'A4', 'B1', 'B3', 'C3', 'C4']
STEMS = ['worker-' + w for w in 'ABC'] + [
    f'pair-{pair}-{arm}-{stage}' for pair, arms in enumerate(SCHEDULE, 1)
    for arm in arms for stage in ('coordinator', 'reader')]
# Closed map, including explicitly opaque provenance bindings. Never read these as paths.
CLOSED_ARTIFACTS = {
    'common-fact-inventory.json',
    'comparison-assessments-freeze.json',
    'comparison-grading-independent.json',
    'comparison-grading-independent.md',
    'comparison-grading-primary.json',
    'comparison-grading-primary.md',
    'comparison-instructions.json',
    'comparison-runs/admission.json',
    'comparison-runs/capture-method-v2-applied.json',
    'comparison-runs/captures/.capture-lock',
    'comparison-runs/captures/pair-1-osc-coordinator.json',
    'comparison-runs/captures/pair-1-osc-reader.json',
    'comparison-runs/captures/pair-1-plain-coordinator.json',
    'comparison-runs/captures/pair-1-plain-reader.json',
    'comparison-runs/captures/pair-2-osc-coordinator.json',
    'comparison-runs/captures/pair-2-osc-reader.json',
    'comparison-runs/captures/pair-2-plain-coordinator.json',
    'comparison-runs/captures/pair-2-plain-reader.json',
    'comparison-runs/captures/pair-3-osc-coordinator.json',
    'comparison-runs/captures/pair-3-osc-reader.json',
    'comparison-runs/captures/pair-3-plain-coordinator.json',
    'comparison-runs/captures/pair-3-plain-reader.json',
    'comparison-runs/captures/worker-A.json',
    'comparison-runs/captures/worker-B.json',
    'comparison-runs/captures/worker-C.json',
    'comparison-runs/common-representation.json',
    'comparison-runs/continuation-admission-001.json',
    'comparison-runs/halt.json',
    'comparison-runs/incoming/pair-1-osc-coordinator-clock.json',
    'comparison-runs/incoming/pair-1-osc-coordinator-dispatch.json',
    'comparison-runs/incoming/pair-1-osc-handoff.txt',
    'comparison-runs/incoming/pair-1-osc-reader-clock.json',
    'comparison-runs/incoming/pair-1-osc-reader-dispatch.json',
    'comparison-runs/incoming/pair-1-osc-recovery.txt',
    'comparison-runs/incoming/pair-1-osc-termination.json',
    'comparison-runs/incoming/pair-1-plain-coordinator-dispatch.json',
    'comparison-runs/incoming/pair-1-plain-handoff.txt',
    'comparison-runs/incoming/pair-1-plain-reader-dispatch.json',
    'comparison-runs/incoming/pair-1-plain-recovery.txt',
    'comparison-runs/incoming/pair-1-plain-termination.json',
    'comparison-runs/incoming/pair-2-osc-coordinator-clock.json',
    'comparison-runs/incoming/pair-2-osc-coordinator-dispatch.json',
    'comparison-runs/incoming/pair-2-osc-handoff.txt',
    'comparison-runs/incoming/pair-2-osc-reader-clock.json',
    'comparison-runs/incoming/pair-2-osc-reader-dispatch.json',
    'comparison-runs/incoming/pair-2-osc-recovery.txt',
    'comparison-runs/incoming/pair-2-osc-termination.json',
    'comparison-runs/incoming/pair-2-plain-coordinator-clock.json',
    'comparison-runs/incoming/pair-2-plain-coordinator-dispatch.json',
    'comparison-runs/incoming/pair-2-plain-handoff.txt',
    'comparison-runs/incoming/pair-2-plain-reader-clock.json',
    'comparison-runs/incoming/pair-2-plain-reader-dispatch.json',
    'comparison-runs/incoming/pair-2-plain-recovery.txt',
    'comparison-runs/incoming/pair-2-plain-termination.json',
    'comparison-runs/incoming/pair-3-osc-coordinator-clock.json',
    'comparison-runs/incoming/pair-3-osc-coordinator-dispatch.json',
    'comparison-runs/incoming/pair-3-osc-handoff.txt',
    'comparison-runs/incoming/pair-3-osc-reader-clock.json',
    'comparison-runs/incoming/pair-3-osc-reader-dispatch.json',
    'comparison-runs/incoming/pair-3-osc-recovery.txt',
    'comparison-runs/incoming/pair-3-osc-termination.json',
    'comparison-runs/incoming/pair-3-plain-coordinator-clock.json',
    'comparison-runs/incoming/pair-3-plain-coordinator-dispatch.json',
    'comparison-runs/incoming/pair-3-plain-handoff.txt',
    'comparison-runs/incoming/pair-3-plain-reader-clock.json',
    'comparison-runs/incoming/pair-3-plain-reader-dispatch.json',
    'comparison-runs/incoming/pair-3-plain-recovery.txt',
    'comparison-runs/incoming/pair-3-plain-termination.json',
    'comparison-runs/incoming/worker-A-dispatch.json',
    'comparison-runs/incoming/worker-A.txt',
    'comparison-runs/incoming/worker-B-dispatch.json',
    'comparison-runs/incoming/worker-B.txt',
    'comparison-runs/incoming/worker-C-dispatch.json',
    'comparison-runs/incoming/worker-C.txt',
    'comparison-runs/inputs/pair-1-osc-coordinator.txt',
    'comparison-runs/inputs/pair-1-osc-coordinator.txt.binding.json',
    'comparison-runs/inputs/pair-1-osc-reader.txt',
    'comparison-runs/inputs/pair-1-osc-reader.txt.binding.json',
    'comparison-runs/inputs/pair-1-plain-coordinator.txt',
    'comparison-runs/inputs/pair-1-plain-coordinator.txt.binding.json',
    'comparison-runs/inputs/pair-1-plain-reader.txt',
    'comparison-runs/inputs/pair-1-plain-reader.txt.binding.json',
    'comparison-runs/inputs/pair-2-osc-coordinator.txt',
    'comparison-runs/inputs/pair-2-osc-coordinator.txt.binding.json',
    'comparison-runs/inputs/pair-2-osc-reader.txt',
    'comparison-runs/inputs/pair-2-osc-reader.txt.binding.json',
    'comparison-runs/inputs/pair-2-plain-coordinator.txt',
    'comparison-runs/inputs/pair-2-plain-coordinator.txt.binding.json',
    'comparison-runs/inputs/pair-2-plain-reader.txt',
    'comparison-runs/inputs/pair-2-plain-reader.txt.binding.json',
    'comparison-runs/inputs/pair-3-osc-coordinator.txt',
    'comparison-runs/inputs/pair-3-osc-coordinator.txt.binding.json',
    'comparison-runs/inputs/pair-3-osc-reader.txt',
    'comparison-runs/inputs/pair-3-osc-reader.txt.binding.json',
    'comparison-runs/inputs/pair-3-plain-coordinator.txt',
    'comparison-runs/inputs/pair-3-plain-coordinator.txt.binding.json',
    'comparison-runs/inputs/pair-3-plain-reader.txt',
    'comparison-runs/inputs/pair-3-plain-reader.txt.binding.json',
    'comparison-runs/inputs/worker-A.txt',
    'comparison-runs/inputs/worker-A.txt.binding.json',
    'comparison-runs/inputs/worker-B.txt',
    'comparison-runs/inputs/worker-B.txt.binding.json',
    'comparison-runs/inputs/worker-C.txt',
    'comparison-runs/inputs/worker-C.txt.binding.json',
    'comparison-runs/outcomes-freeze.json',
    'comparison-runs/outcomes-lineage-freeze-001.json',
    'comparison-runs/raw/pair-1-osc-coordinator.txt',
    'comparison-runs/raw/pair-1-osc-reader.txt',
    'comparison-runs/raw/pair-1-plain-coordinator.txt',
    'comparison-runs/raw/pair-1-plain-reader.txt',
    'comparison-runs/raw/pair-2-osc-coordinator.txt',
    'comparison-runs/raw/pair-2-osc-reader.txt',
    'comparison-runs/raw/pair-2-plain-coordinator.txt',
    'comparison-runs/raw/pair-2-plain-reader.txt',
    'comparison-runs/raw/pair-3-osc-coordinator.txt',
    'comparison-runs/raw/pair-3-osc-reader.txt',
    'comparison-runs/raw/pair-3-plain-coordinator.txt',
    'comparison-runs/raw/pair-3-plain-reader.txt',
    'comparison-runs/raw/worker-A.txt',
    'comparison-runs/raw/worker-B.txt',
    'comparison-runs/raw/worker-C.txt',
    'comparison-runs/timing-correction-001.json',
    'comparison-scores.json',
    'fixture/A/git.json',
    'fixture/A/marker.txt',
    'fixture/A/tests.json',
    'fixture/B/decision.txt',
    'fixture/B/hypothesis.txt',
    'fixture/B/integration.json',
    'fixture/B/status.json',
    'fixture/C/old-doc.txt',
    'fixture/C/release.json',
    'fixture/C/usage.json',
    'fixture/C/verifier.json',
    'opaque/1',
    'opaque/10',
    'opaque/11',
    'opaque/2',
    'opaque/3',
    'opaque/4',
    'opaque/5',
    'opaque/6',
    'opaque/7',
    'opaque/8',
    'opaque/9',
    'report-formatter',
}

PRIMARY_RESPONSE_FIELDS = ('pair', 'arm', 'stage', 'raw_output_binding', 'score_correct_facts', 'required_fact_count', 'accuracy', 'omitted_fact_ids', 'omission_count', 'omission_fraction', 'critical_fact_ids', 'critical_omitted_fact_ids', 'critical_omission_count', 'unsupported_completion_merge_publication_assertions', 'unsupported_completion_merge_publication_assertion_count', 'other_unsupported_zero_usage_cost_scalability_assertions', 'attribution_errors', 'attribution_error_count', 'per_fact_scores', 'disagreement_and_open_decision_preservation', 'smallest_safe_next_action', 'assessment_notes', 'assessor_uncertainty', 'stem')
INDEPENDENT_RESPONSE_FIELDS = ('stem', 'stage', 'pair', 'arm', 'worker', 'raw_output', 'raw_characters', 'capture', 'native_dispatch_id', 'native_session_id', 'score_role', 'facts_correct', 'facts_required_in_scope', 'fact_scores', 'omission_count', 'omission_fraction', 'omitted_fact_ids', 'critical_omission_count', 'critical_omitted_fact_ids', 'unsupported_completion_claim_count', 'unsupported_completion_claims', 'attribution_error_count', 'attribution_errors', 'score_uncertainty', 'safety_reading')
PRIMARY_FACT_FIELDS = ('fact_id', 'required_fact', 'expected_worker', 'expected_task', 'expected_run', 'expected_evidence', 'expected_epistemic_kind', 'score', 'omitted', 'critical', 'critical_omission', 'supporting_source_excerpts', 'attribution_source_excerpts', 'attribution_correct', 'epistemic_kind_preserved', 'rationale', 'assessor_uncertainty')
INDEPENDENT_FACT_FIELDS = ('fact_id', 'score', 'critical', 'expected', 'covered_semantic_clauses', 'attribution', 'source_excerpts', 'epistemic_category_preserved', 'omitted', 'critical_omission', 'assessor_uncertainty', 'rationale')


def require(condition, message):
    if not condition:
        raise ValueError(message)


def unique_members(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, 'duplicate JSON member: ' + key)
        result[key] = value
    return result


def loads(text):
    def invalid(value):
        raise ValueError('non-finite JSON number: ' + value)
    return json.loads(text, object_pairs_hook=unique_members, parse_constant=invalid)


def fields(value, expected, label):
    require(type(value) is dict and set(value) == set(expected), label + ': field mismatch')


def integer(value, label):
    require(type(value) is int, label + ': expected integer')
    return value


def boolean(value, label):
    require(type(value) is bool, label + ': expected boolean')
    return value


def number(value, label):
    require(type(value) in (int, float) and math.isfinite(value), label + ': expected finite number')
    return value


def metrics(text):
    require(type(text) is str, 'artifact payload must be text')
    raw = text.encode('utf-8')
    return {'sha256': hashlib.sha256(raw).hexdigest(), 'utf8_bytes': len(raw), 'characters': len(text)}


def digest_shape(binding):
    require(type(binding) is dict and set(binding) in ({'sha256', 'utf8_bytes'},
            {'sha256', 'utf8_bytes', 'characters'}), 'invalid digest/size binding')
    require(type(binding['sha256']) is str and re.fullmatch('[0-9a-f]{64}', binding['sha256']), 'invalid SHA-256')
    require(integer(binding['utf8_bytes'], 'UTF-8 bytes') >= 0, 'negative bytes')
    if 'characters' in binding:
        require(integer(binding['characters'], 'characters') >= 0, 'negative characters')


def key_for(reference):
    require(type(reference) is str and reference.startswith('study:'), 'unsafe/ambiguous artifact reference')
    key = reference[6:]
    require(key in CLOSED_ARTIFACTS, 'unknown artifact reference: ' + key)
    require(not PurePosixPath(key).is_absolute() and all(p not in ('', '.', '..') for p in key.split('/'))
            and '\\' not in key and ':' not in key, 'unsafe artifact path')
    return key


class Bundle:
    def __init__(self, root):
        self.root = root
        require(root.is_dir(), 'bundle directory missing')
        require({p.name for p in root.iterdir()} == FILES, 'closed expected file allowlist mismatch')
        for name in FILES:
            path = root / name
            require(path.is_file() and not path.is_symlink(), 'unsafe bundle file: ' + name)
        self.study = loads((root / 'study.json').read_text(encoding='utf-8'))
        self.artifacts = self.study['artifacts']
        require(type(self.artifacts) is dict and set(self.artifacts) == CLOSED_ARTIFACTS, 'closed artifact map mismatch')
        self.assessments = {who: loads((root / ('assessment-' + who + '.json')).read_text(encoding='utf-8'))
                            for who in ('primary', 'independent')}
        self.results = loads((root / 'results.json').read_text(encoding='utf-8'))

    def text(self, key):
        key_for('study:' + key)
        artifact = self.artifacts[key]
        require(artifact['kind'] != 'opaque', 'opaque provenance has no public payload: ' + key)
        return artifact['text']

    def obj(self, key):
        return loads(self.text(key))

    def binding(self, binding, expected=None):
        fields(binding, ('path', 'sha256', 'utf8_bytes'), 'reference binding')
        # Original exact saved metadata has relative refs. Projections use study: refs.
        reference = binding['path']
        if type(reference) is str and reference in CLOSED_ARTIFACTS:
            reference = 'study:' + reference
        key = key_for(reference)
        if expected is not None:
            require(key == expected, 'binding points to wrong artifact: ' + key)
        actual = self.artifacts[key]['original_binding']
        require(all(binding[k] == actual[k] for k in ('sha256', 'utf8_bytes')), 'original binding mismatch: ' + key)
        return key


def validate_artifacts(bundle):
    study = bundle.study
    fields(study, ('schema', 'fixture_notice', 'expected_files', 'artifact_reference_syntax', 'artifacts',
                  'schedule', 'timing', 'boundaries', 'assessor_disagreement'), 'study')
    require(study['schema'] == 'open-scaffold.orchestrator-handoff.study.v1', 'study schema mismatch')
    require(type(study['expected_files']) is list and len(study['expected_files']) == 7 and
            set(study['expected_files']) == FILES, 'unsafe expected file allowlist')
    require(study['schedule'] == SCHEDULE, 'fixed schedule mismatch')
    expected_boundaries = {'actual_model':'inherited/unreported','model_name':None,'model_version':None,'temperature':None,
                          'tokenizer_version':None,'provider_usage':None,'missing_usage_means':'unavailable, never zero',
                          'native_hidden_system_tools':'unmeasured','public_payload_is_exact_complete_native_input':False,
                          'isolation':'cooperative prescribed-input/fork-none contexts under one shared OS identity; no OS/provider security boundary',
                          'experimental_attributed_envelope_is_core_schema':False,'worker_executions':3,
                          'coordinator_executions':6,'reader_executions':6,'reruns':0,'randomized':False,'fully_counterbalanced':False}
    require(study['boundaries'] == expected_boundaries and all(type(study['boundaries'][k]) is type(v)
            for k,v in expected_boundaries.items()), 'model/usage/isolation/experimental boundary mismatch')

    for key, artifact in bundle.artifacts.items():
        key_for('study:' + key)
        require(artifact['kind'] in ('exact', 'projection', 'opaque'), 'unknown artifact kind')
        digest_shape(artifact['original_binding'])
        if artifact['kind'] == 'opaque':
            fields(artifact, ('kind', 'original_binding', 'notice'), 'opaque artifact')
            continue
        fields(artifact, ('kind', 'original_binding', 'payload_binding', 'text'), 'materialized artifact')
        digest_shape(artifact['payload_binding'])
        require(metrics(artifact['text']) == artifact['payload_binding'], 'payload digest/size mismatch: ' + key)
        require('/Users/' not in artifact['text'], 'private path in projection: ' + key)
        if artifact['kind'] == 'exact':
            require(artifact['original_binding'] == artifact['payload_binding'], 'exact bytes relabeled: ' + key)
        if key.endswith('.json'):
            bundle.obj(key)  # Reject duplicates even in otherwise unused embedded records.
    frozen = bundle.obj('comparison-runs/outcomes-lineage-freeze-001.json')
    require(frozen['order'] == SCHEDULE and frozen['captures'] == 15 and frozen['no_retries'] is True,
            'outcomes freeze contract mismatch')
    for key in ('comparison-runs/outcomes-lineage-freeze-001.json', 'comparison-runs/outcomes-freeze.json',
                'comparison-runs/continuation-admission-001.json', 'comparison-assessments-freeze.json'):
        for binding in bundle.obj(key)['bindings']:
            bundle.binding(binding)
    formatter_text = (bundle.root / 'formatter.py').read_text(encoding='utf-8')
    require(hashlib.sha256(formatter_text.split('if __name__ == \"__main__\":')[0].encode('utf-8')).hexdigest() ==
            'be248ee6809874d34152439455048857f80922f9ada76a2670807171685247cd', 'frozen formatter function body changed')
    require(bundle.text('report-formatter') == formatter_text,
            'portable formatter projection mismatch')
    return frozen


def source_records(bundle, ref):
    text = bundle.text(ref)
    if ref.endswith('.json'):
        obj = loads(text)
        fields(obj, ('schema', 'synthetic', 'fixture_only', 'represents_actual_repository_actions',
                     'notice', 'worker', 'task', 'run', 'records'), 'synthetic source')
        require(obj['schema'] == 'john.open-scaffold.synthetic-source-evidence.v1' and obj['synthetic'] is True
                and obj['fixture_only'] is True and obj['represents_actual_repository_actions'] is False,
                'synthetic source boundary mismatch')
        return obj['worker'], obj['task'], obj['run'], obj['records']
    m = re.fullmatch(r'.*?\n\nWorker: ([ABC])\nTask: ([^\n]+)\nRun: ([^\n]+)\n\n'
                     r'Source note (\d+)\nKind: ([^\n]+)\nStatement: ([^\n]+)\n\n', text, re.S)
    require(m is not None, 'source text framing mismatch')
    w, task, run, ordinal, kind, statement = m.groups()
    return w, task, run, [{'ordinal_in_source': int(ordinal), 'kind': kind, 'statement': statement}]


def validate_facts_and_inputs(bundle):
    inventory = bundle.obj('common-fact-inventory.json')
    common = bundle.obj('comparison-runs/common-representation.json')
    records = inventory['records']
    fields(inventory, ('schema','synthetic','notice','record_count','ordering','records'), 'fact inventory')
    fields(common, ('schema','records','worker_capture_bindings'), 'common representation')
    require(inventory['schema'] == 'john.open-scaffold.synthetic-fact-inventory.v1' and inventory['synthetic'] is True and
            integer(inventory['record_count'], 'record count') == 12 and common['records'] == records, 'same ordered facts mismatch')
    formatter.validate_records(records)
    for sequence, record in enumerate(records, 1):
        worker = 'ABC'[(sequence - 1) // 4]
        require(record['worker'] == worker and record['task'] == TASKS[worker] and record['run'] == worker + '-r1',
                'fact identity mismatch')
        require(record['kind'] in ('observed', 'inferred', 'unresolved'), 'unknown epistemic category')
        require(record['evidence_ref'].startswith('fixture/' + worker + '/'), 'source reference identity mismatch')
        w, task, run, notes = source_records(bundle, record['evidence_ref'])
        require((w, task, run) == (worker, TASKS[worker], worker + '-r1'), 'source task/run identity mismatch')
        for n, note in enumerate(notes, 1):
            fields(note, ('ordinal_in_source', 'kind', 'statement'), 'source note')
            require(integer(note['ordinal_in_source'], 'source ordinal') == n, 'source ordinal mismatch')
            require(note['kind'] in ('observed', 'inferred', 'unresolved') and type(note['statement']) is str,
                    'source category/type mismatch')
        ordinal = record['ordinal_in_source']
        require(ordinal <= len(notes) and notes[ordinal - 1] == {k: record[k] for k in
                ('ordinal_in_source', 'kind', 'statement')}, 'source fact/category/ordinal mismatch')
    instructions = bundle.obj('comparison-instructions.json')
    require(instructions['unchanged_contract']['fixed_order_schedule'] == SCHEDULE and
            instructions['unchanged_contract']['required_fact_count'] == 12, 'instruction contract mismatch')
    for binding in common['worker_capture_bindings']:
        bundle.binding(binding)
    for worker in 'ABC':
        stem = 'worker-' + worker
        text = bundle.text('comparison-runs/inputs/' + stem + '.txt')
        prefix = instructions['worker'] + '\n\nSelected worker manifest:\n\n'
        require(text.startswith(prefix), 'fixed worker instruction framing mismatch')
        decoder = json.JSONDecoder(object_pairs_hook=unique_members)
        manifest, _ = decoder.raw_decode(text[len(prefix):])
        fields(manifest, ('schema', 'synthetic', 'notice', 'worker', 'task', 'run', 'access', 'path_base',
                          'evidence_refs', 'source_order', 'instructions', 'execution_isolation'), 'worker manifest')
        require((manifest['worker'], manifest['task'], manifest['run']) == (worker, TASKS[worker], worker + '-r1'),
                'worker manifest identity mismatch')
        expected_records = [{k: r[k] for k in ('kind', 'statement', 'evidence_ref', 'ordinal_in_source')}
                            for r in records if r['worker'] == worker]
        require(manifest['source_order'] == [{k: r[k] for k in ('evidence_ref', 'ordinal_in_source')}
                for r in expected_records], 'worker source order mismatch')
        expected_refs = list(dict.fromkeys(r['evidence_ref'] for r in expected_records))
        require([b['path'] for b in manifest['evidence_refs']] == expected_refs, 'worker evidence reference order mismatch')
        reconstructed = prefix + json.dumps(manifest, indent=2, ensure_ascii=False) + '\n'
        for binding in manifest['evidence_refs']:
            ref = bundle.binding(binding)
            reconstructed += '\nSource evidence: ' + ref + '\n\n' + bundle.text(ref) + '\n'
        require(text == reconstructed, 'materialized worker input reconstruction mismatch')
        raw = bundle.obj('comparison-runs/raw/' + stem + '.txt')
        fields(raw, ('schema', 'worker', 'task', 'run', 'records'), 'worker raw report')
        require(raw['schema'] == 'john.open-scaffold.worker-report.v1' and
                (raw['worker'], raw['task'], raw['run']) == (worker, TASKS[worker], worker + '-r1') and
                raw['records'] == expected_records, 'worker exact ordered report mismatch')
    parity = formatter.parity(records)
    require(parity['ordered_semantic_sha256'] == '8adf7272ae2155782b1b4f67a2dc27df7c7a741676a6778158659368435cc7bd',
            'frozen ordered semantics changed')
    for pair in range(1, 4):
        for arm in ('plain', 'osc'):
            stem = f'pair-{pair}-{arm}'
            formatted = formatter.render(records, arm)
            require(formatter.parse(formatted, arm) == records, 'frozen formatter parity mismatch')
            coordinator = instructions['coordinator'] + '\n\nSynthetic worker reports:\n' + formatted
            require(bundle.text('comparison-runs/inputs/' + stem + '-coordinator.txt') == coordinator,
                    'fixed coordinator framing/arm rendering mismatch')
            reader = instructions['reader'] + '\n\nFixed recovery request:\n' + instructions['recovery_request'] + \
                     '\n\nRecorded synthetic handoff:\n' + bundle.text('comparison-runs/raw/' + stem + '-coordinator.txt')
            require(bundle.text('comparison-runs/inputs/' + stem + '-reader.txt') == reader,
                    'reader own handoff/fixed recovery request mismatch')
    return records, instructions, parity


def utc(text):
    require(type(text) is str, 'timestamp type mismatch')
    return datetime.strptime(text, '%Y-%m-%dT%H:%M:%SZ')


def raw_clock(obj):
    fields(obj, ('current_time',), 'raw clock object')
    return datetime.strptime(obj['current_time'], '%Y-%m-%d %H:%M:%S UTC')


def validate_captures(bundle, instructions, frozen):
    sessions, dispatches, captures = set(), set(), {}
    original_sum = 0
    previous_end = None
    for index, stem in enumerate(STEMS):
        capture = bundle.obj('comparison-runs/captures/' + stem + '.json')
        fields(capture, ('schema', 'stage', 'worker', 'pair', 'arm', 'dispatch_id', 'session_id', 'started_at',
                         'ended_at', 'wall_seconds', 'reported_outcome', 'outcome', 'validation_errors', 'input_binding',
                         'raw_binding', 'raw_characters', 'usage', 'termination_binding', 'admission_binding',
                         'metadata_authority'), 'capture')
        if stem.startswith('worker-'):
            stage, worker, pair, arm = 'worker', stem[-1], None, None
            identity = '/root/p181_worker_' + worker.lower()
        else:
            _, pair_text, arm, stage = stem.split('-'); pair, worker = int(pair_text), None
            identity = f'/root/p181_p{pair}_{arm}_{stage}'
        require((type(capture['pair']) is int if pair is not None else capture['pair'] is None), 'capture pair type mismatch')
        require((capture['stage'], capture['worker'], capture['pair'], capture['arm']) == (stage, worker, pair, arm),
                'capture identity mismatch')
        require(capture['schema'] == 'john.open-scaffold.native-capture.v1' and
                capture['dispatch_id'] == identity and capture['session_id'] == identity, 'native capture identity mismatch')
        require(identity not in sessions and capture['dispatch_id'] not in dispatches, 'duplicate native session/dispatch')
        sessions.add(identity);dispatches.add(capture['dispatch_id'])
        require(capture['outcome'] == capture['reported_outcome'] == 'success' and capture['validation_errors'] == [],
                'capture outcome mismatch')
        for field, subdir, suffix in [('input_binding', 'inputs', '.txt'), ('raw_binding', 'raw', '.txt')]:
            bundle.binding(capture[field], f'comparison-runs/{subdir}/{stem}{suffix}')
        bundle.binding(capture['admission_binding'], 'comparison-runs/admission.json')
        bundle.binding(bundle.obj('comparison-runs/inputs/' + stem + '.txt.binding.json'),
                       'comparison-runs/inputs/' + stem + '.txt')
        raw = bundle.text('comparison-runs/raw/' + stem + '.txt')
        require(integer(capture['raw_characters'], 'capture characters') == len(raw), 'raw character count mismatch')
        require(capture['usage'] == {'availability': 'unavailable', 'input_tokens': None, 'output_tokens': None,
                                   'total_tokens': None, 'source': None}, 'usage must remain unavailable')
        start, end = utc(capture['started_at']), utc(capture['ended_at'])
        seconds = number(capture['wall_seconds'], 'capture wall seconds')
        require((end - start).total_seconds() == seconds and 0 <= seconds <= 180, 'capture clock arithmetic/limit mismatch')
        original_sum += seconds
        if index >= 3:
            require(previous_end is None or start >= previous_end, 'fixed execution order timing mismatch')
            previous_end = end
        dispatch = bundle.obj('comparison-runs/incoming/' + stem + '-dispatch.json')
        require(dispatch['role'] == stage and dispatch['dispatch_id'] == identity and dispatch['session_id'] == identity
                and dispatch['fork_turns'] == 'none', 'dispatch identity/fresh-context mismatch')
        if stage == 'worker':
            require(dispatch['worker'] == worker, 'worker dispatch identity mismatch')
        else:
            require(dispatch['pair'] == pair and dispatch['arm'] == arm, 'paired dispatch identity mismatch')
        require(dispatch.get('model', dispatch.get('actual_model')) == 'inherited/unreported' and
                dispatch['provider_session_id'] is None and
                dispatch.get('native_system_tool_context', dispatch.get('native_hidden_system_tools')) == 'unmeasured',
                'dispatch unknown model/context boundary mismatch')
        projected = dispatch['routing_text']
        require(projected.count('<STUDY_ROOT>') == 1 and '<STUDY_ROOT>/comparison-runs/inputs/' + stem + '.txt' in projected,
                'routing projection points to wrong input')
        require(metrics(projected) == dispatch['routing_projection_binding'], 'routing projection digest/size mismatch')
        digest_shape(dispatch['original_routing_binding'])
        rule = dispatch['routing_projection_rule']
        fields(rule, ('placeholder','original_root_utf8_bytes','replacements'), 'routing projection rule')
        require(rule['placeholder'] == '<STUDY_ROOT>' and rule['replacements'] == 1 and
                type(rule['original_root_utf8_bytes']) is int and rule['original_root_utf8_bytes'] > len('<STUDY_ROOT>') and
                dispatch['original_routing_binding']['utf8_bytes'] == len(projected.encode('utf-8')) +
                rule['original_root_utf8_bytes'] - len('<STUDY_ROOT>'), 'routing projection size relation mismatch')
        if 'complete_supplied_characters' in dispatch:
            require(integer(dispatch['complete_supplied_characters'], 'original complete characters') ==
                    len(bundle.text('comparison-runs/inputs/' + stem + '.txt')) + len(projected) +
                    rule['original_root_utf8_bytes'] - len('<STUDY_ROOT>'), 'original complete character arithmetic mismatch')
        require(dispatch['materialized_utf8_bytes'] == capture['input_binding']['utf8_bytes'] and
                dispatch['complete_supplied_utf8_bytes'] == dispatch['materialized_utf8_bytes'] +
                dispatch['original_routing_binding']['utf8_bytes'], 'original routing/materialized size arithmetic mismatch')
        if 'materialized_sha256' in dispatch:
            require(dispatch['materialized_sha256'] == capture['input_binding']['sha256'], 'dispatch materialized digest mismatch')
        if index >= 5:
            clock = bundle.obj('comparison-runs/incoming/' + stem + '-clock.json')
            fields(clock, ('schema','dispatch_id','session_id','native_dispatch_tool_readback','completion_event_source',
                           'start_raw_clock_tool_result','end_raw_clock_tool_result','started_at','ended_at',
                           'conservative_parent_observation_seconds','observation_latency','usage','actual_model','raw_sha256','raw_boundary'),
                   'actual clock receipt')
            require(clock['schema'] == 'john.open-scaffold.actual-clock-observation.v2' and
                    clock['usage'] is None and clock['actual_model'] == 'inherited/unreported' and
                    dispatch['started_at'] == capture['started_at'], 'actual clock boundary mismatch')
            require(clock['dispatch_id'] == clock['session_id'] == identity and
                    clock['native_dispatch_tool_readback']['task_name'] == identity, 'actual clock identity mismatch')
            require(clock['started_at'] == capture['started_at'] and clock['ended_at'] == capture['ended_at'] and
                    raw_clock(clock['start_raw_clock_tool_result']) == start and
                    raw_clock(clock['end_raw_clock_tool_result']) == end and
                    raw_clock(dispatch['start_raw_clock_tool_result']) == start and
                    clock['conservative_parent_observation_seconds'] == seconds and
                    clock['raw_sha256'] == capture['raw_binding']['sha256'], 'last-ten actual clock arithmetic/binding mismatch')
        if stage == 'coordinator':
            termination_ref = f'comparison-runs/incoming/pair-{pair}-{arm}-termination.json'
            require(capture['termination_binding'] is not None, 'coordinator termination missing')
            bundle.binding(capture['termination_binding'], termination_ref)
            termination = bundle.obj(termination_ref)
            termination_fields = ('dispatch_id','session_id','termination_observed','observed_at','evidence')
            if not (pair == 1 and arm == 'plain'):
                termination_fields += ('schema','native_interrupt_readback','boundary')
            fields(termination, termination_fields, 'termination receipt')
            if not (pair == 1 and arm == 'plain'):
                require(termination['schema'] == 'john.open-scaffold.coordinator-termination.v1' and
                        termination['native_interrupt_readback'] == {'previous_status':'completed','payload_match':True},
                        'termination native interrupt readback mismatch')
            require(termination['dispatch_id'] == termination['session_id'] == identity and
                    termination['termination_observed'] is True and type(termination['evidence']) is str and
                    bool(termination['evidence']), 'coordinator termination identity/evidence mismatch')
            reader = bundle.obj(f'comparison-runs/captures/pair-{pair}-{arm}-reader.json')
            require(end <= utc(termination['observed_at']) <= utc(reader['started_at']) and
                    reader['session_id'] != identity, 'coordinator termination/fresh-reader linkage mismatch')
        else:
            require(capture['termination_binding'] is None, 'unexpected non-coordinator termination')
        captures[stem] = capture
    correction = bundle.obj('comparison-runs/timing-correction-001.json')
    first = captures['pair-1-plain-reader']
    require(correction['affected_original'] == 'comparison-runs/captures/pair-1-plain-reader.json' and
            correction['original_sha256'] == bundle.artifacts[correction['affected_original']]['original_binding']['sha256'],
            'timing correction original binding mismatch')
    require(first['wall_seconds'] == 64 and first['ended_at'] == '2026-10-08T02:49:32Z' and
            correction['superseded_for_timing_measurement'] == {'ended_at': first['ended_at'], 'wall_seconds': 64},
            'original false 64-second receipt not preserved')
    corrected = correction['corrected_root_attestation']
    require(corrected == {'started_at': first['started_at'], 'ended_at': '2026-10-08T02:50:01Z',
                          'wall_seconds_upper_bound': 93} and
            (utc(corrected['ended_at']) - utc(corrected['started_at'])).total_seconds() == 93,
            '93-second Root-attested correction mismatch')
    require(correction['raw_outputs_and_original_receipts_unchanged'] is True and correction['no_score_or_rerun'] is True,
            'timing-only correction boundary mismatch')
    require(original_sum == 1110 and sum(captures[s]['wall_seconds'] for s in STEMS[:5]) == 500 and
            correction['aggregate_upper_bound_seconds'] == 529 and correction['frozen_driver_prior_sum_seconds'] == 500,
            'original/prior aggregate mismatch')
    require(bundle.study['timing']['original_receipt_sum_seconds'] == original_sum and
            bundle.study['timing']['correction_overlay_seconds'] == 93 - 64 == 29 and
            bundle.study['timing']['effective_parent_aggregate_seconds'] == original_sum + 29 == 1139 and
            frozen['effective_conservative_aggregate_upper_bound_seconds'] == 1139 and
            frozen['frozen_driver_receipt_sum_seconds'] == 1110 and frozen['correction_overlay_seconds'] == 29,
            'corrected aggregate mismatch: expected 1139 = 1110 + 29')
    halt = bundle.obj('comparison-runs/halt.json');continuation = bundle.obj('comparison-runs/continuation-admission-001.json')
    require(halt['actual_invocations_so_far'] == continuation['actual_invocations_before_continuation'] == 5 and
            halt['reported_wall_seconds'] == 64 and halt['actual_observed_wall_upper_bound_seconds'] == 93 and
            continuation['remaining_invocations'] == 10 and continuation['admitted'] is True and
            continuation['previous_halt_preserved'] is True and continuation['correction_applies_to_timing_only'] is True and
            continuation['corrected_prior_aggregate_upper_bound_seconds'] == 529 and
            continuation['task_allowance_seconds'] == 180 and continuation['total_conservative_allowance_seconds'] == 2700 and
            1139 <= instructions['settings']['total_wall_seconds_proposal'] == 2700,
            'halt/continuation/allowance mismatch')
    return captures


def response_view(who, response):
    primary = who == 'primary'
    return {'facts': response['per_fact_scores' if primary else 'fact_scores'],
            'correct': response['score_correct_facts' if primary else 'facts_correct'],
            'required': response['required_fact_count' if primary else 'facts_required_in_scope'],
            'raw': response['raw_output_binding' if primary else 'raw_output'],
            'unsupported': response['unsupported_completion_merge_publication_assertions' if primary else 'unsupported_completion_claims'],
            'unsupported_count': response['unsupported_completion_merge_publication_assertion_count' if primary else 'unsupported_completion_claim_count']}


EXCERPT_LIST_FIELDS = ('supporting_source_excerpts', 'attribution_source_excerpts',
                       'scope_excerpts', 'source_excerpts')


def verify_excerpt(bundle, excerpt, raw_key, text_field):
    fields(excerpt, ('path', 'start_line', 'end_line', text_field), 'assessment excerpt')
    require(key_for(excerpt['path']) == raw_key, 'excerpt bound to wrong output')
    text = bundle.text(raw_key)
    start = integer(excerpt['start_line'], 'excerpt start line')
    end = integer(excerpt['end_line'], 'excerpt end line')
    lines = text.splitlines(keepends=True)
    require(1 <= start <= end <= len(lines), 'nonexistent excerpt lines')
    actual = excerpt[text_field]
    require(type(actual) is str and bool(actual), 'assessment excerpt: nonempty text required')
    expected = (''.join(lines[start - 1:end]) if text_field == 'text' else
                '\n'.join(text.splitlines()[start - 1:end]))
    # Worker JSON is one line; the second assessor recorded exact substrings of that line.
    worker_substring = ('/raw/worker-' in raw_key and text_field == 'verbatim_excerpt' and
                        len(lines) == 1 and start == end == 1)
    require(actual in expected if worker_substring else actual == expected,
            'excerpt does not match correct raw output: ' + raw_key)


def verify_excerpts(bundle, value, raw_key, text_field):
    # Discover declared fields, never infer excerpt validity from existing line bounds.
    count = 0
    if type(value) is dict:
        for name, nested in value.items():
            if name in EXCERPT_LIST_FIELDS:
                require(type(nested) is list, 'assessment excerpt: expected list')
                for excerpt in nested:
                    verify_excerpt(bundle, excerpt, raw_key, text_field)
                count += len(nested)
            elif name == 'source_excerpt':
                verify_excerpt(bundle, nested, raw_key, text_field)
                count += 1
            else:
                count += verify_excerpts(bundle, nested, raw_key, text_field)
    elif type(value) is list:
        for nested in value:
            count += verify_excerpts(bundle, nested, raw_key, text_field)
    return count


def verify_secondary_excerpts(bundle, findings, raw_key, text_field):
    require(type(findings) is list, 'assessment excerpt: expected secondary findings list')
    for finding in findings:
        require(type(finding) is dict and bool(finding), 'assessment excerpt: secondary finding record required')
        if set(finding) & {'path', 'start_line', 'end_line', 'text', 'verbatim_excerpt'}:
            verify_excerpt(bundle, finding, raw_key, text_field)
        else:
            require(verify_excerpts(bundle, finding, raw_key, text_field) > 0,
                    'assessment excerpt: secondary finding support missing')


def validate_assessments(bundle, records):
    responses_by_assessor = {}
    for who, assessment in bundle.assessments.items():
        fields(assessment, ('schema', 'assessor', 'projection_notice', 'original_assessment_binding',
                            'original_markdown_binding', 'responses', 'frozen_assessor_summary'), 'assessment projection')
        require(assessment['assessor'] == who and assessment['schema'] == 'open-scaffold.orchestrator-handoff.assessment-projection.v1',
                'assessor identity/schema mismatch')
        for extension, field in [('json', 'original_assessment_binding'), ('md', 'original_markdown_binding')]:
            digest_shape(assessment[field])
            stored = bundle.artifacts[f'comparison-grading-{who}.{extension}']['original_binding']
            require(all(assessment[field][k] == stored[k] for k in ('sha256', 'utf8_bytes')), 'original assessment digest mismatch')
        responses = assessment['responses']
        expected_stems = set(STEMS if who == 'independent' else STEMS[3:])
        require(type(responses) is list and len(responses) == len(expected_stems) and
                {r['stem'] for r in responses} == expected_stems, 'assessment response identities missing/duplicate')
        mapped = {}
        for response in responses:
            response_fields = PRIMARY_RESPONSE_FIELDS if who == 'primary' else INDEPENDENT_RESPONSE_FIELDS
            if who == 'independent' and response['stage'] != 'worker':
                response_fields += ('disagreement_and_presentation_preservation','smallest_safe_next_action')
            fields(response, response_fields, 'assessed response')
            stem = response['stem'];view = response_view(who, response)
            raw_key = 'comparison-runs/raw/' + stem + '.txt'
            bundle.binding(view['raw'], raw_key)
            capture = bundle.obj('comparison-runs/captures/' + stem + '.json')
            require(all(response[k] == capture[k] for k in ('stage', 'pair', 'arm')), 'assessment response identity mismatch')
            if who == 'independent':
                require(response['worker'] == capture['worker'] and response['native_dispatch_id'] == capture['dispatch_id'] and
                        response['native_session_id'] == capture['session_id'] and response['raw_characters'] == capture['raw_characters'],
                        'assessment native/capture identity mismatch')
                bundle.binding(response['capture'], 'comparison-runs/captures/' + stem + '.json')
            expected_records = records if response['stage'] != 'worker' else [r for r in records if r['worker'] == response['worker']]
            expected_ids = FACT_IDS if response['stage'] != 'worker' else [f for f in FACT_IDS if f[0] == response['worker']]
            facts = view['facts']
            require(type(response['pair']) is int if response['stage'] != 'worker' else response['pair'] is None,
                    'assessment pair type mismatch')
            for count_field in ('omission_count','critical_omission_count','attribution_error_count'):
                integer(response[count_field], count_field)
            integer(view['unsupported_count'], 'unsupported count')
            number(response['omission_fraction'], 'omission fraction')
            require(type(facts) is list and len(facts) == len(expected_records) and [f['fact_id'] for f in facts] == expected_ids,
                    'assessment requires ordered unique binary facts')
            for fact, record in zip(facts, expected_records):
                fields(fact, PRIMARY_FACT_FIELDS if who == 'primary' else INDEPENDENT_FACT_FIELDS, 'assessed fact')
                require(integer(fact['score'], 'binary score') in (0, 1), 'nonbinary fact score')
                for field in ('omitted', 'critical', 'critical_omission'):
                    boolean(fact[field], field)
                require(fact['critical'] == (fact['fact_id'] in CRITICAL) and
                        fact['critical_omission'] == (fact['critical'] and fact['omitted']), 'critical omission inconsistency')
                if who == 'primary':
                    expected = {'expected_worker':record['worker'], 'expected_task':record['task'], 'expected_run':record['run'],
                                'expected_evidence':record['evidence_ref'], 'expected_epistemic_kind':record['kind'], 'required_fact':record['statement']}
                    require(all(fact[k] == v for k,v in expected.items()), 'assessment expected fact/provenance mismatch')
                    supporting, attribution = fact['supporting_source_excerpts'], fact['attribution_source_excerpts']
                    category = fact['epistemic_kind_preserved']; correct = fact['attribution_correct']
                    require(set(correct) == {'worker','task','run','evidence','applicable_heads'} and
                            all(type(v) is bool for v in correct.values()), 'assessment attribution flags mismatch')
                else:
                    expected = {'id':fact['fact_id'], 'worker':record['worker'], 'task':record['task'], 'run':record['run'],
                                'kind':record['kind'], 'fact':record['statement'], 'evidence':record['evidence_ref']}
                    require(fact['expected'] == expected, 'assessment expected fact/provenance mismatch')
                    attr = fact['attribution']
                    fields(attr, ('worker','task','run','evidence','correct','wrong_worker','wrong_task','wrong_run',
                                  'wrong_head','wrong_evidence','scope_excerpts'), 'fact attribution')
                    require(all(attr[k] == record[v] for k,v in [('worker','worker'),('task','task'),('run','run'),('evidence','evidence_ref')]),
                            'assessment attribution identity mismatch')
                    require(type(fact['covered_semantic_clauses']) is list and all(type(x) is str for x in fact['covered_semantic_clauses']),
                            'semantic clause labels type mismatch')
                    fields(fact['assessor_uncertainty'], ('status','note'), 'fact uncertainty')
                    require(all(type(x) is str for x in fact['assessor_uncertainty'].values()), 'fact uncertainty type mismatch')
                    supporting, attribution = fact['source_excerpts'], attr['scope_excerpts']
                    category = fact['epistemic_category_preserved'];correct = {'correct':attr['correct']}
                    require(all(type(attr[k]) is bool for k in ('correct','wrong_worker','wrong_task','wrong_run','wrong_head','wrong_evidence')),
                            'assessment attribution flags mismatch')
                require(type(fact['rationale']) is str and bool(fact['rationale']) and
                        type(fact['assessor_uncertainty']) is (str if who == 'primary' else dict) and
                        bool(fact['assessor_uncertainty']), 'fact rationale/uncertainty missing')
                require(type(supporting) is list and type(attribution) is list, 'support/attribution excerpts type mismatch')
                boolean(category, 'epistemic category preserved')
                if fact['score'] == 1:
                    require(not fact['omitted'] and category and all(correct.values()) and bool(supporting) and bool(attribution),
                            'binary score/support/attribution inconsistency')
            require(integer(view['correct'], 'correct count') == sum(f['score'] for f in facts) and
                    integer(view['required'], 'required count') == len(facts), 'assessment score/count disagreement')
            omitted = [f['fact_id'] for f in facts if f['omitted']]
            critical_omitted = [f['fact_id'] for f in facts if f['critical_omission']]
            require(response['omitted_fact_ids'] == omitted and response['omission_count'] == len(omitted) and
                    response['critical_omitted_fact_ids'] == critical_omitted and response['critical_omission_count'] == len(critical_omitted) and
                    response['omission_fraction'] == len(omitted)/len(facts), 'assessment omission count disagreement')
            require(type(view['unsupported']) is list and view['unsupported_count'] == len(view['unsupported']) and
                    type(response['attribution_errors']) is list and response['attribution_error_count'] == len(response['attribution_errors']),
                    'assessment secondary count disagreement')
            if who == 'primary':
                require(response['accuracy'] == view['correct']/view['required'] and response['critical_fact_ids'] == CRITICAL,
                        'assessment accuracy/critical list disagreement')
            text_field = 'text' if who == 'primary' else 'verbatim_excerpt'
            verify_excerpts(bundle, response, raw_key, text_field)
            secondary_findings = [view['unsupported'], response['attribution_errors']]
            if who == 'primary':
                secondary_findings.append(response['other_unsupported_zero_usage_cost_scalability_assertions'])
            for findings in secondary_findings:
                verify_secondary_excerpts(bundle, findings, raw_key, text_field)
            require(type(response['assessor_uncertainty' if who == 'primary' else 'score_uncertainty']) is str,
                    'response uncertainty missing')
            if response['stage'] != 'worker':
                findings = response['disagreement_and_open_decision_preservation' if who == 'primary' else 'disagreement_and_presentation_preservation']
                topics = list(findings.values()) if who == 'primary' else findings
                require({x['fact_id'] for x in topics} == ({'A4','C2','C3','B4','B2'} if who == 'primary' else {'A4','C2','C3','B4'}),
                        'disagreement/open-decision findings missing')
                for topic in topics:
                    fields(topic, ('preserved','fact_id','source_excerpts') if who == 'primary' else
                           ('topic','fact_id','preserved','source_excerpts'), 'preservation topic')
                    boolean(topic['preserved'], 'topic preserved')
                    require(type(topic['source_excerpts']) is list and bool(topic['source_excerpts']), 'topic support missing')
            mapped[stem] = response
        validate_frozen_summary(who, assessment['frozen_assessor_summary'], mapped)
        responses_by_assessor[who] = mapped
    return responses_by_assessor


def validate_frozen_summary(who, summary, mapped):
    for stage in ('reader','coordinator'):
        rs=[r for r in mapped.values() if r['stage']==stage]
        values={'omissions':sum(r['omission_count'] for r in rs),
                'critical':sum(r['critical_omission_count'] for r in rs),
                'unsupported':sum(response_view(who,r)['unsupported_count'] for r in rs),
                'attribution':sum(r['attribution_error_count'] for r in rs)}
        if who=='primary':
            stated=summary['secondary_summary'][stage+'s']
            expected={'required_fact_omissions_total':values['omissions'],'critical_omissions_total':values['critical'],
                      'unsupported_completion_merge_publication_assertions_total':values['unsupported'],
                      'attribution_errors_total':values['attribution'],
                      'all_required_disagreements_and_open_decisions_preserved':all(
                          x['preserved'] for r in rs for x in r['disagreement_and_open_decision_preservation'].values())}
            require(stated==expected,'frozen secondary summary/count disagreement')
        else:
            stated=summary['secondary_summary']
            for field, value in [('omissions',values['omissions']),('critical_omissions',values['critical']),
                                 ('unsupported_completion_claims',values['unsupported']),('attribution_errors',values['attribution'])]:
                require(stated[stage+'_'+field+'_total']==value,'frozen secondary summary/count disagreement')
    for arm in ('plain','osc'):
        rs=[mapped[f'pair-{pair}-{arm}-reader'] for pair in range(1,4)]
        count=sum(response_view(who,r)['correct'] for r in rs)
        if who=='primary':
            stated=summary['descriptive_arm_means'][arm]
            expected={'reader_count':3,'correct_fact_total':count,'possible_fact_total':36,
                      'mean_correct_facts':count/3,'mean_accuracy':count/36,
                      'mean_omission_count':sum(r['omission_count'] for r in rs)/3,
                      'mean_critical_omission_count':sum(r['critical_omission_count'] for r in rs)/3,
                      'unsupported_completion_merge_publication_assertions_total':sum(response_view(who,r)['unsupported_count'] for r in rs),
                      'attribution_errors_total':sum(r['attribution_error_count'] for r in rs),
                      'coordinator_synthesis_omissions_total':sum(mapped[f'pair-{pair}-{arm}-coordinator']['omission_count'] for pair in range(1,4))}
            require(stated==expected,'frozen descriptive arm mean disagreement')
        else:
            require(summary['primary_results'][arm+'_mean_accuracy']==count/36,'frozen descriptive arm mean disagreement')
    if who=='independent':
        summary_values=summary['secondary_summary']
        for stage,correct_field,required_field in [('coordinator','all_six_coordinators_preserved_facts','all_six_coordinators_required_facts'),
                                                  ('worker','workers_preserved_facts_total','workers_required_facts_total')]:
            rs=[r for r in mapped.values() if r['stage']==stage]
            require(summary_values[correct_field]==sum(response_view(who,r)['correct'] for r in rs) and
                    summary_values[required_field]==sum(response_view(who,r)['required'] for r in rs),'frozen diagnostic summary disagreement')
        rs=[r for r in mapped.values() if r['stage']=='reader']
        require(summary['primary_results']['all_six_readers_correct_facts']==sum(response_view(who,r)['correct'] for r in rs) and
                summary['primary_results']['all_six_readers_required_facts']==72,'frozen primary total disagreement')
    paired=summary['matched_pairs'] if who=='primary' else summary['primary_results']['paired_results']
    require(len(paired)==3,'frozen paired results missing')
    for pair, order in enumerate(SCHEDULE,1):
        row=paired[pair-1]
        plain=response_view(who,mapped[f'pair-{pair}-plain-reader'])['correct']
        osc=response_view(who,mapped[f'pair-{pair}-osc-reader'])['correct']
        require(row['pair']==pair,'frozen paired result identity mismatch')
        # The assessors use different names for the same frozen quantities.
        if who=='primary':
            require(row['plain_correct_facts']==plain and row['osc_correct_facts']==osc and
                    row['preregistered_arm_order']==order and row['plain_accuracy']==plain/12 and row['osc_accuracy']==osc/12 and
                    row['osc_minus_plain_correct_facts']==osc-plain and row['osc_minus_plain_accuracy']==(osc-plain)/12 and
                    row['osc_minus_plain_percentage_points']==(osc-plain)/12*100,'frozen paired score disagreement')
        else:
            require(row['plain_correct']==plain and row['osc_correct']==osc and row['plain_accuracy']==plain/12 and
                    row['osc_accuracy']==osc/12 and row['osc_minus_plain_accuracy']==(osc-plain)/12 and
                    row['plain_required']==row['osc_required']==12 and row['preregistered_order']==order,'frozen paired score disagreement')


def derive_results(study, assessments):
    summaries = {}
    disagreement = []
    for who, assessment in assessments.items():
        mapped = {r['stem']:r for r in assessment['responses']}
        pairs=[];means={}
        for pair, order in enumerate(SCHEDULE,1):
            counts={arm:response_view(who,mapped[f'pair-{pair}-{arm}-reader'])['correct'] for arm in ('plain','osc')}
            pairs.append({'pair':pair,'order':order,'plain_correct':counts['plain'],'osc_correct':counts['osc'],
                          'required':12,'plain_accuracy':counts['plain']/12,'osc_accuracy':counts['osc']/12,
                          'osc_minus_plain_facts':counts['osc']-counts['plain'],
                          'osc_minus_plain_accuracy':(counts['osc']-counts['plain'])/12})
        secondary={}
        for stage in ('reader','coordinator'):
            rs=[r for r in mapped.values() if r['stage']==stage]
            secondary[stage]={'omissions':sum(r['omission_count'] for r in rs),
                              'critical_omissions':sum(r['critical_omission_count'] for r in rs),
                              'unsupported_completion_claims':sum(response_view(who,r)['unsupported_count'] for r in rs),
                              'attribution_errors':sum(r['attribution_error_count'] for r in rs),
                              'other_unsupported_zero_usage_cost_scalability_claims':sum(len(r.get('other_unsupported_zero_usage_cost_scalability_assertions',[])) for r in rs),
                              'disagreement_and_open_decision_assessments':{
                                  r['stem']:r['disagreement_and_open_decision_preservation' if who=='primary' else
                                             'disagreement_and_presentation_preservation'] for r in rs}}
        for arm in ('plain','osc'):
            rs=[mapped[f'pair-{p}-{arm}-reader'] for p in range(1,4)]
            count=sum(response_view(who,r)['correct'] for r in rs)
            means[arm]={'readers':3,'correct_fact_total':count,'possible_fact_total':36,'mean_correct_facts':count/3,
                        'mean_accuracy':count/36,'mean_omissions':sum(r['omission_count'] for r in rs)/3}
        summaries[who]={'pairs':pairs,'arm_means':means,'mean_paired_osc_minus_plain_accuracy':sum(p['osc_minus_plain_accuracy'] for p in pairs)/3,
                        'secondary':secondary,'uncertainty':assessment['frozen_assessor_summary']['assessor_uncertainty' if who=='primary' else 'assessor_uncertainty_and_limits']}
    for stem in STEMS[3:]:
        p=next(r for r in assessments['primary']['responses'] if r['stem']==stem)
        i=next(r for r in assessments['independent']['responses'] if r['stem']==stem)
        pf=response_view('primary',p)['facts'];inf=response_view('independent',i)['facts']
        for a,b in zip(pf,inf):
            if a['score'] != b['score']:
                disagreement.append({'stem':stem,'fact_id':a['fact_id'],'primary':a['score'],'independent':b['score']})
    measurements=[]
    for stem in STEMS:
        a=study['artifacts'];inp=a['comparison-runs/inputs/'+stem+'.txt']['payload_binding'];raw=a['comparison-runs/raw/'+stem+'.txt']['payload_binding']
        dispatch=loads(a['comparison-runs/incoming/'+stem+'-dispatch.json']['text'])
        measurements.append({'stem':stem,'materialized_input':inp,'raw_output':raw,
                             'original_routing':dispatch['original_routing_binding'],
                             'routing_projection':dispatch['routing_projection_binding'],
                             'original_complete_supplied_utf8_bytes':dispatch['complete_supplied_utf8_bytes'],
                             'original_complete_supplied_characters':dispatch.get('complete_supplied_characters'),
                             'native_hidden_system_tools':'unmeasured','exact_tokens':None})
    context_comparison={}
    by_stem={m['stem']:m for m in measurements}
    for stage in ('coordinator','reader'):
        rows=[]
        for pair in range(1,4):
            p=by_stem[f'pair-{pair}-plain-{stage}'];o=by_stem[f'pair-{pair}-osc-{stage}']
            rows.append({'pair':pair,'order':SCHEDULE[pair-1],
                         'osc_minus_plain_materialized_input_utf8_bytes':o['materialized_input']['utf8_bytes']-p['materialized_input']['utf8_bytes'],
                         'osc_minus_plain_original_complete_supplied_utf8_bytes':o['original_complete_supplied_utf8_bytes']-p['original_complete_supplied_utf8_bytes'],
                         'osc_minus_plain_raw_output_utf8_bytes':o['raw_output']['utf8_bytes']-p['raw_output']['utf8_bytes']})
        means={}
        for arm in ('plain','osc'):
            ms=[by_stem[f'pair-{pair}-{arm}-{stage}'] for pair in range(1,4)]
            means[arm]={'materialized_input_utf8_bytes':sum(m['materialized_input']['utf8_bytes'] for m in ms)/3,
                        'original_complete_supplied_utf8_bytes':sum(m['original_complete_supplied_utf8_bytes'] for m in ms)/3,
                        'raw_output_utf8_bytes':sum(m['raw_output']['utf8_bytes'] for m in ms)/3}
        context_comparison[stage]={'pairs':rows,'arm_means':means}
    return {'schema':'open-scaffold.orchestrator-handoff.results.v1',
            'interpretation':'Both frozen assessors scored every fresh reader 12/12. All three paired differences are zero: a tie at the ceiling, with no observed recovery advantage.',
            'assessments':summaries,'assessor_score_disagreement':disagreement,'context_measurements':measurements,
            'context_comparison':context_comparison,'context_limit':'Exact materialized prompts and output bytes; original routing totals use opaque source metadata. Sanitized routing projections have independent sizes. Native hidden system/tools and exact tokens are unmeasured.',
            'timing':study['timing'],'actual_model':'inherited/unreported','model_name':None,'model_version':None,
            'temperature':None,'tokenizer_version':None,'provider_usage':None,'cost':None,'reruns':0,
            'claims_supported':{'recovery_advantage':False,'statistical_significance':False,'runtime_advantage':False,
                                'cost_efficiency':False,'named_model_superiority':False,'scalability':False}}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parent)
    args=parser.parse_args()
    try:
        bundle=Bundle(args.root.resolve())
        frozen=validate_artifacts(bundle)
        records,instructions,parity=validate_facts_and_inputs(bundle)
        validate_captures(bundle,instructions,frozen)
        validate_assessments(bundle,records)
        expected=derive_results(bundle.study,bundle.assessments)
        require(bundle.results == expected, 'derived results/assessment disagreement')
        require(bundle.study['assessor_disagreement'] == expected['assessor_score_disagreement'], 'assessor disagreement mismatch')
        print(f'PASS: {len(CLOSED_ARTIFACTS)} closed artifacts, 12 ordered facts, 15 captures, 10 clocks, 6 termination links, both frozen assessment projections and derived results.')
        print('Saved-record consistency only; no execution authenticity, authority, security isolation or semantic regrading.')
    except (ValueError,KeyError,TypeError,IndexError,OSError) as error:
        print('FAIL: '+str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
