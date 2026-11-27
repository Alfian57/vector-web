import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import {
  accountUnavailablePath,
  adminPath,
  adminRequiredPath,
  dashboardForRole,
  officerPath,
  officerRequiredPath,
  radarPath,
  radarSection,
  radarSectionPath,
  signInFor,
  signInPath,
} from "@/lib/routes";
import { getAccount } from "@/lib/server/auth";
import { dependencyFailure } from "@/lib/server/dependencies";

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const isSignIn = pathname === signInPath;
  const isWhatsAppLink = searchParams.get("mode") === "link";
  const isOfficer = pathname === officerPath || pathname.startsWith(`${officerPath}/`);
  const isAdmin = pathname === adminPath || pathname.startsWith(`${adminPath}/`);
  const section = radarSection(searchParams.get("view"));
  const destination = isAdmin
    ? pathname
    : isOfficer
      ? officerPath
      : pathname === radarPath
        ? radarSectionPath(section)
        : null;
  if (!destination && !isSignIn) return NextResponse.next();

  function redirect(path: string) {
    return NextResponse.redirect(new URL(path, request.url), {
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  function continuePrivate() {
    return NextResponse.next({ headers: { "Cache-Control": "private, no-store" } });
  }

  if (isSignIn) {
    if (!getSessionCookie(request)) return isWhatsAppLink ? redirect(signInPath) : continuePrivate();
    try {
      const account = await getAccount(request.headers);
      if (!account) return isWhatsAppLink ? redirect(signInPath) : continuePrivate();
      if (isWhatsAppLink) return continuePrivate();
      return redirect(dashboardForRole(account.role));
    } catch (error) {
      console.error("VEKTOR sign-in redirect check failed", dependencyFailure(error) ?? "service_unavailable");
      return continuePrivate();
    }
  }

  if (!destination) return NextResponse.next();
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

export const config = { matcher: ["/masuk", "/radar", "/ppl/:path*", "/admin/:path*"] };
