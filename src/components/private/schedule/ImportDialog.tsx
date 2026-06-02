'use client';

import { useRef, useState } from "react";
import { AlertCircle, FileSpreadsheet, Upload } from "lucide-react";

import { parseImportedExcel } from "@/lib/excelUtils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ImportedScheduleRow } from "@/lib/shiftTypes";

type ImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  month: number;
  onImport: (rows: ImportedScheduleRow[]) => void;
  isSubmitting?: boolean;
};

export default function ImportDialog({
  open,
  onOpenChange,
  year,
  month,
  onImport,
  isSubmitting = false,
}: ImportDialogProps) {
  const [parsed, setParsed] = useState<ImportedScheduleRow[] | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");

    try {
      const data = await parseImportedExcel(file, year, month);
      if (data.length === 0) {
        setError("ไม่พบข้อมูลในไฟล์ กรุณาตรวจสอบรูปแบบ");
        return;
      }
      setParsed(data);
    } catch {
      setError("ไม่สามารถอ่านไฟล์ Excel ได้");
    }
  };

  const handleConfirm = () => {
    if (parsed) {
      onImport(parsed);
      onOpenChange(false);
      setParsed(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        setParsed(null);
        setError("");
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>นำเข้าตารางจากไฟล์ Excel</DialogTitle>
          <DialogDescription>
            รูปแบบ: ชื่อ-สกุล, เลขตำแหน่ง, แผนก, วันที่ 1, วันที่ 2, ... ในไฟล์
            .xlsx
          </DialogDescription>
        </DialogHeader>

        {!parsed ? (
          <div className="space-y-4">
            <div
              onClick={() => fileRef.current?.click()}
              className="cursor-pointer rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
            >
              <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">คลิกเพื่อเลือกไฟล์ Excel</p>
              <p className="mt-1 text-xs text-muted-foreground">
                รองรับไฟล์ .xlsx และ .xls
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFile}
                disabled={isSubmitting}
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              พบข้อมูล {parsed.length} คน
            </div>
            <div className="max-h-[200px] overflow-y-auto space-y-1">
              {parsed.map((person) => (
                <div
                  key={`${person.staffName}-${person.positionNumber}`}
                  className="rounded-lg bg-secondary px-3 py-2 text-xs"
                >
                  <span className="font-medium">{person.staffName}</span>
                  <span className="ml-2 text-muted-foreground">
                    ({person.positionNumber})
                  </span>
                  <span className="ml-2 text-muted-foreground">
                    · {Object.keys(person.shifts).length} กะ
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setParsed(null);
            }}
            disabled={isSubmitting}
          >
            ยกเลิก
          </Button>
          {parsed ? (
            <Button onClick={handleConfirm} disabled={isSubmitting}>
              {isSubmitting ? "กำลังนำเข้า..." : `นำเข้า ${parsed.length} รายการ`}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
