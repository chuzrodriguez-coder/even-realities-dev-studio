import { useMutation } from "@tanstack/react-query";
import type { TextLayoutRequest, TextLayoutResponse } from "@workspace/api-client-react/src/generated/api.schemas";

export function useLayoutText() {
  return useMutation({
    mutationFn: async (data: TextLayoutRequest): Promise<TextLayoutResponse> => {
      const res = await fetch("/api/display/layout-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to calculate text layout");
      }
      return res.json();
    },
  });
}
