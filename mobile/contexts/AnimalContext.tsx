import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/hooks/use-auth";
import { apiRequest, ApiError } from "@/lib/api";

const ACTIVE_ANIMAL_STORAGE_PREFIX = "@reptiai/active-animal";

export type Animal = {
  id: string;
  name: string;
  species?: string;
  description?: string;
  birthDate?: string;
  sex?: string;
  createdAt: string;
  updatedAt: string;
};

type AnimalResponse = {
  id: string;
  name: string;
  species: string | null;
  description: string | null;
  birthDate: string | null;
  sex: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateAnimalInput = {
  name: string;
  species?: string;
  description?: string;
  birthDate?: string;
  sex?: string;
};

type AnimalContextValue = {
  animals: Animal[];
  selectedAnimalId: string | null;
  selectedAnimal: Animal | null;
  isHydrated: boolean;
  isFetching: boolean;
  isCreating: boolean;
  error: string | null;
  refreshAnimals: () => Promise<void>;
  selectAnimal: (animalId: string) => Promise<void>;
  createAnimal: (input: CreateAnimalInput) => Promise<Animal>;
  clearError: () => void;
};

const AnimalContext = createContext<AnimalContextValue | undefined>(undefined);

function normalizeAnimal(record: AnimalResponse): Animal {
  return {
    id: record.id,
    name: record.name,
    species: record.species ?? undefined,
    description: record.description ?? undefined,
    birthDate: record.birthDate ?? undefined,
    sex: record.sex ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function sortAnimalsByName(list: Animal[]): Animal[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

function getStorageKey(userId: string | undefined): string | null {
  return userId ? `${ACTIVE_ANIMAL_STORAGE_PREFIX}:${userId}` : null;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong";
}

export function AnimalProvider({ children }: { children: ReactNode }) {
  const { session, user } = useAuth();
  const token = session?.token ?? null;
  const storageKey = getStorageKey(user?.id);

  const [animals, setAnimals] = useState<Animal[]>([]);
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStoredAnimalId = useCallback(async (): Promise<string | null> => {
    if (!storageKey) return null;
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      return stored ?? null;
    } catch (storageError) {
      if (__DEV__) {
        console.warn("[AnimalProvider] Failed to read stored animal id", storageError);
      }
      return null;
    }
  }, [storageKey]);

  const persistSelectedAnimalId = useCallback(
    async (animalId: string | null) => {
      if (!storageKey) return;
      try {
        if (animalId) {
          await AsyncStorage.setItem(storageKey, animalId);
        } else {
          await AsyncStorage.removeItem(storageKey);
        }
      } catch (storageError) {
        if (__DEV__) {
          console.warn("[AnimalProvider] Failed to persist selected animal id", storageError);
        }
      }
    },
    [storageKey]
  );

  const refreshAnimals = useCallback(async (): Promise<Animal[]> => {
    if (!token) {
      setAnimals([]);
      return [];
    }

    setIsFetching(true);
    setError(null);

    try {
      const response = await apiRequest<AnimalResponse[]>("/animals", {
        method: "GET",
        token,
      });

      const normalized = sortAnimalsByName(response.map(normalizeAnimal));
      setAnimals(normalized);
      return normalized;
    } catch (apiError) {
      const message = extractErrorMessage(apiError);
      setError(message);
      throw apiError;
    } finally {
      setIsFetching(false);
    }
  }, [token]);

  const selectAnimal = useCallback(
    async (animalId: string) => {
      const exists = animals.some((item) => item.id === animalId);
      if (!exists) {
        throw new Error("Selected animal not found");
      }

      setSelectedAnimalId(animalId);
      await persistSelectedAnimalId(animalId);
    },
    [animals, persistSelectedAnimalId]
  );

  const createAnimal = useCallback(
    async (input: CreateAnimalInput): Promise<Animal> => {
      if (!token) {
        throw new Error("Not authenticated");
      }

      const trimmedName = input.name.trim();
      if (!trimmedName) {
        throw new Error("Name is required");
      }

      setIsCreating(true);
      setError(null);

      try {
        const payload = await apiRequest<AnimalResponse>("/animals", {
          method: "POST",
          token,
          body: {
            name: trimmedName,
            species: input.species?.trim() || undefined,
            description: input.description?.trim() || undefined,
            birthDate: input.birthDate,
            sex: input.sex?.trim() || undefined,
          },
        });

        const normalized = normalizeAnimal(payload);
        setAnimals((current) => sortAnimalsByName([...current, normalized]));
        await persistSelectedAnimalId(normalized.id);
        setSelectedAnimalId(normalized.id);
        return normalized;
      } catch (apiError) {
        const message = extractErrorMessage(apiError);
        setError(message);
        throw apiError;
      } finally {
        setIsCreating(false);
      }
    },
    [persistSelectedAnimalId, token]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    let isActive = true;

    const bootstrap = async () => {
      if (!token) {
        if (isActive) {
          setAnimals([]);
          setSelectedAnimalId(null);
          setIsHydrated(true);
        }
        return;
      }

      setIsHydrated(false);

      let storedId: string | null = null;
      if (isActive) {
        storedId = await loadStoredAnimalId();
        if (storedId) {
          setSelectedAnimalId(storedId);
        }
      }

      try {
        const fetched = await refreshAnimals();
        if (!isActive) {
          return;
        }

        if (fetched.length === 0) {
          setSelectedAnimalId(null);
          await persistSelectedAnimalId(null);
          return;
        }

        const hasStored = storedId && fetched.some((item) => item.id === storedId);
        const nextId = hasStored ? storedId : fetched[0].id;
        setSelectedAnimalId(nextId);
        await persistSelectedAnimalId(nextId);
      } catch (bootstrapError) {
        if (isActive) {
          const message = extractErrorMessage(bootstrapError);
          setError(message);
        }
      } finally {
        if (isActive) {
          setIsHydrated(true);
        }
      }
    };

    bootstrap();

    return () => {
      isActive = false;
    };
  }, [loadStoredAnimalId, persistSelectedAnimalId, refreshAnimals, token]);

  const selectedAnimal = useMemo(() => {
    if (!selectedAnimalId) return null;
    return animals.find((item) => item.id === selectedAnimalId) ?? null;
  }, [animals, selectedAnimalId]);

  const value = useMemo<AnimalContextValue>(
    () => ({
      animals,
      selectedAnimalId,
      selectedAnimal,
      isHydrated,
      isFetching,
      isCreating,
      error,
      refreshAnimals: async () => {
        try {
          await refreshAnimals();
        } catch {
          // error state handled within refreshAnimals
        }
      },
      selectAnimal,
      createAnimal,
      clearError,
    }),
    [
      animals,
      selectedAnimalId,
      selectedAnimal,
      isHydrated,
      isFetching,
      isCreating,
      error,
      refreshAnimals,
      selectAnimal,
      createAnimal,
      clearError,
    ]
  );

  return <AnimalContext.Provider value={value}>{children}</AnimalContext.Provider>;
}

export function useAnimalContext() {
  const context = useContext(AnimalContext);
  if (!context) {
    throw new Error("useAnimalContext must be used within an AnimalProvider");
  }
  return context;
}

