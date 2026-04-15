export { getAds } from './api/get-ads';
export { createAdCampaign } from './api/create-ad-campaign';
export { updateAdCampaign } from './api/update-ad-campaign';
export { deleteAdCampaign } from './api/delete-ad-campaign';
export {
  getAdGroups,
  createAdGroup,
  updateAdGroup,
  deleteAdGroup,
} from './api/ad-groups';
export {
  getAdsInGroup,
  createAdInGroup,
  updateAdInGroup,
  deleteAdInGroup,
} from './api/ads';
export type {
  AdCampaignResponse,
  AdCampaignStatus,
  CreateAdCampaignRequest,
  CreateAdCampaignResponse,
  ListAdCampaignsResponse,
  UpdateAdCampaignRequest,
} from './api/contracts';
export type {
  GenderType,
  AdGroupResponse,
  ListAdGroupsResponse,
  CreateAdGroupRequest,
  CreateAdGroupResponse,
  UpdateAdGroupRequest,
} from './api/ad-groups';
export type {
  AdResponse,
  ListAdsResponse,
  CreateAdRequest,
  CreateAdResponse,
  UpdateAdRequest,
} from './api/ads';
