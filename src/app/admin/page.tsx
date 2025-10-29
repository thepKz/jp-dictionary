"use client";

import { useState, useEffect } from "react";
import DataTable, { TableColumn, TableData, PaginationInfo } from "../_components/DataTable";
import EmailReplyDialog from "../_components/EmailReplyDialog";
import ThemeToggle from "../_components/ThemeToggle";

type Entry = {
  kanji: string;
  reading: string;
  meaning: string;
  example?: string;
  translation?: string;
  linkJP?: string;
  linkVN?: string;
  highlightTerm?: string;
  adjType?: 'na' | 'i';
  stt?: number;
};

type Stat = {
  entries: {
    total: number;
    na: number;
    i: number;
    untyped: number;
  };
  feedback: {
    total: number;
    recent: number;
  };
  recentEntries: Array<Entry>;
  recentFeedback: Array<{
    _id: string;
    type: string;
    email?: string;
    message: string;
    createdAt: string;
  }>;
};

export default function AdminPage() {
  const [stats, setStats] = useState<Stat | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [activeTab, setActiveTab] = useState<'stats' | 'entries' | 'na-table' | 'i-table' | 'feedback' | 'logs'>('stats');
  const [filter, setFilter] = useState<'all' | 'na' | 'i' | 'missing-jp-link' | 'missing-vn-link' | 'missing-highlight' | 'missing-example' | 'missing-translation' | 'untyped' | 'complete'>('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("kanji");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [importing, setImporting] = useState(false);
  const [feedback, setFeedback] = useState<Array<{
    _id: string;
    type: string;
    email?: string;
    message: string;
    createdAt: string;
  }>>([]);
  const [feedbackPagination, setFeedbackPagination] = useState<PaginationInfo | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<{
    _id: string;
    type: string;
    email?: string;
    message: string;
    createdAt: string;
  } | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [importAdjType, setImportAdjType] = useState<'na' | 'i' | 'auto'>('auto');
  const [logs, setLogs] = useState<Array<{
    _id: string;
    action: string;
    user: string;
    details: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
    timestamp: string;
  }>>([]);
  const [logsPagination, setLogsPagination] = useState<PaginationInfo | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

  // Toggle expanded state for items
  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  // Expandable text component
  const ExpandableText = ({ text, maxLength = 40, itemId }: { text: string; maxLength?: number; itemId: string }) => {
    if (!text || text.length <= maxLength) {
      return <span className="text-xs text-gray-600 leading-tight">{text || '-'}</span>;
    }

    const isExpanded = expandedItems.has(itemId);
    const displayText = isExpanded ? text : text.substring(0, maxLength) + '...';

    return (
      <div className="text-xs text-gray-600 leading-tight">
        <span>{displayText}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleExpanded(itemId);
          }}
          className="ml-1 text-blue-600 hover:text-blue-800 underline text-xs"
        >
          {isExpanded ? 'Thu gọn' : 'Xem thêm'}
        </button>
      </div>
    );
  };

  // Table columns configuration
  const columns: TableColumn[] = [
    {
      key: 'stt',
      label: 'STT',
      sortable: true,
      width: '80px',
      render: (value) => (
        <span className="text-xs text-gray-500 font-mono">{String(value || '-')}</span>
      )
    },
    {
      key: 'kanji',
      label: 'Kanji',
      sortable: true,
      width: '150px',
      render: (value) => (
        <span className="font-semibold text-sm sm:text-lg whitespace-nowrap">{String(value || '')}</span>
      )
    },
    {
      key: 'reading',
      label: 'Cách đọc',
      sortable: true,
      width: '180px',
      render: (value) => (
        <span className="font-mono text-xs sm:text-sm whitespace-nowrap">{String(value || '')}</span>
      )
    },
    {
      key: 'meaning',
      label: 'Nghĩa',
      sortable: true,
      width: '250px',
      render: (value) => (
        <span className="text-xs sm:text-sm leading-tight" title={String(value || '')}>
          {String(value || '').length > 40 ? String(value || '').substring(0, 40) + '...' : String(value || '')}
        </span>
      )
    },
    {
      key: 'adjType',
      label: 'Loại',
      sortable: true,
      width: '120px',
      render: (value) => (
        <div className="flex flex-col gap-1">
          <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
            value === 'na' ? 'bg-green-100 text-green-700' :
            value === 'i' ? 'bg-purple-100 text-purple-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {value === 'na' ? 'Na' : value === 'i' ? 'I' : 'Chưa'}
          </span>
        </div>
      )
    },
    {
      key: 'example',
      label: 'Ví dụ',
      width: '400px',
      render: (value, row) => (
        <div className="whitespace-nowrap">
          <ExpandableText 
            text={String(value || '')} 
            maxLength={80} 
            itemId={`example-${row.kanji}-${row.reading}`} 
          />
        </div>
      )
    },
    {
      key: 'translation',
      label: 'Dịch',
      width: '350px',
      render: (value, row) => (
        <div className="whitespace-nowrap">
          <ExpandableText 
            text={String(row.translation || '')} 
            maxLength={80} 
            itemId={`translation-${row.kanji}-${row.reading}`} 
          />
        </div>
      )
    },
    {
      key: 'linkJP',
      label: 'Link JP',
      width: '100px',
      render: (value, row) => (
        <span className="text-xs text-blue-600">
          {row.linkJP ? (
            <a href={String(row.linkJP || '')} target="_blank" rel="noopener noreferrer" className="hover:underline" title={String(row.linkJP || '')}>
              JP
            </a>
          ) : '-'}
        </span>
      )
    },
    {
      key: 'linkVN',
      label: 'Link VN',
      width: '100px',
      render: (value, row) => (
        <span className="text-xs text-blue-600">
          {row.linkVN ? (
            <a href={String(row.linkVN || '')} target="_blank" rel="noopener noreferrer" className="hover:underline" title={String(row.linkVN || '')}>
              VN
            </a>
          ) : '-'}
        </span>
      )
    },
    {
      key: 'highlightTerm',
      label: 'Từ nổi bật',
      width: '150px',
      render: (value, row) => (
        <span className="text-xs text-gray-600" title={String(row.highlightTerm || '')}>
          {row.highlightTerm ? (String(row.highlightTerm).length > 20 ? String(row.highlightTerm).substring(0, 20) + '...' : String(row.highlightTerm)) : '-'}
        </span>
      )
    }
  ];

  // Load stats
  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const json = await res.json();
      if (res.ok) {
        setStats(json);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  // Load entries
  const loadEntries = async () => {
    setLoading(true);
    try {
      let currentFilter = filter;
      if (activeTab === 'na-table') currentFilter = 'na';
      if (activeTab === 'i-table') currentFilter = 'i';
      
      const params = new URLSearchParams({
        filter: currentFilter,
        page: currentPage.toString(),
        search: searchTerm,
        sortBy,
        sortOrder
      });
      
      const res = await fetch(`/api/admin/entries?${params}`);
      const json = await res.json();
      
      if (res.ok) {
        setEntries(json.data);
        setPagination(json.pagination);
      } else {
        setMsg(`Lỗi tải dữ liệu: ${json.error}`);
      }
    } catch (error) {
      console.error('Failed to load entries:', error);
      setMsg('Lỗi tải dữ liệu');
    }
    setLoading(false);
  };

  // Handle CRUD operations
  const handleEdit = (row: TableData) => {
    setEditingEntry(row as Entry);
    setShowAddForm(true);
  };

  const handleDelete = async (row: TableData) => {
    if (!confirm('Bạn có chắc muốn xóa từ này?')) return;
    
    try {
      const response = await fetch('/api/admin/entry', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kanji: row.kanji })
      });
      
      const result = await response.json();
      if (response.ok) {
        setMsg('Đã xóa thành công');
          loadEntries();
        loadStats();
      } else {
        setMsg(`Lỗi: ${result.error}`);
      }
    } catch {
      setMsg('Lỗi xóa dữ liệu');
    }
  };

  const handleBulkDelete = async (rows: TableData[]) => {
    if (!confirm(`Bạn có chắc muốn xóa ${rows.length} từ đã chọn?`)) return;
    
    try {
      const response = await fetch('/api/admin/entry', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kanjis: rows.map(r => r.kanji) })
      });
      
      const result = await response.json();
      if (response.ok) {
        setMsg(`Đã xóa ${result.deletedCount} từ thành công`);
          loadEntries();
        loadStats();
      } else {
        setMsg(`Lỗi: ${result.error}`);
      }
    } catch {
      setMsg('Lỗi xóa dữ liệu');
    }
  };

  const handleSaveEntry = async (entryData: Entry) => {
    try {
      const response = await fetch('/api/admin/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entryData)
      });
      
      const result = await response.json();
      if (response.ok) {
        setMsg('Đã lưu thành công');
        setEditingEntry(null);
        setShowAddForm(false);
        loadEntries();
        loadStats();
      } else {
        setMsg(`Lỗi: ${result.error}`);
      }
    } catch {
      setMsg('Lỗi lưu dữ liệu');
    }
  };

  // Handle table events
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortBy(column);
    setSortOrder(direction);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'entries' || activeTab === 'na-table' || activeTab === 'i-table') {
      loadEntries();
    } else if (activeTab === 'feedback') {
      loadFeedback();
    } else if (activeTab === 'logs') {
      loadLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filter, currentPage, searchTerm, sortBy, sortOrder]);

  // Load feedback
  const loadFeedback = async () => {
    setFeedbackLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });
      
      const res = await fetch(`/api/admin/feedback?${params}`);
      const json = await res.json();
      
      if (res.ok) {
        setFeedback(json.data);
        setFeedbackPagination(json.pagination);
      } else {
        setMsg(`Lỗi tải feedback: ${json.error}`);
      }
    } catch (error) {
      console.error('Failed to load feedback:', error);
      setMsg('Lỗi tải feedback');
    }
    setFeedbackLoading(false);
  };

  // Load admin logs
  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });
      
      console.log('Loading logs with params:', params.toString());
      const res = await fetch(`/api/admin/logs?${params}`);
      const json = await res.json();
      
      console.log('Logs response:', json);
      
      if (res.ok) {
        setLogs(json.data);
        setLogsPagination(json.pagination);
        console.log('Logs loaded successfully:', json.data.length, 'items');
      } else {
        setMsg(`Lỗi tải logs: ${json.error}`);
        console.error('Failed to load logs:', json);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
      setMsg('Lỗi tải logs');
    }
    setLogsLoading(false);
  };

  // Handle import CSV
  const handleImportCsv = async (file?: File, mode: 'append' | 'replace' = 'append', assignType?: 'na' | 'i') => {
    setImporting(true);
    setMsg("");
    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }
      
      const params = new URLSearchParams();
      if (assignType) {
        params.append('assignType', assignType);
      }
      params.append('mode', mode);
      
      const url = `/api/admin/import?${params.toString()}`;
      const res = await fetch(url, { 
        method: "POST",
        body: formData
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Import failed");
      setMsg(`Đã ${mode === 'append' ? 'thêm' : 'thay thế'} ${json.upserted}/${json.count} từ`);
      loadStats();
      if (activeTab === 'entries' || activeTab === 'na-table' || activeTab === 'i-table') {
        loadEntries();
      }
    } catch (e: unknown) {
      setMsg((e as Error).message || "Lỗi import");
    }
    setImporting(false);
  };

  // Handle import modal
  const handleImportModal = (mode: 'append' | 'replace') => {
    setImportMode(mode);
    setImportAdjType('auto');
    setShowImportModal(true);
  };

  // Handle file selection for import
  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const adjType = importAdjType === 'auto' ? undefined : (importAdjType as 'na' | 'i');
        handleImportCsv(file, importMode, adjType);
        setShowImportModal(false);
      }
    };
    input.click();
  };

  // Handle export CSV
  const handleExportCsv = async () => {
    setMsg("");
    try {
      const res = await fetch('/api/admin/export');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
      a.href = url;
      a.download = 'entries_export.csv';
      a.click();
    URL.revokeObjectURL(url);
      setMsg('Đã xuất CSV thành công');
    } catch {
      setMsg('Lỗi xuất CSV');
    }
  };

  // Handle template download
  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/admin/template');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sample.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMsg('Lỗi tải template');
    }
  };

  // Handle email reply
  const handleSendReplyEmail = async (email: string, subject: string, message: string) => {
    try {
      const response = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, subject, message })
      });
      const result = await response.json();
      if (response.ok) {
        setMsg(`Đã gửi email đến ${email}`);
      } else {
        setMsg(`Lỗi gửi email: ${result.error}`);
      }
    } catch {
      setMsg('Lỗi gửi email');
    }
  };

  // Handle feedback row click for email reply
  const handleFeedbackRowClick = (row: Record<string, unknown>) => {
    if (row.email) {
      setSelectedFeedback(row as {
        _id: string;
        type: string;
        email?: string;
        message: string;
        createdAt: string;
      });
      setShowEmailDialog(true);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      window.location.href = '/admin/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Handle create test logs
  const handleCreateTestLogs = async () => {
    try {
      const response = await fetch('/api/admin/test-logs', { method: 'POST' });
      const result = await response.json();
      if (response.ok) {
        setMsg('Đã tạo log test thành công');
        if (activeTab === 'logs') {
          loadLogs();
        }
      } else {
        setMsg(`Lỗi tạo log test: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to create test logs:', error);
      setMsg('Lỗi tạo log test');
    }
  };

  // Handle test database
  const handleTestDB = async () => {
    try {
      const response = await fetch('/api/admin/test-db');
      const result = await response.json();
      if (response.ok) {
        setMsg(`DB OK - Tổng logs: ${result.totalLogs}`);
        console.log('DB test result:', result);
        if (activeTab === 'logs') {
          loadLogs();
        }
      } else {
        setMsg(`Lỗi DB: ${result.error}`);
        console.error('DB test failed:', result);
      }
    } catch (error) {
      console.error('Failed to test DB:', error);
      setMsg('Lỗi test DB');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl bg-white dark:bg-gray-900 admin-container min-h-screen">
      <div className="flex gap-6">
        {/* Left Sidebar */}
        <aside className="w-56 flex-shrink-0">
          <div className="card p-4 sticky top-6 bg-white dark:bg-gray-800 admin-sidebar">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">Menu quản trị</div>
            <nav className="space-y-2">
              <button 
                className={`w-full text-left px-3 py-2 rounded transition-colors nav-button text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  activeTab === 'stats' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : ''
                }`} 
                onClick={() => setActiveTab('stats')}
              >
                Tổng quan
              </button>
              <button 
                className={`w-full text-left px-3 py-2 rounded transition-colors nav-button text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  activeTab === 'entries' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : ''
                }`} 
                onClick={() => setActiveTab('entries')}
              >
                Tất cả từ vựng
              </button>
              <button 
                className={`w-full text-left px-3 py-2 rounded transition-colors nav-button text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  activeTab === 'na-table' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : ''
                }`} 
                onClick={() => setActiveTab('na-table')}
              >
                Tính từ Na
              </button>
              <button 
                className={`w-full text-left px-3 py-2 rounded transition-colors nav-button text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  activeTab === 'i-table' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : ''
                }`} 
                onClick={() => setActiveTab('i-table')}
              >
                Tính từ I
              </button>
              <button 
                className={`w-full text-left px-3 py-2 rounded transition-colors nav-button text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  activeTab === 'feedback' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : ''
                }`} 
                onClick={() => setActiveTab('feedback')}
              >
                Góp ý
              </button>
              <button 
                className={`w-full text-left px-3 py-2 rounded transition-colors nav-button text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  activeTab === 'logs' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : ''
                }`} 
                onClick={() => setActiveTab('logs')}
              >
                Lịch sử hoạt động
              </button>
              <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                <button 
                  className="btn-secondary bg-red-600 hover:bg-red-700 text-white w-full" 
                  onClick={handleLogout}
                >
                  Đăng xuất
                </button>
              </div>
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-light text-gray-900 dark:text-white">Bảng điều khiển quản trị</h1>
            <ThemeToggle />
            {activeTab === 'logs' && (
              <div className="flex gap-2">
                <button 
                  className="btn-secondary bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={handleCreateTestLogs}
                >
                  Tạo log test
                </button>
                <button 
                  className="btn-secondary bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleTestDB}
                >
                  Test DB
                </button>
              </div>
            )}
            {activeTab !== 'stats' && activeTab !== 'feedback' && activeTab !== 'logs' && (
              <div className="flex gap-2">
                <button 
                  className="btn-secondary"
                  onClick={handleExportCsv}
                >
                  Xuất CSV
                </button>
                <button 
                  className="btn-secondary"
                  onClick={handleDownloadTemplate}
                >
                  Tải mẫu CSV
                </button>
                <button 
                  className="btn-secondary bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleImportModal('append')}
                  disabled={importing}
                >
                  {importing ? "Đang nhập..." : "Nhập thêm CSV"}
                </button>
                <button 
                  className="btn-secondary bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={() => handleImportModal('replace')}
                  disabled={importing}
                >
                  {importing ? "Đang nhập..." : "Nhập thay thế CSV"}
                </button>
                <button 
                  className="btn-primary"
                  onClick={() => {
                    setEditingEntry({
                      kanji: '',
                      reading: '',
                      meaning: '',
                      adjType: activeTab === 'na-table' ? 'na' : activeTab === 'i-table' ? 'i' : undefined
                    });
                    setShowAddForm(true);
                  }}
                >
                  Thêm từ mới
                </button>
              </div>
            )}
          </div>

          {msg && (
            <div className="card p-4 mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
              {msg}
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && stats && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800 admin-stats-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1 card-title">Tổng từ vựng</h3>
                      <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 card-text">{stats.entries.total}</p>
                    </div>

                  </div>
                </div>
                
                <div className="card p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800 admin-stats-card green">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-green-600 dark:text-green-400 mb-1 card-title">Tính từ Na</h3>
                      <p className="text-3xl font-bold text-green-700 dark:text-green-300 card-text">{stats.entries.na}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-200 dark:bg-green-800 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">な</span>
                    </div>
                  </div>
                </div>
                
                <div className="card p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800 admin-stats-card purple">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1 card-title">Tính từ I</h3>
                      <p className="text-3xl font-bold text-purple-700 dark:text-purple-300 card-text">{stats.entries.i}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-200 dark:bg-purple-800 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">い</span>
                    </div>
                  </div>
                </div>
                
                <div className="card p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800 admin-stats-card orange">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-1 card-title">Chưa phân loại</h3>
                      <p className="text-3xl font-bold text-orange-700 dark:text-orange-300 card-text">{stats.entries.untyped}</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-200 dark:bg-orange-800 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">❓</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Entries */}
                <div className="card p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Từ vựng gần đây</h3>
                    <button 
                      className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                      onClick={() => setActiveTab('entries')}
                    >
                      Xem tất cả →
                    </button>
                  </div>
                  <div className="space-y-3">
                    {stats.recentEntries.map((item, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg cursor-pointer transition-colors"
                        onClick={() => {
                          setEditingEntry(item);
                          setShowAddForm(true);
                        }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 dark:text-white">{item.kanji}</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">({item.reading})</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              item.adjType === 'na' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                              item.adjType === 'i' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' :
                              'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {item.adjType === 'na' ? 'Tính từ Na' : item.adjType === 'i' ? 'Tính từ I' : 'Chưa phân loại'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{item.meaning}</p>
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                          <span className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">Sửa</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Feedback */}
                <div className="card p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Góp ý gần đây</h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{stats.feedback.total} góp ý</span>
                  </div>
                  <div className="space-y-3">
                    {stats.recentFeedback.map((item, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors">
                        <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              item.type === 'bug' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                              item.type === 'suggestion' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                              'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {item.type}
                            </span>
                            {item.email && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">{item.email}</span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">{item.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
        </div>
      </div>
          )}

          {/* Data Tables */}
          {(activeTab === 'entries' || activeTab === 'na-table' || activeTab === 'i-table') && (
            <>
              {/* Filter Controls */}
              <div className="card p-4 mb-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bộ lọc
                    </label>
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value as 'all' | 'na' | 'i' | 'missing-jp-link' | 'missing-vn-link' | 'missing-highlight' | 'missing-example' | 'missing-translation' | 'untyped' | 'complete')}
                      className="input w-full sm:w-auto"
                    >
                      <option value="all">Tất cả</option>
                      <option value="na">Tính từ Na</option>
                      <option value="i">Tính từ I</option>
                      <option value="missing-jp-link">Thiếu link JP</option>
                      <option value="missing-vn-link">Thiếu link VN</option>
                      <option value="missing-highlight">Thiếu từ nổi bật</option>
                      <option value="missing-example">Thiếu ví dụ</option>
                      <option value="missing-translation">Thiếu dịch</option>
                      <option value="untyped">Chưa phân loại</option>
                      <option value="complete">Có đầy đủ</option>
                    </select>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {pagination && `Hiển thị ${((pagination.page - 1) * pagination.limit) + 1} - ${Math.min(pagination.page * pagination.limit, pagination.total)} trong tổng số ${pagination.total} mục`}
                  </div>
                </div>
              </div>

              <DataTable
                columns={columns}
                data={entries}
                pagination={pagination || undefined}
                loading={loading}
                onPageChange={handlePageChange}
                onSort={handleSort}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onBulkDelete={handleBulkDelete}
                searchable={true}
                onSearch={handleSearch}
                selectable={true}
                actions={{ edit: true, delete: true }}
              />
            </>
          )}

          {/* Feedback Tab */}
          {activeTab === 'feedback' && (
            <DataTable
              columns={[
                {
                  key: 'type',
                  label: 'Loại',
                  width: '100px',
                  render: (value) => (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      value === 'bug' ? 'bg-red-100 text-red-700' :
                      value === 'suggestion' ? 'bg-blue-100 text-blue-700' :
                      value === 'feature' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                      {String(value || '')}
                          </span>
                  )
                },
                {
                  key: 'email',
                  label: 'Email',
                  width: '200px',
                  render: (value) => (
                    <span className="text-sm">{String(value || '-')}</span>
                  )
                },
                {
                  key: 'message',
                  label: 'Nội dung',
                  render: (value) => (
                    <span className="text-sm line-clamp-2">{String(value || '')}</span>
                  )
                },
                {
                  key: 'createdAt',
                  label: 'Ngày',
                  width: '120px',
                  render: (value) => (
                    <span className="text-xs text-gray-500">
                      {new Date(String(value || '')).toLocaleDateString('vi-VN')}
                    </span>
                  )
                }
              ]}
              data={feedback}
              pagination={feedbackPagination || undefined}
              loading={feedbackLoading}
              onPageChange={handlePageChange}
              searchable={false}
              selectable={false}
              actions={{ 
                edit: false, 
                delete: false, 
                view: true 
              }}
              onRowClick={handleFeedbackRowClick}
            />
          )}

          {/* Admin Logs Tab */}
          {activeTab === 'logs' && (
            <DataTable
              columns={[
                {
                  key: 'action',
                  label: 'Hành động',
                  width: '120px',
                  render: (value) => {
                    const actionLabels = {
                      'import': 'Nhập CSV',
                      'export': 'Xuất CSV',
                      'create': 'Tạo mới',
                      'update': 'Cập nhật',
                      'delete': 'Xóa',
                      'login': 'Đăng nhập',
                      'logout': 'Đăng xuất',
                      'email_reply': 'Trả lời email'
                    };
                    const colors = {
                      'import': 'bg-green-100 text-green-700',
                      'export': 'bg-blue-100 text-blue-700',
                      'create': 'bg-purple-100 text-purple-700',
                      'update': 'bg-yellow-100 text-yellow-700',
                      'delete': 'bg-red-100 text-red-700',
                      'login': 'bg-indigo-100 text-indigo-700',
                      'logout': 'bg-gray-100 text-gray-700',
                      'email_reply': 'bg-pink-100 text-pink-700'
                    };
                    return (
                      <span className={`px-2 py-1 text-xs rounded-full ${colors[value as keyof typeof colors] || 'bg-gray-100 text-gray-700'}`}>
                        {actionLabels[String(value || '') as keyof typeof actionLabels] || String(value || '')}
                      </span>
                    );
                  }
                },
                {
                  key: 'user',
                  label: 'Người thực hiện',
                  width: '120px',
                  render: (value) => (
                    <span className="text-sm font-medium">{String(value || '')}</span>
                  )
                },
                {
                  key: 'details',
                  label: 'Chi tiết',
                  render: (value) => {
                    const details: string[] = [];
                    const val = value as Record<string, unknown>;
                    if (val.mode) details.push(`Chế độ: ${val.mode}`);
                    if (val.adjType) details.push(`Loại: ${val.adjType}`);
                    if (val.count) details.push(`Số lượng: ${val.count}`);
                    if (val.fileName) details.push(`File: ${val.fileName}`);
                    if (val.kanji) details.push(`Từ: ${val.kanji}`);
                    if (val.email) details.push(`Email: ${val.email}`);
                    return (
                      <span className="text-sm text-gray-600">
                        {details.length > 0 ? details.join(', ') : '-'}
                      </span>
                    );
                  }
                },
                {
                  key: 'ip',
                  label: 'IP',
                  width: '120px',
                  render: (value) => (
                    <span className="text-xs text-gray-500 font-mono">{String(value || '-')}</span>
                  )
                },
                {
                  key: 'timestamp',
                  label: 'Thời gian',
                  width: '150px',
                  render: (value) => (
                    <span className="text-xs text-gray-500">
                      {new Date(String(value || '')).toLocaleString('vi-VN')}
                    </span>
                  )
                }
              ]}
              data={logs}
              pagination={logsPagination || undefined}
              loading={logsLoading}
              onPageChange={handlePageChange}
              searchable={false}
              selectable={false}
              actions={{ 
                edit: false, 
                delete: false, 
                view: false 
              }}
            />
          )}

          {/* Add/Edit Form Modal */}
          {showAddForm && editingEntry && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                    {editingEntry.kanji ? 'Sửa từ vựng' : 'Thêm từ vựng mới'}
                  </h3>
                  <button 
                    className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingEntry(null);
                    }}
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                      className="input" 
                      value={editingEntry.kanji || ''} 
                      onChange={(e) => setEditingEntry({...editingEntry, kanji: e.target.value})} 
                      placeholder="Kanji" 
                      required
                    />
                    <input 
                      className="input" 
                      value={editingEntry.reading || ''} 
                      onChange={(e) => setEditingEntry({...editingEntry, reading: e.target.value})} 
                      placeholder="Cách đọc" 
                      required
                    />
                    <input 
                      className="input" 
                      value={editingEntry.meaning || ''} 
                      onChange={(e) => setEditingEntry({...editingEntry, meaning: e.target.value})} 
                      placeholder="Nghĩa" 
                      required
                    />
                    <input 
                      className="input" 
                      value={editingEntry.example || ''} 
                      onChange={(e) => setEditingEntry({...editingEntry, example: e.target.value})} 
                      placeholder="Ví dụ" 
                    />
                    <input 
                      className="input" 
                      value={editingEntry.translation || ''} 
                      onChange={(e) => setEditingEntry({...editingEntry, translation: e.target.value})} 
                      placeholder="Dịch" 
                    />
                    <input 
                      className="input" 
                      value={editingEntry.linkJP || ''} 
                      onChange={(e) => setEditingEntry({...editingEntry, linkJP: e.target.value})} 
                      placeholder="Link JP" 
                    />
                    <input 
                      className="input" 
                      value={editingEntry.linkVN || ''} 
                      onChange={(e) => setEditingEntry({...editingEntry, linkVN: e.target.value})} 
                      placeholder="Link VN" 
                    />
                    <input 
                      className="input" 
                      value={editingEntry.highlightTerm || ''} 
                      onChange={(e) => setEditingEntry({...editingEntry, highlightTerm: e.target.value})} 
                      placeholder="Từ nổi bật" 
                    />
                    <select 
                      className="input" 
                      value={editingEntry.adjType || ''} 
                      onChange={(e) => setEditingEntry({...editingEntry, adjType: e.target.value as 'na'|'i'})}
                    >
                      <option value="">Chọn loại tính từ</option>
                      <option value="na">Tính từ Na</option>
                      <option value="i">Tính từ I</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button 
                      className="btn-secondary" 
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingEntry(null);
                      }}
                    >
                      Hủy
                    </button>
                    <button 
                      className="btn-primary" 
                      onClick={() => handleSaveEntry(editingEntry)}
                    >
                      Lưu
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Import CSV Modal */}
          {showImportModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="card max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                    {importMode === 'append' ? 'Nhập thêm CSV' : 'Nhập thay thế CSV'}
                  </h3>
                  <button 
                    className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300"
                    onClick={() => setShowImportModal(false)}
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      <strong>Chế độ {importMode === 'append' ? 'thêm' : 'thay thế'}:</strong>
                      {importMode === 'append' 
                        ? ' Dữ liệu mới sẽ được thêm vào cơ sở dữ liệu hiện có'
                        : ' Tất cả dữ liệu cũ sẽ bị xóa và thay thế bằng dữ liệu mới'
                      }
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Chọn loại tính từ:
                    </label>
                    <select 
                      className="input w-full" 
                      value={importAdjType} 
                      onChange={(e) => setImportAdjType(e.target.value as 'na' | 'i' | 'auto')}
                    >
                      <option value="auto">Tự động phát hiện (dựa trên cách đọc)</option>
                      <option value="na">Tính từ Na (な)</option>
                      <option value="i">Tính từ I (い)</option>
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Tự động phát hiện: kết thúc bằng い → I, kết thúc bằng な hoặc 的 → Na
                    </p>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <button 
                      className="btn-secondary" 
                      onClick={() => setShowImportModal(false)}
                    >
                      Hủy
                    </button>
                    <button 
                      className="btn-primary" 
                      onClick={handleFileSelect}
                    >
                      Chọn file CSV
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Email Reply Dialog */}
          <EmailReplyDialog
            open={showEmailDialog}
            onClose={() => {
              setShowEmailDialog(false);
              setSelectedFeedback(null);
            }}
            feedbackData={selectedFeedback}
            onSendEmail={handleSendReplyEmail}
          />
        </div>
      </div>
    </div>
  );
}