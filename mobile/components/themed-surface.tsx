import { forwardRef } from "react";
import { View, type ViewProps } from "react-native";

import { BorderRadius, Colors, Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";

type SurfaceTone = "default" | "secondary" | "elevated" | "overlay";
type SurfaceElevation = keyof typeof Shadows | "none";

export type ThemedSurfaceProps = ViewProps & {
  tone?: SurfaceTone;
  elevation?: SurfaceElevation;
  border?: boolean;
  padding?: number | null;
  radius?: keyof typeof BorderRadius | number;
  borderColor?: string;
  backgroundColor?: string;
};

export const ThemedSurface = forwardRef<View, ThemedSurfaceProps>(
  (
    {
      tone = "elevated",
      elevation = "sm",
      border = true,
      padding = Spacing.md,
      radius = "md",
      borderColor,
      backgroundColor,
      style,
      ...rest
    },
    ref
  ) => {
    const { theme } = useTheme();
    const colors = Colors[theme];

    const toneBackground = (() => {
      if (backgroundColor) {
        return backgroundColor;
      }

      switch (tone) {
        case "secondary":
          return colors.backgroundSecondary;
        case "default":
          return colors.background;
        case "overlay":
          return colors.backgroundOverlay;
        case "elevated":
        default:
          return colors.backgroundElevated;
      }
    })();

    const radiusValue =
      typeof radius === "number"
        ? radius
        : BorderRadius[radius] ?? BorderRadius.md;

    const paddingStyle =
      padding === null
        ? undefined
        : { padding: typeof padding === "number" ? padding : Spacing.md };

    const elevationStyle =
      elevation === "none" ? undefined : Shadows[elevation] ?? undefined;

    return (
      <View
        ref={ref}
        style={[
          {
            backgroundColor: toneBackground,
            borderRadius: radiusValue,
          },
          paddingStyle,
          border
            ? {
                borderWidth: 1,
                borderColor: borderColor ?? colors.border,
              }
            : null,
          elevationStyle,
          style,
        ]}
        {...rest}
      />
    );
  }
);

ThemedSurface.displayName = "ThemedSurface";
