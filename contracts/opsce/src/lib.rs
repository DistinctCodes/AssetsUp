#![no_std]
#![allow(clippy::too_many_arguments)]

pub mod provider_rating;

pub use provider_rating::{
    ContractError, MaintenanceRecord, OpsceContract, OpsceContractClient, ProviderProfile,
    ProviderRating, Review,
};
