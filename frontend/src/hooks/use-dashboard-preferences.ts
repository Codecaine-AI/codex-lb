import { create } from "zustand";

const ACCOUNT_BURNRATE_STORAGE_KEY = "codex-lb-account-burnrate-enabled";
const FORK_DIAGNOSTICS_OPEN_STORAGE_KEY = "codex-lb-fork-diagnostics-open";

type DashboardPreferencesState = {
  accountBurnrateEnabled: boolean;
  forkDiagnosticsOpen: boolean;
  initialized: boolean;
  initializePreferences: () => void;
  setAccountBurnrateEnabled: (enabled: boolean) => void;
  setForkDiagnosticsOpen: (open: boolean) => void;
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

function persistAccountBurnrateEnabled(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(ACCOUNT_BURNRATE_STORAGE_KEY, String(enabled));
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

function persistForkDiagnosticsOpen(open: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(FORK_DIAGNOSTICS_OPEN_STORAGE_KEY, String(open));
}

export const useDashboardPreferencesStore = create<DashboardPreferencesState>((set) => ({
  accountBurnrateEnabled: true,
  forkDiagnosticsOpen: false,
  initialized: false,
  initializePreferences: () => {
    const accountBurnrateEnabled = readStoredAccountBurnrateEnabled() ?? true;
    persistAccountBurnrateEnabled(accountBurnrateEnabled);
    const forkDiagnosticsOpen = readStoredForkDiagnosticsOpen() ?? false;
    set({ accountBurnrateEnabled, forkDiagnosticsOpen, initialized: true });
  },
  setAccountBurnrateEnabled: (enabled) => {
    persistAccountBurnrateEnabled(enabled);
    set({ accountBurnrateEnabled: enabled, initialized: true });
  },
  setForkDiagnosticsOpen: (open) => {
    persistForkDiagnosticsOpen(open);
    set({ forkDiagnosticsOpen: open });
  },
}));
