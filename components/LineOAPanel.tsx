import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { MessageCircle, User, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface LineOARecord {
  rowNumber: number;
  timestamp: string;
  userId: string;
  displayName: string;
  profileUrl: string;
  messageType: string;
  messageText: string;
}

export default function LineOAPanel() {
  const { data: records = [], isLoading, error, refetch } = useQuery({
    queryKey: ['line-oa'],
    queryFn: async () => {
      const res = await axios.get<{ success: boolean; data: LineOARecord[] }>('/api/line-oa');
      if (!res.data?.success) throw new Error('載入失敗');
      return (res.data.data || []).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    },
    staleTime: 30 * 1000,
    refetchInterval: 30000,
  });

  return (
    <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-xl md:rounded-2xl overflow-hidden border border-gray-200/50 min-h-[60vh] md:min-h-[72vh] w-full">
      <div className="px-3 py-4 sm:px-6 sm:py-6 md:px-10 md:py-10">
        <div className="flex flex-col gap-3 mb-4 md:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageCircle className="w-7 h-7 text-green-600" />
              LINE OA 訊息
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              與官方帳號互動的 User ID、名稱、頭像與訊息（由 Webhook 寫入）
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-100 text-green-800 hover:bg-green-200 font-medium text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            重新整理
          </button>
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-green-500 border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
            無法載入 LINE OA 記錄，請確認已建立「LineOA」工作表並設定 Webhook。
          </div>
        )}

        {!isLoading && !error && records.length === 0 && (
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-8 text-center text-gray-500">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="font-medium">尚無訊息記錄</p>
            <p className="text-sm mt-1">
              請在 LINE Developers 將 Webhook URL 設為：<br />
              <code className="bg-gray-200 px-2 py-1 rounded text-xs mt-2 inline-block">
                https://您的網域/api/line-webhook
              </code>
            </p>
          </div>
        )}

        {!isLoading && !error && records.length > 0 && (
          <div className="overflow-x-auto rounded-lg md:rounded-xl border border-gray-200 -mx-1 px-1 sm:mx-0 sm:px-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-gray-700 uppercase">時間</th>
                  <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-gray-700 uppercase">頭像/名稱</th>
                  <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-gray-700 uppercase hidden sm:table-cell">User ID</th>
                  <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-gray-700 uppercase hidden md:table-cell">類型</th>
                  <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-gray-700 uppercase">訊息</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {records.map((r) => (
                  <tr key={`${r.timestamp}-${r.rowNumber}`} className="hover:bg-green-50/50">
                    <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-gray-600 whitespace-nowrap">
                      {r.timestamp ? format(new Date(r.timestamp), 'yyyy-MM-dd HH:mm:ss') : '-'}
                    </td>
                    <td className="px-2 py-2 md:px-4 md:py-3">
                      <div className="flex items-center gap-2 md:gap-3">
                        {r.profileUrl ? (
                          <img
                            src={r.profileUrl}
                            alt={r.displayName || 'LINE'}
                            className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover border-2 border-gray-200 flex-shrink-0"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                          </div>
                        )}
                        <span className="font-medium text-gray-900 text-xs md:text-sm truncate max-w-[80px] sm:max-w-none">{r.displayName || '-'}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm font-mono text-gray-600 break-all max-w-[100px] sm:max-w-[200px] hidden sm:table-cell">{r.userId || '-'}</td>
                    <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-gray-600 hidden md:table-cell">{r.messageType || 'text'}</td>
                    <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-gray-800 max-w-[120px] sm:max-w-md truncate" title={r.messageText}>
                      {r.messageText || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
