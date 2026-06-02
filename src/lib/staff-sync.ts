import type { RowDataPacket } from "mysql2/promise";

export type CentralStaffRow = RowDataPacket & {
  external_staff_id?: string | number | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  depart_id?: string | number | null;
  depart_name?: string | null;
};

export type SyncedStaffRecord = {
  externalStaffId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  departId: string;
  departName: string;
};

function splitFullName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { firstName: "", lastName: "" };
  }

  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export function normalizeCentralStaffRow(row: CentralStaffRow): SyncedStaffRecord {
  const externalStaffId = String(
    row.external_staff_id ?? row.depart_id ?? ""
  ).trim();
  const departId = String(row.depart_id ?? "").trim();
  const departName = String(row.depart_name ?? "").trim();
  const rawFullName = String(row.full_name ?? "").trim();
  const derivedNames = splitFullName(rawFullName);
  const firstName = String(row.first_name ?? derivedNames.firstName).trim();
  const lastName = String(row.last_name ?? derivedNames.lastName).trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || rawFullName;

  if (!externalStaffId) {
    throw new Error("Missing external_staff_id in central staff row.");
  }

  if (!fullName) {
    throw new Error(`Missing name for external_staff_id ${externalStaffId}.`);
  }

  return {
    externalStaffId,
    firstName,
    lastName,
    fullName,
    departId,
    departName,
  };
}
