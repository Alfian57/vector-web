import { tailwind } from "./literal";

export const coreClasses = {
  "account-name": tailwind(
    "[display:inline-flex] [align-items:center] [gap:7px] [font-size:.88rem] [font-weight:620] [overflow-wrap:anywhere] max-[700px]:[font-size:.76rem]",
  ),
  "action-row": tailwind("[display:flex] [flex-wrap:wrap] [align-items:center] [justify-content:flex-end] [gap:8px]"),
  "auth-card": tailwind("[display:grid] [gap:14px] [padding:clamp(16px,_4vw,_27px)]"),
  "auth-layout": tailwind("[margin:44px_auto] [display:grid] [width:min(100%_-_30px,_465px)] [gap:17px]"),
  "auth-password-control": tailwind("[margin-top:4px]"),
  "auth-password-field": tailwind("[display:grid] [gap:4px]"),
  "auth-password-input": tailwind(
    "[display:block] [min-height:42px] [width:100%] [border-radius:6px] [padding:8px_43px_8px_10px] [font-size:.9rem] [line-height:1.4] [font-weight:450] [color:var(--ink)] [background:#fff] [border:1px_solid_#c7d1c1]",
  ),
  brand: tailwind(
    "[display:inline-flex] [width:fit-content] [flex:0_0_auto] [align-items:center] [gap:11px] [color:var(--forest)] [&_small]:[margin-top:3px] [&_small]:[display:block] [&_small]:[font-size:.72rem] [&_small]:[white-space:nowrap] [&_small]:[color:var(--muted)] max-[380px]:[&_small]:[display:none] [&_strong]:[display:block] [&_strong]:[font-size:1.18rem] [&_strong]:[line-height:1.1] [&_strong]:[letter-spacing:.08em] [.sidebar_&]:[margin-inline:5px] max-[700px]:[.sidebar_&]:[margin:0]",
  ),
  "brand-mark": tailwind(
    "[display:grid] [place-items:center] [border-radius:11px] [color:var(--accent)] [background:var(--forest)] [block-size:43px] [inline-size:43px]",
  ),
  "button-row": tailwind(
    "[display:flex] [flex-wrap:wrap] [align-items:center] [gap:8px] [.panel-note_&]:[margin-top:8px]",
  ),
  connection: tailwind(
    "[display:inline-flex] [align-items:center] [gap:6px] [border-radius:999px] [padding:6px_10px] [font-size:.78rem] [font-weight:660] [white-space:nowrap] [color:var(--connection-color,#2c542a)] [background:var(--connection-bg,#e8efdf)]",
  ),
  "connection-offline": tailwind("[--connection-bg:#f5ead3] [--connection-color:#7b481c]"),
  content: tailwind(
    "[margin-inline:auto] [display:grid] [width:min(100%,_1480px)] [gap:18px] [padding:clamp(15px,_3vw,_36px)]",
  ),
  "dashboard-table": tailwind(
    "[width:100%] [border-collapse:collapse] [text-align:left] [font-size:.84rem] [&_td]:[min-width:80px] [&_td]:[padding:12px_14px] [&_td]:[vertical-align:top] [&_td]:[overflow-wrap:anywhere] [&_td]:[border-bottom:1px_solid_#e8ece3] [&_td_p]:[color:var(--muted)] [&_td_small]:[margin-top:4px] [&_td_small]:[display:block] [&_td_small]:[color:#718075] [&_th]:[padding:12px_14px] [&_th]:[vertical-align:top] [&_th]:[font-size:.73rem] [&_th]:[font-weight:700] [&_th]:[letter-spacing:.025em] [&_th]:[color:#66766a] [&_th]:[background:#f1f4eb] [&_th]:[border-bottom:1px_solid_#e8ece3] [&_tr:last-child_td]:[border-bottom:0]",
  ),
  "dashboard-table-wrap": tailwind("[max-width:100%] [min-width:0] [overflow-x:auto]"),
  danger: tailwind(
    "dashboard-button-danger [display:inline-flex] [min-height:42px] [width:fit-content] [align-items:center] [justify-content:center] [gap:8px] [border-radius:7px] [padding:9px_13px] [font-size:.87rem] [line-height:1.25] [font-weight:640] [color:#fff] [background:#9e3329] [border:1px_solid_transparent] [&:hover:not(:disabled)]:[background:#7e261e]",
  ),
  "district-popup": tailwind(
    "[display:grid] [justify-items:start] [gap:4px] [font-family:system-ui,_sans-serif] [line-height:1.4] [&_.tag]:[margin-top:3px] [&_p]:[margin:0] [&_p]:[font-size:.78rem] [&_strong]:[font-size:.94rem]",
  ),
  embedded: tailwind("[.auth-card_&]:[padding:0]"),
  empty: tailwind("[padding:17px] [font-size:.88rem] [color:var(--muted)] [border-top:1px_solid_var(--line)]"),
  "error-text": tailwind(
    "dashboard-error-text [color:var(--message-color,var(--safety))] [--message-color:var(--safety)] [.list_li_p&]:[--message-color:var(--safety)]",
  ),
  "field-form": tailwind(
    "dashboard-form [display:grid] [align-content:start] [gap:15px] [padding:clamp(15px,_3vw,_24px)] [&:not(.embedded)]:[width:100%] [&:not(.embedded)]:[max-width:720px] [&>button]:[justify-self:end]",
  ),
  "field-hint": tailwind("[margin-top:4px] [display:block] [font-size:.79rem] [font-weight:450] [color:var(--muted)]"),
  "field-optional": tailwind("[font-weight:450] [color:var(--muted)]"),
  "field-required": tailwind("[font-weight:750] [color:var(--safety)]"),
  "file-button": tailwind(
    "dashboard-file-button [position:relative] [cursor:pointer] [overflow:hidden] [&_input]:[position:absolute] [&_input]:[inset:0] [&_input]:[width:100%] [&_input]:[cursor:pointer] [&_input]:[opacity:0] [&:focus-within]:[outline:3px_solid_#64862e] [&:focus-within]:[outline-offset:3px]",
  ),
  "filter-label": tailwind(
    "[flex-shrink:0] [&_select]:[margin:0] [&_select]:[margin-top:4px] [&_select]:[min-height:37px]",
  ),
  "form-two": tailwind(
    "[display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:12px] max-[380px]:[grid-template-columns:minmax(0,_1fr)]",
  ),
  "hero-action": tailwind(
    "dashboard-button-primary [display:inline-flex] [min-height:42px] [width:fit-content] [flex-shrink:0] [align-items:center] [justify-content:center] [gap:8px] [border-radius:7px] [padding:9px_13px] [padding:11px_15px] [font-size:.87rem] [line-height:1.25] [font-weight:640] [color:#1d3922] [background:var(--accent)] [border:1px_solid_transparent] [&:hover]:[background:#e9f8bc]",
  ),
  "inline-note": tailwind(
    "dashboard-feedback [border-radius:6px] [padding:9px_12px] [color:var(--message-color,var(--safety))] [--message-color:#2f5738] [background:#e8efdf]",
  ),
  legend: tailwind(
    "[display:flex] [flex-wrap:wrap] [align-items:center] [gap:10px] [&_i]:[height:9px] [&_i]:[width:9px] [&_i]:[border-radius:2px] [&_span]:[display:flex] [&_span]:[align-items:center] [&_span]:[gap:5px] [&_span]:[font-size:.75rem]",
  ),
  "legend-cluster": tailwind("[background:#d75a3c]"),
  "legend-empty": tailwind("[background:#a5bba0]"),
  "legend-observed": tailwind("[background:#e9ac43]"),
  list: tailwind(
    "[margin:0] [padding:0] [list-style:none] [&_li]:[display:flex] [&_li]:[align-items:flex-start] [&_li]:[justify-content:space-between] [&_li]:[gap:9px] [&_li]:[padding:13px_17px] [&_li]:[overflow-wrap:anywhere] [&_li]:[border-top:1px_solid_var(--line)] [&_li_p]:[margin-top:3px] [&_li_p]:[font-size:.83rem] [&_li_p]:[color:var(--muted)] [&_li_p_svg]:[display:inline] [&_li_p_svg]:[vertical-align:text-bottom] [&_strong]:[font-size:.94rem] [&_strong]:[font-weight:650]",
  ),
  "location-label": tailwind(
    "[.radar-hero_&]:[display:flex] [.radar-hero_&]:[align-items:center] [.radar-hero_&]:[gap:6px] [.radar-hero_&]:[font-size:.84rem] [.radar-hero_&]:[color:#d9ed94]",
  ),
  "map-canvas": tailwind("[.map-frame>&]:[position:absolute] [.map-frame>&]:[inset:0]"),
  "map-footer": tailwind(
    "[display:flex] [flex-wrap:wrap] [align-items:center] [justify-content:space-between] [gap:9px] [padding:10px_15px] [font-size:.72rem] [color:var(--muted)] [&_a]:[text-decoration:underline]",
  ),
  "map-frame": tailwind(
    "[position:relative] [isolation:isolate] [min-height:clamp(310px,_40vw,_470px)] [background:#e2e8d4] [border-block:1px_solid_var(--line)] max-[700px]:[min-height:310px]",
  ),
  "map-message": tailwind(
    "[position:absolute] [bottom:10px] [left:10px] [z-index:1] [max-width:calc(100%_-_20px)] [border-radius:5px] [padding:6px_10px] [font-size:.82rem] [color:var(--muted)] [background:var(--surface)]",
  ),
  "map-picker": tailwind("[&_canvas]:[cursor:crosshair]"),
  message: tailwind(
    "dashboard-feedback [border-radius:6px] [padding:9px_12px] [color:var(--message-color,var(--safety))] [--message-color:#2f5738] [background:#e8efdf]",
  ),
  metric: tailwind(
    "[display:flex] [min-width:0] [align-items:center] [gap:12px] [border-radius:9px] [padding:16px] [background:var(--surface)] [border:1px_solid_var(--line)] max-[700px]:[flex-direction:column] max-[700px]:[align-items:flex-start] max-[700px]:[gap:5px] max-[700px]:[padding:9px_7px] [&_p]:[margin-top:3px] [&_p]:[font-size:.81rem] [&_p]:[overflow-wrap:anywhere] [&_p]:[color:var(--muted)] max-[700px]:[&_p]:[font-size:.72rem] [&_strong]:[font-size:1.57rem] [&_strong]:[line-height:1] [&_strong]:[color:var(--forest)] [&_strong]:[font-variant-numeric:tabular-nums] max-[700px]:[&_strong]:[font-size:1.33rem]",
  ),
  "metric-icon": tailwind(
    "[display:grid] [height:41px] [width:41px] [flex:0_0_auto] [place-items:center] [border-radius:8px] [color:#396247] [background:#edf2e3] max-[700px]:[height:29px] max-[700px]:[width:29px] max-[700px]:[&_svg]:[height:16px] max-[700px]:[&_svg]:[width:16px]",
  ),
  metrics: tailwind(
    "[display:grid] [grid-template-columns:repeat(3,_minmax(0,_1fr))] [gap:12px] max-[700px]:[gap:6px]",
  ),
  muted: tailwind("[font-size:.86rem] [color:var(--muted)]"),
  "officer-grid": tailwind("[grid-template-columns:minmax(0,_1.2fr)_minmax(300px,_1fr)]"),
  "page-heading": tailwind(
    "[display:flex] [flex-wrap:wrap] [align-items:center] [justify-content:space-between] [gap:12px] [&_p]:[margin-top:4px] [&_p]:[font-size:.88rem] [&_p]:[color:var(--muted)]",
  ),
  panel: tailwind(
    "dashboard-panel [min-width:0] [border-radius:11px] [background:var(--surface)] [border:1px_solid_var(--line)]",
  ),
  "panel-heading": tailwind(
    "dashboard-panel-heading [display:flex] [flex-wrap:wrap] [align-items:center] [justify-content:space-between] [gap:12px] [padding:16px_17px] [&_p]:[margin-top:4px] [&_p]:[font-size:.88rem] [&_p]:[color:var(--muted)] [.radar-panel_&]:[flex-wrap:nowrap] max-[700px]:[.radar-panel_&]:[flex-wrap:wrap]",
  ),
  "panel-note": tailwind("[padding:12px_17px]"),
  "photo-preview": tailwind("[max-height:185px] [max-width:min(100%,_320px)] [border-radius:6px] [object-fit:contain]"),
  primary: tailwind(
    "dashboard-button-primary [display:inline-flex] [min-height:42px] [width:fit-content] [align-items:center] [justify-content:center] [gap:8px] [border-radius:7px] [padding:9px_13px] [font-size:.87rem] [line-height:1.25] [font-weight:640] [color:#fff] [background:var(--forest)] [border:1px_solid_transparent] [&:hover:not(:disabled)]:[background:#24523c]",
  ),
  "radar-aside": tailwind(
    "[display:grid] [gap:14px] max-[1000px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[700px]:[grid-template-columns:minmax(0,_1fr)]",
  ),
  "radar-grid": tailwind(
    "[display:grid] [grid-template-columns:minmax(0,_1fr)_minmax(232px,_285px)] [align-items:start] [gap:16px] max-[1000px]:[grid-template-columns:minmax(0,_1fr)]",
  ),
  "radar-hero": tailwind(
    "[position:relative] [display:flex] [align-items:flex-end] [justify-content:space-between] [gap:22px] [overflow:hidden] [border-radius:13px] [padding:clamp(22px,_4vw,_40px)] [color:#f9fcf1] [background:var(--forest)] max-[700px]:[flex-direction:column] max-[700px]:[align-items:flex-start] max-[700px]:[gap:12px] [&_h1]:[margin:8px_0_10px] [&_h1]:[font-size:clamp(2.03rem,_4vw,_3.45rem)] [&_h1]:[color:#f9fcf1] [&_p]:[max-width:52ch] [&_p]:[font-size:.95rem] [&_p]:[color:#d4e3d3] [&::after]:[pointer-events:none] [&::after]:[position:absolute] [&::after]:[inset:-140px_-12px_auto_auto] [&::after]:[height:290px] [&::after]:[width:290px] [&::after]:[border-radius:50%] [&::after]:[opacity:.64] [&::after]:[box-shadow:0_0_0_34px_#365a44,_0_0_0_35px_#4d6b53,_0_0_0_69px_#2d523c,_0_0_0_70px_#46684e] [&::after]:[content:''] [&::after]:[border:1px_solid_#42634c] [&>*]:[z-index:1]",
  ),
  "radar-popup": tailwind(
    "[.map-frame_&_.maplibregl-popup-close-button]:[padding:3px_7px] [.map-frame_&_.maplibregl-popup-close-button]:[font-size:18px] [.map-frame_&_.maplibregl-popup-close-button]:[color:#203d37] [.map-frame_&_.maplibregl-popup-content]:[border-radius:7px] [.map-frame_&_.maplibregl-popup-content]:[padding:12px_30px_12px_13px] [.map-frame_&_.maplibregl-popup-content]:[color:#203d37] [.map-frame_&_.maplibregl-popup-content]:[box-shadow:0_2px_10px_#15271d36] [.map-frame_&_.maplibregl-popup-content]:[background:#fffdf5]",
  ),
  "reports-list": tailwind("[.queue-panel_&]:[max-height:460px] [.queue-panel_&]:[overflow-y:auto]"),
  "review-image": tailwind(
    "[margin:0_17px] [border-radius:8px] [background:#eef0e5] [&_img]:[display:block] [&_img]:[max-height:320px] [&_img]:[width:100%] [&_img]:[object-fit:contain]",
  ),
  "review-summary": tailwind(
    "[padding:11px_17px_0] [&_p]:[font-size:.86rem] [&_p]:[overflow-wrap:anywhere] [&_p]:[color:var(--muted)] [&_p_svg]:[display:inline] [&_p_svg]:[vertical-align:text-bottom]",
  ),
  secondary: tailwind(
    "dashboard-button-secondary [display:inline-flex] [min-height:42px] [width:fit-content] [align-items:center] [justify-content:center] [gap:8px] [border-radius:7px] [border-color:var(--line)] [padding:9px_13px] [font-size:.87rem] [line-height:1.25] [font-weight:640] [color:var(--forest)] [background:var(--surface)] [border:1px_solid_transparent] [&:hover:not(:disabled)]:[background:#edf2e7] max-[700px]:[.topbar_&]:[display:none] [.weather-panel>&]:[justify-self:end]",
  ),
  "section-title": tailwind(
    "[display:flex] [align-items:center] [gap:9px] [color:var(--forest)] [&_svg]:[flex-shrink:0]",
  ),
  "table-toolbar": tailwind("dashboard-table-toolbar"),
  sidebar: tailwind(
    "[position:sticky] [top:0] [display:flex] [height:100dvh] [min-height:100vh] [flex-direction:column] [padding:27px_17px_19px] [background:var(--surface)] [border-right:1px_solid_var(--line)] max-[700px]:[position:relative] max-[700px]:[display:grid] max-[700px]:[height:auto] max-[700px]:[min-height:auto] max-[700px]:[grid-template-columns:1fr_auto] max-[700px]:[padding:11px_13px_0] max-[700px]:[border-bottom:1px_solid_var(--line)] max-[700px]:[border-right:0] [&_nav]:[margin-top:40px] [&_nav]:[display:grid] [&_nav]:[gap:5px] max-[700px]:[&_nav]:[grid-column:1_/_-1] max-[700px]:[&_nav]:[grid-row:2] max-[700px]:[&_nav]:[margin-top:9px] max-[700px]:[&_nav]:[grid-template-columns:repeat(4,_minmax(0,_1fr))] max-[700px]:[&_nav]:[gap:3px] [&_nav_a]:[display:flex] [&_nav_a]:[width:100%] [&_nav_a]:[align-items:center] [&_nav_a]:[gap:12px] [&_nav_a]:[border-radius:8px] [&_nav_a]:[padding:11px_12px] [&_nav_a]:[text-align:left] [&_nav_a]:[font-size:.91rem] [&_nav_a]:[font-weight:590] [&_nav_a]:[color:var(--muted)] [&_nav_a]:[border:0] max-[700px]:[&_nav_a]:[display:grid] max-[700px]:[&_nav_a]:[min-height:44px] max-[700px]:[&_nav_a]:[justify-items:center] max-[700px]:[&_nav_a]:[gap:3px] max-[700px]:[&_nav_a]:[padding:6px_2px] max-[700px]:[&_nav_a]:[text-align:center] max-[700px]:[&_nav_a]:[font-size:.72rem] max-[700px]:[&_nav_a]:[line-height:1.2] max-[700px]:[&_nav_a_svg]:[height:17px] max-[700px]:[&_nav_a_svg]:[width:17px] [&_nav_a:hover]:[color:var(--forest)] [&_nav_a:hover]:[background:#eef1e7] [&_nav_a[aria-current=page]]:[color:var(--forest)] [&_nav_a[aria-current=page]]:[background:#e3eddb]",
  ),
  "sidebar-footer": tailwind(
    "[margin-top:auto] [display:grid] [gap:5px] [padding-top:12px] [border-top:1px_solid_var(--line)] max-[700px]:[grid-column:2] max-[700px]:[grid-row:1] max-[700px]:[margin:0] max-[700px]:[display:flex] max-[700px]:[align-items:center] max-[700px]:[gap:1px] max-[700px]:[padding:0] max-[700px]:[border:0] [&_a]:[display:flex] [&_a]:[width:100%] [&_a]:[align-items:center] [&_a]:[gap:12px] [&_a]:[border-radius:8px] [&_a]:[padding:11px_12px] [&_a]:[text-align:left] [&_a]:[font-size:.91rem] [&_a]:[font-weight:590] [&_a]:[color:var(--muted)] [&_a]:[border:0] max-[700px]:[&_a]:[min-height:42px] max-[700px]:[&_a]:[gap:5px] max-[700px]:[&_a]:[padding:5px] max-[700px]:[&_a]:[font-size:.75rem] max-[700px]:[&_a]:[white-space:nowrap] [&_a:hover]:[color:var(--forest)] [&_a:hover]:[background:#eef1e7] [&_button]:[display:flex] [&_button]:[width:100%] [&_button]:[align-items:center] [&_button]:[gap:12px] [&_button]:[border-radius:8px] [&_button]:[padding:11px_12px] [&_button]:[text-align:left] [&_button]:[font-size:.91rem] [&_button]:[font-weight:590] [&_button]:[color:var(--muted)] [&_button]:[border:0] max-[700px]:[&_button]:[min-height:42px] max-[700px]:[&_button]:[gap:5px] max-[700px]:[&_button]:[padding:5px] max-[700px]:[&_button]:[font-size:.75rem] max-[700px]:[&_button]:[white-space:nowrap] [&_button:hover]:[color:var(--forest)] [&_button:hover]:[background:#eef1e7] max-[700px]:[&_svg]:[width:15px]",
  ),
  small: tailwind("[font-size:.79rem]"),
  "small-map": tailwind(
    "[.location-fields_&]:[min-height:245px] [.location-fields_&]:[overflow:hidden] [.location-fields_&]:[border-radius:7px] [.location-fields_&]:[border:1px_solid_var(--line)]",
  ),
  tag: tailwind(
    "dashboard-tag [flex:0_0_auto] [border-radius:5px] [padding:4px_7px] [font-size:.73rem] [font-weight:620] [color:var(--tag-color,#3c5741)] [background:var(--tag-bg,#e9efe4)]",
  ),
  "tag-alert": tailwind("dashboard-tag-danger [--tag-bg:#f7e2d9] [--tag-color:#8c352b]"),
  "tag-pending": tailwind("dashboard-tag-pending [--tag-bg:#f9edcc] [--tag-color:#795121]"),
  "tag-rejected": tailwind("dashboard-tag-danger [--tag-bg:#f7e2d9] [--tag-color:#8c352b]"),
  "tag-verified": tailwind("dashboard-tag-verified [--tag-bg:#e4efda] [--tag-color:#385a2b]"),
  "text-link": tailwind(
    "dashboard-text-link [display:inline-flex] [width:fit-content] [align-items:center] [gap:4px] [color:#2c6040] [text-underline-offset:3px] [text-decoration:underline]",
  ),
  topbar: tailwind(
    "[display:flex] [min-height:70px] [align-items:center] [justify-content:space-between] [gap:10px] [padding:10px_clamp(15px,_3vw,_38px)] [background:var(--surface)] [border-bottom:1px_solid_var(--line)] max-[700px]:[min-height:42px] max-[700px]:[background:var(--paper)]",
  ),
  "topbar-actions": tailwind(
    "[display:flex] [flex-wrap:wrap] [align-items:center] [justify-content:flex-end] [gap:8px]",
  ),
  "weather-list": tailwind(
    "[margin:0] [&_dd]:[margin:0] [&_dd]:[font-weight:660] [&_dd]:[white-space:nowrap] [&_div]:[display:flex] [&_div]:[align-items:center] [&_div]:[justify-content:space-between] [&_div]:[gap:7px] [&_div]:[padding:9px_0] [&_div]:[font-size:.81rem] [&_div]:[border-bottom:1px_solid_var(--line)] [&_dt]:[display:flex] [&_dt]:[align-items:center] [&_dt]:[gap:6px] [&_dt]:[color:var(--muted)]",
  ),
  "weather-panel": tailwind("[display:grid] [gap:10px] [padding:16px]"),
  workspace: tailwind(
    "[display:grid] [min-height:100vh] [grid-template-columns:218px_minmax(0,_1fr)] max-[1000px]:[grid-template-columns:177px_minmax(0,_1fr)] max-[700px]:[display:block]",
  ),
} as const;
