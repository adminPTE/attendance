"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  Lock,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import {
  createScheduleMonth,
  deleteScheduleMonth,
  getScheduleSheetRows,
  listScheduleMonthsByDepartment,
  publishScheduleMonth,
  renameScheduleMonth,
  saveScheduleSheetRows,
  type ScheduleSheetRecord,
} from "@/actions/schedule";
import ImportDialog from "@/components/private/schedule/ImportDialog";
import MyScheduleOverview from "@/components/private/schedule/MyScheduleOverview";
import MonthSelector from "@/components/private/schedule/MothSelector";
import ShiftTable from "@/components/private/schedule/ShiftTable";
import StaffPicker from "@/components/private/schedule/StaffPicker";
import { usePrivateData } from "@/components/private/private-data-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  downloadScheduleTemplateExcel,
  exportScheduleToExcel,
} from "@/lib/excelUtils";
import type {
  ImportedScheduleRow,
  ScheduleRow,
  ShiftCode,
} from "@/lib/shiftTypes";
import { getDefaultShiftForDay, getDaysInMonth } from "@/lib/shiftTypes";
import type { StaffRecord } from "@/components/private/staff-form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function getCurrentBE() {
  const now = new Date();
  return { year: now.getFullYear() + 543, month: now.getMonth() + 1 };
}

function getMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function getPreviousMonth(year: number, month: number) {
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }

  return { year, month: month - 1 };
}

function createDefaultMonthShifts(year: number, month: number) {
  const daysInMonth = getDaysInMonth(year, month);
  const shifts: Record<string, ShiftCode> = {};

  for (let day = 1; day <= daysInMonth; day += 1) {
    shifts[String(day)] = getDefaultShiftForDay(year, month, day);
  }

  return shifts;
}

type ScheduleSheet = ScheduleSheetRecord;

type DeleteTarget =
  | { type: "sheet"; sheet: ScheduleSheet }
  | { type: "staff"; schedule: ScheduleRow };

type ScheduleViewMode = "overview" | "editor";

export default function SchedulePage() {
  const {
    staffList,
    currentUserId,
    currentDepartId,
    currentDepartName,
    canManageSchedule,
    canEditOwnSchedule,
  } = usePrivateData();
  const current = getCurrentBE();
  const [year, setYear] = useState(current.year);
  const [month, setMonth] = useState(current.month);
  const [showPicker, setShowPicker] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);
  const [showCreateSheetDialog, setShowCreateSheetDialog] = useState(false);
  const [newSheetName, setNewSheetName] = useState("");
  const [renameSheet, setRenameSheet] = useState<ScheduleSheet | null>(null);
  const [renameSheetName, setRenameSheetName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [publishSheet, setPublishSheet] = useState<ScheduleSheet | null>(null);
  const [isSheetFormSubmitting, setIsSheetFormSubmitting] = useState(false);
  const [isRenameSubmitting, setIsRenameSubmitting] = useState(false);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [isPublishSubmitting, setIsPublishSubmitting] = useState(false);
  const [isAddStaffSubmitting, setIsAddStaffSubmitting] = useState(false);
  const [isImportSubmitting, setIsImportSubmitting] = useState(false);
  const [isSaveSubmitting, setIsSaveSubmitting] = useState(false);
  const [isScheduleLoading, setIsScheduleLoading] = useState(true);
  const [localSchedules, setLocalSchedules] = useState<ScheduleRow[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [sheetsByMonth, setSheetsByMonth] = useState<Record<string, ScheduleSheet[]>>({});
  const [selectedSheetIdByMonth, setSelectedSheetIdByMonth] = useState<
    Record<string, string | undefined>
  >({});
  const [savedBySheet, setSavedBySheet] = useState<Record<string, ScheduleRow[]>>({});
  const [viewMode, setViewMode] = useState<ScheduleViewMode>(
    canEditOwnSchedule ? "overview" : "editor"
  );
  const importMenuRef = useRef<HTMLDivElement | null>(null);

  const monthKey = getMonthKey(year, month);
  const allStaff = staffList.filter(
    (staff): staff is StaffRecord & { id: string } => typeof staff.id === "string"
  );
  const currentUserStaff = allStaff.find(
    (staff) => staff.external_staff_id === currentUserId
  );
  const sheets = useMemo(() => sheetsByMonth[monthKey] ?? [], [monthKey, sheetsByMonth]);
  const selectedSheetId = selectedSheetIdByMonth[monthKey] ?? sheets[0]?.id;
  const selectedSheet = sheets.find((sheet) => sheet.id === selectedSheetId) ?? null;
  const savedSchedules = selectedSheetId ? savedBySheet[selectedSheetId] ?? [] : [];
  const schedules = localSchedules ?? savedSchedules;
  const hasSavedScheduleRows = savedSchedules.length > 0;
  const previousMonth = getPreviousMonth(year, month);
  const previousMonthKey = getMonthKey(previousMonth.year, previousMonth.month);
  const existingStaffIds = useMemo(() => {
    return new Set(
      sheets.flatMap((sheet) =>
        (sheet.id === selectedSheetId ? schedules : savedBySheet[sheet.id] ?? []).map(
          (schedule) => schedule.staff_id
        )
      )
    );
  }, [savedBySheet, schedules, selectedSheetId, sheets]);
  const previousMonthStaffIds = useMemo(
    () => {
      const previousSheets = sheetsByMonth[previousMonthKey] ?? [];
      return new Set(
        previousSheets.flatMap((sheet) =>
          (savedBySheet[sheet.id] ?? []).map((schedule) => schedule.staff_id)
        )
      );
    },
    [previousMonthKey, savedBySheet, sheetsByMonth]
  );
  const previousMonthStaffOrder = useMemo(() => {
    const previousSheets = sheetsByMonth[previousMonthKey] ?? [];
    const orderedIds = previousSheets.flatMap((sheet) =>
      (savedBySheet[sheet.id] ?? []).map((schedule) => schedule.staff_id)
    );

    return orderedIds.filter((staffId, index) => orderedIds.indexOf(staffId) === index);
  }, [previousMonthKey, savedBySheet, sheetsByMonth]);
  const editableStaffId = currentUserStaff?.id;
  const editableExternalStaffId = currentUserId || undefined;
  const isPublishedSheet = selectedSheet?.status === "published";
  let myScheduleOverview:
    | {
        schedule: ScheduleRow;
        sheetName?: string;
      }
    | null = null;

  function isCurrentUsersSchedule(schedule: ScheduleRow) {
    if (editableExternalStaffId && schedule.external_staff_id === editableExternalStaffId) {
      return true;
    }

    if (editableStaffId && schedule.staff_id === editableStaffId) {
      return true;
    }

    return false;
  }

  if (editableStaffId || editableExternalStaffId) {
    const selectedRow = schedules.find((schedule) => isCurrentUsersSchedule(schedule));

    if (selectedRow) {
      myScheduleOverview = {
        schedule: selectedRow,
        sheetName: selectedSheet?.name,
      };
    } else {
      for (const sheet of sheets) {
        const row = (savedBySheet[sheet.id] ?? []).find((schedule) =>
          isCurrentUsersSchedule(schedule)
        );

        if (row) {
          myScheduleOverview = {
            schedule: row,
            sheetName: sheet.name,
          };
          break;
        }
      }
    }
  }
  const canSaveSchedule =
    dirty &&
    Boolean(selectedSheetId) &&
    !isPublishedSheet &&
    (canManageSchedule ||
      (canEditOwnSchedule && Boolean(editableStaffId || editableExternalStaffId)));
  const canShowOverviewSwitch = Boolean(myScheduleOverview);
  const activeViewMode: ScheduleViewMode = canShowOverviewSwitch ? viewMode : "editor";
  const showMobileSaveBar = Boolean(
    activeViewMode === "editor" && selectedSheetId && dirty && !isPublishedSheet
  );

  useEffect(() => {
    if (!isImportMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!importMenuRef.current?.contains(event.target as Node)) {
        setIsImportMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isImportMenuOpen]);

  function canEditScheduleRow(schedule: ScheduleRow) {
    if (isPublishedSheet) {
      return false;
    }

    if (canManageSchedule) {
      return true;
    }

    if (!canEditOwnSchedule || (!editableStaffId && !editableExternalStaffId)) {
      return false;
    }

    return isCurrentUsersSchedule(schedule);
  }

  function canRemoveScheduleRow() {
    return canManageSchedule && !isPublishedSheet;
  }

  function handleBulkDayChange(day: number, value: ShiftCode) {
    if (!canManageSchedule) {
      toast.warning("เฉพาะผู้ได้รับมอบหมายเท่านั้นที่ตั้งค่าทั้งวันได้");
      return;
    }

    if (isPublishedSheet) {
      toast.warning("ชีทที่ publish แล้วไม่สามารถแก้ไขได้");
      return;
    }

    if (schedules.length === 0) {
      toast.warning("ยังไม่มีเจ้าหน้าที่ในชีทนี้");
      return;
    }

    const updated = schedules.map((schedule) => ({
      ...schedule,
      shifts: {
        ...(schedule.shifts || {}),
        [String(day)]: value,
      },
    }));

    setLocalSchedules(updated);
    setDirty(true);
    toast.success(`ตั้งวันที่ ${day} เป็น ${value || "-"} ให้ทุกคนแล้ว`);
  }

  function handleDownloadImportTemplate() {
    downloadScheduleTemplateExcel(year, month, allStaff, currentDepartName);
    setIsImportMenuOpen(false);
    toast.success("เริ่มดาวน์โหลดไฟล์ตัวอย่างแล้ว");
  }

  const loadSheetsAndRows = useEffectEvent(async (targetYear: number, targetMonth: number) => {
    try {
      const previousOfTarget = getPreviousMonth(targetYear, targetMonth);
      const [currentResult, previousResult] = await Promise.all([
        listScheduleMonthsByDepartment(targetYear, targetMonth, currentDepartId),
        listScheduleMonthsByDepartment(
          previousOfTarget.year,
          previousOfTarget.month,
          currentDepartId
        ),
      ]);

      if (!currentResult.ok) {
        toast.error(currentResult.message);
        return;
      }

      if (!previousResult.ok) {
        toast.error(previousResult.message);
        return;
      }

      const currentMonthKey = getMonthKey(targetYear, targetMonth);
      const previousKey = getMonthKey(previousOfTarget.year, previousOfTarget.month);

      setSheetsByMonth((currentState) => ({
        ...currentState,
        [currentMonthKey]: currentResult.sheets,
        [previousKey]: previousResult.sheets,
      }));

      const [currentRows, previousRows] = await Promise.all([
        Promise.all(
          currentResult.sheets.map(async (sheet) => {
            const rowsResult = await getScheduleSheetRows(sheet.id);
            return [sheet.id, rowsResult.ok ? rowsResult.rows : []] as const;
          })
        ),
        Promise.all(
          previousResult.sheets.map(async (sheet) => {
            const rowsResult = await getScheduleSheetRows(sheet.id);
            return [sheet.id, rowsResult.ok ? rowsResult.rows : []] as const;
          })
        ),
      ]);

      setSavedBySheet((currentState) => ({
        ...currentState,
        ...Object.fromEntries(currentRows),
        ...Object.fromEntries(previousRows),
      }));

      setSelectedSheetIdByMonth((currentState) => ({
        ...currentState,
        [currentMonthKey]:
          currentState[currentMonthKey] &&
          currentResult.sheets.some((sheet) => sheet.id === currentState[currentMonthKey])
            ? currentState[currentMonthKey]
            : currentResult.sheets[0]?.id,
      }));
    } finally {
      setIsScheduleLoading(false);
    }
  });

  useEffect(() => {
    void loadSheetsAndRows(year, month);
  }, [year, month, currentDepartId]);

  function handleMonthChange(nextYear: number, nextMonth: number) {
    if (
      dirty &&
      !window.confirm("มีการเปลี่ยนแปลงที่ยังไม่บันทึก ต้องการเปลี่ยนเดือนหรือไม่?")
    ) {
      return;
    }

    setIsScheduleLoading(true);
    setYear(nextYear);
    setMonth(nextMonth);
    setLocalSchedules(null);
    setDirty(false);
    setShowCreateSheetDialog(false);
    setNewSheetName("");
  }

  function handleSelectSheet(sheetId: string) {
    if (sheetId === selectedSheetId) {
      return;
    }

    if (
      dirty &&
      !window.confirm("มีการเปลี่ยนแปลงที่ยังไม่บันทึก ต้องการสลับชีทหรือไม่?")
    ) {
      return;
    }

    setSelectedSheetIdByMonth((currentState) => ({
      ...currentState,
      [monthKey]: sheetId,
    }));
    setLocalSchedules(null);
    setDirty(false);
  }

  function handleCreateSheet() {
    if (isSheetFormSubmitting) {
      return;
    }

    setIsSheetFormSubmitting(true);
    const trimmedName = newSheetName.trim();

    if (!trimmedName) {
      toast.error("กรุณาระบุชื่อชีทก่อนสร้าง");
      setIsSheetFormSubmitting(false);
      return;
    }

    if (sheets.some((sheet) => sheet.name === trimmedName)) {
      toast.error("มีชื่อชีทนี้อยู่แล้วในเดือนเดียวกัน");
      setIsSheetFormSubmitting(false);
      return;
    }

    void (async () => {
      const result = await createScheduleMonth({
        year,
        month,
        departId: currentDepartId,
        departName: currentDepartName,
        sheetName: trimmedName,
        userId: currentUserId,
      });

      if (!result.ok || !result.sheet) {
        toast.error(result.message);
        setIsSheetFormSubmitting(false);
        return;
      }

      setSheetsByMonth((currentState) => ({
        ...currentState,
        [monthKey]: [...(currentState[monthKey] ?? []), result.sheet!],
      }));
      setSelectedSheetIdByMonth((currentState) => ({
        ...currentState,
        [monthKey]: result.sheet!.id,
      }));
      setSavedBySheet((currentState) => ({
        ...currentState,
        [result.sheet!.id]: [],
      }));
      setShowCreateSheetDialog(false);
      setNewSheetName("");
      setLocalSchedules(null);
      setDirty(false);
      setIsSheetFormSubmitting(false);
      toast.success(result.message);
    })();
  }

  function handleOpenSheetForm() {
    setShowCreateSheetDialog(true);
    setNewSheetName(currentDepartName);
  }

  function handleOpenPublishSheet(sheet: ScheduleSheet) {
    if (dirty) {
      toast.warning("กรุณาบันทึกการเปลี่ยนแปลงก่อน publish ชีท");
      return;
    }

    setPublishSheet(sheet);
  }

  function handleRenameSheet(sheetId: string) {
    const targetSheet = sheets.find((sheet) => sheet.id === sheetId);

    if (!targetSheet) {
      return;
    }

    setRenameSheet(targetSheet);
    setRenameSheetName(targetSheet.name);
  }

  function handleRenameSheetSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!renameSheet || isRenameSubmitting) {
      return;
    }

    setIsRenameSubmitting(true);
    const nextName = renameSheetName.trim();

    if (!nextName || nextName === renameSheet.name) {
      setRenameSheet(null);
      setRenameSheetName("");
      setIsRenameSubmitting(false);
      return;
    }

    if (sheets.some((sheet) => sheet.id !== renameSheet.id && sheet.name === nextName)) {
      toast.error("มีชื่อชีทนี้อยู่แล้วในเดือนเดียวกัน");
      setIsRenameSubmitting(false);
      return;
    }

    void (async () => {
      const result = await renameScheduleMonth({
        sheetId: renameSheet.id,
        sheetName: nextName,
        userId: currentUserId,
      });

      if (!result.ok) {
        toast.error(result.message);
        setIsRenameSubmitting(false);
        return;
      }

      setSheetsByMonth((currentState) => ({
        ...currentState,
        [monthKey]: (currentState[monthKey] ?? []).map((sheet) =>
          sheet.id === renameSheet.id ? { ...sheet, name: nextName } : sheet
        ),
      }));
      setRenameSheet(null);
      setRenameSheetName("");
      setIsRenameSubmitting(false);
      toast.success(result.message);
    })();
  }

  function handleDeleteSheet(sheetId: string) {
    const targetSheet = sheets.find((sheet) => sheet.id === sheetId);

    if (!targetSheet) {
      return;
    }

    setDeleteTarget({ type: "sheet", sheet: targetSheet });
  }

  function confirmPublishSheet() {
    if (!publishSheet || isPublishSubmitting) {
      return;
    }

    setIsPublishSubmitting(true);
    void (async () => {
      const result = await publishScheduleMonth({
        sheetId: publishSheet.id,
        userId: currentUserId,
      });

      if (!result.ok) {
        toast.error(result.message);
        setIsPublishSubmitting(false);
        return;
      }

      setSheetsByMonth((currentState) => ({
        ...currentState,
        [monthKey]: (currentState[monthKey] ?? []).map((sheet) =>
          sheet.id === publishSheet.id ? { ...sheet, status: "published" } : sheet
        ),
      }));
      setPublishSheet(null);
      setIsPublishSubmitting(false);
      toast.success(result.message);
    })();
  }

  function confirmDeleteTarget() {
    if (!deleteTarget || isDeleteSubmitting) {
      return;
    }

    setIsDeleteSubmitting(true);
    if (deleteTarget.type === "staff") {
      if (!canManageSchedule) {
        toast.warning("บัญชีผู้ใช้งานทั่วไปไม่มีสิทธิ์ลบรายการในตาราง");
        setDeleteTarget(null);
        setIsDeleteSubmitting(false);
        return;
      }

      const updated = schedules.filter(
        (scheduleItem) => scheduleItem.staff_id !== deleteTarget.schedule.staff_id
      );
      setLocalSchedules(updated);
      setDirty(true);
      toast.success(`ลบ ${deleteTarget.schedule.staff_name} ออกจากตารางแล้ว`);
      setDeleteTarget(null);
      setIsDeleteSubmitting(false);
      return;
    }

    const { sheet } = deleteTarget;
    const sheetId = sheet.id;

    void (async () => {
      const result = await deleteScheduleMonth(sheetId);

      if (!result.ok) {
        toast.error(result.message);
        setIsDeleteSubmitting(false);
        return;
      }

      const remainingSheets = sheets.filter((item) => item.id !== sheetId);

      setSheetsByMonth((currentState) => ({
        ...currentState,
        [monthKey]: remainingSheets,
      }));
      setSelectedSheetIdByMonth((currentState) => ({
        ...currentState,
        [monthKey]:
          currentState[monthKey] === sheetId ? remainingSheets[0]?.id : currentState[monthKey],
      }));
      setSavedBySheet((currentState) => {
        const nextState = { ...currentState };
        delete nextState[sheetId];
        return nextState;
      });

      if (sheetId === selectedSheetId) {
        setLocalSchedules(null);
        setDirty(false);
      }

      setDeleteTarget(null);
      setIsDeleteSubmitting(false);
      toast.success(`ลบชีท ${sheet.name} แล้ว`);
    })();
  }

  function handleAddStaff(staffIds: string[]) {
    if (isAddStaffSubmitting) {
      return;
    }

    setIsAddStaffSubmitting(true);
    if (!selectedSheetId) {
      toast.error("กรุณาสร้างชีทก่อนนำเข้าเจ้าหน้าที่");
      setIsAddStaffSubmitting(false);
      return;
    }

    if (isPublishedSheet) {
      toast.warning("ชีทที่ publish แล้วไม่สามารถนำเข้าเจ้าหน้าที่ได้");
      setIsAddStaffSubmitting(false);
      return;
    }

    const existingIdsInMonth = new Set(existingStaffIds);
    const newEntries = staffIds
      .filter((id) => !existingIdsInMonth.has(id))
      .map((id) => {
        const staff = allStaff.find((staffItem) => staffItem.id === id);
        if (!staff) {
          return null;
        }

        return {
          staff_id: id,
          external_staff_id: staff.external_staff_id,
          staff_name: `${staff.first_name} ${staff.last_name}`,
          position_number: staff.position_number,
          department: staff.department || "",
          shifts: createDefaultMonthShifts(year, month),
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    const skippedCount = staffIds.length - newEntries.length;

    setLocalSchedules([...schedules, ...newEntries]);
    setDirty(true);
    if (skippedCount > 0) {
      toast.warning(
        `นำเข้าเจ้าหน้าที่ ${newEntries.length} คน และข้าม ${skippedCount} คนที่อยู่ในชีทอื่นของเดือนนี้แล้ว`
      );
      setIsAddStaffSubmitting(false);
      return;
    }

    setIsAddStaffSubmitting(false);
    toast.success(`นำเข้าเจ้าหน้าที่ ${newEntries.length} คนเรียบร้อย`);
  }

  function handleShiftChange(schedule: ScheduleRow, day: number, value: ShiftCode) {
    if (!canEditScheduleRow(schedule)) {
      toast.warning("บัญชีผู้ใช้งานทั่วไปแก้ไขได้เฉพาะตารางของตัวเอง");
      return;
    }

    const updated = schedules.map((scheduleItem) => {
      if (scheduleItem.staff_id === schedule.staff_id) {
        const newShifts = { ...(scheduleItem.shifts || {}) };

        if (value) {
          newShifts[String(day)] = value;
        } else {
          newShifts[String(day)] = getDefaultShiftForDay(year, month, day);
        }

        return { ...scheduleItem, shifts: newShifts };
      }

      return scheduleItem;
    });

    setLocalSchedules(updated);
    setDirty(true);
  }

  function handleRemoveStaff(schedule: ScheduleRow) {
    if (!canManageSchedule) {
      toast.warning("บัญชีผู้ใช้งานทั่วไปเลือกเวรของตัวเองได้เท่านั้น และไม่สามารถลบรายการได้");
      return;
    }

    if (!selectedSheetId) {
      toast.error("ยังไม่ได้เลือกชีทตาราง");
      return;
    }

    if (isPublishedSheet) {
      toast.warning("ชีทที่ publish แล้วไม่สามารถลบเจ้าหน้าที่ได้");
      return;
    }

    setDeleteTarget({ type: "staff", schedule });
  }

  function handleSave() {
    if (isSaveSubmitting) {
      return;
    }

    setIsSaveSubmitting(true);
    if (!selectedSheetId) {
      toast.error("กรุณาสร้างหรือเลือกชีทก่อนบันทึก");
      setIsSaveSubmitting(false);
      return;
    }

    if (isPublishedSheet) {
      toast.warning("ชีทที่ publish แล้วไม่สามารถบันทึกแก้ไขได้");
      setIsSaveSubmitting(false);
      return;
    }

    const currentSchedules = localSchedules ?? schedules;

    void (async () => {
      const result = await saveScheduleSheetRows({
        scheduleMonthId: selectedSheetId,
        schedules: currentSchedules,
        userId: currentUserId,
        canManageSchedule,
        editableStaffId,
        editableExternalStaffId,
      });

      if (!result.ok) {
        toast.error(result.message);
        setIsSaveSubmitting(false);
        return;
      }

      const rowsResult = await getScheduleSheetRows(selectedSheetId);

      if (!rowsResult.ok) {
        toast.error(rowsResult.message);
        setIsSaveSubmitting(false);
        return;
      }

      setSavedBySheet((currentState) => ({
        ...currentState,
        [selectedSheetId]: rowsResult.rows,
      }));
      setLocalSchedules(null);
      setDirty(false);
      setIsSaveSubmitting(false);
      toast.success(result.message);
    })();
  }

  function handleImport(importedData: ImportedScheduleRow[]) {
    if (isImportSubmitting) {
      return;
    }

    setIsImportSubmitting(true);
    if (!selectedSheetId) {
      toast.error("กรุณาสร้างชีทก่อนนำเข้า Excel");
      setIsImportSubmitting(false);
      return;
    }

    if (isPublishedSheet) {
      toast.warning("ชีทที่ publish แล้วไม่สามารถนำเข้า Excel ได้");
      setIsImportSubmitting(false);
      return;
    }

    const matchedRows = importedData
      .map((item) => {
        const match = allStaff.find(
          (staff) => staff.position_number.trim() === item.positionNumber.trim()
        );

        if (!match) {
          return null;
        }

        return {
          staff_id: match.id,
          external_staff_id: match.external_staff_id,
          staff_name: `${match.first_name} ${match.last_name}`,
          position_number: match.position_number,
          department: match.department || "",
          shifts: item.shifts,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const skippedCount = importedData.length - matchedRows.length;

    setLocalSchedules(matchedRows);
    setDirty(true);

    if (matchedRows.length === 0) {
      toast.error("ไม่พบเลขตำแหน่งที่ตรงกับรายชื่อเจ้าหน้าที่ในระบบ");
      setIsImportSubmitting(false);
      return;
    }

    if (skippedCount > 0) {
      toast.warning(
        `นำเข้า ${matchedRows.length} รายการ และข้าม ${skippedCount} รายการที่ไม่พบเลขตำแหน่งในระบบ`
      );
      setIsImportSubmitting(false);
      return;
    }

    setIsImportSubmitting(false);
    toast.success(`นำเข้า ${matchedRows.length} รายการสำเร็จ`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-col gap-3">
          <MonthSelector year={year} month={month} onChange={handleMonthChange} />

          {canShowOverviewSwitch ? (
            <div className="flex w-fit gap-2 rounded-2xl border border-border bg-muted/50 p-1">
              <button
                type="button"
                className={
                  activeViewMode === "overview"
                    ? "rounded-xl bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors"
                    : "rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                }
                onClick={() => setViewMode("overview")}
              >
                ตารางของฉัน
              </button>
              <button
                type="button"
                className={
                  activeViewMode === "editor"
                    ? "rounded-xl bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors"
                    : "rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                }
                onClick={() => setViewMode("editor")}
              >
                จัดการตาราง
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeViewMode === "editor" ? (
            <>
          {canManageSchedule ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleOpenSheetForm}
              disabled={isSheetFormSubmitting || isRenameSubmitting || isDeleteSubmitting || isAddStaffSubmitting || isImportSubmitting || isSaveSubmitting}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden md:inline">สร้างชีท</span>
            </Button>
          ) : null}

          {canManageSchedule ? (
            <div ref={importMenuRef} className="relative">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setIsImportMenuOpen((currentState) => !currentState)}
                disabled={!selectedSheetId || isImportSubmitting || isSaveSubmitting || isPublishedSheet}
              >
                <Upload className="h-4 w-4" />
                <span className="hidden md:inline">นำเข้า Excel</span>
                <ChevronDown className="h-4 w-4" />
              </Button>

              {isImportMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-60 rounded-2xl border border-border bg-card p-2 shadow-[0_16px_40px_rgba(80,95,140,0.16)]">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-secondary"
                    onClick={() => {
                      setShowImport(true);
                      setIsImportMenuOpen(false);
                    }}
                  >
                    <Upload className="h-4 w-4 text-primary" />
                    <span>อัปโหลดไฟล์</span>
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-secondary"
                    onClick={handleDownloadImportTemplate}
                  >
                    <Download className="h-4 w-4 text-primary" />
                    <span>ดาวน์โหลดไฟล์ตัวอย่าง</span>
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {isPublishedSheet ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                exportScheduleToExcel(
                  schedules,
                  year,
                  month,
                  selectedSheet?.departName || currentDepartName
                );
                toast.success("เริ่มส่งออกไฟล์ Excel แล้ว");
              }}
              disabled={schedules.length === 0 || isSaveSubmitting}
            >
              <Download className="h-4 w-4" />
              <span className="hidden md:inline">ส่งออก Excel</span>
            </Button>
          ) : null}

          {canManageSchedule ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowPicker(true)}
              disabled={!selectedSheetId || isAddStaffSubmitting || isSaveSubmitting || isPublishedSheet}
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden md:inline">นำเข้าเจ้าหน้าที่</span>
            </Button>
          ) : null}

            </>
          ) : null}
        </div>
      </div>

      <Dialog
        open={showCreateSheetDialog}
        onOpenChange={(open) => {
          if (!isSheetFormSubmitting) {
            setShowCreateSheetDialog(open);
            if (!open) {
              setNewSheetName("");
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>สร้างชีท</DialogTitle>
            <DialogDescription>
              ตั้งชื่อชีทสำหรับตารางกะของเดือนนี้ เช่น ชื่อหน่วยงานหรือทีมงาน
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-sheet-name">ชื่อชีท</Label>
              <Input
                id="create-sheet-name"
                value={newSheetName}
                onChange={(event) => setNewSheetName(event.target.value)}
                placeholder="เช่น งานการเงิน, งานพัสดุ"
                disabled={isSheetFormSubmitting}
                autoFocus
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateSheetDialog(false);
                  setNewSheetName("");
                }}
                disabled={isSheetFormSubmitting}
              >
                ยกเลิก
              </Button>
              <Button type="button" onClick={handleCreateSheet} disabled={isSheetFormSubmitting}>
                {isSheetFormSubmitting ? "กำลังบันทึก..." : "บันทึกชีท"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(renameSheet)}
        onOpenChange={(open) => {
          if (!open) {
            setRenameSheet(null);
            setRenameSheetName("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>แก้ไขชื่อชีท</DialogTitle>
            <DialogDescription>
              ปรับชื่อชีทตารางของเดือนนี้ให้ตรงกับหน่วยงานหรือรูปแบบที่ต้องการ
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRenameSheetSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rename-sheet-name">ชื่อชีท</Label>
              <Input
                id="rename-sheet-name"
                value={renameSheetName}
                onChange={(event) => setRenameSheetName(event.target.value)}
                placeholder="เช่น งานการเงิน"
                autoFocus
                disabled={isRenameSubmitting}
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRenameSheet(null);
                  setRenameSheetName("");
                }}
                disabled={isRenameSubmitting}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isRenameSubmitting}>
                {isRenameSubmitting ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {deleteTarget?.type === "sheet" ? "ยืนยันการลบชีท" : "ยืนยันการลบเจ้าหน้าที่"}
            </DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === "sheet"
                ? `ต้องการลบชีท ${deleteTarget.sheet.name} ใช่หรือไม่?`
                : deleteTarget?.type === "staff"
                ? `ต้องการลบ ${deleteTarget.schedule.staff_name} ออกจากเดือนนี้ใช่หรือไม่?`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {deleteTarget?.type === "sheet" && deleteTarget.sheet.id === selectedSheetId && dirty ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              ชีทนี้มีการเปลี่ยนแปลงที่ยังไม่บันทึกอยู่ การลบจะทิ้งข้อมูลที่ยังไม่บันทึกทันที
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleteSubmitting}>
              ยกเลิก
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDeleteTarget} disabled={isDeleteSubmitting}>
              {isDeleteSubmitting ? "กำลังลบ..." : "ลบ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeViewMode === "editor" ? (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            ชีทตารางของเดือนนี้ {sheets.length} ชีท
          </p>
        </div>

        {sheets.length > 0 ? (
          <div className="flex flex-col gap-3 min-[748px]:flex-row min-[748px]:items-center min-[748px]:justify-between">
            <div className="flex flex-1 flex-col gap-2 min-[748px]:max-w-md">
              <p className="text-xs font-medium text-muted-foreground">เลือกชีทที่ต้องการจัดตาราง</p>
              <Select
                value={selectedSheetId}
                onValueChange={(value) => {
                  if (value) {
                    handleSelectSheet(value);
                  }
                }}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue>
                    {selectedSheet?.name ?? "เลือกชีทตาราง"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {sheets.map((sheet) => (
                    <SelectItem key={sheet.id} value={sheet.id}>
                      {sheet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSheet ? (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {selectedSheet.departName} · รายชื่อในชีทนี้ {savedBySheet[selectedSheet.id]?.length ?? 0} คน
                  </span>
                  <span
                    className={
                      selectedSheet.status === "published"
                        ? "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700"
                        : "inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-medium text-amber-700"
                    }
                  >
                    {selectedSheet.status === "published"
                      ? "Published · ล็อกการแก้ไขแล้ว"
                      : "Draft · ยังแก้ไขและบันทึกได้"}
                  </span>
                </div>
              ) : null}
            </div>

            {canManageSchedule && selectedSheet ? (
              <div className="flex flex-wrap items-center gap-2 min-[748px]:justify-end">
                {selectedSheet.status === "draft" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleOpenPublishSheet(selectedSheet)}
                    disabled={
                      dirty ||
                      isPublishSubmitting ||
                      isRenameSubmitting ||
                      isDeleteSubmitting ||
                      !hasSavedScheduleRows
                    }
                  >
                    <Lock className="h-4 w-4" />
                    Publish
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => handleRenameSheet(selectedSheet.id)}
                  disabled={isRenameSubmitting || isDeleteSubmitting || isPublishedSheet}
                >
                  <Pencil className="h-4 w-4" />
                  เปลี่ยนชื่อชีท
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteSheet(selectedSheet.id)}
                  disabled={isDeleteSubmitting || isRenameSubmitting || isPublishedSheet}
                >
                  <Trash2 className="h-4 w-4" />
                  ลบชีท
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      ) : null}

      {activeViewMode === "editor" && !canManageSchedule && canEditOwnSchedule ? (
        <p className="text-xs text-muted-foreground">
          {selectedSheet && !editableStaffId
            ? "ยังไม่พบข้อมูลเจ้าหน้าที่ของบัญชีนี้ในแผนก จึงยังแก้ไขตารางไม่ได้"
            : null}
        </p>
      ) : null}

      {isScheduleLoading ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
          กำลังโหลดข้อมูลตาราง...
        </div>
      ) : null}

      {activeViewMode === "overview" && myScheduleOverview ? (
        <MyScheduleOverview
          year={year}
          month={month}
          schedule={myScheduleOverview.schedule}
        />
      ) : null}

      {activeViewMode === "editor" ? (
      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <ShiftTable
          year={year}
          month={month}
          schedules={schedules}
          readOnly={!canManageSchedule && !canEditOwnSchedule}
          allowedShiftOptions={canManageSchedule ? undefined : ["ปกติ", "WFH"]}
          disallowHolidayEditing={!canManageSchedule && canEditOwnSchedule}
          isHighlightedRow={isCurrentUsersSchedule}
          canEditSchedule={canEditScheduleRow}
          canRemoveStaff={canRemoveScheduleRow}
          canBulkEditDay={canManageSchedule && !isPublishedSheet}
          onShiftChange={handleShiftChange}
          onBulkDayChange={handleBulkDayChange}
          onRemoveStaff={handleRemoveStaff}
        />
      </section>
      ) : null}

      {showMobileSaveBar ? <div className="h-24" /> : null}

      {canManageSchedule ? (
        <StaffPicker
          open={showPicker}
          onOpenChange={setShowPicker}
          allStaff={allStaff}
          existingStaffIds={existingStaffIds}
          previousMonthStaffIds={previousMonthStaffIds}
          previousMonthStaffOrder={previousMonthStaffOrder}
          onConfirm={handleAddStaff}
          isSubmitting={isAddStaffSubmitting}
        />
      ) : null}

      {canManageSchedule ? (
        <ImportDialog
          open={showImport}
          onOpenChange={setShowImport}
          year={year}
          month={month}
          onImport={handleImport}
          isSubmitting={isImportSubmitting}
        />
      ) : null}

      <Dialog open={Boolean(publishSheet)} onOpenChange={(open) => !open && setPublishSheet(null)}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>ยืนยันการ Publish ชีท</DialogTitle>
            <DialogDescription>
              {publishSheet
                ? `เมื่อ publish ชีท ${publishSheet.name} แล้ว จะไม่สามารถแก้ไขข้อมูลในชีทนี้ได้อีก`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPublishSheet(null)} disabled={isPublishSubmitting}>
              ยกเลิก
            </Button>
            <Button type="button" onClick={confirmPublishSheet} disabled={isPublishSubmitting}>
              {isPublishSubmitting ? "กำลัง publish..." : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showMobileSaveBar ? (
        <div className="fixed inset-x-4 bottom-4 z-40">
          <div className="rounded-3xl border border-sky-200 bg-[linear-gradient(135deg,rgba(240,249,255,0.98),rgba(255,255,255,0.96))] p-3 shadow-[0_18px_45px_rgba(14,116,144,0.18)] ring-1 ring-sky-100 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="relative inline-flex size-2.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/70" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-amber-500" />
                  </span>
                  <p className="text-sm font-semibold text-sky-950">
                    มีการแก้ไขที่ยังไม่บันทึก
                  </p>
                </div>
                <p className="mt-1 text-xs text-sky-800/80">
                  กดบันทึกเพื่ออัปเดตตารางกะล่าสุดของเดือนนี้
                </p>
              </div>
              <Button
                size="sm"
                className="min-w-32 gap-2 rounded-xl bg-sky-600 text-white shadow-md hover:bg-sky-700"
                onClick={handleSave}
                disabled={!canSaveSchedule || isSaveSubmitting}
              >
                <Save className="h-4 w-4" />
                {isSaveSubmitting ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
