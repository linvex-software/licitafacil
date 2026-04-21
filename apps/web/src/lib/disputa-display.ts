/** Valores que a API usa quando número/UASG não foram informados na criação da disputa. */
const UNKNOWN_MARKERS = new Set(["", "NI", "N/I", "NÃO INFORMADO", "NAO INFORMADO", "-"]);

function isPlaceholderRef(value: string | null | undefined): boolean {
  const t = (value ?? "").trim();
  if (!t) return true;
  return UNKNOWN_MARKERS.has(t.toUpperCase());
}

export type DisputaListLabelInput = {
  numeroPregao?: string | null;
  uasg?: string | null;
  portal: string;
  bid?: { title?: string | null; agency?: string | null } | null;
};

/**
 * Rótulo amigável para listas (dashboard, etc.).
 * Evita mostrar "NI" cru — na API isso significa número do pregão não informado.
 */
export function getDisputaListLabel(d: DisputaListLabelInput): string {
  const np = d.numeroPregao?.trim();
  if (np && !isPlaceholderRef(np)) return np;
  const title = d.bid?.title?.trim();
  if (title) return title;
  const agency = d.bid?.agency?.trim();
  if (agency) return agency;
  const uasg = d.uasg?.trim();
  if (uasg && !isPlaceholderRef(uasg)) return `${d.portal} · UASG ${uasg}`;
  return "Disputa";
}
