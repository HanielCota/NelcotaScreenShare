import { apiLoader } from "@/server/api-route.server";
import { exportCsv } from "@/features/admin/rooms/server/csv-export.server";

export const loader = apiLoader(exportCsv);
