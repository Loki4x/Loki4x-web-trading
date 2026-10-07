import { redirect } from "next/navigation";

// Track record sekarang menjadi section di landing page. Rute lama tetap hidup supaya
// link yang sudah tersebar tidak mati.
export default function TrackRecordRedirect() {
  redirect("/#track-record");
}
