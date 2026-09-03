# BuildOrSkip v1 design system

## Visual source of truth

- Intake: `docs/design/intake-concept.png`
- Evidence report: `docs/design/report-concept.png`
- Sandbox consent: `docs/design/consent-concept.png`

The generated concepts define composition and visual tone. Product facts, dates, scores,
repository identities, and execution results shown in the final product must come from the
application data rather than being copied from the concept images.

## Direction

BuildOrSkip is an editorial developer tool rather than a marketing site. Screens use a true
white canvas, generous breathing room, ruled sections, restrained colour, and almost no
shadow. Display headlines use a characterful serif; controls and evidence use a compact sans
serif. Cobalt marks actions and selected evidence, mint marks verified evidence, and amber
marks unresolved facts.

## Tokens

| Role | Value |
| --- | --- |
| Canvas | `#ffffff` |
| Soft canvas | `#f7f8fa` |
| Ink | `#17181c` |
| Muted ink | `#686b73` |
| Rule | `#dedfe4` |
| Strong rule | `#bfc2ca` |
| Cobalt | `#2457e6` |
| Cobalt wash | `#edf2ff` |
| Mint | `#147a55` / `#e8f6ef` |
| Amber | `#9a6100` / `#fff6dc` |
| Red | `#b33a38` / `#fff0ef` |
| Radius | `8px`, `12px` |
| Display | `Newsreader`, Georgia fallback |
| UI | `Inter`, system sans-serif fallback |
| Mono | `IBM Plex Mono`, system monospace fallback |

## Layout

- Maximum working width: 1440px.
- Header: 72px, simple wordmark, primary navigation, local-only status.
- Intake: 12-column split with a seven-column input workspace and five-column investigation
  rail.
- Report: 220px report-history rail plus a fluid evidence document.
- Evidence sections remain open and ruled; card containers are reserved for distinct actions,
  verification output, and the three project directions.
- Mobile collapses to one column, moves history into a top selector, and keeps the verdict and
  primary actions first.

## Component inventory

- `AppShell`, `Wordmark`, `LocalOnlyBadge`
- `OpportunityForm`, `ContextFields`, `AttachmentDropzone`
- `InvestigationProgress`, `SourceStatus`
- `ConsentDialog`, `CommandList`, `SafetyLimits`
- `VerdictHero`, `ScoreBreakdown`, `FactSheet`
- `VerificationProof`, `TerminalLog`
- `RiskList`, `DirectionCard`, `SourceLedger`
- `ReportHistory`, `ReportActions`, `EmptyState`

Icons are sparse 1.75px Lucide outlines. Motion is limited to progress changes, dialog entry,
score transitions, and subtle hover/focus feedback. All status meaning is duplicated in text.
