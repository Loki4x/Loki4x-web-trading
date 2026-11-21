import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

// GET /links/go/<id> → catat klik lalu arahkan ke URL tujuan link.
// Tujuan selalu diambil dari database (bukan dari query), jadi tidak bisa dipakai sebagai open redirect.
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const fallback = new URL("/links", request.url);
  if (!UUID.test(params.id)) return NextResponse.redirect(fallback, 302);
  const supabase = await createClient();
  const { data } = await supabase.rpc("increment_link_click", { item_id: params.id });
  const url = typeof data === "string" ? data : null;
  if (!url || !/^(https?:|mailto:|tel:)/i.test(url)) return NextResponse.redirect(fallback, 302);
  return NextResponse.redirect(url, 302);
}
