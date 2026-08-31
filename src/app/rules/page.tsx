import type { Metadata } from "next";
import Link from "next/link";
import { RulesContent } from "@/components/RulesContent";

export const metadata: Metadata = {
  title: "Rules — Pretty Clever",
  description:
    "How to play That's Pretty Clever at this unofficial table: active rolls, the silver platter, each color, bonuses, and scoring.",
};

export default function RulesPage() {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-2xl px-4 py-10">
      <p className="text-[11px] font-bold tracking-[0.3em] text-gold/80 uppercase">
        Unofficial table
      </p>
      <h1 className="font-display mt-2 text-4xl text-cream sm:text-5xl">How to play</h1>
      <p className="mt-2 text-sm text-cream/55">That&apos;s Pretty Clever — the rules this table enforces.</p>

      <div className="mt-8">
        <RulesContent />
      </div>

      <p className="mt-10">
        <Link href="/" className="btn-primary">
          Back to the table
        </Link>
      </p>
    </div>
  );
}
