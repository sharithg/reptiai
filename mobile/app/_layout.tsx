import React, { useEffect } from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import "react-native-reanimated";

import { AnimalProvider } from "@/contexts/AnimalContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  anchor: "(tabs)",
};

function LoadingScreen() {
  const colorScheme = useColorScheme();
  const background = colorScheme === "dark" ? "#000" : "#fff";
  const indicatorColor = colorScheme === "dark" ? "#fff" : "#000";

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: background,
      }}
    >
      <ActivityIndicator size="large" color={indicatorColor} />
    </View>
  );
}

function RootStackNavigator() {
  const router = useRouter();
  const segments = useSegments();
  const { user, isInitializing } = useAuth();
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (isInitializing) {
      return;
    }

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isInitializing, segments, user, router]);

  if (isInitializing) {
    return <LoadingScreen />;
  }

  return (
    <NavigationThemeProvider
      value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
    >
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AnimalProvider>
          <RootStackNavigator />
        </AnimalProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
