"use client";

import { useState } from "react";

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

export interface TableData {
  [key: string]: unknown;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface DataTableProps {
  columns: TableColumn[];
  data: TableData[];
  pagination?: PaginationInfo;
  loading?: boolean;
  onPageChange?: (page: number) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  onRowClick?: (row: TableData) => void;
  onEdit?: (row: TableData) => void;
  onDelete?: (row: TableData) => void;
  onBulkDelete?: (rows: TableData[]) => void;
  searchable?: boolean;
  onSearch?: (term: string) => void;
  selectable?: boolean;
  actions?: {
    edit?: boolean;
    delete?: boolean;
    view?: boolean;
  };
}

export default function DataTable({
  columns,
  data,
  pagination,
  loading = false,
  onPageChange,
  onSort,
  onRowClick,
  onEdit,
  onDelete,
  onBulkDelete,
  searchable = true,
  onSearch,
  selectable = true,
  actions = { edit: true, delete: true }
}: DataTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');

  // Handle row selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(data.map((_, index) => index.toString())));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (index: string, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(index);
    } else {
      newSelected.delete(index);
    }
    setSelectedRows(newSelected);
  };

  // Handle sorting
  const handleSort = (column: string) => {
    if (!onSort) return;
    
    const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortColumn(column);
    setSortDirection(newDirection);
    onSort(column, newDirection);
  };

  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (onSearch) {
      onSearch(term);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (!onBulkDelete || selectedRows.size === 0) return;
    
    const selectedData = data.filter((_, index) => selectedRows.has(index.toString()));
    if (confirm(`Bạn có chắc muốn xóa ${selectedRows.size} mục đã chọn?`)) {
      onBulkDelete(selectedData);
      setSelectedRows(new Set());
    }
  };

  // Get selected rows data
  // const selectedRowsData = data.filter((_, index) => selectedRows.has(index.toString()));

  return (
    <div className="card p-6">
      {/* Header with search and bulk actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {searchable && (
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="input pl-10 w-full sm:w-80"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                🔍
              </div>
            </div>
          )}
          
          {pagination && (
            <div className="text-xs sm:text-sm text-muted-foreground">
              Hiển thị {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} trong tổng số {pagination.total} mục
            </div>
          )}
        </div>

        {selectable && selectedRows.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-muted-foreground">
              Đã chọn {selectedRows.size} mục
            </span>
            {onBulkDelete && (
              <button
                onClick={handleBulkDelete}
                className="btn-secondary bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-1 text-xs sm:text-sm"
              >
                Xóa đã chọn
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-border">
              {selectable && (
                <th className="text-left p-2 sm:p-3 w-8 sm:w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === data.length && data.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`text-left p-2 sm:p-3 font-medium text-muted-foreground text-xs sm:text-sm whitespace-nowrap ${
                    column.sortable ? 'cursor-pointer hover:text-foreground' : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="truncate">{column.label}</span>
                    {column.sortable && (
                      <span className="text-xs flex-shrink-0">
                        {sortColumn === column.key ? (
                          sortDirection === 'asc' ? '↑' : '↓'
                        ) : (
                          '↕'
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {(actions.edit || actions.delete || actions.view) && (
                <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground w-20 sm:w-32 text-xs sm:text-sm">
                  Thao tác
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + ((actions.edit || actions.delete || actions.view) ? 1 : 0)} className="p-8 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-muted-foreground">Đang tải...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + ((actions.edit || actions.delete || actions.view) ? 1 : 0)} className="p-8 text-center text-muted-foreground">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={index}
                  className={`border-b border-border hover:bg-muted/50 transition-colors ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {selectable && (
                    <td className="p-2 sm:p-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(index.toString())}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectRow(index.toString(), e.target.checked);
                        }}
                        className="rounded"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.key} className="p-2 sm:p-3">
                      {column.render ? column.render(row[column.key], row) : String(row[column.key] || '')}
                    </td>
                  ))}
                  {(actions.edit || actions.delete || actions.view) && (
                    <td className="p-2 sm:p-3">
                      <div className="flex items-center gap-1 sm:gap-2">
                        {actions.view && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onRowClick) onRowClick(row);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm"
                          >
                            Xem
                          </button>
                        )}
                        {actions.edit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onEdit) onEdit(row);
                            }}
                            className="text-green-600 hover:text-green-800 text-xs sm:text-sm"
                          >
                            Sửa
                          </button>
                        )}
                        {actions.delete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onDelete) onDelete(row);
                            }}
                            className="text-red-600 hover:text-red-800 text-xs sm:text-sm"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 sm:mt-6 gap-4">
          <div className="text-xs sm:text-sm text-muted-foreground">
            Trang {pagination.page} / {pagination.pages}
          </div>
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
            <button
              onClick={() => onPageChange && onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="btn-secondary px-2 sm:px-3 py-1 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(pagination.pages - 4, pagination.page - 2)) + i;
              if (pageNum > pagination.pages) return null;
              
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange && onPageChange(pageNum)}
                  className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded ${
                    pageNum === pagination.page
                      ? 'bg-primary text-primary-foreground'
                      : 'btn-secondary'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => onPageChange && onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="btn-secondary px-2 sm:px-3 py-1 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
