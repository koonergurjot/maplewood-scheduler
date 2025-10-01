import type {
  NotificationChannel,
  NotificationLeadTimePreference,
} from "../state/useNotificationPrefs";

export type DeadlineSeverity = "info" | "warning" | "critical";

export type DeadlineEvent = {
  id: string;
  vacancyId: string;
  leadTimeId: NotificationLeadTimePreference["id"];
  message: string;
  deadlineAt: string;
  triggeredAt: string;
  severity: DeadlineSeverity;
  channels: NotificationChannel[];
  suppressedChannels: NotificationChannel[];
  origin?: "local" | "remote" | "server";
  broadcastedAt?: string;
};

export type DeadlineNotification = DeadlineEvent & {
  read: boolean;
  resolved?: boolean;
  resolvedAt?: string;
};

export type DeadlineBatchPayload = {
  events: DeadlineEvent[];
};
