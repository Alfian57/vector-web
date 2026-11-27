"use client";

import { useState, type ComponentPropsWithoutRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import { tw } from "@/lib/tw";

type PasswordInputProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & {
  id: string;
  containerClassName?: string;
};

export function PasswordInput({ className, containerClassName, id, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span className={tw(`relative block w-full min-w-0${containerClassName ? ` ${containerClassName}` : ""}`)}>
      <input {...props} id={id} className={tw(className)} type={visible ? "text" : "password"} />
      <button
        className={tw(
          "absolute inset-y-0 right-[5px] my-auto grid size-[34px] place-items-center rounded-[5px] bg-transparent p-0 text-muted hover:bg-[#edf2e7] hover:text-forest focus-visible:outline-[3px] focus-visible:outline-offset-1 focus-visible:outline-[#64862e]",
        )}
        type="button"
        aria-label="Tampilkan kata sandi"
        aria-pressed={visible}
        aria-controls={id}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </span>
  );
}
