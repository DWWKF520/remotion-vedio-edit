import { create } from "zustand";

/**
 * 导出任务状态。
 *
 * 编辑器支持多个并发导出任务，关闭对话框不会取消任务。
 * 任务在后台轮询进度，完成后在顶部工具栏显示下载按钮。
 */
export interface ExportJob {
  /** 服务端返回的 jobId */
  jobId: string;
  /** 渲染状态 */
  status: "rendering" | "done" | "error";
  /** 进度 0-1 */
  progress: number;
  /** 完成后的下载 URL */
  url?: string;
  /** 错误信息 */
  message?: string;
  /** 启动时间戳（ms） */
  startedAt: number;
  /** 完成时间戳（ms） */
  finishedAt?: number;
  /** 用户可读的标签（导出时的 clip 数量 + 时长） */
  label: string;
}

interface ExportStore {
  jobs: ExportJob[];
  /** 是否显示导出对话框 */
  dialogOpen: boolean;

  addJob: (job: ExportJob) => void;
  updateJob: (jobId: string, patch: Partial<ExportJob>) => void;
  removeJob: (jobId: string) => void;
  clearFinished: () => void;
  setDialogOpen: (open: boolean) => void;
}

export const useExportStore = create<ExportStore>((set) => ({
  jobs: [],
  dialogOpen: false,

  addJob: (job) =>
    set((s) => ({ jobs: [...s.jobs, job], dialogOpen: true })),

  updateJob: (jobId, patch) =>
    set((s) => ({
      jobs: s.jobs.map((j) => (j.jobId === jobId ? { ...j, ...patch } : j)),
    })),

  removeJob: (jobId) =>
    set((s) => ({ jobs: s.jobs.filter((j) => j.jobId !== jobId) })),

  clearFinished: () =>
    set((s) => ({
      jobs: s.jobs.filter((j) => j.status === "rendering"),
    })),

  setDialogOpen: (open) => set({ dialogOpen: open }),
}));
