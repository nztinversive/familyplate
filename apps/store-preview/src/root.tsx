import { Composition } from "remotion";
import { FamilyPlateAppPreview, PREVIEW_DURATION_FRAMES, PREVIEW_FPS, PREVIEW_HEIGHT, PREVIEW_WIDTH } from "./FamilyPlateAppPreview";

export const RemotionRoot = () => {
  return (
    <Composition
      id="FamilyPlateAppPreview"
      component={FamilyPlateAppPreview}
      durationInFrames={PREVIEW_DURATION_FRAMES}
      fps={PREVIEW_FPS}
      width={PREVIEW_WIDTH}
      height={PREVIEW_HEIGHT}
    />
  );
};
