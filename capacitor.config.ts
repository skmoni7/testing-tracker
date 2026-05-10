import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'info.sj26.protrack',
  appName: 'ProTrack',
  // Use live server URL - APK loads the live web app directly
  // This ensures the app communicates with the live database
  server: {
    url: 'https://protrack.sj26.info',
    cleartext: false,
    androidScheme: 'https',
  },
};

export default config;
