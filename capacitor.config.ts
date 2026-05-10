import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'info.sj26.protrack',
  appName: 'ProTrack',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
};

export default config;
