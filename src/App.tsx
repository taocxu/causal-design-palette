import { useEffect, useMemo, useState } from 'react';

type AssumptionStatus = 'clearly stated' | 'partially addressed' | 'not yet addressed';
type ThreatLevel = 'low' | 'medium' | 'high';
type PlanStatus = 'not planned' | 'planned' | 'drafted' | 'ready';
type OutputStatus = 'planned' | 'drafted' | 'ready';
type OutputType = 'table' | 'figure';
type Priority = 'core' | 'combined' | 'secondary';

interface DesignOption {
  id: string;
  name: string;
  chinese?: string;
  priority: Priority;
  bestUse: string;
  dataStructure: string;
  assumption: string;
  failureMode: string;
}

interface NestedQuestions {
  broad: string;
  intermediate: string;
  specific: string;
  mechanism: string;
  heterogeneity: string;
}

interface AssumptionItem {
  id: string;
  name: string;
  status: AssumptionStatus;
  evidence: string;
  notes: string;
}

interface ThreatItem {
  id: string;
  name: string;
  relevance: ThreatLevel;
  mitigation: string;
  notes: string;
}

interface DiagnosticItem {
  id: string;
  name: string;
  status: PlanStatus;
  purpose: string;
  variables: string;
  notes: string;
}

interface OutputItem {
  id: string;
  type: OutputType;
  name: string;
  include: boolean;
  status: OutputStatus;
  purpose: string;
  variables: string;
  notes: string;
}

interface PaletteState {
  project_title: string;
  research_question: string;
  nested_questions: NestedQuestions;
  unit_of_analysis: string;
  time_period: string;
  object_of_study: string;
  sample_scope: string;
  data_sources: string;
  current_design_status: string;
  shock_name: string;
  shock_type: 'policy' | 'event' | 'exposure';
  shock_timing: string;
  treated_or_exposed_units: string;
  comparison_units: string;
  Y: string;
  mechanism_variable: string;
  heterogeneity_dimension: string;
  selectedDesign: string;
  identifying_assumption: string;
  interpretation_limits: string;
  designNotes: Record<string, Record<string, string>>;
  assumptions: AssumptionItem[];
  threats: ThreatItem[];
  diagnostics: DiagnosticItem[];
  outputs: OutputItem[];
}

const storageKey = 'causal-design-palette-state-v2';
const legacyStorageKey = 'causal-design-palette-state-v1';

const designs: DesignOption[] = [
  {
    id: 'did',
    name: 'Difference-in-Differences',
    chinese: '双重差分法',
    priority: 'core',
    bestUse: 'A policy, event, or exposure affects some units before comparable units are affected.',
    dataStructure: 'Panel or repeated cross-section with treated and comparison units before and after exposure.',
    assumption: 'Absent the shock, treated and comparison units would have followed parallel potential-outcome trends.',
    failureMode: 'Non-comparable trends, anticipation, spillovers, or concurrent policies.',
  },
  {
    id: 'event_did',
    name: 'Event-time DiD / Event Study',
    priority: 'core',
    bestUse: 'Inspecting dynamics, pre-trends, and timing around a treatment or event within a DiD logic.',
    dataStructure: 'Panel data with event timing and relative-time indicators.',
    assumption: 'Pre-event coefficients support the underlying DiD comparison structure.',
    failureMode: 'Treating dynamic plots as identification without a defensible comparison group.',
  },
  {
    id: 'iv',
    name: 'Instrumental Variables',
    chinese: '工具变量法',
    priority: 'core',
    bestUse: 'An endogenous exposure can be shifted by variation plausibly unrelated to potential outcomes.',
    dataStructure: 'Unit-level outcome, endogenous variable, instrument, and first-stage variation.',
    assumption: 'The instrument affects the outcome only through the endogenous variable for compliers.',
    failureMode: 'Weak relevance, direct effects, invalid exclusion, or unclear LATE population.',
  },
  {
    id: 'bartik',
    name: 'Bartik / Shift-Share IV',
    priority: 'core',
    bestUse: 'Local exposure shares interact with aggregate shocks to create differential predicted exposure.',
    dataStructure: 'Predetermined shares, aggregate shocks, local outcomes, and exposure-weighted variation.',
    assumption: 'Predetermined shares and aggregate shocks are sufficiently exogenous after restrictions.',
    failureMode: 'Confounded shares, endogenous shocks, influential sectors, or incorrect standard errors.',
  },
  {
    id: 'rdd',
    name: 'Regression Discontinuity',
    chinese: '断点',
    priority: 'core',
    bestUse: 'Treatment assignment changes discontinuously at a known cutoff of a running variable.',
    dataStructure: 'Running variable, cutoff, treatment rule, and dense observations near the threshold.',
    assumption: 'Potential outcomes are continuous at the cutoff absent treatment.',
    failureMode: 'Manipulation around the cutoff, poor bandwidth choice, or non-local interpretation.',
  },
  {
    id: 'panel_fe',
    name: 'Panel Fixed Effects',
    chinese: '固定效应模型',
    priority: 'core',
    bestUse: 'A baseline or diagnostic structure using within-unit variation over time.',
    dataStructure: 'Panel data with stable unit identifiers and repeated observations.',
    assumption: 'Within-unit changes in treatment are not confounded by time-varying omitted variables.',
    failureMode: 'Overstating causality, bad controls, serial correlation, or weak within-unit variation.',
  },
  {
    id: 'did_iv',
    name: 'Combined DiD + IV',
    priority: 'combined',
    bestUse: 'Treatment timing is policy-relevant, but realised exposure also requires an instrument.',
    dataStructure: 'Panel comparison structure plus instrumented treatment or exposure variation.',
    assumption: 'Parallel trends and exclusion restriction both hold for the relevant comparison.',
    failureMode: 'Stacking assumptions without clarifying the estimand and complier population.',
  },
  {
    id: 'rdd_did',
    name: 'Combined RDD + DiD',
    priority: 'combined',
    bestUse: 'A local threshold assignment can be observed before and after a shock or policy change.',
    dataStructure: 'Running variable, cutoff, panel timing, and local treated/control observations.',
    assumption: 'Continuity around the cutoff and a credible local pre/post comparison.',
    failureMode: 'Unclear local estimand, unstable bandwidth, or divergent local trends.',
  },
  {
    id: 'ddd',
    name: 'Triple Difference',
    priority: 'secondary',
    bestUse: 'A third contrast removes a remaining confound in a mature DiD design.',
    dataStructure: 'Panel or repeated cross-section with three defensible comparison dimensions.',
    assumption: 'The triple contrast isolates the shock after all lower-order trends are handled.',
    failureMode: 'Opaque interpretation and fragile common-trends requirements.',
  },
  {
    id: 'synthetic',
    name: 'Synthetic Control',
    priority: 'secondary',
    bestUse: 'One or a few treated aggregate units can be compared with a weighted donor pool.',
    dataStructure: 'Aggregate panel with rich pre-treatment predictors and a clean intervention date.',
    assumption: 'A convex combination of donors can reproduce the treated unit’s counterfactual path.',
    failureMode: 'Poor pre-fit, donor contamination, or weak inference from too few units.',
  },
];

const designFields: Record<string, string[]> = {
  did: ['treatment timing', 'treated group', 'comparison group', 'pre-treatment window', 'post-treatment window', 'parallel trends logic', 'no anticipation', 'spillover risk', 'fixed effects', 'clustering level', 'event-time figure plan', 'placebo tests', 'interpretation boundary'],
  event_did: ['event definition', 'event date or treatment timing', 'relative time variable', 'omitted baseline period', 'pre-period coefficients', 'post-period dynamics', 'anticipation window', 'dynamic treatment effects', 'visual inspection plan', 'connection to DiD', 'limits of interpretation'],
  iv: ['endogenous variable', 'instrument', 'relevance argument', 'exclusion restriction', 'first stage', 'reduced form', 'monotonicity', 'direct-effect risk', 'weak-IV diagnostics', 'interpretation as LATE', 'over-identification if applicable'],
  bartik: ['local exposure shares', 'aggregate shocks', 'predetermined shares', 'leave-one-out construction', 'relevance argument', 'shock exogeneity', 'share exogeneity', 'industry or region confounds', 'standard errors', 'recent Bartik critiques', 'interpretation as exposure-weighted variation'],
  rdd: ['running variable', 'cutoff', 'treatment assignment rule', 'bandwidth', 'continuity assumption', 'manipulation test', 'covariate balance', 'local interpretation', 'polynomial choice', 'robustness to bandwidth', 'visual discontinuity plot plan'],
  panel_fe: ['panel unit', 'time period', 'treatment variation', 'unit fixed effects', 'time fixed effects', 'time-varying controls', 'within-unit variation', 'bad-control risk', 'serial correlation', 'clustering level', 'interpretation boundary'],
  did_iv: ['DiD treatment structure', 'instrument for treatment or exposure', 'first-stage logic', 'parallel trends logic', 'exclusion restriction', 'combined interpretation', 'first-stage table plan', 'event-time diagnostic plan', 'robustness checks', 'threats from both designs'],
  rdd_did: ['running variable', 'cutoff', 'pre/post or treated/control timing', 'local comparison logic', 'DiD comparison logic', 'continuity assumption', 'parallel trends or local-trend assumption', 'bandwidth choice', 'event-time or pre-trend check', 'interpretation as local dynamic effect', 'robustness checks'],
  ddd: ['first difference', 'second difference', 'third difference', 'treated group', 'comparison group', 'additional contrast group', 'identifying variation', 'triple interaction specification logic', 'common-trends risks', 'interpretation boundary'],
  synthetic: ['treated unit', 'donor pool', 'intervention date', 'predictors', 'pre-treatment fit', 'donor contamination risk', 'placebo units', 'post-treatment divergence', 'inference plan', 'interpretation boundary'],
};

const assumptionNames = [
  'treatment or shock is clearly defined',
  'comparison group is defensible',
  'timing is clear',
  'pre-treatment information exists',
  'identifying assumption is stated',
  'spillover risk is considered',
  'anticipation risk is considered',
  'measurement error is considered',
  'interpretation boundary is stated',
];

const threatNames = ['selection bias', 'reverse causality', 'omitted variables', 'measurement error', 'spillovers', 'anticipation', 'simultaneous policies', 'bad controls', 'weak first stage', 'weak pre-trend support', 'external validity limits'];

const diagnosticSeeds = [
  ['pre-trend/event-time plot', 'Assess whether pre-treatment trends support the comparison structure.'],
  ['placebo outcome', 'Test whether the design predicts an outcome that should not respond.'],
  ['placebo treatment date', 'Check whether effects appear before the actual shock.'],
  ['alternative control group', 'Evaluate sensitivity to comparison-unit construction.'],
  ['alternative treatment definition', 'Assess robustness to exposure measurement.'],
  ['alternative Y definition', 'Check whether results depend on one outcome measure.'],
  ['leave-one-out test', 'Inspect influence from sectors, regions, cohorts, or donors.'],
  ['balance test', 'Compare pre-treatment covariates across groups.'],
  ['first-stage diagnostics', 'Document instrument relevance where IV logic is used.'],
  ['weak-IV diagnostics', 'Evaluate weak-instrument risk where IV logic is used.'],
  ['bandwidth sensitivity', 'Assess local RDD sensitivity.'],
  ['covariate continuity check', 'Test continuity of predetermined covariates around an RDD cutoff.'],
  ['clustering robustness', 'Check inference sensitivity to plausible clustering levels.'],
  ['multiple-testing caution', 'Avoid over-reading many mechanism or heterogeneity estimates.'],
  ['mechanism test', 'Probe whether the theorised economic channel moves as expected.'],
  ['heterogeneity test', 'Assess effect variation tied to ex ante theory.'],
];

const outputSeeds: Array<[string, OutputType, string, string, boolean]> = [
  ['summary', 'table', 'Summary statistics table', 'Describe sample composition before modelling.', true],
  ['balance', 'table', 'Balance table', 'Assess pre-treatment comparability.', true],
  ['baseline', 'table', 'Baseline results table', 'State the main estimating contrast.', true],
  ['event_table', 'table', 'Event-time / dynamic effects table', 'Summarise dynamic coefficients.', false],
  ['mechanism_table', 'table', 'Mechanism table', 'Connect the design to a plausible economic channel.', false],
  ['heterogeneity_table', 'table', 'Heterogeneity table', 'Show theoretically motivated effect variation.', false],
  ['robustness_table', 'table', 'Robustness table', 'Discipline alternative definitions and samples.', true],
  ['first_stage', 'table', 'First-stage table', 'Document instrument relevance for IV and Bartik designs.', false],
  ['reduced_form', 'table', 'Reduced-form table', 'Show the instrument-outcome relationship.', false],
  ['rdd_bandwidth', 'table', 'RDD bandwidth robustness table', 'Report local sensitivity across bandwidths.', false],
  ['coef_plot', 'figure', 'Main coefficient plot', 'Make the principal estimate visually interpretable.', false],
  ['event_plot', 'figure', 'Event-time plot', 'Inspect dynamics and pre-treatment patterns.', true],
  ['pretrend_plot', 'figure', 'Pre-trend plot', 'Make pre-treatment evidence explicit.', true],
  ['rdd_plot', 'figure', 'RDD discontinuity plot', 'Display local discontinuity at the cutoff.', false],
  ['first_stage_fig', 'figure', 'First-stage figure', 'Visualise instrument relevance.', false],
  ['balance_fig', 'figure', 'Balance visualisation', 'Show comparability in compact form.', false],
  ['mechanism_fig', 'figure', 'Mechanism figure', 'Display the theorised channel.', false],
  ['heterogeneity_fig', 'figure', 'Heterogeneity coefficient plot', 'Compare theoretically meaningful subgroups.', false],
];

const blankDesignNotes = Object.fromEntries(
  Object.entries(designFields).map(([designId, fields]) => [designId, Object.fromEntries(fields.map((field) => [field, '']))]),
) as Record<string, Record<string, string>>;

const defaultAssumptions = assumptionNames.map((name) => ({
  id: name,
  name,
  status: ['treatment or shock is clearly defined', 'timing is clear', 'identifying assumption is stated'].includes(name)
    ? ('clearly stated' as AssumptionStatus)
    : ('partially addressed' as AssumptionStatus),
  evidence: '',
  notes: '',
}));

const defaultThreats = threatNames.map((name) => ({
  id: name,
  name,
  relevance: ['selection bias', 'spillovers', 'simultaneous policies', 'weak pre-trend support'].includes(name) ? ('high' as ThreatLevel) : ('medium' as ThreatLevel),
  mitigation: name === 'weak first stage' ? 'Not central for the selected DiD demo unless an IV extension is added.' : 'Link the threat to a diagnostic, sample restriction, or robustness check.',
  notes: '',
}));

const defaultDiagnostics = diagnosticSeeds.map(([name, purpose]) => ({
  id: name,
  name,
  status: ['pre-trend/event-time plot', 'placebo treatment date', 'alternative control group', 'clustering robustness', 'mechanism test'].includes(name)
    ? ('planned' as PlanStatus)
    : ('not planned' as PlanStatus),
  purpose,
  variables: '',
  notes: '',
}));

const defaultOutputs = outputSeeds.map(([id, type, name, purpose, include]) => ({
  id,
  type,
  name,
  include,
  status: 'planned' as OutputStatus,
  purpose,
  variables: id === 'baseline' ? 'Y: patent applications; treatment: policy exposure; FE: firm, sector-year, province-year' : '',
  notes: '',
}));

const demoState: PaletteState = {
  project_title: 'Industrial Policy Shock and Firm Innovation',
  research_question: 'Does exposure to a new industrial policy programme affect subsequent firm innovation?',
  nested_questions: {
    broad: 'How do industrial policy interventions affect firm-level innovative activity?',
    intermediate: 'Do exposed manufacturing firms increase innovation after a policy programme is introduced?',
    specific: 'Does policy exposure increase patent applications among manufacturing firms from 2010 to 2022?',
    mechanism: 'Does public funding and capability-building support mediate the innovation response?',
    heterogeneity: 'Are effects stronger for firms with higher baseline technology intensity or in provinces with stronger industrial capacity?',
  },
  unit_of_analysis: 'firm-year (FE: firm, sector-year, province-year)',
  time_period: '2010-2022',
  object_of_study: 'manufacturing firms',
  sample_scope: 'Illustrative balanced or repeated firm panel; non-sensitive demo content.',
  data_sources: 'firm panel, policy documents, patent records',
  current_design_status: 'Illustrative demo. Ready for research-team discussion, not estimation.',
  shock_name: 'policy exposure',
  shock_type: 'policy',
  shock_timing: 'policy programme introduced during the panel period',
  treated_or_exposed_units: 'firms exposed to the industrial policy programme',
  comparison_units: 'otherwise similar firms not exposed during the same period',
  Y: 'patent applications',
  mechanism_variable: 'public funding and capability-building support',
  heterogeneity_dimension: 'baseline technology intensity or province-level industrial capacity',
  selectedDesign: 'did',
  identifying_assumption: 'In the absence of policy exposure, treated and comparison firms would have followed parallel innovation trends after accounting for firm, sector-year, and province-year fixed effects.',
  interpretation_limits: 'The design would speak to an ATT-style effect for exposed manufacturing firms under the maintained comparison and timing assumptions; it would not identify economy-wide general equilibrium effects.',
  designNotes: {
    ...blankDesignNotes,
    did: {
      ...blankDesignNotes.did,
      'treatment timing': 'First year of documented firm exposure to the industrial policy programme.',
      'treated group': 'Manufacturing firms exposed to the programme.',
      'comparison group': 'Manufacturing firms not exposed before the same calendar year.',
      'pre-treatment window': 'At least three years before exposure where available.',
      'post-treatment window': 'One to five years after exposure.',
      'parallel trends logic': 'Compare pre-policy patenting paths by exposure status.',
      'no anticipation': 'Check whether patent applications rise before documented exposure.',
      'spillover risk': 'Sectoral spillovers may contaminate comparison firms.',
      'fixed effects': 'Firm, sector-year, and province-year fixed effects.',
      'clustering level': 'Cluster at firm or policy-exposure aggregation level; assess serial correlation.',
      'event-time figure plan': 'Plot coefficients from leads and lags around first exposure.',
      'placebo tests': 'Use placebo treatment dates and placebo outcomes less likely to respond.',
      'interpretation boundary': 'ATT-style exposed-firm innovation response, not a macro innovation effect.',
    },
  },
  assumptions: defaultAssumptions.map((item) =>
    item.name === 'identifying assumption is stated'
      ? { ...item, evidence: 'The parallel-trends statement is explicit and tied to fixed effects.' }
      : item.name === 'comparison group is defensible'
        ? { ...item, evidence: 'Comparison units are defined, but pre-trend evidence is still required.' }
        : item,
  ),
  threats: defaultThreats,
  diagnostics: defaultDiagnostics.map((item) =>
    item.name === 'pre-trend/event-time plot'
      ? { ...item, variables: 'relative year to first exposure; patent applications; exposure cohort' }
      : item,
  ),
  outputs: defaultOutputs,
};

function cn(text: string) {
  return <span className="mt-1 block text-xs text-stone-500">{text}</span>;
}

function Section({ title, chinese, eyebrow, children }: { title: string; chinese?: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      {eyebrow ? <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-sage">{eyebrow}</p> : null}
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      {chinese ? <p className="mt-1 text-sm text-stone-500">{chinese}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, chinese, value, onChange, multiline }: { label: string; chinese?: string; value: string; onChange: (value: string) => void; multiline?: boolean }) {
  const className = 'mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/20';
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-800">{label}</span>
      {chinese ? cn(chinese) : null}
      {multiline ? <textarea className={className} value={value} onChange={(event) => onChange(event.target.value)} /> : <input className={className} value={value} onChange={(event) => onChange(event.target.value)} />}
    </label>
  );
}

function SelectField<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly T[]; onChange: (value: T) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-800">{label}</span>
      <select className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/20" value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function selectedDesignName(state: PaletteState) {
  return designs.find((design) => design.id === state.selectedDesign)?.name ?? 'not selected';
}

function scoreState(state: PaletteState) {
  const scoreItems = [
    state.research_question,
    state.shock_name,
    state.Y,
    state.unit_of_analysis,
    state.time_period,
    state.selectedDesign,
    state.identifying_assumption,
    state.threats.some((threat) => threat.relevance !== 'low' && threat.mitigation.trim()),
    state.diagnostics.some((item) => item.status !== 'not planned'),
    state.outputs.some((item) => item.include),
    state.interpretation_limits,
  ];
  const score = scoreItems.filter(Boolean).length;
  const label = score <= 3 ? 'Early sketch' : score <= 6 ? 'Plausible design outline' : score <= 9 ? 'Ready for supervisor discussion' : 'Strong design memo draft';
  return { score, label };
}

function lines(items: string[]) {
  return items.filter(Boolean).join('\n');
}

function auditSheetMarkdown(state: PaletteState) {
  const { score, label } = scoreState(state);
  const designSpecificNotes = state.designNotes[state.selectedDesign] ?? {};
  return `# Identification Audit Sheet: ${state.project_title || 'Untitled project'}

## Research Discipline Note
This audit sheet does not generate a research topic, recommend an identification strategy, or invent variables. It records the researcher’s stated question, shock, Y, comparison structure, identifying assumption, threats, mitigation plan, diagnostics, and interpretation boundary before estimation.

## Project Core
- Project title: ${state.project_title}
- Core research question: ${state.research_question}
- Unit of analysis: ${state.unit_of_analysis}
- Time period: ${state.time_period}
- Object of study: ${state.object_of_study}
- Shock: ${state.shock_name} (${state.shock_type})
- Y: ${state.Y}
- Mechanism variable: ${state.mechanism_variable}
- Heterogeneity dimension: ${state.heterogeneity_dimension}
- Selected design: ${selectedDesignName(state)}

## Nested Research Questions
- Broad question: ${state.nested_questions.broad}
- Intermediate question: ${state.nested_questions.intermediate}
- Specific empirical question: ${state.nested_questions.specific}
- Mechanism question: ${state.nested_questions.mechanism}
- Heterogeneity question: ${state.nested_questions.heterogeneity}

## Comparison Structure
- Treated or exposed units: ${state.treated_or_exposed_units}
- Comparison units: ${state.comparison_units}
- Shock timing: ${state.shock_timing}
- Sample scope: ${state.sample_scope}
- Data sources: ${state.data_sources}

## Core Identifying Assumption
${state.identifying_assumption}

## Design Notes
${lines(Object.entries(designSpecificNotes).map(([key, value]) => `- ${key}: ${value || 'not yet stated'}`))}

## Assumption Audit
${lines(state.assumptions.map((item) => `- ${item.name}: ${item.status}. Evidence: ${item.evidence || 'not yet stated'}`))}

## Threat Audit
${lines(state.threats.map((item) => `- ${item.name}: ${item.relevance}. Mitigation: ${item.mitigation || 'not yet stated'}`))}

## Mitigation Plan
${lines(state.threats.filter((item) => item.mitigation.trim()).map((item) => `- ${item.name}: ${item.mitigation}`))}

## Diagnostics and Robustness Plan
${lines(state.diagnostics.filter((item) => item.status !== 'not planned').map((item) => `- ${item.name}: ${item.status}. Purpose: ${item.purpose}. Variables: ${item.variables || 'not yet stated'}`))}

## Economics Table and Figure Plan
${lines(state.outputs.filter((item) => item.include).map((item) => `- ${item.type}: ${item.name}. Status: ${item.status}. Purpose: ${item.purpose}. Variables: ${item.variables || 'not yet stated'}`))}

## Interpretation Boundary
${state.interpretation_limits}

## Feasibility Score
${score}/11: ${label}
`;
}

function proposalPromptMarkdown(state: PaletteState) {
  return `# AI-Ready Feasibility Proposal Prompt

Use the identification audit sheet below to generate a concise feasibility-focused research proposal.

This proposal is feasibility-focused. It explains what the project asks, how the design can be implemented, what can go wrong, how risks can be mitigated, and why the current design is or is not ready for formal estimation. It does not discuss research value, policy significance, or literature contribution.

If local Codex skills are available, use local economics and academic-writing skills, especially econ-paper-writing-workflow or econ-academic-writing-workflow, to improve the structure and wording of the feasibility proposal. Do not call external APIs.

Do not invent a new research question, new concept, or new variable unless the audit sheet explicitly asks for it. Work from the user’s stated question, shock, Y, design, assumptions, threats, and mitigation plan. The proposal should clarify feasibility, implementation steps, risks, and solutions. It should not inflate the topic, add grand claims, or create method-driven novelty.

The generated proposal must include:
- core research problem
- nested research questions
- proposed empirical design
- unit, sample, period, shock, Y
- implementation steps
- main assumptions
- main threats
- mitigation plan
- diagnostics and robustness plan
- expected tables and figures
- interpretation limits
- unresolved feasibility risks

The generated proposal must exclude:
- broad research significance
- policy value
- full literature review
- contribution claims
- full paper drafting
- Stata/R/Python code generation

## Identification Audit Sheet

${auditSheetMarkdown(state)}
`;
}

function migrateState(raw: string | null): PaletteState {
  if (!raw) return demoState;
  try {
    const parsed = JSON.parse(raw) as Partial<PaletteState> & Record<string, unknown>;
    return {
      ...demoState,
      ...parsed,
      nested_questions: (parsed.nested_questions as NestedQuestions | undefined) ?? demoState.nested_questions,
      assumptions: Array.isArray(parsed.assumptions)
        ? parsed.assumptions as AssumptionItem[]
        : defaultAssumptions.map((item) => ({ ...item, status: ((parsed.assumptions as Record<string, AssumptionStatus> | undefined)?.[item.name] ?? item.status) })),
      diagnostics: Array.isArray(parsed.diagnostics)
        ? parsed.diagnostics as DiagnosticItem[]
        : defaultDiagnostics.map((item) => ({ ...item, status: ((parsed.diagnostics as Record<string, boolean> | undefined)?.[item.name] ? 'planned' : item.status) })),
      outputs: Array.isArray(parsed.outputs) ? parsed.outputs as OutputItem[] : demoState.outputs,
      threats: Array.isArray(parsed.threats) ? parsed.threats as ThreatItem[] : demoState.threats,
      designNotes: { ...blankDesignNotes, ...(parsed.designNotes as Record<string, Record<string, string>> | undefined) },
    };
  } catch {
    return demoState;
  }
}

export default function App() {
  const [state, setState] = useState<PaletteState>(() => migrateState(localStorage.getItem(storageKey) ?? localStorage.getItem(legacyStorageKey)));
  const [showMoreDesigns, setShowMoreDesigns] = useState(false);
  const selectedDesign = designs.find((design) => design.id === state.selectedDesign) ?? designs[0];
  const selectedFields = designFields[state.selectedDesign] ?? [];
  const feasibility = useMemo(() => scoreState(state), [state]);
  const visibleDesigns = showMoreDesigns ? designs : designs.slice(0, 6);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state]);

  const setField = <K extends keyof PaletteState>(key: K, value: PaletteState[K]) => setState((current) => ({ ...current, [key]: value }));
  const setNestedQuestion = (key: keyof NestedQuestions, value: string) => setState((current) => ({ ...current, nested_questions: { ...current.nested_questions, [key]: value } }));
  const setDesignNote = (field: string, value: string) => setState((current) => ({
    ...current,
    designNotes: { ...current.designNotes, [current.selectedDesign]: { ...(current.designNotes[current.selectedDesign] ?? {}), [field]: value } },
  }));

  return (
    <div className="min-h-screen bg-paper">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-lg border border-line bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brick">Design-first causal research</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink">Causal Design Palette</h1>
              <p className="mt-1 text-base text-stone-500">因果设计调色板</p>
              <p className="mt-2 text-lg text-stone-700">Identification-discipline canvas for causal research design</p>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-600">Define the research question, shock, Y, identification strategy, assumptions, threats, diagnostics, audit sheet, and output plan before formal estimation.</p>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
                Identification discipline means that the researcher must make the research question, shock, comparison structure, identifying assumptions, threats, diagnostics, and interpretation limits explicit before estimation.
                {cn('Identification discipline 指研究者在估计前，必须明确研究问题、冲击、比较结构、识别假设、主要威胁、诊断检验和解释边界。')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
              {['Static Vite app', 'Design-first', 'No estimation', 'No in-app LLM', 'GitHub Pages'].map((badge) => <span key={badge} className="rounded-full border border-line bg-stone-50 px-3 py-1 text-xs font-medium text-stone-700">{badge}</span>)}
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6">
          <Section title="Research Question Setup" chinese="研究问题设置" eyebrow="Canvas foundation">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Project title" value={state.project_title} onChange={(value) => setField('project_title', value)} />
              <Field label="Research question" chinese="研究问题" value={state.research_question} onChange={(value) => setField('research_question', value)} multiline />
              <Field label="Unit" chinese="分析单位" value={state.unit_of_analysis} onChange={(value) => setField('unit_of_analysis', value)} />
              <Field label="Time" chinese="研究时期" value={state.time_period} onChange={(value) => setField('time_period', value)} />
              <Field label="Object of study" chinese="研究对象" value={state.object_of_study} onChange={(value) => setField('object_of_study', value)} />
              <Field label="Sample scope" value={state.sample_scope} onChange={(value) => setField('sample_scope', value)} multiline />
              <Field label="Data sources" chinese="数据来源" value={state.data_sources} onChange={(value) => setField('data_sources', value)} multiline />
              <Field label="Current design status" value={state.current_design_status} onChange={(value) => setField('current_design_status', value)} multiline />
            </div>
          </Section>

          <Section title="Nested Research Questions" chinese="嵌套研究问题" eyebrow="From broad to empirical">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Broad question" value={state.nested_questions.broad} onChange={(value) => setNestedQuestion('broad', value)} multiline />
              <Field label="Intermediate question" value={state.nested_questions.intermediate} onChange={(value) => setNestedQuestion('intermediate', value)} multiline />
              <Field label="Specific empirical question" value={state.nested_questions.specific} onChange={(value) => setNestedQuestion('specific', value)} multiline />
              <Field label="Mechanism question" value={state.nested_questions.mechanism} onChange={(value) => setNestedQuestion('mechanism', value)} multiline />
              <Field label="Heterogeneity question" value={state.nested_questions.heterogeneity} onChange={(value) => setNestedQuestion('heterogeneity', value)} multiline />
            </div>
          </Section>

          <Section title="Shock and Y Definition" chinese="冲击与 Y 的定义" eyebrow="Treatment logic">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Shock: policy, event, or exposure" chinese="冲击：政策、事件或暴露" value={state.shock_name} onChange={(value) => setField('shock_name', value)} />
              <SelectField label="Shock type" value={state.shock_type} options={['policy', 'event', 'exposure']} onChange={(value) => setField('shock_type', value)} />
              <Field label="Shock timing" value={state.shock_timing} onChange={(value) => setField('shock_timing', value)} />
              <Field label="Treated or exposed units" value={state.treated_or_exposed_units} onChange={(value) => setField('treated_or_exposed_units', value)} />
              <Field label="Comparison units" value={state.comparison_units} onChange={(value) => setField('comparison_units', value)} />
              <Field label="Y" value={state.Y} onChange={(value) => setField('Y', value)} />
              <Field label="Mechanism variable" value={state.mechanism_variable} onChange={(value) => setField('mechanism_variable', value)} />
              <Field label="Heterogeneity dimension" value={state.heterogeneity_dimension} onChange={(value) => setField('heterogeneity_dimension', value)} />
            </div>
          </Section>

          <Section title="Design Palette" chinese="识别设计选项" eyebrow="Identification strategy">
            <div className="grid gap-4 lg:grid-cols-2">
              {visibleDesigns.map((design) => (
                <button key={design.id} className={`rounded-lg border p-4 text-left transition ${state.selectedDesign === design.id ? 'border-sage bg-sage/10 ring-2 ring-sage/20' : 'border-line bg-white hover:border-sage/60'}`} onClick={() => setField('selectedDesign', design.id)}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-ink">{design.name}</h3>
                      {design.chinese ? <p className="mt-1 text-xs text-stone-500">{design.chinese}</p> : null}
                    </div>
                    {design.priority !== 'secondary' ? <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${design.priority === 'combined' ? 'bg-steel/10 text-steel' : 'bg-sage/10 text-sage'}`}>{design.priority}</span> : null}
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm text-stone-700">
                    <div><dt className="font-medium text-stone-900">Best use case</dt><dd>{design.bestUse}</dd></div>
                    <div><dt className="font-medium text-stone-900">Required data structure</dt><dd>{design.dataStructure}</dd></div>
                    <div><dt className="font-medium text-stone-900">Core identifying assumption</dt><dd>{design.assumption}</dd></div>
                    <div><dt className="font-medium text-stone-900">Common failure mode</dt><dd>{design.failureMode}</dd></div>
                  </dl>
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-center">
              <button className="rounded-md border border-line bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-white" onClick={() => setShowMoreDesigns((current) => !current)}>
                {showMoreDesigns ? 'Less' : 'More'}
              </button>
            </div>
          </Section>

          <Section title="Selected Design Canvas" chinese="已选择设计画布" eyebrow={selectedDesign.name}>
            {state.selectedDesign === 'event_did' ? <p className="mb-4 rounded-md border border-steel/20 bg-steel/5 p-3 text-sm text-stone-700">Event-time DiD / Event Study is mainly a way to inspect dynamics, pre-trends, and timing around a treatment or event; it should remain anchored in a defensible comparison structure.</p> : null}
            {selectedDesign.priority === 'secondary' ? <p className="mb-4 rounded-md border border-brick/20 bg-brick/5 p-3 text-sm text-stone-700">This is marked as a secondary option. Use it when the comparison structure is unusually clear and the interpretation remains transparent.</p> : null}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Identifying assumption" value={state.identifying_assumption} onChange={(value) => setField('identifying_assumption', value)} multiline />
              <Field label="Interpretation limits" value={state.interpretation_limits} onChange={(value) => setField('interpretation_limits', value)} multiline />
              {selectedFields.map((field) => <Field key={field} label={field} value={state.designNotes[state.selectedDesign]?.[field] ?? ''} onChange={(value) => setDesignNote(field, value)} multiline />)}
            </div>
          </Section>

          <Section title="Assumption Checklist" chinese="识别假设清单" eyebrow="Structured audit">
            <div className="grid gap-4 lg:grid-cols-2">
              {state.assumptions.map((item) => (
                <div key={item.id} className="rounded-md border border-line bg-stone-50 p-4">
                  <h3 className="font-semibold text-ink">{item.name}</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <SelectField label="Status" value={item.status} options={['clearly stated', 'partially addressed', 'not yet addressed']} onChange={(value) => setState((current) => ({ ...current, assumptions: current.assumptions.map((entry) => entry.id === item.id ? { ...entry, status: value } : entry) }))} />
                    <div className="md:col-span-2"><Field label="Evidence or justification" value={item.evidence} onChange={(value) => setState((current) => ({ ...current, assumptions: current.assumptions.map((entry) => entry.id === item.id ? { ...entry, evidence: value } : entry) }))} multiline /></div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Threat Checklist" chinese="主要威胁清单" eyebrow="Failure modes">
            <div className="grid gap-4 lg:grid-cols-2">
              {state.threats.map((item) => (
                <div key={item.id} className="rounded-md border border-line bg-stone-50 p-4">
                  <h3 className="font-semibold capitalize text-ink">{item.name}</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <SelectField label="Relevance" value={item.relevance} options={['low', 'medium', 'high']} onChange={(value) => setState((current) => ({ ...current, threats: current.threats.map((entry) => entry.id === item.id ? { ...entry, relevance: value } : entry) }))} />
                    <div className="md:col-span-2"><Field label="Mitigation plan" value={item.mitigation} onChange={(value) => setState((current) => ({ ...current, threats: current.threats.map((entry) => entry.id === item.id ? { ...entry, mitigation: value } : entry) }))} multiline /></div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Diagnostics and Robustness Plan" chinese="诊断与稳健性计划" eyebrow="Structured pre-analysis checks">
            <div className="grid gap-4">
              {state.diagnostics.map((item) => (
                <div key={item.id} className="rounded-md border border-line bg-stone-50 p-4">
                  <h3 className="font-semibold text-ink">{item.name}</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <SelectField label="Status" value={item.status} options={['not planned', 'planned', 'drafted', 'ready']} onChange={(value) => setState((current) => ({ ...current, diagnostics: current.diagnostics.map((entry) => entry.id === item.id ? { ...entry, status: value } : entry) }))} />
                    <Field label="Purpose" value={item.purpose} onChange={(value) => setState((current) => ({ ...current, diagnostics: current.diagnostics.map((entry) => entry.id === item.id ? { ...entry, purpose: value } : entry) }))} multiline />
                    <Field label="Expected variables" value={item.variables} onChange={(value) => setState((current) => ({ ...current, diagnostics: current.diagnostics.map((entry) => entry.id === item.id ? { ...entry, variables: value } : entry) }))} multiline />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Economics Output Planner" chinese="经济学表格与图形规划" eyebrow="Tables and figures">
            <p className="mb-4 text-sm text-stone-600">Plan the economics-style results package without estimating anything. These entries feed the audit sheet and AI-ready feasibility prompt.</p>
            <div className="grid gap-4">
              {state.outputs.map((item) => (
                <div key={item.id} className="rounded-md border border-line bg-stone-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-steel">{item.type}</p><h3 className="font-semibold text-ink">{item.name}</h3></div>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-sage" checked={item.include} onChange={(event) => setState((current) => ({ ...current, outputs: current.outputs.map((entry) => entry.id === item.id ? { ...entry, include: event.target.checked } : entry) }))} /> include</label>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <SelectField label="Status" value={item.status} options={['planned', 'drafted', 'ready']} onChange={(value) => setState((current) => ({ ...current, outputs: current.outputs.map((entry) => entry.id === item.id ? { ...entry, status: value } : entry) }))} />
                    <Field label="Purpose" value={item.purpose} onChange={(value) => setState((current) => ({ ...current, outputs: current.outputs.map((entry) => entry.id === item.id ? { ...entry, purpose: value } : entry) }))} multiline />
                    <Field label="Expected variables" value={item.variables} onChange={(value) => setState((current) => ({ ...current, outputs: current.outputs.map((entry) => entry.id === item.id ? { ...entry, variables: value } : entry) }))} multiline />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Identification Audit Sheet" chinese="识别审计表" eyebrow="AI-ready structured summary">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-md border border-line bg-stone-50 p-4 text-sm leading-6 text-stone-700">
                <h3 className="font-semibold text-ink">Core audit</h3>
                <p className="mt-2"><strong>Project:</strong> {state.project_title}</p>
                <p><strong>Question:</strong> {state.research_question}</p>
                <p><strong>Design:</strong> {selectedDesignName(state)}</p>
                <p><strong>Comparison:</strong> {state.treated_or_exposed_units} versus {state.comparison_units}</p>
                <p><strong>Assumption:</strong> {state.identifying_assumption}</p>
                <p><strong>Boundary:</strong> {state.interpretation_limits}</p>
              </div>
              <div className="rounded-md border border-line bg-stone-50 p-4 text-sm leading-6 text-stone-700">
                <h3 className="font-semibold text-ink">Audit counts</h3>
                <p className="mt-2">Assumptions clearly stated: {state.assumptions.filter((item) => item.status === 'clearly stated').length}/{state.assumptions.length}</p>
                <p>High-relevance threats: {state.threats.filter((item) => item.relevance === 'high').length}</p>
                <p>Diagnostics planned or beyond: {state.diagnostics.filter((item) => item.status !== 'not planned').length}</p>
                <p>Included table and figure outputs: {state.outputs.filter((item) => item.include).length}</p>
                <p className="mt-2 text-lg font-semibold text-sage">{feasibility.score}/11: {feasibility.label}</p>
              </div>
            </div>
          </Section>

          <Section title="Feasibility Score" chinese="可行性评分" eyebrow="Rule-based, not evidence">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-4xl font-semibold text-sage">{feasibility.score}/11</p>
                <p className="mt-1 text-lg font-medium text-ink">{feasibility.label}</p>
                <p className="mt-2 max-w-2xl text-sm text-stone-600">This simple score checks whether key design fields are explicit. It is not statistical evidence and does not validate the identification strategy.</p>
              </div>
              <div className="grid gap-2 text-sm text-stone-700"><p>0-3: Early sketch</p><p>4-6: Plausible design outline</p><p>7-9: Ready for supervisor discussion</p><p>10-11: Strong design memo draft</p></div>
            </div>
          </Section>

          <Section title="Export Panel" chinese="导出面板" eyebrow="Audit and proposal handoff">
            <div className="flex flex-wrap gap-3">
              <button className="rounded-md bg-sage px-4 py-2 text-sm font-semibold text-white hover:bg-sage/90" onClick={() => downloadFile('identification-audit-sheet.md', auditSheetMarkdown(state), 'text/markdown;charset=utf-8')}>Export audit sheet as Markdown</button>
              <button className="rounded-md bg-steel px-4 py-2 text-sm font-semibold text-white hover:bg-steel/90" onClick={() => downloadFile('identification-audit-sheet.json', JSON.stringify({ auditSheet: state, feasibility: scoreState(state) }, null, 2), 'application/json;charset=utf-8')}>Export audit sheet as JSON</button>
              <button className="rounded-md bg-brick px-4 py-2 text-sm font-semibold text-white hover:bg-brick/90" onClick={() => downloadFile('ai-ready-feasibility-proposal-prompt.md', proposalPromptMarkdown(state), 'text/markdown;charset=utf-8')}>Export AI-ready feasibility proposal prompt as Markdown</button>
              <button className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50" onClick={() => setState(demoState)}>Reload illustrative demo</button>
            </div>
            <p className="mt-3 text-sm text-stone-600">No in-app LLM generation is performed. Copy the exported prompt into Codex or another AI environment if you want a proposal drafted outside this static app.</p>
          </Section>
        </div>
      </main>

      <footer className="mt-8 border-t border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 text-sm leading-6 text-stone-600 sm:px-6 lg:px-8">
          <p>This tool organises causal design thinking. It does not estimate causal effects. Formal identification, estimation, robustness checks, and interpretation should be conducted in Stata, R, Python, or specialised qualitative analysis workflows.</p>
          <p className="mt-2 text-stone-500">本工具用于组织因果研究设计思路，不用于估计因果效应。正式识别、估计、稳健性检验和解释应在 Stata、Python 或其他专门分析流程中完成。</p>
        </div>
      </footer>
    </div>
  );
}
