# E2E Integration Tests - AssetsUp Backend

This directory contains end-to-end integration tests for the auth and assets endpoints using Jest and Supertest.

## Overview

The test suite includes:

- **Auth E2E Tests** (`auth.e2e.spec.ts`): Tests for token refresh, JWT verification, and authentication workflows
- **Assets E2E Tests** (`assets.e2e.spec.ts`): Tests for CRUD operations, filtering, soft-delete, and asset lifecycle

## Prerequisites

### System Requirements
- Node.js 16+ 
- PostgreSQL 12+
- npm or yarn

### Dependencies

Ensure the following packages are installed in `backend/contrib/`:

```json
{
  "devDependencies": {
    "@nestjs/testing": "^10.0.0",
    "@types/jest": "^29.5.0",
    "@types/supertest": "^2.0.12",
    "jest": "^29.5.0",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.0",
    "dotenv": "^16.3.1"
  }
}
```

Install with: `npm install`

## Setup

### 1. Environment Configuration

Create or update `.env.test` in `backend/contrib/`:

```env
NODE_ENV=test
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=assetsup_test
JWT_ACCESS_SECRET=test-access-secret-key-for-testing-only
JWT_REFRESH_SECRET=test-refresh-secret-key-for-testing-only
FRONTEND_URL=http://localhost:3000
PORT=6003
```

### 2. Database Setup

Create a test database:

```bash
psql -U postgres -c "CREATE DATABASE assetsup_test;"
```

Run migrations:

```bash
npm run migration:run -- --config ./src/data-source.ts
```

## Running Tests

### Run All Tests

```bash
npm run test:e2e
```

### Run Specific Test Suite

```bash
# Auth tests only
npm run test:e2e -- auth.e2e.spec.ts

# Assets tests only
npm run test:e2e -- assets.e2e.spec.ts
```

### Run with Coverage

```bash
npm run test:e2e -- --coverage
```

### Watch Mode

```bash
npm run test:e2e -- --watch
```

### Verbose Output

```bash
npm run test:e2e -- --verbose
```

## Test Structure

### Auth E2E Tests

Covers token refresh functionality:

#### POST /api/auth/refresh
- ✅ Successfully refresh tokens with valid refresh token
- ✅ Fail without Bearer token header
- ✅ Fail with invalid token format
- ✅ Fail with expired token
- ✅ Fail with invalid signature
- ✅ Fail when user does not exist
- ✅ Fail when refresh token has been revoked
- ✅ Fail when token hash does not match
- ✅ Return new tokens with updated timestamps
- ✅ Maintain user identity across token refreshes

#### Integration Scenarios
- ✅ Handle multiple concurrent refresh requests

### Assets E2E Tests

Covers complete CRUD operations and lifecycle:

#### POST /api/assets - Create Asset
- ✅ Create a new asset with all fields
- ✅ Create asset with minimal required fields
- ✅ Generate sequential asset IDs
- ✅ Fail without authentication
- ✅ Fail with missing required fields
- ✅ Create asset with history record
- ✅ Store asset with correct data types

#### GET /api/assets - List Assets
- ✅ List all assets with pagination
- ✅ Filter assets by status
- ✅ Filter assets by condition
- ✅ Search assets by name
- ✅ Paginate assets correctly
- ✅ Filter by categoryId
- ✅ Fail without authentication

#### GET /api/assets/:id - Get Single Asset
- ✅ Retrieve a single asset by ID
- ✅ Include asset history
- ✅ Return 404 for non-existent asset
- ✅ Fail without authentication
- ✅ Validate UUID format

#### PATCH /api/assets/:id - Update Asset
- ✅ Update asset fields
- ✅ Create history record on update
- ✅ Not create history record if no changes
- ✅ Return 404 for non-existent asset
- ✅ Fail without authentication
- ✅ Allow partial updates

#### DELETE /api/assets/:id - Soft Delete Asset
- ✅ Soft delete an asset
- ✅ Create history record on delete
- ✅ Not appear in asset list after deletion
- ✅ Return 404 for non-existent asset
- ✅ Fail without authentication

#### POST /api/assets/:id/restore - Restore Asset
- ✅ Restore a soft-deleted asset
- ✅ Create history record on restore
- ✅ Appear in asset list after restoration
- ✅ Fail without authentication

#### Integration Scenarios
- ✅ Handle complete asset lifecycle (Create → Read → Update → Delete → Restore)
- ✅ Handle multiple concurrent asset creations
- ✅ Maintain referential integrity with history

## Test Isolation

Each test suite:
- Creates fresh test data before each test
- Cleans up test data after each test
- Uses isolated test users and assets
- Does not interfere with other tests

## Best Practices

### 1. Test Organization

Tests are organized by endpoint and grouped by functionality:

```typescript
describe('Assets E2E Tests', () => {
  describe('POST /api/assets - Create Asset', () => {
    it('should create a new asset', () => {});
  });
});
```

### 2. Cleanup

Proper cleanup is essential:

```typescript
afterEach(async () => {
  await assetsRepository.delete({});
  await historyRepository.delete({});
});
```

### 3. Authentication

Tests use valid JWT tokens:

```typescript
const authToken = jwtService.signAsync(payload, {
  secret: configService.get<string>('JWT_ACCESS_SECRET'),
  expiresIn: '15m',
});
```

### 4. Data Fixtures

Reusable test data:

```typescript
const testAsset = {
  name: 'Test Asset',
  categoryId: 'category-123',
  departmentId: 'dept-123',
};
```

## Troubleshooting

### Database Connection Error

Ensure PostgreSQL is running:
```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql

# Windows
net start PostgreSQL13
```

### Test Database Not Found

Create the test database:
```bash
psql -U postgres -c "CREATE DATABASE assetsup_test;"
```

### JWT Token Errors

Verify JWT secrets in `.env.test`:
```
JWT_ACCESS_SECRET=test-access-secret-key-for-testing-only
JWT_REFRESH_SECRET=test-refresh-secret-key-for-testing-only
```

### Timeout Errors

Increase Jest timeout in `jest-e2e.config.ts`:
```typescript
testTimeout: 30000, // 30 seconds
```

### Port Already in Use

Change the port in `.env.test`:
```
PORT=6004
```

## Performance Considerations

- Each test takes 1-5 seconds
- Total suite completion: 2-5 minutes
- Use `--runInBand` flag to run tests sequentially:
  ```bash
  npm run test:e2e -- --runInBand
  ```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: password
          POSTGRES_DB: assetsup_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm install
        working-directory: backend/contrib
      
      - name: Run migrations
        run: npm run migration:run
        working-directory: backend/contrib
      
      - name: Run E2E tests
        run: npm run test:e2e
        working-directory: backend/contrib
```

## Contributing

When adding new endpoints or features:

1. Add corresponding E2E tests in `test/`
2. Follow existing test patterns
3. Ensure proper cleanup in `afterEach`
4. Test both success and failure cases
5. Include integration scenarios

## Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [NestJS Testing Guide](https://docs.nestjs.com/fundamentals/testing)
- [TypeORM Testing Guide](https://typeorm.io/usage-with-other-tools/usage-with-other-tools)

## Support

For issues or questions:
1. Check test logs: `npm run test:e2e -- --verbose`
2. Enable debug mode: `DEBUG=* npm run test:e2e`
3. Review error messages and test descriptions
4. Consult test files for similar test patterns
