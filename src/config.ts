export const appConfig = {
  features: {
    coverageDayPicker: true,
    bundleVacancies: true,
    vacancyListRedesign: true,
  },
} as const;

export type AppConfig = typeof appConfig;
