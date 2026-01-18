import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { format, parse, differenceInDays, isValid } from 'date-fns';
import { CheckCircle, XCircle, ExternalLink, Edit2, Save, X, User, Plus, Clock, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Member {
  rowNumber: number;
  userId: string;
  lineName: string;
  contactPhone: string;
  plan: string;
  status: string;
  startAt: string;
  expireAt: string;
  paymentMethod: string;
  paymentTime: string;
  profileUrl?: string;
  displayName?: string;
  state?: string;
}

// 格式化到期時間並計算剩餘天數
function formatExpireDate(expireAt: string | undefined | null): { formatted: string; daysLeft: number | null; isExpired: boolean } {
  if (!expireAt || expireAt.trim() === '' || expireAt === '-') {
    return { formatted: '-', daysLeft: null, isExpired: false };
  }

  try {
    // 嘗試多種日期格式
    let date: Date | null = null;
    
    // 格式: 2027/2/28
    if (expireAt.includes('/')) {
      date = parse(expireAt, 'yyyy/M/d', new Date());
    }
    // 格式: 2027-02-28
    else if (expireAt.includes('-')) {
      date = parse(expireAt, 'yyyy-MM-dd', new Date());
    }
    // ISO 格式
    else {
      date = new Date(expireAt);
    }

    if (!isValid(date)) {
      return { formatted: expireAt, daysLeft: null, isExpired: false };
    }

    const now = new Date();
    const daysLeft = differenceInDays(date, now);
    const isExpired = daysLeft < 0;
    
    return {
      formatted: format(date, 'yyyy-MM-dd'),
      daysLeft: Math.abs(daysLeft),
      isExpired,
    };
  } catch (error) {
    return { formatted: expireAt, daysLeft: null, isExpired: false };
  }
}

export default function MembersTable() {
  const queryClient = useQueryClient();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editForm, setEditForm] = useState<{ plan: string; status: string; lineName: string }>({ 
    plan: '', 
    status: '', 
    lineName: '' 
  });
  const [showAddValueModal, setShowAddValueModal] = useState<Member | null>(null);
  const [selectedValueOption, setSelectedValueOption] = useState<string>('');
  const [deletingMember, setDeletingMember] = useState<Member | null>(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const res = await axios.get('/api/members');
      return res.data.data as Member[];
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

  const members = data || [];
  
  // 解析日期字符串為 Date 對象
  const parseExpireDate = (dateString: string | undefined | null): Date | null => {
    if (!dateString || dateString.trim() === '') {
      return null;
    }
    try {
      // 處理 YYYY/MM/DD 格式
      if (dateString.includes('/')) {
        const [year, month, day] = dateString.split('/').map(Number);
        return new Date(year, month - 1, day);
      }
      // 處理 ISO 格式或其他格式
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return null;
      }
      return date;
    } catch {
      return null;
    }
  };

  // 按方案、狀態和到期時間排序：pro > nopro，active > inactive，未到期 > 已到期
  const sortedMembers = [...members].sort((a, b) => {
    // 首先按方案排序：pro 優先於 nopro
    const planOrder: { [key: string]: number } = { pro: 1, nopro: 2 };
    const planA = planOrder[a.plan] || 999;
    const planB = planOrder[b.plan] || 999;
    
    if (planA !== planB) {
      return planA - planB;
    }
    
    // 然後按狀態排序：active 優先於 inactive
    const statusOrder: { [key: string]: number } = { active: 1, inactive: 2 };
    const statusA = statusOrder[a.status] || 999;
    const statusB = statusOrder[b.status] || 999;
    
    if (statusA !== statusB) {
      return statusA - statusB;
    }
    
    // 按到期時間排序：未到期排在前面，未到期中按到期時間升序（越早到期的越前）
    const expireDateA = parseExpireDate(a.expireAt);
    const expireDateB = parseExpireDate(b.expireAt);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // 設置為當天的 00:00:00
    
    // 如果兩個日期都無法解析，保持原順序
    if (!expireDateA && !expireDateB) {
      return a.rowNumber - b.rowNumber;
    }
    
    // 如果一個無法解析，無法解析的排在後面
    if (!expireDateA) return 1;
    if (!expireDateB) return -1;
    
    const expireDateANormalized = new Date(expireDateA);
    expireDateANormalized.setHours(0, 0, 0, 0);
    const expireDateBNormalized = new Date(expireDateB);
    expireDateBNormalized.setHours(0, 0, 0, 0);
    
    const isExpiredA = expireDateANormalized < now;
    const isExpiredB = expireDateBNormalized < now;
    
    // 未到期的排在已過期的前面
    if (isExpiredA !== isExpiredB) {
      return isExpiredA ? 1 : -1; // 已過期排在後面
    }
    
    // 如果都是未到期，按到期時間升序（越早到期的越前）
    // 如果都是已過期，按到期時間降序（越晚過期的越前）
    if (!isExpiredA && !isExpiredB) {
      // 都是未到期，按到期時間升序
      return expireDateANormalized.getTime() - expireDateBNormalized.getTime();
    } else {
      // 都是已過期，按到期時間降序
      return expireDateBNormalized.getTime() - expireDateANormalized.getTime();
    }
  });
  
  const totalPages = Math.ceil(sortedMembers.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const paginatedMembers = sortedMembers.slice(startIndex, startIndex + itemsPerPage);

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800 border border-green-200',
      inactive: 'bg-gray-100 text-gray-800 border border-gray-200',
      expired: 'bg-red-100 text-red-800 border border-red-200',
    };
    const labels = {
      active: '啟用',
      inactive: '停用',
      expired: '已過期',
    };
    return (
      <span
        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full shadow-sm ${
          colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border border-gray-200'
        }`}
      >
        {labels[status as keyof typeof labels] || status || '未知'}
      </span>
    );
  };

  const getPlanBadge = (plan: string, expireAt?: string, isEditable: boolean = false) => {
    // 如果提供了到期時間，檢查是否在有效期內
    let displayPlan = plan;
    if (expireAt && expireAt.trim() !== '') {
      const expireInfo = formatExpireDate(expireAt);
      // 如果未過期，顯示為 Pro
      if (!expireInfo.isExpired) {
        displayPlan = 'pro';
      }
    }

    const colors = {
      pro: 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 border border-purple-200',
      nopro: 'bg-gray-100 text-gray-800 border border-gray-200',
    };
    const labels = {
      pro: 'Pro',
      nopro: '試用',
    };
    return (
      <span
        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full shadow-sm ${
          colors[displayPlan as keyof typeof colors] || 'bg-gray-100 text-gray-800 border border-gray-200'
        }`}
      >
        {labels[displayPlan as keyof typeof labels] || displayPlan || '未知'}
      </span>
    );
  };

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setEditForm({ 
      plan: member.plan || '', 
      status: member.status || '',
      lineName: member.lineName || member.displayName || ''
    });
  };

  const handleSave = async () => {
    if (!editingMember) return;

    try {
      await axios.put('/api/members', {
        rowNumber: editingMember.rowNumber,
        plan: editForm.plan,
        status: editForm.status,
        lineName: editForm.lineName.trim() || undefined, // 如果為空則不更新
      });
      
      // 刷新數據
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setEditingMember(null);
      setEditForm({ plan: '', status: '', lineName: '' });
    } catch (error) {
      console.error('更新失敗:', error);
      alert('更新失敗，請稍後重試');
    }
  };

  const handleCancelEdit = () => {
    setEditingMember(null);
    setEditForm({ plan: '', status: '', lineName: '' });
  };

  const handleAddValue = async () => {
    if (!showAddValueModal || !selectedValueOption) return;

    try {
      await axios.post('/api/members', {
        action: 'add-value',
        rowNumber: showAddValueModal.rowNumber,
        option: selectedValueOption,
      });
      
      // 刷新數據
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setShowAddValueModal(null);
      setSelectedValueOption('');
    } catch (error) {
      console.error('加值失敗:', error);
      alert('加值失敗，請稍後重試');
    }
  };

  const valueTimeOptions = [
    { value: '30days', label: '30 天（一個月）' },
    { value: '90days', label: '90 天（三個月）' },
    { value: 'halfyear', label: '半年' },
    { value: 'oneyear', label: '一年' },
    { value: 'trial7days', label: '試用期 7 天' },
  ];

  const handleDelete = async () => {
    if (!deletingMember) return;

    try {
      await axios.delete(`/api/members?rowNumber=${deletingMember.rowNumber}`);
      
      // 刷新數據
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setDeletingMember(null);
    } catch (error) {
      console.error('刪除失敗:', error);
      alert('刪除失敗，請稍後重試');
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden border border-gray-200/50">
      <div className="px-6 py-6 sm:p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              會員管理
            </h2>
            <p className="text-sm text-gray-500 mt-1">共 {members.length.toLocaleString()} 位會員</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  行號
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  LINE 資訊
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  LINE 名稱
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  方案
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  狀態
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  到期時間
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedMembers.map((member) => {
                const expireInfo = formatExpireDate(member.expireAt);
                const isEditing = editingMember?.rowNumber === member.rowNumber;
                
                return (
                  <tr key={member.rowNumber} className="hover:bg-blue-50/50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {member.rowNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center border-2 border-gray-200 flex-shrink-0">
                            <User className="w-6 h-6 text-white" />
                          </div>
                          <input
                            type="text"
                            value={editForm.lineName}
                            onChange={(e) => setEditForm({ ...editForm, lineName: e.target.value })}
                            placeholder="LINE 名稱"
                            className="px-3 py-1.5 border-2 border-blue-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center space-x-3">
                          {/* LINE 頭像 */}
                          {member.profileUrl ? (
                            <img
                              src={member.profileUrl}
                              alt={member.displayName || member.lineName || 'LINE 用戶'}
                              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center border-2 border-gray-200">
                              <User className="w-6 h-6 text-white" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {member.displayName || member.lineName || '未設定'}
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="font-mono text-xs text-gray-500 truncate max-w-[120px]">
                                {member.userId || '無'}
                              </span>
                              {member.userId && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const recordsUrl = `/api/phone-records?userId=${member.userId}`;
                                    window.open(recordsUrl, '_blank');
                                  }}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="查看查詢記錄"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.displayName || member.lineName || '-'}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                      {isEditing ? (
                        <select
                          value={editForm.plan}
                          onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                          className="px-3 py-1 border-2 border-blue-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="pro">Pro</option>
                          <option value="nopro">試用</option>
                        </select>
                      ) : (
                        getPlanBadge(member.plan, member.expireAt)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {isEditing ? (
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                          className="px-3 py-1 border-2 border-blue-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="active">啟用</option>
                          <option value="inactive">停用</option>
                          <option value="expired">已過期</option>
                        </select>
                      ) : (
                        getStatusBadge(member.status)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-col">
                        <span className={expireInfo.isExpired ? 'text-red-600 font-semibold' : ''}>
                          {expireInfo.formatted}
                        </span>
                        {expireInfo.daysLeft !== null && (
                          <span className={`text-xs mt-1 ${
                            expireInfo.isExpired 
                              ? 'text-red-500' 
                              : expireInfo.daysLeft <= 30 
                                ? 'text-orange-500' 
                                : 'text-gray-500'
                          }`}>
                            {expireInfo.isExpired 
                              ? `已過期 ${expireInfo.daysLeft} 天` 
                              : `剩餘 ${expireInfo.daysLeft} 天`}
                          </span>
                        )}
                      </div>
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
                              onClick={() => handleEdit(member)}
                              className="px-3 py-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200 flex items-center space-x-1"
                              title="編輯"
                            >
                              <Edit2 className="w-4 h-4" />
                              <span className="text-xs">編輯</span>
                            </button>
                            <button
                              onClick={() => setShowAddValueModal(member)}
                              className="px-3 py-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-all duration-200 flex items-center space-x-1"
                              title="加值時間"
                            >
                              <Plus className="w-4 h-4" />
                              <span className="text-xs">加值</span>
                            </button>
                            <button
                              onClick={() => setSelectedMember(member)}
                              className="px-3 py-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-all duration-200 flex items-center space-x-1"
                              title="查看詳情"
                            >
                              <span className="text-xs">詳情</span>
                            </button>
                            <button
                              onClick={() => setDeletingMember(member)}
                              className="px-3 py-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200 flex items-center space-x-1"
                              title="刪除會員"
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
              顯示第 {startIndex + 1} 到 {Math.min(startIndex + itemsPerPage, members.length)} 筆，共 {members.length.toLocaleString()} 筆
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
      {selectedMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 animate-fade-in">
          <div className="relative top-10 mx-auto p-6 border-2 border-gray-200 w-11/12 md:w-3/4 lg:w-1/2 shadow-2xl rounded-2xl bg-white animate-slide-up">
            <div className="mt-2">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900">會員詳情</h3>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all duration-200"
                >
                  <span className="text-2xl">✕</span>
                </button>
              </div>
              
              {/* LINE 頭像和名稱 */}
              <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-gray-200">
                {selectedMember.profileUrl ? (
                  <img
                    src={selectedMember.profileUrl}
                    alt={selectedMember.displayName || selectedMember.lineName || 'LINE 用戶'}
                    className="w-20 h-20 rounded-full object-cover border-4 border-gray-200 shadow-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center border-4 border-gray-200 shadow-lg">
                    <User className="w-10 h-10 text-white" />
                  </div>
                )}
                <div>
                  <h4 className="text-xl font-bold text-gray-900">
                    {selectedMember.displayName || selectedMember.lineName || '未設定'}
                  </h4>
                  <p className="text-sm text-gray-500 font-mono mt-1">
                    {selectedMember.userId || '無'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">行號</label>
                    <p className="mt-2 text-sm font-semibold text-gray-900">{selectedMember.rowNumber}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">LINE 名稱</label>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {selectedMember.displayName || selectedMember.lineName || '-'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">LINE 名稱</label>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {selectedMember.displayName || selectedMember.lineName || '-'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">方案</label>
                    <p className="mt-2">{getPlanBadge(selectedMember.plan, selectedMember.expireAt)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">狀態</label>
                    <p className="mt-2">{getStatusBadge(selectedMember.status)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">開始時間</label>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {selectedMember.startAt || '-'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">到期時間</label>
                    <div className="mt-2">
                      {(() => {
                        const expireInfo = formatExpireDate(selectedMember.expireAt);
                        return (
                          <>
                            <p className={`text-sm font-semibold ${expireInfo.isExpired ? 'text-red-600' : ''}`}>
                              {expireInfo.formatted}
                            </p>
                            {expireInfo.daysLeft !== null && (
                              <p className={`text-xs mt-1 ${
                                expireInfo.isExpired 
                                  ? 'text-red-500' 
                                  : expireInfo.daysLeft <= 30 
                                    ? 'text-orange-500' 
                                    : 'text-gray-500'
                              }`}>
                                {expireInfo.isExpired 
                                  ? `已過期 ${expireInfo.daysLeft} 天` 
                                  : `剩餘 ${expireInfo.daysLeft} 天`}
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  {selectedMember.paymentMethod && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">繳費方式</label>
                      <p className="mt-2 text-sm font-semibold text-gray-900">
                        {selectedMember.paymentMethod}
                      </p>
                    </div>
                  )}
                  {selectedMember.paymentTime && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">繳費時間</label>
                      <p className="mt-2 text-sm font-semibold text-gray-900">
                        {selectedMember.paymentTime}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-8 flex justify-end border-t border-gray-200 pt-6">
                <button
                  onClick={() => setSelectedMember(null)}
                  className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 font-semibold shadow-lg transition-all duration-200"
                >
                  關閉
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 加值時間模態框 */}
      {showAddValueModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 animate-fade-in">
          <div className="relative top-10 mx-auto p-6 border-2 border-gray-200 w-11/12 md:w-2/3 lg:w-1/2 shadow-2xl rounded-2xl bg-white animate-slide-up">
            <div className="mt-2">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">加值時間</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {showAddValueModal.displayName || showAddValueModal.lineName || '會員'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAddValueModal(null);
                    setSelectedValueOption('');
                  }}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all duration-200"
                >
                  <span className="text-2xl">✕</span>
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-blue-800 font-medium">
                    💡 提示：如果會員已有到期時間，加值會從到期時間開始延長；如果沒有或已過期，則從今天開始計算。
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    選擇加值時間：
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {valueTimeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSelectedValueOption(option.value)}
                        className={`px-4 py-3 rounded-lg border-2 transition-all duration-200 text-left ${
                          selectedValueOption === option.value
                            ? 'border-purple-500 bg-purple-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900">{option.label}</span>
                          {selectedValueOption === option.value && (
                            <CheckCircle className="w-5 h-5 text-purple-500" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {showAddValueModal.expireAt && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">當前到期時間</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatExpireDate(showAddValueModal.expireAt).formatted}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-end space-x-3 border-t border-gray-200 pt-6">
                <button
                  onClick={() => {
                    setShowAddValueModal(null);
                    setSelectedValueOption('');
                  }}
                  className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold transition-all duration-200"
                >
                  取消
                </button>
                <button
                  onClick={handleAddValue}
                  disabled={!selectedValueOption}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 font-semibold shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>確認加值</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 刪除確認模態框 */}
      {deletingMember && (
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
                    <p className="text-sm text-gray-500 mt-1">
                      {deletingMember.displayName || deletingMember.lineName || '會員'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDeletingMember(null)}
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
                    您即將刪除以下會員：
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">User ID:</span>
                      <span className="text-sm font-mono font-semibold text-gray-900">
                        {deletingMember.userId || '無'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">名稱:</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {deletingMember.displayName || deletingMember.lineName || '未設定'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">方案:</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {getPlanBadge(deletingMember.plan, deletingMember.expireAt)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">狀態:</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {getStatusBadge(deletingMember.status)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <p className="text-xs text-yellow-800">
                    💡 提示：刪除會員後，該會員的所有相關資料將從 Members 工作表中移除。
                  </p>
                </div>
              </div>

              <div className="mt-8 flex justify-end space-x-3 border-t border-gray-200 pt-6">
                <button
                  onClick={() => setDeletingMember(null)}
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
