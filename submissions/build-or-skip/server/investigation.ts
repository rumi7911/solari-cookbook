import { randomUUID } from "node:crypto";
import { calculateDecision, type CriticalFact, type HardDisqualifier, type ScoreDimensions } from "../shared/decision.js";
import type {
  EvidenceSource,
  InvestigationReport,
  OpportunityFact,
  PersonalContext,
  ProjectDirection,
  ScoreEvidence,
  VerificationResult
} from "../shared/report.js";
import { collectWithSolariBrowser, type BrowserCollectedPage } from "./solari-browser.js";

export interface InvestigationInput {
  opportunityUrl: string;
  context: PersonalContext;
  attachments: Array<{ name: string; type: string; size: number; extractedText?: string }>;
  relatedLinks?: string[];
}

interface InvestigationDependencies {
  fetcher?: typeof fetch;
  now?: () => Date;
  solariApiKey?: string;
  browserCollector?: (urls: string[]) => Promise<BrowserCollectedPage[]>;
}

const SOLARI_POST_URL = "https://x.com/harrychow_/status/1962479121735467156";
const SOLARI_REPOSITORY = "https://github.com/solari-sdk/solari-cookbook";
const SOLARI_DOCS = "https://docs.getsolari.com/";

const privateHostPatterns = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^\[?::1\]?$/i,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i
];

export function validatePublicOpportunityUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Enter a valid public HTTP or HTTPS opportunity URL.");
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    !url.hostname ||
    privateHostPatterns.some((pattern) => pattern.test(url.hostname))
  ) {
    throw new Error("Enter a public HTTP or HTTPS URL. Local and private-network addresses are unsupported.");
  }

  return url;
}

function isSolariExample(url: URL): boolean {
  return (
    (url.hostname === "x.com" && url.pathname.includes("1962479121735467156")) ||
    (url.hostname === "t.co" && url.pathname.toLowerCase().includes("txbsy4v2xq"))
  );
}

function makeSolariDirections(context: PersonalContext): ProjectDirection[] {
  const stack = context.skills?.trim() || "a familiar web stack";
  const days = context.availableDays ?? 10;
  return [
    {
      id: "build-or-skip",
      name: "BuildOrSkip",
      targetUser: "Solo developers evaluating public coding challenges",
      problem: "Opportunity rules, technical setup, and portfolio payoff are scattered across posts, documents, and repositories.",
      outcome: "A cited Build, Skip, or Investigate Further report backed by an optional sandbox quick-start.",
      fit: "Uses Solari browsing for evidence collection and a Solari sandbox for consent-gated executable proof.",
      differentiation: "The verdict changes when executable evidence arrives; it is not another generic browser-agent demo.",
      demoBoundary: `In ${days} days, support one public opportunity, one repository, local report history, and Markdown export using ${stack}.`,
      risk: "Authenticated social posts and ambiguous opportunity rules can leave decision-critical facts unresolved.",
      provisional: false
    },
    {
      id: "release-proof",
      name: "ReleaseProof",
      targetUser: "Maintainers reviewing third-party SDK release instructions",
      problem: "Quick-start documentation drifts from what a clean environment can actually execute.",
      outcome: "A revision-pinned evidence pack that tests official setup steps and flags documentation gaps.",
      fit: "Makes isolated sandbox execution, logs, duration, and artifacts the main product proof.",
      differentiation: "Targets release-readiness evidence rather than broad autonomous web automation.",
      demoBoundary: "Verify one TypeScript quick-start, compare documented and observed steps, and export a maintainer-ready report.",
      risk: "A narrow SDK workflow may look less visually dramatic unless the before-and-after proof is exceptionally clear.",
      provisional: false
    },
    {
      id: "ops-handoff",
      name: "Ops Handoff Auditor",
      targetUser: "Small operations teams receiving document-heavy vendor handoffs",
      problem: "Critical steps, owners, evidence, and contradictions are buried across checklists and web portals.",
      outcome: "A cited readiness verdict plus an isolated verification of any supplied automation script.",
      fit: "Combines browser evidence gathering with safe execution, demonstrating both Solari surfaces.",
      differentiation: "Focuses on high-stakes operational completeness rather than scraping or form filling.",
      demoBoundary: "Handle one handoff packet, one public portal, and one verification script with a fixed readiness rubric.",
      risk: "A credible demo needs carefully designed synthetic operational documents that avoid sensitive data.",
      provisional: false
    }
  ];
}

function buildSolariReport(input: InvestigationInput, now: Date, collectedSources?: EvidenceSource[]): InvestigationReport {
  const retrievedAt = now.toISOString();
  const dimensions: ScoreDimensions = {
    portfolioValue: 92,
    technicalFeasibility: 72,
    differentiation: 84,
    timeFit: input.context.availableDays && input.context.availableDays < 7 ? 54 : 78,
    costValue: 92,
    credibility: 86
  };
  const criticalFacts = {
    deadline: { status: "known", value: "No stated deadline; hiring continues until the right fit is found" } as CriticalFact<string>,
    eligibility: { status: "known", value: "Public build challenge; the associated role is remote with no relocation expectation" } as CriticalFact<string>,
    requiredCost: { status: "known", value: 0 } as CriticalFact<number>
  };
  const verdict = calculateDecision({
    dimensions,
    criticalFacts,
    constraints: {
      budget: input.context.budget,
      hasPersonalContext: Object.values(input.context).some((value) => value !== undefined && value !== "")
    },
    hardDisqualifiers: [],
    verification: { status: "not-run" }
  });
  const fixtureSources: EvidenceSource[] = [
    {
      id: "solari-post",
      title: "Harry Chow — Solari SWE intern build challenge",
      url: SOLARI_POST_URL,
      authority: "Original",
      retrievedAt,
      status: "retrieved",
      collectionMode: "demo-fixture",
      note: "Canonical facts are preserved in the preloaded evaluation case because X may require authentication."
    },
    {
      id: "solari-repo",
      title: "Solari official cookbook",
      url: SOLARI_REPOSITORY,
      authority: "Official",
      retrievedAt,
      status: "retrieved",
      collectionMode: "demo-fixture"
    },
    {
      id: "solari-docs",
      title: "Solari documentation",
      url: SOLARI_DOCS,
      authority: "Official",
      retrievedAt,
      status: "retrieved",
      collectionMode: "demo-fixture"
    }
  ];
  const sources: EvidenceSource[] = collectedSources?.map((source, index) =>
    source.status === "retrieved"
      ? source
      : {
          ...fixtureSources[index],
          note: `${fixtureSources[index]?.note ? `${fixtureSources[index].note} ` : ""}Live retrieval was unsuccessful; this source is the explicitly labelled preloaded fixture.`
        }
  ) ?? fixtureSources;
  const facts: OpportunityFact[] = [
    { id: "role", label: "Opportunity", value: "SWE intern build challenge for Pinetree Research", classification: "Fact", sourceIds: ["solari-post"] },
    { id: "reward", label: "Compensation", value: "$300,000 annualized salary if hired; not a guaranteed prize", classification: "Fact", sourceIds: ["solari-post"] },
    { id: "arrangement", label: "Work arrangement", value: "Remote; no relocation expectation", classification: "Fact", sourceIds: ["solari-post"] },
    { id: "deadline", label: "Deadline", value: "No deadline stated; they will continue looking until they find the right fit", classification: "Fact", sourceIds: ["solari-post"] },
    { id: "deliverable", label: "Deliverable", value: "A real Solari use case published on public GitHub and shared on X or LinkedIn", classification: "Fact", sourceIds: ["solari-post"] },
    { id: "stack", label: "Required technology", value: "Solari browsers, sandboxes, and/or desktops", classification: "Fact", sourceIds: ["solari-post", "solari-docs"] },
    { id: "cost", label: "Required cost", value: "One free Starter month was advertised; a payment method may still be required", classification: "Fact", sourceIds: ["solari-post"] },
    { id: "application", label: "Application", value: "No résumé, cover letter, or grades requested", classification: "Fact", sourceIds: ["solari-post"] }
  ];
  const scoreEvidence: ScoreEvidence[] = [
    { dimension: "portfolioValue", score: dimensions.portfolioValue, rationale: "A shipped, public product with evidence collection and safe execution is a strong systems portfolio piece.", sourceIds: ["solari-post", "solari-docs"] },
    { dimension: "technicalFeasibility", score: dimensions.technicalFeasibility, rationale: "The cookbook includes a TypeScript browser quick-start, but it has not yet been executed for this report.", sourceIds: ["solari-repo"] },
    { dimension: "differentiation", score: dimensions.differentiation, rationale: "Evidence-backed opportunity triage occupies clearer whitespace than generic browsing, scraping, or form-filling agents.", sourceIds: ["solari-repo"] },
    { dimension: "timeFit", score: dimensions.timeFit, rationale: "The v1 boundary fits a focused one-to-two-week build if authenticated browsing and full planning stay out of scope.", sourceIds: ["solari-post"] },
    { dimension: "costValue", score: dimensions.costValue, rationale: "The advertised free month keeps mandatory platform cost within the supplied budget.", sourceIds: ["solari-post"] },
    { dimension: "credibility", score: dimensions.credibility, rationale: "The post, maintained cookbook, and technical documentation agree on the core SDK surfaces.", sourceIds: ["solari-post", "solari-repo", "solari-docs"] }
  ];

  return {
    id: randomUUID(),
    opportunityUrl: input.opportunityUrl,
    title: "Solari SWE intern build challenge",
    analyzedAt: retrievedAt,
    objective: "portfolio",
    context: input.context,
    verdict,
    scoreEvidence,
    facts,
    sources,
    competitionFindings: [
      "The official cookbook already includes browser research, lead generation, QA, booking, and scraping examples—those categories are comparatively saturated.",
      "Far fewer examples turn mixed public evidence and executable repository proof into a transparent personal decision.",
      "An explicit consent step and preserved failure evidence create a stronger trust story than an opaque autonomous agent."
    ],
    risks: [
      "The hiring role could be filled without the public post changing.",
      "X may block anonymous retrieval, so screenshots or another original source may be required.",
      "The advertised free month converts to a paid plan unless cancelled.",
      "A successful portfolio build does not imply hiring, winning, or financial return."
    ],
    unresolvedQuestions: verdict.unresolvedQuestions,
    directions: makeSolariDirections(input.context),
    verification: {
      status: "not-run",
      mode: "inspection-only",
      repository: SOLARI_REPOSITORY,
      revision: "d304843f5ea0edb5c27829bb2ca30868645bef7a",
      subdirectory: "examples/browser-quickstart-ts",
      commands: [
        "git clone --depth 1 https://github.com/solari-sdk/solari-cookbook repository",
        "cd examples/browser-quickstart-ts",
        "npx --yes node@20.20.2 --version",
        'npx --yes --package node@20.20.2 -c "npm install --ignore-scripts"',
        'npx --yes --package node@20.20.2 -c "npm run start -- --url https://example.com"'
      ],
      logs: [],
      artifacts: []
    }
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function matchFirst(value: string, expression: RegExp): string | undefined {
  return value.match(expression)?.[1]?.trim();
}

function extractTitle(html: string, hostname: string): string {
  return (
    matchFirst(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)?.replace(/<[^>]+>/g, "").trim() ||
    matchFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i)?.replace(/<[^>]+>/g, "").trim() ||
    `Opportunity on ${hostname}`
  );
}

function extractRepository(html: string): string | undefined {
  const match = html.match(/https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/i)?.[0];
  return match?.replace(/["'<>)]+$/, "");
}

function provisionalDirections(): ProjectDirection[] {
  return ["Evidence brief", "Quick-start verifier", "Submission whitespace map"].map((name, index) => ({
    id: `provisional-${index + 1}`,
    name,
    targetUser: "Solo challenge builders",
    problem: "The target user and exact workflow require more evidence.",
    outcome: "A narrow, evidence-led prototype.",
    fit: "Potential fit inferred from the submitted opportunity.",
    differentiation: "Provisional until competition sources are available.",
    demoBoundary: "One workflow and one demonstrable outcome.",
    risk: "Insufficient evidence may make this direction generic.",
    provisional: true
  }));
}

async function retrievePublicPage(url: URL, fetcher: typeof fetch): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetcher(url, {
      redirect: "manual",
      signal: controller.signal,
      headers: { "user-agent": "BuildOrSkip/1.0 (+public-opportunity-analysis)" }
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("The source redirected without a destination.");
      const redirected = validatePublicOpportunityUrl(new URL(location, url).toString());
      return await fetcher(redirected, { signal: controller.signal, redirect: "error" });
    }
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

interface CollectedSource {
  source: EvidenceSource;
  text: string;
  html: string;
  classification: OpportunityFact["classification"];
}

async function collectWebSource(
  url: URL,
  id: string,
  authority: EvidenceSource["authority"],
  retrievedAt: string,
  fetcher: typeof fetch
): Promise<CollectedSource> {
  const source: EvidenceSource = {
    id,
    title: authority === "Original" ? `Submitted opportunity on ${url.hostname}` : `Related source on ${url.hostname}`,
    url: url.toString(),
    authority,
    retrievedAt,
    status: "retrieved",
    collectionMode: "fallback-fetch"
  };
  let html = "";
  try {
    const response = await retrievePublicPage(url, fetcher);
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok) throw new Error(`The source returned HTTP ${response.status}.`);
    if (!contentType.includes("text/html")) throw new Error("The URL did not return a supported public webpage.");
    html = (await response.text()).slice(0, 1_500_000);
    source.title = extractTitle(html, url.hostname);
  } catch (error) {
    source.status = "failed";
    source.note = error instanceof Error ? error.message : "The source could not be retrieved.";
  }
  return { source, html, text: stripHtml(html), classification: "Fact" };
}

function collectedBrowserSource(
  page: BrowserCollectedPage,
  id: string,
  authority: EvidenceSource["authority"],
  retrievedAt: string
): CollectedSource {
  const url = new URL(page.url);
  const source: EvidenceSource = {
    id,
    title: page.title || (authority === "Original" ? `Submitted opportunity on ${url.hostname}` : `Related source on ${url.hostname}`),
    url: page.url,
    authority,
    retrievedAt,
    status: page.status,
    collectionMode: "solari-browser",
    note: page.error
  };
  return { source, html: page.html, text: stripHtml(page.html), classification: "Fact" };
}

async function collectWebSources(
  targets: Array<{ url: URL; id: string; authority: EvidenceSource["authority"] }>,
  retrievedAt: string,
  dependencies: InvestigationDependencies
): Promise<CollectedSource[]> {
  const fetcher = dependencies.fetcher ?? fetch;
  if (!dependencies.solariApiKey) {
    return Promise.all(targets.map((target) => collectWebSource(target.url, target.id, target.authority, retrievedAt, fetcher)));
  }

  try {
    const collector = dependencies.browserCollector ?? ((urls: string[]) =>
      collectWithSolariBrowser(urls, { apiKey: dependencies.solariApiKey }));
    const pages = await collector(targets.map((target) => target.url.toString()));
    return Promise.all(targets.map(async (target, index) => {
      const page = pages[index];
      if (page?.status === "retrieved") return collectedBrowserSource(page, target.id, target.authority, retrievedAt);
      const fallback = await collectWebSource(target.url, target.id, target.authority, retrievedAt, fetcher);
      fallback.source.note = page?.error
        ? `Solari Browser could not retrieve this source (${page.error}); ${fallback.source.note ?? "basic HTTP fallback used."}`
        : fallback.source.note;
      return fallback;
    }));
  } catch (error) {
    const fallbacks = await Promise.all(targets.map((target) => collectWebSource(target.url, target.id, target.authority, retrievedAt, fetcher)));
    const reason = error instanceof Error ? error.message : "Solari Browser session could not start.";
    fallbacks.forEach((fallback) => {
      fallback.source.note = `Solari Browser unavailable (${reason}); ${fallback.source.note ?? "basic HTTP fallback used."}`;
    });
    return fallbacks;
  }
}

function parseDeadline(value: string): Date | undefined {
  const timestamp = Date.parse(value.replace(/\bat\b.*$/i, "").trim());
  if (Number.isNaN(timestamp)) return undefined;
  const date = new Date(timestamp);
  date.setHours(23, 59, 59, 999);
  return date;
}

export async function investigateOpportunity(
  input: InvestigationInput,
  dependencies: InvestigationDependencies = {}
): Promise<InvestigationReport> {
  const url = validatePublicOpportunityUrl(input.opportunityUrl);
  const now = (dependencies.now ?? (() => new Date()))();
  const retrievedAt = now.toISOString();
  if (isSolariExample(url)) {
    if (!dependencies.solariApiKey) return buildSolariReport(input, now);
    const canonicalTargets = [
      { url: new URL(SOLARI_POST_URL), id: "solari-post", authority: "Original" as const },
      { url: new URL(SOLARI_REPOSITORY), id: "solari-repo", authority: "Official" as const },
      { url: new URL(SOLARI_DOCS), id: "solari-docs", authority: "Official" as const }
    ];
    const canonicalSources = await collectWebSources(canonicalTargets, retrievedAt, dependencies);
    return buildSolariReport(input, now, canonicalSources.map((item) => item.source));
  }

  const targets = [
    { url, id: "submitted-page", authority: "Original" as const },
    ...(input.relatedLinks ?? []).map((link, index) => ({
      url: validatePublicOpportunityUrl(link),
      id: `related-${index + 1}`,
      authority: "Supporting" as const
    }))
  ];
  const webSources = await collectWebSources(targets, retrievedAt, dependencies);
  const attachmentSources: CollectedSource[] = input.attachments.map((attachment, index) => ({
    source: {
      id: `attachment-${index + 1}`,
      title: attachment.name,
      url: `attachment://${encodeURIComponent(attachment.name)}`,
      authority: "User provided",
      retrievedAt,
      status: "retrieved",
      collectionMode: "user-provided",
      note: attachment.extractedText
        ? "Text was extracted locally from this attachment."
        : "The attachment was preserved as user-provided evidence; no machine-readable text was available."
    },
    text: (attachment.extractedText ?? "").slice(0, 100_000),
    html: "",
    classification: "User-provided"
  }));
  const collected = [...webSources, ...attachmentSources];
  const primary = webSources[0];
  const title = primary?.html ? extractTitle(primary.html, url.hostname) : `Opportunity on ${url.hostname}`;
  const deadlineFindings = collected
    .map((item) => ({ item, value: matchFirst(item.text, /deadline\s*:?\s*([^.!?]{4,80})/i) }))
    .filter((finding): finding is { item: CollectedSource; value: string } => Boolean(finding.value));
  const uniqueDeadlines = [...new Map(deadlineFindings.map((finding) => [finding.value.toLowerCase(), finding.value])).values()];
  const eligibilityFinding = collected
    .map((item) => ({ item, value: matchFirst(item.text, /(?:eligib(?:le|ility)|open to)\s*:?\s*([^.!?]{4,120})/i) }))
    .find((finding) => finding.value);
  const freeFinding = collected.find((item) => /(?:entry is free|free to enter|no entry fee)/i.test(item.text));
  const costFinding = collected
    .map((item) => ({
      item,
      match: item.text.match(/(?:mandatory\s+)?entry fee\s*:?\s*([$£€])\s*([0-9]+(?:\.[0-9]{1,2})?)/i)
    }))
    .find((finding) => finding.match);
  const requiredCost = costFinding?.match ? Number(costFinding.match[2]) : undefined;
  const repository = collected.map((item) => extractRepository(item.html + " " + item.text)).find(Boolean);
  const facts: OpportunityFact[] = [];
  deadlineFindings.forEach((finding, index) => facts.push({ id: `deadline-${index + 1}`, label: "Deadline", value: finding.value, classification: finding.item.classification, sourceIds: [finding.item.source.id] }));
  if (eligibilityFinding?.value) facts.push({ id: "eligibility", label: "Eligibility", value: eligibilityFinding.value, classification: eligibilityFinding.item.classification, sourceIds: [eligibilityFinding.item.source.id] });
  if (freeFinding) facts.push({ id: "cost", label: "Required cost", value: "No entry fee found", classification: freeFinding.classification, sourceIds: [freeFinding.source.id] });
  if (costFinding?.match && typeof requiredCost === "number") facts.push({ id: "cost", label: "Required cost", value: `${costFinding.match[1]}${requiredCost} mandatory entry fee`, classification: costFinding.item.classification, sourceIds: [costFinding.item.source.id] });
  if (repository) {
    const repositorySource = collected.find((item) => (item.html + item.text).includes(repository));
    facts.push({ id: "repository", label: "Repository", value: repository, classification: repositorySource?.classification ?? "Inference", sourceIds: repositorySource ? [repositorySource.source.id] : [] });
  }
  if (primary?.source.status === "failed") facts.push({ id: "access", label: "Source access", value: "The submitted page could not be retrieved", classification: "Unknown", sourceIds: [primary.source.id] });

  const retrievedCount = collected.filter((item) => item.source.status === "retrieved" && item.text).length;
  const hasReadableEvidence = retrievedCount > 0;
  const isFree = Boolean(freeFinding);

  const dimensions: ScoreDimensions = {
    portfolioValue: hasReadableEvidence ? 64 : 45,
    technicalFeasibility: repository ? 58 : 42,
    differentiation: 50,
    timeFit: input.context.availableDays ? 60 : 50,
    costValue: isFree ? 80 : 50,
    credibility: hasReadableEvidence ? Math.min(72, 50 + retrievedCount * 6) : 28
  };
  const hardDisqualifiers: HardDisqualifier[] = deadlineFindings
    .filter((finding) => ["Original", "Official"].includes(finding.item.source.authority))
    .filter((finding) => {
      const parsed = parseDeadline(finding.value);
      return parsed ? parsed.getTime() < now.getTime() : false;
    })
    .map((finding) => ({
      kind: "expired" as const,
      message: `The authoritative deadline (${finding.value}) has passed.`,
      sourceId: finding.item.source.id
    }));
  if (
    eligibilityFinding?.value &&
    /united states residents only|u\.?s\.? residents only|us residents only/i.test(eligibilityFinding.value) &&
    input.context.location &&
    !/united states|u\.?s\.?a?\b/i.test(input.context.location)
  ) {
    hardDisqualifiers.push({
      kind: "ineligible",
      message: `The opportunity is limited to United States residents, which conflicts with the supplied location (${input.context.location}).`,
      sourceId: eligibilityFinding.item.source.id
    });
  }
  const verdict = calculateDecision({
    dimensions,
    criticalFacts: {
      deadline:
        uniqueDeadlines.length > 1
          ? { status: "contradictory", values: uniqueDeadlines }
          : uniqueDeadlines[0]
            ? { status: "known", value: uniqueDeadlines[0] }
            : { status: "unknown" },
      eligibility: eligibilityFinding?.value ? { status: "known", value: eligibilityFinding.value } : { status: "unknown" },
      requiredCost: isFree
        ? { status: "known", value: 0 }
        : typeof requiredCost === "number"
          ? { status: "known", value: requiredCost }
          : { status: "unknown" }
    },
    constraints: {
      budget: input.context.budget,
      hasPersonalContext: Object.values(input.context).some((value) => value !== undefined && value !== "")
    },
    hardDisqualifiers,
    verification: { status: "not-run" }
  });
  const verification: VerificationResult = {
    status: repository ? "not-run" : "unsupported",
    mode: "inspection-only",
    repository: repository ?? "No public repository discovered",
    revision: repository ? "default branch (resolve before execution)" : "Unavailable",
    commands: repository
      ? [
          `git clone --depth 1 ${repository} repository`,
          "cd repository",
          "npm install --ignore-scripts",
          "npm test"
        ]
      : [],
    logs: [],
    artifacts: []
  };

  return {
    id: randomUUID(),
    opportunityUrl: url.toString(),
    title,
    analyzedAt: retrievedAt,
    objective: "portfolio",
    context: input.context,
    verdict,
    scoreEvidence: (Object.entries(dimensions) as Array<[keyof ScoreDimensions, number]>).map(([dimension, score]) => ({
      dimension,
      score,
      rationale: hasReadableEvidence ? "Initial score based on the retrieved and user-provided evidence; more primary sources may still be needed." : "Low-confidence default because no source yielded machine-readable evidence.",
      sourceIds: collected.filter((item) => item.source.status === "retrieved" && item.text).map((item) => item.source.id)
    })),
    facts,
    sources: collected.map((item) => item.source),
    competitionFindings: [],
    risks: [
      primary?.source.status === "failed"
        ? "The primary source could not be retrieved; the report is intentionally partial."
        : collected.length === 1
          ? "Only one public source has been inspected so far."
          : "Supporting and user-provided sources may be less authoritative than the original opportunity page.",
      ...(uniqueDeadlines.length > 1 ? ["Sources disagree on the deadline; both values are preserved in the report."] : [])
    ],
    unresolvedQuestions: verdict.unresolvedQuestions,
    directions: provisionalDirections(),
    verification
  };
}
