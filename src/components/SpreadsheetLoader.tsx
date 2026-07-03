import React, { useState } from 'react';
import { SpreadsheetMeta, SheetMeta } from '../types';
import { extractSpreadsheetId, extractSheetGid } from '../lib/sheets';
import { FileSpreadsheet, ArrowRight, Table2, Info, RefreshCw, Layers } from 'lucide-react';

interface SpreadsheetLoaderProps {
  currentMeta: SpreadsheetMeta | null;
  activeSheet: SheetMeta | null;
  onSelectSheet: (sheet: SheetMeta) => void;
  onLoadSpreadsheet: (id: string, gid?: number | null) => void;
  isLoading: boolean;
  error: string | null;
  defaultId: string;
}

export default function SpreadsheetLoader({
  currentMeta,
  activeSheet,
  onSelectSheet,
  onLoadSpreadsheet,
  isLoading,
  error,
  defaultId,
}: SpreadsheetLoaderProps) {
  const [urlInput, setUrlInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractSpreadsheetId(urlInput);
    const gid = extractSheetGid(urlInput);
    if (id) {
      onLoadSpreadsheet(id, gid);
    } else if (urlInput.trim()) {
      // Treat as plain ID
      onLoadSpreadsheet(urlInput.trim(), null);
    }
  };

  const loadDefault = () => {
    setUrlInput('');
    onLoadSpreadsheet(defaultId);
  };

  return (
    <div className="space-y-6" id="dashboard-spreadsheet-loader">
      {/* Search / Paste Input */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 font-display">
          Load Spreadsheet
        </h3>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="relative">
            <FileSpreadsheet className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Paste sheet URL or ID..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white rounded-xl pl-9 pr-3 py-2 text-xs text-slate-700 font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !urlInput.trim()}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 text-white disabled:text-slate-400 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed shrink-0"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                Sync Workspace
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="mt-3 bg-rose-50 border border-rose-100 p-3 rounded-xl flex gap-2 text-rose-600 text-[11px] items-start">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {currentMeta && currentMeta.spreadsheetId !== defaultId && (
          <div className="mt-3 flex justify-start">
            <button
              onClick={loadDefault}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-all cursor-pointer"
            >
              ← Use Default Spreadsheet
            </button>
          </div>
        )}
      </div>

      {/* Spreadsheet Metadata Card & Sheet Selector */}
      {currentMeta && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold uppercase tracking-wider px-2 py-0.5 rounded-md font-display">
                Current Workbook
              </span>
              <h2 className="text-sm font-bold font-display text-slate-950 mt-1.5 truncate" title={currentMeta.title}>
                {currentMeta.title}
              </h2>
              <p className="text-[9px] text-slate-400 font-mono mt-0.5 truncate">{currentMeta.spreadsheetId}</p>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
              <Table2 className="w-4 h-4" />
            </div>
          </div>

          {/* Sheets List */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 font-display">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Select Sheet ({currentMeta.sheets.length})
            </div>

            <div className="grid grid-cols-1 gap-2">
              {currentMeta.sheets.map((sheet) => {
                const isActive = activeSheet?.sheetId === sheet.sheetId;
                return (
                  <button
                    key={sheet.sheetId}
                    onClick={() => onSelectSheet(sheet)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isActive
                        ? 'bg-indigo-50/50 border-indigo-200 hover:border-indigo-300'
                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className={`text-xs font-semibold truncate ${isActive ? 'text-indigo-700' : 'text-slate-700'}`}>
                        {sheet.title}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {sheet.rowCount ? `${sheet.rowCount} rows` : 'Unknown size'}
                      </div>
                    </div>
                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
