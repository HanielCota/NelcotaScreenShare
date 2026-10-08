import { BackLink } from "@/components/shell/BackLink";

/** Above an access form: the way back home, aligned with the form's column. */
export function HomeBack() {
  return (
    <div className="mb-6 w-full max-w-sm">
      <BackLink />
    </div>
  );
}
