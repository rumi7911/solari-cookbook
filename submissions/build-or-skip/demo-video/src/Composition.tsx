import {fade} from "@remotion/transitions/fade";
import {TransitionSeries, linearTiming} from "@remotion/transitions";
import {Audio} from "@remotion/media";
import {
  AbsoluteFill,
  CanvasImage,
  Composition,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const FPS = 30;
const TRANSITION = 15;
const VOICEOVER_FRAMES = Math.ceil(44.6 * FPS);

const colors = {
  ink: "#17181c",
  blue: "#2457ef",
  green: "#0a7a4b",
};

type ProductSceneProps = {
  image: string;
  kicker: string;
  title: string;
  detail: string;
  accent?: string;
};

const BrandMark = ({inverse = false}: {inverse?: boolean}) => (
  <div className="brand-mark" style={{color: inverse ? "white" : colors.ink}}>
    <span style={{background: inverse ? "white" : colors.ink, color: inverse ? colors.ink : "white"}}>→</span>
    BuildOrSkip
  </div>
);

const Progress = ({index, inverse = false}: {index: number; inverse?: boolean}) => (
  <div className="progress" style={{color: inverse ? "rgba(255,255,255,.74)" : "#6c707b"}}>
    <strong>0{index}</strong>
    <div style={{background: inverse ? "rgba(255,255,255,.2)" : "#d9dce5"}}>
      <i style={{width: `${(index / 6) * 100}%`, background: inverse ? "white" : colors.blue}} />
    </div>
    <span>06</span>
  </div>
);

const TitleScene = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const enter = interpolate(frame, [0, 24], [28, 0], {extrapolateRight: "clamp"});
  const fadeOut = interpolate(frame, [durationInFrames - 18, durationInFrames], [1, 0], {extrapolateLeft: "clamp"});
  const lineWidth = interpolate(frame, [8, 42], [0, 100], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});

  return (
    <AbsoluteFill style={{background: colors.ink, color: "white", opacity: fadeOut, padding: 92}}>
      <BrandMark inverse />
      <div className="title-orb" style={{transform: `translate(${frame * 0.18}px, ${frame * -0.08}px)`}} />
      <div className="title-copy" style={{transform: `translateY(${enter}px)`}}>
        <div className="kicker inverse">Opportunity intelligence for solo builders</div>
        <h1>Should this opportunity get your next two weeks?</h1>
        <p>BuildOrSkip turns scattered rules, repositories, and risks into an evidence-backed portfolio decision.</p>
        <div className="title-line"><i style={{width: `${lineWidth}%`}} /></div>
      </div>
      <div className="title-chip">Built with Solari Browser + Sandbox</div>
    </AbsoluteFill>
  );
};

const ProductScene = ({image, kicker, title, detail, accent = colors.blue}: ProductSceneProps) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const scale = interpolate(frame, [0, durationInFrames], [1.015, 1.055]);
  const captionY = interpolate(frame, [0, 22], [42, 0], {extrapolateRight: "clamp"});
  const captionOpacity = interpolate(frame, [0, 16], [0, 1], {extrapolateRight: "clamp"});

  return (
    <AbsoluteFill className="product-scene">
      <div className="screen-frame" style={{transform: `scale(${scale})`}}>
        <CanvasImage src={staticFile(`captures/${image}`)} width={1660} height={934} fit="cover" />
      </div>
      <div className="screen-shade" />
      <div className="screen-brand"><BrandMark /></div>
      <div className="caption-card" style={{transform: `translateY(${captionY}px)`, opacity: captionOpacity}}>
        <div className="caption-accent" style={{background: accent}} />
        <div>
          <span>{kicker}</span>
          <h2>{title}</h2>
          <p>{detail}</p>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ClosingScene = () => {
  const frame = useCurrentFrame();
  const rise = interpolate(frame, [0, 24], [34, 0], {extrapolateRight: "clamp"});
  const badge = interpolate(frame, [20, 48], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});

  return (
    <AbsoluteFill className="closing-scene">
      <BrandMark inverse />
      <Progress index={6} inverse />
      <div className="closing-copy" style={{transform: `translateY(${rise}px)`}}>
        <div className="kicker inverse">From opportunity hype to build evidence</div>
        <h2>Build the project.<br />Keep the receipts.</h2>
        <p>A strong portfolio story: cited research, explicit consent, executable proof, and a decision you can defend.</p>
        <div className="closing-url">github.com/rumi7911/solari-cookbook</div>
      </div>
      <div className="disclosure" style={{opacity: badge}}>
        <span>SAFE DEMO REPLAY SHOWN</span>
        <p>Live Solari Browser and Sandbox paths were validated separately. No API key appears in this recording.</p>
      </div>
    </AbsoluteFill>
  );
};

const scenes = [
  {duration: 150, component: <TitleScene />},
  {duration: 180, component: <ProductScene image="01-intake.png" kicker="01 · Minimal intake" title="Start with one public URL." detail="Personal constraints and supporting files are optional—useful value comes first." />},
  {duration: 210, component: <ProductScene image="03-consent-approved.png" kicker="02 · Consent-gated execution" title="Review every command before it runs." detail="Repository, revision, limits, and secret policy are visible before sandbox approval." accent="#e2a82d" />},
  {duration: 195, component: <ProductScene image="04-verdict.png" kicker="03 · Evidence-backed verdict" title="Build, Skip, or Investigate Further." detail="A portfolio-first score, confidence level, facts, and citations make the recommendation auditable." accent={colors.green} />},
  {duration: 225, component: <ProductScene image="06-verification.png" kicker="04 · Technical proof" title="Feasibility is tested—not guessed." detail="Pinned revision, runtime mode, duration, artifacts, and logs are preserved in the report." accent="#e2a82d" />},
  {duration: 195, component: <ProductScene image="07-directions.png" kicker="05 · Competitive whitespace" title="Three differentiated two-week directions." detail="Each idea names its user, outcome, demo boundary, differentiation, and principal risk." accent="#8a49e8" />},
  {duration: 180, component: <ProductScene image="08-sources.png" kicker="06 · Complete evidence ledger" title="Every critical claim keeps its source." detail="Authority, collection method, status, and retrieval time stay attached to the decision." />},
  {duration: 180, component: <ClosingScene />},
];

const TOTAL_DURATION = scenes.reduce((total, scene) => total + scene.duration, 0) - TRANSITION * (scenes.length - 1);

export const ShowcaseVideo = () => (
  <>
    <TransitionSeries>
      {scenes.flatMap((scene, index) => {
        const sequence = (
          <TransitionSeries.Sequence durationInFrames={scene.duration} key={`scene-${index}`}>
            {scene.component}
          </TransitionSeries.Sequence>
        );
        if (index === scenes.length - 1) return [sequence];
        return [
          sequence,
          <TransitionSeries.Transition
            key={`transition-${index}`}
            presentation={fade()}
            timing={linearTiming({durationInFrames: TRANSITION})}
          />,
        ];
      })}
    </TransitionSeries>
    <Audio
      src={staticFile("audio/buildorskip-voiceover-bm-george.wav")}
      volume={(frame) => interpolate(
        frame,
        [0, 8, VOICEOVER_FRAMES - 18, VOICEOVER_FRAMES],
        [0, 1, 1, 0],
        {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
      )}
    />
  </>
);

export const MyComposition = () => (
  <Composition
    id="BuildOrSkipShowcase"
    component={ShowcaseVideo}
    durationInFrames={TOTAL_DURATION}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
