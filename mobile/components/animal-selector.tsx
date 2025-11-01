import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedSurface } from "@/components/themed-surface";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BorderRadius, Colors, Shadows, Spacing } from "@/constants/theme";
import { useAnimals } from "@/hooks/use-animals";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ApiError } from "@/lib/api";

export function AnimalSelector() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const primaryColor = colors.primary;

  const {
    animals,
    selectedAnimal,
    isHydrated,
    isFetching,
    isCreating,
    error,
    selectAnimal,
    createAnimal,
    refreshAnimals,
  } = useAnimals();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isEmpty = useMemo(() => animals.length === 0, [animals.length]);

  const handleOpen = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  const handleSelect = useCallback(
    async (animalId: string) => {
      try {
        await selectAnimal(animalId);
        setIsModalVisible(false);
      } catch (selectionError) {
        Alert.alert(
          "Unable to select animal",
          selectionError instanceof Error
            ? selectionError.message
            : "Please try again."
        );
      }
    },
    [selectAnimal]
  );

  const handleCreate = useCallback(async () => {
    const trimmedName = name.trim();
    const trimmedSpecies = species.trim();

    if (!trimmedName) {
      Alert.alert("Name required", "Please enter a name for your animal.");
      return;
    }

    try {
      await createAnimal({
        name: trimmedName,
        species: trimmedSpecies.length > 0 ? trimmedSpecies : undefined,
      });
      setName("");
      setSpecies("");
      setIsModalVisible(false);
    } catch (createError) {
      const message =
        createError instanceof ApiError
          ? createError.message
          : createError instanceof Error
          ? createError.message
          : "Unable to create animal";
      Alert.alert("Create failed", message);
    }
  }, [createAnimal, name, species]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshAnimals();
    } catch (refreshError) {
      const message =
        refreshError instanceof ApiError
          ? refreshError.message
          : refreshError instanceof Error
          ? refreshError.message
          : "Unable to refresh animals";
      Alert.alert("Refresh failed", message);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshAnimals]);

  const activeLabel = selectedAnimal
    ? selectedAnimal.name
    : "Add your first animal";
  const subtitleLabel =
    selectedAnimal?.species ??
    (selectedAnimal ? undefined : "Tap to manage animals");

  return (
    <>
      <ThemedSurface
        style={[styles.selectorCard, { borderColor: colors.border }]}
        elevation="md"
        padding={null}
        border={false}
      >
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.8}
          style={styles.selectorContent}
          onPress={handleOpen}
        >
          <View
            style={[
              styles.selectorIcon,
              { backgroundColor: primaryColor + "15" },
            ]}
          >
            <IconSymbol name="tortoise" size={26} color={primaryColor} />
          </View>
          <View style={styles.selectorTextContainer}>
            <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>
              {activeLabel}
            </ThemedText>
            {subtitleLabel ? (
              <ThemedText style={{ color: colors.textSecondary }}>
                {subtitleLabel}
              </ThemedText>
            ) : null}
            {!isHydrated ? (
              <View style={styles.inlineStatus}>
                <ActivityIndicator size="small" color={primaryColor} />
                <ThemedText
                  style={[styles.statusText, { color: colors.textSecondary }]}
                >
                  Loading animals…
                </ThemedText>
              </View>
            ) : null}
            {error ? (
              <ThemedText style={[styles.errorText, { color: colors.error }]}>
                {error}
              </ThemedText>
            ) : null}
          </View>
          <IconSymbol
            name="chevron.right"
            size={18}
            color={colors.iconSecondary}
          />
        </TouchableOpacity>
      </ThemedSurface>

      <Modal
        animationType="slide"
        visible={isModalVisible}
        onRequestClose={handleClose}
        transparent
      >
        <View style={styles.modalBackdrop}>
          <ThemedSurface
            style={styles.modalContainer}
            padding={Spacing.lg}
            elevation="lg"
          >
            <View style={styles.modalHeader}>
              <ThemedText type="title" style={{ color: colors.text }}>
                Manage Animals
              </ThemedText>
              <TouchableOpacity
                onPress={handleClose}
                accessibilityRole="button"
              >
                <IconSymbol
                  name="xmark"
                  size={22}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.refreshButton, { borderColor: colors.border }]}
                onPress={handleRefresh}
                disabled={isRefreshing || isFetching}
              >
                {isRefreshing || isFetching ? (
                  <ActivityIndicator size="small" color={primaryColor} />
                ) : (
                  <IconSymbol
                    name="arrow.clockwise"
                    size={18}
                    color={primaryColor}
                  />
                )}
                <ThemedText style={{ color: primaryColor, fontWeight: "600" }}>
                  Refresh
                </ThemedText>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.animalList}
              contentContainerStyle={{ gap: Spacing.sm }}
            >
              {isFetching && animals.length === 0 ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={primaryColor} />
                  <ThemedText style={{ color: colors.textSecondary }}>
                    Loading animals…
                  </ThemedText>
                </View>
              ) : isEmpty ? (
                <ThemedView style={styles.emptyContainer}>
                  <IconSymbol
                    name="plus.circle"
                    size={36}
                    color={colors.iconSecondary}
                  />
                  <ThemedText
                    style={{ color: colors.textSecondary, textAlign: "center" }}
                  >
                    Add your first animal to start logging individual care
                    history.
                  </ThemedText>
                </ThemedView>
              ) : (
                animals.map((item) => {
                  const isActive = selectedAnimal?.id === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.animalItem,
                        {
                          borderColor: isActive ? primaryColor : colors.border,
                          backgroundColor: isActive
                            ? primaryColor + "10"
                            : colors.backgroundSecondary,
                        },
                        Shadows.sm,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => handleSelect(item.id)}
                    >
                      <View style={styles.animalInfo}>
                        <ThemedText
                          type="defaultSemiBold"
                          style={{ color: colors.text }}
                        >
                          {item.name}
                        </ThemedText>
                        {item.species ? (
                          <ThemedText style={{ color: colors.textSecondary }}>
                            {item.species}
                          </ThemedText>
                        ) : null}
                      </View>
                      {isActive ? (
                        <IconSymbol
                          name="checkmark.circle.fill"
                          size={20}
                          color={primaryColor}
                        />
                      ) : (
                        <IconSymbol
                          name="chevron.right"
                          size={16}
                          color={colors.iconSecondary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View
              style={[styles.formContainer, { borderTopColor: colors.divider }]}
            >
              <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>
                Add Animal
              </ThemedText>
              <View style={styles.inputGroup}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: colors.border,
                      color: colors.text,
                      backgroundColor: colors.backgroundSecondary,
                    },
                  ]}
                  placeholder="Name"
                  placeholderTextColor={colors.textTertiary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: colors.border,
                      color: colors.text,
                      backgroundColor: colors.backgroundSecondary,
                    },
                  ]}
                  placeholder="Species (optional)"
                  placeholderTextColor={colors.textTertiary}
                  value={species}
                  onChangeText={setSpecies}
                  autoCapitalize="words"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.createButton,
                  { backgroundColor: primaryColor, ...Shadows.sm },
                ]}
                activeOpacity={0.8}
                onPress={handleCreate}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.createButtonText}>Save</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </ThemedSurface>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selectorCard: {
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
  },
  selectorContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
  },
  selectorIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  selectorTextContainer: {
    flex: 1,
    gap: 4,
  },
  inlineStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  statusText: {
    fontSize: 13,
  },
  errorText: {
    fontSize: 13,
    marginTop: Spacing.xs,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: Spacing.lg,
  },
  modalContainer: {
    borderRadius: BorderRadius.lg,
    maxHeight: "85%",
    gap: Spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  animalList: {
    flexGrow: 0,
    maxHeight: 260,
  },
  loadingContainer: {
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  emptyContainer: {
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  animalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  animalInfo: {
    gap: 4,
  },
  formContainer: {
    paddingTop: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: 16,
  },
  createButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
