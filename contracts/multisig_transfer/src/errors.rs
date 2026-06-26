use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum MultiSigError {
    NotInitialized = 1,
    Unauthorized = 2,

    InvalidOwner = 3,
    InvalidNewOwner = 4,

    AssetNotFound = 5,
    AssetRetired = 6,
    PendingRequestExists = 7,

    RuleNotFound = 8,
    ApproverNotAuthorized = 9,
    CannotApproveOwnRequest = 10,
    AlreadyApproved = 11,

    RequestNotFound = 12,
    RequestNotPending = 13,

    RequestExpired = 14,
    ApprovalDeadlinePassed = 15,

    NotEnoughApprovals = 16,
    ExecuteTooEarly = 17,

    RegistryCallFailed = 18,
}
