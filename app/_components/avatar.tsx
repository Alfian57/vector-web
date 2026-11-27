"use client";

import { useState } from "react";
import { accountMenuStyles } from "./account-menu-classes";
import { tw } from "@/lib/tw";

export function Avatar({
  name,
  src,
  size = "normal",
}: {
  name: string;
  src?: string | null;
  size?: "normal" | "large" | "profile";
}) {
  const [failedSrc, setFailedSrc] = useState("");
  const [defaultAvatarFailed, setDefaultAvatarFailed] = useState(false);
  const className = `${accountMenuStyles.avatar} ${size === "large" ? accountMenuStyles.avatarLarge : size === "profile" ? accountMenuStyles.avatarProfile : ""}`;
  const defaultAvatar = "/demo-avatars/default.webp";
  const imageSrc = src && failedSrc !== src ? src : defaultAvatarFailed ? "" : defaultAvatar;

  function handleImageError() {
    if (imageSrc === defaultAvatar) setDefaultAvatarFailed(true);
    else setFailedSrc(imageSrc);
  }

  return (
    <span className={tw(className)} aria-hidden="true">
      {imageSrc ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- Private avatar responses use the current session cookie. */}
          <img className={tw("block size-full object-cover")} src={imageSrc} alt="" onError={handleImageError} />
        </>
      ) : (
        <span>{initials(name)}</span>
      )}
    </span>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length > 1
    ? `${parts[0][0]}${parts.at(-1)?.[0]}`.toLocaleUpperCase("id-ID")
    : parts[0]?.slice(0, 2).toLocaleUpperCase("id-ID") || "V";
}
