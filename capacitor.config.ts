import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nojob.app',
  appName: 'NOJOB',
  // webDir is used when running `npx cap copy` from a local build.
  // When server.url is set, the WebView loads from that URL instead.
  webDir: 'out',
  server: {
    // Replace this with your actual Vercel deployment URL.
    url: 'https://nojob-run.vercel.app/',
    // Keep cookies and auth sessions alive across WebView navigations.
    androidScheme: 'https',
  },
  ios: {
    // Allow the WebView to scroll to avoid the keyboard covering inputs.
    contentInset: 'always',
    // Matches the gradient used in the NOJOB brand (blue-500 → violet-600).
    backgroundColor: '#f5f5f4',
  },
};

export default config;
