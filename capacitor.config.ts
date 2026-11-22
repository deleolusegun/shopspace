import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.shopspace.app",
  appName: "ShopSpace",
  webDir: "mobile-app",
  server: {
    androidScheme: "https",
  },
};

export default config;
