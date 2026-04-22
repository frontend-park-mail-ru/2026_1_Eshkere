import { REQUEST_ERROR_EVENT_NAME } from 'widgets/request-error-modal';

import type { CampaignEditState } from './campaign-edit-types';

export function showCampaignEditRequestError(title: string, message: string): void {
  window.dispatchEvent(
    new CustomEvent(REQUEST_ERROR_EVENT_NAME, {
      detail: {
        title,
        message,
        note:
          'В этом разделе могут идти технические работы. Как только сервис снова станет доступен, действие можно будет повторить.',
      },
    }),
  );
}

export function getCampaignId(state: CampaignEditState): number | null {
  const campaignId = Number(state.id);
  return Number.isFinite(campaignId) && campaignId > 0 ? campaignId : null;
}
