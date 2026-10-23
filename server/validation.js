export function parseBody(schema, req, res) {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Please review the submitted fields.', code: 'VALIDATION_ERROR', fields: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) });
    return null;
  }
  return parsed.data;
}

export function asCsv(rows) {
  if (!rows.length) return '';
  const columns = Object.keys(rows[0]);
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return [columns.map(quote).join(','), ...rows.map((row) => columns.map((column) => quote(row[column])).join(','))].join('\n');
}
