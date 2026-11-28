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
  dashboardReturnPath,
  isRouteWithin,
  signInFor,
  signInPath,
} from "@/lib/routes";
import { getAccount } from "@/lib/server/auth";
import { dependencyFailure } from "@/lib/server/dependencies";

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const isSignIn = pathname === signInPath;
  const isWhatsAppLink = searchParams.get("mode") === "link";
  const isOfficer = isRouteWithin(pathname, officerPath);
  const isAdmin = isRouteWithin(pathname, adminPath);
  const isRadar = isRouteWithin(pathname, radarPath);
  const query = new URLSearchParams(searchParams);
  query.delete("_rsc");
  const destination = dashboardReturnPath(
    isOfficer || isAdmin || isRadar ? `${pathname}${query.size ? `?${query}` : ""}` : null,
  );

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
      return redirect(dashboardReturnPath(searchParams.get("next"), account.role) ?? dashboardForRole(account.role));
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
    if (isRadar && account.role !== "farmer") return redirect(dashboardForRole(account.role));
    if (isOfficer && account.role !== "officer") {
      return redirect(account.role === "farmer" ? officerRequiredPath : dashboardForRole(account.role));
    }
    if (isAdmin && account.role !== "admin") {
      return redirect(account.role === "farmer" ? adminRequiredPath : dashboardForRole(account.role));
    }
    return continuePrivate();
  } catch (error) {
    console.error("VEKTOR dashboard access failed", dependencyFailure(error) ?? "service_unavailable");
    return redirect(accountUnavailablePath);
  }
}

export const config = { matcher: ["/", "/masuk", "/radar/:path*", "/ppl/:path*", "/admin/:path*"] };
