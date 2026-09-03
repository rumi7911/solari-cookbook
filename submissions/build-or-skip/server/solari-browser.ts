import { Solari } from "@solarisdk/browser";

interface SolariBrowserPage {
  goto(
    url: string,
    options?: { waitUntil?: "domcontentloaded"; timeout?: number }
  ): Promise<{ status(): number } | null>;
  title(): Promise<string>;
  content(): Promise<string>;
  close(): Promise<void>;
}

interface SolariBrowserSession {
  newPage(): Promise<SolariBrowserPage>;
  close(): Promise<void>;
}

export interface SolariBrowserClient {
  launch(options?: { stealth?: boolean; retries?: number; probe?: boolean }): Promise<SolariBrowserSession>;
  close(): Promise<void>;
}

export interface BrowserCollectedPage {
  url: string;
  title: string;
  html: string;
  status: "retrieved" | "failed";
  error?: string;
}

interface CollectOptions {
  apiKey?: string;
  client?: SolariBrowserClient;
}

const MAX_SOURCE_BYTES = 1_500_000;

export async function collectWithSolariBrowser(
  urls: string[],
  options: CollectOptions
): Promise<BrowserCollectedPage[]> {
  if (!options.client && !options.apiKey) {
    throw new Error("SOLARI_API_KEY is required for live Solari Browser collection.");
  }

  const client: SolariBrowserClient = options.client ?? new Solari({ apiKey: options.apiKey! });
  let browser: SolariBrowserSession | undefined;
  try {
    browser = await client.launch({ stealth: true, retries: 1, probe: true });
    const results: BrowserCollectedPage[] = [];

    for (const url of urls) {
      let page: SolariBrowserPage | undefined;
      try {
        page = await browser.newPage();
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });
        const status = response?.status();
        if (typeof status === "number" && status >= 400) {
          throw new Error(`The source returned HTTP ${status}.`);
        }
        results.push({
          url,
          title: (await page.title()).trim(),
          html: (await page.content()).slice(0, MAX_SOURCE_BYTES),
          status: "retrieved"
        });
      } catch (error) {
        results.push({
          url,
          title: "",
          html: "",
          status: "failed",
          error: error instanceof Error ? error.message : "Solari Browser could not retrieve this source."
        });
      } finally {
        await page?.close().catch(() => undefined);
      }
    }

    return results;
  } finally {
    await browser?.close().catch(() => undefined);
    await client.close().catch(() => undefined);
  }
}
