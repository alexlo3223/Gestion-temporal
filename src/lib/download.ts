const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/** Celda CSV entrecomillada y neutralizada contra inyección de fórmulas en Excel/Sheets. */
function csvCell(value: unknown) {
  let text = String(value ?? '');
  if (FORMULA_PREFIX.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/** `;` como separador porque Excel en español usa la coma como separador decimal. */
export const toCsv = (rows: unknown[][], separator = ';') => rows.map((row) => row.map(csvCell).join(separator)).join('\r\n');

/** BOM para que Excel detecte UTF-8 (tildes y eñes) al abrir el CSV. */
export const UTF8_BOM = '﻿';

export function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
