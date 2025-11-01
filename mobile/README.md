# Reptile Care Mobile

Expo Router application for managing reptile care with username/password authentication.

## Prerequisites

- [pnpm](https://pnpm.io/) 9+
- Node.js 20+
- Expo CLI (`pnpm dlx expo start` installs on demand)

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Configure the backend API the mobile app should talk to (defaults to `http://localhost:3001`). When running on a real device, use your computer's LAN IP address:

   ```bash
   export EXPO_PUBLIC_API_BASE_URL="http://192.168.1.42:3001"
   ```

   > Tip: add this export to your shell profile or use a tool like [direnv](https://direnv.net/) so the variable is set automatically.

3. Start the development server:

   ```bash
   pnpm start
   ```

   Use the on-screen instructions to open the app in Expo Go, an emulator, or a simulator.

## Project Structure

- `app/` – file-based routes (`(auth)/sign-in`, `(tabs)/*`)
- `contexts/AuthContext.tsx` – username/password session management
- `contexts/ThemeContext.tsx` – light/dark theme support
- `constants/theme.ts` – design tokens used throughout the UI

## Authentication Flow

1. The sign-in screen submits credentials to the backend `/auth/login` endpoint and stores the returned session token locally.
2. Creating a new account calls `/auth/register`, which immediately signs the user in after the account is created.
3. The Settings screen shows the signed-in username, role, and allows signing out, which clears local state and notifies the backend.

## Data Sync

- Feeding logs are saved to the backend via `/feedings`; the tracker screen lists the latest records for the signed-in user.
- Health metrics (weight, length, notes, etc.) live in `/measurements` and surface alongside feedings inside the “Health Log” segment of the Feeding tab.
- Reminders and TODOs persist through `/reminders`; completing, reactivating, or deleting an item updates the backend and (when possible) re-schedules local notifications.

## Useful Scripts

- `pnpm start` – start Expo development server
- `pnpm android` / `pnpm ios` / `pnpm web` – platform shortcuts
- `pnpm lint` – run ESLint

## Troubleshooting

- **Can't reach backend** – Ensure `EXPO_PUBLIC_API_BASE_URL` points to a reachable host from your device/emulator.
- **Stuck on loading spinner** – Clear the cached auth state from AsyncStorage via the device settings or reinstall the app.
