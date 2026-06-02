'use client';

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { THAI_MONTHS } from "@/lib/shiftTypes";

type MonthSelectorProps = {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
};

export default function MonthSelector({
  year,
  month,
  onChange,
}: MonthSelectorProps) {
  const goBack = () => {
    if (month === 1) onChange(year - 1, 12);
    else onChange(year, month - 1);
  };
  const goForward = () => {
    if (month === 12) onChange(year + 1, 1);
    else onChange(year, month + 1);
  };

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="icon" onClick={goBack} className="h-9 w-9">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="text-center min-w-[180px]">
        <h3 className="text-lg font-bold text-foreground">
          {THAI_MONTHS[month - 1]}
        </h3>
        <p className="text-xs text-muted-foreground">พ.ศ. {year}</p>
      </div>
      <Button variant="outline" size="icon" onClick={goForward} className="h-9 w-9">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
