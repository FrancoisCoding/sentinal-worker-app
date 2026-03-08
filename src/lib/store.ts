import { atom } from "jotai";
import type { Task, ApprovalRequest } from "./schemas";

// Paired desktop device ID
export const pairedDeviceIdAtom = atom<string | null>(null);
export const pairedDeviceNameAtom = atom<string | null>(null);
export const isConnectedAtom = atom<boolean>(false);

// Phone identity
export const phoneIdAtom = atom<string>("");

// Task list from Supabase
export const tasksAtom = atom<Task[]>([]);

// Live log lines per task
export const taskLogsAtom = atom<Record<string, string[]>>({});

// Pending approval from desktop
export const pendingApprovalAtom = atom<ApprovalRequest | null>(null);

// Daily cost tracking
export const dailyCostAtom = atom<number>(0);
