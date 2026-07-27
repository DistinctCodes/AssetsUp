use soroban_sdk::contracterror;

/// Contract errors for `multisig-transfer`.
///
/// Codes follow the workspace allocation in `contracts/ERRORS.md`:
///
/// - **1–99** are *shared* across every contract and mean the same thing
///   everywhere.
/// - **400–499** belong to `multisig-transfer` alone.
///
/// This enum previously started at `NotInitialized = 1`, while `assetsup`,
/// `contrib` and `multisig-wallet` all used `1` for `AlreadyInitialized` — the
/// exact opposite condition. That is the collision this allocation removes.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum MultiSigError {
    // ---------------------------------------------------------------
    // Shared: 1–99. Same meaning in every contract in the workspace.
    // ---------------------------------------------------------------
    /// An entrypoint was called before the contract was initialized.
    NotInitialized = 2,
    /// The caller authenticated but is not permitted to perform this action.
    Unauthorized = 3,

    // ---------------------------------------------------------------
    // Request lifecycle: 400–419
    // ---------------------------------------------------------------
    /// No transfer request exists under this id.
    RequestNotFound = 400,
    /// The request is not pending, so it cannot be approved or cancelled.
    RequestNotPending = 401,
    /// The request is past its expiry.
    RequestExpired = 402,
    /// The approval window for this request has closed.
    ApprovalDeadlinePassed = 403,
    /// The request has not gathered enough approvals to execute.
    NotEnoughApprovals = 404,
    /// The request's timelock has not yet elapsed.
    ExecuteTooEarly = 405,
    /// A pending request already exists for this asset.
    PendingRequestExists = 406,

    // ---------------------------------------------------------------
    // Approval rules and approvers: 420–439
    // ---------------------------------------------------------------
    /// No approval rule is configured for this asset category.
    RuleNotFound = 420,
    /// The caller is not an approver for this asset category.
    ApproverNotAuthorized = 421,
    /// The requester may not approve their own transfer request.
    CannotApproveOwnRequest = 422,
    /// This approver has already approved this request.
    AlreadyApproved = 423,

    // ---------------------------------------------------------------
    // Registry interaction: 440–449
    // ---------------------------------------------------------------
    /// The asset is not registered in the configured registry contract.
    AssetNotFound = 440,
    /// The asset is retired and can no longer be transferred.
    AssetRetired = 441,
    /// The caller is not the asset's current owner.
    InvalidOwner = 442,
    /// The proposed new owner is not a valid recipient.
    InvalidNewOwner = 443,
    /// The call into the registry contract failed.
    RegistryCallFailed = 444,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shared_errors_occupy_the_shared_range() {
        // These codes must match assetsup and multisig-wallet exactly. In
        // particular NotInitialized is 2 here, not 1 as it used to be.
        assert_eq!(MultiSigError::NotInitialized as u32, 2);
        assert_eq!(MultiSigError::Unauthorized as u32, 3);
    }

    #[test]
    fn contract_specific_errors_stay_inside_the_transfer_block() {
        let codes = [
            MultiSigError::RequestNotFound as u32,
            MultiSigError::RequestNotPending as u32,
            MultiSigError::RequestExpired as u32,
            MultiSigError::ApprovalDeadlinePassed as u32,
            MultiSigError::NotEnoughApprovals as u32,
            MultiSigError::ExecuteTooEarly as u32,
            MultiSigError::PendingRequestExists as u32,
            MultiSigError::RuleNotFound as u32,
            MultiSigError::ApproverNotAuthorized as u32,
            MultiSigError::CannotApproveOwnRequest as u32,
            MultiSigError::AlreadyApproved as u32,
            MultiSigError::AssetNotFound as u32,
            MultiSigError::AssetRetired as u32,
            MultiSigError::InvalidOwner as u32,
            MultiSigError::InvalidNewOwner as u32,
            MultiSigError::RegistryCallFailed as u32,
        ];
        for code in codes {
            assert!(
                (400..500).contains(&code),
                "multisig-transfer error code is outside its allocated 400-499 block"
            );
        }
    }
}
