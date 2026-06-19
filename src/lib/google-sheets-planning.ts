import { now } from "@/lib/utils";
import type { IntegrationsConfig } from "@/lib/repositories/integrations-repository";

export interface PlanningRow {
  id: string;
  rowIndex: number;
  raw: Record<string, string>;
  title: string;
  scheduledFor: string;
  status: string;
  copy: string;
  promptSlides: string;
  hashtags: string;
  network: string;
  image: string;
  fileId: string;
  driveId: string;
}

export interface PlanningSnapshot {
  columns: string[];
  fetchedAt: string;
  sourceLabel: string;
  sourceUrl: string;
  rows: PlanningRow[];
}

export function deriveGoogleSheetsCsvUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    if (!url.hostname.includes("docs.google.com")) {
      return trimmed;
    }

    if (url.pathname.includes("/export")) {
      const next = new URL(url.toString());
      next.searchParams.set("format", "csv");
      if (!next.searchParams.get("gid")) {
        const hashGid = url.hash.match(/gid=(\d+)/)?.[1];
        next.searchParams.set("gid", hashGid || "0");
      }
      return next.toString();
    }

    const segments = url.pathname.split("/");
    const sheetIdIndex = segments.indexOf("d");
    const sheetId = sheetIdIndex >= 0 ? segments[sheetIdIndex + 1] : "";
    if (!sheetId) {
      return trimmed;
    }

    const gid =
      url.searchParams.get("gid") ||
      url.hash.match(/gid=(\d+)/)?.[1] ||
      "0";

    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  } catch {
    return trimmed;
  }
}

const HEADER_ALIASES = {
  title: [
    "post",
    "titulo",
    "título",
    "title",
    "nombre",
    "tema del carrusel",
    "tema",
    "resumen",
    "objetivo del carrusel",
  ],
  scheduledFor: ["fecha", "fecha de posteo", "post date", "scheduled for", "date"],
  status: ["estado", "status"],
  copy: ["copy", "caption", "texto"],
  promptSlides: [
    "prompt",
    "prompt de slides",
    "slides prompt",
    "prompt slides",
    "desarrollo slides",
    "desarrollo de slides",
    "desarrollo",
  ],
  hashtags: ["hashtags", "tags"],
  network: ["red", "canal", "network", "social network"],
  image: ["imagen", "image", "media"],
  fileId: ["file id", "fileid", "id archivo"],
  driveId: ["id drive", "drive id", "driveid"],
} satisfies Record<keyof Omit<PlanningRow, "id" | "rowIndex" | "raw">, string[]>;

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((cell) => cell.trim() !== ""));
}

function buildSheetSourceLabel(sourceUrl: string) {
  try {
    const url = new URL(sourceUrl);
    if (url.hostname.includes("docs.google.com")) {
      const segments = url.pathname.split("/");
      const idIndex = segments.indexOf("d");
      if (idIndex >= 0 && segments[idIndex + 1]) {
        return `Google Sheet ${segments[idIndex + 1].slice(0, 8)}...`;
      }
    }
  } catch {
    // Ignore parsing errors and fall back below.
  }
  return "Google Sheets";
}

function deriveGoogleSheetsSourceUrl(csvUrl: string, explicitSourceUrl: string) {
  if (explicitSourceUrl.trim()) return explicitSourceUrl.trim();

  try {
    const url = new URL(csvUrl);
    const segments = url.pathname.split("/");
    const idIndex = segments.indexOf("d");
    const sheetId = idIndex >= 0 ? segments[idIndex + 1] : "";
    const gid = url.searchParams.get("gid") || "0";
    if (sheetId) {
      return `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=${gid}`;
    }
  } catch {
    // Ignore invalid URLs and fall back below.
  }

  return csvUrl.trim();
}

function findColumnValue(row: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    for (const [column, value] of Object.entries(row)) {
      if (normalizeHeader(column) === normalizedAlias) {
        return value.trim();
      }
    }
  }
  return "";
}

function mapPlanningRow(rowIndex: number, row: Record<string, string>): PlanningRow {
  return {
    id: `row-${rowIndex}`,
    rowIndex,
    raw: row,
    title: findColumnValue(row, HEADER_ALIASES.title),
    scheduledFor: findColumnValue(row, HEADER_ALIASES.scheduledFor),
    status: findColumnValue(row, HEADER_ALIASES.status),
    copy: findColumnValue(row, HEADER_ALIASES.copy),
    promptSlides: findColumnValue(row, HEADER_ALIASES.promptSlides),
    hashtags: findColumnValue(row, HEADER_ALIASES.hashtags),
    network: findColumnValue(row, HEADER_ALIASES.network),
    image: findColumnValue(row, HEADER_ALIASES.image),
    fileId: findColumnValue(row, HEADER_ALIASES.fileId),
    driveId: findColumnValue(row, HEADER_ALIASES.driveId),
  };
}

export async function fetchGoogleSheetsPlanning(
  config: Pick<IntegrationsConfig, "googleSheetsCsvUrl" | "googleSheetsSourceUrl">
): Promise<PlanningSnapshot> {
  const csvUrl = deriveGoogleSheetsCsvUrl(
    config.googleSheetsCsvUrl.trim() || config.googleSheetsSourceUrl.trim()
  );
  if (!csvUrl) {
    throw new Error("Google Sheets CSV URL is not configured");
  }

  const response = await fetch(csvUrl, {
    cache: "no-store",
    headers: {
      Accept: "text/csv,text/plain;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Google Sheets returned ${response.status}`);
  }

  const csv = await response.text();
  const parsed = parseCsv(csv);
  if (parsed.length === 0) {
    return {
      columns: [],
      fetchedAt: now(),
      sourceLabel: "Google Sheets",
      sourceUrl: deriveGoogleSheetsSourceUrl(csvUrl, config.googleSheetsSourceUrl),
      rows: [],
    };
  }

  const [headerRow, ...dataRows] = parsed;
  const columns = headerRow.map((column) => column.trim());
  const rows = dataRows
    .map((cells, index) => {
      const raw = columns.reduce<Record<string, string>>((acc, column, columnIndex) => {
        acc[column] = cells[columnIndex]?.trim() || "";
        return acc;
      }, {});
      return mapPlanningRow(index + 2, raw);
    })
    .filter((row) => Object.values(row.raw).some((value) => value.trim() !== ""));

  const sourceUrl = deriveGoogleSheetsSourceUrl(csvUrl, config.googleSheetsSourceUrl);

  return {
    columns,
    fetchedAt: now(),
    sourceLabel: buildSheetSourceLabel(sourceUrl),
    sourceUrl,
    rows,
  };
}
