import {
  buildExpiryNotifications,
  ExpirableLicense,
  ExpiryNotification,
  ExpiryOptions,
} from '../licenses/license-expiry';

export interface ExpirableItem extends ExpirableLicense {
  kind: 'LICENSE' | 'WARRANTY' | 'INSURANCE' | 'MAINTENANCE';
  ownerUserId?: string | null;
}

export interface AlertDispatchPlan {
  notificationKey: string;
  licenseId: string;
  ownerUserId: string | null;
  payload: ExpiryNotification & { kind: ExpirableItem['kind'] };
}

export function selectExpiryAlertPlans(
  items: ReadonlyArray<ExpirableItem>,
  options: ExpiryOptions = {},
): AlertDispatchPlan[] {
  const notifications = buildExpiryNotifications(items, options);
  const byId = new Map(items.map((item) => [item.id, item]));
  return notifications.map((notification) => {
    const item = byId.get(notification.licenseId);
    const kind = item?.kind ?? 'LICENSE';
    return {
      notificationKey: `${kind}:${notification.licenseId}:${notification.daysRemaining}`,
      licenseId: notification.licenseId,
      ownerUserId: item?.ownerUserId ?? null,
      payload: { ...notification, kind },
    };
  });
}

export function dedupeExpiryAlertPlans(
  plans: ReadonlyArray<AlertDispatchPlan>,
  alreadySentKeys: ReadonlySet<string>,
): AlertDispatchPlan[] {
  const seen = new Set<string>();
  const result: AlertDispatchPlan[] = [];
  for (const plan of plans) {
    if (alreadySentKeys.has(plan.notificationKey) || seen.has(plan.notificationKey)) continue;
    seen.add(plan.notificationKey);
    result.push(plan);
  }
  return result;
}
