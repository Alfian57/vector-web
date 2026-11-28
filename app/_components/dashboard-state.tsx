import { CircleAlert, CloudOff, Inbox, SearchX } from "lucide-react";
import type { ReactNode } from "react";

type DashboardSkeletonKind =
  | "table"
  | "map"
  | "form"
  | "report-form"
  | "metric"
  | "readiness"
  | "weather"
  | "trend"
  | "list"
  | "contacts"
  | "photo"
  | "editor"
  | "crop"
  | "auth"
  | "education-list"
  | "education-article"
  | "profile"
  | "workload"
  | "inline"
  | "panel";

type PageSkeletonKind =
  | "map"
  | "officer"
  | "table"
  | "form"
  | "report-form"
  | "review"
  | "allocation"
  | "overview"
  | "profile"
  | "workspace";

export function DashboardSkeleton({
  label = "Memuat data…",
  kind = "panel",
  rows,
  columns = 5,
  announce = true,
}: {
  label?: string;
  kind?: DashboardSkeletonKind;
  rows?: number;
  columns?: number;
  announce?: boolean;
}) {
  const visibleRows = rows ?? (kind === "table" ? 12 : 5);
  return (
    <div className={`dashboard-skeleton dashboard-skeleton--${kind}`} aria-busy="true">
      {announce && (
        <span className="sr-only" role="status">
          {label}
        </span>
      )}
      <SkeletonArt kind={kind} rows={visibleRows} columns={columns} />
    </div>
  );
}

function SkeletonArt({ kind, rows, columns }: { kind: DashboardSkeletonKind; rows: number; columns: number }) {
  if (kind === "table") return <TableArt rows={rows} columns={columns} />;
  if (kind === "map") return <MapArt />;
  if (kind === "form") return <FormArt rows={rows} />;
  if (kind === "report-form") return <ReportFormArt />;
  if (kind === "metric") return <MetricArt />;
  if (kind === "readiness") return <ReadinessArt items={rows > 1 ? rows : 1} />;
  if (kind === "weather") return <WeatherArt />;
  if (kind === "trend") return <TrendArt />;
  if (kind === "list") return <ListArt rows={rows} />;
  if (kind === "contacts") return <ContactArt rows={rows} />;
  if (kind === "photo") return <PhotoArt />;
  if (kind === "editor") return <EditorArt />;
  if (kind === "crop") return <CropArt />;
  if (kind === "auth") return <AuthArt />;
  if (kind === "education-list") return <EducationListArt />;
  if (kind === "education-article") return <EducationArticleArt />;
  if (kind === "profile") return <ProfileArt />;
  if (kind === "workload") return <WorkloadArt />;
  if (kind === "inline") return <InlineArt />;
  return <PanelArt rows={rows} />;
}

function TableArt({ rows, columns }: { rows: number; columns: number }) {
  const count = Math.max(1, Math.min(columns, 8));
  const grid =
    count === 2
      ? "minmax(0, 1.2fr) minmax(0, 1fr)"
      : count === 1
        ? "minmax(0, 1fr)"
        : `minmax(0, 1.35fr) repeat(${count - 1}, minmax(0, 1fr))`;

  return (
    <div className="dashboard-table-scroll dashboard-skeleton-table-scroll" aria-hidden="true">
      <div className={`dashboard-skeleton-table${count <= 2 ? " dashboard-skeleton-table--compact" : ""}`}>
        <div className="dashboard-skeleton-table-head" style={{ gridTemplateColumns: grid }}>
          {Array.from({ length: count }, (_, index) => (
            <i key={index} />
          ))}
        </div>
        {Array.from({ length: Math.max(1, rows) }, (_, row) => (
          <div className="dashboard-skeleton-table-row" key={row} style={{ gridTemplateColumns: grid }}>
            {Array.from({ length: count }, (_, column) => (
              <i key={column} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function FormArt({ rows }: { rows: number }) {
  return (
    <div className="dashboard-skeleton-form" aria-hidden="true">
      {Array.from({ length: Math.max(1, rows) }, (_, index) => (
        <div className="dashboard-skeleton-form-field" key={index}>
          <i className="dashboard-skeleton-label" />
          <i className="dashboard-skeleton-control" />
          {index === 1 && <i className="dashboard-skeleton-hint" />}
        </div>
      ))}
      <i className="dashboard-skeleton-button" />
    </div>
  );
}

function ReportFormArt() {
  return (
    <div className="dashboard-skeleton-report-form" aria-hidden="true">
      <div className="dashboard-skeleton-report-photo">
        <i />
        <span><i /><i /></span>
      </div>
      <div className="dashboard-skeleton-report-fields">
        <div><i /><i /><i /></div>
        <div><i /><i /></div>
      </div>
      <div className="dashboard-skeleton-report-notes"><i /><i /></div>
      <div className="dashboard-skeleton-report-location">
        <div><i /><i /></div>
        <div className="dashboard-skeleton-report-map" />
        <div className="dashboard-skeleton-report-coordinates"><i /><i /></div>
      </div>
      <i className="dashboard-skeleton-button" />
    </div>
  );
}

function MapArt() {
  return (
    <div className="dashboard-skeleton-map" aria-hidden="true">
      <div className="dashboard-skeleton-map-canvas">
        <svg viewBox="0 0 800 420" preserveAspectRatio="xMidYMid slice">
          <path d="M-30 80 155 150 247 70 366 166 512 91 830 205" />
          <path d="M35 450 180 320 272 360 380 245 525 306 690 198 840 262" />
          <path d="M75 -15 125 103 104 217 236 286 206 438" />
          <path d="M317 -20 290 107 366 204 337 438" />
          <path d="M565 -15 532 120 614 216 592 442" />
          <path d="M-15 220 175 205 298 230 450 185 832 140" />
        </svg>
        <i className="dashboard-skeleton-map-pin" />
        <i className="dashboard-skeleton-map-pin dashboard-skeleton-map-pin--secondary" />
      </div>
      <div className="dashboard-skeleton-map-controls">
        <i />
        <i />
      </div>
      <i className="dashboard-skeleton-map-legend" />
      <i className="dashboard-skeleton-map-attribution" />
    </div>
  );
}

function MetricArt() {
  return (
    <div className="dashboard-skeleton-metric" aria-hidden="true">
      <div className="dashboard-skeleton-metric-main">
        <i className="dashboard-skeleton-metric-value" />
        <i className="dashboard-skeleton-metric-title" />
        <i className="dashboard-skeleton-metric-caption" />
      </div>
      <div className="dashboard-skeleton-metric-stats">
        <span><i /><i /></span>
        <span><i /><i /></span>
      </div>
    </div>
  );
}

function ReadinessArt({ items = 1 }: { items?: number }) {
  return (
    <div
      className={`dashboard-skeleton-readiness${items > 1 ? " dashboard-skeleton-readiness--group" : ""}`}
      aria-hidden="true"
    >
      {items > 1 && <i className="dashboard-skeleton-readiness-heading" />}
      <div className="dashboard-skeleton-readiness-items">
        {Array.from({ length: items }, (_, index) => (
          <div className="dashboard-skeleton-readiness-item" key={index}>
            <i className="dashboard-skeleton-readiness-value" />
            <i className="dashboard-skeleton-readiness-copy" />
            {items === 1 && <i className="dashboard-skeleton-readiness-action" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function WeatherArt() {
  return (
    <div className="dashboard-skeleton-weather" aria-hidden="true">
      <div className="dashboard-skeleton-weather-humidity">
        <i className="dashboard-skeleton-weather-label" />
        <i className="dashboard-skeleton-weather-value" />
      </div>
      <div className="dashboard-skeleton-weather-wind">
        <i className="dashboard-skeleton-compass" />
        <span><i /><i /></span>
      </div>
      <i className="dashboard-skeleton-weather-observation" />
    </div>
  );
}

function TrendArt() {
  return (
    <div className="dashboard-skeleton-trend" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div className="dashboard-skeleton-trend-week" key={index}>
          <i className="dashboard-skeleton-trend-count" />
          <span className="dashboard-skeleton-trend-track">
            <i style={{ height: `${32 + ((index * 19) % 47)}%` }} />
          </span>
          <i className="dashboard-skeleton-trend-date" />
        </div>
      ))}
    </div>
  );
}

function ListArt({ rows }: { rows: number }) {
  return (
    <div className="dashboard-skeleton-list" aria-hidden="true">
      {Array.from({ length: Math.max(2, rows) }, (_, index) => (
        <div className="dashboard-skeleton-list-row" key={index}>
          <i className="dashboard-skeleton-list-icon" />
          <span><i /><i /></span>
        </div>
      ))}
    </div>
  );
}

function ContactArt({ rows }: { rows: number }) {
  return (
    <div className="dashboard-skeleton-contacts" aria-hidden="true">
      {Array.from({ length: Math.max(2, rows) }, (_, index) => (
        <div className="dashboard-skeleton-contact-row" key={index}>
          <i />
          <i />
        </div>
      ))}
    </div>
  );
}

function PhotoArt() {
  return (
    <div className="dashboard-skeleton-photo" aria-hidden="true">
      <i className="dashboard-skeleton-photo-image" />
      <div><i /><i /></div>
    </div>
  );
}

function EditorArt() {
  return (
    <div className="dashboard-skeleton-editor" aria-hidden="true">
      <div className="dashboard-skeleton-editor-fields">
        <div><i /><i /></div>
        <div><i /><i /></div>
        <div><i /><i /></div>
        <i className="dashboard-skeleton-editor-thumbnail" />
      </div>
      <div className="dashboard-skeleton-editor-writing">
        <i className="dashboard-skeleton-editor-label" />
        <div className="dashboard-skeleton-editor-toolbar">{Array.from({ length: 9 }, (_, index) => <i key={index} />)}</div>
        <div className="dashboard-skeleton-editor-page">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
    </div>
  );
}

function CropArt() {
  return (
    <div className="dashboard-skeleton-crop-backdrop" aria-hidden="true">
      <div className="dashboard-skeleton-crop">
        <header><i /><i /></header>
        <i className="dashboard-skeleton-crop-image" />
        <div className="dashboard-skeleton-crop-controls">
          <span><i /><i /></span>
          <div className="dashboard-skeleton-crop-rotate"><i /><i /></div>
          <span><i /><i /></span>
          <i className="dashboard-skeleton-crop-reset" />
        </div>
        <div className="dashboard-skeleton-crop-actions"><i /><i /></div>
      </div>
    </div>
  );
}

function AuthArt() {
  return (
    <div className="dashboard-skeleton-auth" aria-hidden="true">
      <div className="dashboard-skeleton-auth-brand"><i /><span><i /><i /></span></div>
      <div className="dashboard-skeleton-auth-card">
        <i className="dashboard-skeleton-auth-back" />
        <i className="dashboard-skeleton-auth-title" />
        <FormArt rows={2} />
        <div className="dashboard-skeleton-auth-links"><i /><i /></div>
      </div>
    </div>
  );
}

function EducationListArt() {
  return (
    <div className="dashboard-skeleton-education-list" aria-hidden="true">
      <header><i /><i /></header>
      <section><i /><i /><i /></section>
      <div className="dashboard-skeleton-education-search"><i /><i /></div>
      <div className="dashboard-skeleton-education-cards">
        {Array.from({ length: 4 }, (_, index) => (
          <article key={index}><i /><i /><i /><i /><i /></article>
        ))}
      </div>
    </div>
  );
}

function EducationArticleArt() {
  return (
    <div className="dashboard-skeleton-education-article" aria-hidden="true">
      <header><i /><i /></header>
      <article>
        <i className="dashboard-skeleton-education-back" />
        <i className="dashboard-skeleton-education-category" />
        <i className="dashboard-skeleton-education-title" />
        <i className="dashboard-skeleton-education-summary" />
        <i className="dashboard-skeleton-education-byline" />
        <i className="dashboard-skeleton-education-cover" />
        <div>{Array.from({ length: 8 }, (_, index) => <i key={index} />)}</div>
      </article>
    </div>
  );
}

function ProfileArt() {
  return (
    <div className="dashboard-skeleton-profile" aria-hidden="true">
      <div className="dashboard-skeleton-profile-card dashboard-skeleton-profile-identity">
        <i className="dashboard-skeleton-profile-heading" />
        <div className="dashboard-skeleton-profile-avatar"><i /><span><i /><i /></span></div>
        <i className="dashboard-skeleton-profile-dropzone" />
        <FormArt rows={1} />
        <div className="dashboard-skeleton-profile-contacts"><i /><i /></div>
      </div>
      <div className="dashboard-skeleton-profile-card dashboard-skeleton-profile-security">
        <i className="dashboard-skeleton-profile-heading" />
        <i className="dashboard-skeleton-profile-description" />
        <FormArt rows={3} />
      </div>
    </div>
  );
}

function PanelArt({ rows }: { rows: number }) {
  return (
    <div className="dashboard-skeleton-panel" aria-hidden="true">
      <i className="dashboard-skeleton-panel-heading" />
      {Array.from({ length: Math.max(2, rows) }, (_, index) => <i key={index} />)}
    </div>
  );
}

function WorkloadArt() {
  return (
    <div className="dashboard-skeleton-workload" aria-hidden="true">
      <i className="dashboard-skeleton-workload-heading" />
      <div className="dashboard-skeleton-workload-lead"><i /><span><i /><i /></span></div>
      <div className="dashboard-skeleton-workload-track"><i /><i /><i /></div>
      <div className="dashboard-skeleton-workload-labels">
        {Array.from({ length: 3 }, (_, index) => <span key={index}><i /><i /></span>)}
      </div>
    </div>
  );
}

function InlineArt() {
  return <span className="dashboard-skeleton-inline" aria-hidden="true"><i /></span>;
}

export function DashboardPageSkeleton({
  label,
  kind = "table",
}: {
  label?: string;
  kind?: PageSkeletonKind;
}) {
  return (
    <div className={`dashboard-theme dashboard-bootstrap dashboard-page-skeleton dashboard-page-skeleton--${kind}`} aria-busy="true">
      {label && <span className="sr-only" role="status">{label}</span>}
      <header className="dashboard-page-skeleton-heading" aria-hidden="true">
        <span><i /><i /></span>
        {!(["map", "officer", "overview", "workspace"].includes(kind)) && (
          <i className="dashboard-page-skeleton-action" />
        )}
      </header>
      {kind === "table" ? (
        <TablePageArt />
      ) : kind === "map" ? (
        <MapPageArt />
      ) : kind === "officer" ? (
        <OfficerPageArt />
      ) : kind === "overview" ? (
        <OverviewPageArt />
      ) : kind === "review" ? (
        <ReviewPageArt />
      ) : kind === "allocation" ? (
        <AllocationPageArt />
      ) : kind === "profile" ? (
        <DashboardSkeleton kind="profile" announce={false} />
      ) : kind === "workspace" ? (
        <WorkspacePageArt />
      ) : kind === "form" ? (
        <DashboardSkeleton kind="form" rows={4} announce={false} />
      ) : (
        <DashboardSkeleton kind="report-form" announce={false} />
      )}
    </div>
  );
}

function TablePageArt() {
  return (
    <div className="dashboard-page-skeleton-table-page" aria-hidden="true">
      <DashboardSkeleton kind="table" rows={12} announce={false} />
      <div className="dashboard-page-skeleton-pagination">
        <i />
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

function MapPageArt() {
  return (
    <div className="dashboard-page-skeleton-map-layout" aria-hidden="true">
      <div className="dashboard-page-skeleton-map-lead">
        <div className="dashboard-page-skeleton-overview-card">
          <div className="dashboard-page-skeleton-place"><i /><i /></div>
          <i className="dashboard-page-skeleton-card-title" />
          <DashboardSkeleton kind="metric" announce={false} />
        </div>
        <div className="dashboard-page-skeleton-map-card">
          <header><i /><i /></header>
          <DashboardSkeleton kind="map" announce={false} />
        </div>
      </div>
      <div className="dashboard-page-skeleton-map-widgets">
        <div className="dashboard-page-skeleton-widget dashboard-page-skeleton-widget--weather">
          <div className="dashboard-page-skeleton-widget-heading"><i /><i /></div>
          <DashboardSkeleton kind="weather" announce={false} />
        </div>
        <div className="dashboard-page-skeleton-widget dashboard-page-skeleton-widget--trend">
          <div className="dashboard-page-skeleton-widget-heading"><i /><i /></div>
          <DashboardSkeleton kind="trend" announce={false} />
        </div>
        <div className="dashboard-page-skeleton-widget dashboard-page-skeleton-widget--readiness">
          <div className="dashboard-page-skeleton-widget-heading"><i /></div>
          <DashboardSkeleton kind="readiness" rows={2} announce={false} />
        </div>
      </div>
      <div className="dashboard-page-skeleton-table-card">
        <i className="dashboard-page-skeleton-card-title" />
        <DashboardSkeleton kind="table" columns={4} rows={4} announce={false} />
      </div>
    </div>
  );
}

function OverviewPageArt() {
  return (
    <div className="dashboard-page-skeleton-overview" aria-hidden="true">
      <div className="dashboard-page-skeleton-overview-top">
        <DashboardSkeleton kind="workload" announce={false} />
        <div className="dashboard-page-skeleton-table-card">
          <i className="dashboard-page-skeleton-card-title" />
          <DashboardSkeleton kind="table" columns={3} rows={3} announce={false} />
        </div>
      </div>
      <div className="dashboard-page-skeleton-table-card">
        <i className="dashboard-page-skeleton-card-title" />
        <DashboardSkeleton kind="table" columns={3} rows={4} announce={false} />
      </div>
    </div>
  );
}

function OfficerPageArt() {
  return (
    <div className="dashboard-page-skeleton-officer" aria-hidden="true">
      <div className="dashboard-page-skeleton-map-card">
        <header><i /><i /></header>
        <DashboardSkeleton kind="map" announce={false} />
      </div>
      <div className="dashboard-page-skeleton-officer-queue">
        <div className="dashboard-page-skeleton-officer-heading"><i /><i /><i /></div>
        <DashboardSkeleton kind="table" columns={2} rows={3} announce={false} />
      </div>
    </div>
  );
}

function ReviewPageArt() {
  return (
    <div className="dashboard-page-skeleton-review" aria-hidden="true">
      <div className="dashboard-page-skeleton-review-main">
        <div className="dashboard-page-skeleton-review-card">
          <header><i /><i /></header>
          <DashboardSkeleton kind="photo" announce={false} />
          <div className="dashboard-page-skeleton-review-summary"><i /><i /><i /></div>
          <DashboardSkeleton kind="form" rows={3} announce={false} />
        </div>
        <div className="dashboard-page-skeleton-map-card">
          <header><i /><i /></header>
          <DashboardSkeleton kind="map" announce={false} />
        </div>
      </div>
      <div className="dashboard-page-skeleton-table-card">
        <i className="dashboard-page-skeleton-card-title" />
        <DashboardSkeleton kind="table" columns={6} rows={4} announce={false} />
      </div>
    </div>
  );
}

function AllocationPageArt() {
  return (
    <div className="dashboard-page-skeleton-allocation" aria-hidden="true">
      <div className="dashboard-page-skeleton-table-card">
        <i className="dashboard-page-skeleton-card-title" />
        <DashboardSkeleton kind="table" columns={6} rows={5} announce={false} />
      </div>
      <div className="dashboard-page-skeleton-table-card">
        <i className="dashboard-page-skeleton-card-title" />
        <DashboardSkeleton kind="table" columns={4} rows={3} announce={false} />
      </div>
    </div>
  );
}

function WorkspacePageArt() {
  return (
    <div className="dashboard-page-skeleton-workspace" aria-hidden="true">
      <DashboardSkeleton kind="map" announce={false} />
      <div>
        <DashboardSkeleton kind="metric" announce={false} />
        <div className="dashboard-page-skeleton-table-card">
          <i className="dashboard-page-skeleton-card-title" />
          <DashboardSkeleton kind="table" columns={3} rows={3} announce={false} />
        </div>
      </div>
    </div>
  );
}

export function DashboardState({
  title,
  description,
  kind = "empty",
  action,
  compact = false,
}: {
  title: string;
  description?: string;
  kind?: "empty" | "filtered" | "error" | "offline";
  action?: ReactNode;
  compact?: boolean;
}) {
  const Icon =
    kind === "error"
      ? CircleAlert
      : kind === "filtered"
        ? SearchX
        : kind === "offline"
          ? CloudOff
          : Inbox;
  return (
    <div
      className={`dashboard-state dashboard-state--${kind}${compact ? " dashboard-state--compact" : ""}`}
      role={kind === "error" ? "alert" : kind === "offline" ? "status" : undefined}
    >
      <div className="dashboard-state-icon">
        <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
      </div>
      <div className="dashboard-state-copy">
        <strong>{title}</strong>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="dashboard-state-action">{action}</div>}
    </div>
  );
}
