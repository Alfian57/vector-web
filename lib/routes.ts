import type { AccountRole } from "@/lib/domain";

export const homePath = "/";
export const radarPath = "/radar";
export const radarReportsPath = `${radarPath}/reports`;
export const radarPlotsPath = `${radarPath}/plots`;
export const officerPath = "/ppl";
export const officerReportsPath = `${officerPath}/reports`;
export const officerFollowUpsPath = `${officerPath}/follow-ups`;
export const officerFollowUpDialogPath = (dialog: "broadcast" | "follow-up") =>
  `${officerFollowUpsPath}?dialog=${dialog}`;
export const officerAidPath = `${officerPath}/aid-allocations`;
export const officerAidCreateDialogPath = () => `${officerAidPath}?dialog=create`;
export const adminPath = "/admin";
export const adminAccountsPath = `${adminPath}/accounts`;
export const adminEducationPath = `${adminPath}/education`;
export const adminLogsPath = `${adminPath}/logs`;
export const profilePath = "/profil";
export const educationPath = "/edukasi";
export const signInPath = "/masuk";
export const whatsappLinkPath = `${signInPath}?mode=link`;
export const officerRequiredPath = `${radarPath}?notice=ppl-required`;
export const adminRequiredPath = `${radarPath}?notice=admin-required`;
export const accountUnavailablePath = `${signInPath}?notice=account-unavailable`;

export const educationArticlePath = (slug: string) => `${educationPath}/${encodeURIComponent(slug)}`;
export const radarReportEditPath = (id: string) => `${radarReportsPath}/${encodeURIComponent(id)}/edit`;
export const officerReportPath = (id: string) => `${officerReportsPath}/${encodeURIComponent(id)}`;
export const officerReportCorrectPath = (id: string) => `${officerReportPath(id)}/correct`;
export const officerAllocationPath = (id: string) => `${officerAidPath}/${encodeURIComponent(id)}`;
export const adminAccountManagePath = (id: string) =>
  `${adminAccountsPath}?manage=${encodeURIComponent(id)}`;
export const adminArticleEditPath = (id: string) => `${adminEducationPath}?edit=${encodeURIComponent(id)}`;

export function isRouteWithin(pathname: string, parent: string) {
  return pathname === parent || pathname.startsWith(`${parent}/`);
}

const radarScreens = {
  radar: radarPath,
  reports: radarReportsPath,
  plots: radarPlotsPath,
} as const;

export type RadarSection = keyof typeof radarScreens;
export type RadarScreen = { section: RadarSection } | { section: "edit"; id: string };

export function radarSectionPath(section: RadarSection) {
  return radarScreens[section];
}

const uuidSegment = "[\\da-fA-F]{8}(?:-[\\da-fA-F]{4}){3}-[\\da-fA-F]{12}";
const radarEditPattern = new RegExp(`^${radarReportsPath}/(${uuidSegment})/edit$`);
const accountIdPattern = /^\w[\w-]*$/;

export function isAccountRouteId(id: string) {
  return accountIdPattern.test(id);
}

export function radarScreen(pathname: string): RadarScreen | undefined {
  const section = (Object.keys(radarScreens) as RadarSection[]).find((key) => radarScreens[key] === pathname);
  if (section) return { section };
  const match = radarEditPattern.exec(pathname);
  return match ? { section: "edit", id: match[1] } : undefined;
}

export function signInFor(destination: string) {
  return `${signInPath}?next=${encodeURIComponent(destination)}`;
}

export function dashboardForRole(role: AccountRole) {
  return role === "admin" ? adminPath : role === "officer" ? officerPath : radarPath;
}

const dashboardPaths = new Set([
  officerPath,
  officerReportsPath,
  officerFollowUpsPath,
  officerAidPath,
  adminPath,
  adminAccountsPath,
  adminEducationPath,
  adminLogsPath,
  profilePath,
]);

const dashboardDetails = [
  `${officerReportsPath}/${uuidSegment}(?:/correct)?`,
  `${officerAidPath}/${uuidSegment}`,
];
const dashboardDetailPattern = new RegExp(`^(?:${dashboardDetails.join("|")})$`);

export function dashboardReturnPath(value: string | null, role?: AccountRole): string | undefined {
  if (!value?.startsWith("/") || value.startsWith("//") || /[\\\\#\r\n\t]/.test(value)) return undefined;
  const [pathname] = value.split("?");
  const radarPage = radarScreen(pathname);
  const officerPage = isRouteWithin(pathname, officerPath) &&
    (dashboardPaths.has(pathname) || dashboardDetailPattern.test(pathname));
  const adminPage = isRouteWithin(pathname, adminPath) && dashboardPaths.has(pathname);
  if (!radarPage && !dashboardPaths.has(pathname) && !dashboardDetailPattern.test(pathname)) return undefined;
  if (
    (role === "farmer" && (officerPage || adminPage)) ||
    (role === "officer" && (radarPage || adminPage)) ||
    (role === "admin" && (radarPage || officerPage))
  )
    return undefined;
  return value;
}
