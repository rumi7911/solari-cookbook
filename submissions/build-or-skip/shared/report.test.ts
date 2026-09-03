import { describe, expect, it } from "vitest";
import { exportReportMarkdown, type InvestigationReport } from "./report.js";

const report: InvestigationReport = {
  id: "solari-demo",
  opportunityUrl: "https://x.com/harrychow_/status/1962479121735467156",
  title: "Solari SWE intern build challenge",
  analyzedAt: "2026-09-01T20:00:00.000Z",
  objective: "portfolio",
  context: { availableDays: 10, skills: "TypeScript, React", budget: 20, location: "Pakistan" },
  verdict: {
    verdict: "Build",
    weightedScore: 80,
    confidence: 88,
    adjustedDimensions: {
      portfolioValue: 88,
      technicalFeasibility: 76,
      differentiation: 72,
      timeFit: 74,
      costValue: 90,
      credibility: 84
    },
    hardDisqualifiers: [],
    unresolvedQuestions: [],
    assumptions: [],
    why: "The portfolio-focused score is 80/100."
  },
  scoreEvidence: [],
  facts: [
    { id: "fact-1", label: "Work arrangement", value: "Remote", classification: "Fact", sourceIds: ["post"] }
  ],
  sources: [
    {
      id: "post",
      title: "Original hiring post",
      url: "https://x.com/harrychow_/status/1962479121735467156",
      authority: "Official",
      retrievedAt: "2026-09-01T19:59:00.000Z",
      status: "retrieved",
      collectionMode: "solari-browser"
    }
  ],
  competitionFindings: ["Browser-agent demos are common; operational handoff workflows are less represented."],
  risks: ["The role may be filled without notice."],
  unresolvedQuestions: [],
  directions: [
    {
      id: "direction-1",
      name: "BuildOrSkip",
      targetUser: "Solo developers",
      problem: "Opportunity research consumes scarce build time.",
      outcome: "An evidence-backed build-or-skip verdict.",
      fit: "Exercises Solari browsers and sandboxes.",
      differentiation: "Combines research with executable proof.",
      demoBoundary: "One public opportunity, one repository, one report.",
      risk: "Source access can be unreliable.",
      provisional: false
    }
  ],
  verification: {
    status: "success",
    mode: "live",
    repository: "https://github.com/solari-sdk/solari-cookbook",
    revision: "abc1234",
    commands: ["npm install --ignore-scripts", "npm start"],
    durationMs: 8200,
    logs: ["Quick-start completed"],
    artifacts: ["page-title.txt"]
  }
};

describe("exportReportMarkdown", () => {
  it("creates a self-contained evidence pack matching the report", () => {
    const markdown = exportReportMarkdown(report);

    expect(markdown).toContain("# Solari SWE intern build challenge");
    expect(markdown).toContain("**Verdict:** Build");
    expect(markdown).toContain("**Confidence:** 88%");
    expect(markdown).toContain("## Score breakdown");
    expect(markdown).toContain("Technical feasibility | 76/100");
    expect(markdown).toContain("**Work arrangement:** Remote _(Fact)_ [source 1](https://x.com/harrychow_/status/1962479121735467156)");
    expect(markdown).toContain("## Sandbox verification");
    expect(markdown).toContain("Live execution");
    expect(markdown).toContain("## Project directions");
    expect(markdown).toContain("### 1. BuildOrSkip");
    expect(markdown).toContain("[Original hiring post](https://x.com/harrychow_/status/1962479121735467156)");
    expect(markdown).toContain("Live Solari Browser");
  });

  it("records unknowns explicitly instead of inventing details", () => {
    const markdown = exportReportMarkdown({
      ...report,
      unresolvedQuestions: ["What is the authoritative deadline?"]
    });

    expect(markdown).toContain("## Unresolved questions");
    expect(markdown).toContain("What is the authoritative deadline?");
  });
});
