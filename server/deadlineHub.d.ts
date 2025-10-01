import type { ServerResponse } from "http";

export type DeadlineChannel = "inApp" | "email" | "sms";
export type DeadlineSeverity = "info" | "warning" | "critical";

export interface DeadlineEventPayload {
  id?: string;
  vacancyId: string;
  leadTimeId: string;
  message: string;
  deadlineAt: string;
  triggeredAt: string;
  severity?: DeadlineSeverity;
  channels?: DeadlineChannel[];
  suppressedChannels?: DeadlineChannel[];
  origin?: string;
  broadcastedAt?: string;
}

export declare class DeadlineHub {
  constructor(options?: { dispatcher?: any });
  addClient(res: ServerResponse): string;
  removeClient(id: string): void;
  broadcast(event: DeadlineEventPayload): Promise<DeadlineEventPayload>;
  dispatch(event: DeadlineEventPayload): Promise<void>;
  setDispatcher(dispatcher: any): void;
}

export declare const deadlineHub: DeadlineHub;
export default deadlineHub;
