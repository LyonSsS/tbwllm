// Spec identity — shared by the pipeline and the offline re-analyzer so both
// produce the same filename for the same script.

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
}

export function makeSpecId(name: string, hash: string): string {
  return `${slugify(name)}-${hash.slice(0, 6)}`;
}
