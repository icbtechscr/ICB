"use client";
import { FileSpreadsheet, FileText } from "lucide-react";
import {
  PUNCH_TYPES,
  PUNCH_COL,
  fmtDayLabel,
  type DayRow,
  type PunchCell,
} from "@/lib/timeclock";

function cellText(cell: PunchCell | null): string {
  if (!cell) return "";
  let loc = "";
  if (cell.within === true) loc = " (en sede)";
  else if (cell.within === false && cell.distance !== null)
    loc = ` (a ${cell.distance} m)`;
  else if (cell.distance === null) loc = " (sin ubicación)";
  return `${cell.time}${loc}`;
}

export function TimeclockExport({
  rows,
  rangeLabel,
}: {
  rows: DayRow[];
  rangeLabel: string;
}) {
  const headers = ["Día", "Colaborador", "Sede", ...PUNCH_TYPES.map((t) => PUNCH_COL[t])];

  function toRows(): string[][] {
    return rows.map((r) => [
      fmtDayLabel(r.dayIso),
      r.employeeName || "Sin nombre",
      r.branchName ?? "—",
      ...PUNCH_TYPES.map((t) => cellText(r.cells[t])),
    ]);
  }

  function downloadCSV() {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const lines = [headers, ...toRows()].map((row) =>
      row.map(esc).join(",")
    );
    // BOM para que Excel respete los acentos.
    const blob = new Blob(["﻿" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `control-horario-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printPDF() {
    const origin = window.location.origin;
    const bodyRows = toRows()
      .map(
        (row) =>
          `<tr>${row
            .map(
              (c, i) =>
                `<td class="${i === 0 ? "day" : ""}">${c || "—"}</td>`
            )
            .join("")}</tr>`
      )
      .join("");
    const head = headers.map((h) => `<th>${h}</th>`).join("");
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Control de horario — ICB Technologies</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #0f172a; margin: 32px; }
  header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #0a3d62; padding-bottom: 16px; margin-bottom: 8px; }
  header img { height: 48px; }
  h1 { font-size: 18px; margin: 0; }
  .sub { color: #64748b; font-size: 12px; margin: 4px 0 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #0f1840; color: #6fdb83; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
  td { border: 1px solid #e2e8f0; padding: 7px 10px; }
  td.day { font-weight: 700; white-space: nowrap; }
  tr:nth-child(even) td { background: #f8fafc; }
  footer { margin-top: 24px; color: #94a3b8; font-size: 10px; text-align: center; }
  @media print { body { margin: 12mm; } }
</style></head>
<body>
  <header>
    <img src="${origin}/icb-logo.png" alt="ICB Technologies" />
    <div style="text-align:right">
      <h1>Control de horario</h1>
      <div class="sub" style="margin:4px 0 0">Generado ${new Date().toLocaleString("es-CR")}</div>
    </div>
  </header>
  <div class="sub">${rangeLabel}</div>
  <table><thead><tr>${head}</tr></thead><tbody>${bodyRows}</tbody></table>
  <footer>ICB Technologies · Reporte de marcajes de colaboradores</footer>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 350); };</script>
</body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={downloadCSV}
        disabled={rows.length === 0}
        className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FileSpreadsheet className="size-4 text-emerald-600" />
        Excel
      </button>
      <button
        onClick={printPDF}
        disabled={rows.length === 0}
        className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FileText className="size-4 text-red-600" />
        PDF
      </button>
    </div>
  );
}
