export type ShiftCode =
  | ""
  | "ปกติ"
  | "WFH"
  | "วันหยุด";

export type ShiftType = {
  value: ShiftCode;
  label: string;
  color: string;
};

export type ShiftMap = Partial<Record<ShiftCode, ShiftType>>;

export type StaffMember = {
  id: string;
  external_staff_id?: string;
  first_name: string;
  last_name: string;
  position_number: string;
  department?: string;
  is_active?: boolean;
};

export type ScheduleShifts = Record<string, ShiftCode>;

export type ScheduleRow = {
  id?: string;
  staff_id: string;
  external_staff_id?: string;
  staff_name: string;
  position_number: string;
  department?: string;
  shifts: ScheduleShifts;
};

export type ImportedScheduleRow = {
  staffName: string;
  positionNumber: string;
  department: string;
  shifts: ScheduleShifts;
};

export const SHIFT_TYPES: ShiftType[] = [
  { value: "", label: "-", color: "bg-transparent" },
  {
    value: "ปกติ",
    label: "ปกติ",
    color: "bg-sky-100 text-sky-800 border-sky-200",
  },
  {
    value: "WFH",
    label: "WFH",
    color: "bg-amber-100 text-amber-800 border-amber-200",
  },
  {
    value: "วันหยุด",
    label: "วันหยุด",
    color: "bg-rose-100 text-rose-800 border-rose-200",
  },
];

export const SHIFT_MAP: ShiftMap = Object.fromEntries(
  SHIFT_TYPES.map((shiftType) => [shiftType.value, shiftType])
) as ShiftMap;

export const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
] as const;

export function getDaysInMonth(year: number, month: number): number {
  const ceYear = year - 543;
  return new Date(ceYear, month, 0).getDate();
}

export function getDayOfWeek(year: number, month: number, day: number): string {
  const ceYear = year - 543;
  const date = new Date(ceYear, month - 1, day);
  const days = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
  return days[date.getDay()] ?? "";
}

export function isWeekend(year: number, month: number, day: number): boolean {
  const ceYear = year - 543;
  const date = new Date(ceYear, month - 1, day);
  return date.getDay() === 0 || date.getDay() === 6;
}

export function getDefaultShiftForDay(
  year: number,
  month: number,
  day: number
): ShiftCode {
  return isWeekend(year, month, day) ? "วันหยุด" : "ปกติ";
}
