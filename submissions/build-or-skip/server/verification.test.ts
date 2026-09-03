import { describe, expect, it, vi } from "vitest";
import { investigateOpportunity } from "./investigation.js";
import { classifyCommandFailure, verifyReport, type SandboxRunner } from "./verification.js";

async function solariReport() {
  return investigateOpportunity({
    opportunityUrl: "https://x.com/harrychow_/status/1962479121735467156",
    context: { availableDays: 10, skills: "TypeScript" },
    attachments: []
  });
}

describe("verifyReport", () => {
  it("never invokes a runner without affirmative consent", async () => {
    const runner: SandboxRunner = { run: vi.fn() };

    await expect(verifyReport(await solariReport(), { approved: false }, { runner })).rejects.toThrow(/approval/i);
    expect(runner.run).not.toHaveBeenCalled();
  });

  it("uses a clearly labelled replay for the canonical demo when no Solari API key is configured", async () => {
    const result = await verifyReport(await solariReport(), { approved: true }, { solariApiKey: "" });

    expect(result.verification.status).toBe("success");
    expect(result.verification.mode).toBe("demo-replay");
    expect(result.verification.logs.join(" ")).toMatch(/not a live execution/i);
    expect(result.verdict.adjustedDimensions.technicalFeasibility).toBe(72);
    expect(result.verdict.why).not.toMatch(/completed successfully in an isolated sandbox/i);
    expect(result.scoreEvidence.find((item) => item.dimension === "technicalFeasibility")?.rationale).toMatch(/does not change/i);
  });

  it("preserves an unsuccessful live run and lowers feasibility without forcing Skip", async () => {
    const runner: SandboxRunner = {
      run: vi.fn().mockResolvedValue({
        status: "failure",
        revision: "def5678",
        durationMs: 3100,
        logs: ["npm ERR! missing dependency"],
        artifacts: [],
        failureReason: "The official start command exited with code 1."
      })
    };
    const report = await verifyReport(await solariReport(), { approved: true }, { runner, solariApiKey: "configured" });

    expect(report.verification.status).toBe("failure");
    expect(report.verification.mode).toBe("live");
    expect(report.verdict.adjustedDimensions.technicalFeasibility).toBeLessThan(72);
    expect(report.verdict.hardDisqualifiers).toEqual([]);
    expect(report.verdict.why).toMatch(/verification was unsuccessful/i);
  });

  it("passes the displayed pinned Node 20 quick-start command to the live runner", async () => {
    const run = vi.fn().mockResolvedValue({
      status: "success",
      revision: "abc1234",
      durationMs: 100,
      logs: [],
      artifacts: []
    });

    await verifyReport(await solariReport(), { approved: true }, { runner: { run }, solariApiKey: "configured" });

    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        commands: expect.arrayContaining([
          'npx --yes --package node@20.20.2 -c "npm run start -- --url https://example.com"'
        ])
      })
    );
  });

  it("classifies a deliberately withheld API key as unsupported rather than a repository failure", () => {
    expect(
      classifyCommandFailure(
        'npx --yes --package node@20.20.2 -c "npm run start -- --url https://example.com"',
        1,
        ["SolariError: Solari: apiKey is required"]
      )
    ).toEqual({
      status: "unsupported",
      failureReason:
        "Runtime and dependency setup succeeded, but the official quick-start requires a Solari API key. BuildOrSkip withheld server credentials from third-party repository code."
    });
  });

  it("preserves partial live proof without applying a feasibility penalty when credentials are withheld", async () => {
    const runner: SandboxRunner = {
      run: vi.fn().mockResolvedValue({
        status: "unsupported",
        revision: "abc1234",
        durationMs: 1200,
        logs: ["v20.20.2", "added 6 packages", "Solari: apiKey is required"],
        artifacts: [],
        failureReason: "BuildOrSkip withheld server credentials from third-party repository code."
      })
    };

    const report = await verifyReport(await solariReport(), { approved: true }, { runner, solariApiKey: "configured" });

    expect(report.verdict.adjustedDimensions.technicalFeasibility).toBe(72);
    expect(report.scoreEvidence.find((item) => item.dimension === "technicalFeasibility")?.rationale).toMatch(
      /runtime and dependency setup succeeded/i
    );
    expect(report.scoreEvidence.find((item) => item.dimension === "technicalFeasibility")?.rationale).not.toMatch(/lowered/i);
  });

  it("refuses execution for a repository outside public GitHub", async () => {
    const report = await solariReport();
    report.verification.repository = "https://example.com/archive.zip";

    await expect(verifyReport(report, { approved: true })).rejects.toThrow(/public GitHub/i);
  });
});
