"use server";

import { randomUUID } from "node:crypto";

import { getAppDbPool, queryAppDb, queryCentralDb } from "@/lib/mysql";
import {
  normalizeCentralStaffRow,
  type CentralStaffRow,
  type SyncedStaffRecord,
} from "@/lib/staff-sync";
import type { RowDataPacket } from "mysql2/promise";

export type LocalStaffRecord = {
  id: string;
  externalStaffId: string;
  departId: string;
  departName: string;
  firstName: string;
  lastName: string;
  fullName: string;
  positionNumber: string;
  isActive: boolean;
};

type LocalStaffMutationInput = {
  departId: string;
  departName: string;
  firstName: string;
  lastName: string;
  positionNumber: string;
};

export type LocalStaffMutationResult = {
  ok: boolean;
  message: string;
};

export type LocalStaffListResult = {
  ok: boolean;
  message: string;
  rows: LocalStaffRecord[];
};

type SyncStaffResult = {
  ok: boolean;
  message: string;
  rows: SyncedStaffRecord[];
};

type SyncStaffToLocalResult = {
  ok: boolean;
  message: string;
  fetchedCount: number;
  insertedCount: number;
  updatedCount: number;
};

type ExistingStaffRow = RowDataPacket & {
  external_staff_id: string;
};

type LocalStaffRow = RowDataPacket & {
  id: number | string;
  external_staff_id: string;
  depart_id: string;
  depart_name: string;
  first_name: string;
  last_name: string;
  full_name: string;
  position_number: string | null;
  is_active: number;
};

type DuplicatePositionRow = RowDataPacket & {
  id: number | string;
  full_name: string;
};

function mapLocalStaffRow(row: LocalStaffRow): LocalStaffRecord {
  return {
    id: String(row.id),
    externalStaffId: row.external_staff_id,
    departId: row.depart_id,
    departName: row.depart_name,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: row.full_name,
    positionNumber: row.position_number ?? "",
    isActive: row.is_active !== 0,
  };
}

async function findDuplicatePositionNumber(
  positionNumber: string,
  excludeStaffId?: string
): Promise<DuplicatePositionRow | null> {
  const normalizedPositionNumber = positionNumber.trim();

  if (!normalizedPositionNumber) {
    return null;
  }

  const rows = await queryAppDb<DuplicatePositionRow>(
    `
      SELECT id, full_name
      FROM staff
      WHERE position_number = :positionNumber
        AND (:excludeStaffId = '' OR id <> :excludeStaffId)
      LIMIT 1
    `,
    {
      positionNumber: normalizedPositionNumber,
      excludeStaffId: excludeStaffId?.trim() ?? "",
    }
  );

  return rows[0] ?? null;
}

export async function listLocalStaffByDepartment(
  departId?: string
): Promise<LocalStaffListResult> {
  try {
    const rows = await queryAppDb<LocalStaffRow>(
      `
        SELECT
          id,
          external_staff_id,
          depart_id,
          depart_name,
          first_name,
          last_name,
          full_name,
          position_number,
          is_active
        FROM staff
        WHERE (:departId = '' OR depart_id = :departId)
        ORDER BY is_active DESC, full_name ASC
      `,
      { departId: departId?.trim() ?? "" }
    );

    return {
      ok: true,
      message: `Loaded ${rows.length} staff rows from local DB.`,
      rows: rows.map(mapLocalStaffRow),
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to load local staff.",
      rows: [],
    };
  }
}

export async function createLocalStaff(
  input: LocalStaffMutationInput
): Promise<LocalStaffMutationResult> {
  try {
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    const fullName = `${firstName} ${lastName}`.trim();
    const positionNumber = input.positionNumber.trim();
    const duplicateStaff = await findDuplicatePositionNumber(positionNumber);

    if (duplicateStaff) {
      return {
        ok: false,
        message: `เลขตำแหน่ง ${positionNumber} ถูกใช้โดย ${duplicateStaff.full_name} อยู่แล้ว`,
      };
    }

    await queryAppDb(
      `
        INSERT INTO staff (
          external_staff_id,
          depart_id,
          depart_name,
          first_name,
          last_name,
          full_name,
          position_number,
          is_active,
          last_synced_at
        ) VALUES (
          :externalStaffId,
          :departId,
          :departName,
          :firstName,
          :lastName,
          :fullName,
          :positionNumber,
          1,
          NOW()
        )
      `,
      {
        externalStaffId: `manual:${randomUUID()}`,
        departId: input.departId.trim(),
        departName: input.departName.trim(),
        firstName,
        lastName,
        fullName,
        positionNumber,
      }
    );

    return {
      ok: true,
      message: `เพิ่มเจ้าหน้าที่ ${fullName} แล้ว`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to create staff.",
    };
  }
}

export async function updateLocalStaff(
  staffId: string,
  input: LocalStaffMutationInput
): Promise<LocalStaffMutationResult> {
  try {
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    const fullName = `${firstName} ${lastName}`.trim();
    const positionNumber = input.positionNumber.trim();
    const duplicateStaff = await findDuplicatePositionNumber(positionNumber, staffId);

    if (duplicateStaff) {
      return {
        ok: false,
        message: `เลขตำแหน่ง ${positionNumber} ถูกใช้โดย ${duplicateStaff.full_name} อยู่แล้ว`,
      };
    }

    await queryAppDb(
      `
        UPDATE staff
        SET
          depart_id = :departId,
          depart_name = :departName,
          first_name = :firstName,
          last_name = :lastName,
          full_name = :fullName,
          position_number = :positionNumber
        WHERE id = :staffId
      `,
      {
        staffId,
        departId: input.departId.trim(),
        departName: input.departName.trim(),
        firstName,
        lastName,
        fullName,
        positionNumber,
      }
    );

    return {
      ok: true,
      message: `อัปเดตข้อมูล ${fullName} แล้ว`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to update staff.",
    };
  }
}

export async function toggleLocalStaffStatus(
  staffId: string
): Promise<LocalStaffMutationResult> {
  try {
    await queryAppDb(
      `
        UPDATE staff
        SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END
        WHERE id = :staffId
      `,
      { staffId }
    );

    return {
      ok: true,
      message: "สลับสถานะเจ้าหน้าที่แล้ว",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to toggle staff status.",
    };
  }
}

export async function deleteLocalStaff(
  staffId: string
): Promise<LocalStaffMutationResult> {
  try {
    await queryAppDb(`DELETE FROM staff WHERE id = :staffId`, { staffId });

    return {
      ok: true,
      message: "ลบเจ้าหน้าที่แล้ว",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to delete staff.",
    };
  }
}

function buildCentralStaffQuery(departId?: string) {
  const baseQuery = `
    select
      tm.mem_id as external_staff_id,
      midh.internal_department_hr_id as depart_id,
      midh.internal_department_hr_name as depart_name,
      tm.mem_fname as first_name,
      tm.mem_lname as last_name,
      CONCAT(tm.mem_fname,' ',tm.mem_lname) as full_name
    from tb_member tm
    left join master_internal_department_hr midh
      on midh.internal_department_hr_id = tm.u_in_id
    where tm.mem_hoscode = '00003'
  `;

  if (departId?.trim()) {
    return {
      sql: `${baseQuery} and midh.internal_department_hr_id = :departId`,
      values: { departId: departId.trim() },
    };
  }

  return {
    sql: baseQuery,
    values: undefined,
  };
}

async function fetchCentralStaffRows(departId?: string) {
  const query = buildCentralStaffQuery(departId);
  const rawRows = await queryCentralDb<CentralStaffRow>(query.sql, query.values);

  return rawRows.map(normalizeCentralStaffRow);
}

export async function previewCentralStaffSyncByDepartment(
  departId?: string
): Promise<SyncStaffResult> {
  try {
    const rows = await fetchCentralStaffRows(departId);

    return {
      ok: true,
      message: `Fetched ${rows.length} staff rows from central DB.`,
      rows,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to preview central staff sync.",
      rows: [],
    };
  }
}

export async function syncCentralStaffByDepartment(
  departId?: string
): Promise<SyncStaffToLocalResult> {
  try {
    const rows = await fetchCentralStaffRows(departId);
    const pool = getAppDbPool();

    if (rows.length === 0) {
      return {
        ok: true,
        message: "No staff rows found from central DB.",
        fetchedCount: 0,
        insertedCount: 0,
        updatedCount: 0,
      };
    }

    const externalStaffIds = rows.map((row) => row.externalStaffId);
    const placeholders = externalStaffIds.map(() => "?").join(", ");
    const existingRows = await queryAppDb<ExistingStaffRow>(
      `SELECT external_staff_id FROM staff WHERE external_staff_id IN (${placeholders})`,
      externalStaffIds
    );
    const existingIds = new Set(
      existingRows.map((row: ExistingStaffRow) => row.external_staff_id)
    );
    const insertedCount = rows.filter((row) => !existingIds.has(row.externalStaffId)).length;
    const updatedCount = rows.length - insertedCount;

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      for (const row of rows) {
        await connection.execute(
          `
            INSERT INTO staff (
              external_staff_id,
              depart_id,
              depart_name,
              first_name,
              last_name,
              full_name,
              last_synced_at
            ) VALUES (
              :externalStaffId,
              :departId,
              :departName,
              :firstName,
              :lastName,
              :fullName,
              NOW()
            )
            ON DUPLICATE KEY UPDATE
              depart_id = VALUES(depart_id),
              depart_name = VALUES(depart_name),
              first_name = VALUES(first_name),
              last_name = VALUES(last_name),
              full_name = VALUES(full_name),
              last_synced_at = NOW()
          `,
          {
            externalStaffId: row.externalStaffId,
            departId: row.departId,
            departName: row.departName,
            firstName: row.firstName,
            lastName: row.lastName,
            fullName: row.fullName,
          } as never
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return {
      ok: true,
      message: `Synced ${rows.length} staff rows from central DB into local staff table.`,
      fetchedCount: rows.length,
      insertedCount,
      updatedCount,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to sync central staff.",
      fetchedCount: 0,
      insertedCount: 0,
      updatedCount: 0,
    };
  }
}
