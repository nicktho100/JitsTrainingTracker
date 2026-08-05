import { env } from "cloudflare:workers";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type CloudflareAccessUser = {
  id: string;
  displayName: string;
  email: string;
};

type AccessEnvironment = {
  POLICY_AUD?: string;
  TEAM_DOMAIN?: string;
};

const jwksByTeamDomain = new Map<
  string,
  ReturnType<typeof createRemoteJWKSet>
>();

export async function getCloudflareAccessUser(): Promise<CloudflareAccessUser | null> {
  const requestHeaders = await headers();
  const token = requestHeaders.get("cf-access-jwt-assertion");
  const accessEnv = env as unknown as AccessEnvironment;
  const audience = accessEnv.POLICY_AUD?.trim();
  const teamDomain = normalizeTeamDomain(accessEnv.TEAM_DOMAIN);

  if (!token || !audience || !teamDomain) return null;

  try {
    let jwks = jwksByTeamDomain.get(teamDomain);
    if (!jwks) {
      jwks = createRemoteJWKSet(
        new URL(`${teamDomain}/cdn-cgi/access/certs`),
      );
      jwksByTeamDomain.set(teamDomain, jwks);
    }

    const { payload } = await jwtVerify(token, jwks, {
      issuer: teamDomain,
      audience,
      clockTolerance: 5,
    });

    const email = typeof payload.email === "string" ? payload.email : null;
    if (!email) return null;

    return {
      id: payload.sub ?? email.toLowerCase(),
      displayName: email,
      email,
    };
  } catch {
    return null;
  }
}

export async function requireCloudflareAccessUser(): Promise<CloudflareAccessUser> {
  const user = await getCloudflareAccessUser();
  if (user) return user;
  redirect("/access-required");
}

export function cloudflareAccessSignOutPath(): string {
  return "/cdn-cgi/access/logout";
}

function normalizeTeamDomain(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}
