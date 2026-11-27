import { z } from "zod";
import { aidAllocationInput, aidDeliveryInput, findLabel, followUpInput, position, reportInput } from "./domain";
import type {
  Account,
  AccountProfile,
  ActivityLog,
  DashboardSearchResponse,
  AdminOverview,
  AdminSearchResults,
  AidAllocation,
  AidAllocations,
  AidCorrection,
  AidDelivery,
  AidHistory,
  Alert,
  District,
  EducationArticle,
  EducationArticleSummary,
  FollowUp,
  FollowUpEntry,
  MapPackage,
  Page,
  Plot,
  RadarSnapshot,
  Report,
  ReviewEntry,
  Weather,
} from "./domain";

const accountRole = z.enum(["farmer", "officer", "admin"]);
const educationStatus = z.enum(["draft", "published", "archived"]);
const severity = z.enum(["mild", "moderate", "severe"]);
const reportStatus = z.enum(["pending", "verified", "rejected"]);

export const accountSchema: z.ZodType<Account> = z.object({
  id: z.string().min(1),
  name: z.string(),
  role: accountRole,
  whatsappLinked: z.boolean().optional(),
  image: z.string().nullable().optional(),
});

export const sessionSchema = accountSchema.nullable();

export const accountProfileSchema: z.ZodType<AccountProfile> = z.object({
  name: z.string(),
  role: accountRole,
  email: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  image: z.string().nullable(),
});

const educationArticleBaseSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  category: z.string(),
  summary: z.string(),
  content: z.record(z.string(), z.unknown()),
  status: educationStatus,
  author: z.string(),
  updatedAt: z.iso.datetime(),
  publishedAt: z.iso.datetime().nullable(),
});

export const educationArticleSchema: z.ZodType<EducationArticle> = educationArticleBaseSchema;
export const educationArticleSummarySchema: z.ZodType<EducationArticleSummary> = educationArticleBaseSchema.omit({
  content: true,
});

export const activityLogSchema: z.ZodType<ActivityLog> = z.object({
  id: z.string(),
  kind: z.enum(["audit", "system"]),
  category: z.string(),
  action: z.string(),
  outcome: z.enum(["success", "failure"]),
  severity: z.enum(["warn", "error"]).nullable(),
  actorId: z.string().nullable(),
  actorName: z.string().nullable(),
  actorRole: accountRole.nullable(),
  targetType: z.string().nullable(),
  targetId: z.string().nullable(),
  summary: z.string(),
  createdAt: z.iso.datetime(),
});

export const adminOverviewSchema: z.ZodType<AdminOverview> = z.object({
  asOf: z.iso.datetime(),
  accounts: z.object({
    total: z.number().int(),
    banned: z.number().int(),
    farmers: z.number().int(),
    officers: z.number().int(),
    admins: z.number().int(),
  }),
  reports: z.object({ pending: z.number().int(), verified: z.number().int(), rejected: z.number().int() }),
  education: z.object({ draft: z.number().int(), published: z.number().int() }),
  worker: z.array(
    z.object({
      job: z.string(),
      lastAttemptAt: z.iso.datetime(),
      lastSuccessAt: z.iso.datetime().nullable(),
      lastErrorCode: z.string().nullable(),
    }),
  ),
  push: z.object({ pending: z.number().int(), failed: z.number().int() }),
  weatherFetchedAt: z.iso.datetime().nullable(),
});

export const adminSearchResultsSchema: z.ZodType<AdminSearchResults> = z.object({
  accounts: z.array(
    z.object({ id: z.string(), name: z.string(), email: z.string(), role: accountRole, banned: z.boolean() }),
  ),
  education: z.array(z.object({ id: z.string(), title: z.string(), category: z.string(), status: educationStatus })),
  logs: z.array(
    z.object({
      id: z.string(),
      action: z.string(),
      category: z.string(),
      summary: z.string(),
      createdAt: z.iso.datetime(),
    }),
  ),
});

export const dashboardSearchResponseSchema: z.ZodType<DashboardSearchResponse> = z.object({
  entries: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(["report", "plot", "alert", "follow-up", "aid-allocation", "education"]),
      label: z.string(),
      description: z.string(),
      href: z.string(),
    }),
  ),
});

export const reportSchema: z.ZodType<Report> = reportInput.extend({
  status: reportStatus,
  severity: severity.nullable(),
  reviewNote: z.string().nullable(),
  reviewRevision: z.number().int().nonnegative(),
  districtId: z.string(),
  districtName: z.string(),
});

export const reportPageResponseSchema = z.object({ reports: z.array(reportSchema), hasMore: z.boolean() });

export const plotSchema: z.ZodType<Plot> = position.extend({
  id: z.string(),
  name: z.string(),
  districtName: z.string(),
});

export const alertSchema: z.ZodType<Alert> = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  createdAt: z.iso.datetime(),
  districtName: z.string(),
  read: z.boolean(),
});

const followUpBaseSchema = followUpInput.extend({
  updatedAt: z.iso.datetime(),
  districtName: z.string(),
});

export const followUpSchema: z.ZodType<FollowUp> = followUpBaseSchema;
export const followUpEntrySchema: z.ZodType<FollowUpEntry> = followUpBaseSchema.extend({
  id: z.string(),
  author: z.string(),
});

export const reviewEntrySchema: z.ZodType<ReviewEntry> = z.object({
  status: reportStatus,
  finding: findLabel,
  severity: severity.nullable(),
  reviewNote: z.string().nullable(),
  reviewRevision: z.number().int().nonnegative(),
  reason: z.string().nullable(),
  reviewer: z.string().nullable(),
  recordedAt: z.iso.datetime(),
});

export const aidAllocationSchema: z.ZodType<AidAllocation> = aidAllocationInput.extend({
  districtName: z.string(),
  deliveredQuantity: z.number().int().nonnegative(),
  revision: z.number().int().nonnegative(),
});

export const aidDeliverySchema: z.ZodType<AidDelivery> = aidDeliveryInput.extend({
  recordedAt: z.iso.datetime(),
  revision: z.number().int().nonnegative(),
  voided: z.boolean(),
});

const allocationCorrectionSnapshot = z.object({
  districtName: z.string(),
  item: z.string(),
  quantity: z.number().int(),
  unit: z.string(),
  note: z.string(),
});
const deliveryCorrectionSnapshot = z.object({
  recipient: z.string(),
  quantity: z.number().int(),
  note: z.string(),
  voided: z.boolean(),
});
const correctionSnapshot = z.union([allocationCorrectionSnapshot, deliveryCorrectionSnapshot]);

export const aidCorrectionSchema: z.ZodType<AidCorrection> = z.object({
  id: z.string(),
  kind: z.enum(["allocation", "delivery", "void-delivery"]),
  reason: z.string(),
  previous: correctionSnapshot,
  current: correctionSnapshot,
  author: z.string(),
  recordedAt: z.iso.datetime(),
});

export const aidAllocationsSchema: z.ZodType<AidAllocations> = z.object({
  allocations: z.array(aidAllocationSchema),
  hasMore: z.boolean(),
});

export const aidHistorySchema: z.ZodType<AidHistory> = z.object({
  deliveries: z.array(aidDeliverySchema),
  hasMore: z.boolean(),
});

export const radarSnapshotSchema: z.ZodType<RadarSnapshot> = z.object({
  updatedAt: z.iso.datetime(),
  summaries: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      finding: findLabel,
      count: z.number().int().nonnegative(),
      clustered: z.boolean(),
    }),
  ),
  trend: z
    .array(z.object({ startOn: z.iso.date(), endOn: z.iso.date(), count: z.number().int().nonnegative() }))
    .optional(),
});

export const weatherSchema: z.ZodType<Weather> = z.object({
  observedAt: z.iso.datetime(),
  fetchedAt: z.iso.datetime(),
  windSpeed: z.number(),
  windDirection: z.number(),
  humidity: z.number(),
});

export const mapPackageSchema: z.ZodType<MapPackage> = z.object({
  url: z.string().min(1),
  version: z.string(),
  bytes: z.number().int().nonnegative(),
  mapTilerKey: z.string().optional(),
});

export const districtSchema: z.ZodType<District> = z.object({ id: z.string(), name: z.string() });
export const districtCollectionSchema = z.object({ features: z.array(z.object({ properties: districtSchema })) });

export const adminAccountsResponseSchema = z.object({
  accounts: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      phoneNumber: z.string().nullable(),
      role: z.string(),
      banned: z.boolean(),
      banReason: z.string().nullable(),
      createdAt: z.iso.datetime(),
    }),
  ),
  hasMore: z.boolean(),
});

export function pageSchema<T>(entry: z.ZodType<T>): z.ZodType<Page<T>> {
  return z.object({ entries: z.array(entry), hasMore: z.boolean() });
}

export const subscriptionStatusSchema = z.object({ subscribed: z.boolean() });
export const pushKeySchema = z.object({ key: z.string().nullable() });
export const avatarImageResponseSchema = z.object({ image: z.string().min(1) });
export const educationSaveResponseSchema = z.object({ id: z.string(), slug: z.string(), status: educationStatus });
export const educationImageResponseSchema = z.object({ src: z.string().min(1) });
