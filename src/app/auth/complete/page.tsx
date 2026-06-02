"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { writeAuthSession, type AuthSession } from "@/lib/auth-session";

function AuthCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const encodedSession = searchParams.get("session");

    if (!encodedSession) {
      router.replace("/login");
      return;
    }

    try {
      const session = JSON.parse(decodeURIComponent(encodedSession)) as AuthSession;
      writeAuthSession(session);
      router.replace("/schedule");
    } catch {
      router.replace("/login");
    }
  }, [router, searchParams]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="rounded-3xl border border-border bg-card px-6 py-5 text-center shadow-sm">
        <p className="text-sm font-medium text-foreground">กำลังเข้าสู่ระบบ...</p>
        <p className="mt-1 text-sm text-muted-foreground">
          โปรดรอสักครู่ ระบบกำลังเตรียมข้อมูลผู้ใช้งาน
        </p>
      </div>
    </main>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-svh items-center justify-center bg-background px-4">
          <div className="rounded-3xl border border-border bg-card px-6 py-5 text-center shadow-sm">
            <p className="text-sm font-medium text-foreground">กำลังเข้าสู่ระบบ...</p>
            <p className="mt-1 text-sm text-muted-foreground">
              โปรดรอสักครู่ ระบบกำลังเตรียมข้อมูลผู้ใช้งาน
            </p>
          </div>
        </main>
      }
    >
      <AuthCompleteContent />
    </Suspense>
  );
}
