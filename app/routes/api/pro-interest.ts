import { apiAction } from "@/server/api-route.server";
import { registerProInterest } from "@/features/home/server/pro-interest.server";

export const action = apiAction(registerProInterest);
