import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSupabaseClient } from "@/lib/auth-helpers";

/**
 * GET /api/connect/users
 * Returns a list of students for peer discovery.
 * Computes a dynamic match score based on department, year, interests, skills, study goals, looking_for, and clubs.
 * Filters out private fields (emails, subscriptions, etc.) to ensure privacy.
 */
export async function GET(req: NextRequest) {
  const result = await requireAuth();
  if (result.error) return result.error;
  const currentUser = result.user;

  const supabase = await getSupabaseClient();

  // 1. Fetch current user's profile to get latest interest/skills tags
  const { data: myProfile, error: myProfileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (myProfileErr || !myProfile) {
    return NextResponse.json({ error: "Failed to fetch your profile details." }, { status: 500 });
  }

  // 2. Fetch current user's active/reserved clubs
  const { data: myClubs } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("user_id", currentUser.id)
    .in("status", ["reserved", "active"]);
  
  const myClubIds = (myClubs || []).map(c => c.club_id);

  // 3. Fetch other students who are visible (profile_visibility !== 'hidden') and have role = 'student'
  const { data: users, error: usersErr } = await supabase
    .from("profiles")
    .select("*")
    .neq("id", currentUser.id)
    .eq("role", "student")
    .neq("profile_visibility", "hidden");

  if (usersErr) {
    return NextResponse.json({ error: usersErr.message }, { status: 500 });
  }

  // Defensive filtering on server side: only student role and not hidden
  const otherUsers = (users || []).filter(
    user => user.role === "student" && user.profile_visibility !== "hidden"
  );

  // 4. Fetch all active/reserved clubs for these users to calculate common clubs without N+1 queries
  const userIds = otherUsers.map(u => u.id);
  
  let userClubsMap: Record<string, Set<string>> = {};
  if (userIds.length > 0) {
    const { data: otherUserClubs } = await supabase
      .from("club_members")
      .select("user_id, club_id")
      .in("user_id", userIds)
      .in("status", ["reserved", "active"]);

    (otherUserClubs || []).forEach(c => {
      if (!userClubsMap[c.user_id]) {
        userClubsMap[c.user_id] = new Set();
      }
      userClubsMap[c.user_id].add(c.club_id);
    });
  }

  const isMyProfileStudent = myProfile.role === "student";

  // 5. Calculate Match Score and reasons
  const scoredUsers = otherUsers.map(user => {
    let score = 0;
    const reasons: string[] = [];

    // Match score should apply only between students
    if (isMyProfileStudent && user.role === "student") {
      // Same department: +3
      if (user.department && user.department === myProfile.department) {
        score += 3;
        reasons.push("Same department");
      }

      // Same year of study: +2
      if (user.year_of_study && user.year_of_study === myProfile.year_of_study) {
        score += 2;
        reasons.push("Same year of study");
      }

      // Matching interests: +2 each
      const myInterests = myProfile.interests || [];
      const theirInterests = user.interests || [];
      const commonInterests = theirInterests.filter((t: string) => myInterests.includes(t));
      if (commonInterests.length > 0) {
        score += commonInterests.length * 2;
        reasons.push(`Matching interest${commonInterests.length > 1 ? "s" : ""}: ${commonInterests.slice(0, 3).join(", ")}`);
      }

      // Matching skills: +2 each
      const mySkills = myProfile.skills || [];
      const theirSkills = user.skills || [];
      const commonSkills = theirSkills.filter((t: string) => mySkills.includes(t));
      if (commonSkills.length > 0) {
        score += commonSkills.length * 2;
        reasons.push(`Matching skill${commonSkills.length > 1 ? "s" : ""}: ${commonSkills.slice(0, 3).join(", ")}`);
      }

      // Matching study goals: +2 each
      const myGoals = myProfile.study_goals || [];
      const theirGoals = user.study_goals || [];
      const commonGoals = theirGoals.filter((t: string) => myGoals.includes(t));
      if (commonGoals.length > 0) {
        score += commonGoals.length * 2;
        reasons.push(`Matching study goal${commonGoals.length > 1 ? "s" : ""}: ${commonGoals.slice(0, 3).join(", ")}`);
      }

      // Matching looking for: +2 each
      const myLooking = myProfile.looking_for || [];
      const theirLooking = user.looking_for || [];
      const commonLooking = theirLooking.filter((t: string) => myLooking.includes(t));
      if (commonLooking.length > 0) {
        score += commonLooking.length * 2;
        reasons.push(`Matching look-for${commonLooking.length > 1 ? "s" : ""}: ${commonLooking.slice(0, 3).join(", ")}`);
      }

      // Same club: +1 each
      const theirClubs = userClubsMap[user.id] || new Set();
      let commonClubCount = 0;
      myClubIds.forEach(cid => {
        if (theirClubs.has(cid)) {
          commonClubCount++;
        }
      });
      if (commonClubCount > 0) {
        score += commonClubCount;
        reasons.push(`Same club membership${commonClubCount > 1 ? "s" : ""}`);
      }
    }

    // Return only public, safe columns. Strictly NO email, phone, notifications, etc.
    return {
      id: user.id,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      department: user.department,
      year_of_study: user.year_of_study,
      role: user.role,
      bio: user.bio,
      interests: user.interests || [],
      skills: user.skills || [],
      study_goals: user.study_goals || [],
      looking_for: user.looking_for || [],
      created_at: user.created_at,
      dm_privacy: user.dm_privacy || "everyone",
      match_score: score,
      match_reasons: reasons,
    };
  });

  // 6. Apply search and filters
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.toLowerCase();
  const department = searchParams.get("department");
  const year = searchParams.get("year");
  const tag = searchParams.get("tag")?.toLowerCase();

  let filtered = scoredUsers;

  if (search) {
    filtered = filtered.filter(u =>
      u.full_name?.toLowerCase().includes(search) ||
      u.bio?.toLowerCase().includes(search)
    );
  }

  if (department) {
    filtered = filtered.filter(u => u.department === department);
  }

  if (year) {
    filtered = filtered.filter(u => u.year_of_study === Number(year));
  }

  if (tag) {
    filtered = filtered.filter(u =>
      u.interests.some((t: string) => t.toLowerCase().includes(tag)) ||
      u.skills.some((t: string) => t.toLowerCase().includes(tag)) ||
      u.study_goals.some((t: string) => t.toLowerCase().includes(tag)) ||
      u.looking_for.some((t: string) => t.toLowerCase().includes(tag))
    );
  }

  // 7. Sort by Match Score descending, and return
  filtered.sort((a, b) => b.match_score - a.match_score);

  return NextResponse.json({ users: filtered });
}
