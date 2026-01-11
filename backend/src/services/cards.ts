import type * as CRTypes from "../../../shared/types/cr-api-types";
import { crFetch } from "../crFetch.js";

export async function getAllCards(): Promise<CRTypes.CardsResponse> {
  return crFetch<CRTypes.CardsResponse>("/cards");
}

