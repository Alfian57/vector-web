import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import {
  accountUnavailablePath, adminPath, adminRequiredPath, officerPath, officerRequiredPath, radarPath, radarSection, radarSectionPath, signInFor,
} from "@/lib/routes";
import { getAccount } from "@/lib/server/auth";
import { dependencyFailure } from "@/lib/server/dependencies";

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const isOfficer = pathname === officerPath || pathname.startsWith(`${officerPath}/`);
  const isAdmin = pathname === adminPath || pathname.startsWith(`${adminPath}/`);
  const section = radarSection(searchParams.get("view"));
  const destination = isAdmin ? pathname : isOfficer ? officerPath : pathname === radarPath ? radarSectionPath(section) : null;
  if (!destination) return NextResponse.next();

  function redirect(path: string) {
    return NextResponse.redirect(new URL(path, request.url), {
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  if (!getSessionCookie(request)) return redirect(signInFor(destination));
  try {
    const account = await getAccount(request.headers);
    if (!account) return redirect(signInFor(destination));
    if (isOfficer && account.role !== "officer") return redirect(officerRequiredPath);
    if (isAdmin && account.role !== "admin") return redirect(adminRequiredPath);
    return NextResponse.next({ headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("VEKTOR dashboard access failed", dependencyFailure(error) ?? "service_unavailable");
    return redirect(accountUnavailablePath);
  }
}

export const config = { matcher: ["/radar", "/ppl/:path*", "/admin/:path*"] };
