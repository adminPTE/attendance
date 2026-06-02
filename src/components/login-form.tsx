"use client";

import { LogIn, Sparkles } from "lucide-react";

import BtnProvider from "@/components/btn-provider";
import { cn } from "@/lib/utils";

export function LoginForm({
  className,
}: {
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[2rem] border border-border/80 bg-card/95 p-6 shadow-[0_24px_80px_rgba(80,95,140,0.14)] backdrop-blur xl:p-7",
        className
      )}
    >
      <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,oklch(0.92_0.05_250/.7),transparent_70%)]" />

      <div className="relative space-y-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Provider Sign-In
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              เข้าสู่ระบบด้วยบัญชี Provider ID
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              ใช้ปุ่มเดียวเพื่อเข้าสู่ระบบและเริ่มใช้งานตารางทำงานภายในหน่วยงานได้ทันที
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <BtnProvider />

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">ต้องการคู่มือการใช้งาน?</p>
              <p className="text-xs text-muted-foreground">
                เปิดอ่านขั้นตอนการใช้งานก่อนเข้าสู่ระบบได้
              </p>
            </div>
            <a
              href="/assets/manual/file-manual.pdf"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <LogIn className="size-4" />
              คู่มือ
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
