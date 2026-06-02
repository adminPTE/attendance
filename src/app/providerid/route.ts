import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";

import type { AuthSession, UserRole } from "@/lib/auth-session";
import { queryAppDb, queryCentralDb } from "@/lib/mysql";

type ProviderProfile = {
  provider_id?: string;
  fname?: string;
  lname?: string;
  name?: string;
};

type CentralMemberRow = RowDataPacket & {
  mem_id: string | number;
  mem_fname: string | null;
  mem_lname: string | null;
  depart_id: string | null;
  depart_name: string | null;
};

type UserRoleRow = RowDataPacket & {
  role: UserRole;
};

function getAppOrigin(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

function getProviderDisplayName(profile: ProviderProfile) {
  const fullName = `${profile.fname ?? ""} ${profile.lname ?? ""}`.trim();
  return fullName || profile.name || "ผู้ใช้งาน";
}

function getProviderIdColumn() {
  return process.env.CENTRAL_PROVIDER_ID_COLUMN?.trim() || "provider_id";
}

async function findCentralMemberByProviderId(providerId: string) {
  const providerIdColumn = getProviderIdColumn();

  const rows = await queryCentralDb<CentralMemberRow>(
    `
      SELECT
        tm.mem_id,
        tm.mem_fname,
        tm.mem_lname,
        midh.internal_department_hr_id AS depart_id,
        midh.internal_department_hr_name AS depart_name
      FROM tb_member tm
      LEFT JOIN master_internal_department_hr midh
        ON midh.internal_department_hr_id = tm.u_in_id
      WHERE tm.${providerIdColumn} = :providerId
      LIMIT 1
    `,
    { providerId }
  );

  return rows[0] ?? null;
}

async function findUserRoleByMemId(memId: string) {
  const rows = await queryAppDb<UserRoleRow>(
    `
      SELECT role
      FROM user_roles
      WHERE mem_id = :memId
      LIMIT 1
    `,
    { memId }
  );

  return rows[0]?.role ?? "general";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      return NextResponse.json(
        { error: "Missing code or state" },
        { status: 400 }
      );
    }

    const healthParams = {
      grant_type: "authorization_code",
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/providerid/`,
      client_id: "01992c8d-2aef-7e03-988d-a70d06e8b7d8",
      client_secret: "26e7f1f8197eaff47e160be46cbd378ee797141f",
    };

    const healthRes = await fetch("https://moph.id.th/api/v1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(healthParams).toString(),
    });

    const healthResult = await healthRes.json();

    if (healthResult.status_code !== 200) {
      return NextResponse.json(
        { error: "Health token failed", detail: healthResult },
        { status: 500 }
      );
    }

    const healthAccessToken = healthResult.data.access_token;

    const providerRes = await fetch(
      "https://provider.id.th/api/v1/services/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: "64fd0c44-0a23-4541-840b-3bec05e20d19",
          secret_key: "vBROTJyTnFy1gnU0U0pVyc18rFTAt972",
          token_by: "Health ID",
          token: healthAccessToken,
        }),
      }
    );

    const providerResult = await providerRes.json();

    if (providerResult.status !== 200) {
      return NextResponse.json(
        { error: "Provider token failed", detail: providerResult },
        { status: 500 }
      );
    }

    const providerAccessToken = providerResult.data.access_token;

    const profileRes = await fetch(
      "https://provider.id.th/api/v1/services/profile",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${providerAccessToken}`,
          "Content-Type": "application/json",
          "client-id": "64fd0c44-0a23-4541-840b-3bec05e20d19",
          "secret-key": "vBROTJyTnFy1gnU0U0pVyc18rFTAt972",
        },
      }
    );

    const profileResult = await profileRes.json();
    
    

    if (profileResult.status !== 200) {
      return NextResponse.json(
        { error: "Profile fetch failed", detail: profileResult },
        { status: 500 }
      );
    }

    const profile = profileResult.data as ProviderProfile;
    const providerId = String(profile.provider_id ?? "").trim();

    if (!providerId) {
      return NextResponse.json(
        { error: "Provider profile does not contain provider_id" },
        { status: 400 }
      );
    }

    const member = await findCentralMemberByProviderId(providerId);

    if (!member) {
      return NextResponse.json(
        {
          error: "Member not found in central system",
          providerId,
          providerColumn: getProviderIdColumn(),
        },
        { status: 404 }
      );
    }

    const memId = String(member.mem_id);
    const userRole = await findUserRoleByMemId(memId);

    const session: AuthSession = {
      userRole,
      userId: memId,
      userName:
        `${member.mem_fname ?? ""} ${member.mem_lname ?? ""}`.trim() ||
        getProviderDisplayName(profile),
      departId: String(member.depart_id ?? ""),
      departName: String(member.depart_name ?? "").trim(),
    };

    const origin = getAppOrigin(req);
    const callbackUrl = new URL(`${process.env.NEXT_PUBLIC_APP_URL}/auth/complete`);
    callbackUrl.searchParams.set("session", encodeURIComponent(JSON.stringify(session)));

    return NextResponse.redirect(callbackUrl);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal Server Error",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
