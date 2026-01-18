import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { AlertTriangle, Shield, CheckCircle, ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';

// 安全的日期格式化函数
function formatDate(dateString: string | undefined | null): string {
  if (!dateString || dateString.trim() === '') {
    return '-';
  }
  try {
    const date = new Date(dateString);
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return dateString; // 如果无法解析，返回原始值
    }
    return format(date, 'yyyy-MM-dd HH:mm:ss');
  } catch (error) {
    return dateString; // 如果出错，返回原始值
  }
}

interface PhoneRecord {
  rowNumber: number;
  phoneNumber: string;
  prefix: string;
  riskLevel: string;
  userId: string;
  timestamp: string;
  isPigeon: boolean;
  isMember: boolean;
  plan: string;
  status: string;
  displayName: string;
  lineName: string;
  contactPhone: string;
  startAt: string;
  expireAt: string;
}

interface PhoneRecordsTableProps {
  searchQuery: string;
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
    // 降級方案：使用傳統方法
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

export default function PhoneRecordsTable({ searchQuery }: PhoneRecordsTableProps) {
  const [selectedRecord, setSelectedRecord] = useState<PhoneRecord | null>(null);
  const [riskLevelFilter, setRiskLevelFilter] = useState<string>('all'); // 'all', 'high', 'medium', 'low'
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['phone-records', searchQuery],
    queryFn: async () => {
      let url = '/api/phone-records';
      if (searchQuery) {
        // 判斷是電話號碼還是 User ID
        if (searchQuery.startsWith('U') || searchQuery.length > 10) {
          url += `?userId=${encodeURIComponent(searchQuery)}`;
        } else {
          url += `?phone=${encodeURIComponent(searchQuery)}`;
        }
      }
      const res = await axios.get(url);
      return res.data.data as PhoneRecord[];
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
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

  // 根據風險等級過濾記錄
  const filteredRecords = riskLevelFilter === 'all' 
    ? (data || [])
    : (data || []).filter(record => record.riskLevel === riskLevelFilter);
  
  const records = filteredRecords;
  const totalPages = Math.ceil(records.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const paginatedRecords = records.slice(startIndex, startIndex + itemsPerPage);

  // 統計各風險等級的數量
  const riskLevelStats = {
    all: (data || []).length,
    high: (data || []).filter(r => r.riskLevel === 'high').length,
    medium: (data || []).filter(r => r.riskLevel === 'medium').length,
    low: (data || []).filter(r => r.riskLevel === 'low').length,
  };

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
              電話查詢記錄
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              共 {records.length.toLocaleString()} 筆記錄
              {riskLevelFilter !== 'all' && (
                <span className="ml-2 text-purple-600 font-semibold">
                  （已篩選：{riskLevelFilter === 'high' ? '高風險' : riskLevelFilter === 'medium' ? '中風險' : '低風險'}）
                </span>
              )}
            </p>
          </div>
        </div>

        {/* 風險等級分類篩選 */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => {
              setRiskLevelFilter('all');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
              riskLevelFilter === 'all'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            全部 ({riskLevelStats.all})
          </button>
          <button
            onClick={() => {
              setRiskLevelFilter('high');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center space-x-2 ${
              riskLevelFilter === 'high'
                ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg'
                : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>高風險 ({riskLevelStats.high})</span>
          </button>
          <button
            onClick={() => {
              setRiskLevelFilter('medium');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center space-x-2 ${
              riskLevelFilter === 'medium'
                ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-lg'
                : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>中風險 ({riskLevelStats.medium})</span>
          </button>
          <button
            onClick={() => {
              setRiskLevelFilter('low');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center space-x-2 ${
              riskLevelFilter === 'low'
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>低風險 ({riskLevelStats.low})</span>
          </button>
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
                  風險等級
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  User ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  時間
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  會員狀態
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedRecords.map((record) => (
                <tr key={record.rowNumber} className="hover:bg-blue-50/50 transition-colors duration-150 cursor-pointer">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.rowNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center">
                      <span className="font-mono">{record.phoneNumber}</span>
                      {record.isPigeon && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-semibold text-orange-700 bg-orange-100 rounded-full border border-orange-200">鴿子號</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      {getRiskLevelIcon(record.riskLevel)}
                      {getRiskLevelBadge(record.riskLevel)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(record.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.isMember ? (
                      <div className="flex items-center space-x-2">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200 shadow-sm">
                          {record.plan || '會員'}
                        </span>
                        {record.status && (
                          <span className="text-xs text-gray-600 font-medium">
                            ({record.status})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">非會員</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setSelectedRecord(record)}
                      className="px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200 font-semibold"
                    >
                      查看詳情
                    </button>
                  </td>
                </tr>
              ))}
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
                <h3 className="text-2xl font-bold text-gray-900">記錄詳情</h3>
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
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">前綴</label>
                    <p className="mt-2 text-sm font-semibold text-gray-900">{selectedRecord.prefix}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">風險等級</label>
                    <p className="mt-2">{getRiskLevelBadge(selectedRecord.riskLevel)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">User ID</label>
                    <p className="mt-2 text-sm font-mono text-gray-900">
                      {selectedRecord.userId || '無'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">時間</label>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {formatDate(selectedRecord.timestamp)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">是否鴿子號</label>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {selectedRecord.isPigeon ? '是' : '否'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">是否會員</label>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {selectedRecord.isMember ? '是' : '否'}
                    </p>
                  </div>
                  {selectedRecord.isMember && (
                    <>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">方案</label>
                        <p className="mt-2 text-sm font-semibold text-gray-900">{selectedRecord.plan}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">狀態</label>
                        <p className="mt-2 text-sm font-semibold text-gray-900">{selectedRecord.status}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">開始時間</label>
                        <p className="mt-2 text-sm font-semibold text-gray-900">{selectedRecord.startAt || '-'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">到期時間</label>
                        <p className="mt-2 text-sm font-semibold text-gray-900">{selectedRecord.expireAt || '-'}</p>
                      </div>
                    </>
                  )}
                  {selectedRecord.displayName && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">顯示名稱</label>
                      <p className="mt-2 text-sm font-semibold text-gray-900">{selectedRecord.displayName}</p>
                    </div>
                  )}
                  {selectedRecord.lineName && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">LINE 名稱</label>
                      <p className="mt-2 text-sm font-semibold text-gray-900">{selectedRecord.lineName}</p>
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
    </div>
  );
}
