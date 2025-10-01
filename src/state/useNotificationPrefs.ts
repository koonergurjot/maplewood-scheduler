import { useCallback, useState } from "react";

export type NotificationChannel = "inApp" | "email" | "sms";

export type ChannelPreferences = {
  inApp: { enabled: boolean };
  email: { enabled: boolean; address: string };
  sms: { enabled: boolean; number: string };
};

export type NotificationLeadTimePreference = {
  id: string;
  label: string;
  minutes: number;
  enabled: boolean;
};

export type QuietHoursPreference = {
  enabled: boolean;
  start: string; // HH:mm
  end: string; // HH:mm
  timezone: string;
  suppress: NotificationChannel[];
};

export type NotificationPreferences = {
  channels: ChannelPreferences;
  leadTimes: NotificationLeadTimePreference[];
  quietHours: QuietHoursPreference;
  updatedAt: string;
};

const DEFAULT_TIMEZONE = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
})();

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  channels: {
    inApp: { enabled: true },
    email: { enabled: false, address: "" },
    sms: { enabled: false, number: "" },
  },
  leadTimes: [
    {
      id: "lt15",
      label: "15 minutes before deadline",
      minutes: 15,
      enabled: true,
    },
    {
      id: "lt30",
      label: "30 minutes before deadline",
      minutes: 30,
      enabled: false,
    },
    {
      id: "lt60",
      label: "1 hour before deadline",
      minutes: 60,
      enabled: false,
    },
    {
      id: "lt120",
      label: "2 hours before deadline",
      minutes: 120,
      enabled: false,
    },
  ],
  quietHours: {
    enabled: false,
    start: "22:00",
    end: "06:00",
    timezone: DEFAULT_TIMEZONE,
    suppress: ["email", "sms"],
  },
  updatedAt: new Date().toISOString(),
};

type NormalizeOptions = {
  stamp?: boolean;
};

function normalizeChannels(value: any): ChannelPreferences {
  const channels = value && typeof value === "object" ? value : {};
  return {
    inApp: {
      enabled:
        typeof channels?.inApp?.enabled === "boolean"
          ? channels.inApp.enabled
          : DEFAULT_NOTIFICATION_PREFS.channels.inApp.enabled,
    },
    email: {
      enabled:
        typeof channels?.email?.enabled === "boolean"
          ? channels.email.enabled
          : DEFAULT_NOTIFICATION_PREFS.channels.email.enabled,
      address:
        typeof channels?.email?.address === "string"
          ? channels.email.address
          : DEFAULT_NOTIFICATION_PREFS.channels.email.address,
    },
    sms: {
      enabled:
        typeof channels?.sms?.enabled === "boolean"
          ? channels.sms.enabled
          : DEFAULT_NOTIFICATION_PREFS.channels.sms.enabled,
      number:
        typeof channels?.sms?.number === "string"
          ? channels.sms.number
          : DEFAULT_NOTIFICATION_PREFS.channels.sms.number,
    },
  };
}

function normalizeLeadTimes(value: any): NotificationLeadTimePreference[] {
  const defaults = DEFAULT_NOTIFICATION_PREFS.leadTimes;
  const list = Array.isArray(value) ? value : [];
  const byId = new Map<string, any>();
  for (const item of list) {
    if (item && typeof item.id === "string") {
      byId.set(item.id, item);
    }
  }
  const normalized: NotificationLeadTimePreference[] = defaults.map((def) => {
    const raw = byId.get(def.id) ?? {};
    const minutes = Number(raw.minutes);
    return {
      id: def.id,
      label:
        typeof raw.label === "string" && raw.label.trim().length > 0
          ? raw.label
          : def.label,
      minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : def.minutes,
      enabled:
        typeof raw.enabled === "boolean" ? raw.enabled : def.enabled,
    };
  });
  for (const [id, raw] of byId.entries()) {
    if (normalized.some((item) => item.id === id)) continue;
    const minutes = Number(raw.minutes);
    normalized.push({
      id,
      label:
        typeof raw.label === "string" && raw.label.trim().length > 0
          ? raw.label
          : `${raw.minutes ?? "?"} minutes before`,
      minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : 30,
      enabled: typeof raw.enabled === "boolean" ? raw.enabled : true,
    });
  }
  return normalized.sort((a, b) => a.minutes - b.minutes);
}

function normalizeQuietHours(value: any): QuietHoursPreference {
  const quiet = value && typeof value === "object" ? value : {};
  const suppressRaw = Array.isArray(quiet.suppress)
    ? quiet.suppress
    : DEFAULT_NOTIFICATION_PREFS.quietHours.suppress;
  const suppress = suppressRaw.filter((item: unknown): item is NotificationChannel =>
    item === "email" || item === "sms" || item === "inApp",
  );
  return {
    enabled:
      typeof quiet.enabled === "boolean"
        ? quiet.enabled
        : DEFAULT_NOTIFICATION_PREFS.quietHours.enabled,
    start:
      typeof quiet.start === "string" && /^\d{2}:\d{2}$/.test(quiet.start)
        ? quiet.start
        : DEFAULT_NOTIFICATION_PREFS.quietHours.start,
    end:
      typeof quiet.end === "string" && /^\d{2}:\d{2}$/.test(quiet.end)
        ? quiet.end
        : DEFAULT_NOTIFICATION_PREFS.quietHours.end,
    timezone:
      typeof quiet.timezone === "string" && quiet.timezone.trim().length > 0
        ? quiet.timezone
        : DEFAULT_NOTIFICATION_PREFS.quietHours.timezone,
    suppress: suppress.length ? suppress : DEFAULT_NOTIFICATION_PREFS.quietHours.suppress,
  };
}

export function normalizeNotificationPrefs(
  value?: Partial<NotificationPreferences>,
  options: NormalizeOptions = {},
): NotificationPreferences {
  const updatedAt =
    typeof value?.updatedAt === "string" && value.updatedAt
      ? value.updatedAt
      : DEFAULT_NOTIFICATION_PREFS.updatedAt;
  const normalized: NotificationPreferences = {
    channels: normalizeChannels(value?.channels),
    leadTimes: normalizeLeadTimes(value?.leadTimes),
    quietHours: normalizeQuietHours(value?.quietHours),
    updatedAt,
  };
  if (options.stamp) {
    normalized.updatedAt = new Date().toISOString();
  }
  return normalized;
}

type SetStateArg =
  | NotificationPreferences
  | ((prev: NotificationPreferences) => NotificationPreferences);

export function useNotificationPrefs(
  initial?: Partial<NotificationPreferences>,
) {
  const [prefs, setPrefsState] = useState<NotificationPreferences>(() =>
    normalizeNotificationPrefs(initial),
  );

  const setPrefs = useCallback((value: SetStateArg) => {
    setPrefsState((prev) =>
      normalizeNotificationPrefs(
        typeof value === "function" ? (value as any)(prev) : value,
        { stamp: true },
      ),
    );
  }, []);

  const toggleChannel = useCallback(
    (channel: NotificationChannel, enabled?: boolean) => {
      setPrefs((prev) => ({
        ...prev,
        channels: {
          ...prev.channels,
          [channel]: {
            ...prev.channels[channel],
            enabled:
              typeof enabled === "boolean"
                ? enabled
                : !prev.channels[channel].enabled,
          },
        },
      }));
    },
    [setPrefs],
  );

  type MutableChannelMap = {
    email: Partial<ChannelPreferences["email"]>;
    sms: Partial<ChannelPreferences["sms"]>;
  };

  const updateChannel = useCallback(
    <T extends keyof MutableChannelMap>(channel: T, patch: MutableChannelMap[T]) => {
      setPrefs((prev) => ({
        ...prev,
        channels: {
          ...prev.channels,
          [channel]: {
            ...prev.channels[channel],
            ...patch,
          },
        },
      }));
    },
    [setPrefs],
  );

  const updateLeadTime = useCallback(
    (id: string, patch: Partial<NotificationLeadTimePreference>) => {
      setPrefs((prev) => ({
        ...prev,
        leadTimes: prev.leadTimes.map((lt) =>
          lt.id === id
            ? {
                ...lt,
                ...patch,
                minutes:
                  typeof patch.minutes === "number" && patch.minutes > 0
                    ? patch.minutes
                    : lt.minutes,
              }
            : lt,
        ),
      }));
    },
    [setPrefs],
  );

  const setQuietHours = useCallback(
    (patch: Partial<QuietHoursPreference>) => {
      setPrefs((prev) => ({
        ...prev,
        quietHours: normalizeQuietHours({ ...prev.quietHours, ...patch }),
      }));
    },
    [setPrefs],
  );

  return {
    notificationPrefs: prefs,
    setNotificationPrefs: setPrefs,
    toggleChannel,
    updateChannel,
    updateLeadTime,
    setQuietHours,
  } as const;
}

export default useNotificationPrefs;
