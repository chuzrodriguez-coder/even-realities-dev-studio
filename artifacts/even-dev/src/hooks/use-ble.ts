import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { BleCommandRequest, BleCommandResponse, BleCommandLog, SuccessResponse } from "@workspace/api-client-react/src/generated/api.schemas";

export function useBleCommands() {
  return useQuery({
    queryKey: ["/api/ble/commands"],
    queryFn: async (): Promise<BleCommandLog> => {
      const res = await fetch("/api/ble/commands");
      if (!res.ok) throw new Error("Failed to fetch BLE commands");
      return res.json();
    },
    refetchInterval: 2000, // Poll for updates in log
  });
}

export function useSendCommand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: BleCommandRequest): Promise<BleCommandResponse> => {
      const res = await fetch("/api/ble/send-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to send command");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ble/commands"] });
    },
  });
}

export function useClearCommands() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<SuccessResponse> => {
      const res = await fetch("/api/ble/commands", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear commands");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ble/commands"] });
    },
  });
}
