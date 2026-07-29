import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  locationApiClient,
  CreateLocationInput,
  UpdateLocationInput,
  Location,
} from '@/lib/api/locations';
import { queryKeys } from '../keys';

export function useLocations() {
  return useQuery<Location[]>({
    queryKey: queryKeys.locations.list(),
    queryFn: () => locationApiClient.getLocations(),
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLocationInput) => locationApiClient.createLocation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLocationInput }) =>
      locationApiClient.updateLocation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => locationApiClient.deleteLocation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
    },
  });
}
