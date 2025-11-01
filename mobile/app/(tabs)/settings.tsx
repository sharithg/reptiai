import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedSurface } from "@/components/themed-surface";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/contexts/ThemeContext";

export default function SettingsScreen() {
  const { theme, themeMode, setThemeMode } = useTheme();
  const colors = Colors[theme];
  const { user, signOut, isAuthenticating } = useAuth();
  const initials = user?.username?.[0]?.toUpperCase() ?? "?";
  const joinedLabel = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString()
    : undefined;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={{ color: colors.text }}>
            Settings
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText
            type="subtitle"
            style={{ color: colors.text, marginBottom: Spacing.md }}
          >
            Account
          </ThemedText>

          <ThemedSurface>
            <View style={styles.accountContainer}>
                <View
                  style={[
                    styles.avatarFallback,
                    { backgroundColor: colors.primary + "20" },
                  ]}
                >
                  <ThemedText
                    type="defaultSemiBold"
                    style={{ color: colors.primary }}
                  >
                  {initials}
                  </ThemedText>
                </View>

              <View style={styles.accountDetails}>
                <ThemedText
                  type="defaultSemiBold"
                  style={{ color: colors.text }}
                >
                  {user?.username ?? "Unknown user"}
                </ThemedText>
                <ThemedText style={{ color: colors.textSecondary }}>
                  {user?.role ? user.role.toUpperCase() : "STANDARD USER"}
                </ThemedText>
                {joinedLabel && (
                  <ThemedText style={{ color: colors.textSecondary }}>
                    Joined {joinedLabel}
                  </ThemedText>
                )}
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.signOutButton, { borderColor: colors.border }]}
              onPress={() => signOut()}
              disabled={isAuthenticating}
            >
              <IconSymbol
                name="arrow.backward.circle"
                size={20}
                color={colors.error}
              />
              <ThemedText
                type="defaultSemiBold"
                style={{ color: colors.error }}
              >
                Sign out
              </ThemedText>
            </TouchableOpacity>
          </ThemedSurface>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText
            type="subtitle"
            style={{ color: colors.text, marginBottom: Spacing.md }}
          >
            Appearance
          </ThemedText>

          <ThemedSurface>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <IconSymbol
                  name="paintbrush"
                  size={24}
                  color={colors.primary}
                />
                <View style={styles.settingText}>
                  <ThemedText
                    type="defaultSemiBold"
                    style={{ color: colors.text }}
                  >
                    Theme
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.settingDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Choose your preferred theme
                  </ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.themeOptions}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor:
                      themeMode === "light"
                        ? colors.primary + "15"
                        : colors.backgroundSecondary,
                    borderColor:
                      themeMode === "light" ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setThemeMode("light")}
              >
                <IconSymbol
                  name="sun.max"
                  size={20}
                  color={
                    themeMode === "light"
                      ? colors.primary
                      : theme === "dark"
                      ? colors.textSecondary
                      : colors.iconSecondary
                  }
                />
                <ThemedText
                  style={{
                    color:
                      themeMode === "light"
                        ? colors.primary
                        : colors.textSecondary,
                    fontWeight: themeMode === "light" ? "600" : "400",
                  }}
                >
                  Light
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor:
                      themeMode === "dark"
                        ? colors.primary + "15"
                        : colors.backgroundSecondary,
                    borderColor:
                      themeMode === "dark" ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setThemeMode("dark")}
              >
                <IconSymbol
                  name="moon"
                  size={20}
                  color={
                    themeMode === "dark"
                      ? colors.primary
                      : theme === "dark"
                      ? colors.textSecondary
                      : colors.iconSecondary
                  }
                />
                <ThemedText
                  style={{
                    color:
                      themeMode === "dark"
                        ? colors.primary
                        : colors.textSecondary,
                    fontWeight: themeMode === "dark" ? "600" : "400",
                  }}
                >
                  Dark
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor:
                      themeMode === "system"
                        ? colors.primary + "15"
                        : colors.backgroundSecondary,
                    borderColor:
                      themeMode === "system" ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setThemeMode("system")}
              >
                <IconSymbol
                  name="circle.lefthalf.filled"
                  size={20}
                  color={
                    themeMode === "system"
                      ? colors.primary
                      : theme === "dark"
                      ? colors.textSecondary
                      : colors.iconSecondary
                  }
                />
                <ThemedText
                  style={{
                    color:
                      themeMode === "system"
                        ? colors.primary
                        : colors.textSecondary,
                    fontWeight: themeMode === "system" ? "600" : "400",
                  }}
                >
                  System
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedSurface>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText
            type="subtitle"
            style={{ color: colors.text, marginBottom: Spacing.md }}
          >
            About
          </ThemedText>

          <ThemedSurface>
            <View style={styles.infoRow}>
              <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>
                App Version
              </ThemedText>
              <ThemedText style={{ color: colors.textSecondary }}>
                1.0.0
              </ThemedText>
            </View>

            <View
              style={[styles.divider, { backgroundColor: colors.divider }]}
            />

            <View style={styles.infoRow}>
              <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>
                Current Theme
              </ThemedText>
              <ThemedText style={{ color: colors.textSecondary }}>
                {themeMode === "system"
                  ? `System (${theme})`
                  : themeMode.charAt(0).toUpperCase() + themeMode.slice(1)}
              </ThemedText>
            </View>
          </ThemedSurface>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    marginBottom: Spacing.xl,
    paddingTop: Platform.OS === "ios" ? 60 : Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  accountContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  accountDetails: {
    flex: 1,
    gap: 4,
  },
  signOutButton: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  settingRow: {
    marginBottom: Spacing.md,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  settingText: {
    flex: 1,
    gap: 4,
  },
  settingDescription: {
    fontSize: 14,
  },
  themeOptions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  themeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
});
