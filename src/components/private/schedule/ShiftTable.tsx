"use client";

import { Trash2 } from "lucide-react";

import ShiftCell from "./ShiftCell";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SHIFT_TYPES,
  getDefaultShiftForDay,
  getDayOfWeek,
  getDaysInMonth,
  isWeekend,
  type ScheduleRow,
  type ShiftCode,
} from "@/lib/shiftTypes";

type ShiftTableProps = {
  year: number;
  month: number;
  schedules: ScheduleRow[];
  readOnly?: boolean;
  allowedShiftOptions?: ShiftCode[];
  disallowHolidayEditing?: boolean;
  isHighlightedRow?: (schedule: ScheduleRow) => boolean;
  canEditSchedule?: (schedule: ScheduleRow) => boolean;
  canRemoveStaff?: (schedule: ScheduleRow) => boolean;
  canBulkEditDay?: boolean;
  onShiftChange: (schedule: ScheduleRow, day: number, value: ShiftCode) => void;
  onBulkDayChange?: (day: number, value: ShiftCode) => void;
  onRemoveStaff: (schedule: ScheduleRow) => void;
};

export default function ShiftTable({
  year,
  month,
  schedules,
  readOnly = false,
  allowedShiftOptions,
  disallowHolidayEditing = false,
  isHighlightedRow,
  canEditSchedule,
  canRemoveStaff,
  canBulkEditDay = false,
  onShiftChange,
  onBulkDayChange,
  onRemoveStaff,
}: ShiftTableProps) {
  const daysCount = getDaysInMonth(year, month);
  const days = Array.from({ length: daysCount }, (_, i) => i + 1);

  function getShiftSummary(schedule: ScheduleRow) {
    return days.reduce(
      (summary, day) => {
        const shift = schedule.shifts?.[String(day)] || getDefaultShiftForDay(year, month, day);

        if (shift === "ปกติ") {
          summary.normal += 1;
        } else if (shift === "WFH") {
          summary.wfh += 1;
        }

        return summary;
      },
      { normal: 0, wfh: 0 }
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p className="text-lg font-medium">ยังไม่มีเจ้าหน้าที่ในเดือนนี้</p>
        <p className="mt-1 text-sm">
          ให้ผู้รับผิดชอบเพิ่มหรือนำเข้ารายชื่อเจ้าหน้าที่ของเดือนนี้ก่อน
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="w-full">
      <div className="min-w-max">
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead>
            {canBulkEditDay && onBulkDayChange ? (
              <tr className="border-b border-border/60 bg-muted/20">
                <th className="sticky left-0 z-30 hidden bg-card px-2 py-2 sm:table-cell" />
                <th className="sticky left-0 z-20 bg-card px-2 py-2 text-left text-[10px] font-medium text-muted-foreground sm:left-[56px] sm:px-3">
                  ตั้งค่าทั้งวัน
                </th>
                {days.map((d) => {
                  const weekend = isWeekend(year, month, d);

                  return (
                    <th key={`bulk-${d}`} className="px-1 py-1.5 text-center">
                      {weekend ? (
                        <span className="text-[10px] text-rose-500">หยุด</span>
                      ) : (
                        <div className="flex justify-center">
                          <Select onValueChange={(value) => onBulkDayChange(d, value as ShiftCode)}>
                            <SelectTrigger className="h-7 w-[66px] justify-center rounded-md border border-dashed border-border bg-background px-1 text-[10px] text-muted-foreground shadow-none hover:text-foreground sm:w-[72px]">
                              <span className="sr-only">ตั้งค่าทั้งวันสำหรับวันที่ {d}</span>
                              <SelectValue placeholder="ตั้งค่า" />
                            </SelectTrigger>
                            <SelectContent>
                              {SHIFT_TYPES.filter((shiftType) => shiftType.value !== "").map((shiftType) => (
                                <SelectItem
                                  key={`bulk-${d}-${shiftType.value}`}
                                  value={shiftType.value}
                                  className="text-xs"
                                >
                                  {shiftType.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </th>
                  );
                })}
                <th className="min-w-[56px] px-1 py-2 text-center text-[10px] font-medium text-sky-800 sm:min-w-[64px] sm:px-2">
                  ปกติ
                </th>
                <th className="min-w-[56px] px-1 py-2 text-center text-[10px] font-medium text-amber-800 sm:min-w-[64px] sm:px-2">
                  WFH
                </th>
                <th className="min-w-[42px] px-1 py-2 sm:min-w-[50px] sm:px-2" />
              </tr>
            ) : null}
            <tr className="border-b border-border">
              <th className="sticky left-0 z-30 hidden min-w-[56px] bg-card px-2 py-2 text-center text-xs font-semibold text-muted-foreground sm:table-cell">
                ลำดับ
              </th>
              <th className="sticky left-0 z-20 min-w-[140px] bg-card px-2 py-2 text-left text-xs font-semibold text-muted-foreground sm:left-[56px] sm:min-w-[200px] sm:px-3">
                เจ้าหน้าที่
              </th>
              {days.map((d) => {
                const weekend = isWeekend(year, month, d);
                const dow = getDayOfWeek(year, month, d);
                const dayHeaderClassName = [
                  "min-w-[54px] px-1 py-1.5 text-center sm:min-w-[62px]",
                  weekend ? "bg-rose-50/60" : "",
                ].join(" ");
                const dayNumberClassName = [
                  "text-xs font-bold",
                  weekend ? "text-rose-500" : "text-foreground",
                ].join(" ");

                return (
                  <th key={d} className={dayHeaderClassName}>
                    <div className="text-[10px] text-muted-foreground">{dow}</div>
                    <div className={dayNumberClassName}>{d}</div>
                  </th>
                );
              })}
              <th className="min-w-[56px] px-1 py-2 text-center text-xs font-semibold sm:min-w-[64px] sm:px-2">
                <span className="inline-flex rounded-md border border-sky-200 bg-sky-100 px-2 py-1 text-sky-800">
                  ปกติ
                </span>
              </th>
              <th className="min-w-[56px] px-1 py-2 text-center text-xs font-semibold sm:min-w-[64px] sm:px-2">
                <span className="inline-flex rounded-md border border-amber-200 bg-amber-100 px-2 py-1 text-amber-800">
                  WFH
                </span>
              </th>
              <th className="min-w-[42px] px-1 py-2 sm:min-w-[50px] sm:px-2" />
            </tr>
          </thead>
          <tbody>
            {schedules.map((schedule, index) => {
              const summary = getShiftSummary(schedule);
              const highlighted = isHighlightedRow ? isHighlightedRow(schedule) : false;

              return (
                <tr
                  key={schedule.id || schedule.staff_id}
                  className={[
                    "border-b border-border/50 transition-colors hover:bg-secondary/30",
                    highlighted ? "bg-sky-50/70 hover:bg-sky-100/60" : "",
                  ].join(" ")}
                >
                  <td
                    className={[
                      "sticky left-0 z-20 hidden px-2 py-2 text-center text-xs font-semibold text-muted-foreground sm:table-cell",
                      highlighted ? "bg-sky-50/95 text-sky-800" : "bg-card",
                    ].join(" ")}
                  >
                    {index + 1}
                  </td>
                  <td
                    className={[
                      "sticky left-0 z-10 px-2 py-2 sm:left-[56px] sm:px-3",
                      highlighted ? "bg-sky-50/95" : "bg-card",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={[
                          "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold sm:hidden",
                          highlighted
                            ? "bg-sky-100 text-sky-800"
                            : "bg-muted text-muted-foreground",
                        ].join(" ")}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p
                          className={[
                            "max-w-[112px] truncate font-medium text-xs sm:max-w-[180px]",
                            highlighted ? "text-sky-950" : "text-foreground",
                          ].join(" ")}
                        >
                          {schedule.staff_name}
                        </p>
                        <p
                          className={[
                            "text-[10px]",
                            highlighted ? "text-sky-700" : "text-muted-foreground",
                          ].join(" ")}
                        >
                          {schedule.position_number}
                        </p>
                      </div>
                    </div>
                  </td>
                  {days.map((d) => {
                  const weekend = isWeekend(year, month, d);
                  const shiftValue =
                    schedule.shifts?.[String(d)] || getDefaultShiftForDay(year, month, d);
                  const rowReadOnly =
                    readOnly || (canEditSchedule ? !canEditSchedule(schedule) : false);
                  const holidayReadOnly =
                    disallowHolidayEditing && shiftValue === "วันหยุด";
                  const cellClassName = [
                    "px-1 py-1 text-center",
                    weekend ? "bg-rose-50/30" : "",
                    ].join(" ");

                    return (
                    <td key={d} className={cellClassName}>
                      <ShiftCell
                        value={shiftValue}
                        disabled={weekend || rowReadOnly || holidayReadOnly}
                        allowedOptions={allowedShiftOptions}
                        onChange={(val) => onShiftChange(schedule, d, val)}
                      />
                      </td>
                    );
                  })}
                  <td className="px-1 py-1 text-center text-[11px] font-medium text-sky-800 sm:px-2">
                    {summary.normal}
                  </td>
                  <td className="px-1 py-1 text-center text-[11px] font-medium text-amber-800 sm:px-2">
                    {summary.wfh}
                  </td>
                  <td className="px-1 py-1 sm:px-2">
                    {readOnly || (canRemoveStaff && !canRemoveStaff(schedule)) ? null : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemoveStaff(schedule)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
