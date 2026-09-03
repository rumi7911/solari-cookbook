import express, { type ErrorRequestHandler } from "express";
import { z } from "zod";
import type { InvestigationReport } from "../shared/report.js";
import { investigateOpportunity } from "./investigation.js";
import { declineVerification, verifyReport } from "./verification.js";
import { configuredSolariApiKey } from "./config.js";

interface AppOptions {
  solariApiKey?: string;
}

const contextSchema = z.object({
  availableDays: z.number().int().min(1).max(90).optional(),
  skills: z.string().max(500).optional(),
  budget: z.number().min(0).max(1_000_000).optional(),
  location: z.string().max(160).optional()
});

const attachmentSchema = z.object({
  name: z.string().min(1).max(240),
  type: z.enum(["application/pdf", "image/png", "image/jpeg", "image/webp"]),
  size: z.number().int().nonnegative().max(10 * 1024 * 1024),
  extractedText: z.string().max(100_000).optional()
});

const investigationSchema = z.object({
  opportunityUrl: z.string().min(1),
  context: contextSchema.default({}),
  attachments: z.array(attachmentSchema).max(8).default([]),
  relatedLinks: z.array(z.string().url()).max(8).optional()
});

export function createApp(options: AppOptions = {}) {
  const solariApiKey = configuredSolariApiKey(options.solariApiKey ?? process.env.SOLARI_API_KEY);
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_request, response) => {
    response.json({
      ok: true,
      browserMode: solariApiKey ? "solari-browser" : "fallback-fetch",
      sandboxMode: solariApiKey ? "live" : "demo-replay"
    });
  });

  app.post("/api/investigations", async (request, response, next) => {
    try {
      const input = investigationSchema.parse(request.body);
      const report = await investigateOpportunity(input, { solariApiKey });
      response.status(201).json(report);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/verifications", async (request, response, next) => {
    try {
      if (request.body?.approved !== true) {
        throw new Error("Affirmative approval is required before repository verification.");
      }
      const approved = true;
      const report = request.body?.report as InvestigationReport | undefined;
      if (!report?.id || !report.verification) throw new Error("A complete investigation report is required.");
      const verified = await verifyReport(report, { approved }, { solariApiKey: options.solariApiKey });
      response.json(verified);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/verifications/decline", (request, response, next) => {
    try {
      const report = request.body?.report as InvestigationReport | undefined;
      if (!report?.id || !report.verification) throw new Error("A complete investigation report is required.");
      response.json(declineVerification(report));
    } catch (error) {
      next(error);
    }
  });

  const handleError: ErrorRequestHandler = (error, _request, response, _next) => {
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? "The submitted investigation is invalid."
        : error instanceof Error
          ? error.message
          : "The request could not be completed.";
    response.status(400).json({
      error: message,
      recovery: "Use a publicly accessible URL, replace unsupported files, or continue with the preloaded Solari example."
    });
  };
  app.use(handleError);

  return app;
}
