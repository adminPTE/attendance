"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import {
  createLocalStaff,
  deleteLocalStaff,
  listLocalStaffByDepartment,
  toggleLocalStaffStatus,
  updateLocalStaff,
  type LocalStaffMutationResult,
} from "@/actions/staff";
import type { StaffRecord } from "@/components/private/staff-form-dialog";
import {
  clearAuthSession,
  readAuthSession,
  subscribeAuthSession,
  type UserRole,
} from "@/lib/auth-session";

type PrivateDataContextValue = {
  currentUserRole: UserRole;
  currentUserId: string;
  currentUserName: string;
  currentDepartId: string;
  currentDepartName: string;
  canManageSchedule: boolean;
  canEditOwnSchedule: boolean;
  canManageStaff: boolean;
  isStaffLoading: boolean;
  staffList: StaffRecord[];
  refreshStaff: () => Promise<void>;
  createStaff: (values: StaffRecord) => Promise<LocalStaffMutationResult>;
  updateStaff: (staffId: string, values: StaffRecord) => Promise<LocalStaffMutationResult>;
  toggleStaffStatus: (staffId: string) => Promise<LocalStaffMutationResult>;
  deleteStaff: (staffId: string) => Promise<LocalStaffMutationResult>;
  signOut: () => void;
};

const PrivateDataContext = createContext<PrivateDataContextValue | null>(null);

export function PrivateDataProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const authSession = useSyncExternalStore(subscribeAuthSession, readAuthSession, () => null);
  const hasMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [staffList, setStaffList] = useState<StaffRecord[]>([]);
  const [isStaffLoading, setIsStaffLoading] = useState(true);
  const currentUserRole: UserRole = authSession?.userRole ?? "general";
  const currentUserId = authSession?.userId ?? "";
  const currentUserName = authSession?.userName ?? "";
  const currentDepartId = authSession?.departId ?? "";
  const currentDepartName = authSession?.departName ?? "";
  const canManageSchedule = currentUserRole === "assigned";
  const canEditOwnSchedule = currentUserRole === "general";
  const canManageStaff = currentUserRole === "assigned";

  const resolvedUserName = useMemo(() => {
    const currentStaff = staffList.find((staff) => staff.external_staff_id === currentUserId);

    if (!currentStaff) {
      return currentUserName;
    }

    return `${currentStaff.first_name} ${currentStaff.last_name}`.trim();
  }, [currentUserId, currentUserName, staffList]);

  useEffect(() => {
    if (hasMounted && !authSession) {
      router.replace("/login");
    }
  }, [authSession, hasMounted, router]);

  async function refreshStaff() {
    if (!currentDepartId) {
      setStaffList([]);
      setIsStaffLoading(false);
      return;
    }

    setIsStaffLoading(true);

    try {
      const result = await listLocalStaffByDepartment(currentDepartId);

      setStaffList(
        result.ok
          ? result.rows.map((staff) => ({
              id: staff.id,
              external_staff_id: staff.externalStaffId,
              first_name: staff.firstName,
              last_name: staff.lastName,
              position_number: staff.positionNumber,
              department: staff.departName,
              is_active: staff.isActive,
            }))
          : []
      );
    } finally {
      setIsStaffLoading(false);
    }
  }

  useEffect(() => {
    if (!currentDepartId) {
      return;
    }

    let ignore = false;

    void listLocalStaffByDepartment(currentDepartId).then((result) => {
      if (ignore) {
        return;
      }

      setStaffList(
        result.ok
          ? result.rows.map((staff) => ({
              id: staff.id,
              external_staff_id: staff.externalStaffId,
              first_name: staff.firstName,
              last_name: staff.lastName,
              position_number: staff.positionNumber,
              department: staff.departName,
              is_active: staff.isActive,
            }))
          : []
      );
      setIsStaffLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, [currentDepartId]);

  async function createStaff(values: StaffRecord) {
    const result = await createLocalStaff({
      departId: currentDepartId,
      departName: currentDepartName,
      firstName: values.first_name,
      lastName: values.last_name,
      positionNumber: values.position_number,
    });

    if (result.ok) {
      await refreshStaff();
    }

    return result;
  }

  async function updateStaff(staffId: string, values: StaffRecord) {
    const result = await updateLocalStaff(staffId, {
      departId: currentDepartId,
      departName: currentDepartName,
      firstName: values.first_name,
      lastName: values.last_name,
      positionNumber: values.position_number,
    });

    if (result.ok) {
      await refreshStaff();
    }

    return result;
  }

  async function toggleStaffStatus(staffId: string) {
    const result = await toggleLocalStaffStatus(staffId);

    if (result.ok) {
      await refreshStaff();
    }

    return result;
  }

  async function deleteStaff(staffId: string) {
    const result = await deleteLocalStaff(staffId);

    if (result.ok) {
      await refreshStaff();
    }

    return result;
  }

  function signOut() {
    clearAuthSession();
    setStaffList([]);
    router.replace("/login");
  }

  if (!hasMounted || !authSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="rounded-3xl border border-border bg-card px-6 py-5 text-center shadow-sm">
          <p className="text-sm font-medium text-foreground">กำลังตรวจสอบการเข้าสู่ระบบ...</p>
          <p className="mt-1 text-sm text-muted-foreground">โปรดรอสักครู่</p>
        </div>
      </div>
    );
  }

  return (
    <PrivateDataContext.Provider
      value={{
        currentUserRole,
        currentUserId,
        currentUserName: resolvedUserName,
        currentDepartId,
        currentDepartName,
        canManageSchedule,
        canEditOwnSchedule,
        canManageStaff,
        isStaffLoading,
        staffList,
        refreshStaff,
        createStaff,
        updateStaff,
        toggleStaffStatus,
        deleteStaff,
        signOut,
      }}
    >
      {children}
    </PrivateDataContext.Provider>
  );
}

export function usePrivateData() {
  const context = useContext(PrivateDataContext);

  if (!context) {
    throw new Error("usePrivateData must be used within PrivateDataProvider");
  }

  return context;
}
