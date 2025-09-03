export const appConfig = {
  features: {
    coverageDayPicker: true,
  },
} as const;

export type AppConfig = typeof appConfig;
