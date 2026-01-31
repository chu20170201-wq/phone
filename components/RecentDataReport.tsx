import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { Phone, Users, Clock, TrendingUp, AlertTriangle, Shield, CheckCircle, Copy, Check, Trash2 } from 'lucide-react';
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

interface PhoneRecord {
  rowNumber: number;
  phoneNumber: string;
  userId: string;
  timestamp: string;
  riskLevel: string;
  displayName?: string;
}

interface Member {
  rowNumber: number;
  userId: string;
  lineName: string;
  plan: string;
  status: string;
  startAt: string;
  expireAt: string;
  displayName?: string;
}

export default function RecentDataReport() {
  const queryClient = useQueryClient();
  const [recordLimit, setRecordLimit] = useState<number>(10);
  const [memberLimit, setMemberLimit] = useState<number>(10);
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: 'trial7' | 'member30' | 'delete';
    record: PhoneRecord;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // 獲取最新的電話記錄
  const { data: recentRecords, isLoading: loadingRecords, refetch: refetchRecords } = useQuery({
    queryKey: ['recent-records', recordLimit],
    queryFn: async () => {
      const res = await axios.get(`/api/recent-data?type=records&limit=${recordLimit}`);
      return res.data.data as PhoneRecord[];
    },
    staleTime: 1 * 60 * 1000, // 1 分钟内数据视为新鲜（最新数据需要更频繁更新）
    refetchInterval: 30000, // 每 30 秒自動刷新（最新数据保持 30 秒刷新）
  });

  // 獲取最新的會員記錄
  const { data: recentMembers, isLoading: loadingMembers } = useQuery({
    queryKey: ['recent-members', memberLimit],
    queryFn: async () => {
      const res = await axios.get(`/api/recent-data?type=members&limit=${memberLimit}`);
      return res.data.data as Member[];
    },
    staleTime: 1 * 60 * 1000, // 1 分钟内数据视为新鲜
    refetchInterval: 30000, // 每 30 秒自動刷新（最新数据保持 30 秒刷新）
  });

  // 將指定 User ID 設為試用 7 天（全局會員）
  const handleSetTrial7Days = async (userId: string | undefined | null) => {
    if (!userId) {
      alert('此筆紀錄沒有 User ID，無法設定試用。');
      return;
    }

    try {
      const res = await axios.post('/api/members', {
        action: 'ensure-member',
        userId,
      });

      if (!res.data?.success) {
        alert('設定試用失敗：' + (res.data?.error || '未知錯誤'));
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ['members'] });
      await queryClient.invalidateQueries({ queryKey: ['recent-members'] });
      alert('已為此 User ID 設定 7 天試用（如已是會員則不重複建立）。');
    } catch (error) {
      console.error('設定試用失敗:', error);
      alert('設定試用失敗，請稍後重試');
    }
  };

  // 將指定 User ID 設為會員 30 天（全局會員）
  const handleSetMember30Days = async (userId: string | undefined | null) => {
    if (!userId) {
      alert('此筆紀錄沒有 User ID，無法設定會員天數。');
      return;
    }

    try {
      // 先查詢是否已有會員
      const memberRes = await axios.get('/api/members', {
        params: { userId },
      });
      let member = memberRes.data?.data as (Member & { rowNumber: number }) | null;

      // 如果沒有會員，先建立（預設 7 天試用）
      if (!member) {
        const ensureRes = await axios.post('/api/members', {
          action: 'ensure-member',
          userId,
        });
        if (!ensureRes.data?.success) {
          alert('建立會員失敗：' + (ensureRes.data?.error || '未知錯誤'));
          return;
        }
        member = ensureRes.data?.data?.member as Member & { rowNumber: number };
      }

      if (!member || !member.rowNumber) {
        alert('找不到對應的會員行號，無法加值 30 天。');
        return;
      }

      // 對該會員加值 30 天
      const addValueRes = await axios.post('/api/members', {
        action: 'add-value',
        rowNumber: member.rowNumber,
        option: '30days',
      });

      if (!addValueRes.data?.success) {
        alert('加值 30 天失敗：' + (addValueRes.data?.error || '未知錯誤'));
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ['members'] });
      await queryClient.invalidateQueries({ queryKey: ['recent-members'] });
      alert('已為此 User ID 加值 30 天（若原本有到期日，則在原到期日上延長）。');
    } catch (error) {
      console.error('設定 30 天會員失敗:', error);
      alert('設定 30 天會員失敗，請稍後重試');
    }
  };

  // 刪除單筆電話記錄（含關聯風險名單）
  const handleDeleteRecord = async (rowNumber: number) => {
    try {
      await axios.delete(`/api/phone-records?rowNumber=${rowNumber}`);
      await refetchRecords();
    } catch (error) {
      console.error('刪除電話記錄失敗:', error);
      alert('刪除失敗，請稍後重試');
    }
  };

  const getRiskLevelIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'medium':
        return <Shield className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
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
    const colorClass = colors[riskLevel as keyof typeof colors] || 'bg-gray-100 text-gray-800 border border-gray-200';
    const label = labels[riskLevel as keyof typeof labels] || riskLevel || '未知';

    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${colorClass}`}>
        {label}
      </span>
    );
  };

  const getPlanBadge = (plan: string) => {
    if (plan === 'pro') {
      return (
        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
          Pro
        </span>
      );
    }
    return (
      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
        試用
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return (
        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 border border-green-200">
          啟用
        </span>
      );
    }
    return (
      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-200">
        停用
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* 標題和說明 */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center space-x-3 mb-2">
          <TrendingUp className="w-8 h-8 text-white" />
          <h2 className="text-2xl font-bold text-white">最新數據報表</h2>
        </div>
        <p className="text-blue-100 text-sm">
          即時查看最新加入的電話記錄和新會員，方便快速了解系統最新動態
        </p>
      </div>

      {/* 最新的電話記錄 */}
      <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden border border-gray-200/50">
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Phone className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-bold text-gray-900">最新電話記錄</h3>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">顯示筆數：</span>
              <select
                value={recordLimit}
                onChange={(e) => setRecordLimit(Number(e.target.value))}
                className="px-3 py-1.5 border-2 border-blue-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10 筆</option>
                <option value={20}>20 筆</option>
                <option value={30}>30 筆</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loadingRecords ? (
            <div className="animate-pulse">
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ) : recentRecords && recentRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      時間
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      電話號碼
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      風險等級
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      User ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      名稱
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentRecords.map((record) => (
                    <tr key={record.rowNumber} className="hover:bg-blue-50/50 transition-colors duration-150">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{formatDate(record.timestamp)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 font-mono">
                        {record.phoneNumber || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          {getRiskLevelIcon(record.riskLevel)}
                          {getRiskLevelBadge(record.riskLevel)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">
                        {record.userId ? (
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs text-gray-500">
                              {record.userId}
                            </span>
                            <button
                              onClick={async () => {
                                const success = await copyToClipboard(record.userId);
                                if (success) {
                                  setCopiedUserId(record.userId);
                                  setTimeout(() => setCopiedUserId(null), 2000);
                                } else {
                                  alert('複製失敗，請手動複製');
                                }
                              }}
                              className="text-gray-400 hover:text-gray-700"
                              title={copiedUserId === record.userId ? '已複製' : '複製 User ID'}
                            >
                              {copiedUserId === record.userId ? (
                                <Check className="w-3 h-3 text-green-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {record.displayName || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setPendingAction({ type: 'trial7', record })}
                            className="inline-flex items-center px-2 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-150"
                            title="設為試用 7 天（全局會員）"
                          >
                            試用7天
                          </button>
                          <button
                            onClick={() => setPendingAction({ type: 'member30', record })}
                            className="inline-flex items-center px-2 py-1 text-xs font-semibold text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors duration-150"
                            title="加值 30 天（全局會員）"
                          >
                            會員30天
                          </button>
                          <button
                            onClick={() => setPendingAction({ type: 'delete', record })}
                            className="inline-flex items-center px-2 py-1 text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-150"
                            title="刪除此筆記錄及關聯風險資料"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            刪除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Phone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">目前沒有電話記錄</p>
            </div>
          )}
        </div>
      </div>

      {/* 最新的會員記錄 */}
      <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden border border-gray-200/50">
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6 text-purple-600" />
              <h3 className="text-xl font-bold text-gray-900">最新會員記錄</h3>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">顯示筆數：</span>
              <select
                value={memberLimit}
                onChange={(e) => setMemberLimit(Number(e.target.value))}
                className="px-3 py-1.5 border-2 border-purple-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value={10}>10 筆</option>
                <option value={20}>20 筆</option>
                <option value={30}>30 筆</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loadingMembers ? (
            <div className="animate-pulse">
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ) : recentMembers && recentMembers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      加入時間
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      LINE 名稱
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      User ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      方案
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      狀態
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      到期時間
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentMembers.map((member) => (
                    <tr key={member.rowNumber} className="hover:bg-purple-50/50 transition-colors duration-150">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{formatDate(member.startAt)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {member.displayName || member.lineName || '未設定'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">
                        {member.userId ? (
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs text-gray-500">
                              {member.userId}
                            </span>
                            <button
                              onClick={async () => {
                                const success = await copyToClipboard(member.userId);
                                if (success) {
                                  setCopiedUserId(member.userId);
                                  setTimeout(() => setCopiedUserId(null), 2000);
                                } else {
                                  alert('複製失敗，請手動複製');
                                }
                              }}
                              className="text-gray-400 hover:text-gray-700"
                              title={copiedUserId === member.userId ? '已複製' : '複製 User ID'}
                            >
                              {copiedUserId === member.userId ? (
                                <Check className="w-3 h-3 text-green-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {getPlanBadge(member.plan)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {getStatusBadge(member.status)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(member.expireAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">目前沒有會員記錄</p>
            </div>
          )}
        </div>
      </div>
      {/* 操作確認模態框 */}
      {pendingAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm h-full w-full z-50 animate-fade-in flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 animate-slide-up">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {pendingAction.type === 'trial7'
                  ? '確認設定試用 7 天'
                  : pendingAction.type === 'member30'
                  ? '確認加值會員 30 天'
                  : '確認刪除電話記錄'}
              </h3>
              <button
                onClick={() => !actionLoading && setPendingAction(null)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-4 space-y-3 text-sm text-gray-700">
              <p>
                User ID：{' '}
                <span className="font-mono font-semibold">
                  {pendingAction.record.userId || '無'}
                </span>
              </p>
              <p>
                電話號碼：{' '}
                <span className="font-mono font-semibold">
                  {pendingAction.record.phoneNumber || '-'}
                </span>
              </p>
              {pendingAction.type === 'trial7' && (
                <p>此操作會在會員管理中為該 User ID 建立或更新為「試用 7 天」，並全局生效。</p>
              )}
              {pendingAction.type === 'member30' && (
                <p>
                  此操作會在會員管理中為該 User ID 加值「30 天」，沒有會員時會先建立，再加值。
                </p>
              )}
              {pendingAction.type === 'delete' && (
                <p>
                  此操作會清空這筆電話記錄，並刪除風險名單中同電話或同 User ID 的相關紀錄，且無法復原。
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => !actionLoading && setPendingAction(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                disabled={actionLoading}
              >
                取消
              </button>
              <button
                onClick={async () => {
                  if (!pendingAction) return;
                  setActionLoading(true);
                  try {
                    if (pendingAction.type === 'trial7') {
                      await handleSetTrial7Days(pendingAction.record.userId);
                    } else if (pendingAction.type === 'member30') {
                      await handleSetMember30Days(pendingAction.record.userId);
                    } else if (pendingAction.type === 'delete') {
                      await handleDeleteRecord(pendingAction.record.rowNumber);
                    }
                  } finally {
                    setActionLoading(false);
                    setPendingAction(null);
                  }
                }}
                className="px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-md transition-colors disabled:opacity-50 bg-blue-600 hover:bg-blue-700"
                disabled={actionLoading}
              >
                {actionLoading ? '處理中…' : '確認'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
