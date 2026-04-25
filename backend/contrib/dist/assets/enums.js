"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaintenanceStatus = exports.MaintenanceType = exports.AssetHistoryAction = void 0;
var AssetHistoryAction;
(function (AssetHistoryAction) {
    AssetHistoryAction["CREATED"] = "CREATED";
    AssetHistoryAction["UPDATED"] = "UPDATED";
    AssetHistoryAction["DELETED"] = "DELETED";
    AssetHistoryAction["RESTORED"] = "RESTORED";
})(AssetHistoryAction || (exports.AssetHistoryAction = AssetHistoryAction = {}));
var MaintenanceType;
(function (MaintenanceType) {
    MaintenanceType["PREVENTIVE"] = "PREVENTIVE";
    MaintenanceType["CORRECTIVE"] = "CORRECTIVE";
    MaintenanceType["SCHEDULED"] = "SCHEDULED";
})(MaintenanceType || (exports.MaintenanceType = MaintenanceType = {}));
var MaintenanceStatus;
(function (MaintenanceStatus) {
    MaintenanceStatus["SCHEDULED"] = "SCHEDULED";
    MaintenanceStatus["IN_PROGRESS"] = "IN_PROGRESS";
    MaintenanceStatus["COMPLETED"] = "COMPLETED";
    MaintenanceStatus["CANCELLED"] = "CANCELLED";
})(MaintenanceStatus || (exports.MaintenanceStatus = MaintenanceStatus = {}));
//# sourceMappingURL=enums.js.map