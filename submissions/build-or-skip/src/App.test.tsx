import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App.js";
import { investigateOpportunity } from "../server/investigation.js";

const SOLARI_URL = "https://x.com/harrychow_/status/1962479121735467156";

function jsonResponse(value: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } }));
}

describe("BuildOrSkip product flow", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("starts with one required URL and can preload the Solari evaluation case", async () => {
    render(<App />);
    const url = screen.getByLabelText(/opportunity url/i);

    expect(url).toBeRequired();
    expect(screen.getByText(/is this worth your next two weeks/i)).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: /try the solari example/i }));
    expect(url).toHaveValue(SOLARI_URL);
  });

  it("shows the exact command plan and gates execution behind an acknowledgement", async () => {
    const report = await investigateOpportunity({ opportunityUrl: SOLARI_URL, context: {}, attachments: [] });
    vi.spyOn(globalThis, "fetch").mockImplementation(() => jsonResponse(report, 201));
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /try the solari example/i }));
    await userEvent.click(screen.getByRole("button", { name: /^investigate$/i }));

    const dialog = await screen.findByRole("dialog", { name: /run the official quick-start/i });
    expect(dialog).toHaveTextContent('node@20.20.2 -c "npm install --ignore-scripts"');
    expect(dialog).toHaveTextContent("node@20.20.2");
    const approve = screen.getByRole("button", { name: /approve & run/i });
    expect(approve).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox", { name: /executes third-party code/i }));
    expect(approve).toBeEnabled();
  });

  it("continues to a useful report when execution is declined", async () => {
    const report = await investigateOpportunity({ opportunityUrl: SOLARI_URL, context: {}, attachments: [] });
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/decline")) {
        return jsonResponse({
          ...report,
          verification: { ...report.verification, status: "declined", logs: ["Execution declined"] }
        });
      }
      return jsonResponse(report, 201);
    });
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /try the solari example/i }));
    await userEvent.click(screen.getByRole("button", { name: /^investigate$/i }));
    await userEvent.click(await screen.findByRole("button", { name: /skip verification/i }));

    expect(await screen.findByText("Build", { selector: ".verdict-label" })).toBeVisible();
    expect(screen.getAllByText(/inspection only/i)[0]).toBeVisible();
    expect(screen.getByRole("button", { name: /export markdown/i })).toBeEnabled();
    await waitFor(() => expect(JSON.parse(localStorage.getItem("build-or-skip:reports:v1") ?? "[]")).toHaveLength(1));
  });

  it("shows whether source evidence came from Solari Browser or a demo fixture", async () => {
    const report = await investigateOpportunity({ opportunityUrl: SOLARI_URL, context: {}, attachments: [] });
    vi.spyOn(globalThis, "fetch").mockImplementation(() => jsonResponse(report, 201));
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /try the solari example/i }));
    await userEvent.click(screen.getByRole("button", { name: /^investigate$/i }));

    expect(await screen.findByText(/preloaded demo fixture/i)).toBeVisible();
    expect(screen.getByText(/solari browser was not run/i)).toBeVisible();
  });

  it("does not present the no-key sandbox replay as live verification", async () => {
    const report = await investigateOpportunity({ opportunityUrl: SOLARI_URL, context: {}, attachments: [] });
    const replay = {
      ...report,
      verification: { ...report.verification, status: "success" as const, mode: "demo-replay" as const }
    };
    vi.spyOn(globalThis, "fetch").mockImplementation(() => jsonResponse(replay, 201));
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /try the solari example/i }));
    await userEvent.click(screen.getByRole("button", { name: /^investigate$/i }));

    expect(await screen.findByText("Demo replay", { selector: ".status-pill" })).toBeVisible();
    expect(screen.queryByText("Verified", { selector: ".status-pill" })).not.toBeInTheDocument();
  });

  it("presents a credential-withheld run as partial proof, not an unsuccessful repository", async () => {
    const report = await investigateOpportunity({ opportunityUrl: SOLARI_URL, context: {}, attachments: [] });
    const partial = {
      ...report,
      verification: {
        ...report.verification,
        status: "unsupported" as const,
        mode: "live" as const,
        failureReason: "BuildOrSkip withheld server credentials from third-party repository code."
      }
    };
    vi.spyOn(globalThis, "fetch").mockImplementation(() => jsonResponse(partial, 201));
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /try the solari example/i }));
    await userEvent.click(screen.getByRole("button", { name: /^investigate$/i }));

    expect(await screen.findByText("Partially verified", { selector: ".status-pill" })).toBeVisible();
    expect(screen.getByText(/verification incomplete/i)).toBeVisible();
    expect(screen.queryByText(/verification unsuccessful/i)).not.toBeInTheDocument();
  });
});
