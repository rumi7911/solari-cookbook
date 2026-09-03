import { describe, expect, it, vi } from "vitest";
import { investigateOpportunity, validatePublicOpportunityUrl } from "./investigation.js";

describe("public URL validation", () => {
  it.each([
    "http://localhost:3000/challenge",
    "http://127.0.0.1/private",
    "http://10.1.2.3/internal",
    "http://192.168.1.8/internal",
    "ftp://example.com/file"
  ])("rejects private or unsupported target %s", (url) => {
    expect(() => validatePublicOpportunityUrl(url)).toThrow(/public HTTP or HTTPS/i);
  });

  it("accepts a normal public HTTPS opportunity", () => {
    expect(validatePublicOpportunityUrl("https://example.com/challenge").hostname).toBe("example.com");
  });
});

describe("investigateOpportunity", () => {
  it("returns the complete, cited Solari demonstration with an approval-gated verification plan", async () => {
    const report = await investigateOpportunity({
      opportunityUrl: "https://x.com/harrychow_/status/1962479121735467156",
      context: { availableDays: 10, skills: "TypeScript, React", budget: 20, location: "Pakistan" },
      attachments: []
    });

    expect(report.title).toMatch(/Solari/i);
    expect(report.facts.some((fact) => fact.label === "Work arrangement" && fact.sourceIds.length > 0)).toBe(true);
    expect(report.sources.every((source) => Boolean(source.retrievedAt))).toBe(true);
    expect(report.sources.every((source) => source.collectionMode === "demo-fixture")).toBe(true);
    expect(report.directions).toHaveLength(3);
    expect(report.verification.status).toBe("not-run");
    expect(report.verification.commands).toEqual([
      "git clone --depth 1 https://github.com/solari-sdk/solari-cookbook repository",
      "cd examples/browser-quickstart-ts",
      "npx --yes node@20.20.2 --version",
      'npx --yes --package node@20.20.2 -c "npm install --ignore-scripts"',
      'npx --yes --package node@20.20.2 -c "npm run start -- --url https://example.com"'
    ]);
    expect(report.verdict.verdict).toBe("Build");
  });

  it("records live Solari Browser provenance when the canonical example is collected", async () => {
    const browserCollector = async (urls: string[]) =>
      urls.map((url) => ({
        url,
        title: url.includes("github.com") ? "Solari cookbook" : "Solari",
        html: "<html><title>Solari</title><body>Official Solari evidence</body></html>",
        status: "retrieved" as const
      }));

    const report = await investigateOpportunity(
      {
        opportunityUrl: "https://x.com/harrychow_/status/1962479121735467156",
        context: { availableDays: 10 },
        attachments: []
      },
      { solariApiKey: "configured", browserCollector }
    );

    expect(report.sources).toHaveLength(3);
    expect(report.sources.every((source) => source.collectionMode === "solari-browser")).toBe(true);
  });

  it("keeps a useful partial report when the source cannot be retrieved", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("blocked"));
    const report = await investigateOpportunity(
      { opportunityUrl: "https://example.com/challenge", context: {}, attachments: [] },
      { fetcher }
    );

    expect(report.sources[0]?.status).toBe("failed");
    expect(report.sources[0]?.collectionMode).toBe("fallback-fetch");
    expect(report.verdict.verdict).toBe("Investigate Further");
    expect(report.unresolvedQuestions).toContain("What is the authoritative submission deadline?");
    expect(report.directions.every((direction) => direction.provisional)).toBe(true);
  });

  it("uses Solari Browser for generic public evidence when configured", async () => {
    const browserCollector = async (urls: string[]) =>
      urls.map((url) => ({
        url,
        title: "Acme SDK Challenge",
        html: "<html><h1>Acme SDK Challenge</h1><p>Deadline: 30 September 2026. Open to everyone. Entry is free.</p></html>",
        status: "retrieved" as const
      }));

    const report = await investigateOpportunity(
      { opportunityUrl: "https://example.com/challenge", context: {}, attachments: [] },
      { solariApiKey: "configured", browserCollector }
    );

    expect(report.title).toBe("Acme SDK Challenge");
    expect(report.sources[0]?.collectionMode).toBe("solari-browser");
  });

  it("extracts inspectable evidence from a public page without claiming unknown eligibility", async () => {
    const html = `
      <html><head><title>Acme SDK Challenge</title></head><body>
        <main><h1>Acme SDK Challenge</h1>
        <p>Deadline: 30 September 2026. Build with the Acme SDK.</p>
        <p>Prize: $5,000. Entry is free.</p>
        <a href="https://github.com/acme/sdk">GitHub repository</a></main>
      </body></html>`;
    const fetcher = vi.fn().mockResolvedValue(
      new Response(html, { status: 200, headers: { "content-type": "text/html" } })
    );

    const report = await investigateOpportunity(
      { opportunityUrl: "https://example.com/challenge", context: { availableDays: 7 }, attachments: [] },
      { fetcher }
    );

    expect(report.title).toBe("Acme SDK Challenge");
    expect(report.facts.some((fact) => fact.label === "Deadline" && fact.value.includes("30 September"))).toBe(true);
    expect(report.verification.repository).toBe("https://github.com/acme/sdk");
    expect(report.verdict.verdict).toBe("Investigate Further");
    expect(report.unresolvedQuestions).toContain("Who is eligible to participate?");
  });

  it("returns Skip when the authoritative deadline is already past", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response("<html><title>Old challenge</title><p>Deadline: 1 August 2026.</p><p>Open to developers worldwide. Entry is free.</p></html>", {
        status: 200,
        headers: { "content-type": "text/html" }
      })
    );

    const report = await investigateOpportunity(
      { opportunityUrl: "https://example.com/old", context: {}, attachments: [] },
      { fetcher, now: () => new Date("2026-09-01T12:00:00.000Z") }
    );

    expect(report.verdict.verdict).toBe("Skip");
    expect(report.verdict.hardDisqualifiers[0]?.kind).toBe("expired");
  });

  it("shows contradictory deadlines together and abstains", async () => {
    const fetcher = vi.fn().mockImplementation((input: unknown) => {
      const url = String(input);
      const deadline = url.includes("rules") ? "2 October 2026" : "30 September 2026";
      return Promise.resolve(
        new Response(`<html><title>Challenge</title><p>Deadline: ${deadline}. Open to everyone. Entry is free.</p></html>`, {
          status: 200,
          headers: { "content-type": "text/html" }
        })
      );
    });

    const report = await investigateOpportunity(
      {
        opportunityUrl: "https://example.com/challenge",
        relatedLinks: ["https://example.com/rules"],
        context: {},
        attachments: []
      },
      { fetcher }
    );

    expect(report.verdict.verdict).toBe("Investigate Further");
    expect(report.facts.filter((fact) => fact.label === "Deadline").map((fact) => fact.value)).toEqual([
      "30 September 2026",
      "2 October 2026"
    ]);
    expect(report.unresolvedQuestions).toContain("What is the authoritative submission deadline?");
  });

  it("includes extracted PDF text as user-provided evidence", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("blocked"));
    const report = await investigateOpportunity(
      {
        opportunityUrl: "https://example.com/challenge",
        context: {},
        attachments: [
          {
            name: "rules.pdf",
            type: "application/pdf",
            size: 1200,
            extractedText: "Deadline: 12 October 2026. Open to developers worldwide. Entry is free."
          }
        ]
      },
      { fetcher }
    );

    expect(report.sources.some((source) => source.title === "rules.pdf" && source.authority === "User provided")).toBe(true);
    expect(report.sources.find((source) => source.title === "rules.pdf")?.collectionMode).toBe("user-provided");
    expect(report.facts.some((fact) => fact.label === "Deadline" && fact.classification === "User-provided")).toBe(true);
  });

  it("returns Skip when a confirmed entry fee exceeds the user's budget", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response("<html><title>Costly challenge</title><p>Deadline: 12 October 2026. Open to everyone. Mandatory entry fee: $99.</p></html>", {
        status: 200,
        headers: { "content-type": "text/html" }
      })
    );
    const report = await investigateOpportunity(
      { opportunityUrl: "https://example.com/costly", context: { budget: 20 }, attachments: [] },
      { fetcher }
    );

    expect(report.verdict.verdict).toBe("Skip");
    expect(report.verdict.hardDisqualifiers[0]?.kind).toBe("over-budget");
  });

  it("returns Skip only when explicit location context conflicts with a confirmed residents-only rule", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response("<html><title>US challenge</title><p>Deadline: 12 October 2026. Eligibility: United States residents only. Entry is free.</p></html>", {
        status: 200,
        headers: { "content-type": "text/html" }
      })
    );
    const report = await investigateOpportunity(
      { opportunityUrl: "https://example.com/us-only", context: { location: "Pakistan" }, attachments: [] },
      { fetcher }
    );

    expect(report.verdict.verdict).toBe("Skip");
    expect(report.verdict.hardDisqualifiers[0]?.kind).toBe("ineligible");
  });
});
