'use client';

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { StaffMember } from "@/lib/shiftTypes";

type StaffPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allStaff: StaffMember[];
  existingStaffIds: Set<string>;
  previousMonthStaffIds?: Set<string>;
  previousMonthStaffOrder?: string[];
  onConfirm: (staffIds: string[]) => void;
  isSubmitting?: boolean;
};

export default function StaffPicker({
  open,
  onOpenChange,
  allStaff,
  existingStaffIds,
  previousMonthStaffIds = new Set(),
  previousMonthStaffOrder = [],
  onConfirm,
  isSubmitting = false,
}: StaffPickerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const available = allStaff.filter(
    (staff) =>
      staff.is_active !== false &&
      !existingStaffIds.has(staff.id) &&
      staff.position_number.trim() !== ""
  );

  const filtered = available.filter((staff) => {
    const q = search.toLowerCase();
    return (
      staff.first_name.toLowerCase().includes(q) ||
      staff.last_name.toLowerCase().includes(q) ||
      staff.position_number.toLowerCase().includes(q)
    );
  });

  const availableStaffIds = new Set(available.map((staff) => staff.id));
  const previousMonthAvailableIds = previousMonthStaffOrder.filter(
    (staffId) => previousMonthStaffIds.has(staffId) && availableStaffIds.has(staffId)
  );
  const selectedIds = useMemo(() => Array.from(selected), [selected]);
  const selectedOrderMap = useMemo(
    () => new Map(selectedIds.map((staffId, index) => [staffId, index + 1])),
    [selectedIds]
  );

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelected(new Set());
      setSearch("");
    }
    onOpenChange(nextOpen);
  };

  function selectAllAvailable() {
    setSelected(new Set(available.map((staff) => staff.id)));
  }

  function selectFromPreviousMonth() {
    setSelected(new Set(previousMonthAvailableIds));
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>เลือกเจ้าหน้าที่เข้าตารางงานเดือนนี้</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={selectAllAvailable}
            disabled={available.length === 0 || isSubmitting}
          >
            เลือกทั้งหมด
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={selectFromPreviousMonth}
            disabled={previousMonthAvailableIds.length === 0 || isSubmitting}
          >
            เลือกจากเดือนที่แล้ว
          </Button>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ค้นหา..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
            disabled={isSubmitting}
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto space-y-1">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">ไม่พบเจ้าหน้าที่ที่สามารถเพิ่มได้</p>
          )}
          {filtered.map((staff) => (
            <label
              key={staff.id}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-secondary"
            >
              <Checkbox
                checked={selected.has(staff.id)}
                disabled={isSubmitting}
                onCheckedChange={() => toggle(staff.id)}
              />
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                {selectedOrderMap.get(staff.id) ?? "-"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {staff.first_name} {staff.last_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {staff.position_number} {staff.department ? `· ${staff.department}` : ""}
                </p>
              </div>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>ยกเลิก</Button>
          <Button
            disabled={selected.size === 0 || isSubmitting}
            onClick={() => {
              onConfirm(selectedIds);
              handleOpenChange(false);
              setSelected(new Set());
            }}
          >
            {isSubmitting ? "กำลังเพิ่ม..." : `เพิ่ม ${selected.size} คน`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
