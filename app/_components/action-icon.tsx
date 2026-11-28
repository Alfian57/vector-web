"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import {
  Ban,
  BookOpenText,
  Check,
  Eye,
  FileText,
  Image,
  Pencil,
  ScanEye,
  ScrollText,
  Trash2,
  UserRoundCog,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactElement } from "react";

const actionIcons = {
  ban: Ban,
  book: BookOpenText,
  check: Check,
  eye: Eye,
  file: FileText,
  photo: Image,
  pencil: Pencil,
  review: ScanEye,
  logs: ScrollText,
  trash: Trash2,
  user: UserRoundCog,
} satisfies Record<string, LucideIcon>;

type ActionIconProps = {
  label: string;
  icon: keyof typeof actionIcons;
} & (
  | { href: string; target?: string; rel?: string; disabled?: never; onClick?: never; render?: never }
  | { onClick: () => void; disabled?: boolean; href?: never; target?: never; rel?: never; render?: never }
  | { render: ReactElement; href?: never; target?: never; rel?: never; disabled?: never; onClick?: never }
);

export function ActionIcon(props: ActionIconProps) {
  const Icon = actionIcons[props.icon];
  const trigger =
    props.href !== undefined ? (
      <Link href={props.href} target={props.target} rel={props.rel} prefetch={false} />
    ) : props.render !== undefined ? (
      props.render
    ) : (
      <button type="button" onClick={props.onClick} disabled={props.disabled} />
    );

  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={trigger} className="dashboard-action-icon" aria-label={props.label} delay={400}>
        <Icon size={17} aria-hidden="true" />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner side="top" sideOffset={7} className="dashboard-action-tooltip-positioner">
          <Tooltip.Popup className="dashboard-action-tooltip">{props.label}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
