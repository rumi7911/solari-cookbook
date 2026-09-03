import type { InvestigationReport, PersonalContext } from "../../shared/report.js";

interface InvestigationRequest {
  opportunityUrl: string;
  context: PersonalContext;
  attachments: Array<{ name: string; type: string; size: number; extractedText?: string }>;
  relatedLinks?: string[];
}

async function request<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...init.headers }
  });
  const body = (await response.json()) as T & { error?: string; recovery?: string };
  if (!response.ok) {
    throw new Error([body.error, body.recovery].filter(Boolean).join(" "));
  }
  return body;
}

export const api = {
  investigate(input: InvestigationRequest) {
    return request<InvestigationReport>("/api/investigations", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  verify(report: InvestigationReport) {
    return request<InvestigationReport>("/api/verifications", {
      method: "POST",
      body: JSON.stringify({ report, approved: true })
    });
  },
  declineVerification(report: InvestigationReport) {
    return request<InvestigationReport>("/api/verifications/decline", {
      method: "POST",
      body: JSON.stringify({ report })
    });
  }
};
