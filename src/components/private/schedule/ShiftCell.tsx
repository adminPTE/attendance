'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SHIFT_MAP, SHIFT_TYPES, type ShiftCode } from "@/lib/shiftTypes";

const EMPTY_VALUE = "__none__";

type ShiftCellProps = {
  value: ShiftCode;
  disabled?: boolean;
  allowedOptions?: ShiftCode[];
  onChange: (value: ShiftCode) => void;
};

export default function ShiftCell({
  value,
  disabled = false,
  allowedOptions,
  onChange,
}: ShiftCellProps) {
  const shiftInfo = SHIFT_MAP[value] ?? SHIFT_MAP[""];
  const selectableShiftTypes = SHIFT_TYPES.filter((shiftType) => {
    if (shiftType.value === "") {
      return !allowedOptions;
    }

    if (!allowedOptions) {
      return true;
    }

    return (
      allowedOptions.includes(shiftType.value) ||
      shiftType.value === value
    );
  });
  const triggerClassName = [
    "h-7 w-14 justify-center border px-1 text-center text-[11px] font-medium sm:w-18 sm:px-2 sm:text-xs",
    disabled ? "cursor-not-allowed opacity-100 disabled:opacity-100" : "",
    value
      ? shiftInfo?.color ?? "bg-transparent"
      : "bg-transparent border-dashed border-border text-muted-foreground",
  ].join(" ");

  return (
    <Select
      value={value || EMPTY_VALUE}
      disabled={disabled}
      onValueChange={(nextValue) =>
        onChange(nextValue === EMPTY_VALUE ? "" : (nextValue as ShiftCode))
      }
    >
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder="-" />
      </SelectTrigger>
      <SelectContent>
        {allowedOptions ? null : (
          <SelectItem value={EMPTY_VALUE} className="text-xs">
            -
          </SelectItem>
        )}
        {selectableShiftTypes
          .filter((shiftType) => shiftType.value !== "")
          .map((shiftType) => (
          <SelectItem
            key={shiftType.value}
            value={shiftType.value}
            className="text-xs"
          >
            {shiftType.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
