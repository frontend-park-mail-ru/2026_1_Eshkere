export {
  getThreadByCampaign,
  listThreadMessages,
  sendThreadMessage,
  SUPPORT_CHAT_WS_PATH,
} from './api/support';

export {
  getAdminThreadByAd,
  sendAdminThreadMessage,
  sendModeratorSupportMessage,
} from './api/moderator';

export { sendOnceViaWs } from './lib/ws-send-once';
export type { SendOnceViaWsParams } from './lib/ws-send-once';

export { CampaignChatCoordinator, CampaignChatSession } from './lib/campaign-chat';
export type { CampaignChatCallbacks } from './lib/campaign-chat';

export { formatMessageTime, toChatMessageView } from './lib/format';

export type {
  SupportThread,
  SupportMessage,
  SupportMessageAuthor,
  SupportChatMessageView,
  SupportChatUiAuthor,
} from './model/types';
