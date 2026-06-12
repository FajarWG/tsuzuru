import { redirect } from "next/navigation";

// Monthly Templates have been moved into Settings.
// Redirect any direct visits to /monthly-templates → /settings
export default function MonthlyTemplatesRedirectPage() {
  redirect("/settings");
}

