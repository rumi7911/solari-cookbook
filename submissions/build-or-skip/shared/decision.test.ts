import { describe, expect, it } from "vitest";
import { calculateDecision, type DecisionInput } from "./decision.js";

const completeInput: DecisionInput = {
  dimensions: {
    portfolioValue: 88,
    technicalFeasibility: 76,
    differentiation: 72,
    timeFit: 74,
    costValue: 90,
    credibility: 84
  },
  criticalFacts: {
    deadline: { status: "known", value: "No deadline" },
    eligibility: { status: "known", value: "Remote; worldwide" },
    requiredCost: { status: "known", value: 0 }
  },
  constraints: { budget: 25, hasPersonalContext: true },
  hardDisqualifiers: []
};

describe("calculateDecision", () => {
  it("applies the published portfolio-first weights", () => {
    const result = calculateDecision(completeInput);

    expect(result.weightedScore).toBe(80);
    expect(result.verdict).toBe("Build");
    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it("returns Skip before scoring when an authoritative source proves expiry", () => {
    const result = calculateDecision({
      ...completeInput,
      hardDisqualifiers: [
        {
          kind: "expired",
          message: "Submissions closed on 1 August 2026.",
          sourceId: "rules"
        }
      ]
    });

    expect(result.verdict).toBe("Skip");
    expect(result.hardDisqualifiers).toHaveLength(1);
    expect(result.why).toContain("closed");
  });

  it("abstains when a decision-critical fact is unknown", () => {
    const result = calculateDecision({
      ...completeInput,
      criticalFacts: {
        ...completeInput.criticalFacts,
        eligibility: { status: "unknown" }
      }
    });

    expect(result.verdict).toBe("Investigate Further");
    expect(result.unresolvedQuestions).toContain("Who is eligible to participate?");
  });

  it("lowers technical feasibility after a failed verification without creating a hard disqualifier", () => {
    const result = calculateDecision({
      ...completeInput,
      verification: { status: "failure", penalty: 24 }
    });

    expect(result.adjustedDimensions.technicalFeasibility).toBe(52);
    expect(result.hardDisqualifiers).toEqual([]);
    expect(result.why).toContain("verification was unsuccessful");
  });

  it("lowers confidence when personal context is missing", () => {
    const result = calculateDecision({
      ...completeInput,
      constraints: { budget: undefined, hasPersonalContext: false }
    });

    expect(result.confidence).toBeLessThan(calculateDecision(completeInput).confidence);
    expect(result.assumptions).toContain("Portfolio-first defaults were used because personal context is incomplete.");
  });

  it("returns the boundary verdicts exactly", () => {
    const makeUniformInput = (score: number): DecisionInput => ({
      ...completeInput,
      dimensions: {
        portfolioValue: score,
        technicalFeasibility: score,
        differentiation: score,
        timeFit: score,
        costValue: score,
        credibility: score
      }
    });

    expect(calculateDecision(makeUniformInput(70)).verdict).toBe("Build");
    expect(calculateDecision(makeUniformInput(50)).verdict).toBe("Investigate Further");
    expect(calculateDecision(makeUniformInput(49)).verdict).toBe("Skip");
  });
});
