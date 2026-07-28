# Contributing to AssetsUp

## Continuous Integration (CI) Pipelines

All pull requests targeting `main` must pass automated CI checks before merging.

### Workflows

1. **Backend CI (`.github/workflows/backend-ci.yml`)**:
   - Provisions `postgres:16` and `redis:7` service containers.
   - Executes `npm run lint`, `npm run test:cov`, and `npm run build`.
   - Validates that code coverage meets specified thresholds.

2. **Frontend CI (`.github/workflows/frontend-ci.yml`)**:
   - Executes `npm run lint`, `npm run type-check`, and `npm run build`.

### Branch Protection Configuration

To enforce CI compliance on `main`:

1. Navigate to **Repository Settings** > **Branches**.
2. Add or edit the protection rule for `main`.
3. Enable **Require status checks to pass before merging**.
4. Search for and select the following status check job names:
   - `Backend Lint, Test & Build`
   - `Frontend Lint, Type-Check & Build`
5. Enable **Require branches to be up to date before merging**.

### Required Environment Secrets

No repository secrets are required for basic PR validation as test databases run inside GitHub Actions service containers. Deployment pipeline secrets (e.g., `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) should be added under **Settings** > **Secrets and variables** > **Actions** if extended to continuous deployment.