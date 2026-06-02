"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type StaffFormValues = {
  first_name: string;
  last_name: string;
  position_number: string;
  department: string;
};

export type StaffRecord = StaffFormValues & {
  id?: string;
  external_staff_id?: string;
  is_active?: boolean;
};

type StaffFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff?: StaffRecord | null;
  defaultDepartment?: string;
  onSubmit: (values: StaffRecord) => void;
  isSubmitting?: boolean;
};

const emptyForm: StaffFormValues = {
  first_name: "",
  last_name: "",
  position_number: "",
  department: "",
};

function getFormValues(staff?: StaffRecord | null): StaffFormValues {
  if (!staff) {
    return emptyForm;
  }

  return {
    first_name: staff.first_name || "",
    last_name: staff.last_name || "",
    position_number: staff.position_number || "",
    department: staff.department || "",
  };
}

export function StaffFormDialog({
  open,
  onOpenChange,
  staff,
  defaultDepartment = "",
  onSubmit,
  isSubmitting = false,
}: StaffFormDialogProps) {
  const [form, setForm] = useState<StaffFormValues>(() => ({
    ...getFormValues(staff),
    department: staff?.department || defaultDepartment,
  }));
  const isEditing = Boolean(staff);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setForm({
        ...getFormValues(staff),
        department: staff?.department || defaultDepartment,
      });
    }

    onOpenChange(nextOpen);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      ...staff,
      ...form,
      is_active: staff?.is_active ?? true,
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {staff ? "แก้ไขข้อมูลเจ้าหน้าที่" : "เพิ่มเจ้าหน้าที่ใหม่"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">ชื่อ *</Label>
              <Input
                id="first_name"
                value={form.first_name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    first_name: event.target.value,
                  }))
                }
                placeholder="ชื่อ"
                disabled={isEditing}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">นามสกุล *</Label>
              <Input
                id="last_name"
                value={form.last_name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    last_name: event.target.value,
                  }))
                }
                placeholder="นามสกุล"
                disabled={isEditing}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="position_number">เลขตำแหน่ง *</Label>
            <Input
              id="position_number"
              value={form.position_number}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  position_number: event.target.value,
                }))
              }
              placeholder="เลขตำแหน่ง"
              disabled={isSubmitting}
              required
            />
            {isEditing ? (
              <p className="text-xs text-muted-foreground">
                แก้ไขได้เฉพาะเลขตำแหน่งในระบบนี้
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">แผนก</Label>
            <Input
              id="department"
              value={form.department}
              placeholder="แผนก"
              disabled
              readOnly
            />
            <p className="text-xs text-muted-foreground">
              ใช้แผนกตามสิทธิ์ผู้ได้รับมอบหมายอัตโนมัติ
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "กำลังบันทึก..." : staff ? "บันทึก" : "เพิ่ม"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
