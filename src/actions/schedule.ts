"use server";

import { getAppDbPool, queryAppDb } from "@/lib/mysql";
import type { ScheduleRow, ShiftCode } from "@/lib/shiftTypes";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

export type ScheduleMutationResult = {
  ok: boolean;
  message: string;
};

export type ScheduleSheetRecord = {
  id: string;
  name: string;
  year: number;
  month: number;
  departId: string;
  departName: string;
  status: "draft" | "published" | "archived";
};

export type ScheduleSheetListResult = ScheduleMutationResult & {
  sheets: ScheduleSheetRecord[];
};

export type ScheduleSheetRowsResult = ScheduleMutationResult & {
  rows: ScheduleRow[];
};

type ScheduleMonthRow = RowDataPacket & {
  id: number | string;
  year_be: number;
  month: number;
  depart_id: string;
  depart_name: string;
  sheet_name: string;
  status: "draft" | "published" | "archived";
};

type ScheduleSheetRowDb = RowDataPacket & {
  id: number | string;
  schedule_month_id: number | string;
  staff_id: number | string;
  external_staff_id: string;
  row_order: number;
  staff_name: string;
  position_number: string;
  department: string;
  shifts_json: string;
};

type ExistingScheduleSheetRow = RowDataPacket & {
  id: number | string;
  staff_id: number | string;
  created_by_user_id: string;
};

type ScheduleMonthStatusRow = RowDataPacket & {
  status: "draft" | "published" | "archived";
};

function mapScheduleMonthRow(row: ScheduleMonthRow): ScheduleSheetRecord {
  return {
    id: String(row.id),
    name: row.sheet_name,
    year: row.year_be,
    month: row.month,
    departId: row.depart_id,
    departName: row.depart_name,
    status: row.status,
  };
}

function normalizeShiftsJson(value: string): Record<string, ShiftCode> {
  try {
    const parsed = JSON.parse(value) as Record<string, ShiftCode>;

    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

function mapScheduleSheetRow(row: ScheduleSheetRowDb): ScheduleRow {
  return {
    id: String(row.id),
    staff_id: String(row.staff_id),
    external_staff_id: row.external_staff_id,
    staff_name: row.staff_name,
    position_number: row.position_number,
    department: row.department,
    shifts: normalizeShiftsJson(row.shifts_json),
  };
}

async function getScheduleMonthStatus(scheduleMonthId: string) {
  const rows = await queryAppDb<ScheduleMonthStatusRow>(
    `
      SELECT status
      FROM schedule_months
      WHERE id = :scheduleMonthId
      LIMIT 1
    `,
    { scheduleMonthId }
  );

  return rows[0]?.status ?? null;
}

export async function listScheduleMonthsByDepartment(
  year: number,
  month: number,
  departId: string
): Promise<ScheduleSheetListResult> {
  try {
    const rows = await queryAppDb<ScheduleMonthRow>(
      `
        SELECT
          id,
          year_be,
          month,
          depart_id,
          depart_name,
          sheet_name,
          status
        FROM schedule_months
        WHERE year_be = :year
          AND month = :month
          AND depart_id = :departId
        ORDER BY created_at ASC, id ASC
      `,
      {
        year,
        month,
        departId: departId.trim(),
      }
    );

    return {
      ok: true,
      message: `Loaded ${rows.length} schedule sheets.`,
      sheets: rows.map(mapScheduleMonthRow),
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to load schedule sheets.",
      sheets: [],
    };
  }
}

export async function createScheduleMonth(input: {
  year: number;
  month: number;
  departId: string;
  departName: string;
  sheetName: string;
  userId: string;
}): Promise<ScheduleMutationResult & { sheet?: ScheduleSheetRecord }> {
  try {
    const sheetName = input.sheetName.trim();

    if (!sheetName) {
      return { ok: false, message: "กรุณาระบุชื่อชีท" };
    }

    const pool = getAppDbPool();
    const [result] = await pool.query<ResultSetHeader>(
      `
        INSERT INTO schedule_months (
          year_be,
          month,
          depart_id,
          depart_name,
          sheet_name,
          status,
          created_by_user_id,
          updated_by_user_id
        ) VALUES (
          :year,
          :month,
          :departId,
          :departName,
          :sheetName,
          'draft',
          :userId,
          :userId
        )
      `,
      {
        year: input.year,
        month: input.month,
        departId: input.departId.trim(),
        departName: input.departName.trim(),
        sheetName,
        userId: input.userId.trim(),
      }
    );

    return {
      ok: true,
      message: `สร้างชีท ${sheetName} เรียบร้อย`,
      sheet: {
        id: String(result.insertId),
        name: sheetName,
        year: input.year,
        month: input.month,
        departId: input.departId.trim(),
        departName: input.departName.trim(),
        status: "draft",
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to create schedule sheet.",
    };
  }
}

export async function renameScheduleMonth(input: {
  sheetId: string;
  sheetName: string;
  userId: string;
}): Promise<ScheduleMutationResult> {
  try {
    const sheetName = input.sheetName.trim();

    if (!sheetName) {
      return { ok: false, message: "กรุณาระบุชื่อชีท" };
    }

    const status = await getScheduleMonthStatus(input.sheetId);

    if (status === "published") {
      return { ok: false, message: "ชีทที่ publish แล้วไม่สามารถแก้ไขชื่อได้" };
    }

    await queryAppDb(
      `
        UPDATE schedule_months
        SET sheet_name = :sheetName,
            updated_by_user_id = :userId
        WHERE id = :sheetId
      `,
      {
        sheetId: input.sheetId,
        sheetName,
        userId: input.userId.trim(),
      }
    );

    return {
      ok: true,
      message: `เปลี่ยนชื่อชีทเป็น ${sheetName} แล้ว`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to rename schedule sheet.",
    };
  }
}

export async function deleteScheduleMonth(sheetId: string): Promise<ScheduleMutationResult> {
  try {
    const status = await getScheduleMonthStatus(sheetId);

    if (status === "published") {
      return { ok: false, message: "ชีทที่ publish แล้วไม่สามารถลบได้" };
    }

    await queryAppDb(`DELETE FROM schedule_months WHERE id = :sheetId`, { sheetId });

    return {
      ok: true,
      message: "ลบชีทเรียบร้อยแล้ว",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to delete schedule sheet.",
    };
  }
}

export async function publishScheduleMonth(input: {
  sheetId: string;
  userId: string;
}): Promise<ScheduleMutationResult> {
  try {
    const status = await getScheduleMonthStatus(input.sheetId);

    if (!status) {
      return { ok: false, message: "ไม่พบชีทที่ต้องการ publish" };
    }

    if (status === "published") {
      return { ok: false, message: "ชีทนี้ถูก publish แล้ว" };
    }

    await queryAppDb(
      `
        UPDATE schedule_months
        SET status = 'published',
            updated_by_user_id = :userId
        WHERE id = :sheetId
      `,
      {
        sheetId: input.sheetId,
        userId: input.userId.trim(),
      }
    );

    return {
      ok: true,
      message: "Publish ชีทเรียบร้อยแล้ว",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to publish schedule sheet.",
    };
  }
}

export async function getScheduleSheetRows(
  scheduleMonthId: string
): Promise<ScheduleSheetRowsResult> {
  try {
    const rows = await queryAppDb<ScheduleSheetRowDb>(
      `
        SELECT
          id,
          schedule_month_id,
          staff_id,
          external_staff_id,
          row_order,
          staff_name,
          position_number,
          department,
          CAST(shifts_json AS CHAR) AS shifts_json
        FROM schedule_sheet_rows
        WHERE schedule_month_id = :scheduleMonthId
        ORDER BY row_order ASC, id ASC
      `,
      { scheduleMonthId }
    );

    return {
      ok: true,
      message: `Loaded ${rows.length} schedule rows.`,
      rows: rows.map(mapScheduleSheetRow),
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to load schedule rows.",
      rows: [],
    };
  }
}

export async function saveScheduleSheetRows(input: {
  scheduleMonthId: string;
  schedules: ScheduleRow[];
  userId: string;
  canManageSchedule: boolean;
  editableStaffId?: string;
  editableExternalStaffId?: string;
}): Promise<ScheduleMutationResult> {
  const pool = getAppDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [statusRows] = await connection.query<ScheduleMonthStatusRow[]>(
      `
        SELECT status
        FROM schedule_months
        WHERE id = :scheduleMonthId
        LIMIT 1
      `,
      { scheduleMonthId: input.scheduleMonthId }
    );

    if (statusRows[0]?.status === "published") {
      await connection.rollback();
      return {
        ok: false,
        message: "ชีทนี้ถูก publish แล้ว จึงไม่สามารถบันทึกแก้ไขได้",
      };
    }

    if (!input.canManageSchedule) {
      if (!input.editableStaffId && !input.editableExternalStaffId) {
        await connection.rollback();
        return {
          ok: false,
          message: "ไม่พบสิทธิ์แก้ไขตารางของตัวเอง",
        };
      }

      const editableSchedule = input.schedules.find(
        (schedule) =>
          (input.editableExternalStaffId &&
            schedule.external_staff_id === input.editableExternalStaffId) ||
          (input.editableStaffId && schedule.staff_id === input.editableStaffId)
      );

      if (!editableSchedule) {
        await connection.rollback();
        return {
          ok: false,
          message: "ไม่พบรายการตารางของผู้ใช้งานคนนี้ในชีท",
        };
      }

      await connection.query(
        `
          UPDATE schedule_sheet_rows
          SET shifts_json = :shiftsJson,
              updated_by_user_id = :userId
          WHERE schedule_month_id = :scheduleMonthId
            AND (
              (:externalStaffId <> '' AND external_staff_id = :externalStaffId)
              OR (:staffId <> '' AND staff_id = :staffId)
            )
        `,
        {
          scheduleMonthId: input.scheduleMonthId,
          staffId: input.editableStaffId ?? "",
          externalStaffId: input.editableExternalStaffId ?? "",
          shiftsJson: JSON.stringify(editableSchedule.shifts ?? {}),
          userId: input.userId.trim(),
        }
      );

      await connection.query(
        `
          UPDATE schedule_months
          SET updated_by_user_id = :userId
          WHERE id = :scheduleMonthId
        `,
        {
          scheduleMonthId: input.scheduleMonthId,
          userId: input.userId.trim(),
        }
      );

      await connection.commit();

      return {
        ok: true,
        message: "บันทึกตารางกะของตัวเองสำเร็จ",
      };
    }

    const [existingRows] = await connection.query<ExistingScheduleSheetRow[]>(
      `
        SELECT id, staff_id, created_by_user_id
        FROM schedule_sheet_rows
        WHERE schedule_month_id = :scheduleMonthId
      `,
      { scheduleMonthId: input.scheduleMonthId }
    );

    const existingByStaffId = new Map(
      existingRows.map((row) => [String(row.staff_id), row])
    );
    const submittedStaffIds = new Set(input.schedules.map((schedule) => schedule.staff_id));

    for (const existingRow of existingRows) {
      const staffId = String(existingRow.staff_id);

      if (!submittedStaffIds.has(staffId)) {
        await connection.query(`DELETE FROM schedule_sheet_rows WHERE id = :id`, {
          id: existingRow.id,
        });
      }
    }

    for (const [index, schedule] of input.schedules.entries()) {
      const existingRow = existingByStaffId.get(schedule.staff_id);
      const rowOrder = index + 1;
      const payload = {
        scheduleMonthId: input.scheduleMonthId,
        staffId: schedule.staff_id,
        externalStaffId: schedule.external_staff_id ?? "",
        rowOrder,
        staffName: schedule.staff_name,
        positionNumber: schedule.position_number,
        department: schedule.department || "",
        shiftsJson: JSON.stringify(schedule.shifts ?? {}),
        createdByUserId: existingRow?.created_by_user_id ?? input.userId.trim(),
        updatedByUserId: input.userId.trim(),
      };

      if (existingRow) {
        await connection.query(
          `
            UPDATE schedule_sheet_rows
            SET
              row_order = :rowOrder,
              external_staff_id = :externalStaffId,
              staff_name = :staffName,
              position_number = :positionNumber,
              department = :department,
              shifts_json = :shiftsJson,
              updated_by_user_id = :updatedByUserId
            WHERE id = :id
          `,
          {
            ...payload,
            id: existingRow.id,
          }
        );
      } else {
        await connection.query(
          `
            INSERT INTO schedule_sheet_rows (
              schedule_month_id,
              staff_id,
              external_staff_id,
              row_order,
              staff_name,
              position_number,
              department,
              shifts_json,
              created_by_user_id,
              updated_by_user_id
            ) VALUES (
              :scheduleMonthId,
              :staffId,
              :externalStaffId,
              :rowOrder,
              :staffName,
              :positionNumber,
              :department,
              :shiftsJson,
              :createdByUserId,
              :updatedByUserId
            )
          `,
          payload
        );
      }
    }

    await connection.query(
      `
        UPDATE schedule_months
        SET updated_by_user_id = :userId
        WHERE id = :scheduleMonthId
      `,
      {
        scheduleMonthId: input.scheduleMonthId,
        userId: input.userId.trim(),
      }
    );

    await connection.commit();

    return {
      ok: true,
      message: "บันทึกตารางกะสำเร็จ",
    };
  } catch (error) {
    await connection.rollback();

    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to save schedule rows.",
    };
  } finally {
    connection.release();
  }
}
