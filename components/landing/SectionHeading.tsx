import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/Reveal";

/** Kata penekanan bergaya serif miring, seperti di desain referensi. */
export function Accent({ children }: { children: ReactNode }) {
  return (
    <span className="italic text-primary-hover" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
      {children}
    </span>
  );
}

/** Judul section: lencana outline bercahaya + judul besar + deskripsi. */
export function SectionHeading({
  badge,
  children,
  description,
}: {
  badge: string;
  children: ReactNode;
  description?: ReactNode;
}) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <span className="inline-flex rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-caption font-medium text-primary-hover shadow-[0_0_24px_rgba(95,133,219,0.25)]">
        {badge}
      </span>
      <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-text-primary md:text-5xl">{children}</h2>
      {description && <p className="mt-4 text-body-lg text-text-secondary">{description}</p>}
    </Reveal>
  );
}
