// frontend/lib/query/hooks/useUser.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  usersApiClient,
  AppUser,
  UserRole,
  UpdateProfileInput,
} from "@/lib/api/users";

const usersKeys = {
  all: ["users"] as const,
  list: (search?: string) => [...usersKeys.all, "list", search ?? ""] as const,
};

export function useUsersList(search?: string) {
  return useQuery<AppUser[]>({
    queryKey: usersKeys.list(search),
    queryFn: () => usersApiClient.getUsers(search),
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation<AppUser, Error, { id: string; role: UserRole }>({
    mutationFn: ({ id, role }) => usersApiClient.updateRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.all });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation<AppUser, Error, UpdateProfileInput>({
    mutationFn: (data) => usersApiClient.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.all });
    },
  });
}
