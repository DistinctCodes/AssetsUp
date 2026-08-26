# Role-Based Access Control (RBAC)

Enforces role-based permissions so admins manage everything while staff are
limited to their own assets.

## Pieces

- **`UserRole` enum** (`src/users/entities/user.entity.ts`): `ADMIN | MANAGER | STAFF`,
  stored on the `role` column of the user.
- **`@Roles(...roles)` decorator** (`src/common/decorators/roles.decorator.ts`):
  attaches the allowed roles to a route via `SetMetadata`.
- **`RolesGuard`** (`src/auth/guards/roles.guard.ts`): reads the metadata with
  `Reflector` and checks `request.user.role`, throwing `403` when the role is not
  permitted. Routes with no `@Roles()` are open to any authenticated user.

## Usage

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Delete(':id')
remove(@Param('id') id: string) { ... }
```

Apply `@Roles(UserRole.ADMIN)` to admin-only endpoints (user management, deletes)
and leave read endpoints role-free or scoped to the requesting user.
