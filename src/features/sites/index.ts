export {
  createPartnerBlock,
  deletePartnerBlock,
  getPartnerBlock,
  getPartnerBlockEmbed,
  listPartnerBlocks,
  updatePartnerBlockGeneral,
  updatePartnerBlockGeography,
  updatePartnerBlockMeta,
  updatePartnerBlockSelfAd,
} from './api/partner-blocks';
export type {
  CreatePartnerBlockBody,
  CreatePartnerBlockResponse,
  GeoRule,
  ListPartnerBlocksResponse,
  PartnerBlockDetailsDto,
  PartnerBlockEmbedDto,
  PartnerBlockListItemDto,
  UpdatePartnerBlockGeneralBody,
  UpdatePartnerBlockGeographyBody,
  UpdatePartnerBlockMetaBody,
  UpdatePartnerBlockMetaResponse,
} from './api/partner-blocks';
export {
  createPartnerSite,
  deletePartnerSite,
  getPartnerSite,
  listPartnerSites,
  updatePartnerSite,
} from './api/partner-sites';
export type {
  CreatePartnerSiteBody,
  CreatePartnerSiteResponse,
  ListPartnerSitesResponse,
  PartnerSiteDto,
  UpdatePartnerSiteBody,
} from './api/partner-sites';
export {
  partnerSiteStatusBadgeType,
  partnerSiteStatusRu,
  partnerSiteToggleChecked,
  partnerSiteToggleEditable,
} from './model/partner-site-status';
export type { PartnerSiteStatus } from './model/partner-site-status';
export {
  partnerBlockStatusBadgeType,
  partnerBlockStatusRu,
  partnerBlockToggleChecked,
} from './model/partner-block-status';
export type { PartnerBlockStatus } from './model/partner-block-status';
