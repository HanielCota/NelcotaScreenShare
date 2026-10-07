import { apiLoader } from "@/server/api-route.server";
import { downloadAccountData } from "@/features/account/server/data-export-route.server";

export const loader = apiLoader(downloadAccountData);
