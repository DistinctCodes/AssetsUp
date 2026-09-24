// Test helper functions and utilities
mod helpers;

// Core contract tests
mod admin;
mod admin_transfer;
mod asset;
mod audit_trail;
mod auth;
mod initialization;
mod pause;

// Tokenization and ownership tests
mod detokenization;
mod dividends;
mod tokenization;
mod transfer_restrictions;
mod voting;

// Insurance tests
mod insurance;

// Integration tests
mod integration_full;

// Legacy test modules (if still needed)
mod integration;

// Storage TTL policy tests
mod ttl;

// Upgrade and storage migration tests
mod upgrade;

// Property-based tests for share accounting
mod proptests;
