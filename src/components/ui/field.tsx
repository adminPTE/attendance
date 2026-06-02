"use client";

import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function FieldGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn("flex flex-col gap-5", className)}
      {...props}
    />
  );
}

function Field({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function FieldLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  return <Label className={cn("text-sm font-medium", className)} {...props} />;
}

function FieldDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function FieldSeparator({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-separator"
      className={cn("relative my-1 flex items-center justify-center", className)}
      {...props}
    >
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
      <span className="relative bg-card px-3 text-xs text-muted-foreground">
        {children}
      </span>
    </div>
  );
}

export { Field, FieldDescription, FieldGroup, FieldLabel, FieldSeparator };
