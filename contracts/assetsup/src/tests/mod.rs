// Test helper functions and utilities
mod helpers;

// Core contract tests
mod admin;
mod admin_transfer;
mod asset;
mod audit_trail;
mod auth;
mod events;
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
mod detokenization_new;
mod dividends_new;
mod insurance_new;
mod integration;
mod tokenization_new;
mod transfer_restrictions_new;
mod voting_new;

// Storage TTL policy tests
mod ttl;
