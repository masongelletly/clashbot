import type * as CRTypes from "../../../shared/types/cr-api-types";
import * as CRUtils from "../utils/utils.js";
import * as CRErrors from "../errors/cr-errors.js";

import { crFetch } from "../crFetch.js";


export async function scanClanForPlayer(
  input: Omit<CRTypes.scanClanForPlayerInput, "apiKey">
): Promise<CRTypes.scanClanForPlayerResponse[]> {
  const { playerName, clanName, maxClansToScan = 50 } = input;

  if (!playerName?.trim()) throw new Error("playerName is required");
  if (!clanName?.trim()) throw new Error("clanName is required");

  // find the provided clan
  const clanSearch = await crFetch<CRTypes.ClanSearchResponse>(
    `/clans?name=${encodeURIComponent(clanName)}`
  );

  const candidates = (clanSearch.items ?? []).slice(0, maxClansToScan);
  if (candidates.length === 0) {
    throw new CRErrors.ClashRoyaleApiError(
      `No clans found matching clanName="${clanName}".`
    );
  }

  // retrieve every player that has the provided name
  const desiredName = CRUtils.normalizeName(playerName);
  const matches: CRTypes.scanClanForPlayerResponse[] = [];

  for (const clan of candidates) {
    const members = await crFetch<CRTypes.ClanMembersResponse>(
      `/clans/${CRUtils.encodeTag(clan.tag)}/members`
    );

    for (const m of members.items ?? []) {
      if (CRUtils.normalizeName(m.name) === desiredName) {
        matches.push({
          playerTag: m.tag,
          playerName: m.name,
          clanTag: clan.tag,
          clanName: clan.name,
          role: m.role,
          matchedMemberName: m.name,
          matchedTrophies: m.trophies,
        });
        return matches;
      }
    }
  }

  return matches;
}
