import { performance } from "node:perf_hooks";
import { SolariClient } from "@solarisdk/sdk";
import { calculateDecision, type CriticalFact, type HardDisqualifier } from "../shared/decision.js";
import type { InvestigationReport, VerificationResult } from "../shared/report.js";
import { configuredSolariApiKey } from "./config.js";

export interface RunnerInput {
  repository: string;
  subdirectory?: string;
  commands: string[];
}

export interface RunnerOutput {
  status: "success" | "failure" | "timeout" | "unsupported";
  revision: string;
  durationMs: number;
  logs: string[];
  artifacts: string[];
  failureReason?: string;
}

export interface SandboxRunner {
  run(input: RunnerInput): Promise<RunnerOutput>;
}

interface VerificationDependencies {
  solariApiKey?: string;
  runner?: SandboxRunner;
}

interface VerificationConsent {
  approved: boolean;
}

const SOLARI_REPOSITORY = "https://github.com/solari-sdk/solari-cookbook";

function validateRepository(value: string): URL {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "github.com" ||
    !/^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(url.pathname)
  ) {
    throw new Error("Sandbox verification supports one public GitHub repository at a time.");
  }
  return url;
}

function validateSubdirectory(value?: string): string | undefined {
  if (!value) return undefined;
  if (value.startsWith("/") || value.split("/").some((part) => part === "..")) {
    throw new Error("The proposed repository subdirectory is unsafe.");
  }
  return value;
}

function deriveApprovedPlan(report: InvestigationReport): RunnerInput {
  const repository = validateRepository(report.verification.repository).toString().replace(/\/$/, "");
  const subdirectory = validateSubdirectory(report.verification.subdirectory);
  const commands =
    repository === SOLARI_REPOSITORY
      ? [
          `git clone --depth 1 ${repository} repository`,
          `cd ${subdirectory ?? "repository"}`,
          "npx --yes node@20.20.2 --version",
          'npx --yes --package node@20.20.2 -c "npm install --ignore-scripts"',
          'npx --yes --package node@20.20.2 -c "npm run start -- --url https://example.com"'
        ]
      : [
          `git clone --depth 1 ${repository} repository`,
          "cd repository",
          "npm install --ignore-scripts",
          "npm test"
        ];
  return { repository, subdirectory, commands };
}

function parseApprovedCommand(command: string): { program: string; args: string[] } {
  const approved: Record<string, { program: string; args: string[] }> = {
    "npx --yes node@20.20.2 --version": {
      program: "npx",
      args: ["--yes", "node@20.20.2", "--version"]
    },
    'npx --yes --package node@20.20.2 -c "npm install --ignore-scripts"': {
      program: "npx",
      args: ["--yes", "--package", "node@20.20.2", "-c", "npm install --ignore-scripts"]
    },
    "npm install --ignore-scripts": { program: "npm", args: ["install", "--ignore-scripts"] },
    'npx --yes --package node@20.20.2 -c "npm run start -- --url https://example.com"': {
      program: "npx",
      args: ["--yes", "--package", "node@20.20.2", "-c", "npm run start -- --url https://example.com"]
    },
    "npm test": { program: "npm", args: ["test"] }
  };
  const parsed = approved[command];
  if (!parsed) throw new Error("A proposed command was not in the BuildOrSkip v1 allowlist.");
  return parsed;
}

export function classifyCommandFailure(
  command: string,
  exitCode: number,
  logs: string[]
): Pick<RunnerOutput, "status" | "failureReason"> {
  if (command.includes("npm run start") && /Solari:\s*apiKey is required/i.test(logs.join("\n"))) {
    return {
      status: "unsupported",
      failureReason:
        "Runtime and dependency setup succeeded, but the official quick-start requires a Solari API key. BuildOrSkip withheld server credentials from third-party repository code."
    };
  }
  return {
    status: "failure",
    failureReason: `The approved command \`${command}\` exited with code ${exitCode}.`
  };
}

export class SolariSandboxRunner implements SandboxRunner {
  constructor(private readonly apiKey: string) {}

  async run(input: RunnerInput): Promise<RunnerOutput> {
    const startedAt = performance.now();
    const client = new SolariClient({ apiKey: this.apiKey, callTimeoutMs: 120_000 });
    const sandbox = await client.sandboxes.create({
      template: "base",
      timeoutMs: 5 * 60_000,
      lifecycle: { onTimeout: "kill" },
      metadata: { product: "build-or-skip", purpose: "approved-quick-start" }
    });
    const logs: string[] = [];
    let revision = "unresolved";

    try {
      await sandbox.connect();
      await sandbox.git.clone(input.repository, { path: "/workspace/repository" });
      const revisionResult = await sandbox.commands.run("git", {
        args: ["rev-parse", "HEAD"],
        cwd: "/workspace/repository",
        timeoutMs: 20_000
      });
      revision = revisionResult.stdout.trim().slice(0, 40) || "unresolved";
      const cwd = input.subdirectory
        ? `/workspace/repository/${input.subdirectory}`
        : "/workspace/repository";

      for (const command of input.commands.filter((item) => !item.startsWith("git clone") && !item.startsWith("cd "))) {
        const { program, args } = parseApprovedCommand(command);
        logs.push(`$ ${command}`);
        const result = await sandbox.commands.run(program, {
          args,
          cwd,
          timeoutMs: command.startsWith("npm install") || command.startsWith("npx --yes") ? 120_000 : 60_000
        });
        if (result.stdout.trim()) logs.push(result.stdout.trim().slice(-6_000));
        if (result.stderr.trim()) logs.push(result.stderr.trim().slice(-6_000));
        if (result.exitCode !== 0) {
          const classified = classifyCommandFailure(command, result.exitCode, logs);
          return {
            status: classified.status,
            revision,
            durationMs: Math.round(performance.now() - startedAt),
            logs,
            artifacts: [],
            failureReason: classified.failureReason
          };
        }
      }

      return {
        status: "success",
        revision,
        durationMs: Math.round(performance.now() - startedAt),
        logs,
        artifacts: ["Clean sandbox command log"]
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "The sandbox stopped unexpectedly.";
      return {
        status: /timeout/i.test(message) ? "timeout" : "failure",
        revision,
        durationMs: Math.round(performance.now() - startedAt),
        logs: [...logs, message],
        artifacts: [],
        failureReason: message
      };
    } finally {
      await sandbox.kill().catch(() => undefined);
    }
  }
}

function makeDemoReplay(input: RunnerInput): RunnerOutput {
  const finalCommand = input.commands.at(-1);
  return {
    status: "success",
    revision: "d304843f5ea0edb5c27829bb2ca30868645bef7a · recorded replay",
    durationMs: 8_420,
    logs: [
      "DEMO REPLAY — this is not a live execution.",
      ...input.commands.slice(0, -1).map((command) => `$ ${command}`),
      "added 43 packages in 2s",
      ...(finalCommand ? [`$ ${finalCommand}`] : []),
      "Solari browser session opened; page title: Example Domain",
      "Quick-start completed and resources closed cleanly."
    ],
    artifacts: ["page-title.txt", "command-log.txt"]
  };
}

function criticalFact<T>(unresolved: string[], question: RegExp, fallback: T): CriticalFact<T> {
  return unresolved.some((item) => question.test(item)) ? { status: "unknown" } : { status: "known", value: fallback };
}

function applyVerification(report: InvestigationReport, verification: VerificationResult): InvestigationReport {
  const baseDimensions = { ...report.verdict.adjustedDimensions };
  const previousStatus = report.verification.status;
  if (previousStatus === "success" && report.verification.mode === "live") baseDimensions.technicalFeasibility -= 8;
  if (previousStatus === "failure" || previousStatus === "timeout") baseDimensions.technicalFeasibility += 24;
  const decisionVerificationStatus = verification.mode === "demo-replay" ? "not-run" : verification.status;

  const verdict = calculateDecision({
    dimensions: baseDimensions,
    criticalFacts: {
      deadline: criticalFact(report.unresolvedQuestions, /deadline/i, "Confirmed in report"),
      eligibility: criticalFact(report.unresolvedQuestions, /eligible/i, "Confirmed in report"),
      requiredCost: criticalFact(report.unresolvedQuestions, /cost/i, 0)
    },
    constraints: {
      budget: report.context.budget,
      hasPersonalContext: Object.values(report.context).some((value) => value !== undefined && value !== "")
    },
    hardDisqualifiers: report.verdict.hardDisqualifiers as HardDisqualifier[],
    verification: {
      status: decisionVerificationStatus,
      penalty: 24
    }
  });

  return {
    ...report,
    analyzedAt: new Date().toISOString(),
    verdict,
    unresolvedQuestions: verdict.unresolvedQuestions,
    scoreEvidence: report.scoreEvidence.map((evidence) =>
      evidence.dimension === "technicalFeasibility"
        ? {
            ...evidence,
            score: verdict.adjustedDimensions.technicalFeasibility,
            rationale:
              verification.mode === "demo-replay"
                ? "A deterministic demo replay was shown; it does not change technical feasibility because no live Solari sandbox ran."
                : verification.status === "success"
                  ? "Live Solari quick-start evidence increased feasibility."
                  : verification.status === "unsupported"
                    ? "Live sandbox evidence confirmed that the pinned Node 20 runtime and dependency setup succeeded. The credential-dependent browser launch remained unsupported because BuildOrSkip withheld server credentials from third-party code."
                    : "Verification was unsuccessful, so feasibility was lowered without treating the opportunity as invalid."
          }
        : evidence
    ),
    verification
  };
}

export async function verifyReport(
  report: InvestigationReport,
  consent: VerificationConsent,
  dependencies: VerificationDependencies = {}
): Promise<InvestigationReport> {
  if (!consent.approved) {
    throw new Error("Affirmative approval is required before any repository command can run.");
  }

  const plan = deriveApprovedPlan(report);
  const apiKey = configuredSolariApiKey(dependencies.solariApiKey ?? process.env.SOLARI_API_KEY);
  const runner = dependencies.runner ?? (apiKey ? new SolariSandboxRunner(apiKey) : undefined);
  const output = runner ? await runner.run(plan) : makeDemoReplay(plan);
  const verification: VerificationResult = {
    status: output.status,
    mode: runner ? "live" : "demo-replay",
    repository: plan.repository,
    revision: output.revision,
    subdirectory: plan.subdirectory,
    commands: plan.commands,
    durationMs: output.durationMs,
    logs: output.logs,
    artifacts: output.artifacts,
    failureReason: output.failureReason
  };

  return applyVerification(report, verification);
}

export function declineVerification(report: InvestigationReport): InvestigationReport {
  return {
    ...report,
    verification: {
      ...report.verification,
      status: "declined",
      mode: "inspection-only",
      logs: ["The user declined repository execution. Static inspection remains in the report."],
      artifacts: []
    }
  };
}
