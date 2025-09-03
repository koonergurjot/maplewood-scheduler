export const appConfig = {
  features: {
    coverageDayPicker: false,
  },
} as const;

export type AppConfig = typeof appConfig;
