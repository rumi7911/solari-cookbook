import { beforeEach, describe, expect, it } from "vitest";
import { createLocalReportStore } from "./reportStore.js";
import type { InvestigationReport } from "../../shared/report.js";

const report = {
  id: "one",
  title: "First report",
  analyzedAt: "2026-09-01T10:00:00.000Z"
} as InvestigationReport;

describe("local report history", () => {
  beforeEach(() => localStorage.clear());

  it("persists reports on this device and restores newest first", () => {
    const store = createLocalReportStore(localStorage);
    store.save(report);
    store.save({ ...report, id: "two", title: "Second report", analyzedAt: "2026-09-01T11:00:00.000Z" });

    expect(createLocalReportStore(localStorage).list().map((item) => item.id)).toEqual(["two", "one"]);
  });

  it("updates an existing report without duplicating it", () => {
    const store = createLocalReportStore(localStorage);
    store.save(report);
    store.save({ ...report, title: "Updated" });

    expect(store.list()).toHaveLength(1);
    expect(store.get("one")?.title).toBe("Updated");
  });

  it("deletes one report without clearing the rest", () => {
    const store = createLocalReportStore(localStorage);
    store.save(report);
    store.save({ ...report, id: "two" });
    store.remove("one");

    expect(store.get("one")).toBeUndefined();
    expect(store.get("two")).toBeDefined();
  });
});
