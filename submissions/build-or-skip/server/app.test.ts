import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";

describe("BuildOrSkip API", () => {
  const app = createApp({ solariApiKey: "" });

  it("reports whether live Solari execution is configured", async () => {
    const response = await request(app).get("/api/health").expect(200);

    expect(response.body).toEqual({ ok: true, browserMode: "fallback-fetch", sandboxMode: "demo-replay" });
  });

  it("does not treat a placeholder value as a configured Solari credential", async () => {
    const response = await request(createApp({ solariApiKey: "not-configured" })).get("/api/health").expect(200);

    expect(response.body.browserMode).toBe("fallback-fetch");
    expect(response.body.sandboxMode).toBe("demo-replay");
  });

  it("returns a specific recovery error for an invalid URL", async () => {
    const response = await request(app)
      .post("/api/investigations")
      .send({ opportunityUrl: "http://localhost/private", context: {}, attachments: [] })
      .expect(400);

    expect(response.body.error).toMatch(/public HTTP or HTTPS/i);
    expect(response.body.recovery).toMatch(/publicly accessible/i);
  });

  it("creates the preloaded Solari report without an account", async () => {
    const response = await request(app)
      .post("/api/investigations")
      .send({
        opportunityUrl: "https://x.com/harrychow_/status/1962479121735467156",
        context: { availableDays: 10 },
        attachments: []
      })
      .expect(201);

    expect(response.body.title).toMatch(/Solari/i);
    expect(response.body.verification.status).toBe("not-run");
  });

  it("requires the explicit approval field for verification", async () => {
    const investigation = await request(app)
      .post("/api/investigations")
      .send({
        opportunityUrl: "https://x.com/harrychow_/status/1962479121735467156",
        context: {},
        attachments: []
      });
    const response = await request(app)
      .post("/api/verifications")
      .send({ report: investigation.body, approved: false })
      .expect(400);

    expect(response.body.error).toMatch(/approval/i);
  });
});
