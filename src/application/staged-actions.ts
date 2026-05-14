import {
  createStagedAction,
  getStagedAction,
  listStagedActions,
  updateStagedActionStatus,
} from "@/lib/repositories/staged-actions-repository";
import { NotFoundError } from "./errors";

export async function listStagedActionsUseCase() {
  return listStagedActions();
}

export async function getStagedActionUseCase(id: string) {
  const action = await getStagedAction(id);
  if (!action) {
    throw new NotFoundError("Staged action not found");
  }
  return action;
}

export async function createStagedActionUseCase(
  input: Parameters<typeof createStagedAction>[0]
) {
  return createStagedAction(input);
}

export async function rejectStagedActionUseCase(id: string) {
  const action = await updateStagedActionStatus(id, "rejected");
  if (!action) {
    throw new NotFoundError("Staged action not found");
  }
  return action;
}
