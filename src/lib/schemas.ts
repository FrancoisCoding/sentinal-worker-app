import { z } from "zod";

export const TaskStatusSchema = z.enum([
  "queued",
  "running",
  "waiting_for_approval",
  "completed",
  "failed",
  "rejected",
]);

export const TaskTypeSchema = z.enum(["claude", "codex", "shell"]);

export const TaskSchema = z.object({
  id: z.string().uuid(),
  device_id: z.string().nullable().optional(),
  type: TaskTypeSchema,
  command: z.string(),
  project_path: z.string().nullable().optional(),
  status: TaskStatusSchema,
  cost_usd: z.number().default(0),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  created_at: z.string(),
});

export const TaskEventSchema = z.object({
  id: z.number(),
  task_id: z.string().uuid(),
  event_type: z.enum(["stdout", "stderr", "status_change", "approval_request", "cost_update"]),
  payload: z.record(z.unknown()),
  created_at: z.string(),
});

export const PairingRequestSchema = z.object({
  id: z.string().uuid(),
  device_id: z.string().uuid(),
  phone_public_key: z.string(),
  phone_name: z.string().nullable().optional(),
  status: z.enum(["pending", "approved", "rejected"]),
  created_at: z.string(),
});

export const ApprovalRequestSchema = z.object({
  id: z.string().uuid(),
  task_id: z.string().uuid(),
  command: z.string(),
  status: z.enum(["pending", "approved", "rejected", "always_allow"]),
  expires_at: z.string().nullable().optional(),
  resolved_at: z.string().nullable().optional(),
  created_at: z.string(),
});

export const SubmitTaskSchema = z.object({
  type: TaskTypeSchema,
  command: z.string().min(1, "Command is required"),
  project_path: z.string().optional(),
});

export type Task = z.infer<typeof TaskSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskType = z.infer<typeof TaskTypeSchema>;
export type TaskEvent = z.infer<typeof TaskEventSchema>;
export type PairingRequest = z.infer<typeof PairingRequestSchema>;
export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;
export type SubmitTask = z.infer<typeof SubmitTaskSchema>;
