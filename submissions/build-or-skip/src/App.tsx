import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Code2,
  Download,
  ExternalLink,
  FileText,
  Github,
  Globe2,
  Link2,
  LoaderCircle,
  LockKeyhole,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { calculateDecision, type DimensionKey } from "../shared/decision.js";
import { exportReportMarkdown, type InvestigationReport, type PersonalContext } from "../shared/report.js";
import { api } from "./lib/api.js";
import { prepareAttachment } from "./lib/attachments.js";
import { createLocalReportStore } from "./lib/reportStore.js";

const SOLARI_URL = "https://x.com/harrychow_/status/1962479121735467156";

const dimensionLabels: Record<DimensionKey, string> = {
  portfolioValue: "Portfolio & learning",
  technicalFeasibility: "Technical feasibility",
  differentiation: "Differentiation",
  timeFit: "Time fit",
  costValue: "Cost to effort",
  credibility: "Credibility & clarity"
};

const progressSteps = [
  { label: "Opportunity", detail: "Reading the submitted source" },
  { label: "Rules & eligibility", detail: "Resolving decision-critical facts" },
  { label: "Repository", detail: "Inspecting the official quick-start" },
  { label: "Competition", detail: "Looking for saturated categories" },
  { label: "Verdict", detail: "Applying the published rubric" }
];

function sourceModeLabel(mode: InvestigationReport["sources"][number]["collectionMode"]) {
  if (mode === "solari-browser") return "Solari Browser";
  if (mode === "fallback-fetch") return "HTTP fallback";
  if (mode === "user-provided") return "User file";
  if (mode === "demo-fixture") return "Demo fixture";
  return "Legacy source";
}

function CitationLinks({ sourceIds, report }: { sourceIds: string[]; report: InvestigationReport }) {
  const cited = sourceIds.map((id) => report.sources.find((source) => source.id === id)).filter(Boolean);
  if (!cited.length) return null;
  return <span className="citation-links" aria-label="Citations">{cited.map((source) => {
    const index = report.sources.findIndex((item) => item.id === source!.id) + 1;
    return source!.url.startsWith("http")
      ? <a key={source!.id} href={source!.url} target="_blank" rel="noreferrer" title={source!.title}>[{index}]</a>
      : <span key={source!.id} title={source!.title}>[{index}]</span>;
  })}</span>;
}

function Wordmark() {
  return (
    <button className="wordmark" type="button" onClick={() => window.location.assign("/")} aria-label="BuildOrSkip home">
      <span className="wordmark-mark" aria-hidden="true"><ArrowRight size={16} /></span>
      BuildOrSkip
    </button>
  );
}

function AppHeader({ onNew, onHistory }: { onNew: () => void; onHistory: () => void }) {
  return (
    <header className="app-header">
      <Wordmark />
      <nav aria-label="Primary navigation">
        <button type="button" onClick={onNew}><Plus size={15} /> New investigation</button>
        <button type="button" onClick={onHistory}><Clock3 size={15} /> Recent reports</button>
      </nav>
      <span className="local-badge"><span /> Local only</span>
    </header>
  );
}

interface IntakeProps {
  onComplete: (report: InvestigationReport) => void;
  initialReport?: InvestigationReport;
}

function Intake({ onComplete, initialReport }: IntakeProps) {
  const [url, setUrl] = useState(initialReport?.opportunityUrl ?? "");
  const [context, setContext] = useState<PersonalContext>(initialReport?.context ?? {});
  const [relatedLinks, setRelatedLinks] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading) return;
    const timer = window.setInterval(() => setProgress((value) => Math.min(4, value + 1)), 550);
    return () => window.clearInterval(timer);
  }, [loading]);

  const updateContext = (key: keyof PersonalContext, value: string) => {
    setContext((current) => ({
      ...current,
      [key]: key === "availableDays" || key === "budget" ? (value ? Number(value) : undefined) : value || undefined
    }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setProgress(0);
    setError("");
    try {
      const report = await api.investigate({
        opportunityUrl: url,
        context,
        relatedLinks: relatedLinks.split(/\n|,/).map((item) => item.trim()).filter(Boolean),
        attachments: await Promise.all(files.map((file) => prepareAttachment(file)))
      });
      setProgress(4);
      onComplete(report);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The investigation could not be completed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="intake-shell">
      <section className="intake-main">
        <div className="eyebrow"><Sparkles size={14} /> Evidence before opportunity hype</div>
        <h1>Is this worth your next two weeks?</h1>
        <p className="lede">Paste a public opportunity. We’ll trace the rules, inspect the repository, and show our work.</p>

        <form onSubmit={submit} className="investigation-form">
          <label htmlFor="opportunity-url">Opportunity URL <span>Required</span></label>
          <div className="url-control">
            <Globe2 size={19} aria-hidden="true" />
            <input
              id="opportunity-url"
              required
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://x.com/... or https://devpost.com/..."
            />
            <button type="submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={18} /> : "Investigate"}</button>
          </div>
          <button className="example-button" type="button" onClick={() => setUrl(SOLARI_URL)}>
            Try the Solari example <ArrowRight size={14} />
          </button>

          <div className="form-section-title">
            <div><h2>Add your context</h2><p>Optional, but it makes the verdict yours.</p></div>
            <span>Optional</span>
          </div>
          <div className="context-grid">
            <label>Available time<input type="number" min="1" max="90" value={context.availableDays ?? ""} onChange={(event) => updateContext("availableDays", event.target.value)} placeholder="10 days" /></label>
            <label>Budget<input type="number" min="0" value={context.budget ?? ""} onChange={(event) => updateContext("budget", event.target.value)} placeholder="$25" /></label>
            <label>Skills & preferred stack<input value={context.skills ?? ""} onChange={(event) => updateContext("skills", event.target.value)} placeholder="TypeScript, React, Python" /></label>
            <label>Location / eligibility<input value={context.location ?? ""} onChange={(event) => updateContext("location", event.target.value)} placeholder="London, UK" /></label>
          </div>
          <label className="related-label">Related public links<textarea value={relatedLinks} onChange={(event) => setRelatedLinks(event.target.value)} placeholder="Repository, rules, docs — one per line" rows={2} /></label>
          <label className="dropzone">
            <Upload size={19} />
            <span><strong>Add screenshots or PDF rules</strong><small>PNG, JPG, WebP, or PDF · up to 10 MB each</small></span>
            <input type="file" multiple accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} />
          </label>
          {files.length > 0 && <div className="file-list">{files.map((file) => <span key={file.name}><FileText size={13} />{file.name}<button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((items) => items.filter((item) => item !== file))}><X size={12} /></button></span>)}</div>}
          {error && <div className="form-error" role="alert"><AlertTriangle size={18} /><div><strong>We couldn’t start this investigation.</strong><p>{error}</p></div></div>}
        </form>
      </section>

      <aside className="investigation-rail" aria-live="polite">
        <div className="rail-heading"><span>Investigation plan</span><span>5 checks</span></div>
        <ol>
          {progressSteps.map((step, index) => {
            const state = loading ? (index < progress ? "done" : index === progress ? "active" : "queued") : "queued";
            return <li className={state} key={step.label}><span className="step-mark">{state === "done" ? <Check size={13} /> : index + 1}</span><div><strong>{step.label}</strong><small>{step.detail}</small></div>{state === "active" && <LoaderCircle className="spin" size={15} />}</li>;
          })}
        </ol>
        <div className="rail-note"><ShieldCheck size={18} /><div><strong>Nothing executes yet.</strong><p>If we find a repository, you’ll review every proposed command before deciding whether it runs.</p></div></div>
        <div className="supported"><span>V1 sources</span><p>Public webpages · Public GitHub · Screenshots · PDF rules</p><small>Private repositories, authenticated sites, and Discord content are not supported.</small></div>
      </aside>
    </main>
  );
}

function StatusPill({ verification }: { verification: InvestigationReport["verification"] }) {
  const labels = { "not-run": "Awaiting approval", declined: "Inspection only", success: "Verified", failure: "Unsuccessful", timeout: "Timed out", unsupported: "Partially verified" };
  const isReplay = verification.mode === "demo-replay";
  const label = isReplay ? "Demo replay" : labels[verification.status];
  return <span className={`status-pill status-${isReplay ? "demo" : verification.status}`}>{verification.status === "success" && !isReplay ? <CheckCircle2 size={13} /> : <CircleHelp size={13} />}{label}</span>;
}

function ConfidenceDial({ value }: { value: number }) {
  return <div className="confidence-dial" style={{ "--confidence": `${value * 3.6}deg` } as React.CSSProperties}><div><strong>{value}%</strong><span>confidence</span></div></div>;
}

function ScoreBreakdown({ report }: { report: InvestigationReport }) {
  return (
    <section className="report-section" id="scores">
      <div className="section-heading"><div><span className="section-number">02</span><h2>Portfolio-focused score</h2></div><strong>{report.verdict.weightedScore}<small>/100</small></strong></div>
      <div className="score-list">
        {report.scoreEvidence.map((evidence) => {
          const score = report.verdict.adjustedDimensions[evidence.dimension];
          return <div className="score-row" key={evidence.dimension}><div className="score-title"><strong>{dimensionLabels[evidence.dimension]}</strong><span>{score}</span></div><div className="score-track"><i style={{ width: `${score}%` }} /></div><p>{evidence.rationale} <CitationLinks sourceIds={evidence.sourceIds} report={report} /></p></div>;
        })}
      </div>
    </section>
  );
}

function VerificationProof({ report, onRun }: { report: InvestigationReport; onRun: () => void }) {
  const verification = report.verification;
  const mode = verification.mode === "live" ? "Live Solari sandbox" : verification.mode === "demo-replay" ? "Demo replay — not live execution" : "Inspection only";
  return (
    <section className="report-section verification-section" id="verification">
      <div className="section-heading"><div><span className="section-number">03</span><h2>Repository verification</h2></div><StatusPill verification={verification} /></div>
      <div className="repo-proof">
        <div className="repo-meta">
          <Github size={20} />
          <div><a href={verification.repository.startsWith("http") ? verification.repository : undefined} target="_blank" rel="noreferrer">{verification.repository.replace("https://github.com/", "")}</a><span>{verification.subdirectory ?? "Repository root"}</span></div>
          {verification.status === "not-run" && <button type="button" onClick={onRun}>Review & run <ChevronRight size={15} /></button>}
        </div>
        <div className="proof-grid">
          <div><span>Mode</span><strong>{mode}</strong></div>
          <div><span>Revision</span><strong>{verification.revision}</strong></div>
          <div><span>Duration</span><strong>{verification.durationMs ? `${(verification.durationMs / 1000).toFixed(1)}s` : "Not run"}</strong></div>
          <div><span>Artifacts</span><strong>{verification.artifacts.length || "None"}</strong></div>
        </div>
        {verification.failureReason && <div className="verification-warning"><AlertTriangle size={17} /><span><strong>{verification.status === "unsupported" ? "Verification incomplete." : "Verification unsuccessful."}</strong> {verification.failureReason}</span></div>}
        {verification.logs.length > 0 && <pre className="terminal-log"><code>{verification.logs.join("\n")}</code></pre>}
      </div>
    </section>
  );
}

function ReportView({ report, history, onSelect, onNew, onEdit, onDelete, onRun }: {
  report: InvestigationReport;
  history: InvestigationReport[];
  onSelect: (report: InvestigationReport) => void;
  onNew: () => void;
  onEdit: () => void;
  onDelete: (id: string) => void;
  onRun: () => void;
}) {
  const hasLiveBrowserEvidence = report.sources.some((source) => source.collectionMode === "solari-browser");
  const isFixtureOnly = report.sources.length > 0 && report.sources.every((source) => source.collectionMode === "demo-fixture");
  const researchMode = isFixtureOnly
    ? { title: "Preloaded demo fixture", detail: "Solari Browser was not run because no API key is configured." }
    : hasLiveBrowserEvidence
      ? { title: "Live Solari Browser research", detail: "Managed browser evidence is identified source by source below." }
      : { title: "Fallback evidence collection", detail: "No live Solari Browser evidence was available for this report." };
  const exportMarkdown = () => {
    const blob = new Blob([exportReportMarkdown(report)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${report.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="report-shell">
      <aside className="history-rail">
        <div className="history-title"><span>Recent reports</span><small>{history.length} on this device</small></div>
        <div className="history-list">
          {history.map((item) => <button className={item.id === report.id ? "selected" : ""} key={item.id} type="button" onClick={() => onSelect(item)}><span className={`history-verdict verdict-${item.verdict.verdict.toLowerCase().replace(" ", "-")}`}>{item.verdict.verdict === "Investigate Further" ? "Review" : item.verdict.verdict}</span><strong>{item.title}</strong><small>{new Date(item.analyzedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</small></button>)}
        </div>
        <button className="new-report-button" type="button" onClick={onNew}><Plus size={15} /> New investigation</button>
      </aside>

      <article className="report-document">
        <div className="report-toolbar">
          <div><span>Evidence report</span><small>Analyzed {new Date(report.analyzedAt).toLocaleString()}</small></div>
          <div className="toolbar-actions"><button type="button" onClick={onEdit}><RefreshCw size={14} /> Edit context</button><button className="export-button" type="button" onClick={exportMarkdown}><Download size={14} /> Export Markdown</button></div>
        </div>

        <div className={`research-provenance ${hasLiveBrowserEvidence ? "research-live" : "research-fallback"}`}>
          <Globe2 size={15} />
          <div><strong>{researchMode.title}</strong><span>{researchMode.detail}</span></div>
        </div>

        <header className="verdict-hero">
          <div className="verdict-copy">
            <div className="eyebrow"><Link2 size={13} /> {new URL(report.opportunityUrl).hostname}</div>
            <h1>{report.title}</h1>
            <div className={`verdict-label verdict-${report.verdict.verdict.toLowerCase().replace(" ", "-")}`}>{report.verdict.verdict}</div>
            <p>{report.verdict.why} <CitationLinks sourceIds={report.verdict.hardDisqualifiers.map((item) => item.sourceId).filter((id): id is string => Boolean(id))} report={report} /></p>
            <span className="no-guarantee">Portfolio recommendation only — not a hiring, prize, or winning prediction.</span>
          </div>
          <ConfidenceDial value={report.verdict.confidence} />
        </header>

        <section className="report-section" id="facts">
          <div className="section-heading"><div><span className="section-number">01</span><h2>Opportunity brief</h2></div><span>{report.facts.length} findings</span></div>
          <div className="fact-grid">{report.facts.map((fact) => <div className="fact-item" key={fact.id}><span>{fact.label}</span><strong>{fact.value}</strong><div className="fact-meta"><small className={`classification class-${fact.classification.toLowerCase().replace("-", "")}`}>{fact.classification}</small><CitationLinks sourceIds={fact.sourceIds} report={report} /></div></div>)}</div>
        </section>

        <ScoreBreakdown report={report} />
        <VerificationProof report={report} onRun={onRun} />

        <section className="report-section split-evidence">
          <div>
            <div className="section-heading"><div><span className="section-number">04</span><h2>Competition & whitespace</h2></div></div>
            {report.competitionFindings.length ? <ul>{report.competitionFindings.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="empty-copy">No reliable competition data was available. Directions are marked provisional.</p>}
          </div>
          <div>
            <div className="section-heading"><div><span className="section-number">05</span><h2>Risks & open questions</h2></div></div>
            <ul className="risk-list">{report.risks.map((risk) => <li key={risk}><AlertTriangle size={15} />{risk}</li>)}</ul>
            {report.unresolvedQuestions.map((question) => <div className="question" key={question}><CircleHelp size={15} />{question}</div>)}
          </div>
        </section>

        <section className="report-section" id="directions">
          <div className="section-heading"><div><span className="section-number">06</span><h2>Three directions worth building</h2></div><span>Two-week boundaries</span></div>
          <div className="direction-grid">{report.directions.map((direction, index) => <article className="direction-card" key={direction.id}><div className="direction-number">0{index + 1}</div><div className="direction-title"><h3>{direction.name}</h3>{direction.provisional && <span>Provisional</span>}</div><p>{direction.outcome}</p><dl><div><dt>For</dt><dd>{direction.targetUser}</dd></div><div><dt>Problem</dt><dd>{direction.problem}</dd></div><div><dt>Why it fits</dt><dd>{direction.fit}</dd></div><div><dt>Whitespace</dt><dd>{direction.differentiation}</dd></div><div><dt>Demo boundary</dt><dd>{direction.demoBoundary}</dd></div><div><dt>Principal risk</dt><dd>{direction.risk}</dd></div></dl></article>)}</div>
        </section>

        <section className="report-section source-ledger" id="sources">
          <div className="section-heading"><div><span className="section-number">07</span><h2>Complete source ledger</h2></div><span>{report.sources.length} sources</span></div>
          <div className="source-table" role="table" aria-label="Sources"><div className="source-row source-header" role="row"><span>Source</span><span>Authority</span><span>Collected with</span><span>Status</span><span>Retrieved</span></div>{report.sources.map((source) => <div className="source-row" role="row" key={source.id}><div className="source-name">{source.url.startsWith("http") ? <a href={source.url} target="_blank" rel="noreferrer">{source.title}<ExternalLink size={12} /></a> : <strong>{source.title}</strong>}{source.note && <small>{source.note}</small>}</div><span>{source.authority}</span><span className={`collection-mode collection-${source.collectionMode}`}>{sourceModeLabel(source.collectionMode)}</span><span className={`source-status source-${source.status}`}>{source.status}</span><span>{new Date(source.retrievedAt).toLocaleString()}</span></div>)}</div>
        </section>

        <footer className="report-footer"><span>Saved locally on this device.</span><button type="button" onClick={() => onDelete(report.id)}><Trash2 size={14} /> Delete report</button></footer>
      </article>
    </main>
  );
}

function ConsentDialog({ report, onClose, onVerified }: { report: InvestigationReport; onClose: () => void; onVerified: (report: InvestigationReport) => void }) {
  const [approved, setApproved] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const decline = async () => {
    setRunning(true);
    try {
      onVerified(await api.declineVerification(report));
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not record your choice.");
    } finally { setRunning(false); }
  };
  const run = async () => {
    if (!approved) return;
    setRunning(true);
    setError("");
    try {
      onVerified(await api.verify(report));
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Verification could not be completed.");
    } finally { setRunning(false); }
  };

  return <div className="dialog-backdrop"><section className="consent-dialog" role="dialog" aria-modal="true" aria-labelledby="consent-title">
    <button className="dialog-close" type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
    <div className="dialog-icon"><Code2 size={22} /></div>
    <h2 id="consent-title">Run the official quick-start?</h2>
    <p className="dialog-lede">BuildOrSkip found a public repository. Review exactly what will run in a fresh Solari sandbox.</p>
    <div className="repo-identity"><Github size={20} /><div><strong>{report.verification.repository.replace("https://github.com/", "")}</strong><span>{report.verification.revision} · {report.verification.subdirectory}</span></div></div>
    <div className="command-plan"><span>Proposed commands</span>{report.verification.commands.map((command, index) => <div key={command}><b>{index + 1}</b><code>{command}</code></div>)}</div>
    <div className="safety-grid"><div><LockKeyhole size={17} /><span><strong>No user secrets</strong><small>Your local credentials and files are never provided.</small></span></div><div><Clock3 size={17} /><span><strong>Five-minute limit</strong><small>The isolated environment is destroyed after the run.</small></span></div><div><ShieldCheck size={17} /><span><strong>Allowlisted commands</strong><small>Only this server-derived plan can execute.</small></span></div><div><FileText size={17} /><span><strong>Evidence preserved</strong><small>Exit status, logs, revision, and artifacts join the report.</small></span></div></div>
    <label className="consent-check"><input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} /><span><Check size={13} /></span>I understand this executes third-party code in an isolated sandbox.</label>
    {error && <p className="dialog-error" role="alert">{error}</p>}
    <div className="dialog-actions"><button type="button" onClick={decline} disabled={running}>Skip verification</button><button className="approve-button" type="button" onClick={run} disabled={!approved || running}>{running ? <><LoaderCircle className="spin" size={16} /> Running…</> : <>Approve & run <ArrowRight size={15} /></>}</button></div>
  </section></div>;
}

function EditContextDialog({ report, onClose, onSave }: { report: InvestigationReport; onClose: () => void; onSave: (report: InvestigationReport) => void }) {
  const [context, setContext] = useState(report.context);
  const save = () => {
    const dimensions = { ...report.verdict.adjustedDimensions };
    dimensions.timeFit = context.availableDays ? Math.min(95, Math.max(35, 46 + context.availableDays * 3)) : 50;
    const requiredCostIsFree = report.facts.some((fact) => fact.label === "Required cost" && /free|no entry/i.test(fact.value));
    if (typeof context.budget === "number" && requiredCostIsFree) dimensions.costValue = 92;
    const verdict = calculateDecision({
      dimensions,
      criticalFacts: {
        deadline: report.unresolvedQuestions.some((item) => /deadline/i.test(item)) ? { status: "unknown" } : { status: "known", value: "Preserved source finding" },
        eligibility: report.unresolvedQuestions.some((item) => /eligible/i.test(item)) ? { status: "unknown" } : { status: "known", value: "Preserved source finding" },
        requiredCost: report.unresolvedQuestions.some((item) => /cost/i.test(item)) ? { status: "unknown" } : { status: "known", value: 0 }
      },
      constraints: { budget: context.budget, hasPersonalContext: Object.values(context).some(Boolean) },
      hardDisqualifiers: report.verdict.hardDisqualifiers,
      verification: { status: report.verification.status }
    });
    onSave({ ...report, context, verdict, analyzedAt: new Date().toISOString(), scoreEvidence: report.scoreEvidence.map((item) => ({ ...item, score: verdict.adjustedDimensions[item.dimension] })) });
    onClose();
  };
  const field = (key: keyof PersonalContext, label: string, type = "text") => <label>{label}<input type={type} value={context[key] ?? ""} onChange={(event) => setContext((current) => ({ ...current, [key]: type === "number" ? (event.target.value ? Number(event.target.value) : undefined) : event.target.value }))} /></label>;
  return <div className="dialog-backdrop"><section className="edit-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-context-title"><button className="dialog-close" onClick={onClose} aria-label="Close"><X size={18} /></button><h2 id="edit-context-title">Edit your context</h2><p>Source collection stays unchanged. Only the personal-fit dimensions are recalculated.</p><div className="edit-grid">{field("availableDays", "Available days", "number")}{field("budget", "Budget", "number")}{field("skills", "Skills & stack")}{field("location", "Location / eligibility")}</div><div className="dialog-actions"><button onClick={onClose}>Cancel</button><button className="approve-button" onClick={save}>Recalculate verdict</button></div></section></div>;
}

export function App() {
  const store = useMemo(() => createLocalReportStore(window.localStorage), []);
  const [history, setHistory] = useState(() => store.list());
  const [report, setReport] = useState<InvestigationReport | undefined>();
  const [screen, setScreen] = useState<"intake" | "report">("intake");
  const [consentOpen, setConsentOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingIntake, setEditingIntake] = useState<InvestigationReport | undefined>();

  const saveReport = (next: InvestigationReport) => {
    store.save(next);
    setReport(next);
    setHistory(store.list());
    setScreen("report");
  };
  const complete = (next: InvestigationReport) => {
    saveReport(next);
    setEditingIntake(undefined);
    if (next.verification.status === "not-run") setConsentOpen(true);
  };
  const newInvestigation = () => { setScreen("intake"); setEditingIntake(undefined); setConsentOpen(false); };
  const showHistory = () => {
    const next = report ?? history[0];
    if (next) { setReport(next); setScreen("report"); }
  };
  const deleteReport = (id: string) => {
    store.remove(id);
    const nextHistory = store.list();
    setHistory(nextHistory);
    if (report?.id === id) {
      if (nextHistory[0]) setReport(nextHistory[0]);
      else newInvestigation();
    }
  };

  return <div className="app-root">
    <AppHeader onNew={newInvestigation} onHistory={showHistory} />
    {screen === "intake" || !report ? <Intake onComplete={complete} initialReport={editingIntake} /> : <ReportView report={report} history={history} onSelect={(next) => setReport(next)} onNew={newInvestigation} onEdit={() => setEditing(true)} onDelete={deleteReport} onRun={() => setConsentOpen(true)} />}
    {report && consentOpen && <ConsentDialog report={report} onClose={() => setConsentOpen(false)} onVerified={saveReport} />}
    {report && editing && <EditContextDialog report={report} onClose={() => setEditing(false)} onSave={saveReport} />}
  </div>;
}
