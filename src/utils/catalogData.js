/**
 * Normalize the lightweight catalog endpoint so frontend and backend can deploy
 * independently while agreeing on catalogue numbers.
 */
export function extractCatalogRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const candidates = [
    payload.items,
    payload.rows,
    payload.catalog,
    payload.reviews,
    payload.data,
  ];
  return candidates.find(Array.isArray) || [];
}

function explicitNumber(row) {
  const value = row?.catalog_number ?? row?.catalog_no ?? row?.number;
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export function buildCatalogNumberMap(payload) {
  const rows = extractCatalogRows(payload).filter((row) => row && row.id != null);
  const hasCompleteNumbering =
    rows.length > 0 && rows.every((row) => explicitNumber(row) != null);

  const ordered = hasCompleteNumbering
    ? rows
    : rows
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const byDate = String(a.row.created_at || '').localeCompare(
          String(b.row.created_at || ''),
        );
        return byDate || a.index - b.index;
      })
      .map(({ row }) => row);

  const byId = new Map();
  ordered.forEach((row, index) => {
    byId.set(row.id, hasCompleteNumbering ? explicitNumber(row) : index + 1);
  });
  return byId;
}
