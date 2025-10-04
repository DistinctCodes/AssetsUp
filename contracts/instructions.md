Description: Extend the asset.rs and branch.rs contracts to support transferring assets between branches, logging the action in audit_log.rs.

Tasks:

Add a transfer_asset(asset_id, new_branch_id) function to asset.rs.
Update branch.rs to remove the asset from the old branch’s asset list and add it to the new branch’s list.
Call audit_log.rs’s log_action to record the Transferred action.
Enforce access control (only asset owner or admin).
Write tests for asset transfer and audit logging.
Use errors.rs for errors (e.g., BranchNotFound).

Acceptance Criteria:

Assets can be transferred between branches.
Transfers are logged in audit_log.rs.
Branch asset lists are updated correctly.
Tests confirm transfer functionality and access control.
Contracts compile without errors.
