"use client";
import Image from "next/image";
import React from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "./ui/button";

const BtnProvider = () => {
  const handlePorviderLogin = () => {
    // redirect ไป API กลาง
    window.location.href =
      `https://moph.id.th/oauth/redirect?client_id=01992c8d-2aef-7e03-988d-a70d06e8b7d8&redirect_uri=${process.env.NEXT_PUBLIC_APP_URL}/providerid/&response_type=code&state=${process.env.NEXT_PUBLIC_APP_URL}/providerid/`;
  };
  return (
    <Button
      variant="outline"
      onClick={handlePorviderLogin}
      type="button"
      className="h-auto w-full justify-between rounded-2xl border-emerald-200 bg-white px-4 py-3 text-left shadow-sm hover:border-emerald-300 hover:bg-emerald-50/50"
    >
      <span className="flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/8">
          <Image
            src="/assets/provider.png"
            alt="Provider ID"
            width={34}
            height={34}
            className="object-contain"
          />
        </span>
        <span>
          <span className="block text-sm font-semibold text-foreground">
            เข้าสู่ระบบด้วย Provider ID
          </span>
          <span className="block text-xs text-muted-foreground">
            ยืนยันตัวตนผ่านระบบกลางของหน่วยงาน
          </span>
        </span>
      </span>
      <ArrowRight className="size-4 text-emerald-600" />
    </Button>
  );
};

export default BtnProvider;
