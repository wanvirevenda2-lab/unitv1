import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.unitv.player',
  appName: 'UniTV',
  webDir: 'dist',
  bundledWebRuntime: false,
  backgroundColor: '#080b12',
  android: {
    allowMixedContent: false
  }
};

export default config;
