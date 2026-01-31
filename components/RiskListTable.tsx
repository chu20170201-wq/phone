import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { AlertTriangle, Shield, CheckCircle, ExternalLink, Copy, Check, Filter, Edit2, Save, X, Trash2 } from 'lucide-react';
import { useState } from 'react';

// 安全的日期格式化函數
function formatDate(dateString: string | undefined | null): string {
  if (!dateString || dateString.trim() === '') {
    return '-';
  }
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return format(date, 'yyyy-MM-dd HH:mm:ss');
  } catch (error) {
    return dateString;
  }
}

// 縮短 User ID 顯示
function truncateUserId(userId: string, maxLength: number = 12): string {
  if (!userId || userId.length <= maxLength) {
    return userId;
  }
  return userId.substring(0, maxLength) + '...';
}

// 複製到剪貼板
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch {
      document.body.removeChild(textArea);
      return false;
    }
  }
}

// 風險類型中文翻譯
const riskTypeTranslations: Record<string, string> = {
  'robbery': '搶劫',
  'medicine': '吃藥',
  'pigeon': '鴿子',
  'bird': '放鳥',
  'pic': '偷拍',
  'hit': '暴力',
  'fake': '假鈔',
  'sick': '性病',
  'theft': '偷錢',
  'bare': '拔套',
  'cancelking': '取消王',
  'vip': 'VIP',
};

// 獲取風險類型中文名稱
function getRiskTypeLabel(type: string): string {
  return riskTypeTranslations[type.toLowerCase()] || type || '未知';
}

interface RiskRecord {
  rowNumber: number;
  phoneNumber: string;
  userId: string;
  timestamp: string;
  prefix: string;
  riskLevel: string;
  isPigeon: boolean;
  pigeonPhone: string;
  category: string;
  type: string;
  type_from_sheet: string;
  displayName: string;
  memberProfile: string;
  hasMemberRow: boolean;
  plan: string;
  memberState: string;
  isMember: boolean;
  overrideBlocked: boolean;
  hasUserId: boolean;
  status: string;
}

export default function RiskListTable() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<RiskRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<RiskRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<RiskRecord | null>(null);
  const [editForm, setEditForm] = useState<{
    phoneNumber: string;
    userId: string;
    type: string;
    riskLevel: string;
    status: string;
  }>({
    phoneNumber: '',
    userId: '',
    type: '',
    riskLevel: '',
    status: '',
  });
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['risk-list', typeFilter, searchQuery],
    queryFn: async () => {
      let url = '/api/risk-list';
      const params = new URLSearchParams();
      if (typeFilter !== 'all') {
        params.append('type', typeFilter);
      }
      if (searchQuery) {
        params.append('phoneNumber', searchQuery);
      }
      if (params.toString()) {
        url += '?' + params.toString();
      }
      const res = await axios.get(url);
      return res.data.data as RiskRecord[];
    },
    staleTime: 2 * 60 * 1000, // 2 分钟内数据视为新鲜
    refetchInterval: 60000, // 每 60 秒自动刷新
  });

  // 處理複製 User ID
  const handleCopyUserId = async (userId: string) => {
    const success = await copyToClipboard(userId);
    if (success) {
      setCopiedUserId(userId);
      setTimeout(() => setCopiedUserId(null), 2000);
    } else {
      alert('複製失敗，請手動複製');
    }
  };

  // 處理編輯
  const handleEdit = (record: RiskRecord) => {
    setEditingRecord(record);
    setEditForm({
      phoneNumber: record.phoneNumber || '',
      userId: record.userId || '',
      type: record.type || '',
      riskLevel: record.riskLevel || '',
      status: record.status || '',
    });
  };

  const handleSave = async () => {
    if (!editingRecord) return;

    try {
      await axios.put('/api/risk-list', {
        rowNumber: editingRecord.rowNumber,
        ...editForm,
      });
      
      // 刷新數據
      queryClient.invalidateQueries({ queryKey: ['risk-list'] });
      setEditingRecord(null);
      setEditForm({
        phoneNumber: '',
        userId: '',
        type: '',
        riskLevel: '',
        status: '',
      });
    } catch (error) {
      console.error('更新失敗:', error);
      alert('更新失敗，請稍後重試');
    }
  };

  const handleCancelEdit = () => {
    setEditingRecord(null);
    setEditForm({
      phoneNumber: '',
      userId: '',
      type: '',
      riskLevel: '',
      status: '',
    });
  };

  // 處理刪除
  const handleDelete = async () => {
    if (!deletingRecord) return;

    try {
      await axios.delete(`/api/risk-list?rowNumber=${deletingRecord.rowNumber}`);
      
      // 刷新數據
      queryClient.invalidateQueries({ queryKey: ['risk-list'] });
      setDeletingRecord(null);
    } catch (error) {
      console.error('刪除失敗:', error);
      alert('刪除失敗，請稍後重試');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden border border-gray-200/50 p-8">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 shadow-lg">
        <p className="text-red-800 font-medium">載入資料失敗，請稍後重試</p>
      </div>
    );
  }

  const records = data || [];
  
  // 統計各風險類型的數量
  const typeStats = records.reduce((acc, record) => {
    const type = record.type || '未知';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const uniqueTypes = Object.keys(typeStats).sort((a, b) => {
    // 按照中文名稱排序
    const labelA = getRiskTypeLabel(a);
    const labelB = getRiskTypeLabel(b);
    return labelA.localeCompare(labelB, 'zh-TW');
  });
  const totalPages = Math.ceil(records.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const paginatedRecords = records.slice(startIndex, startIndex + itemsPerPage);

  const getRiskLevelIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'medium':
        return <Shield className="w-5 h-5 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return null;
    }
  };

  const getRiskLevelBadge = (riskLevel: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800 border border-red-200',
      medium: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      low: 'bg-green-100 text-green-800 border border-green-200',
    };
    const labels = {
      high: '高風險',
      medium: '中風險',
      low: '低風險',
    };
    return (
      <span
        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full shadow-sm ${
          colors[riskLevel as keyof typeof colors] || 'bg-gray-100 text-gray-800 border border-gray-200'
        }`}
      >
        {labels[riskLevel as keyof typeof labels] || '未知'}
      </span>
    );
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden border border-gray-200/50">
      <div className="px-6 py-6 sm:p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              風險名單
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              共 {records.length.toLocaleString()} 筆記錄
              {typeFilter !== 'all' && (
                <span className="ml-2 text-purple-600 font-semibold">
                  （已篩選：{getRiskTypeLabel(typeFilter)}）
                </span>
              )}
            </p>
          </div>
        </div>

        {/* 搜索欄 */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="block w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl leading-5 bg-white/90 backdrop-blur-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-lg transition-all duration-200 hover:shadow-xl sm:text-sm"
              placeholder="搜尋電話號碼..."
            />
          </div>
        </div>

        {/* 風險類型篩選 */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => {
              setTypeFilter('all');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
              typeFilter === 'all'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            全部 ({records.length})
          </button>
          {uniqueTypes.map((type) => (
            <button
              key={type}
              onClick={() => {
                setTypeFilter(type);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                typeFilter === type
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg'
                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              }`}
            >
              {getRiskTypeLabel(type)} ({typeStats[type]})
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  行號
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  電話號碼
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  風險類型
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  風險等級
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  User ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  時間
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedRecords.map((record) => {
                const isEditing = editingRecord?.rowNumber === record.rowNumber;
                return (
                  <tr key={record.rowNumber} className="hover:bg-red-50/50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.rowNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.phoneNumber}
                          onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                          className="px-3 py-1.5 border-2 border-blue-300 rounded-lg text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
                        />
                      ) : (
                        <div className="flex items-center">
                          <span className="font-mono">{record.phoneNumber}</span>
                          {record.isPigeon && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-semibold text-orange-700 bg-orange-100 rounded-full border border-orange-200">鴿子號</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {isEditing ? (
                        <select
                          value={editForm.type}
                          onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                          className="px-3 py-1.5 border-2 border-blue-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">請選擇</option>
                          {Object.keys(riskTypeTranslations).map((type) => (
                            <option key={type} value={type}>
                              {riskTypeTranslations[type]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 border border-red-200 shadow-sm">
                          {getRiskTypeLabel(record.type)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {isEditing ? (
                        <select
                          value={editForm.riskLevel}
                          onChange={(e) => setEditForm({ ...editForm, riskLevel: e.target.value })}
                          className="px-3 py-1.5 border-2 border-blue-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">請選擇</option>
                          <option value="high">高風險</option>
                          <option value="medium">中風險</option>
                          <option value="low">低風險</option>
                        </select>
                      ) : (
                        <div className="flex items-center space-x-2">
                          {getRiskLevelIcon(record.riskLevel)}
                          {getRiskLevelBadge(record.riskLevel)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.userId}
                          onChange={(e) => setEditForm({ ...editForm, userId: e.target.value })}
                          className="px-3 py-1.5 border-2 border-blue-300 rounded-lg text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
                          placeholder="User ID"
                        />
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs" title={record.userId || '無'}>
                            {record.userId ? truncateUserId(record.userId) : '無'}
                          </span>
                          {record.userId && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyUserId(record.userId);
                                }}
                                className="text-gray-400 hover:text-blue-600 transition-colors duration-200 p-1 rounded hover:bg-blue-50"
                                title="複製 User ID"
                              >
                                {copiedUserId === record.userId ? (
                                  <Check className="w-3.5 h-3.5 text-green-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const memberUrl = `/api/members?userId=${record.userId}`;
                                  window.open(memberUrl, '_blank');
                                }}
                                className="text-gray-400 hover:text-blue-600 transition-colors duration-200 p-1 rounded hover:bg-blue-50"
                                title="查看會員資訊"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(record.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={handleSave}
                              className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200 flex items-center space-x-1"
                              title="儲存"
                            >
                              <Save className="w-4 h-4" />
                              <span className="text-xs">儲存</span>
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1.5 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-all duration-200 flex items-center space-x-1"
                              title="取消"
                            >
                              <X className="w-4 h-4" />
                              <span className="text-xs">取消</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(record)}
                              className="px-3 py-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200 flex items-center space-x-1"
                              title="編輯"
                            >
                              <Edit2 className="w-4 h-4" />
                              <span className="text-xs">編輯</span>
                            </button>
                            <button
                              onClick={() => setSelectedRecord(record)}
                              className="px-3 py-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-all duration-200 flex items-center space-x-1"
                              title="查看詳情"
                            >
                              <span className="text-xs">詳情</span>
                            </button>
                            <button
                              onClick={() => setDeletingRecord(record)}
                              className="px-3 py-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200 flex items-center space-x-1"
                              title="刪除"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span className="text-xs">刪除</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 分頁 */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between bg-gray-50 rounded-xl p-4">
            <div className="text-sm text-gray-700 font-medium">
              顯示第 {startIndex + 1} 到 {Math.min(startIndex + itemsPerPage, records.length)} 筆，共 {records.length.toLocaleString()} 筆
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-5 py-2 border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
              >
                上一頁
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-5 py-2 border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
              >
                下一頁
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 詳情模態框 */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 animate-fade-in">
          <div className="relative top-10 mx-auto p-6 border-2 border-gray-200 w-11/12 md:w-3/4 lg:w-1/2 shadow-2xl rounded-2xl bg-white animate-slide-up">
            <div className="mt-2">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900">風險名單詳情</h3>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all duration-200"
                >
                  <span className="text-2xl">✕</span>
                </button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">行號</label>
                    <p className="mt-2 text-sm font-semibold text-gray-900">{selectedRecord.rowNumber}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">電話號碼</label>
                    <p className="mt-2 text-sm font-mono font-semibold text-gray-900">{selectedRecord.phoneNumber}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
                    <label className="text-xs font-semibold text-red-700 uppercase tracking-wide">風險類型</label>
                    <p className="mt-2 text-sm font-bold text-red-900">{getRiskTypeLabel(selectedRecord.type)}</p>
                    {selectedRecord.type && riskTypeTranslations[selectedRecord.type.toLowerCase()] && (
                      <p className="mt-1 text-xs text-red-600">（原始值：{selectedRecord.type}）</p>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">風險等級</label>
                    <p className="mt-2">{getRiskLevelBadge(selectedRecord.riskLevel)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">User ID</label>
                    <p className="mt-2 text-sm font-mono font-semibold text-gray-900">
                      {selectedRecord.userId || '無'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">時間</label>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {formatDate(selectedRecord.timestamp)}
                    </p>
                  </div>
                  {selectedRecord.category && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">分類</label>
                      <p className="mt-2 text-sm font-semibold text-gray-900">{selectedRecord.category}</p>
                    </div>
                  )}
                  {selectedRecord.displayName && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">顯示名稱</label>
                      <p className="mt-2 text-sm font-semibold text-gray-900">{selectedRecord.displayName}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-8 flex justify-end border-t border-gray-200 pt-6">
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 font-semibold shadow-lg transition-all duration-200"
                >
                  關閉
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 刪除確認模態框 */}
      {deletingRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 animate-fade-in">
          <div className="relative top-20 mx-auto p-6 border-2 border-red-200 w-11/12 md:w-2/3 lg:w-1/2 shadow-2xl rounded-2xl bg-white animate-slide-up">
            <div className="mt-2">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">確認刪除</h3>
                    <p className="text-sm text-gray-500 mt-1">風險記錄</p>
                  </div>
                </div>
                <button
                  onClick={() => setDeletingRecord(null)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all duration-200"
                >
                  <span className="text-2xl">✕</span>
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
                  <p className="text-sm text-red-800 font-medium">
                    ⚠️ 警告：此操作無法復原！
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    您即將刪除以下風險記錄：
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">行號:</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {deletingRecord.rowNumber}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">電話號碼:</span>
                      <span className="text-sm font-mono font-semibold text-gray-900">
                        {deletingRecord.phoneNumber || '無'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">風險類型:</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {getRiskTypeLabel(deletingRecord.type)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">風險等級:</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {deletingRecord.riskLevel || '無'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">User ID:</span>
                      <span className="text-sm font-mono font-semibold text-gray-900">
                        {deletingRecord.userId || '無'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <p className="text-xs text-yellow-800">
                    💡 提示：刪除記錄後，該記錄的所有相關資料將從 Sheet2 中移除。
                  </p>
                </div>
              </div>

              <div className="mt-8 flex justify-end space-x-3 border-t border-gray-200 pt-6">
                <button
                  onClick={() => setDeletingRecord(null)}
                  className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold transition-all duration-200"
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg hover:from-red-600 hover:to-rose-700 font-semibold shadow-lg transition-all duration-200 flex items-center space-x-2"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>確認刪除</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
