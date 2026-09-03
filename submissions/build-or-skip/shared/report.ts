import type { DecisionResult, DimensionKey } from "./decision.js";

export type FindingClassification = "Fact" | "Inference" | "User-provided" | "Unknown";

export interface PersonalContext {
  availableDays?: number;
  skills?: string;
  budget?: number;
  location?: string;
}

export interface OpportunityFact {
  id: string;
  label: string;
  value: string;
  classification: FindingClassification;
  sourceIds: string[];
}

export interface EvidenceSource {
  id: string;
  title: string;
  url: string;
  authority: "Official" | "Original" | "Supporting" | "User provided";
  retrievedAt: string;
  status: "retrieved" | "blocked" | "failed";
  collectionMode: "solari-browser" | "fallback-fetch" | "user-provided" | "demo-fixture";
  note?: string;
}

export interface ScoreEvidence {
  dimension: DimensionKey;
  score: number;
  rationale: string;
  sourceIds: string[];
}

export interface VerificationResult {
  status: "not-run" | "declined" | "success" | "failure" | "timeout" | "unsupported";
  mode: "live" | "demo-replay" | "inspection-only";
  repository: string;
  revision: string;
  subdirectory?: string;
  commands: string[];
  durationMs?: number;
  logs: string[];
  artifacts: string[];
  failureReason?: string;
}

export interface ProjectDirection {
  id: string;
  name: string;
  targetUser: string;
  problem: string;
  outcome: string;
  fit: string;
  differentiation: string;
  demoBoundary: string;
  risk: string;
  provisional: boolean;
}

export interface InvestigationReport {
  id: string;
  opportunityUrl: string;
  title: string;
  analyzedAt: string;
  objective: "portfolio";
  context: PersonalContext;
  verdict: DecisionResult;
  scoreEvidence: ScoreEvidence[];
  facts: OpportunityFact[];
  sources: EvidenceSource[];
  competitionFindings: string[];
  risks: string[];
  unresolvedQuestions: string[];
  directions: ProjectDirection[];
  verification: VerificationResult;
}

const dimensionLabels: Record<DimensionKey, string> = {
  portfolioValue: "Portfolio and learning value",
  technicalFeasibility: "Technical feasibility",
  differentiation: "Differentiation and whitespace",
  timeFit: "Fit within available time",
  costValue: "Cost-to-effort value",
  credibility: "Opportunity credibility and clarity"
};

function list(items: string[], fallback = "None recorded."): string {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : fallback;
}

function verificationModeLabel(mode: VerificationResult["mode"]): string {
  if (mode === "live") return "Live execution";
  if (mode === "demo-replay") return "Clearly labelled demo replay";
  return "Inspection only";
}

function collectionModeLabel(mode: EvidenceSource["collectionMode"]): string {
  if (mode === "solari-browser") return "Live Solari Browser";
  if (mode === "fallback-fetch") return "Basic HTTP fallback";
  if (mode === "user-provided") return "User-provided file";
  return "Preloaded demo fixture";
}

export function exportReportMarkdown(report: InvestigationReport): string {
  const scores = (Object.entries(report.verdict.adjustedDimensions) as Array<[DimensionKey, number]>)
    .map(([key, score]) => `${dimensionLabels[key]} | ${score}/100`)
    .join("\n");
  const scoreEvidence = report.scoreEvidence
    .map((evidence) => {
      const citations = evidence.sourceIds
        .map((id) => report.sources.findIndex((source) => source.id === id))
        .filter((index) => index >= 0)
        .map((index) => {
          const source = report.sources[index];
          return source.url.startsWith("http")
            ? `[source ${index + 1}](${source.url})`
            : `source ${index + 1} (${source.title})`;
        })
        .join(" ");
      return `- **${dimensionLabels[evidence.dimension]}:** ${evidence.rationale}${citations ? ` ${citations}` : ""}`;
    })
    .join("\n");
  const facts = report.facts
    .map((fact) => {
      const citations = fact.sourceIds
        .map((id) => report.sources.findIndex((source) => source.id === id))
        .filter((index) => index >= 0)
        .map((index) => {
          const source = report.sources[index];
          return source.url.startsWith("http")
            ? `[source ${index + 1}](${source.url})`
            : `source ${index + 1} (${source.title})`;
        })
        .join(" ");
      return `- **${fact.label}:** ${fact.value} _(${fact.classification})_${citations ? ` ${citations}` : ""}`;
    })
    .join("\n");
  const directions = report.directions
    .map(
      (direction, index) => `### ${index + 1}. ${direction.name}${direction.provisional ? " _(provisional)_" : ""}

- **Target user:** ${direction.targetUser}
- **Problem:** ${direction.problem}
- **Outcome:** ${direction.outcome}
- **Opportunity fit:** ${direction.fit}
- **Differentiation:** ${direction.differentiation}
- **Two-week boundary:** ${direction.demoBoundary}
- **Principal risk:** ${direction.risk}`
    )
    .join("\n\n");
  const sources = report.sources
    .map((source) => {
      const label = source.url.startsWith("http") ? `[${source.title}](${source.url})` : `${source.title} _(local attachment)_`;
      return `- ${label} — ${source.authority}; ${source.status}; ${collectionModeLabel(source.collectionMode)}; retrieved ${source.retrievedAt}${source.note ? `; ${source.note}` : ""}`;
    })
    .join("\n");
  const assumptions = list(report.verdict.assumptions);
  const unresolved = list(report.unresolvedQuestions);
  const commands = report.verification.commands.map((command) => `  - \`${command}\``).join("\n");

  return `# ${report.title}

Analyzed: ${report.analyzedAt}  
Opportunity: ${report.opportunityUrl}  
Objective: Portfolio value

## Verdict

**Verdict:** ${report.verdict.verdict}  
**Confidence:** ${report.verdict.confidence}%  
**Portfolio-focused score:** ${report.verdict.weightedScore}/100

${report.verdict.why}

## Score breakdown

Dimension | Score
--- | ---
${scores}

### Scoring evidence

${scoreEvidence || "No supporting scoring evidence was available."}

## Opportunity facts

${facts || "No facts could be confirmed."}

## Assumptions

${assumptions}

## Unresolved questions

${unresolved}

## Sandbox verification

- **Status:** ${report.verification.status}
- **Mode:** ${verificationModeLabel(report.verification.mode)}
- **Repository:** ${report.verification.repository}
- **Revision:** ${report.verification.revision}
- **Duration:** ${typeof report.verification.durationMs === "number" ? `${report.verification.durationMs} ms` : "Not run"}
- **Commands:**
${commands || "  - None"}
- **Artifacts:** ${report.verification.artifacts.join(", ") || "None"}

${report.verification.logs.length ? "```text\n" + report.verification.logs.join("\n") + "\n```" : "No execution logs."}

## Competition and whitespace

${list(report.competitionFindings, "No reliable competition evidence was found.")}

## Risks

${list(report.risks)}

## Project directions

${directions || "Insufficient evidence to recommend project directions."}

## Source ledger

${sources || "No sources were retrieved."}
`;
}
