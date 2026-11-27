import { z } from "zod";

export const findings = {
  unknown: "Belum diketahui",
  healthy: "Sehat",
  blast: "Blas daun",
  blight: "Hawar daun bakteri",
  tungro: "Tungro",
  planthopper: "Wereng batang cokelat",
  brown_spot: "Bercak cokelat",
} as const;

export const severities = {
  mild: "Ringan",
  moderate: "Sedang",
  severe: "Berat",
} as const;

export const statuses = {
  pending: "Menunggu verifikasi",
  verified: "Terverifikasi",
  rejected: "Ditolak",
} as const;

export const findLabel = z.enum(Object.keys(findings) as (keyof typeof findings)[]);
const severity = z.enum(Object.keys(severities) as (keyof typeof severities)[]);
export const uuid = z.uuid();
const note = z.string().trim().max(600);
export const position = z.object({
  longitude: z.number().gte(-180).lte(180),
  latitude: z.number().gte(-90).lte(90),
});
export const reportInput = position.extend({
  id: uuid,
  observedAt: z.iso.datetime(),
  finding: findLabel,
  notes: note,
});
export const reviewInput = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("verified"),
    finding: findLabel.exclude(["unknown"]),
    severity,
    note,
  }),
  z.object({ status: z.literal("rejected"), note: note.min(1) }),
]);
const correction = z.object({ revision: z.int().nonnegative(), reason: note.min(1) });
export const reviewCorrectionInput = reviewInput.and(correction);
export const plotInput = position.extend({ name: z.string().trim().min(1).max(80) });
const districtId = z.string().regex(/^[a-z0-9-]{1,50}$/);
export const broadcastInput = z.object({
  id: uuid.optional(),
  districtId,
  title: z.string().trim().min(1).max(100),
  body: note.min(1),
});
export const followUpInput = z.object({
  districtId,
  kind: z.enum(["outreach", "assistance"]),
  status: z.enum(["planned", "complete"]),
  note: note.min(1),
});
export const followUpSubmission = followUpInput.extend({ id: uuid.optional() });
export const maxAidQuantity = 1_000_000;
const aidQuantity = z.int().min(1).max(maxAidQuantity);
export const aidAllocationInput = z.object({
  id: uuid,
  districtId,
  item: z.string().trim().min(1).max(100),
  quantity: aidQuantity,
  unit: z.string().trim().min(1).max(30),
  note: note.default(""),
});
export const aidDeliveryInput = z.object({
  id: uuid,
  recipient: z.string().trim().min(1).max(100),
  quantity: aidQuantity,
  note: note.default(""),
});
export const aidCorrectionInput = z.discriminatedUnion("target", [
  correction.extend(aidAllocationInput.omit({ id: true }).shape).extend({ target: z.literal("allocation") }),
  correction
    .extend(aidDeliveryInput.omit({ id: true }).shape)
    .extend({ target: z.literal("delivery"), deliveryId: uuid }),
  correction.extend({ target: z.literal("void-delivery"), deliveryId: uuid }),
]);
export const subscriptionInput = z.object({
  endpoint: z
    .url()
    .max(2048)
    .refine((value) => {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        !url.port &&
        (["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"].includes(url.hostname) ||
          url.hostname.endsWith(".push.apple.com"))
      );
    }, "Layanan push perangkat ini belum didukung."),
  keys: z.object({
    p256dh: z.string().regex(/^[\w-]{87}$/),
    auth: z.string().regex(/^[\w-]{22}$/),
  }),
});

export type Position = z.infer<typeof position>;
export type Finding = z.infer<typeof findLabel>;
export type ReportInput = z.infer<typeof reportInput>;
export type ReviewInput = z.infer<typeof reviewInput>;
export type ReviewCorrection = z.infer<typeof reviewCorrectionInput>;
export type AccountRole = "farmer" | "officer" | "admin";
export type Account = { id: string; name: string; role: AccountRole; whatsappLinked?: boolean; image?: string | null };
export type AccountProfile = {
  name: string;
  role: AccountRole;
  email: string | null;
  phoneNumber: string | null;
  image: string | null;
};
export type EducationStatus = "draft" | "published" | "archived";
export type EducationArticle = {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  content: Record<string, unknown>;
  status: EducationStatus;
  author: string;
  updatedAt: string;
  publishedAt: string | null;
};
export type EducationArticleSummary = Omit<EducationArticle, "content">;
export type ActivityLog = {
  id: string;
  kind: "audit" | "system";
  category: string;
  action: string;
  outcome: "success" | "failure";
  severity: "warn" | "error" | null;
  actorId: string | null;
  actorName: string | null;
  actorRole: AccountRole | null;
  targetType: string | null;
  targetId: string | null;
  summary: string;
  createdAt: string;
};
export type AdminOverview = {
  asOf: string;
  accounts: { total: number; banned: number; farmers: number; officers: number; admins: number };
  reports: { pending: number; verified: number; rejected: number };
  education: { draft: number; published: number };
  worker: Array<{ job: string; lastAttemptAt: string; lastSuccessAt: string | null; lastErrorCode: string | null }>;
  push: { pending: number; failed: number };
  weatherFetchedAt: string | null;
};
export type AdminSearchResults = {
  accounts: Array<{ id: string; name: string; email: string; role: AccountRole; banned: boolean }>;
  education: Array<{ id: string; title: string; category: string; status: EducationStatus }>;
  logs: Array<{ id: string; action: string; category: string; summary: string; createdAt: string }>;
};
export type DashboardSearchKind = "report" | "plot" | "alert" | "follow-up" | "aid-allocation" | "education";
export type DashboardSearchEntry = {
  id: string;
  kind: DashboardSearchKind;
  label: string;
  description: string;
  href: string;
};
export type DashboardSearchResponse = { entries: DashboardSearchEntry[] };
export type Report = ReportInput & {
  status: keyof typeof statuses;
  severity: keyof typeof severities | null;
  reviewNote: string | null;
  reviewRevision: number;
  districtId: string;
  districtName: string;
};
export type ReviewEntry = Pick<Report, "status" | "finding" | "severity" | "reviewNote" | "reviewRevision"> & {
  reason: string | null;
  reviewer: string | null;
  recordedAt: string;
};
export type Plot = Position & { id: string; name: string; districtName: string };
export type Alert = { id: string; title: string; body: string; createdAt: string; districtName: string; read: boolean };
export type FollowUp = z.infer<typeof followUpInput> & { updatedAt: string; districtName: string };
export type FollowUpEntry = FollowUp & { id: string; author: string };
export type Page<T> = { entries: T[]; hasMore: boolean };
export type District = { id: string; name: string };
export type AidAllocation = z.infer<typeof aidAllocationInput> & {
  districtName: string;
  deliveredQuantity: number;
  revision: number;
};
export type AidDelivery = z.infer<typeof aidDeliveryInput> & { recordedAt: string; revision: number; voided: boolean };
export type AidCorrection = {
  id: string;
  kind: z.infer<typeof aidCorrectionInput>["target"];
  reason: string;
  previous:
    | Pick<AidAllocation, "districtName" | "item" | "quantity" | "unit" | "note">
    | Pick<AidDelivery, "recipient" | "quantity" | "note" | "voided">;
  current: AidCorrection["previous"];
  author: string;
  recordedAt: string;
};
export type AidAllocations = { allocations: AidAllocation[]; hasMore: boolean };
export type AidHistory = { deliveries: AidDelivery[]; hasMore: boolean };
export type DistrictSummary = {
  id: string;
  name: string;
  finding: Finding;
  count: number;
  clustered: boolean;
};
export type ObservedWeek = { startOn: string; endOn: string; count: number };
export type RadarSnapshot = { updatedAt: string; summaries: DistrictSummary[]; trend?: ObservedWeek[] };
export type Weather = {
  observedAt: string;
  fetchedAt: string;
  windSpeed: number;
  windDirection: number;
  humidity: number;
};
export type MapPackage = { url: string; version: string; bytes: number; mapTilerKey?: string };
export const mapCenter: [number, number] = [107.34, -6.28];
export const mapBounds: [[number, number], [number, number]] = [
  [106.97, -6.63],
  [107.74, -5.85],
];
export const districtPath = "/maps/karawang-districts.geojson";
export const maxPhotoBytes = 1_500_000;

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}
