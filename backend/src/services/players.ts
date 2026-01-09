import * as CRTypes from "../../../shared/types/cr-api-types";
import * as CRUtils from "../utils/utils";
import { crFetch } from "../crFetch"; 


export async function getPlayerDetails(
  playerTag: string
): Promise<CRTypes.PlayerProfileResponse> {
  if (!playerTag?.trim()) throw new Error("playerTag is required");

  const encodedTag = CRUtils.encodeTag(playerTag);
  return crFetch<CRTypes.PlayerProfileResponse>(`/players/${encodedTag}`);
}
