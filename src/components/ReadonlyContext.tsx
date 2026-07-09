"use client";

/**
 * Read-only mode flag for the shared-preview (/share/[token]) views.
 *
 * The provider is rendered by the share layout with value=true. Mutation-bearing
 * client components call `useReadonly()` and hide their add/edit/delete controls
 * when it returns true. This is the UI layer of a defence-in-depth design — even
 * if a control leaked through, the underlying Server Action is still guarded by
 * `requireSession()`, and share viewers never receive a session cookie.
 *
 * Defaults to false, so every normal dashboard page is fully editable with no
 * change required at the call site.
 */
import { createContext, useContext } from "react";

const ReadonlyContext = createContext(false);

export function ReadonlyProvider({
  value = true,
  children,
}: {
  value?: boolean;
  children: React.ReactNode;
}) {
  return <ReadonlyContext.Provider value={value}>{children}</ReadonlyContext.Provider>;
}

/** True when rendered inside a read-only shared view. */
export function useReadonly(): boolean {
  return useContext(ReadonlyContext);
}
