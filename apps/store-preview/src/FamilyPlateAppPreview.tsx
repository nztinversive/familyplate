import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";

export const PREVIEW_WIDTH = 886;
export const PREVIEW_HEIGHT = 1920;
export const PREVIEW_FPS = 30;
export const PREVIEW_DURATION_FRAMES = 660;

type Scene = {
  start: number;
  duration: number;
  image: string;
  eyebrow: string;
  title: string;
  body: string;
};

const GREEN = "#25965f";
const DEEP = "#101813";
const CREAM = "#fbfaf7";
const MUTED = "#707a70";

const scenes: Scene[] = [
  {
    start: 120,
    duration: 132,
    image: "01-pantry.png",
    eyebrow: "Pantry first",
    title: "Start with what you have",
    body: "Scan groceries, quick-add staples, and keep dinner ingredients organized.",
  },
  {
    start: 252,
    duration: 132,
    image: "02-tonight.png",
    eyebrow: "Tonight",
    title: "Turn staples into dinner",
    body: "Pick a craving and get practical recipes matched to your kitchen.",
  },
  {
    start: 384,
    duration: 132,
    image: "04-cookbook.png",
    eyebrow: "Cookbook",
    title: "Save the meals that work",
    body: "Keep family favorites with prep time, servings, and pantry-match details.",
  },
  {
    start: 516,
    duration: 132,
    image: "05-grocery.png",
    eyebrow: "Grocery list",
    title: "Shop from the plan",
    body: "Move missing ingredients into a clean list by aisle and category.",
  },
];

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const smooth = (frame: number, input: [number, number], output: [number, number]) =>
  interpolate(frame, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

const imageUrl = (name: string) => staticFile(`screenshots/${name}`);
const iconUrl = staticFile("images/icon.png");

const AppIcon = ({
  size,
  shadow = true,
  style,
}: {
  size: number;
  shadow?: boolean;
  style?: React.CSSProperties;
}) => (
  <Img
    src={iconUrl}
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.22,
      boxShadow: shadow ? "0 18px 48px rgba(16, 24, 19, 0.18)" : undefined,
      ...style,
    }}
  />
);

const ScreenshotLayer = ({
  image,
  opacity,
  scale = 1,
  y = 0,
  blur = 0,
}: {
  image: string;
  opacity: number;
  scale?: number;
  y?: number;
  blur?: number;
}) => (
  <Img
    src={imageUrl(image)}
    style={{
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover",
      opacity,
      transform: `translateY(${y}px) scale(${scale})`,
      filter: blur ? `blur(${blur}px)` : undefined,
    }}
  />
);

const CaptionCard = ({ scene, progress, index }: { scene: Scene; progress: number; index: number }) => {
  const cardY = interpolate(progress, [0, 0.2, 0.82, 1], [52, 0, 0, 36], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const opacity = interpolate(progress, [0, 0.16, 0.84, 1], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: 46,
        right: 46,
        bottom: 392,
        padding: "34px 34px 30px",
        borderRadius: 34,
        color: "white",
        background: "linear-gradient(145deg, rgba(16,24,19,0.98), rgba(21,45,34,0.94))",
        boxShadow: "0 24px 90px rgba(16, 24, 19, 0.28)",
        transform: `translateY(${cardY}px)`,
        opacity,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          borderRadius: 999,
          padding: "10px 20px",
          background: "#dbfbe7",
          color: "#1f744a",
          fontSize: 18,
          fontWeight: 850,
          textTransform: "uppercase",
          letterSpacing: 0,
        }}
      >
        {scene.eyebrow}
      </div>
      <div style={{ marginTop: 24, fontSize: 45, lineHeight: 1.04, fontWeight: 900, letterSpacing: 0 }}>
        {scene.title}
      </div>
      <div style={{ marginTop: 18, fontSize: 27, lineHeight: 1.22, fontWeight: 650, color: "rgba(255,255,255,0.82)" }}>
        {scene.body}
      </div>
      <div style={{ marginTop: 30, height: 8, borderRadius: 999, background: "rgba(255,255,255,0.14)", overflow: "hidden" }}>
        <div
          style={{
            width: `${((index + progress) / scenes.length) * 100}%`,
            height: "100%",
            borderRadius: 999,
            background: "#6ef0a1",
          }}
        />
      </div>
    </div>
  );
};

const ProductScene = ({ scene, index }: { scene: Scene; index: number }) => {
  const frame = useCurrentFrame();
  const local = frame;
  const progress = clamp(local / scene.duration);
  const inOpacity = smooth(local, [0, 18], [0, 1]);
  const outOpacity = smooth(local, [scene.duration - 18, scene.duration], [1, 0]);
  const opacity = Math.min(inOpacity, outOpacity);

  return (
    <AbsoluteFill style={{ opacity, backgroundColor: CREAM }}>
      <ScreenshotLayer image={scene.image} opacity={1} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(251,250,247,0) 0%, rgba(251,250,247,0) 50%, rgba(251,250,247,0.62) 70%, rgba(251,250,247,0.88) 87%, rgba(251,250,247,0) 100%)",
        }}
      />
      <CaptionCard scene={scene} progress={progress} index={index} />
    </AbsoluteFill>
  );
};

const PhoneStack = ({ frame }: { frame: number }) => {
  const first = smooth(frame, [10, 38], [0, 1]);
  const second = smooth(frame, [24, 52], [0, 1]);
  const third = smooth(frame, [38, 66], [0, 1]);
  const phoneStyle: React.CSSProperties = {
    position: "absolute",
    width: 365,
    height: 790,
    borderRadius: 54,
    overflow: "hidden",
    border: "10px solid #111814",
    boxShadow: "0 28px 80px rgba(16,24,19,0.22)",
    background: "#fff",
  };

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div
        style={{
          ...phoneStyle,
          left: 365,
          top: 565,
          transform: `rotate(8deg) translateY(${(1 - third) * 70}px)`,
          opacity: third,
        }}
      >
        <ScreenshotLayer image="05-grocery.png" opacity={1} />
      </div>
      <div
        style={{
          ...phoneStyle,
          left: 85,
          top: 505,
          transform: `rotate(-8deg) translateY(${(1 - second) * 70}px)`,
          opacity: second,
        }}
      >
        <ScreenshotLayer image="02-tonight.png" opacity={1} />
      </div>
      <div
        style={{
          ...phoneStyle,
          left: 255,
          top: 420,
          transform: `translateY(${(1 - first) * 70}px)`,
          opacity: first,
        }}
      >
        <ScreenshotLayer image="01-pantry.png" opacity={1} />
      </div>
    </div>
  );
};

const Intro = () => {
  const frame = useCurrentFrame();
  const titleOpacity = smooth(frame, [6, 34], [0, 1]);
  const titleY = smooth(frame, [6, 34], [26, 0]);
  const fade = interpolate(frame, [100, 120], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: CREAM, opacity: fade, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: 680,
          height: 680,
          right: -260,
          top: -210,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(37,150,95,0.22), rgba(37,150,95,0))",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 56,
          top: 94,
          right: 56,
          transform: `translateY(${titleY}px)`,
          opacity: titleOpacity,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <AppIcon size={78} />
          <div style={{ color: GREEN, fontSize: 27, lineHeight: 1, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0 }}>
            FamilyPlate
          </div>
        </div>
        <div style={{ marginTop: 22, color: DEEP, fontSize: 71, lineHeight: 0.96, fontWeight: 950, letterSpacing: 0 }}>
          Dinner planning from the pantry you already have.
        </div>
        <div style={{ marginTop: 26, color: MUTED, fontSize: 29, lineHeight: 1.22, fontWeight: 650 }}>
          Scan groceries. Get dinner ideas. Save recipes. Shop the missing ingredients.
        </div>
      </div>
      <PhoneStack frame={frame} />
      <div
        style={{
          position: "absolute",
          left: 56,
          right: 56,
          bottom: 82,
          height: 6,
          borderRadius: 999,
          background: "#e7e0d7",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${smooth(frame, [28, 112], [0, 100])}%`,
            height: "100%",
            borderRadius: 999,
            background: GREEN,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

const Outro = () => {
  const frame = useCurrentFrame();
  const local = frame;
  const opacity = smooth(local, [0, 16], [0, 1]);
  const y = smooth(local, [0, 22], [38, 0]);

  return (
    <AbsoluteFill style={{ background: DEEP, opacity, color: "white", justifyContent: "center", padding: 56, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          right: -140,
          top: -120,
          width: 520,
          height: 520,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(110,240,161,0.18), rgba(110,240,161,0))",
        }}
      />
      <div style={{ transform: `translateY(${y}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <AppIcon size={96} />
          <div style={{ color: "#6ef0a1", fontSize: 30, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0 }}>
            FamilyPlate
          </div>
        </div>
        <div style={{ marginTop: 22, fontSize: 72, lineHeight: 0.98, fontWeight: 950, letterSpacing: 0 }}>
          Plan dinner before the day gets loud.
        </div>
        <div style={{ marginTop: 28, color: "rgba(255,255,255,0.74)", fontSize: 30, lineHeight: 1.22, fontWeight: 650 }}>
          AI meal planning for busy households.
        </div>
      </div>
    </AbsoluteFill>
  );
};

const PreviewAudio = () => <Audio src={staticFile("familyplate-preview-audio.wav")} volume={0.82} />;

export const FamilyPlateAppPreview = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: CREAM, fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>
      <PreviewAudio />
      <Intro />
      {scenes.map((scene, index) => (
        <Sequence key={scene.image} from={scene.start} durationInFrames={scene.duration}>
          <ProductScene scene={scene} index={index} />
        </Sequence>
      ))}
      <Sequence from={626}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
};
