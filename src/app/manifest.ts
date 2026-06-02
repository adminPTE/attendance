import type { MetadataRoute } from "next";

const BASE_PATH = "/attendance";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ระบบตารางทำงาน",
    short_name: "ตารางทำงาน",
    description: "ระบบจัดการตารางเข้ากะและรายชื่อเจ้าหน้าที่",
    start_url: `${BASE_PATH}/`,
    scope: `${BASE_PATH}/`,
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0284c7",
    icons: [
      {
        src: `${BASE_PATH}/icon-192.png`,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: `${BASE_PATH}/icon-512.png`,
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
