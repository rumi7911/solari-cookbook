import { describe, expect, it } from "vitest";
import { collectWithSolariBrowser, type SolariBrowserClient } from "./solari-browser.js";

function fakeClient(pages: Record<string, { title: string; html: string; status?: number } | Error>) {
  const lifecycle: string[] = [];
  const client: SolariBrowserClient = {
    async launch() {
      lifecycle.push("browser:launch");
      return {
        async newPage() {
          let currentUrl = "";
          lifecycle.push("page:new");
          return {
            async goto(url) {
              currentUrl = url;
              lifecycle.push(`page:goto:${url}`);
              const page = pages[url];
              if (page instanceof Error) throw page;
              return { status: () => page?.status ?? 200 };
            },
            async title() {
              const page = pages[currentUrl];
              return page instanceof Error || !page ? "" : page.title;
            },
            async content() {
              const page = pages[currentUrl];
              return page instanceof Error || !page ? "" : page.html;
            },
            async close() {
              lifecycle.push("page:close");
            }
          };
        },
        async close() {
          lifecycle.push("browser:close");
        }
      };
    },
    async close() {
      lifecycle.push("client:close");
    }
  };
  return { client, lifecycle };
}

describe("Solari Browser evidence collection", () => {
  it("collects multiple public pages in one managed browser session", async () => {
    const first = "https://example.com/challenge";
    const second = "https://docs.example.com/rules";
    const { client, lifecycle } = fakeClient({
      [first]: { title: "Challenge", html: "<h1>Challenge</h1><p>Entry is free.</p>" },
      [second]: { title: "Rules", html: "<h1>Rules</h1><p>Deadline: 30 September 2026.</p>" }
    });

    const result = await collectWithSolariBrowser([first, second], { client });

    expect(result.map(({ status, title, html }) => ({ status, title, html }))).toEqual([
      { status: "retrieved", title: "Challenge", html: "<h1>Challenge</h1><p>Entry is free.</p>" },
      { status: "retrieved", title: "Rules", html: "<h1>Rules</h1><p>Deadline: 30 September 2026.</p>" }
    ]);
    expect(lifecycle.filter((event) => event === "browser:launch")).toHaveLength(1);
    expect(lifecycle.slice(-2)).toEqual(["browser:close", "client:close"]);
  });

  it("preserves a failed source and continues collecting the others", async () => {
    const blocked = "https://blocked.example.com";
    const available = "https://available.example.com";
    const { client } = fakeClient({
      [blocked]: new Error("navigation denied"),
      [available]: { title: "Available", html: "<p>Open to everyone.</p>" }
    });

    const result = await collectWithSolariBrowser([blocked, available], { client });

    expect(result[0]).toMatchObject({ url: blocked, status: "failed", error: "navigation denied" });
    expect(result[1]).toMatchObject({ url: available, status: "retrieved", title: "Available" });
  });

  it("does not label a rendered HTTP error page as retrieved evidence", async () => {
    const missing = "https://x.example.com/missing";
    const { client } = fakeClient({
      [missing]: { title: "Post Not Found", html: "<h1>Post Not Found</h1>", status: 404 }
    });

    const [result] = await collectWithSolariBrowser([missing], { client });

    expect(result).toMatchObject({ url: missing, status: "failed", error: "The source returned HTTP 404." });
  });
});
