#![cfg(test)]

use crate::types::*;

#[test]
fn test_asset_type_variants() {
    // Test that all AssetType variants can be created
    let physical = AssetType::Physical;
    let digital = AssetType::Digital;

    // Test equality
    assert_eq!(physical, AssetType::Physical);
    assert_eq!(digital, AssetType::Digital);
    assert_ne!(physical, digital);

    // Test cloning
    let physical_clone = physical.clone();
    assert_eq!(physical, physical_clone);
}

#[test]
fn test_asset_status_variants() {
    // Test that all AssetStatus variants can be created
    let active = AssetStatus::Active;
    let in_maintenance = AssetStatus::InMaintenance;
    let disposed = AssetStatus::Disposed;

    // Test equality
    assert_eq!(active, AssetStatus::Active);
    assert_eq!(in_maintenance, AssetStatus::InMaintenance);
    assert_eq!(disposed, AssetStatus::Disposed);

    // Test that they are different
    assert_ne!(active, in_maintenance);
    assert_ne!(active, disposed);
    assert_ne!(in_maintenance, disposed);
}

#[test]
fn test_action_type_variants() {
    // Test that all ActionType variants can be created
    let procured = ActionType::Procured;
    let transferred = ActionType::Transferred;
    let maintained = ActionType::Maintained;
    let disposed = ActionType::Disposed;
    let checked_in = ActionType::CheckedIn;
    let checked_out = ActionType::CheckedOut;

    // Test equality
    assert_eq!(procured, ActionType::Procured);
    assert_eq!(transferred, ActionType::Transferred);
    assert_eq!(maintained, ActionType::Maintained);
    assert_eq!(disposed, ActionType::Disposed);
    assert_eq!(checked_in, ActionType::CheckedIn);
    assert_eq!(checked_out, ActionType::CheckedOut);

    // Test that they are different
    assert_ne!(procured, transferred);
    assert_ne!(checked_in, checked_out);
}

#[test]
fn test_plan_type_variants() {
    // Test that all PlanType variants can be created
    let basic = PlanType::Basic;
    let pro = PlanType::Pro;
    let enterprise = PlanType::Enterprise;

    // Test equality
    assert_eq!(basic, PlanType::Basic);
    assert_eq!(pro, PlanType::Pro);
    assert_eq!(enterprise, PlanType::Enterprise);

    // Test that they are different
    assert_ne!(basic, pro);
    assert_ne!(pro, enterprise);
    assert_ne!(basic, enterprise);
}

#[test]
fn test_subscription_status_variants() {
    // Test that all SubscriptionStatus variants can be created
    let active = SubscriptionStatus::Active;
    let expired = SubscriptionStatus::Expired;
    let cancelled = SubscriptionStatus::Cancelled;

    // Test equality
    assert_eq!(active, SubscriptionStatus::Active);
    assert_eq!(expired, SubscriptionStatus::Expired);
    assert_eq!(cancelled, SubscriptionStatus::Cancelled);

    // Test that they are different
    assert_ne!(active, expired);
    assert_ne!(active, cancelled);
    assert_ne!(expired, cancelled);
}

#[test]
fn test_types_can_be_used_in_functions() {
    // Test that types can be used as function parameters and return values
    fn get_asset_type() -> AssetType {
        AssetType::Physical
    }

    fn process_action(action: ActionType) -> bool {
        match action {
            ActionType::Procured => true,
            ActionType::Transferred => true,
            ActionType::Maintained => true,
            ActionType::Disposed => false,
            ActionType::CheckedIn => true,
            ActionType::CheckedOut => true,
        }
    }

    let asset_type = get_asset_type();
    assert_eq!(asset_type, AssetType::Physical);

    let result = process_action(ActionType::Procured);
    assert!(result);

    let result = process_action(ActionType::Disposed);
    assert!(!result);
}
