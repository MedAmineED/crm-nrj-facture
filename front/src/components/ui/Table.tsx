import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from '@tanstack/react-table';
import type { ColumnDef, ColumnFiltersState } from '@tanstack/react-table';
import { useState, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Button from './Button';
import Input from './Input';

export type FilterType = 'text' | 'number' | 'dateRange' | 'select';

export interface ExtendedColumnDef<TData, TValue = unknown> extends ColumnDef<TData, TValue> {
  filterType?: FilterType;
  filterOptions?: string[];
  enableColumnFilter?: boolean;
}

export interface DataTableProps<TData> {
  columns: ExtendedColumnDef<TData, unknown>[];
  data: TData[];
  onPaginationChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onFilterChange?: (filters: ColumnFiltersState) => void;
  pageCount?: number;
  currentPage?: number;
  pageSize?: number;
  isLoading?: boolean;
  isModal?: boolean;
  isContact?: boolean;
}

// Icons
const Icons = {
  Filter: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  ),
  Download: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
    </svg>
  ),
  ChevronLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  ChevronsLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>
    </svg>
  ),
  ChevronsRight: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>
    </svg>
  ),
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>
    </svg>
  ),
  Loader: () => (
    <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  ),
};

export function DataTable<TData>({
  columns,
  data,
  onPaginationChange,
  onPageSizeChange,
  onFilterChange,
  pageCount = 0,
  currentPage = 1,
  pageSize = 10,
  isLoading = false,
  isModal = false,
  isContact = false,
}: DataTableProps<TData>) {
  const [localFilters, setLocalFilters] = useState<ColumnFiltersState>([]);
  const [appliedFilters, setAppliedFilters] = useState<ColumnFiltersState>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFilterDirty, setIsFilterDirty] = useState(false);
  const [customPageSize, setCustomPageSize] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnFiltersChange: (filters) => {
      setLocalFilters(filters);
      setIsFilterDirty(true);
    },
    state: {
      columnFilters: localFilters,
      pagination: {
        pageIndex: currentPage - 1,
        pageSize: pageSize,
      },
    },
    manualPagination: true,
    manualFiltering: true,
    pageCount,
  });

  const handleApplyFilters = useCallback(() => {
    setAppliedFilters([...localFilters]);
    onFilterChange?.(localFilters);
    setIsFilterDirty(false);
  }, [localFilters, onFilterChange]);

  const handleResetFilters = useCallback(() => {
    setLocalFilters([]);
    setAppliedFilters([]);
    table.resetColumnFilters();
    setIsFilterDirty(false);
    onFilterChange?.([]);
  }, [onFilterChange, table]);

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      onPaginationChange?.(currentPage - 1);
    }
  }, [currentPage, onPaginationChange]);

  const handleNextPage = useCallback(() => {
    if (currentPage < (pageCount || 1)) {
      onPaginationChange?.(currentPage + 1);
    }
  }, [currentPage, pageCount, onPaginationChange]);

  const exportToCSV = useCallback(() => {
    const headers = columns
      .filter(column => column.id !== 'actions')
      .map(column => ({
        key: column.accessorKey as string,
        label: String(column.header)
      }));

    const csvHeaders = headers.map(header => `"${header.label}"`).join(',');
    const csvRows = data.map((row: any) => {
      return headers.map(header => {
        const value = row[header.key];
        if (value === undefined || value === null) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',');
    }).join('\n');

    const csvContent = `${csvHeaders}\n${csvRows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [columns, data]);

  const renderFilterInput = (column: ReturnType<typeof table.getColumn>) => {
    if (!column) return null;

    const columnDef = column.columnDef as ExtendedColumnDef<TData, unknown>;
    const filterType = columnDef.filterType ?? 'text';
    const filterValue = column.getFilterValue() ?? '';
    const columnId = column.id;

    switch (filterType) {
      case 'text':
        return (
          <Input
            id={`filter-${columnId}`}
            placeholder={`Filtrer...`}
            value={String(filterValue)}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              column.setFilterValue(e.target.value)
            }
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
          />
        );
      case 'number':
        return (
          <div className="flex gap-2">
            <Input
              id={`filter-${columnId}-min`}
              type="number"
              placeholder="Min"
              value={(filterValue as [number, number])?.[0] ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                column.setFilterValue([
                  e.target.value ? Number(e.target.value) : undefined,
                  (filterValue as [number, number])?.[1],
                ])
              }
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
            <Input
              id={`filter-${columnId}-max`}
              type="number"
              placeholder="Max"
              value={(filterValue as [number, number])?.[1] ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                column.setFilterValue([
                  (filterValue as [number, number])?.[0],
                  e.target.value ? Number(e.target.value) : undefined,
                ])
              }
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
          </div>
        );
      case 'dateRange':
        return (
          <div className="flex gap-2">
            <DatePicker
              id={`filter-${columnId}-start`}
              selected={(filterValue as [string, string])?.[0] ? new Date((filterValue as [string, string])[0]) : null}
              onChange={(date: Date | null) =>
                column.setFilterValue([
                  date?.toISOString() ?? undefined,
                  (filterValue as [string, string])?.[1],
                ])
              }
              placeholderText="Début"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
            <DatePicker
              id={`filter-${columnId}-end`}
              selected={(filterValue as [string, string])?.[1] ? new Date((filterValue as [string, string])[1]) : null}
              onChange={(date: Date | null) =>
                column.setFilterValue([
                  (filterValue as [string, string])?.[0],
                  date?.toISOString() ?? undefined,
                ])
              }
              placeholderText="Fin"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
          </div>
        );
      case 'select':
        const options = columnDef.filterOptions || [];
        return (
          <select
            id={`filter-${columnId}`}
            value={String(filterValue)}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              column.setFilterValue(e.target.value || undefined)
            }
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
          >
            <option value="">Tous</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      default:
        return null;
    }
  };

  return (
    <div className="card-premium overflow-hidden">
      {/* Controls Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isFilterOpen 
                  ? 'bg-primary-50 text-primary-700 border border-primary-200' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <Icons.Filter />
              <span>Filtres</span>
              {appliedFilters.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-primary-500 text-white">
                  {appliedFilters.length}
                </span>
              )}
            </button>
            
            {isFilterDirty && (
              <Button variant="primary" size="sm" onClick={handleApplyFilters} disabled={isLoading}>
                Appliquer
              </Button>
            )}
            
            {appliedFilters.length > 0 && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Icons.X />
                Réinitialiser
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {(!isModal && !isContact) && (
              <button
                onClick={exportToCSV}
                disabled={isLoading || data?.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icons.Download />
                Exporter CSV
              </button>
            )}
            
            <div className="flex items-center gap-2">
              {showCustomInput ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={customPageSize}
                    onChange={(e) => setCustomPageSize(e.target.value)}
                    placeholder="Taille"
                    className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                    min="1"
                  />
                  <Button variant="primary" size="sm" onClick={() => {
                    if (customPageSize) {
                      onPageSizeChange?.(Number(customPageSize));
                      setShowCustomInput(false);
                    }
                  }}>
                    OK
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowCustomInput(false)}>
                    <Icons.X />
                  </Button>
                </div>
              ) : (
                <select
                  value={pageSize}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setShowCustomInput(true);
                    } else {
                      onPageSizeChange?.(Number(e.target.value));
                    }
                  }}
                  className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all cursor-pointer"
                  disabled={isLoading}
                >
                  {[10, 20, 30, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size} lignes
                    </option>
                  ))}
                  <option value="custom">Personnalisé...</option>
                </select>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {isFilterOpen && (
        <div className="px-6 py-5 bg-gradient-to-b from-slate-50 to-slate-100/50 border-b border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {table
              .getAllColumns()
              .filter(column => column.getCanFilter())
              .map((column) => (
                <div key={column.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor={`filter-${column.id}`} className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {column.id.charAt(0).toUpperCase() + column.id.slice(1).replace(/_/g, ' ')}
                    </label>
                    {column.getFilterValue() && (
                      <button
                        onClick={() => {
                          column.setFilterValue(undefined);
                          setIsFilterDirty(true);
                        }}
                        className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        Effacer
                      </button>
                    )}
                  </div>
                  {renderFilterInput(column)}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-gradient-to-r from-slate-50 to-slate-100/50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <Icons.Loader />
                    <span className="text-sm font-medium">Chargement des données...</span>
                  </div>
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/>
                    </svg>
                    <span className="text-sm font-medium">Aucune donnée trouvée</span>
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, index) => (
                <tr 
                  key={row.id} 
                  className={`group transition-colors duration-150 hover:bg-primary-50/30 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4 text-sm text-slate-700">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-slate-100 bg-gradient-to-r from-white to-slate-50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            Page <span className="font-semibold text-slate-700">{currentPage}</span> sur <span className="font-semibold text-slate-700">{pageCount || 1}</span>
          </p>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPaginationChange?.(1)}
              disabled={currentPage <= 1 || isLoading}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Première page"
            >
              <Icons.ChevronsLeft />
            </button>
            <button
              onClick={handlePreviousPage}
              disabled={currentPage <= 1 || isLoading}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Page précédente"
            >
              <Icons.ChevronLeft />
            </button>
            
            <div className="flex items-center gap-1 mx-2">
              {Array.from({ length: Math.min(5, pageCount || 1) }, (_, i) => {
                let pageNum: number;
                if (pageCount <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= (pageCount || 1) - 2) {
                  pageNum = (pageCount || 1) - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPaginationChange?.(pageNum)}
                    disabled={isLoading}
                    className={`min-w-[2.5rem] h-10 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      currentPage === pageNum
                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              {pageCount && pageCount > 5 && currentPage < (pageCount - 2) && (
                <>
                  <span className="px-1 text-slate-400">...</span>
                  <button
                    onClick={() => onPaginationChange?.(pageCount)}
                    disabled={isLoading}
                    className="min-w-[2.5rem] h-10 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-all duration-200"
                  >
                    {pageCount}
                  </button>
                </>
              )}
            </div>
            
            <button
              onClick={handleNextPage}
              disabled={currentPage >= (pageCount || 1) || isLoading}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Page suivante"
            >
              <Icons.ChevronRight />
            </button>
            <button
              onClick={() => onPaginationChange?.(pageCount || 1)}
              disabled={currentPage >= (pageCount || 1) || isLoading}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Dernière page"
            >
              <Icons.ChevronsRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}