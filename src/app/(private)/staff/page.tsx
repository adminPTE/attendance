"use client";

import { useState, useTransition } from "react";
import {
  RefreshCw,
  Pencil,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import { syncCentralStaffByDepartment } from "@/actions/staff";
import {
  StaffFormDialog,
  StaffRecord,
} from "@/components/private/staff-form-dialog";
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
import { Input } from "@/components/ui/input";

export default function StaffPage() {
  const {
    staffList,
    createStaff,
    updateStaff,
    toggleStaffStatus,
    deleteStaff,
    refreshStaff,
    currentDepartId,
    currentDepartName,
    canManageStaff,
    isStaffLoading,
  } = usePrivateData();
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffRecord | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<StaffRecord | null>(null);
  const [search, setSearch] = useState("");
  const [isSyncPending, startSyncTransition] = useTransition();
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [pendingToggleStaffId, setPendingToggleStaffId] = useState<string | null>(null);
  const [isDeletePending, setIsDeletePending] = useState(false);

  const filteredStaff = staffList.filter((staff) => {
    const q = search.toLowerCase();
    return (
      staff.first_name.toLowerCase().includes(q) ||
      staff.last_name.toLowerCase().includes(q) ||
      staff.position_number.toLowerCase().includes(q) ||
      (staff.department || "").toLowerCase().includes(q)
    );
  });

  const activeCount = staffList.filter((staff) => staff.is_active !== false).length;

  if (!canManageStaff) {
    return (
      <section className="rounded-3xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">ไม่มีสิทธิ์เข้าถึง</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          บัญชีผู้ใช้งานทั่วไปสามารถดูได้เฉพาะเมนูตารางกะเท่านั้น
        </p>
      </section>
    );
  }

  function openCreateForm() {
    setEditingStaff(null);
    setShowForm(true);
  }

  function handleSubmit(values: StaffRecord) {
    if (isFormSubmitting) {
      return;
    }

    setIsFormSubmitting(true);

    if (editingStaff?.id) {
      startSyncTransition(async () => {
        try {
          const result = await updateStaff(editingStaff.id ?? "", values);
          if (result.ok) {
            toast.success(result.message || "อัปเดตข้อมูลเจ้าหน้าที่สำเร็จ");
            setShowForm(false);
            setEditingStaff(null);
            return;
          }

          toast.error(result.message);
        } finally {
          setIsFormSubmitting(false);
        }
      });
    } else {
      startSyncTransition(async () => {
        try {
          const result = await createStaff(values);
          if (result.ok) {
            toast.success(result.message || "เพิ่มเจ้าหน้าที่สำเร็จ");
            setShowForm(false);
            setEditingStaff(null);
            return;
          }

          toast.error(result.message);
        } finally {
          setIsFormSubmitting(false);
        }
      });
    }
  }

  function handleToggleStatus(staffId: string) {
    const targetStaff = staffList.find((staff) => staff.id === staffId);
    if (!targetStaff) {
      return;
    }

    if (pendingToggleStaffId) {
      return;
    }

    const nextActive = targetStaff.is_active === false;
    setPendingToggleStaffId(staffId);
    startSyncTransition(async () => {
      try {
        const result = await toggleStaffStatus(staffId);
        if (result.ok) {
          toast.success(
            nextActive
              ? `เปิดใช้งาน ${targetStaff.first_name} ${targetStaff.last_name} แล้ว`
              : `ปิดใช้งาน ${targetStaff.first_name} ${targetStaff.last_name} แล้ว`
          );
          return;
        }

        toast.error(result.message);
      } finally {
        setPendingToggleStaffId(null);
      }
    });
  }

  function handleDeleteStaff(staff: StaffRecord) {
    if (!staff.id) {
      toast.error("ไม่พบรหัสเจ้าหน้าที่");
      return;
    }

    setDeletingStaff(staff);
  }

  function confirmDeleteStaff() {
    if (!deletingStaff?.id || isDeletePending) {
      return;
    }

    const staffId = deletingStaff.id;
    const staffName = `${deletingStaff.first_name} ${deletingStaff.last_name}`;

    setIsDeletePending(true);
    startSyncTransition(async () => {
      try {
        const result = await deleteStaff(staffId);

        if (result.ok) {
          toast.success(`ลบ ${staffName} แล้ว`);
          setDeletingStaff(null);
          return;
        }

        toast.error(result.message);
      } finally {
        setIsDeletePending(false);
      }
    });
  }

  function handleSyncStaff() {
    startSyncTransition(async () => {
      const result = await syncCentralStaffByDepartment(currentDepartId);

      if (!result.ok) {
        toast.error(`sync ไม่สำเร็จ: ${result.message}`);
        return;
      }

      await refreshStaff();

      toast.success(
        `sync รายชื่อเจ้าหน้าที่จาก${currentDepartName}แล้ว ${result.fetchedCount} รายการ ` +
          `(เพิ่ม ${result.insertedCount}, อัปเดต ${result.updatedCount})`
      );
    });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">รายชื่อเจ้าหน้าที่</h2>
            <p className="text-sm text-muted-foreground">
              ทั้งหมด {staffList.length} คน · ใช้งาน {activeCount} คน
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSyncStaff}
              disabled={isSyncPending}
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4${isSyncPending ? " animate-spin" : ""}`}
              />
              {isSyncPending ? "กำลัง sync..." : "sync รายชื่อเจ้าหน้าที่"}
            </Button>

            <Button onClick={openCreateForm} className="gap-2" disabled={isSyncPending || isFormSubmitting}>
              <UserPlus className="h-4 w-4" />
              เพิ่มเจ้าหน้าที่
            </Button>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ค้นหาชื่อ, นามสกุล, เลขตำแหน่ง..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>

        {isStaffLoading ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
            <p className="text-sm font-medium text-foreground">กำลังโหลดรายชื่อเจ้าหน้าที่...</p>
          </div>
        ) : null}

        {!isStaffLoading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStaff.map((staff) => {
            const initials = `${staff.first_name[0] ?? ""}${staff.last_name[0] ?? ""}`;
            const statusClassName =
              staff.is_active !== false
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground";

            return (
              <article
                key={staff.id}
                className="group rounded-2xl border border-border bg-background p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {initials}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {staff.first_name} {staff.last_name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        เลขตำแหน่ง: {staff.position_number}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClassName}`}
                  >
                    {staff.is_active !== false ? "ใช้งาน" : "ไม่ใช้งาน"}
                  </span>
                </div>

                {staff.department ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    แผนก: {staff.department}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingStaff(staff);
                      setShowForm(true);
                    }}
                    disabled={isSyncPending || isFormSubmitting || isDeletePending || pendingToggleStaffId !== null}
                    className="h-8 gap-1 text-xs"
                  >
                    <Pencil className="h-3 w-3" />
                    แก้ไข
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleStatus(staff.id ?? "")}
                    disabled={pendingToggleStaffId !== null || isDeletePending || isFormSubmitting}
                    className="h-8 gap-1 text-xs"
                  >
                    {staff.is_active !== false ? (
                      <UserX className="h-3 w-3" />
                    ) : (
                      <UserCheck className="h-3 w-3" />
                    )}
                    {pendingToggleStaffId === staff.id
                      ? "กำลังบันทึก..."
                      : staff.is_active !== false
                        ? "ปิดใช้งาน"
                        : "เปิดใช้งาน"}
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteStaff(staff)}
                    disabled={isDeletePending || pendingToggleStaffId !== null || isFormSubmitting}
                    className="h-8 gap-1 text-xs"
                  >
                    <Trash2 className="h-3 w-3" />
                    ลบ
                  </Button>
                </div>
              </article>
            );
          })}
        </div> : null}

        {!isStaffLoading && filteredStaff.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
            <p className="text-sm font-medium text-foreground">
              ไม่พบเจ้าหน้าที่ที่ตรงกับคำค้นหา
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              ลองค้นหาด้วยชื่อ นามสกุล เลขตำแหน่ง หรือแผนก
            </p>
          </div>
        ) : null}
      </section>

      <StaffFormDialog
        key={editingStaff?.id ?? "new-staff"}
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) {
            setEditingStaff(null);
          }
        }}
        staff={editingStaff}
        defaultDepartment={`${currentDepartName} (${currentDepartId})`}
        onSubmit={handleSubmit}
        isSubmitting={isFormSubmitting}
      />

      <Dialog open={Boolean(deletingStaff)} onOpenChange={(open) => !open && setDeletingStaff(null)}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบเจ้าหน้าที่</DialogTitle>
            <DialogDescription>
              {deletingStaff
                ? `ต้องการลบ ${deletingStaff.first_name} ${deletingStaff.last_name} ใช่หรือไม่?`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeletingStaff(null)} disabled={isDeletePending}>
              ยกเลิก
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDeleteStaff} disabled={isDeletePending}>
              {isDeletePending ? "กำลังลบ..." : "ลบ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
