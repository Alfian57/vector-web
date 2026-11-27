import {
  accountAvatar,
  deleteAccountAvatar,
  getAccountProfile,
  saveAccountAvatar,
  updateAccountProfile,
} from "../profile";
import { json } from "../http";
import type { ApiRouteContext } from "./shared";

export async function handleProfileApi({
  request,
  segments,
  endpoint,
  method,
  account,
}: ApiRouteContext): Promise<Response | null> {
  if (endpoint === "profile") {
    if (method === "GET") return json(await getAccountProfile(account));
    if (method === "PATCH") return json(await updateAccountProfile(account, await request.json()));
  }
  if (segments.length === 2 && endpoint === "profile/avatar") {
    if (method === "GET") return accountAvatar(account);
    if (method === "POST") return json(await saveAccountAvatar(account, request), 201);
    if (method === "DELETE") return json(await deleteAccountAvatar(account));
  }
  return null;
}
