"use client";

import { useState } from "react";
import { User, IdCard, ShieldCheck, Bell, Palette } from "lucide-react";
import { cx } from "@/lib/utils";
import { ProfilePanel } from "@/components/settings/ProfilePanel";
import { AccountPanel } from "@/components/settings/AccountPanel";
import { SecurityPanel } from "@/components/settings/SecurityPanel";
import { NotificationsPanel } from "@/components/settings/NotificationsPanel";
import { AppearancePanel } from "@/components/settings/AppearancePanel";
import type { Profile, LoginActivity } from "@/lib/types";

type TabKey = "profile" | "account" | "security" | "notifications" | "appearance";

const TABS: { key: TabKey; label: string; icon: typeof User }[] = [
  { key: "profile", label: "Profil", icon: User },
  { key: "account", label: "Akun", icon: IdCard },
  { key: "security", label: "Keamanan", icon: ShieldCheck },
  { key: "notifications", label: "Notifikasi", icon: Bell },
  { key: "appearance", label: "Tampilan", icon: Palette },
];

export function SettingsClient({
  profile,
  email,
  isGoogleUser,
  hasPassword,
  memberSince,
  loginActivity,
  currentDevice,
  currentIp,
}: {
  profile: Profile | null;
  email: string;
  isGoogleUser: boolean;
  hasPassword: boolean;
  memberSince: string;
  loginActivity: LoginActivity[];
  currentDevice: { browser: string; os: string };
  currentIp: string;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
      <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cx(
              "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-body-sm font-medium transition-colors",
              activeTab === key
                ? "bg-primary-subtle text-primary"
                : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      <div>
        {activeTab === "profile" && <ProfilePanel profile={profile} isGoogleUser={isGoogleUser} />}
        {activeTab === "account" && <AccountPanel profile={profile} email={email} memberSince={memberSince} />}
        {activeTab === "security" && (
          <SecurityPanel
            loginActivity={loginActivity}
            currentDevice={currentDevice}
            currentIp={currentIp}
            hasPassword={hasPassword}
          />
        )}
        {activeTab === "notifications" && <NotificationsPanel profile={profile} />}
        {activeTab === "appearance" && <AppearancePanel />}
      </div>
    </div>
  );
}
