import { createClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateProfile } from "@/app/(dashboard)/settings/actions";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user?.id ?? "")
    .single();

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Settings</h1>
        <p className="text-body-sm text-text-secondary">
          Manage your profile and account details.
        </p>
      </div>

      <div className="max-w-lg">
        <div className="card !p-8">
          <h2 className="mb-5 text-h3 text-text-primary">Profile</h2>
          <form action={updateProfile} className="flex flex-col gap-4">
            <Input
              name="full_name"
              label="Full Name"
              placeholder="Jane Trader"
              defaultValue={profile?.full_name ?? ""}
            />
            <Input
              label="Email"
              value={user?.email ?? ""}
              disabled
              className="cursor-not-allowed opacity-60"
            />
            <Button type="submit" className="mt-2 w-fit">
              Save Changes
            </Button>
          </form>
        </div>

        <div className="card mt-6 !p-8">
          <h2 className="text-h3 text-text-primary">Current Plan</h2>
          <p className="mt-2 text-body-sm text-text-secondary">
            You&apos;re on the <span className="font-semibold text-text-primary">Free</span> plan.
          </p>
          <a href="/#pricing" className="btn-secondary mt-4 inline-flex text-body-sm">
            View Plans
          </a>
        </div>
      </div>
    </main>
  );
}
