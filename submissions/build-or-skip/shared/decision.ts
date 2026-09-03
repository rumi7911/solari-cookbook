export type Verdict = "Build" | "Skip" | "Investigate Further";

export type DimensionKey =
  | "portfolioValue"
  | "technicalFeasibility"
  | "differentiation"
  | "timeFit"
  | "costValue"
  | "credibility";

export type ScoreDimensions = Record<DimensionKey, number>;

export type CriticalFact<T = string | number> =
  | { status: "known"; value: T }
  | { status: "unknown" }
  | { status: "contradictory"; values: T[] };

export interface HardDisqualifier {
  kind: "expired" | "ineligible" | "over-budget";
  message: string;
  sourceId?: string;
}

export interface DecisionInput {
  dimensions: ScoreDimensions;
  criticalFacts: {
    deadline: CriticalFact<string>;
    eligibility: CriticalFact<string>;
    requiredCost: CriticalFact<number>;
  };
  constraints: {
    budget?: number;
    hasPersonalContext: boolean;
  };
  hardDisqualifiers: HardDisqualifier[];
  verification?: {
    status: "not-run" | "declined" | "success" | "failure" | "timeout" | "unsupported";
    penalty?: number;
  };
}

export interface DecisionResult {
  verdict: Verdict;
  weightedScore: number;
  confidence: number;
  adjustedDimensions: ScoreDimensions;
  hardDisqualifiers: HardDisqualifier[];
  unresolvedQuestions: string[];
  assumptions: string[];
  why: string;
}

export const DIMENSION_WEIGHTS: Record<DimensionKey, number> = {
  portfolioValue: 0.25,
  technicalFeasibility: 0.2,
  differentiation: 0.2,
  timeFit: 0.15,
  costValue: 0.1,
  credibility: 0.1
};

const unansweredByFact = {
  deadline: "What is the authoritative submission deadline?",
  eligibility: "Who is eligible to participate?",
  requiredCost: "What mandatory costs are required to participate?"
} as const;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getWeightedScore(dimensions: ScoreDimensions): number {
  return clampScore(
    (Object.keys(DIMENSION_WEIGHTS) as DimensionKey[]).reduce(
      (total, key) => total + dimensions[key] * DIMENSION_WEIGHTS[key],
      0
    )
  );
}

function getScoreVerdict(score: number): Verdict {
  if (score >= 70) return "Build";
  if (score >= 50) return "Investigate Further";
  return "Skip";
}

export function calculateDecision(input: DecisionInput): DecisionResult {
  const adjustedDimensions = { ...input.dimensions };
  const assumptions: string[] = [];

  if (input.verification?.status === "failure" || input.verification?.status === "timeout") {
    adjustedDimensions.technicalFeasibility = clampScore(
      adjustedDimensions.technicalFeasibility - (input.verification.penalty ?? 20)
    );
  }

  if (input.verification?.status === "success") {
    adjustedDimensions.technicalFeasibility = clampScore(
      adjustedDimensions.technicalFeasibility + 8
    );
  }

  if (!input.constraints.hasPersonalContext) {
    assumptions.push("Portfolio-first defaults were used because personal context is incomplete.");
  }

  const hardDisqualifiers = [...input.hardDisqualifiers];
  const requiredCost = input.criticalFacts.requiredCost;
  if (
    requiredCost.status === "known" &&
    typeof input.constraints.budget === "number" &&
    requiredCost.value > input.constraints.budget &&
    !hardDisqualifiers.some((item) => item.kind === "over-budget")
  ) {
    hardDisqualifiers.push({
      kind: "over-budget",
      message: `The mandatory cost (${requiredCost.value}) exceeds your stated budget (${input.constraints.budget}).`
    });
  }

  const unresolvedQuestions = (
    Object.keys(input.criticalFacts) as Array<keyof DecisionInput["criticalFacts"]>
  )
    .filter((key) => input.criticalFacts[key].status !== "known")
    .map((key) => unansweredByFact[key]);

  const weightedScore = getWeightedScore(adjustedDimensions);
  let confidence = 88;
  confidence -= unresolvedQuestions.length * 18;
  if (!input.constraints.hasPersonalContext) confidence -= 14;
  if (!input.verification || ["not-run", "declined", "unsupported"].includes(input.verification.status)) {
    confidence -= 8;
  }
  confidence = clampScore(confidence);

  if (hardDisqualifiers.length > 0) {
    return {
      verdict: "Skip",
      weightedScore,
      confidence,
      adjustedDimensions,
      hardDisqualifiers,
      unresolvedQuestions,
      assumptions,
      why: hardDisqualifiers.map((item) => item.message).join(" ")
    };
  }

  const verdict = unresolvedQuestions.length > 0 ? "Investigate Further" : getScoreVerdict(weightedScore);
  const verificationNote =
    input.verification?.status === "failure" || input.verification?.status === "timeout"
      ? " Repository verification was unsuccessful, which lowered technical feasibility but does not invalidate the opportunity."
      : input.verification?.status === "success"
        ? " The official quick-start completed successfully in an isolated sandbox."
        : "";
  const why = unresolvedQuestions.length
    ? `A decision-critical fact is unresolved: ${unresolvedQuestions.join(" ")}${verificationNote}`
    : `The portfolio-focused score is ${weightedScore}/100.${verificationNote}`;

  return {
    verdict,
    weightedScore,
    confidence,
    adjustedDimensions,
    hardDisqualifiers,
    unresolvedQuestions,
    assumptions,
    why
  };
}
