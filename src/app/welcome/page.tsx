import { redirect } from "next/navigation";

/** The landing lives at `/` now; keep `/welcome` as a permanent redirect for
 *  any existing backlinks. */
export default function WelcomeRedirect() {
  redirect("/");
}
