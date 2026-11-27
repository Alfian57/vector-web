export const homePath = "/";
export const radarPath = "/radar";
export const officerPath = "/ppl";
export const adminPath = "/admin";
export const adminAccountsPath = `${adminPath}/accounts`;
export const adminEducationPath = `${adminPath}/education`;
export const adminLogsPath = `${adminPath}/logs`;
export const educationPath = "/edukasi";
export const signInPath = "/masuk";
export const whatsappLinkPath = `${signInPath}?mode=link`;

const privateRadarViews = ["reports", "plots", "alerts", "create"] as const;
export type RadarSection = "radar" | typeof privateRadarViews[number];

export function radarSection(view: string | null): RadarSection {
  return privateRadarViews.find((section) => section === view) ?? "radar";
}

export function radarSectionPath(section: RadarSection) {
  return section === "radar" ? radarPath : `${radarPath}?view=${section}`;
}

export const radarAlertsPath = radarSectionPath("alerts");
export const officerRequiredPath = `${radarPath}?notice=ppl-required`;
export const adminRequiredPath = `${radarPath}?notice=admin-required`;
export const accountUnavailablePath = `${signInPath}?notice=account-unavailable`;

export function signInFor(destination: string) {
  return `${signInPath}?next=${encodeURIComponent(destination)}`;
}

export function dashboardReturnPath(value: string | null) {
  if (value === officerPath || value === radarPath || (value !== null && [adminPath, adminAccountsPath, adminEducationPath, adminLogsPath].includes(value))) return value;
  return privateRadarViews.map(radarSectionPath).find((path) => path === value);
}
