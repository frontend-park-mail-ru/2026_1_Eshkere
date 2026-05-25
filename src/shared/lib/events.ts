export const OPEN_CAMPAIGN_DELETE_MODAL_EVENT = 'campaigns:open-delete-modal';
export const APP_ROUTE_REFRESH_EVENT = 'app:route-refresh';
export const SW_UPDATE_EVENT = 'app:sw-update-ready';

export interface SwUpdateReadyDetail {
  waitingWorker: ServiceWorker | null;
}
