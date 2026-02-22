// Test helper functions and utilities
mod helpers;

// Core contract tests
mod initialization;
mod admin;
mod asset;

// Tokenization and ownership tests
mod tokenization;
mod voting;
mod dividends;
mod transfer_restrictions;
mod detokenization;

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
