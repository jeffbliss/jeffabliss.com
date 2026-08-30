import { exchangeAccessCodeForAuthTokens, exchangeNpssoForAccessCode } from "psn-api";
import type { AuthorizationPayload } from "psn-api";

export async function authenticate(npsso: string): Promise<AuthorizationPayload> {
  const accessCode = await exchangeNpssoForAccessCode(npsso);
  const tokens = await exchangeAccessCodeForAuthTokens(accessCode);
  return { accessToken: tokens.accessToken };
}
