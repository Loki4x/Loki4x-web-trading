"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Copy, ExternalLink, Eye, EyeOff, Heading, ImagePlus, Link2, MousePointerClick, Pencil, Plus, Trash2, X } from "lucide-react";
import { deleteLinkItem, reorderLinks, saveLinkItem, saveLinkProfile, setLinkActive } from "@/app/admin/actions";
import { LinkPageView } from "@/components/links/LinkPageView";
import { LINK_THEMES, SOCIALS, type LinkItem, type LinkPageProfile, type LinkTheme } from "@/lib/link-page";
import { cx } from "@/lib/utils";

const THEME_SWATCH: Record<LinkTheme, string> = {
  dark: "bg-[#050810] border-[#1B2337]",
  light: "bg-[#F4F6FB] border-[#E1E5EC]",
  glass: "bg-[radial-gradient(circle_at_20%_20%,#5F85DB,transparent_60%),radial-gradient(circle_at_80%_80%,#8B5CF6,#070b16_70%)]",
  brand: "bg-gradient-to-b from-[#1e3a8a] via-[#3f62c4] to-[#0e7490]",
};

type Msg = { ok: boolean; text: string } | null;

/** Admin → Link Page: atur profil, link, urutan, dan lihat pratinjau langsung halaman /links. */
export function LinkPageAdmin({ profile, items, siteUrl }: { profile: LinkPageProfile; items: LinkItem[]; siteUrl: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<LinkPageProfile>(profile);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<Msg>(null);
  const [list, setList] = useState<LinkItem[]>(items);
  const [editing, setEditing] = useState<LinkItem | "new-link" | "new-header" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);

  // Sinkron dengan data server setelah router.refresh().
  const [lastItems, setLastItems] = useState(items);
  if (items !== lastItems) {
    setLastItems(items);
    setList(items);
  }

  const pageUrl = `${siteUrl}/links`;
  const totalClicks = list.reduce((s, i) => s + (i.kind === "LINK" ? i.clicks : 0), 0);
  const previewProfile = useMemo(
    () => ({ ...draft, avatar_url: removeAvatar ? null : (avatarPreview ?? draft.avatar_url) }),
    [draft, avatarPreview, removeAvatar]
  );

  async function submitProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    const fd = new FormData(e.currentTarget);
    if (removeAvatar) fd.set("remove_avatar", "1");
    const res = await saveLinkProfile(fd);
    setSavingProfile(false);
    setProfileMsg(res.ok ? { ok: true, text: "Profil disimpan." } : { ok: false, text: res.message ?? "Gagal menyimpan." });
    if (res.ok) {
      setAvatarPreview(null);
      setRemoveAvatar(false);
      router.refresh();
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const next = [...list];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setList(next);
    await reorderLinks(next.map((i) => i.id));
    router.refresh();
  }

  async function toggle(item: LinkItem) {
    setBusy(item.id);
    setList((l) => l.map((x) => (x.id === item.id ? { ...x, active: !x.active } : x)));
    await setLinkActive(item.id, !item.active);
    setBusy(null);
    router.refresh();
  }

  async function remove(item: LinkItem) {
    if (!confirm(`Hapus "${item.title}"?`)) return;
    setBusy(item.id);
    await deleteLinkItem(item.id);
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
      <div className="flex min-w-0 flex-col gap-6">
        {/* Ringkasan */}
        <div className="card flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-caption text-text-muted">Alamat halaman</p>
            <a href="/links" target="_blank" className="truncate text-body font-semibold text-primary hover:underline">
              {pageUrl}
            </a>
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(pageUrl).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
            className="btn-secondary !px-4 !py-2 text-body-sm"
          >
            <Copy className="h-4 w-4" /> {copied ? "Tersalin" : "Salin"}
          </button>
          <a href="/links" target="_blank" className="btn-secondary !px-4 !py-2 text-body-sm">
            <ExternalLink className="h-4 w-4" /> Buka
          </a>
          <div className="flex gap-6 border-l border-border pl-4">
            <div>
              <p className="text-caption text-text-muted">Kunjungan</p>
              <p className="text-h3 font-semibold tabular-nums text-text-primary">{(profile.views ?? 0).toLocaleString("id-ID")}</p>
            </div>
            <div>
              <p className="text-caption text-text-muted">Total klik</p>
              <p className="text-h3 font-semibold tabular-nums text-text-primary">{totalClicks.toLocaleString("id-ID")}</p>
            </div>
          </div>
        </div>

        {/* Profil */}
        <form onSubmit={submitProfile} className="card flex flex-col gap-4">
          <h2 className="text-h3 text-text-primary">Profil</h2>
          <div className="flex items-center gap-4">
            {previewProfile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewProfile.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white">
                {(draft.display_name || "L").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => avatarInput.current?.click()} className="btn-secondary !px-4 !py-2 text-body-sm">
                <ImagePlus className="h-4 w-4" /> Ganti foto
              </button>
              {previewProfile.avatar_url && (
                <button
                  type="button"
                  onClick={() => {
                    setAvatarPreview(null);
                    setRemoveAvatar(true);
                    if (avatarInput.current) avatarInput.current.value = "";
                  }}
                  className="rounded-full px-4 py-2 text-body-sm text-error hover:bg-error-subtle"
                >
                  Hapus foto
                </button>
              )}
              <input
                ref={avatarInput}
                name="avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setAvatarPreview(URL.createObjectURL(f));
                    setRemoveAvatar(false);
                  }
                }}
              />
              <p className="w-full text-caption text-text-muted">JPG/PNG/WebP, maksimal 2 MB. Sebaiknya persegi.</p>
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-body-sm font-medium text-text-secondary">Nama</span>
            <input
              name="display_name"
              value={draft.display_name}
              onChange={(e) => setDraft({ ...draft, display_name: e.target.value })}
              maxLength={60}
              required
              className="input-field"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-body-sm font-medium text-text-secondary">Bio</span>
            <textarea
              name="bio"
              value={draft.bio ?? ""}
              onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
              maxLength={300}
              rows={3}
              className="input-field resize-y"
              placeholder="Edukasi & sinyal trading forex…"
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-body-sm font-medium text-text-secondary">Tema</span>
            <input type="hidden" name="theme" value={draft.theme} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {LINK_THEMES.map((th) => (
                <button
                  key={th.value}
                  type="button"
                  onClick={() => setDraft({ ...draft, theme: th.value })}
                  className={cx(
                    "flex flex-col gap-2 rounded-xl border p-2 text-left text-body-sm transition-colors",
                    draft.theme === th.value ? "border-primary ring-2 ring-primary/30" : "border-border hover:bg-surface-hover"
                  )}
                >
                  <span className={cx("h-14 w-full rounded-lg border", THEME_SWATCH[th.value])} />
                  <span className={cx("px-1 font-medium", draft.theme === th.value ? "text-primary" : "text-text-secondary")}>{th.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-body-sm font-medium text-text-secondary">Ikon media sosial (opsional)</span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SOCIALS.map((s) => (
                <label key={s.key} className="flex flex-col gap-1">
                  <span className="text-caption text-text-muted">{s.label}</span>
                  <input
                    name={`social_${s.key}`}
                    value={draft.socials[s.key] ?? ""}
                    onChange={(e) => setDraft({ ...draft, socials: { ...draft.socials, [s.key]: e.target.value } })}
                    placeholder={s.placeholder}
                    className="input-field !py-2.5"
                  />
                </label>
              ))}
            </div>
          </div>

          {profileMsg && <p className={cx("text-body-sm", profileMsg.ok ? "text-success" : "text-error")}>{profileMsg.text}</p>}
          <button type="submit" disabled={savingProfile} className="btn-primary self-start">
            {savingProfile ? "Menyimpan…" : "Simpan profil"}
          </button>
        </form>

        {/* Link */}
        <div className="card flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex-1 text-h3 text-text-primary">Link</h2>
            <button type="button" onClick={() => setEditing("new-header")} className="btn-secondary !px-4 !py-2 text-body-sm">
              <Heading className="h-4 w-4" /> Judul bagian
            </button>
            <button type="button" onClick={() => setEditing("new-link")} className="btn-primary !px-4 !py-2 text-body-sm">
              <Plus className="h-4 w-4" /> Tambah link
            </button>
          </div>
          {list.length === 0 && <p className="py-6 text-center text-body-sm text-text-muted">Belum ada link. Tekan “Tambah link”.</p>}
          {list.map((item, i) => (
            <div
              key={item.id}
              className={cx(
                "flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3 transition-opacity",
                !item.active && "opacity-55",
                busy === item.id && "pointer-events-none opacity-50"
              )}
            >
              <div className="flex flex-col">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-0.5 text-text-muted hover:text-text-primary disabled:opacity-30" aria-label="Naik">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} className="rounded p-0.5 text-text-muted hover:text-text-primary disabled:opacity-30" aria-label="Turun">
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
              {item.kind === "HEADER" ? (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface text-text-muted">
                  <Heading className="h-5 w-5" />
                </div>
              ) : item.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image_url} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface text-primary">
                  <Link2 className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-semibold text-text-primary">
                  {item.title}
                  {item.kind === "HEADER" && <span className="ml-2 text-caption font-normal text-text-muted">judul bagian</span>}
                  {item.featured && <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-caption font-medium text-primary">besar</span>}
                </p>
                {item.kind === "LINK" && <p className="truncate text-caption text-text-muted">{item.url}</p>}
              </div>
              {item.kind === "LINK" && (
                <span className="hidden items-center gap-1 text-caption tabular-nums text-text-muted sm:flex" title="Klik">
                  <MousePointerClick className="h-3.5 w-3.5" /> {item.clicks.toLocaleString("id-ID")}
                </span>
              )}
              <button type="button" onClick={() => toggle(item)} className="rounded-lg p-2 text-text-muted hover:bg-surface-hover hover:text-text-primary" title={item.active ? "Sembunyikan" : "Tampilkan"}>
                {item.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <button type="button" onClick={() => setEditing(item)} className="rounded-lg p-2 text-text-muted hover:bg-surface-hover hover:text-text-primary" title="Ubah">
                <Pencil className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => remove(item)} className="rounded-lg p-2 text-text-muted hover:bg-error-subtle hover:text-error" title="Hapus">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <p className="text-caption text-text-muted">Gunakan panah untuk mengatur urutan. Ikon mata menyembunyikan link tanpa menghapusnya.</p>
        </div>
      </div>

      {/* Pratinjau */}
      <div className="xl:sticky xl:top-[calc(var(--topbar-height,64px)+24px)] xl:self-start">
        <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-text-muted">Pratinjau</p>
        <div className="mx-auto h-[680px] w-full max-w-[360px] overflow-hidden rounded-[36px] border-[10px] border-[#111827] shadow-2xl">
          <div className="h-full overflow-y-auto">
            <LinkPageView compact profile={previewProfile} items={list.filter((i) => i.active)} hrefFor={(i) => i.url ?? "#"} />
          </div>
        </div>
        <p className="mt-2 text-center text-caption text-text-muted">Perubahan profil tampil langsung di sini; tekan “Simpan profil” untuk menerbitkan.</p>
      </div>

      {editing && (
        <LinkItemModal
          item={typeof editing === "string" ? null : editing}
          kind={editing === "new-header" ? "HEADER" : typeof editing === "string" ? "LINK" : editing.kind}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function LinkItemModal({
  item,
  kind,
  onClose,
  onSaved,
}: {
  item: LinkItem | null;
  kind: "LINK" | "HEADER";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(item?.image_url ?? null);
  const [removeImage, setRemoveImage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isHeader = kind === "HEADER";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("kind", kind);
    if (item) fd.set("id", item.id);
    if (removeImage) fd.set("remove_image", "1");
    const res = await saveLinkItem(fd);
    setSaving(false);
    if (res.ok) onSaved();
    else setError(res.message ?? "Gagal menyimpan.");
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-h3 text-text-primary">{item ? "Ubah" : "Tambah"} {isHeader ? "judul bagian" : "link"}</h2>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary" aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-body-sm font-medium text-text-secondary">{isHeader ? "Teks judul" : "Judul tombol"}</span>
            <input name="title" defaultValue={item?.title ?? ""} maxLength={100} required autoFocus className="input-field" placeholder={isHeader ? "Mulai di sini" : "Daftar akun Loki4x"} />
          </label>
          {!isHeader && (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-body-sm font-medium text-text-secondary">URL tujuan</span>
                <input name="url" defaultValue={item?.url ?? ""} required className="input-field" placeholder="https://…" inputMode="url" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-body-sm font-medium text-text-secondary">Keterangan (opsional)</span>
                <input name="description" defaultValue={item?.description ?? ""} maxLength={200} className="input-field" placeholder="Teks kecil di bawah judul" />
              </label>
              <div className="flex flex-col gap-2">
                <span className="text-body-sm font-medium text-text-secondary">Foto pratinjau (opsional)</span>
                <div className="flex items-center gap-3">
                  {imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagePreview} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-surface-2 text-text-muted">
                      <ImagePlus className="h-5 w-5" />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary !px-3 !py-1.5 text-body-sm">
                      Pilih foto
                    </button>
                    {imagePreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setRemoveImage(true);
                          if (fileRef.current) fileRef.current.value = "";
                        }}
                        className="rounded-full px-3 py-1.5 text-body-sm text-error hover:bg-error-subtle"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    name="image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setImagePreview(URL.createObjectURL(f));
                        setRemoveImage(false);
                      }
                    }}
                  />
                </div>
                <p className="text-caption text-text-muted">Tampil sebagai ikon kecil di kiri tombol. Maksimal 2 MB.</p>
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-border p-3">
                <input type="checkbox" name="featured" value="1" defaultChecked={item?.featured ?? false} className="mt-1 h-4 w-4 accent-[#5F85DB]" />
                <span>
                  <span className="block text-body-sm font-medium text-text-primary">Tampilkan besar</span>
                  <span className="block text-caption text-text-muted">Foto tampil penuh (16:9) di atas judul, cocok untuk promo atau video. Butuh foto pratinjau.</span>
                </span>
              </label>
            </>
          )}
          {error && <p className="text-body-sm text-error">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Batal
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
