import { ThemedSurface } from "@/components/themed-surface";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BorderRadius, Colors, Shadows, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, ApiError } from "@/lib/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type ReminderResponse = {
  id: string;
  title: string;
  notes: string | null;
  isReminder: boolean;
  dueDate: string | null;
  isCompleted: boolean;
  notificationId: string | null;
  createdAt: string;
  updatedAt: string;
};

interface Reminder {
  id: string;
  title: string;
  notes?: string;
  isReminder: boolean;
  dueDate?: Date;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  notificationId?: string;
}

function toReminder(record: ReminderResponse): Reminder {
  return {
    id: record.id,
    title: record.title,
    notes: record.notes ?? undefined,
    isReminder: record.isReminder,
    dueDate: record.dueDate ? new Date(record.dueDate) : undefined,
    isCompleted: record.isCompleted,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
    notificationId: record.notificationId ?? undefined,
  };
}

export default function RemindersScreen() {
  const colorScheme = useColorScheme();
  const { session } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [isReminder, setIsReminder] = useState(false);
  const [dueDate, setDueDate] = useState(new Date());
  const [activePicker, setActivePicker] = useState<"date" | "time" | null>(
    null
  );
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = session?.token ?? null;

  const loadReminders = useCallback(async () => {
    if (!token) {
      setReminders([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest<ReminderResponse[]>("/reminders", {
        method: "GET",
        token,
      });

      const nextReminders = response.map(toReminder);
      setReminders(nextReminders);
    } catch (error) {
      console.error("Failed to load reminders", error);
      Alert.alert("Unable to load reminders", "Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const registerForPushNotificationsAsync = async () => {
    // Set up notification channel for Android
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    // Request permissions for local notifications (works in Expo Go)
    if (Device.isDevice) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please enable notifications in settings"
        );
        return null;
      }

      // Try to get push token, but don't fail if it's not available (Expo Go limitation)
      try {
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: undefined, // Let it try to infer, but handle error gracefully
        });
        return token?.data;
      } catch (error: any) {
        // In Expo Go, push tokens aren't available, but local notifications still work
        if (error?.message?.includes("projectId")) {
          console.log(
            "Push notifications require a development build. Local notifications will still work."
          );
          return null;
        }
        throw error;
      }
    } else {
      console.log("Notifications require a physical device");
    }

    return null;
  };

  const scheduleNotification = async (
    reminderId: string,
    title: string,
    date: Date,
    reminderNotes?: string
  ) => {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Reminder: " + title,
          body: reminderNotes || "Time to take care of your reptile!",
          sound: true,
          data: { reminderId },
        },
        trigger: date.getTime() > Date.now() ? (date as any) : null,
      });
      return notificationId;
    } catch (error) {
      console.error("Error scheduling notification:", error);
      return null;
    }
  };

  const cancelNotification = async (notificationId: string) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error("Error canceling notification:", error);
    }
  };

  const addReminder = useCallback(async () => {
    if (!token) {
      Alert.alert("Not authenticated", "Sign in to create reminders.");
      return;
    }

    if (!title.trim()) {
      Alert.alert("Required Field", "Please enter a title");
      return;
    }

    if (isReminder && (!dueDate || dueDate <= new Date())) {
      Alert.alert("Invalid Date", "Please select a future date and time");
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedNotes = notes.trim();

    setIsSubmitting(true);
    try {
      const payload = await apiRequest<ReminderResponse>("/reminders", {
        method: "POST",
        token,
        body: {
          title: trimmedTitle,
          notes: trimmedNotes ? trimmedNotes : undefined,
          isReminder,
          dueDate: isReminder ? dueDate.toISOString() : undefined,
        },
      });

      let created = toReminder(payload);

      if (
        created.isReminder &&
        created.dueDate &&
        created.dueDate.getTime() > Date.now()
      ) {
        const notificationId = await scheduleNotification(
          created.id,
          created.title,
          created.dueDate,
          created.notes
        );

        if (notificationId) {
          created = { ...created, notificationId };

          try {
            const updatedPayload = await apiRequest<ReminderResponse>(
              `/reminders/${created.id}`,
              {
                method: "PATCH",
                token,
                body: { notificationId },
              }
            );
            created = { ...toReminder(updatedPayload), notificationId };
          } catch (error) {
            console.warn("Failed to persist notification id", error);
          }
        }
      }

      setReminders((current) => [created, ...current]);
      setTitle("");
      setNotes("");
      setIsReminder(false);
      setDueDate(new Date());
      setShowForm(false);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to save reminder. Please try again.";
      Alert.alert("Failed to save reminder", message);
    } finally {
      setIsSubmitting(false);
    }
  }, [dueDate, isReminder, notes, title, token]);

  const toggleComplete = useCallback(
    async (id: string) => {
      if (!token) {
        Alert.alert("Not authenticated", "Sign in to update reminders.");
        return;
      }

      const target = reminders.find((reminder) => reminder.id === id);
      if (!target) {
        return;
      }

      const nextCompleted = !target.isCompleted;
      let nextNotificationId = target.notificationId;
      let scheduledNotificationId: string | undefined;

      if (nextCompleted) {
        if (target.notificationId) {
          await cancelNotification(target.notificationId);
          nextNotificationId = undefined;
        }
      } else if (
        target.isReminder &&
        target.dueDate &&
        target.dueDate.getTime() > Date.now()
      ) {
        scheduledNotificationId = await scheduleNotification(
          target.id,
          target.title,
          target.dueDate,
          target.notes
        );

        if (scheduledNotificationId) {
          nextNotificationId = scheduledNotificationId;
        }
      }

      try {
        const payload = await apiRequest<ReminderResponse>(`/reminders/${id}`, {
          method: "PATCH",
          token,
          body: {
            isCompleted: nextCompleted,
            notificationId: nextNotificationId ?? null,
          },
        });

        const updated = toReminder(payload);

        setReminders((current) =>
          current.map((reminder) =>
            reminder.id === id
              ? { ...updated, notificationId: nextNotificationId ?? undefined }
              : reminder
          )
        );
      } catch (error) {
        if (scheduledNotificationId) {
          await cancelNotification(scheduledNotificationId);
        }

        const message =
          error instanceof ApiError
            ? error.message
            : "Unable to update reminder. Please try again.";
        Alert.alert("Update failed", message);
        loadReminders();
      }
    },
    [loadReminders, reminders, token]
  );

  const deleteReminder = useCallback(
    (id: string) => {
      if (!token) {
        Alert.alert("Not authenticated", "Sign in to delete reminders.");
        return;
      }

      const target = reminders.find((reminder) => reminder.id === id);

      Alert.alert(
        "Delete Reminder",
        "Are you sure you want to delete this reminder?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              if (target?.notificationId) {
                await cancelNotification(target.notificationId);
              }

              try {
                await apiRequest<{ success: boolean }>(`/reminders/${id}`, {
                  method: "DELETE",
                  token,
                });

                setReminders((current) =>
                  current.filter((reminder) => reminder.id !== id)
                );
              } catch (error) {
                const message =
                  error instanceof ApiError
                    ? error.message
                    : "Unable to delete reminder. Please try again.";
                Alert.alert("Delete failed", message);
                loadReminders();
              }
            },
          },
        ]
      );
    },
    [loadReminders, reminders, token]
  );

  const filteredReminders = useMemo(() => {
    return reminders.filter((reminder) => {
      if (filter === "active") return !reminder.isCompleted;
      if (filter === "completed") return reminder.isCompleted;
      return true;
    });
  }, [filter, reminders]);

  const colors = Colors[colorScheme ?? "light"];
  const primaryColor = colors.primary;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={{ color: colors.text }}>
            Reminders & TODOs
          </ThemedText>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.addButton,
              { backgroundColor: primaryColor, ...Shadows.sm },
            ]}
            onPress={() => setShowForm(!showForm)}
          >
            <IconSymbol
              name={showForm ? "xmark" : "plus"}
              size={22}
              color="#fff"
            />
          </TouchableOpacity>
        </ThemedView>

        {showForm && (
          <ThemedSurface elevation="md" style={styles.form}>
            <ThemedText
              type="subtitle"
              style={[styles.formTitle, { color: colors.text }]}
            >
              Add New {isReminder ? "Reminder" : "TODO"}
            </ThemedText>

            <ThemedText style={[styles.label, { color: colors.text }]}>
              Title *
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: colors.backgroundSecondary,
                },
              ]}
              placeholder="e.g., Feed snake, Clean enclosure"
              placeholderTextColor={colors.textTertiary}
              value={title}
              onChangeText={setTitle}
            />

            <ThemedText style={[styles.label, { color: colors.text }]}>
              Notes (Optional)
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: colors.backgroundSecondary,
                },
              ]}
              placeholder="Additional details..."
              placeholderTextColor={colors.textTertiary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.switchContainer}>
              <View style={styles.switchLabel}>
                <IconSymbol name="bell" size={20} color={primaryColor} />
                <ThemedText style={[styles.switchText, { color: colors.text }]}>
                  Set as Reminder
                </ThemedText>
              </View>
              <Switch
                value={isReminder}
                onValueChange={setIsReminder}
                trackColor={{ false: "#767577", true: primaryColor + "80" }}
                thumbColor={isReminder ? primaryColor : "#f4f3f4"}
              />
            </View>

            {isReminder && (
              <View style={styles.dateTimeContainer}>
                <ThemedText style={[styles.label, { color: colors.text }]}>
                  Date & Time
                </ThemedText>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[
                    styles.dateButton,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.pressed,
                    },
                  ]}
                  onPress={() => setActivePicker("date")}
                >
                  <IconSymbol name="calendar" size={20} color={primaryColor} />
                  <ThemedText style={[styles.dateText, { color: colors.text }]}>
                    {dueDate.toLocaleDateString()}
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[
                    styles.dateButton,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.pressed,
                    },
                  ]}
                  onPress={() => setActivePicker("time")}
                >
                  <IconSymbol name="clock" size={20} color={primaryColor} />
                  <ThemedText style={[styles.dateText, { color: colors.text }]}>
                    {dueDate.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.submitButton,
                { backgroundColor: primaryColor, ...Shadows.sm },
              ]}
              onPress={addReminder}
              disabled={isSubmitting}
            >
              <ThemedText style={styles.submitButtonText}>
                {isSubmitting
                  ? "Saving…"
                  : `Add ${isReminder ? "Reminder" : "TODO"}`}
              </ThemedText>
            </TouchableOpacity>
          </ThemedSurface>
        )}

        <Modal
          transparent
          animationType="fade"
          visible={activePicker !== null}
          onRequestClose={() => setActivePicker(null)}
        >
          <View style={styles.pickerBackdrop}>
            <ThemedSurface style={styles.pickerContainer} padding={Spacing.lg}>
              <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>
                Select {activePicker === "date" ? "Date" : "Time"}
              </ThemedText>
              <DateTimePicker
                value={dueDate}
                mode={activePicker === "date" ? "date" : "time"}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                minimumDate={activePicker === "date" ? new Date() : undefined}
                onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                  if (event.type === "dismissed") {
                    if (Platform.OS !== "ios") {
                      setActivePicker(null);
                    }
                    return;
                  }

                  if (!selectedDate) {
                    return;
                  }

                  setDueDate((current) => {
                    const updated = new Date(current);
                    if (activePicker === "date") {
                      updated.setFullYear(
                        selectedDate.getFullYear(),
                        selectedDate.getMonth(),
                        selectedDate.getDate()
                      );
                    } else {
                      updated.setHours(selectedDate.getHours());
                      updated.setMinutes(selectedDate.getMinutes());
                      updated.setSeconds(0);
                    }
                    return updated;
                  });

                  if (Platform.OS !== "ios") {
                    setActivePicker(null);
                  }
                }}
                themeVariant={colorScheme}
              />
              {Platform.OS === "ios" && (
                <View style={styles.pickerActions}>
                  <TouchableOpacity
                    style={[
                      styles.pickerButton,
                      { borderColor: colors.border },
                    ]}
                    onPress={() => setActivePicker(null)}
                  >
                    <ThemedText style={{ color: colors.text }}>Done</ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            </ThemedSurface>
          </View>
        </Modal>

        <ThemedView style={styles.filterContainer}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.filterButton,
              {
                borderColor: colors.border,
                backgroundColor:
                  filter === "all"
                    ? primaryColor + "15"
                    : colors.backgroundElevated,
              },
              filter === "all" && { borderColor: primaryColor },
            ]}
            onPress={() => setFilter("all")}
          >
            <ThemedText
              style={{ color: filter === "all" ? primaryColor : colors.text }}
            >
              All
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.filterButton,
              {
                borderColor: colors.border,
                backgroundColor:
                  filter === "active"
                    ? primaryColor + "15"
                    : colors.backgroundElevated,
              },
              filter === "active" && { borderColor: primaryColor },
            ]}
            onPress={() => setFilter("active")}
          >
            <ThemedText
              style={{
                color: filter === "active" ? primaryColor : colors.text,
              }}
            >
              Active
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.filterButton,
              {
                borderColor: colors.border,
                backgroundColor:
                  filter === "completed"
                    ? primaryColor + "15"
                    : colors.backgroundElevated,
              },
              filter === "completed" && { borderColor: primaryColor },
            ]}
            onPress={() => setFilter("completed")}
          >
            <ThemedText
              style={{
                color: filter === "completed" ? primaryColor : colors.text,
              }}
            >
              Completed
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        <ThemedView style={styles.listContainer}>
          {isLoading ? (
            <ThemedView style={styles.emptyState}>
              <IconSymbol
                name="arrow.triangle.2.circlepath"
                size={36}
                color={colors.iconSecondary}
              />
              <ThemedText
                style={[styles.emptyText, { color: colors.textSecondary }]}
              >
                Loading reminders…
              </ThemedText>
            </ThemedView>
          ) : filteredReminders.length === 0 ? (
            <ThemedView style={styles.emptyState}>
              <IconSymbol
                name="checklist"
                size={48}
                color={colors.iconSecondary}
              />
              <ThemedText
                style={[styles.emptyText, { color: colors.textSecondary }]}
              >
                {filter === "completed"
                  ? "No completed items yet"
                  : "No reminders or TODOs yet. Tap the + button to add one!"}
              </ThemedText>
            </ThemedView>
          ) : (
            filteredReminders.map((reminder) => (
              <ThemedSurface
                key={reminder.id}
                style={[
                  styles.reminderCard,
                  reminder.isCompleted && styles.reminderCardCompleted,
                ]}
              >
                <View style={styles.cardHeader}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.checkboxContainer}
                    onPress={() => toggleComplete(reminder.id)}
                  >
                    <IconSymbol
                      name={
                        reminder.isCompleted
                          ? "checkmark.circle.fill"
                          : "circle"
                      }
                      size={24}
                      color={
                        reminder.isCompleted ? colors.success : primaryColor
                      }
                    />
                    <View style={styles.reminderInfo}>
                      <ThemedText
                        type="defaultSemiBold"
                        style={[
                          styles.reminderTitle,
                          { color: colors.text },
                          reminder.isCompleted && styles.completedText,
                        ]}
                      >
                        {reminder.title}
                      </ThemedText>
                      {reminder.isReminder && reminder.dueDate && (
                        <View style={styles.reminderMeta}>
                          <IconSymbol
                            name="bell"
                            size={14}
                            color={primaryColor}
                          />
                          <ThemedText
                            style={[
                              styles.metaText,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {reminder.dueDate.toLocaleDateString()} at{" "}
                            {reminder.dueDate.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => deleteReminder(reminder.id)}
                  >
                    <IconSymbol name="trash" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>

                {reminder.notes && (
                  <View
                    style={[
                      styles.notesContainer,
                      { borderTopColor: colors.divider },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.notes,
                        { color: colors.textSecondary },
                        reminder.isCompleted && styles.completedText,
                      ]}
                    >
                      {reminder.notes}
                    </ThemedText>
                  </View>
                )}

                <View
                  style={[
                    styles.cardFooter,
                    { borderTopColor: colors.divider },
                  ]}
                >
                  <ThemedText
                    style={[styles.createdText, { color: colors.textTertiary }]}
                  >
                    Created {reminder.createdAt.toLocaleDateString()}
                  </ThemedText>
                  {reminder.isReminder && (
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: primaryColor + "15" },
                      ]}
                    >
                      <IconSymbol
                        name="bell.fill"
                        size={12}
                        color={primaryColor}
                      />
                      <ThemedText
                        style={[styles.badgeText, { color: primaryColor }]}
                      >
                        Reminder
                      </ThemedText>
                    </View>
                  )}
                </View>
              </ThemedSurface>
            ))
          )}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
    paddingTop: Platform.OS === "ios" ? 60 : Spacing.xl,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  form: {
    marginBottom: Spacing.lg,
  },
  formTitle: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: 16,
    minHeight: 48,
  },
  textArea: {
    minHeight: 100,
    paddingTop: Spacing.md,
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  switchLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  switchText: {
    fontSize: 16,
    fontWeight: "500",
  },
  dateTimeContainer: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  dateText: {
    fontSize: 16,
  },
  submitButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  filterContainer: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  filterButton: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
  },
  listContainer: {
    gap: Spacing.md,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  emptyText: {
    marginTop: Spacing.md,
    textAlign: "center",
    fontSize: 14,
  },
  reminderCard: {
    marginBottom: Spacing.md,
  },
  reminderCardCompleted: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  checkboxContainer: {
    flex: 1,
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "flex-start",
  },
  reminderInfo: {
    flex: 1,
    gap: 4,
  },
  reminderTitle: {
    fontSize: 18,
  },
  completedText: {
    textDecorationLine: "line-through",
    opacity: 0.6,
  },
  reminderMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    fontSize: 14,
  },
  notesContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  notes: {
    fontSize: 14,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  createdText: {
    fontSize: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  pickerContainer: {
    width: "100%",
  },
  pickerActions: {
    marginTop: Spacing.md,
    alignItems: "flex-end",
  },
  pickerButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
});
