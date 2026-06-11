# Causal Design Palette

Causal Design Palette is a static Vite + React + TypeScript app for economists who want to impose identification discipline before formal empirical work.

This app does not generate research topics automatically. It does not recommend identification strategies automatically. It does not invent variables. It helps researchers discipline a research idea before estimation.

## Purpose

The app organises a research idea into a causal design canvas: research question, nested research questions, unit of analysis, time period, object of study, shock, Y, identification strategy, assumptions, threats, diagnostics, robustness, economics output plan, feasibility score, identification audit sheet, and exportable design memo.

It is a design discipline tool. It helps clarify whether a causal design is coherent before estimation. It does not run regressions, search articles, call an LLM API, create a database, generate Stata/Python/R code, or draw causal graphs.

## Why this tool exists

AI can generate hundreds of research questions, thousands of possible Y variables, and countless X variables. It can even help construct novel, fresh variables through machine learning. This abundance is not, by itself, useful or meaningful. In economic research, a large set of AI-generated ideas often becomes vague, inflated, or method-driven: the concepts generated are invented too easily, unusual variables are constructed too quickly, and weak designs are then justified after the fact.

Causal Design Palette is built against that tendency.

The premise of good empirical research is not idea abundance. The premise is disciplined questioning and a clear implementation path. The researcher must first know what the core question is, what the shock is, what Y is, what comparison structure is credible, what identifying assumption is being invoked, what can go wrong, and how those risks can be mitigated.

Only after this discipline is imposed can AI become useful. AI should help refine, audit, organise, and communicate a research design. It should not replace the researcher’s responsibility to define the question and the empirical strategy.

AI 生成了100个研究问题、1000个 Y 和10000个 X，甚至通过机器学习帮你构造了几个“高大上”的变量——所以呢？这一“高大上”本身完全没有研究价值。经济学研究的起点不是想法越多越好，不是变量越量子纠缠、越变态越好，而是——在最近流行的评估类研究中，问题是否清楚，“冲击”是否明确，X对Y的影响是否能基于理论或基本逻辑去解释，你的比较结构是否可信，识别假设是否站得住，主要风险（内生性和技术本身的局限）是什么，以及如何处理风险。

Causal Design Palette 正是拳打空泛选题，脚踢概念膨胀的大棒。它要求研究者必须先明确问题和做法，自己想清楚idea和基本方法，再让 AI 辅助整理、审查和组织研究设计。AI 当然可以帮助研究者工作，但不能替代研究者定义问题和识别策略的责任——是的，当你自己明确了问题，并知道该从哪个方向去解决的时候，AI可以给你非常完善的方针。但如果你让它去思考……恐怕你的变量、影响以及整个研究，除了你没有人能理解。（保留原文写上去）

## Identification Discipline

Identification discipline means that the researcher must make the research question, shock, comparison structure, identifying assumptions, threats, diagnostics, and interpretation limits explicit before estimation.

Identification discipline 指研究者在估计前，必须明确研究问题、冲击、比较结构、识别假设、主要威胁、诊断检验和解释边界。

## Supported Core Designs

- Difference-in-Differences
- Event-time DiD / Event Study as dynamic DiD support
- Instrumental Variables, including Bartik / Shift-Share IV
- Regression Discontinuity
- Panel Fixed Effects as a baseline and diagnostic structure

## Combined Designs

- Combined DiD + IV
- Combined RDD + DiD

These templates deliberately foreground the joint assumptions, estimand, first-stage logic where relevant, event-time diagnostics, and interpretation boundaries.

## Secondary Designs

- Triple Difference
- Synthetic Control

These are marked as advanced or secondary options because they often require especially careful comparison logic and transparent interpretation.

## Features

- Built-in illustrative demo: Industrial Policy Shock and Firm Innovation
- Editable research question setup
- Editable nested research questions, from broad question to specific empirical, mechanism, and heterogeneity questions
- Shock and Y definition card
- Design palette with use case, data structure, identifying assumption, and failure mode
- Design-specific editable guidance for all supported designs
- Structured assumption checklist with status, evidence or justification, and notes
- Threat checklist with relevance, mitigation plan, and notes
- Structured diagnostics and robustness planner with status, purpose, expected variables, and notes
- Identification audit sheet summarising the design, comparison structure, assumption audit, threat audit, mitigation plan, diagnostics, output plan, interpretation boundary, and feasibility score
- Rule-based feasibility score from 0 to 11
- Browser localStorage persistence
- Markdown design memo export
- JSON structured data export
- AI-ready feasibility proposal prompt export
- Static GitHub Pages-compatible deployment workflow

## Identification Audit Sheet

The audit sheet turns the canvas into a structured handoff object. It summarises:

- project title and core research question
- nested research questions
- unit, period, object of study, shock, Y, mechanism variable, and heterogeneity dimension
- selected design and comparison structure
- core identifying assumption
- assumption audit
- threat audit and mitigation plan
- diagnostics and robustness plan
- economics table and figure plan
- interpretation boundary
- feasibility score

This sheet is designed for later use by local economics and writing workflows. It is not an estimator and does not recommend a design automatically.

## AI-Ready Feasibility Proposal Export

The app can export an AI-ready Markdown prompt that asks Codex or another AI environment to draft a concise feasibility-focused research proposal from the audit sheet.

The exported prompt instructs the assistant to cover the core research problem, nested questions, proposed empirical design, unit, sample, period, shock, Y, implementation steps, main assumptions, threats, mitigation plan, diagnostics, expected tables and figures, interpretation limits, and unresolved feasibility risks.

The prompt explicitly excludes broad research significance, policy value, full literature review, contribution claims, full paper drafting, and Stata/R/Python code generation.

There is no in-app LLM generation. All AI generation happens outside the static app by copying the exported prompt into Codex or another AI environment. If local Codex skills are available, the exported prompt mentions local economics and academic-writing skills, especially `econ-paper-writing-workflow` or `econ-academic-writing-workflow`, while prohibiting external API calls.

## Economics Output Planner

The planner helps users specify expected tables and figures before estimation. It includes:

- Summary statistics table
- Balance table
- Baseline results table
- Event-time / dynamic effects table
- Mechanism table
- Heterogeneity table
- Robustness table
- First-stage and reduced-form tables for IV and Bartik designs
- RDD bandwidth robustness table
- Main coefficient plot
- Event-time and pre-trend plots
- RDD discontinuity plot
- First-stage figure
- Balance, mechanism, and heterogeneity visualisations

The planner is intentionally non-estimating. It is a memo and design-ordering tool.

## Explicit Exclusions

This MVP does not include:

- Stata/R/Python code generation
- LLM API calls
- In-app LLM generation
- Database storage
- Paper search
- Automatic identification recommendation
- Causal graph drawing or DAG module
- Real estimation
- Live data fetching
- PDF/OCR
- Maps

## Local Setup

```bash
npm install
npm run dev
npm run build
```

## GitHub Pages Deployment

The app is configured for GitHub Pages with:

```ts
base: '/causal-design-palette/'
```

The workflow in `.github/workflows/deploy.yml` builds the app from the `causal-design-palette` directory and deploys the generated `dist` folder to GitHub Pages.

## Data Privacy

All data stay in the browser unless the user exports them. The app has no backend, no authentication, no database, and no external API calls.

## Limitations

Causal Design Palette organises causal design thinking. It does not estimate causal effects. Formal identification, estimation, robustness checks, and interpretation should be conducted in Stata, R, Python, or specialised qualitative analysis workflows.

The feasibility score is a rule-based completeness indicator. It is not statistical evidence and does not validate the identification strategy.

## Roadmap

- v0.2 richer result-table templates
- v0.3 publication-style coefficient plots
- v0.4 design memo variants for finance, development, and political economy
- v0.5 optional bibliography notes, without paper search
