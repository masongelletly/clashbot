import type * as CRTypes from "../../../shared/types/cr-api-types";
import * as CRUtils from "../utils/utils.js";
import { crFetch } from "../crFetch.js";

/**
 * Get player badges from the badges endpoint
 * Note: Badges are also available in the player profile response
 */
export async function getPlayerBadges(
  playerTag: string
): Promise<CRTypes.PlayerBadgesResponse> {
  if (!playerTag?.trim()) throw new Error("playerTag is required");

  const encodedTag = CRUtils.encodeTag(playerTag);
  return crFetch<CRTypes.PlayerBadgesResponse>(`/players/${encodedTag}/badges`);
}

