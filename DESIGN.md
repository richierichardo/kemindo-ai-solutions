# Design System and UX Specification

## 1. Design Direction

The interface should feel operational, serious, and suitable for a chemical and industrial group. The design must avoid the appearance of a generic consumer chatbot.

Use only this colour palette:

| Token | Hex | Usage |
|---|---|---|
| `--black` | `#000000` | Primary text, navigation, borders, dark surfaces |
| `--dark-red` | `#830000` | Secondary dark surface, active navigation, headings |
| `--red` | `#BC0202` | Primary action, links, selected states |
| `--bright-red` | `#FF0000` | Critical incident, error, destructive warning, high-priority indicator |

No other colour may be introduced. Use opacity, spacing, border weight, typography, and pattern density to create hierarchy without adding colours.

## 2. Colour Rules

- Default page background: white or a neutral treatment derived from black opacity. Do not introduce a new named colour.
- Primary button: `#BC0202` with black or white text only where contrast is sufficient.
- Critical HSE state: `#FF0000`.
- Navigation and dark headers: `#000000` or `#830000`.
- Secondary action: transparent background with `#830000` border and text.
- Avoid using bright red for decoration. Reserve it for urgency.
- Do not use blue, green, orange, purple, grey, or gradient colours.

## 3. Typography and Layout

- Use one sans-serif family throughout the application.
- Use strong, compact headings and readable body text.
- Use generous whitespace rather than additional colours to separate sections.
- Keep content width controlled on detail screens.
- Use a consistent 8px spacing scale.
- Use a left navigation rail for authenticated users.
- Use tables for operational data and cards only for summary metrics.

## 4. Shared Shell

### Header

- Product name: `Kemindo Operations Platform`.
- Current company and site scope.
- User menu.
- Local environment indicator for demo mode.

### Navigation

- Overview
- Recruitment
- HSE Incidents
- Knowledge Base
- Reports
- Administration

Navigation visibility must follow the user's role.

## 5. Recruitment Screens

### Recruitment overview

Show:

- open requisitions
- candidates awaiting review
- interviews due
- missing documents
- hiring SLA risks

### Requisition detail

Use a step indicator:

```text
Draft → Approval → Published → Screening → Interview → Decision → Onboarding
```

The page should show company, division, site, shift, requirements, approvers, and current candidates.

### Candidate detail

Use a two-column composition:

- left: candidate profile and CV metadata
- right: matching explanation, hard requirements, interview status, and actions

The fit score must show evidence. Avoid presenting it as an unexplained AI verdict.

### Interview scorecard

Use structured competency rows with score, evidence, and comments. Place the AI summary below the human-entered evidence.

## 6. HSE Screens

### Incident dashboard

Show:

- total open incidents
- near misses
- overdue corrective actions
- incidents by site
- incident trend

Use bright red only for critical or overdue attention states.

### Incident form

Use a clear sequence:

1. Event information
2. Location and people
3. Description and immediate action
4. Attachment
5. Review and submission

Make the offline draft state visible. Use text and status labels in addition to colour.

### Incident detail

Show the original facts first, then AI assistance, then HSE confirmation and corrective actions. Never place the AI recommendation above the confirmed HSE decision.

## 7. RAG Chat Interface

The assistant should be an evidence panel, not a floating generic chat bubble.

Required elements:

- question input
- selected scope: company, division, site
- answer
- cited document title
- cited page or section where available
- confidence or evidence status
- fallback when no relevant evidence exists

Example scope label:

```text
Scope: PT Kemindo Cao Resource / North Sulawesi Plant / HSE
```

## 8. Reports

Reports should present:

- deterministic KPI values
- trend or comparison
- AI-written summary
- evidence links
- generation timestamp
- data period

The report must distinguish measured values from AI interpretation.

## 9. Responsive and Accessibility Rules

- Desktop-first for HR and site managers.
- Tablet-friendly for HSE field reporting.
- Keyboard-accessible forms.
- Clear focus state using black or red palette tokens.
- Do not rely on colour alone for severity or workflow status.
- Every attachment and action must have a text label.

## 10. Required UI States

Every major feature needs:

- loading
- empty
- validation error
- permission denied
- indexing in progress
- AI processing
- AI failure
- completed
- offline draft

## 11. Demo Visual Priority

The demo should visually prioritise:

1. A recruitment workflow that looks usable by HR.
2. An HSE incident workflow that looks usable at a site.
3. Local RAG evidence and citations.
4. Reports that clearly separate calculations from AI summaries.
