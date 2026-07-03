import React, { useState, useMemo } from 'react';
import { ColumnAnalysis } from '../types';
import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, FileSpreadsheet, ListFilter } from 'lucide-react';

interface DataGridProps {
  columns: string[];
  rows: Record<string, any>[];
  analyses: ColumnAnalysis[];
}

export default function DataGrid({ columns, rows, analyses }: DataGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterColumn, setFilterColumn] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Filter rows by query
  const filteredRows = useMemo(() => {
    let result = [...rows];

    if (searchQuery.trim() !== '') {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(row => {
        if (filterColumn === 'all') {
          return columns.some(col => {
            const val = row[col];
            return val !== undefined && val !== null && String(val).toLowerCase().includes(lowerQuery);
          });
        } else {
          const val = row[filterColumn];
          return val !== undefined && val !== null && String(val).toLowerCase().includes(lowerQuery);
        }
      });
    }

    return result;
  }, [rows, columns, searchQuery, filterColumn]);

  // Sort rows
  const sortedRows = useMemo(() => {
    const result = [...filteredRows];
    if (sortConfig !== null) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
        }

        const aString = String(aValue).toLowerCase();
        const bString = String(bValue).toLowerCase();

        if (aString < bString) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aString > bString) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return result;
  }, [filteredRows, sortConfig]);

  // Paginate rows
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedRows.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedRows, currentPage, rowsPerPage]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / rowsPerPage));

  // Handle header sort triggers
  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  // Export filtered rows as CSV
  const exportCSV = () => {
    if (filteredRows.length === 0) return;
    const csvContent = [
      columns,
      ...filteredRows.map(row => columns.map(col => row[col] ?? ''))
    ]
      .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `spreadsheet_data_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden" id="dashboard-datagrid">
      {/* Search & Export Toolbar */}
      <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-2xl">
          {/* Universal Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search spreadsheet rows..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs font-sans text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Column filter dropdown */}
          <div className="relative flex items-center">
            <ListFilter className="w-3.5 h-3.5 text-slate-400 absolute left-3.5" />
            <select
              value={filterColumn}
              onChange={(e) => {
                setFilterColumn(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl pl-9 pr-8 py-2 text-xs font-sans text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer appearance-none"
            >
              <option value="all">All Columns</option>
              {columns.map(col => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none" />
          </div>
        </div>

        {/* CSV Export Button */}
        <button
          onClick={exportCSV}
          disabled={filteredRows.length === 0}
          className="px-4 py-2 border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/20 text-slate-700 hover:text-emerald-600 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
          Export CSV ({filteredRows.length})
        </button>
      </div>

      {/* Responsive Table Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/20 border-b border-slate-200">
              {columns.map(col => {
                const isSorted = sortConfig?.key === col;
                const isAsc = sortConfig?.direction === 'ascending';
                const analysis = analyses.find(a => a.name === col);

                return (
                  <th
                    key={col}
                    onClick={() => requestSort(col)}
                    className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-50/80 transition-all select-none font-display"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{col}</span>
                      <div className="shrink-0 flex flex-col text-slate-300">
                        {isSorted ? (
                          isAsc ? (
                            <ChevronUp className="w-3.5 h-3.5 text-indigo-500" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-indigo-500" />
                          )
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-300 opacity-50 group-hover:opacity-100" />
                        )}
                      </div>
                      {analysis && (
                        <span className="text-[9px] font-bold lowercase bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-sans">
                          {analysis.type}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-sm text-slate-400">
                  No matching records found.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/30 transition-colors group">
                  {columns.map(col => {
                    const value = row[col];
                    const analysis = analyses.find(a => a.name === col);
                    const isNumeric = analysis?.type === 'numeric';

                    return (
                      <td
                        key={col}
                        className={`px-6 py-3.5 text-xs text-slate-700 font-sans max-w-xs truncate ${
                          isNumeric ? 'font-mono text-slate-900' : ''
                        }`}
                      >
                        {value === true ? (
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[10px] font-bold font-display">True</span>
                        ) : value === false ? (
                          <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md text-[10px] font-bold font-display">False</span>
                        ) : typeof value === 'number' ? (
                          value.toLocaleString(undefined, { maximumFractionDigits: 4 })
                        ) : (
                          String(value ?? '')
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Rows range indicator */}
        <div className="text-xs text-slate-500">
          Showing{' '}
          <span className="font-bold text-slate-800">
            {sortedRows.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}
          </span>{' '}
          to{' '}
          <span className="font-bold text-slate-800">
            {Math.min(currentPage * rowsPerPage, sortedRows.length)}
          </span>{' '}
          of <span className="font-bold text-slate-800">{sortedRows.length}</span> entries
          {searchQuery && <span className="text-indigo-600 font-bold"> (filtered)</span>}
        </div>

        {/* Page controls */}
        <div className="flex items-center justify-between sm:justify-end gap-4">
          {/* Rows per page selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600 focus:outline-none cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-xs text-slate-600 px-2 min-w-[50px] text-center">
              Page <span className="font-bold text-slate-800">{currentPage}</span> of{' '}
              <span className="font-bold text-slate-800">{totalPages}</span>
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
