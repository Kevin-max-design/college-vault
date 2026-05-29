import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import AppShell from "@/app/components/AppShell";
import ClubLeadClient from "./ClubLeadClient";

export const metadata = {
  title: "Club Lead Portal — Campus Vault",
  description: "Manage your assigned clubs, verify student payments, configure limits, and export members.",
};

export default async function ClubLeadPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/onboarding/verify");
  }

  // Get user profile role
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/onboarding/role");
  }

  const role = profile.role || "student";
  const isAdmin = role === "hod" || role === "principal";

  // Check if they lead at least one club
  let isLead = false;
  if (!isAdmin) {
    const { count } = await supabase
      .from("clubs")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", user.id);
    
    isLead = (count || 0) > 0;
  }

  const fullName = profile.full_name?.trim() || "";
  const initials = fullName
    ? (fullName.split(" ").slice(0, 2).map((n: string) => n ? n[0] : "").join("").toUpperCase() || "U")
    : "U";

  // If not lead and not admin, show access denied
  if (!isAdmin && !isLead) {
    return (
      <AppShell pageTitle="Access Denied" userAvatarUrl={profile.avatar_url} userInitials={initials}>
        <main className="px-4 md:px-gutter max-w-xl mx-auto py-16 flex flex-col items-center text-center gap-6">
          <div className="w-16 h-16 bg-error-container text-error border-2 border-primary shadow-[4px_4px_0px_0px_#00595c] flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl">block</span>
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="font-newsreader font-black text-3xl text-primary">Access Denied</h1>
            <p className="font-jakarta text-sm text-outline leading-relaxed">
              This area is restricted to Club Leads, HODs, and College Administrators. Your account does not have permission to access the Club Lead Portal.
            </p>
          </div>
          <a
            href="/clubs"
            className="bg-primary text-on-primary font-jakarta font-black text-[0.65rem] uppercase tracking-widest px-5 py-2.5 border-2 border-primary shadow-[3px_3px_0px_0px_#00595c] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_#00595c] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cv-transition-btn cursor-pointer text-decoration-none"
          >
            Go Back to Clubs
          </a>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell pageTitle="Club Lead" userAvatarUrl={profile.avatar_url} userInitials={initials}>
      <ClubLeadClient />
    </AppShell>
  );
}
