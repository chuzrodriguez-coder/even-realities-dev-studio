import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Feature, FeatureList, CreateFeatureRequest, UpdateFeatureRequest, SuccessResponse } from "@workspace/api-client-react/src/generated/api.schemas";

export function useFeatures() {
  return useQuery({
    queryKey: ["/api/features"],
    queryFn: async (): Promise<FeatureList> => {
      const res = await fetch("/api/features");
      if (!res.ok) throw new Error("Failed to fetch features");
      return res.json();
    },
  });
}

export function useFeature(id: string) {
  return useQuery({
    queryKey: ["/api/features", id],
    queryFn: async (): Promise<Feature> => {
      const res = await fetch(`/api/features/${id}`);
      if (!res.ok) throw new Error("Failed to fetch feature");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateFeatureRequest): Promise<Feature> => {
      const res = await fetch("/api/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create feature");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
    },
  });
}

export function useUpdateFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateFeatureRequest }): Promise<Feature> => {
      const res = await fetch(`/api/features/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update feature");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
      queryClient.invalidateQueries({ queryKey: ["/api/features", variables.id] });
    },
  });
}

export function useDeleteFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<SuccessResponse> => {
      const res = await fetch(`/api/features/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete feature");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
    },
  });
}
