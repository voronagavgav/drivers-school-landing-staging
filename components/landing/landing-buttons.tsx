import * as React from "react";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";
import styles from "@/app/landing.module.css";

type LandingButtonProps = React.ComponentProps<"button"> & {
  asChild?: boolean;
  variant?: "primary" | "secondary";
};

export function LandingButton({
  asChild = false,
  className,
  variant = "primary",
  type,
  ...props
}: LandingButtonProps) {
  const Component = asChild ? Slot.Root : "button";

  return (
    <Component
      className={cn(
        variant === "primary" ? styles.primaryButton : styles.heroSecondary,
        className,
      )}
      type={asChild ? undefined : (type ?? "button")}
      {...props}
    />
  );
}

type LandingIconButtonProps = Omit<React.ComponentProps<"button">, "aria-label"> & {
  label: string;
};

export function LandingIconButton({ label, type = "button", ...props }: LandingIconButtonProps) {
  return <button type={type} aria-label={label} {...props} />;
}
