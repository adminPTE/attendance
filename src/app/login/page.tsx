import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Activity, CalendarClock, ShieldEllipsis } from "lucide-react";

import { LoginForm } from "@/components/login-form";
import { AUTH_SESSION_KEY } from "@/lib/auth-session";

export const metadata = {
  title: "Login",
};

const quickNotes = [
  {
    title: "ดูตารางของตัวเองเร็วขึ้น",
    description: "เช็กกะวันนี้และวันถัดไปได้ทันทีจากหน้า overview",
    icon: CalendarClock,
  },
  {
    title: "บริหารชีทได้ครบในหน้าเดียว",
    description: "เพิ่มเจ้าหน้าที่ แก้ไขตาราง บันทึก และ publish ได้ใน flow เดียว",
    icon: Activity,
  },
  {
    title: "สิทธิ์การใช้งานแยกชัดเจน",
    description: "ผู้ใช้งานทั่วไปกับผู้ได้รับมอบหมายเห็นมุมมองที่ต่างกันตามบทบาท",
    icon: ShieldEllipsis,
  },
];

export default async function LoginPage() {
  const cookieStore = await cookies();
  const authSession = cookieStore.get(AUTH_SESSION_KEY);

  if (authSession?.value) {
    redirect("/schedule");
  }

  return (
    <main className="relative min-h-svh overflow-hidden bg-[radial-gradient(circle_at_top,oklch(0.95_0.04_250),transparent_42%),linear-gradient(180deg,oklch(0.985_0.01_248),oklch(0.96_0.015_248))]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0,transparent_calc(100%-1px),oklch(0.9_0.02_248/.2)_100%),linear-gradient(to_bottom,transparent_0,transparent_calc(100%-1px),oklch(0.9_0.02_248/.18)_100%)] bg-[size:46px_46px]" />
      <div className="absolute left-[8%] top-16 h-52 w-52 rounded-full bg-sky-300/20 blur-3xl" />
      <div className="absolute bottom-12 right-[10%] h-64 w-64 rounded-full bg-emerald-300/15 blur-3xl" />

      <div className="relative mx-auto flex min-h-svh max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,470px)] lg:items-center">
          <section className="hidden space-y-8 lg:block">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                ระบบตารางทำงานภายในหน่วยงาน
              </div>
              <div className="space-y-3">
                <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  จัดการตารางทำงานและตรวจสอบการเข้างานในมุมมองที่ชัดและใช้ง่ายกว่าเดิม
                </h1>
                <p className="max-w-xl text-base leading-7 text-muted-foreground">
                  ใช้ Provider ID เพื่อเข้าสู่ระบบ แล้วเข้าถึงตารางทำงานตามสิทธิ์ของคุณได้ทันที
                  ทั้งแบบ overview สำหรับผู้ใช้งานทั่วไป และหน้าแก้ไขเต็มรูปแบบสำหรับผู้ได้รับมอบหมาย
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {quickNotes.map((item) => (
                <article
                  key={item.title}
                  className="rounded-[1.75rem] border border-border/70 bg-card/80 p-5 shadow-sm backdrop-blur"
                >
                  <span className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <item.icon className="size-5" />
                  </span>
                  <h2 className="text-base font-semibold text-foreground">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <div className="w-full">
            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
