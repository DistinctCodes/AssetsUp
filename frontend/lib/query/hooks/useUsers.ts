// frontend/lib/query/hooks/useUser.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PageParams, Paginated } from "@/lib/api/paginated";
import {
  usersApiClient,
  AppUser,
  UserRole,
  UpdateProfileInput,
  InviteUserInput,
} from "@/lib/api/users";

const usersKeys = {
  all: ["users"] as const,
  list: (params?: PageParams) => [...usersKeys.all, "list", params ?? {}] as const,
};

export function useUsersList(params?: PageParams) {
  return useQuery<Paginated<AppUser>>({
    queryKey: usersKeys.list(params),
    queryFn: () => usersApiClient.getUsers(params),
    placeholderData: (previous) => previous,
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

export function useToggleUserActive() {
  const queryClient = useQueryClient();
  return useMutation<AppUser, Error, { id: string; isActive: boolean }>({
    mutationFn: ({ id, isActive }) => usersApiClient.toggleActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.all });
    },
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation<AppUser, Error, InviteUserInput>({
    mutationFn: (data) => usersApiClient.inviteUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.all });
    },
  });
}
