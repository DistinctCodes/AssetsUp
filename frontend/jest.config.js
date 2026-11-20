/* eslint-disable @typescript-eslint/no-require-imports */
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  collectCoverageFrom: [
    "app/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "features/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    "hooks/**/*.{ts,tsx}",
    "store/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/*.test.{ts,tsx}",
    "!**/__tests__/**",
    "!**/node_modules/**",
  ],
  coverageReporters: ["text-summary", "lcov", "json-summary"],
  // Floor, enforced by `npm run test:coverage` (and so by CI). It was NOT
  // measured when added (nothing was run); it is deliberately low. Ratchet it
  // to a few points below the first CI report, see TESTING.md.
  coverageThreshold: {
    global: { statements: 5, branches: 5, functions: 5, lines: 5 },
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};

module.exports = createJestConfig(customJestConfig);
