import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { Phone, Users, Clock, TrendingUp, AlertTriangle, Shield, CheckCircle } from 'lucide-react';
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
  const [recordLimit, setRecordLimit] = useState<number>(10);
  const [memberLimit, setMemberLimit] = useState<number>(10);

  // 獲取最新的電話記錄
  const { data: recentRecords, isLoading: loadingRecords } = useQuery({
    queryKey: ['recent-records', recordLimit],
    queryFn: async () => {
      const res = await axios.get(`/api/recent-data?type=records&limit=${recordLimit}`);
      return res.data.data as PhoneRecord[];
    },
    refetchInterval: 30000, // 每 30 秒自動刷新
  });

  // 獲取最新的會員記錄
  const { data: recentMembers, isLoading: loadingMembers } = useQuery({
    queryKey: ['recent-members', memberLimit],
    queryFn: async () => {
      const res = await axios.get(`/api/recent-data?type=members&limit=${memberLimit}`);
      return res.data.data as Member[];
    },
    refetchInterval: 30000, // 每 30 秒自動刷新
  });

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
                        {record.userId ? truncateUserId(record.userId) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {record.displayName || '-'}
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
                        {member.userId ? truncateUserId(member.userId) : '-'}
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
    </div>
  );
}
