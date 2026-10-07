import { type LoaderFunctionArgs } from "react-router";
import { withRequest } from "@/server/request-context.server";
import { GET } from "../../../../features/account/server/data-export-route.server";
export const loader = ({ request, context }: LoaderFunctionArgs) =>
  withRequest(request, context, () => GET(request));
