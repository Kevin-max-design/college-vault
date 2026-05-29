import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSupabaseClient } from "@/lib/auth-helpers";
import { createNotification } from "@/lib/notifications";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * GET /api/notices?scope=global&department=CSE&tag=academic&page=1
 * Returns notices with author profile, sorted by pinned first then newest.
 */
export async function GET(req: NextRequest) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");
  const department = searchParams.get("department");
  const tag = searchParams.get("tag");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const supabase = await getSupabaseClient();

  let query = supabase
    .from("notices")
    .select(`
      *,
      author:profiles!notices_author_id_fkey(id, full_name, avatar_url, role)
    `)
    .eq("archived", false)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (scope) query = query.eq("scope", scope);
  if (department) query = query.eq("department", department);
  if (tag) query = query.eq("tag", tag);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notices: data ?? [], page, limit });
}

/**
 * POST /api/notices — create a notice
 * Body: { title, body, scope, department?, tag? }
 *
 * Scope enforcement:
 * - global      → only principal
 * - department  → hod or faculty (within their dept)
 * - personal    → any authenticated user
 */
export async function POST(req: NextRequest) {
  const result = await requireAuth();
  if (result.error) return result.error;

  const reqBody = await req.json();
  const { title, body, scope, department, tag } = reqBody;

  if (!title || !scope) {
    return NextResponse.json(
      { error: "title and scope are required." },
      { status: 400 }
    );
  }

  // Enforce scope rules
  if (scope === "global" && result.user.role !== "principal") {
    return NextResponse.json(
      { error: "Only the Principal can post global notices." },
      { status: 403 }
    );
  }
  if (scope === "department") {
    if (!["faculty", "hod", "principal"].includes(result.user.role)) {
      return NextResponse.json(
        { error: "Only faculty or HOD can post department notices." },
        { status: 403 }
      );
    }
    if (!department) {
      return NextResponse.json(
        { error: "department is required for department-scoped notices." },
        { status: 400 }
      );
    }
  }

  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("notices")
    .insert({
      author_id: result.user.id,
      title,
      body: body ?? "",
      scope,
      department: scope === "global" ? null : (department ?? result.user.department),
      tag: tag ?? "general",
    })
    .select(`
      *,
      author:profiles!notices_author_id_fkey(id, full_name, avatar_url, role)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── Dispatch notifications to affected users ────────────────────
  try {
    // Determine notification category, priority, and source based on role & scope
    let category: 'principal_announcement' | 'hod_notice' | 'faculty_announcement' | 'general' = 'general';
    let priority: 'urgent' | 'high' | 'normal' = 'normal';
    let source: 'principal' | 'hod' | 'faculty' | 'system' = 'system';
    let notifTitle = title;

    if (result.user.role === 'principal' && scope === 'global') {
      category = 'principal_announcement';
      priority = 'urgent';
      source = 'principal';
      notifTitle = `📢 Principal: ${title}`;
    } else if (result.user.role === 'hod') {
      category = 'hod_notice';
      priority = 'high';
      source = 'hod';
      notifTitle = `HOD Notice: ${title}`;
    } else if (result.user.role === 'faculty') {
      category = 'faculty_announcement';
      priority = 'high';
      source = 'faculty';
      notifTitle = `Faculty: ${title}`;
    } else if (result.user.role === 'principal' && scope === 'department') {
      category = 'principal_announcement';
      priority = 'high';
      source = 'principal';
      notifTitle = `Principal: ${title}`;
    }

    // Fetch target users based on scope
    let targetQuery = supabaseAdmin
      .from('profiles')
      .select('id')
      .neq('id', result.user.id); // never notify self

    if (scope === 'department') {
      const targetDept = department ?? result.user.department;
      targetQuery = targetQuery.eq('department', targetDept);
    }
    // scope === 'global' → no filter (all users except self)
    // scope === 'personal' → skip notifications (personal note)

    if (scope !== 'personal') {
      const { data: targets } = await targetQuery;

      if (targets && targets.length > 0) {
        // Cap batch notifications at 200 to avoid timeout
        const batch = targets.slice(0, 200);
        const notifyPromises = batch.map(t =>
          createNotification({
            userId: t.id,
            type: 'notice',
            title: notifTitle,
            body: `${body ? body.substring(0, 80) : title}${(body?.length ?? 0) > 80 ? '...' : ''}`,
            link: '/home',
            actorId: result.user.id,
            category,
            priority,
            source,
          })
        );

        // Fire all notifications in parallel
        await Promise.all(notifyPromises);
      }
    }
  } catch (err) {
    console.error('Failed to dispatch notice notifications:', err);
  }

  return NextResponse.json(data, { status: 201 });
}
