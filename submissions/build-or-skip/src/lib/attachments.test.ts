import { describe, expect, it, vi } from "vitest";
import { prepareAttachment } from "./attachments.js";

describe("prepareAttachment", () => {
  it("adds locally extracted text for PDF evidence", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "rules.pdf", { type: "application/pdf" });
    const extractPdfText = vi.fn().mockResolvedValue("Deadline: 12 October 2026");

    await expect(prepareAttachment(file, { extractPdfText })).resolves.toMatchObject({
      name: "rules.pdf",
      type: "application/pdf",
      extractedText: "Deadline: 12 October 2026"
    });
  });

  it("preserves image metadata without pretending OCR occurred", async () => {
    const file = new File(["pixels"], "rules.png", { type: "image/png" });

    const result = await prepareAttachment(file);

    expect(result).toMatchObject({ name: "rules.png", type: "image/png" });
    expect(result.extractedText).toBeUndefined();
  });
});
