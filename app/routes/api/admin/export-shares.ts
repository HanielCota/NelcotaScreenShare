import { type LoaderFunctionArgs } from "react-router";
import { withRequest } from "@/server/request-context.server";
import { GET } from "../../../../features/admin/shares/server/csv-export.server";
export const loader = ({ request, context }: LoaderFunctionArgs) =>
  withRequest(request, context, () => GET(request));
