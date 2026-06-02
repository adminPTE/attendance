"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Clock3,
  Home,
  Palmtree,
  RefreshCw,
  Sun,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ScheduleRow, ShiftCode } from "@/lib/shiftTypes";
import { THAI_MONTHS, getDayOfWeek, getDaysInMonth } from "@/lib/shiftTypes";

type MyScheduleOverviewProps = {
  year: number;
  month: number;
  schedule: ScheduleRow;
};

type RangeOption = 1 | 3 | 5 | 7;

type ShiftPresentation = {
  label: string;
  description: string;
  note: string;
  emoji: string;
  accentDot: string;
  iconWrap: string;
  iconClassName: string;
  chipClassName: string;
  heroGradient: string;
  heroGlow: string;
  Icon: typeof Sun;
};

const RANGE_OPTIONS: Array<{ label: string; value: RangeOption }> = [
  { label: "วันนี้", value: 1 },
  { label: "3 วัน", value: 3 },
  { label: "5 วัน", value: 5 },
  { label: "7 วัน", value: 7 },
];

const SHORT_THAI_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
] as const;

function compareMonth(year: number, month: number, currentYear: number, currentMonth: number) {
  if (year === currentYear && month === currentMonth) {
    return 0;
  }

  return year > currentYear || (year === currentYear && month > currentMonth) ? 1 : -1;
}

function getShiftValue(schedule: ScheduleRow, day: number): ShiftCode {
  return schedule.shifts?.[String(day)] ?? "";
}

function getShiftPresentation(shift: ShiftCode): ShiftPresentation {
  switch (shift) {
    case "ปกติ":
      return {
        label: "เข้างานปกติ",
        description: "ทำงานที่หน่วยงานตามรอบปกติ",
        note: "เหมาะสำหรับวางแผนงานในออฟฟิศและนัดหมายระหว่างวัน",
        emoji: "🏢",
        accentDot: "bg-sky-500",
        iconWrap: "bg-sky-500/10",
        iconClassName: "text-sky-500",
        chipClassName: "bg-sky-500/10 text-sky-700",
        heroGradient: "from-sky-400/10 via-cyan-400/10 to-sky-500/5",
        heroGlow: "from-sky-400/20 to-cyan-500/10",
        Icon: Building2,
      };
    case "WFH":
      return {
        label: "ทำงานจากที่บ้าน",
        description: "ไม่ต้องเดินทางเข้าออฟฟิศ",
        note: "เตรียมประชุมออนไลน์และเช็กงานผ่านระบบตามปกติ",
        emoji: "🏠",
        accentDot: "bg-amber-500",
        iconWrap: "bg-amber-500/10",
        iconClassName: "text-amber-500",
        chipClassName: "bg-amber-500/10 text-amber-700",
        heroGradient: "from-amber-400/10 via-orange-400/10 to-amber-500/5",
        heroGlow: "from-amber-400/20 to-orange-500/10",
        Icon: Home,
      };
    case "วันหยุด":
      return {
        label: "วันหยุด",
        description: "ไม่มีตารางเข้างานในวันนี้",
        note: "ใช้พักผ่อนหรือวางแผนส่วนตัวได้เต็มที่",
        emoji: "🎉",
        accentDot: "bg-rose-500",
        iconWrap: "bg-rose-500/10",
        iconClassName: "text-rose-500",
        chipClassName: "bg-rose-500/10 text-rose-700",
        heroGradient: "from-rose-400/10 via-pink-400/10 to-rose-500/5",
        heroGlow: "from-rose-400/20 to-pink-500/10",
        Icon: Palmtree,
      };
    default:
      return {
        label: "ยังไม่ระบุกะ",
        description: "ยังไม่มีข้อมูลการเข้างานสำหรับวันนี้",
        note: "ลองตรวจสอบกับชีทหลักอีกครั้งถ้าควรมีข้อมูล",
        emoji: "🕘",
        accentDot: "bg-slate-400",
        iconWrap: "bg-slate-500/10",
        iconClassName: "text-slate-500",
        chipClassName: "bg-slate-500/10 text-slate-700",
        heroGradient: "from-slate-400/10 via-slate-400/10 to-slate-500/5",
        heroGlow: "from-slate-400/20 to-slate-500/10",
        Icon: Clock3,
      };
  }
}

function getRelativeLabel(offset: number) {
  if (offset === 0) {
    return "วันนี้";
  }

  if (offset === 1) {
    return "พรุ่งนี้";
  }

  return `อีก ${offset} วัน`;
}

export default function MyScheduleOverview({
  year,
  month,
  schedule,
}: MyScheduleOverviewProps) {
  const [range, setRange] = useState<RangeOption>(3);

  const overview = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear() + 543;
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const monthComparison = compareMonth(year, month, currentYear, currentMonth);
    const daysInMonth = getDaysInMonth(year, month);

    if (monthComparison < 0) {
      return {
        entries: [],
        emptyMessage: "เดือนนี้เป็นข้อมูลย้อนหลังแล้ว",
      };
    }

    const startDay = monthComparison === 0 ? currentDay : 1;
    const endDay = Math.min(daysInMonth, startDay + range - 1);
    const entries = Array.from({ length: endDay - startDay + 1 }, (_, index) => {
      const day = startDay + index;
      const shift = getShiftValue(schedule, day);
      const presentation = getShiftPresentation(shift);

      return {
        day,
        shift,
        presentation,
        dayOfWeek: getDayOfWeek(year, month, day),
        monthLabel: SHORT_THAI_MONTHS[month - 1],
        longMonthLabel: THAI_MONTHS[month - 1],
        isToday: monthComparison === 0 && day === currentDay,
        relativeLabel: monthComparison === 0 ? getRelativeLabel(day - currentDay) : "ล่วงหน้า",
      };
    });

    return {
      entries,
      emptyMessage: "",
    };
  }, [month, range, schedule, year]);

  const firstEntry = overview.entries[0];

  return (
    <section className="mx-auto max-w-4xl px-1 py-1">
      {overview.entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          {overview.emptyMessage}
        </div>
      ) : (
        <>
          <div className="mb-8">
            <div className="relative overflow-hidden rounded-xl bg-card shadow-xl">
              <div
                className={`absolute inset-0 bg-gradient-to-br ${firstEntry?.presentation.heroGradient ?? "from-slate-400/10 to-slate-500/5"}`}
              />
              <div
                className={`absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br blur-2xl ${firstEntry?.presentation.heroGlow ?? "from-slate-400/20 to-slate-500/10"}`}
              />
              <div className="relative p-6 md:p-8">
                <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                  <Clock3 className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {firstEntry?.isToday ? "วันนี้" : firstEntry?.relativeLabel}
                  </span>
                </div>
                <p className="mb-5 text-sm text-muted-foreground">
                  {firstEntry?.dayOfWeek} • {firstEntry?.day} {firstEntry?.longMonthLabel} {year}
                </p>

                <div className="flex items-center gap-5">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${firstEntry?.presentation.iconWrap}`}>
                    <span className="text-3xl">{firstEntry?.presentation.emoji}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-2xl font-bold tracking-tight">
                      {firstEntry?.presentation.label}
                    </h3>
                    <p className="mt-1 text-base text-muted-foreground">
                      {firstEntry?.presentation.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold">ตารางล่วงหน้า</h3>
              <div className="flex items-center gap-2">
                <div className="flex w-fit gap-2 rounded-xl bg-muted/60 p-1">
                  {RANGE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={
                        option.value === range
                          ? "rounded-lg bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors"
                          : "rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                      }
                      onClick={() => setRange(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground"
                  onClick={() => setRange(3)}
                  aria-label="รีเซ็ตมุมมอง"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {overview.entries.map((entry, index) => {
                const EntryIcon = entry.presentation.Icon;

                return (
                  <article
                    key={entry.day}
                    className="group flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4 transition-all duration-200 hover:border-border hover:shadow-md"
                  >
                    <div className="flex min-w-[52px] flex-col items-center">
                      <span className="text-xs font-medium uppercase text-muted-foreground">
                        {entry.relativeLabel}
                      </span>
                      <span className="text-2xl font-bold leading-tight">{entry.day}</span>
                      <span className="text-xs text-muted-foreground">{entry.monthLabel}</span>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-1 self-stretch">
                      <div className={`h-2.5 w-2.5 rounded-full ${entry.presentation.accentDot}`} />
                      {index < overview.entries.length - 1 ? (
                        <div className="w-px flex-1 bg-border/60" />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${entry.presentation.iconWrap}`}>
                          <EntryIcon className={`h-4 w-4 ${entry.presentation.iconClassName}`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{entry.presentation.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.dayOfWeek} · {entry.presentation.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    {entry.isToday ? (
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${entry.presentation.chipClassName}`}>
                        วันนี้
                      </span>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
