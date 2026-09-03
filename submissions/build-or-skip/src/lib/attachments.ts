export interface PreparedAttachment {
  name: string;
  type: string;
  size: number;
  extractedText?: string;
}

interface AttachmentDependencies {
  extractPdfText?: (file: File) => Promise<string>;
}

async function extractPdfText(file: File): Promise<string> {
  const [{ GlobalWorkerOptions, getDocument }, { default: workerUrl }] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url")
  ]);
  GlobalWorkerOptions.workerSrc = workerUrl;
  const document = await getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, 80); pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .filter(Boolean)
        .join(" ")
    );
  }
  return pages.join("\n").replace(/\s+/g, " ").trim().slice(0, 100_000);
}

export async function prepareAttachment(
  file: File,
  dependencies: AttachmentDependencies = {}
): Promise<PreparedAttachment> {
  const prepared: PreparedAttachment = { name: file.name, type: file.type, size: file.size };
  if (file.type !== "application/pdf") return prepared;

  const text = await (dependencies.extractPdfText ?? extractPdfText)(file);
  return text ? { ...prepared, extractedText: text } : prepared;
}
