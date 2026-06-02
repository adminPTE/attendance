import mysql, { type Pool, type PoolOptions, type RowDataPacket } from "mysql2/promise";

type QueryParams =
  | unknown[]
  | Record<string, string | number | boolean | null>
  | undefined;

let centralPool: Pool | null = null;
let appPool: Pool | null = null;

function applyConnectionEncoding(pool: Pool, charset: string, collation?: string) {
  const safeCharset = charset.replace(/[^a-zA-Z0-9_]/g, "");
  const safeCollation = collation?.replace(/[^a-zA-Z0-9_]/g, "");
  const setNamesSql = safeCollation
    ? `SET NAMES ${safeCharset} COLLATE ${safeCollation}`
    : `SET NAMES ${safeCharset}`;

  pool.on("connection", (connection) => {
    connection.query(setNamesSql);
  });
}

function getCentralPoolConfig(): PoolOptions {
  const host = process.env.CENTRAL_DB_HOST;
  const user = process.env.CENTRAL_DB_USER;
  const password = process.env.CENTRAL_DB_PASSWORD;
  const database = process.env.CENTRAL_DB_NAME;
  const port = Number(process.env.CENTRAL_DB_PORT || "3306");

  if (!host || !user || !password || !database) {
    throw new Error(
      "Central DB env is incomplete. Please set CENTRAL_DB_HOST, CENTRAL_DB_USER, CENTRAL_DB_PASSWORD, and CENTRAL_DB_NAME."
    );
  }

  return {
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: true,
  };
}

function getAppPoolConfig(): PoolOptions {
  const host = process.env.APP_DB_HOST;
  const user = process.env.APP_DB_USER;
  const password = process.env.APP_DB_PASSWORD ?? "";
  const database = process.env.APP_DB_NAME;
  const port = Number(process.env.APP_DB_PORT || "3306");

  if (!host || !user || !database) {
    throw new Error(
      "App DB env is incomplete. Please set APP_DB_HOST, APP_DB_USER, and APP_DB_NAME."
    );
  }

  return {
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: true,
  };
}

export function getCentralDbPool() {
  if (!centralPool) {
    centralPool = mysql.createPool(getCentralPoolConfig());
    applyConnectionEncoding(
      centralPool,
      process.env.CENTRAL_DB_CHARSET?.trim() || "utf8mb4",
      process.env.CENTRAL_DB_COLLATION?.trim() || "utf8mb4_unicode_ci"
    );
  }

  return centralPool;
}

export function getAppDbPool() {
  if (!appPool) {
    appPool = mysql.createPool(getAppPoolConfig());
    applyConnectionEncoding(
      appPool,
      process.env.APP_DB_CHARSET?.trim() || "utf8mb4",
      process.env.APP_DB_COLLATION?.trim() || "utf8mb4_unicode_ci"
    );
  }

  return appPool;
}

export async function queryCentralDb<T extends RowDataPacket = RowDataPacket>(
  sql: string,
  values?: QueryParams
) {
  const pool = getCentralDbPool();
  const [rows] = await pool.query(sql, values as never);
  return rows as T[];
}

export async function queryAppDb<T extends RowDataPacket = RowDataPacket>(
  sql: string,
  values?: QueryParams
) {
  const pool = getAppDbPool();
  const [rows] = await pool.query(sql, values as never);
  return rows as T[];
}
