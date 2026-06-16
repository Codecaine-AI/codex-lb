import { create } from "zustand";

const ACCOUNT_BURNRATE_STORAGE_KEY = "codex-lb-account-burnrate-enabled";
const FORK_DIAGNOSTICS_OPEN_STORAGE_KEY = "codex-lb-fork-diagnostics-open";
const ACCOUNT_VIEW_MODE_STORAGE_KEY = "codex-lb-dashboard-account-view-mode";

export type DashboardAccountViewMode = "cards" | "list";

type DashboardPreferencesState = {
  accountBurnrateEnabled: boolean;
  forkDiagnosticsOpen: boolean;
  accountViewMode: DashboardAccountViewMode;
  initialized: boolean;
  initializePreferences: () => void;
  setAccountBurnrateEnabled: (enabled: boolean) => void;
  setForkDiagnosticsOpen: (open: boolean) => void;
  setAccountViewMode: (mode: DashboardAccountViewMode) => void;
};

function readStoredAccountBurnrateEnabled(): boolean | null {
  if (typeof window === "undefined") {
    return null;
  }
  const stored = window.localStorage.getItem(ACCOUNT_BURNRATE_STORAGE_KEY);
  if (stored === "true") {
    return true;
  }
  if (stored === "false") {
    return false;
  }
  return null;
}

function readStoredForkDiagnosticsOpen(): boolean | null {
  if (typeof window === "undefined") {
    return null;
  }
  const stored = window.localStorage.getItem(FORK_DIAGNOSTICS_OPEN_STORAGE_KEY);
  if (stored === "true") {
    return true;
  }
  if (stored === "false") {
    return false;
  }
  return null;
}

function readStoredAccountViewMode(): DashboardAccountViewMode | null {
  if (typeof window === "undefined") {
    return null;
  }
  const stored = window.localStorage.getItem(ACCOUNT_VIEW_MODE_STORAGE_KEY);
  return stored === "cards" || stored === "list" ? stored : null;
}

function persistAccountBurnrateEnabled(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(ACCOUNT_BURNRATE_STORAGE_KEY, String(enabled));
}

function persistForkDiagnosticsOpen(open: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(FORK_DIAGNOSTICS_OPEN_STORAGE_KEY, String(open));
}

function persistAccountViewMode(mode: DashboardAccountViewMode): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(ACCOUNT_VIEW_MODE_STORAGE_KEY, mode);
}

export const useDashboardPreferencesStore = create<DashboardPreferencesState>((set) => ({
  accountBurnrateEnabled: true,
  forkDiagnosticsOpen: false,
  accountViewMode: "cards",
  initialized: false,
  initializePreferences: () => {
    const accountBurnrateEnabled = readStoredAccountBurnrateEnabled() ?? true;
    const forkDiagnosticsOpen = readStoredForkDiagnosticsOpen() ?? false;
    const accountViewMode = readStoredAccountViewMode() ?? "cards";
    persistAccountBurnrateEnabled(accountBurnrateEnabled);
    persistAccountViewMode(accountViewMode);
    set({ accountBurnrateEnabled, forkDiagnosticsOpen, accountViewMode, initialized: true });
  },
  setAccountBurnrateEnabled: (enabled) => {
    persistAccountBurnrateEnabled(enabled);
    set({ accountBurnrateEnabled: enabled, initialized: true });
  },
  setForkDiagnosticsOpen: (open) => {
    persistForkDiagnosticsOpen(open);
    set({ forkDiagnosticsOpen: open });
  },
  setAccountViewMode: (mode) => {
    persistAccountViewMode(mode);
    set({ accountViewMode: mode, initialized: true });
  },
}));
