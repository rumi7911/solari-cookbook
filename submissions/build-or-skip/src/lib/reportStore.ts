import type { InvestigationReport } from "../../shared/report.js";

const STORAGE_KEY = "build-or-skip:reports:v1";

export interface ReportStore {
  list(): InvestigationReport[];
  get(id: string): InvestigationReport | undefined;
  save(report: InvestigationReport): void;
  remove(id: string): void;
}

export function createLocalReportStore(storage: Storage): ReportStore {
  const read = (): InvestigationReport[] => {
    try {
      const value = storage.getItem(STORAGE_KEY);
      return value ? (JSON.parse(value) as InvestigationReport[]) : [];
    } catch {
      return [];
    }
  };

  const write = (reports: InvestigationReport[]) => {
    storage.setItem(STORAGE_KEY, JSON.stringify(reports));
  };

  return {
    list() {
      return read().sort(
        (left, right) => new Date(right.analyzedAt).getTime() - new Date(left.analyzedAt).getTime()
      );
    },
    get(id) {
      return read().find((report) => report.id === id);
    },
    save(report) {
      write([report, ...read().filter((item) => item.id !== report.id)]);
    },
    remove(id) {
      write(read().filter((report) => report.id !== id));
    }
  };
}
