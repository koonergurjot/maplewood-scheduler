export interface SchedulerStateRecord {
  id: string;
  version: number;
  state: any;
  updatedAt: string;
}

type UpsertResult =
  | { status: "created"; version: number; updatedAt: string; state: any }
  | { status: "updated"; version: number; updatedAt: string; state: any }
  | { status: "conflict"; version: number; updatedAt: string };

export declare function findSchedulerState(
  userId: string,
  facilityId: string,
): Promise<SchedulerStateRecord | null>;

export declare function upsertSchedulerState(
  userId: string,
  facilityId: string,
  expectedVersion: number,
  state: any,
): Promise<UpsertResult>;
