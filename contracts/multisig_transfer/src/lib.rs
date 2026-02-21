#![no_std]

use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, Vec};

mod approvals;
mod errors;
mod events;
mod registry;
mod rules;
mod storage;
mod types;
mod utils;

use approvals::*;
use errors::MultiSigError;
use types::{ApprovalRule, RequestStatus, TransferRequest};

#[contract]
pub struct MultiSigTransferContract;

#[contractimpl]
impl MultiSigTransferContract {
    // ----------------------------
    // Init
    // ----------------------------
    pub fn initialize(e: Env, admin: Address, asset_registry: Address) {
        storage::set_admin(&e, &admin);
        storage::set_registry(&e, &asset_registry);
        e.storage()
            .persistent()
            .set(&storage::DataKey::NextRequestId, &1u64);
    }

    // ----------------------------
    // Admin: configure rules
    // ----------------------------
    pub fn configure_approval_rule(
        e: Env,
        caller: Address,
        rule: ApprovalRule,
    ) -> Result<(), MultiSigError> {
        utils::require_admin(&e, &caller)?;

        let mut rules_map = storage::rules_map(&e);
        rules_map.set(rule.category.clone(), rule.clone());
        storage::set_rules_map(&e, &rules_map);

        events::approval_rule_updated(&e, &rule.category, rule.required_approvals, utils::now(&e));
        Ok(())
    }

    // ----------------------------
    // Create transfer request
    // ----------------------------
    pub fn create_transfer_request(
        e: Env,
        caller: Address,
        asset_id: BytesN<32>,
        asset_category: BytesN<32>,
        new_owner: Address,
        notes_hash: BytesN<32>,
        expires_at: u64,
        execute_after: Option<u64>,
    ) -> Result<u64, MultiSigError> {
        let (_admin, registry_addr) = utils::require_init(&e)?;

        if caller == new_owner {
            return Err(MultiSigError::InvalidNewOwner);
        }

        // asset exists?
        if !registry::asset_exists(&e, &registry_addr, &asset_id)? {
            return Err(MultiSigError::AssetNotFound);
        }

        // asset retired?
        if registry::asset_is_retired(&e, &registry_addr, &asset_id)? {
            return Err(MultiSigError::AssetRetired);
        }

        // no pending request for asset
        let mut asset_pending = storage::asset_pending_map(&e);
        if asset_pending.contains_key(asset_id.clone()) {
            return Err(MultiSigError::PendingRequestExists);
        }

        // initiator must be owner OR admin (registry owner check omitted here due to stub)
        // when wired: compare registry::get_owner(...)
        // if caller != owner && caller != admin => Unauthorized

        let rule = rules::get_rule(&e, &asset_category)?;
        let now = utils::now(&e);

        if expires_at <= now {
            return Err(MultiSigError::RequestExpired);
        }

        let approval_deadline = now + rule.approval_timeout_secs;

        let request_id = storage::bump_request_id(&e);

        let req = TransferRequest {
            request_id,
            asset_id: asset_id.clone(),
            asset_category: asset_category.clone(),
            current_owner: caller.clone(), // placeholder until registry owner wired
            new_owner: new_owner.clone(),
            initiator: caller.clone(),
            created_at: now,
            required_approvals: rule.required_approvals,
            received_approvals: 0,
            status: if rule.auto_approve || rule.required_approvals == 0 {
                RequestStatus::Approved
            } else {
                RequestStatus::Pending
            },
            notes_hash,
            expires_at,
            approval_deadline,
            execute_after,
        };

        // save request
        let mut requests = storage::requests_map(&e);
        requests.set(request_id, req);
        storage::set_requests_map(&e, &requests);

        // store pending approvers list (cheap for "pending transfers for approver" query)
        let mut pending = storage::pending_approvals_map(&e);
        pending.set(request_id, rule.approvers.clone());
        storage::set_pending_approvals_map(&e, &pending);

        // lock asset
        asset_pending.set(asset_id.clone(), request_id);
        storage::set_asset_pending_map(&e, &asset_pending);

        // history tracking per asset
        let mut hist = storage::asset_history_map(&e);
        let mut list = hist.get(asset_id.clone()).unwrap_or(Vec::new(&e));
        list.push_back(request_id);
        hist.set(asset_id.clone(), list);
        storage::set_asset_history_map(&e, &hist);

        events::transfer_requested(&e, request_id, &asset_id, &caller, &new_owner, now);

        Ok(request_id)
    }

    // ----------------------------
    // Approve request
    // ----------------------------
    pub fn approve_transfer_request(
        e: Env,
        caller: Address,
        request_id: u64,
    ) -> Result<(), MultiSigError> {
        let (_admin, _registry) = utils::require_init(&e)?;

        let mut requests = storage::requests_map(&e);
        let mut req = requests
            .get(request_id)
            .ok_or(MultiSigError::RequestNotFound)?;

        if req.status != RequestStatus::Pending {
            return Err(MultiSigError::RequestNotPending);
        }

        let now = utils::now(&e);
        if now > req.expires_at {
            return Err(MultiSigError::RequestExpired);
        }
        if now > req.approval_deadline {
            return Err(MultiSigError::ApprovalDeadlinePassed);
        }
        if caller == req.initiator {
            return Err(MultiSigError::CannotApproveOwnRequest);
        }

        // authorized approver?
        let rule = rules::get_rule(&e, &req.asset_category)?;
        if !is_authorized_approver(&rule.approvers, &caller) {
            return Err(MultiSigError::ApproverNotAuthorized);
        }

        // prevent double approval
        ensure_not_double_approved(&e, request_id, &caller)?;
        mark_approved(&e, request_id, &caller);

        req.received_approvals += 1;

        // update status if threshold met
        if req.received_approvals >= req.required_approvals {
            req.status = RequestStatus::Approved;
        }

        requests.set(request_id, req.clone());
        storage::set_requests_map(&e, &requests);

        events::transfer_approved(&e, request_id, &caller, req.received_approvals, now);

        Ok(())
    }

    // ----------------------------
    // Reject request
    // ----------------------------
    pub fn reject_transfer_request(
        e: Env,
        caller: Address,
        request_id: u64,
        reason_hash: BytesN<32>,
    ) -> Result<(), MultiSigError> {
        let (_admin, _registry) = utils::require_init(&e)?;

        let mut requests = storage::requests_map(&e);
        let mut req = requests
            .get(request_id)
            .ok_or(MultiSigError::RequestNotFound)?;

        if req.status != RequestStatus::Pending {
            return Err(MultiSigError::RequestNotPending);
        }

        let rule = rules::get_rule(&e, &req.asset_category)?;
        if !is_authorized_approver(&rule.approvers, &caller) {
            return Err(MultiSigError::ApproverNotAuthorized);
        }

        req.status = RequestStatus::Rejected;
        requests.set(request_id, req.clone());
        storage::set_requests_map(&e, &requests);

        // unlock asset
        let mut asset_pending = storage::asset_pending_map(&e);
        asset_pending.remove(req.asset_id.clone());
        storage::set_asset_pending_map(&e, &asset_pending);

        events::transfer_rejected(&e, request_id, &caller, &reason_hash, utils::now(&e));
        Ok(())
    }

    // ----------------------------
    // Execute transfer (anyone can trigger once approved)
    // ----------------------------
    pub fn execute_transfer(e: Env, caller: Address, request_id: u64) -> Result<(), MultiSigError> {
        let (_admin, registry_addr) = utils::require_init(&e)?;
        let _ = caller; // anyone can execute, kept for audit if desired

        let mut requests = storage::requests_map(&e);
        let mut req = requests
            .get(request_id)
            .ok_or(MultiSigError::RequestNotFound)?;

        if req.status != RequestStatus::Approved {
            return Err(MultiSigError::NotEnoughApprovals);
        }

        let now = utils::now(&e);
        if now > req.expires_at {
            return Err(MultiSigError::RequestExpired);
        }

        if let Some(unlock_time) = req.execute_after {
            if now < unlock_time {
                return Err(MultiSigError::ExecuteTooEarly);
            }
        }

        // registry transfer ownership
        registry::transfer_owner(&e, &registry_addr, &req.asset_id, &req.new_owner)?;

        req.status = RequestStatus::Executed;
        requests.set(request_id, req.clone());
        storage::set_requests_map(&e, &requests);

        // unlock asset
        let mut asset_pending = storage::asset_pending_map(&e);
        asset_pending.remove(req.asset_id.clone());
        storage::set_asset_pending_map(&e, &asset_pending);

        events::transfer_executed(&e, request_id, &req.asset_id, &req.new_owner, now);
        Ok(())
    }

    // ----------------------------
    // Cancel request (initiator or admin)
    // ----------------------------
    pub fn cancel_transfer_request(
        e: Env,
        caller: Address,
        request_id: u64,
    ) -> Result<(), MultiSigError> {
        let (admin, _registry) = utils::require_init(&e)?;

        let mut requests = storage::requests_map(&e);
        let mut req = requests
            .get(request_id)
            .ok_or(MultiSigError::RequestNotFound)?;

        if req.status != RequestStatus::Pending && req.status != RequestStatus::Approved {
            return Err(MultiSigError::RequestNotPending);
        }

        if caller != req.initiator && caller != admin {
            return Err(MultiSigError::Unauthorized);
        }

        req.status = RequestStatus::Cancelled;
        requests.set(request_id, req.clone());
        storage::set_requests_map(&e, &requests);

        // unlock asset
        let mut asset_pending = storage::asset_pending_map(&e);
        asset_pending.remove(req.asset_id.clone());
        storage::set_asset_pending_map(&e, &asset_pending);

        events::transfer_cancelled(&e, request_id, &caller, utils::now(&e));
        Ok(())
    }

    // ----------------------------
    // Queries
    // ----------------------------
    pub fn get_request(e: Env, request_id: u64) -> Result<TransferRequest, MultiSigError> {
        let requests = storage::requests_map(&e);
        requests
            .get(request_id)
            .ok_or(MultiSigError::RequestNotFound)
    }

    pub fn get_asset_history(e: Env, asset_id: BytesN<32>) -> Vec<u64> {
        let hist = storage::asset_history_map(&e);
        hist.get(asset_id).unwrap_or(Vec::new(&e))
    }

    pub fn get_pending_transfers_approver(e: Env, approver: Address) -> Vec<u64> {
        // gas-friendly simple scan approach. If scale grows, add reverse-index.
        let requests = storage::requests_map(&e);
        let mut result = Vec::new(&e);

        for (id, r) in requests.iter() {
            if r.status == RequestStatus::Pending {
                let rule = storage::rules_map(&e).get(r.asset_category.clone());
                if let Some(rule) = rule {
                    if approvals::is_authorized_approver(&rule.approvers, &approver) {
                        result.push_back(id);
                    }
                }
            }
        }

        result
    }

    pub fn get_required_approvers_category(
        e: Env,
        category: BytesN<32>,
    ) -> Result<Vec<Address>, MultiSigError> {
        let rule = rules::get_rule(&e, &category)?;
        Ok(rule.approvers)
    }
}
