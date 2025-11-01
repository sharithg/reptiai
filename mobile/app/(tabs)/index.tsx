import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimalSelector } from "@/components/animal-selector";
import { ThemedSurface } from "@/components/themed-surface";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BorderRadius, Colors, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAnimals } from "@/hooks/use-animals";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { selectedAnimal, isHydrated } = useAnimals();
  const colors = Colors[colorScheme ?? "light"];
  const primaryColor = colors.primary;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AnimalSelector />
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={{ color: colors.text }}>
            Reptile Care
          </ThemedText>
          <ThemedText
            style={[styles.subtitle, { color: colors.textSecondary }]}
          >
            Keep track of your reptile&apos;s health and care routine
          </ThemedText>
        </ThemedView>

        <ThemedSurface tone="elevated" style={styles.activeAnimalCard}>
          {selectedAnimal ? (
            <>
              <ThemedText
                type="defaultSemiBold"
                style={{ color: colors.text }}
              >
                Active Animal
              </ThemedText>
              <ThemedText
                type="title"
                style={{ color: colors.primary, marginTop: Spacing.xs }}
              >
                {selectedAnimal.name}
              </ThemedText>
              {selectedAnimal.species ? (
                <ThemedText style={{ color: colors.textSecondary }}>
                  {selectedAnimal.species}
                </ThemedText>
              ) : null}
              <ThemedText
                style={{ color: colors.textSecondary, marginTop: Spacing.sm }}
              >
                Head to Feeding or Reminders to log care just for this animal.
              </ThemedText>
            </>
          ) : (
            <>
              <ThemedText
                type="defaultSemiBold"
                style={{ color: colors.text }}
              >
                No active animal yet
              </ThemedText>
              <ThemedText
                style={{ color: colors.textSecondary, marginTop: Spacing.xs }}
              >
                {isHydrated
                  ? "Add your first animal above to unlock individual care tracking."
                  : "Loading animal list…"}
              </ThemedText>
            </>
          )}
        </ThemedSurface>

        <ThemedView style={styles.quickActionContainer}>
          <ThemedText
            type="subtitle"
            style={{ color: colors.text, marginBottom: Spacing.md }}
          >
            Quick Actions
          </ThemedText>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/(tabs)/feeding")}
          >
            <ThemedSurface style={styles.actionCard}>
              <View style={styles.actionContent}>
                <View
                  style={[
                    styles.actionIconContainer,
                    { backgroundColor: primaryColor + "15" },
                  ]}
                >
                  <IconSymbol
                    name="fork.knife"
                    size={28}
                    color={primaryColor}
                  />
                </View>
                <View style={styles.actionTextContainer}>
                  <ThemedText
                    type="defaultSemiBold"
                    style={{ color: colors.text }}
                  >
                    Track Feeding
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.actionDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Log your reptile&apos;s feeding schedule
                  </ThemedText>
                </View>
                <IconSymbol
                  name="chevron.right"
                  size={20}
                  color={colors.iconSecondary}
                />
              </View>
            </ThemedSurface>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/(tabs)/reminders")}
          >
            <ThemedSurface style={styles.actionCard}>
              <View style={styles.actionContent}>
                <View
                  style={[
                    styles.actionIconContainer,
                    { backgroundColor: colors.secondary + "15" },
                  ]}
                >
                  <IconSymbol
                    name="checklist"
                    size={28}
                    color={colors.secondary}
                  />
                </View>
                <View style={styles.actionTextContainer}>
                  <ThemedText
                    type="defaultSemiBold"
                    style={{ color: colors.text }}
                  >
                    Reminders & TODOs
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.actionDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Create reminders and track tasks
                  </ThemedText>
                </View>
                <IconSymbol
                  name="chevron.right"
                  size={20}
                  color={colors.iconSecondary}
                />
              </View>
            </ThemedSurface>
          </TouchableOpacity>
        </ThemedView>

        <ThemedSurface tone="elevated" style={styles.infoContainer}>
          <ThemedText
            type="subtitle"
            style={{ color: colors.text, marginBottom: Spacing.sm }}
          >
            Getting Started
          </ThemedText>
          <ThemedText style={{ color: colors.textSecondary, lineHeight: 22 }}>
            Track your reptile&apos;s care with feeding logs and reminders.
            Create TODOs for regular tasks or set reminders with notifications.
          </ThemedText>
        </ThemedSurface>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  activeAnimalCard: {
    marginBottom: Spacing.lg,
  },
  subtitle: {
    marginTop: Spacing.sm,
    fontSize: 16,
  },
  quickActionContainer: {
    marginBottom: Spacing.lg,
  },
  actionCard: {
    marginBottom: Spacing.md,
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  actionTextContainer: {
    flex: 1,
    gap: 4,
  },
  actionDescription: {
    fontSize: 14,
  },
  infoContainer: {
    marginTop: Spacing.sm,
  },
});
