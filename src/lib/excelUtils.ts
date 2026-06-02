import ExcelJS from "exceljs";
import * as XLSX from "xlsx";

import {
  getDefaultShiftForDay,
  getDaysInMonth,
  isWeekend,
  THAI_MONTHS,
  type ImportedScheduleRow,
  type ScheduleRow,
  type ShiftCode,
  type StaffMember,
} from "./shiftTypes";

const HEADER_COLUMNS = ["ลำดับ", "ชื่อ-สกุล", "เลขตำแหน่ง"] as const;
const ORGANIZATION_SUFFIX = "สำนักงานสาธารณสุขจังหวัดปทุมธานี";

export function exportScheduleToExcel(
  schedules: ScheduleRow[],
  year: number,
  month: number,
  departmentName = "กลุ่มงานสุขภาพดิจิทัล"
) {
  const daysCount = getDaysInMonth(year, month);
  const days = Array.from({ length: daysCount }, (_, i) => i + 1);
  const monthName = THAI_MONTHS[month - 1] ?? "";
  const exportDepartmentLine = `${departmentName} ${ORGANIZATION_SUFFIX}`.trim();
  const normalizedDepartmentName = normalizeFileNamePart(departmentName);
  const totalColumns = HEADER_COLUMNS.length + days.length;
  const holidayDays = new Set(
    days.filter((day) => isHolidayColumn(schedules, year, month, day))
  );
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("schedule");

  worksheet.columns = [
    { width: 8 },
    { width: 24 },
    { width: 16 },
    ...days.map(() => ({ width: 5 })),
  ];

  worksheet.addRow([`ตารางการปฏิบัติงานตามมาตรการ "ลดการใช้พลังงาน พ.ศ.${year}"`]);
  worksheet.addRow([exportDepartmentLine]);
  worksheet.addRow([`ประจำเดือน ${monthName} พ.ศ. ${year}`]);
  worksheet.addRow([...HEADER_COLUMNS, "วันที่"]);
  worksheet.addRow(["", "", "", ...days.map(String)]);

  for (const [index, schedule] of schedules.entries()) {
    worksheet.addRow([
      index + 1,
      schedule.staff_name || "",
      schedule.position_number || "",
      ...days.map((day) => formatShiftForExport(schedule.shifts?.[String(day)] || "")),
    ]);
  }

  const lastColumnLetter = worksheet.getColumn(totalColumns).letter;
  if (!lastColumnLetter) {
    return;
  }

  worksheet.mergeCells(`A1:${lastColumnLetter}1`);
  worksheet.mergeCells(`A2:${lastColumnLetter}2`);
  worksheet.mergeCells(`A3:${lastColumnLetter}3`);
  worksheet.mergeCells("A4:A5");
  worksheet.mergeCells("B4:B5");
  worksheet.mergeCells("C4:C5");
  worksheet.mergeCells(`D4:${lastColumnLetter}4`);

  worksheet.getRow(1).height = 24;
  worksheet.getRow(2).height = 22;
  worksheet.getRow(3).height = 22;
  worksheet.getRow(4).height = 20;

  applyExcelTitleStyle(worksheet.getCell("A1"), 16);
  applyExcelTitleStyle(worksheet.getCell("A2"), 16);
  applyExcelTitleStyle(worksheet.getCell("A3"), 16);
  applyExcelHeaderStyle(worksheet.getCell("A4"), 12);
  applyExcelHeaderStyle(worksheet.getCell("B4"), 12);
  applyExcelHeaderStyle(worksheet.getCell("C4"), 12);
  applyExcelHeaderStyle(worksheet.getCell("D4"), 12);
  applyExcelHeaderRowStyle(worksheet, 4, totalColumns);
  applyExcelHeaderRowStyle(worksheet, 5, totalColumns);
  applyExcelGridBorders(worksheet, 4, schedules.length + 5, totalColumns);
  applyExcelHolidayColumns(worksheet, 5, schedules.length + 5, holidayDays);

  void workbook.xlsx.writeBuffer().then((buffer) => {
    const content =
      buffer instanceof ArrayBuffer ? buffer : Uint8Array.from(buffer).buffer;
    const blob = new Blob(
      [content],
      {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }
    );
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ตารางปฏิบัติงาน ${normalizedDepartmentName} ${monthName} ${year}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);
  });
}

export function downloadScheduleTemplateExcel(
  year: number,
  month: number,
  staffRows: StaffMember[] = [],
  departmentName = "กลุ่มงาน...."
) {
  const daysCount = getDaysInMonth(year, month);
  const days = Array.from({ length: daysCount }, (_, i) => i + 1);
  const monthName = THAI_MONTHS[month - 1] ?? "";
  const totalColumns = HEADER_COLUMNS.length + days.length;
  const sampleDepartmentName = `${departmentName} สำนักงานสาธารณสุขจังหวัดปทุมธานี`.trim();
  const templateRows =
    staffRows.length > 0
      ? staffRows
          .filter((staff) => staff.position_number.trim() !== "")
          .map((staff, index) => [
            String(index + 1),
            `${staff.first_name} ${staff.last_name}`.trim(),
            staff.position_number,
            ...days.map(() => ""),
          ])
      : [
          ["1", "ตัวอย่าง เจ้าหน้าที่", "12345", ...days.map(() => "")],
          ["2", "ตัวอย่าง เจ้าหน้าที่", "12346", ...days.map(() => "")],
        ];
  const dataStartRow = 6;
  const dataEndRow = dataStartRow + templateRows.length - 1;
  const noteRow = dataEndRow + 3;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("template");

  worksheet.columns = [
    { width: 8 },
    { width: 24 },
    { width: 16 },
    ...days.map(() => ({ width: 5 })),
  ];

  worksheet.addRow([`ตารางการปฏิบัติงานตามมาตรการ "ลดการใช้พลังงาน พ.ศ.${year}"`]);
  worksheet.addRow([sampleDepartmentName]);
  worksheet.addRow([`ประจำเดือน ${monthName} พ.ศ. ${year}`]);
  worksheet.addRow([...HEADER_COLUMNS, "วันที่"]);
  worksheet.addRow(["", "", "", ...days.map(String)]);
  for (const row of templateRows) {
    worksheet.addRow(row);
  }
  worksheet.addRow([]);
  worksheet.addRow([]);
  worksheet.addRow(["หมายเหตุ: วันที่ต้องการ WFH ให้กรอก w หรือ W ลงในช่องของวันนั้น"]);

  const lastColumnLetter = worksheet.getColumn(totalColumns).letter;
  if (!lastColumnLetter) {
    return;
  }

  worksheet.mergeCells(`A1:${lastColumnLetter}1`);
  worksheet.mergeCells(`A2:${lastColumnLetter}2`);
  worksheet.mergeCells(`A3:${lastColumnLetter}3`);
  worksheet.mergeCells(`A${noteRow}:${lastColumnLetter}${noteRow}`);
  worksheet.mergeCells("A4:A5");
  worksheet.mergeCells("B4:B5");
  worksheet.mergeCells("C4:C5");
  worksheet.mergeCells(`D4:${lastColumnLetter}4`);

  worksheet.getRow(1).height = 24;
  worksheet.getRow(2).height = 22;
  worksheet.getRow(3).height = 22;
  worksheet.getRow(4).height = 20;

  applyExcelTitleStyle(worksheet.getCell("A1"), 16);
  applyExcelTitleStyle(worksheet.getCell("A2"), 16);
  applyExcelTitleStyle(worksheet.getCell("A3"), 16);
  applyExcelHeaderRowStyle(worksheet, 4, totalColumns);
  applyExcelHeaderRowStyle(worksheet, 5, totalColumns);
  applyExcelGridBorders(worksheet, 4, dataEndRow, totalColumns);
  applyExcelHolidayColumns(
    worksheet,
    5,
    dataEndRow,
    new Set(days.filter((day) => isWeekend(year, month, day)))
  );
  worksheet.getCell(`A${noteRow}`).font = {
    bold: true,
    name: "TH SarabunPSK",
    size: 15,
    color: { argb: "FF9A3412" },
  };
  worksheet.getCell(`A${noteRow}`).alignment = {
    horizontal: "left",
    vertical: "middle",
  };
  worksheet.getCell(`A${noteRow}`).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFEDD5" },
    bgColor: { argb: "FFFFEDD5" },
  };

  void workbook.xlsx.writeBuffer().then((buffer) => {
    const content =
      buffer instanceof ArrayBuffer ? buffer : Uint8Array.from(buffer).buffer;
    const blob = new Blob([content], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ตัวอย่างนำเข้าตารางกะ_${monthName}_${year}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);
  });
}

function isHolidayColumn(
  schedules: ScheduleRow[],
  year: number,
  month: number,
  day: number
) {
  if (isWeekend(year, month, day)) {
    return true;
  }

  if (schedules.length === 0) {
    return false;
  }

  return schedules.every((schedule) => {
    const shift = schedule.shifts?.[String(day)] || getDefaultShiftForDay(year, month, day);
    return shift === "วันหยุด";
  });
}

function formatShiftForExport(shift: ShiftCode): string {
  if (shift === "WFH") {
    return "w";
  }

  if (shift === "ปกติ" || shift === "วันหยุด") {
    return "";
  }

  return shift;
}

function normalizeFileNamePart(value: string) {
  return value
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function parseImportedExcel(
  file: File,
  year: number,
  month: number
): Promise<ImportedScheduleRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [];
  }

  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) {
    return [];
  }

  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  return parseImportedRows(rows, year, month);
}

function parseImportedRows(
  rows: (string | number | null)[][],
  year: number,
  month: number
): ImportedScheduleRow[] {
  if (rows.length < 6) {
    return [];
  }

  const results: ImportedScheduleRow[] = [];
  const daysCount = getDaysInMonth(year, month);
  const dataStartRowIndex = 5;

  for (let i = dataStartRowIndex; i < rows.length; i += 1) {
    const cols = rows[i]?.map((value) => String(value ?? "").trim()) ?? [];
    if (cols.length < 3) {
      continue;
    }

    const staffName = cols[1] ?? "";
    const positionNumber = cols[2] ?? "";
    const department = "";

    if (!positionNumber) {
      continue;
    }

    const shifts: Record<string, ShiftCode> = {};
    for (let day = 1; day <= daysCount; day += 1) {
      const columnIndex = day + 2;
      const value = normalizeImportedShift(cols[columnIndex], year, month, day);
      shifts[String(day)] = value;
    }

    results.push({ staffName, positionNumber, department, shifts });
  }

  return results;
}

function normalizeImportedShift(
  value: string | undefined,
  year: number,
  month: number,
  day: number
): ShiftCode {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return getDefaultShiftForDay(year, month, day);
  }

  if (normalized === "w") {
    return "WFH";
  }

  return getDefaultShiftForDay(year, month, day);
}

function applyExcelHeaderStyle(
  cell: ExcelJS.Cell,
  fontSize: number
) {
  cell.alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  cell.font = {
    bold: true,
    name: "TH SarabunPSK",
    size: fontSize,
    color: { argb: "FF365314" },
  };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9F99D" },
    bgColor: { argb: "FFD9F99D" },
  };
}

function applyExcelTitleStyle(
  cell: ExcelJS.Cell,
  fontSize: number
) {
  cell.alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  cell.font = {
    bold: true,
    name: "TH SarabunPSK",
    size: fontSize,
    color: { argb: "FF1F2937" },
  };
}

function applyExcelHeaderRowStyle(
  worksheet: ExcelJS.Worksheet,
  rowNumber: number,
  totalColumns: number
) {
  for (let colIndex = 1; colIndex <= totalColumns; colIndex += 1) {
    applyExcelHeaderStyle(worksheet.getRow(rowNumber).getCell(colIndex), 16);
  }
}

function applyExcelGridBorders(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  totalColumns: number
) {
  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex += 1) {
    for (let colIndex = 1; colIndex <= totalColumns; colIndex += 1) {
      const cell = worksheet.getRow(rowIndex).getCell(colIndex);
      cell.border = {
        top: { style: "thin", color: { argb: "FF94A3B8" } },
        left: { style: "thin", color: { argb: "FF94A3B8" } },
        bottom: { style: "thin", color: { argb: "FF94A3B8" } },
        right: { style: "thin", color: { argb: "FF94A3B8" } },
      };
      if (rowIndex >= 6) {
        cell.alignment = {
          horizontal: colIndex === 2 ? "left" : "center",
          vertical: "middle",
        };
        cell.font = {
          ...(cell.font ?? {}),
          name: "TH SarabunPSK",
          size: 16,
        };
      }
    }
  }
}

function applyExcelHolidayColumns(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  holidayDays: Set<number>
) {
  for (const day of holidayDays) {
    const colIndex = HEADER_COLUMNS.length + day;

    for (let rowIndex = startRow; rowIndex <= endRow; rowIndex += 1) {
      const cell = worksheet.getRow(rowIndex).getCell(colIndex);

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE5E7EB" },
        bgColor: { argb: "FFE5E7EB" },
      };

      cell.font = {
        ...(cell.font ?? {}),
        color: { argb: rowIndex <= 5 ? "FF4B5563" : "FF374151" },
      };
    }
  }
}
