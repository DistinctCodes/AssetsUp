#![no_std]

mod insurance_claim;
mod batch_transfer;

pub use insurance_claim::*;
pub use batch_transfer::*;

#[cfg(test)]
mod insurance_claim_test;

#[cfg(test)]
mod batch_transfer_test;
