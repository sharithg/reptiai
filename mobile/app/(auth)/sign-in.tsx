import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";

type AuthMode = "sign-in" | "sign-up";

export default function SignInScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { signIn, signUp, isAuthenticating, error, clearError } = useAuth();

  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const primaryLabel = mode === "sign-in" ? "Sign In" : "Create Account";
  const secondaryLabel =
    mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in";

  const helperText = useMemo(() => {
    return mode === "sign-in"
      ? "Enter your credentials to access your reptiles, feeding logs, and reminders."
      : "Create a new account with a unique username and secure password.";
  }, [mode]);

  const handleSubmit = useCallback(async () => {
    const trimmedUsername = username.trim();

    if (!trimmedUsername || !password.trim()) {
      setFormError("Enter both username and password to continue.");
      return;
    }

    setFormError(null);
    clearError();

    try {
      if (mode === "sign-in") {
        await signIn(trimmedUsername, password);
      } else {
        await signUp(trimmedUsername, password);
      }
    } catch (authError) {
      if (__DEV__) {
        console.warn("Authentication failed", authError);
      }
    }
  }, [clearError, mode, password, signIn, signUp, username]);

  const toggleMode = useCallback(() => {
    setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"));
    setFormError(null);
    clearError();
  }, [clearError]);

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}> 
      <Image
        source={require("@/assets/images/icon.png")}
        style={styles.logo}
        resizeMode="contain"
      />

        <ThemedText type="title" style={{ color: colors.text, textAlign: "center" }}>
          Welcome to ReptiAI
      </ThemedText>

      <ThemedText
        style={{
          color: colors.textSecondary,
          textAlign: "center",
            marginTop: Spacing.xs,
        }}
      >
          {helperText}
      </ThemedText>

        <View style={styles.form}>
          <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>
            Username
          </ThemedText>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="username"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            importantForAutofill="yes"
            style={[
              styles.input,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
                color: colors.text,
              },
            ]}
            editable={!isAuthenticating}
            returnKeyType="next"
          />

          <ThemedText
            type="defaultSemiBold"
            style={{ color: colors.text, marginTop: Spacing.md }}
          >
            Password
          </ThemedText>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            textContentType="password"
            style={[
              styles.input,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
                color: colors.text,
              },
            ]}
            editable={!isAuthenticating}
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
          />
        </View>

        {(formError || error) && (
          <ThemedText
            style={[styles.errorText, { color: colors.error ?? "#d9534f" }]}
          >
            {formError ?? error}
          </ThemedText>
        )}

      <Pressable
        accessibilityRole="button"
          disabled={isAuthenticating}
          onPress={handleSubmit}
        style={({ pressed }) => [
            styles.primaryButton,
          {
            backgroundColor: colors.primary,
              opacity: pressed || isAuthenticating ? 0.7 : 1,
          },
        ]}
      >
        {isAuthenticating ? (
          <ActivityIndicator color={colors.background} />
        ) : (
            <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
              {primaryLabel}
          </ThemedText>
        )}
      </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={toggleMode}
          disabled={isAuthenticating}
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <ThemedText style={{ color: colors.primary }}>{secondaryLabel}</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  card: {
    alignItems: "stretch",
    borderRadius: 24,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  logo: {
    width: 96,
    height: 96,
    alignSelf: "center",
    marginBottom: Spacing.md,
  },
  form: {
    marginTop: Spacing.lg,
  },
  input: {
    marginTop: Spacing.xs,
    paddingVertical: Platform.select({ ios: Spacing.md, default: Spacing.sm }),
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  errorText: {
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  primaryButton: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  secondaryButton: {
    marginTop: Spacing.md,
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
});

