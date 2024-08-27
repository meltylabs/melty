import { TaskMode } from "../types";

export function getTaskModeName(taskMode: TaskMode) {
  return taskMode === "vanilla" ? "Vanilla Claude" : "Coder";
}
