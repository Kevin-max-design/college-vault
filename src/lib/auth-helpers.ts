import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export type UserRole = "student" | "faculty" | "hod" | "principal";

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  department: string;
  year_of_study: number;
  full_name: string;
}

/**
 * Get the authenticated user with their profile.
 * Returns null if not authenticated or profile doesn't exist.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, department, year_of_study")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    role: profile.role as UserRole,
    department: profile.department,
    year_of_study: profile.year_of_study,
    full_name: profile.full_name,
  };
}

/**
 * Require authentication.  Returns the user or a 401 response.
 */
export async function requireAuth(): Promise<
  { user: SessionUser; error?: never } | { user?: never; error: NextResponse }
> {
  const user = await getSessionUser();
  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized — please sign in." },
        { status: 401 }
      ),
    };
  }
  return { user };
}

/**
 * Require the user to have one of the given roles.
 * Returns the user or a 403 response.
 */
export async function requireRole(
  allowedRoles: UserRole[]
): Promise<
  { user: SessionUser; error?: never } | { user?: never; error: NextResponse }
> {
  const result = await requireAuth();
  if (result.error) return result;

  if (!allowedRoles.includes(result.user.role)) {
    return {
      error: NextResponse.json(
        {
          error: `Forbidden — requires role: ${allowedRoles.join(" or ")}.`,
        },
        { status: 403 }
      ),
    };
  }
  return { user: result.user };
}

/**
 * Get the raw Supabase client for the current request.
 * Useful when you need to run custom queries after auth checks.
 */
export async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}
