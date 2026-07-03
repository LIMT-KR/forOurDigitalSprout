export interface SpreadsheetMeta {
  spreadsheetId: string;
  title: string;
  sheets: SheetMeta[];
}

export interface SheetMeta {
  title: string;
  sheetId: number;
  rowCount?: number;
  columnCount?: number;
}

export interface SheetData {
  sheetTitle: string;
  columns: string[];
  rows: Record<string, string | number | boolean>[];
  rawValues: string[][];
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'area' | 'pie';
  xAxisColumn: string;
  yAxisColumn: string;
  aggregate: 'sum' | 'avg' | 'count' | 'none';
}

export interface ColumnAnalysis {
  name: string;
  type: 'numeric' | 'date' | 'category' | 'text';
  uniqueCount: number;
  sampleValues: (string | number | boolean)[];
}
