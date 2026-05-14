import { mutateData, readDataSafe } from "./data-store";
import { generateId, now } from "../utils";
import type {
  StagedAction,
  StagedActionsData,
  StagedActionType,
  StagedActionStatus,
} from "@/types/staged-action";

const FILE = "staged-actions.json";
const EMPTY_STAGED_ACTIONS_DATA: StagedActionsData = { actions: [] };

async function load(): Promise<StagedActionsData> {
  return readDataSafe<StagedActionsData>(FILE, EMPTY_STAGED_ACTIONS_DATA);
}

export async function listStagedActions(): Promise<StagedAction[]> {
  const data = await load();
  return data.actions;
}

export async function getStagedAction(
  id: string
): Promise<StagedAction | null> {
  const data = await load();
  return data.actions.find((a) => a.id === id) ?? null;
}

export async function createStagedAction(params: {
  type: StagedActionType;
  fileName: string;
  content: string;
  description: string;
  carouselId: string;
  autoExecute?: boolean;
}): Promise<StagedAction> {
  return mutateData(FILE, EMPTY_STAGED_ACTIONS_DATA, (data) => {
    const action: StagedAction = {
      id: generateId(),
      type: params.type,
      fileName: params.fileName,
      content: params.content,
      description: params.description,
      carouselId: params.carouselId,
      autoExecute: params.autoExecute ?? false,
      status: "pending",
      createdAt: now(),
      resolvedAt: null,
    };
    data.actions.push(action);
    return { result: action };
  });
}

export async function updateStagedAction(
  id: string,
  updates: Partial<Pick<StagedAction, "status" | "resolvedAt">>
): Promise<StagedAction | null> {
  return mutateData(FILE, EMPTY_STAGED_ACTIONS_DATA, (data) => {
    const action = data.actions.find((a) => a.id === id);
    if (!action) return { result: null, changed: false };
    Object.assign(action, updates);
    return { result: action };
  });
}

export async function updateStagedActionStatus(
  id: string,
  status: StagedActionStatus
): Promise<StagedAction | null> {
  return updateStagedAction(id, {
    status,
    resolvedAt: status !== "pending" ? now() : null,
  });
}
