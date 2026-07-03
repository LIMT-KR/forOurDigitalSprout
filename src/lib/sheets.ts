import { SpreadsheetMeta, SheetData, ColumnAnalysis } from '../types';

/**
 * Extracts spreadsheet ID from a Google Sheets URL or returns the input if it's already an ID.
 */
export function extractSpreadsheetId(url: string): string | null {
  if (!url) return null;
  
  // Try standard spreadsheet URL regex
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  
  // Return trimmed input if it looks like a clean ID
  const trimmed = url.trim();
  if (trimmed.length > 20 && !trimmed.includes('/')) {
    return trimmed;
  }
  
  return null;
}

/**
 * Extracts the sheet GID from a Google Sheets URL (if present).
 */
export function extractSheetGid(url: string): number | null {
  if (!url) return null;
  const match = url.match(/[?&]gid=(\d+)/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Fetches sheet list and title of the spreadsheet
 */
export async function fetchSpreadsheetMeta(
  accessToken: string,
  spreadsheetId: string
): Promise<SpreadsheetMeta> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to fetch spreadsheet metadata: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  
  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || 'Unnamed Spreadsheet',
    sheets: (data.sheets || []).map((s: any) => ({
      title: s.properties?.title || 'Sheet',
      sheetId: s.properties?.sheetId || 0,
      rowCount: s.properties?.gridProperties?.rowCount,
      columnCount: s.properties?.gridProperties?.columnCount,
    })),
  };
}

/**
 * Clean cell values (removing commas, currency symbols, percentages) to check if they are numeric
 */
function cleanNumericValue(val: string): number | null {
  if (val === undefined || val === null || val === '') return null;
  // If already parsed, return
  const clean = val.replace(/[\$,%\s]/g, '');
  const num = Number(clean);
  if (!isNaN(num)) {
    // If it was a percentage, convert to ratio
    if (val.includes('%')) {
      return num / 100;
    }
    return num;
  }
  return null;
}

/**
 * Detects if a string is a valid date
 */
function isDateValue(val: string): boolean {
  if (!val || val.length < 4) return false;
  // Quick regex check for standard formats like YYYY-MM-DD, YYYY/MM/DD, etc.
  const dateRegex = /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/;
  if (dateRegex.test(val)) return true;
  
  // Try parsing
  const parsed = Date.parse(val);
  if (!isNaN(parsed)) {
    // Make sure it's a realistic date (between year 1990 and 2100)
    const year = new Date(parsed).getFullYear();
    return year > 1990 && year < 2100;
  }
  return false;
}

/**
 * Fetches rows of a specific sheet and parses them into structured JSON
 */
export async function fetchSheetData(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string
): Promise<SheetData> {
  // Read up to A1:ZZ10000
  const range = `${encodeURIComponent(sheetTitle)}!A1:ZZ10000`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to fetch sheet values: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const values: string[][] = data.values || [];

  if (values.length === 0) {
    return {
      sheetTitle,
      columns: [],
      rows: [],
      rawValues: [],
    };
  }

  // Robust Header Detection: Find the best candidate header row in the first 15 rows
  let headerRowIdx = 0;
  let foundHeader = false;

  // First pass: look for keywords that strongly signal a Q&A or standard data header row
  for (let r = 0; r < Math.min(15, values.length); r++) {
    const row = values[r];
    if (!row) continue;
    const nonClipped = row.filter(cell => cell !== undefined && cell !== null && String(cell).trim() !== '');
    if (nonClipped.length >= 2) {
      const hasKeywords = nonClipped.some(cell => {
        const text = String(cell).toLowerCase();
        return ['질문', '답변', 'question', 'answer', 'q&a', '구분', '카테고리', '분류', 'category', '제목', '내용'].some(kw => text.includes(kw));
      });
      if (hasKeywords) {
        headerRowIdx = r;
        foundHeader = true;
        break;
      }
    }
  }

  // Second pass: if no keywords found, fall back to the first row that has at least 2 non-empty values
  if (!foundHeader) {
    for (let r = 0; r < Math.min(15, values.length); r++) {
      const row = values[r];
      if (!row) continue;
      const nonClipped = row.filter(cell => cell !== undefined && cell !== null && String(cell).trim() !== '');
      if (nonClipped.length >= 2) {
        headerRowIdx = r;
        foundHeader = true;
        break;
      }
    }
  }

  // Get headers from the detected row
  const headerRow = values[headerRowIdx] || [];
  const headers = headerRow.map((h, idx) => (h && h.trim() !== '' ? h.trim() : `Column ${idx + 1}`));
  
  // Process remaining rows starting below the header row
  const rows: Record<string, string | number | boolean>[] = [];
  
  for (let i = headerRowIdx + 1; i < values.length; i++) {
    const rowValues = values[i];
    // Skip empty rows
    if (!rowValues || rowValues.length === 0 || rowValues.every(v => v === '')) continue;
    
    const rowObj: Record<string, string | number | boolean> = {
      _index: i,
    };
    
    headers.forEach((header, colIdx) => {
      const rawVal = rowValues[colIdx] !== undefined ? String(rowValues[colIdx]) : '';
      
      // Clean numeric candidate
      const numVal = cleanNumericValue(rawVal);
      if (numVal !== null && rawVal.trim() !== '') {
        rowObj[header] = numVal;
      } else {
        rowObj[header] = rawVal;
      }
    });
    
    rows.push(rowObj);
  }

  return {
    sheetTitle,
    columns: headers,
    rows,
    rawValues: values,
  };
}

/**
 * Analyzes column types based on row values
 */
export function analyzeColumns(
  columns: string[],
  rows: Record<string, any>[]
): ColumnAnalysis[] {
  return columns.map(col => {
    const nonNullValues = rows
      .map(row => row[col])
      .filter(val => val !== undefined && val !== null && val !== '');
      
    const totalCount = nonNullValues.length;
    
    if (totalCount === 0) {
      return {
        name: col,
        type: 'text',
        uniqueCount: 0,
        sampleValues: [],
      };
    }

    // Check if numeric
    const numericCount = nonNullValues.filter(val => typeof val === 'number').length;
    const isNumeric = numericCount / totalCount >= 0.7;

    // Check if date
    const dateCount = nonNullValues.filter(val => typeof val === 'string' && isDateValue(val)).length;
    const isDate = !isNumeric && (dateCount / totalCount >= 0.7);

    // Calculate unique count
    const uniqueVals = Array.from(new Set(nonNullValues));
    const uniqueCount = uniqueVals.length;

    // Check if category
    let type: 'numeric' | 'date' | 'category' | 'text' = 'text';
    if (isNumeric) {
      type = 'numeric';
    } else if (isDate) {
      type = 'date';
    } else if (uniqueCount < 30 && uniqueCount < totalCount * 0.5 && uniqueCount > 1) {
      type = 'category';
    }

    return {
      name: col,
      type,
      uniqueCount,
      sampleValues: uniqueVals.slice(0, 5),
    };
  });
}

/**
 * Helper to aggregate data for charts
 */
export function aggregateData(
  rows: Record<string, any>[],
  xAxisCol: string,
  yAxisCol: string,
  aggType: 'sum' | 'avg' | 'count' | 'none'
): any[] {
  if (aggType === 'none' || !xAxisCol) {
    return rows.map(r => ({
      x: String(r[xAxisCol] ?? ''),
      y: typeof r[yAxisCol] === 'number' ? r[yAxisCol] : 0,
    }));
  }

  const groups: Record<string, { sum: number; count: number; values: number[] }> = {};

  rows.forEach(row => {
    const xVal = String(row[xAxisCol] ?? 'Blank');
    const yVal = typeof row[yAxisCol] === 'number' ? row[yAxisCol] : 0;

    if (!groups[xVal]) {
      groups[xVal] = { sum: 0, count: 0, values: [] };
    }
    groups[xVal].sum += yVal;
    groups[xVal].count += 1;
    groups[xVal].values.push(yVal);
  });

  return Object.keys(groups).map(key => {
    const group = groups[key];
    let y = 0;
    if (aggType === 'sum') {
      y = group.sum;
    } else if (aggType === 'avg') {
      y = group.count > 0 ? Number((group.sum / group.count).toFixed(2)) : 0;
    } else if (aggType === 'count') {
      y = group.count;
    }

    return {
      x: key,
      y,
    };
  });
}
