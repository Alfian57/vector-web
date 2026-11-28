import { tailwind } from "./literal";

export const adminClasses = {
  "action-row": tailwind("[.admin-toolbar>&]:[margin-left:auto]"),
  "admin-article-editor": tailwind("[padding:18px]"),
  "admin-badge": tailwind(
    "dashboard-tag [display:inline-flex] [align-items:center] [gap:5px] [border-radius:999px] [padding:4px_8px] [font-size:.73rem] [font-weight:660] [white-space:nowrap] [color:var(--admin-badge-color,#3d613e)] [background:var(--admin-badge-bg,#e9efdf)]",
  ),
  "admin-content": tailwind(
    "[margin-inline:auto] [display:grid] [width:min(100%,_1500px)] [gap:20px] [padding:clamp(16px,_3vw,_36px)] max-[680px]:[padding:17px_14px]",
  ),
  "admin-editor-dialog": tailwind(
    "[width:min(440px,_calc(100vw_-_28px))] [max-width:440px] [max-height:calc(100dvh_-_32px)] [overflow-y:auto] [margin:auto] [border-radius:12px] [padding:0] [color:var(--ink)] [box-shadow:0_22px_70px_#16291d38] [background:var(--surface)] [border:1px_solid_var(--line)] [&_button:focus-visible]:[outline:3px_solid_#64862e66] [&_button:focus-visible]:[outline-offset:2px] [&_h2]:[font-size:1.18rem] [&_h2]:[color:var(--forest)] [&::backdrop]:[background:#16291d66]",
  ),
  "admin-editor-dialog-actions": tailwind("[display:flex] [justify-content:flex-end] [gap:8px] [padding-top:3px]"),
  "admin-editor-dialog-content": tailwind(
    "[display:grid] [gap:13px] [padding:22px] [&>p:not(.admin-feedback)]:[font-size:.86rem] [&>p:not(.admin-feedback)]:[line-height:1.55] [&>p:not(.admin-feedback)]:[color:var(--muted)]",
  ),
  "admin-editor-dialog-form": tailwind(
    "[display:grid] [gap:13px] [padding:22px] [&_input]:[min-height:42px] [&_input]:[width:100%] [&_input]:[border-radius:7px] [&_input]:[padding:9px_11px] [&_input]:[font-size:.88rem] [&_input]:[color:var(--ink)] [&_input]:[background:#fffefb] [&_input]:[border:1px_solid_#cbd5c8] [&_input]:[font:inherit] [&_input:focus-visible]:[outline:3px_solid_#64862e66] [&_input:focus-visible]:[outline-offset:2px] [&_label]:[display:grid] [&_label]:[gap:6px] [&_label]:[font-size:.82rem] [&_label]:[font-weight:630] [&_label]:[color:#34483a]",
  ),
  "admin-feedback": tailwind(
    "dashboard-feedback [border-radius:7px] [padding:10px_13px] [font-size:.86rem] [color:var(--admin-feedback-color,#36573c)] [background:var(--admin-feedback-bg,#e9f0e1)]",
  ),
  "admin-field-label": tailwind(
    "[margin-bottom:5px] [display:block] [font-size:.8rem] [font-weight:630] [color:#34483a]",
  ),
  "admin-form": tailwind(
    "dashboard-form [display:grid] [gap:13px] [&_input]:[min-height:42px] [&_input]:[width:100%] [&_input]:[border-radius:7px] [&_input]:[padding:9px_11px] [&_input]:[color:var(--ink)] [&_input]:[background:#fffefb] [&_input]:[border:1px_solid_#cbd5c8] [&_input]:[font:inherit] [&_label]:[display:grid] [&_label]:[gap:5px] [&_label]:[font-size:.8rem] [&_label]:[font-weight:630] [&_label]:[color:#34483a] [&_label_span]:[font-weight:460] [&_label_span]:[color:var(--muted)] [&_select]:[min-height:42px] [&_select]:[width:100%] [&_select]:[border-radius:7px] [&_select]:[padding:9px_11px] [&_select]:[color:var(--ink)] [&_select]:[background:#fffefb] [&_select]:[border:1px_solid_#cbd5c8] [&_select]:[font:inherit] [&_textarea]:[min-height:42px] [&_textarea]:[min-height:98px] [&_textarea]:[width:100%] [&_textarea]:[resize:vertical] [&_textarea]:[border-radius:7px] [&_textarea]:[padding:9px_11px] [&_textarea]:[color:var(--ink)] [&_textarea]:[background:#fffefb] [&_textarea]:[border:1px_solid_#cbd5c8] [&_textarea]:[font:inherit] [&>button]:[justify-self:end]",
  ),
  "admin-global-search-trigger": tailwind(
    "[position:relative] [margin-right:auto] [display:flex] [min-height:40px] [max-width:470px] [min-width:0] [flex:1] [align-items:center] [gap:9px] [border-radius:8px] [padding:0_10px] [color:#66766a] [background:#fffefb] [border:1px_solid_#d4ddd0] max-[680px]:[margin-right:0] max-[680px]:[min-height:42px] max-[680px]:[width:100%] max-[680px]:[max-width:none] [&_input]:[min-width:0] [&_input]:[flex:1] [&_input]:[cursor:pointer] [&_input]:[font-size:.84rem] [&_input]:[color:var(--ink)] [&_input]:[outline:0] [&_input]:[background:transparent] [&_input]:[border:0] [&_input]:[font:inherit] [&_input::placeholder]:[color:#718075] [&_input::placeholder]:[opacity:1] [&_kbd]:[border-radius:5px] [&_kbd]:[padding:3px_6px] [&_kbd]:[font-family:inherit] [&_kbd]:[font-size:.68rem] [&_kbd]:[line-height:1.2] [&_kbd]:[font-weight:600] [&_kbd]:[white-space:nowrap] [&_kbd]:[color:#647367] [&_kbd]:[background:#f4f6f1] [&_kbd]:[border:1px_solid_#dce3d9] max-[420px]:[&_kbd]:hidden [&:focus-within]:[border-color:#62835a] [&:focus-within]:[box-shadow:0_0_0_3px_#62835a20] [&:focus-within]:[outline:3px_solid_#62835a66] [&:focus-within]:[outline-offset:2px] [&>svg]:[flex:0_0_auto]",
  ),
  "admin-heading": tailwind(
    "[display:flex] [flex-wrap:wrap] [align-items:flex-end] [justify-content:space-between] [gap:14px] [&_p]:[margin-top:5px] [&_p]:[max-width:68ch] [&_p]:[font-size:.9rem] [&_p]:[line-height:1.5] [&_p]:[color:var(--muted)]",
  ),
  "admin-help": tailwind("[font-size:.78rem] [font-weight:450] [color:var(--muted)]"),
  "admin-layout": tailwind(
    "[display:grid] [min-height:100vh] [grid-template-columns:226px_minmax(0,_1fr)] max-[940px]:[grid-template-columns:190px_minmax(0,_1fr)] max-[680px]:[display:block]",
  ),
  "admin-log-action": tailwind("[font-family:ui-monospace,_monospace] [font-size:.75rem]"),
  "admin-main": tailwind("[min-width:0]"),
  "admin-panel": tailwind(
    "dashboard-panel [min-width:0] [overflow:hidden] [border-radius:10px] [background:var(--surface)] [border:1px_solid_var(--line)]",
  ),
  "admin-panel-body": tailwind(
    "[padding:17px_18px] [&_p]:[font-size:.86rem] [&_p]:[line-height:1.5] [&_p]:[color:var(--muted)]",
  ),
  "admin-required": tailwind("![font-weight:730] ![color:#b3261e]"),
  "admin-row-actions": tailwind(
    "[display:flex] [flex-wrap:wrap] [align-items:center] [justify-content:flex-end] [gap:6px]",
  ),
  "admin-search-close": tailwind(
    "[display:grid] [height:32px] [width:32px] [place-items:center] [border-radius:6px] [color:#68776c] [background:transparent] [border:0] [&:focus-visible]:[outline:3px_solid_#62835a66] [&:focus-visible]:[outline-offset:2px] [&:hover]:[color:var(--forest)] [&:hover]:[background:#edf1e7]",
  ),
  "admin-search-copy": tailwind(
    "[display:grid] [min-width:0] [gap:3px] [&_small]:[overflow:hidden] [&_small]:[font-size:.74rem] [&_small]:[text-overflow:ellipsis] [&_small]:[white-space:nowrap] [&_small]:[color:#728075] [&_strong]:[overflow:hidden] [&_strong]:[font-size:.84rem] [&_strong]:[font-weight:660] [&_strong]:[text-overflow:ellipsis] [&_strong]:[white-space:nowrap] [&_strong]:[color:#304236]",
  ),
  "admin-search-dialog": tailwind(
    "[max-height:min(780px,_82dvh)] [width:min(680px,_calc(100vw_-_32px))] [max-width:680px] [overflow:hidden] [border-radius:13px] [padding:0] [color:var(--ink)] [box-shadow:0_22px_75px_#16291d38] [background:#fffefb] [border:1px_solid_#dce3d9] max-[680px]:[inset:auto_0_0] max-[680px]:[margin:0] max-[680px]:[max-height:88dvh] max-[680px]:[width:100vw] max-[680px]:[max-width:none] max-[680px]:[border-radius:14px_14px_0_0] max-[680px]:[border-bottom:0] max-[680px]:[border-left:0] max-[680px]:[border-right:0] [&::backdrop]:[background:#16291d66]",
  ),
  "admin-search-error": tailwind(
    "[margin:0] [padding:22px_12px] [text-align:center] [font-size:.83rem] [color:#872d25] [color:#718075]",
  ),
  "admin-search-field": tailwind(
    "[display:flex] [min-height:62px] [align-items:center] [gap:11px] [padding:10px_15px] [color:var(--forest)] [border-bottom:1px_solid_#e5eae1] [&_input]:[min-width:0] [&_input]:[flex:1] [&_input]:[padding:9px_0] [&_input]:[font-size:.96rem] [&_input]:[color:var(--ink)] [&_input]:[outline:0] [&_input]:[background:transparent] [&_input]:[border:0] [&_input]:[font:inherit] [&_input::placeholder]:[color:#87938a] [&_input::placeholder]:[opacity:1] [&_kbd]:[border-radius:5px] [&_kbd]:[padding:3px_6px] [&_kbd]:[font-family:inherit] [&_kbd]:[font-size:.68rem] [&_kbd]:[line-height:1.2] [&_kbd]:[font-weight:600] [&_kbd]:[white-space:nowrap] [&_kbd]:[color:#647367] [&_kbd]:[background:#f4f6f1] [&_kbd]:[border:1px_solid_#dce3d9] max-[420px]:[&_kbd]:hidden [&:focus-within]:[box-shadow:inset_0_-2px_#62835a] [&>svg]:[flex:0_0_auto]",
  ),
  "admin-search-footer": tailwind(
    "[display:flex] [justify-content:space-between] [gap:12px] [padding:10px_15px] [font-size:.69rem] [color:#7a877d] [border-top:1px_solid_#e8ece3] max-[680px]:[align-items:center] max-[680px]:[font-size:.65rem] [&_kbd]:[border-radius:5px] [&_kbd]:[padding:3px_6px] [&_kbd]:[font-family:inherit] [&_kbd]:[font-size:.68rem] [&_kbd]:[line-height:1.2] [&_kbd]:[font-weight:600] [&_kbd]:[white-space:nowrap] [&_kbd]:[color:#647367] [&_kbd]:[background:#f4f6f1] [&_kbd]:[border:1px_solid_#dce3d9] max-[420px]:[&_kbd]:hidden",
  ),
  "admin-search-group": tailwind(
    "[padding:6px_0_9px] [&_h2]:[margin:0] [&_h2]:[display:flex] [&_h2]:[align-items:center] [&_h2]:[gap:7px] [&_h2]:[padding:7px_10px_5px] [&_h2]:[font-size:.69rem] [&_h2]:[font-weight:720] [&_h2]:[letter-spacing:.035em] [&_h2]:[color:#78857b] [&_h2_span]:[display:inline-grid] [&_h2_span]:[height:19px] [&_h2_span]:[min-width:19px] [&_h2_span]:[place-items:center] [&_h2_span]:[border-radius:20px] [&_h2_span]:[font-size:.65rem] [&_h2_span]:[letter-spacing:0] [&_h2_span]:[color:#526b55] [&_h2_span]:[background:#eef2ea] [&_li_a]:[display:flex] [&_li_a]:[min-width:0] [&_li_a]:[align-items:center] [&_li_a]:[gap:11px] [&_li_a]:[border-radius:6px] [&_li_a]:[padding:9px_10px] [&_li_a]:[color:#34483a] [&_li_a]:[border-left:3px_solid_transparent] [&_li_a]:[text-decoration:none] [&_li_a:focus-visible]:[border-left-color:#52774c] [&_li_a:focus-visible]:[outline:0] [&_li_a:focus-visible]:[outline:3px_solid_#62835a66] [&_li_a:focus-visible]:[outline-offset:2px] [&_li_a:focus-visible]:[background:#f1f5ed] [&_li_a:hover]:[border-left-color:#52774c] [&_li_a:hover]:[outline:0] [&_li_a:hover]:[background:#f1f5ed] [&_ul]:[margin:0] [&_ul]:[display:grid] [&_ul]:[gap:2px] [&_ul]:[padding:0] [&_ul]:[list-style:none] [.admin-search-group+&]:[border-top:1px_solid_#e8ece3]",
  ),
  "admin-search-hint": tailwind(
    "[margin:0] [padding:22px_12px] [text-align:center] [font-size:.83rem] [color:#718075]",
  ),
  "admin-search-icon": tailwind(
    "[display:grid] [height:32px] [width:32px] [flex:0_0_32px] [place-items:center] [border-radius:7px] [color:#587458] [background:#fafbf7] [border:1px_solid_#e4e9df]",
  ),
  "admin-search-panel": tailwind(
    "[display:grid] [max-height:min(780px,_82dvh)] [grid-template-rows:auto_minmax(0,_1fr)_auto] max-[680px]:[max-height:88dvh]",
  ),
  "admin-search-results": tailwind(
    "[max-height:min(590px,_65dvh)] [min-height:110px] [overflow-y:auto] [overscroll-behavior:contain] [padding:8px_10px] max-[680px]:[max-height:68dvh]",
  ),
  "admin-section-title": tailwind(
    "dashboard-panel-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:10px] [padding:16px_18px] [border-bottom:1px_solid_var(--line)] [&_p]:[margin-top:4px] [&_p]:[font-size:.83rem] [&_p]:[color:var(--muted)]",
  ),
  "admin-side-bottom": tailwind(
    "[margin-top:auto] [display:grid] [gap:5px] [padding-top:13px] [border-top:1px_solid_var(--line)] max-[680px]:[display:none] [&_a]:[display:flex] [&_a]:[width:100%] [&_a]:[align-items:center] [&_a]:[gap:11px] [&_a]:[border-radius:8px] [&_a]:[padding:11px_12px] [&_a]:[text-align:left] [&_a]:[font-size:.89rem] [&_a]:[font-weight:600] [&_a]:[color:var(--muted)] [&_a]:[background:transparent] [&_a]:[border:0] [&_a:hover]:[color:var(--forest)] [&_a:hover]:[background:#edf1e7]",
  ),
  "admin-side-label": tailwind(
    "[margin:38px_10px_10px] [font-size:.69rem] [font-weight:720] [letter-spacing:.08em] [color:#778675] max-[680px]:[display:none]",
  ),
  "admin-sidebar": tailwind(
    "[position:sticky] [top:0] [display:flex] [height:100dvh] [min-height:100vh] [flex-direction:column] [gap:0] [padding:24px_16px] [background:var(--surface)] [border-right:1px_solid_var(--line)] max-[680px]:[position:static] max-[680px]:[height:auto] max-[680px]:[min-height:0] max-[680px]:[padding:11px_14px_9px] max-[680px]:[border-bottom:1px_solid_var(--line)] max-[680px]:[border-right:0] [&_nav]:[display:grid] [&_nav]:[gap:5px] max-[680px]:[&_nav]:[margin:0] max-[680px]:[&_nav]:[display:flex] max-[680px]:[&_nav]:[gap:4px] max-[680px]:[&_nav]:[overflow-x:auto] [&_nav_a]:[display:flex] [&_nav_a]:[width:100%] [&_nav_a]:[align-items:center] [&_nav_a]:[gap:11px] [&_nav_a]:[border-radius:8px] [&_nav_a]:[padding:11px_12px] [&_nav_a]:[text-align:left] [&_nav_a]:[font-size:.89rem] [&_nav_a]:[font-weight:600] [&_nav_a]:[color:var(--muted)] [&_nav_a]:[background:transparent] [&_nav_a]:[border:0] max-[680px]:[&_nav_a]:[flex:0_0_auto] max-[680px]:[&_nav_a]:[padding:9px_10px] max-[680px]:[&_nav_a]:[font-size:.79rem] [&_nav_a:hover]:[color:var(--forest)] [&_nav_a:hover]:[background:#edf1e7] [&_nav_a[aria-current=page]]:[color:var(--forest)] [&_nav_a[aria-current=page]]:[background:#e3eddb] max-[680px]:[&_nav_svg]:[width:16px]",
  ),
  "admin-toolbar": tailwind(
    "dashboard-form [display:flex] [flex-wrap:wrap] [align-items:end] [gap:9px] [padding:14px_17px] [border-bottom:1px_solid_var(--line)] [&_input]:[min-height:42px] [&_input]:[width:100%] [&_input]:[border-radius:7px] [&_input]:[padding:9px_11px] [&_input]:[color:var(--ink)] [&_input]:[background:#fffefb] [&_input]:[border:1px_solid_#cbd5c8] [&_input]:[font:inherit] [&_label]:[display:grid] [&_label]:[min-width:155px] [&_label]:[flex:1] [&_label]:[gap:5px] [&_label]:[font-size:.8rem] [&_label]:[font-weight:630] [&_label]:[color:#34483a] [&_select]:[min-height:42px] [&_select]:[width:100%] [&_select]:[border-radius:7px] [&_select]:[padding:9px_11px] [&_select]:[color:var(--ink)] [&_select]:[background:#fffefb] [&_select]:[border:1px_solid_#cbd5c8] [&_select]:[font:inherit] [&>button]:[margin-left:auto]",
  ),
  "admin-topbar": tailwind(
    "[position:sticky] [top:0] [z-index:5] [display:flex] [min-height:68px] [align-items:center] [justify-content:space-between] [gap:14px] [padding:10px_clamp(15px,_3vw,_36px)] [backdrop-filter:blur(10px)] [background:#fffef9ed] [border-bottom:1px_solid_var(--line)] max-[680px]:[min-height:48px] max-[680px]:[padding:8px_14px]",
  ),
  "admin-two-col": tailwind(
    "[display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [align-items:start] [gap:14px] max-[940px]:[grid-template-columns:1fr]",
  ),
  bad: tailwind(
    "dashboard-tag-danger [.admin-badge&]:[--admin-badge-bg:#f7e6df] [.admin-badge&]:[--admin-badge-color:#872d25]",
  ),
  danger: tailwind(
    "[.admin-row-actions_&]:[min-height:34px] [.admin-row-actions_&]:[padding:6px_9px] [.admin-row-actions_&]:[font-size:.76rem]",
  ),
  "editor-toolbar": tailwind(
    "[display:flex] [flex-wrap:wrap] [gap:5px] [border-radius:8px_8px_0_0] [padding:8px] [background:#f3f5ed] [border:1px_solid_var(--line)] [&_button]:[min-height:33px] [&_button]:[border-radius:5px] [&_button]:[padding:5px_8px] [&_button]:[font-size:.75rem] [&_button]:[font-weight:650] [&_button]:[color:var(--forest)] [&_button]:[background:white] [&_button]:[border:1px_solid_#d2dbcd]",
  ),
  "education-editor": tailwind(
    "[min-height:300px] [border-radius:0_0_8px_8px] [padding:14px] [line-height:1.65] [background:white] [border-top:0] [border:1px_solid_var(--line)]",
  ),
  error: tailwind(
    "dashboard-error-text [.admin-feedback&]:[--admin-feedback-bg:#f7e6df] [.admin-feedback&]:[--admin-feedback-color:#872d25]",
  ),
  secondary: tailwind(
    "[.admin-article-list>&]:[grid-column:1_/_-1] [.admin-article-list>&]:[justify-self:end] [.admin-row-actions_&]:[min-height:34px] [.admin-row-actions_&]:[padding:6px_9px] [.admin-row-actions_&]:[font-size:.76rem]",
  ),
} as const;
