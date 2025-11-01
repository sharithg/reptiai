import { useAnimalContext } from "@/contexts/AnimalContext";

export function useAnimals() {
  return useAnimalContext();
}

