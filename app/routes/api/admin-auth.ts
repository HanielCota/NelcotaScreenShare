import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { withRequest } from "@/server/request-context.server";
import { GET, POST } from "./admin-auth.server";
export const loader = ({ request, context }: LoaderFunctionArgs) =>
  withRequest(request, context, () => GET(request));
export const action = ({ request, context }: ActionFunctionArgs) =>
  withRequest(request, context, () =>
    request.method === "POST"
      ? POST(request)
      : new Response(null, { status: 405, headers: { Allow: "POST" } }),
  );
