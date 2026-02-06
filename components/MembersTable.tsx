import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { format, parse, differenceInDays, isValid } from 'date-fns';
import { CheckCircle, XCircle, ExternalLink, Edit2, Save, X, User, Plus, Clock, Trash2, Filter, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import React, { useState } from 'react';

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

interface MembersTableProps {
  selectedUserId?: string | null;
  onUserIdProcessed?: () => void;
}

export default function MembersTable({ selectedUserId, onUserIdProcessed }: MembersTableProps = {}) {
  const queryClient = useQueryClient();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editForm, setEditForm] = useState<{
    plan: string;
    status: string;
    lineName: string;
    startAt: string;
    expireAt: string;
  }>({
    plan: '',
    status: '',
    lineName: '',
    startAt: '',
    expireAt: '',
  });
  const [showAddValueModal, setShowAddValueModal] = useState<Member | null>(null);
  const [selectedValueOption, setSelectedValueOption] = useState<string>('');
  const [deletingMember, setDeletingMember] = useState<Member | null>(null);
  // 全選 / 批次加值
  const [selectedRowNumbers, setSelectedRowNumbers] = useState<Set<number>>(new Set());
  const [showBulkAddValueModal, setShowBulkAddValueModal] = useState(false);
  const [bulkAddValueOption, setBulkAddValueOption] = useState<string>('');
  const [bulkAddValueLoading, setBulkAddValueLoading] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;
  const [searchUserId, setSearchUserId] = useState<string>('');
  const [detailForm, setDetailForm] = useState<{
    lineName: string;
    status: string;
    pendingDuration: 'none' | 'trial7days' | '30days';
    startAt: string;
    expireAt: string;
  }>({
    lineName: '',
    status: 'active',
    pendingDuration: 'none',
    startAt: '',
    expireAt: '',
  });
  const [detailSaving, setDetailSaving] = useState(false);
  
  // 筛选状态
  const [expireFilter, setExpireFilter] = useState<string>('all'); // 'all', 'expired', 'active'
  const [planFilter, setPlanFilter] = useState<string>('all'); // 'all', 'pro', 'nopro'
  const [statusFilter, setStatusFilter] = useState<string>('all'); // 'all', 'active', 'inactive'
  
  // 排序状态
  const [sortBy, setSortBy] = useState<string>('default'); // 'default', 'expireDate', 'startDate', 'plan', 'status'
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const res = await axios.get('/api/members');
      return res.data.data as Member[];
    },
    staleTime: 2 * 60 * 1000, // 2 分钟内数据视为新鲜
    refetchInterval: 60000, // 每 60 秒自动刷新
  });

  // 當 selectedUserId 改變時，自動選中對應的會員
  React.useEffect(() => {
    if (selectedUserId) {
      if (data) {
        const member = data.find(m => m.userId === selectedUserId);
        if (member) {
          setSelectedMember(member);
          // 觸發回調，表示已處理
          if (onUserIdProcessed) {
            onUserIdProcessed();
          }
        } else {
          // 如果找不到會員，可能是剛創建的，需要刷新數據
          refetch().then(() => {
            // 刷新後再次查找
            setTimeout(() => {
              const refreshedData = queryClient.getQueryData<Member[]>(['members']);
              if (refreshedData) {
                const member = refreshedData.find(m => m.userId === selectedUserId);
                if (member) {
                  setSelectedMember(member);
                  if (onUserIdProcessed) {
                    onUserIdProcessed();
                  }
                }
              }
            }, 500);
          });
        }
      } else {
        // 如果數據還沒加載，先刷新
        refetch();
      }
    }
  }, [selectedUserId, data, onUserIdProcessed, refetch, queryClient]);

  // 將 yyyy/M/d 或 yyyy-MM-dd 轉成 input type="date" 用的 yyyy-MM-dd
  const toDateInputValue = (s: string | undefined | null): string => {
    if (!s || !s.trim()) return '';
    const t = s.trim();
    if (t.includes('-')) return t.split('T')[0];
    if (t.includes('/')) {
      const parts = t.split('/');
      const y = parts[0] ?? '';
      const m = (parts[1] ?? '').padStart(2, '0');
      const d = (parts[2] ?? '').padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return '';
  };

  // 當開啟會員詳情時，初始化詳情表單
  React.useEffect(() => {
    if (selectedMember) {
      setDetailForm({
        lineName: selectedMember.displayName || selectedMember.lineName || '',
        status: selectedMember.status || 'active',
        pendingDuration: 'none',
        startAt: toDateInputValue(selectedMember.startAt),
        expireAt: toDateInputValue(selectedMember.expireAt),
      });
    }
  }, [selectedMember]);

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

  // 解析開始日期
  const parseStartDate = (dateString: string | undefined | null): Date | null => {
    if (!dateString || dateString.trim() === '') {
      return null;
    }
    try {
      if (dateString.includes('/')) {
        const [year, month, day] = dateString.split('/').map(Number);
        return new Date(year, month - 1, day);
      }
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return null;
      }
      return date;
    } catch {
      return null;
    }
  };

  // 檢查是否過期
  const isExpired = (expireAt: string | undefined | null): boolean => {
    const expireDate = parseExpireDate(expireAt);
    if (!expireDate) return false;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const expireDateNormalized = new Date(expireDate);
    expireDateNormalized.setHours(0, 0, 0, 0);
    return expireDateNormalized < now;
  };

  // 應用篩選
  const filteredMembers = members.filter(member => {
    // User ID 搜尋
    if (searchUserId.trim()) {
      const keyword = searchUserId.trim().toLowerCase();
      const uid = (member.userId || '').toLowerCase();
      if (!uid.includes(keyword)) {
        return false;
      }
    }

    // 過期狀態篩選
    if (expireFilter === 'expired' && !isExpired(member.expireAt)) {
      return false;
    }
    if (expireFilter === 'active' && isExpired(member.expireAt)) {
      return false;
    }
    
    // 方案篩選
    if (planFilter !== 'all') {
      const expireInfo = formatExpireDate(member.expireAt);
      const isCurrentlyPro = !expireInfo.isExpired;
      if (planFilter === 'pro' && !isCurrentlyPro) {
        return false;
      }
      if (planFilter === 'nopro' && isCurrentlyPro) {
        return false;
      }
    }
    
    // 狀態篩選
    if (statusFilter !== 'all' && member.status !== statusFilter) {
      return false;
    }
    
    return true;
  });

  // 應用排序
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    if (sortBy === 'default') {
      // 默認排序：pro > nopro，active > inactive，未到期 > 已到期
      const planOrder: { [key: string]: number } = { pro: 1, nopro: 2 };
      const planA = planOrder[a.plan] || 999;
      const planB = planOrder[b.plan] || 999;
      
      if (planA !== planB) {
        return planA - planB;
      }
      
      const statusOrder: { [key: string]: number } = { active: 1, inactive: 2 };
      const statusA = statusOrder[a.status] || 999;
      const statusB = statusOrder[b.status] || 999;
      
      if (statusA !== statusB) {
        return statusA - statusB;
      }
      
      const expireDateA = parseExpireDate(a.expireAt);
      const expireDateB = parseExpireDate(b.expireAt);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      if (!expireDateA && !expireDateB) {
        return a.rowNumber - b.rowNumber;
      }
      if (!expireDateA) return 1;
      if (!expireDateB) return -1;
      
      const expireDateANormalized = new Date(expireDateA);
      expireDateANormalized.setHours(0, 0, 0, 0);
      const expireDateBNormalized = new Date(expireDateB);
      expireDateBNormalized.setHours(0, 0, 0, 0);
      
      const isExpiredA = expireDateANormalized < now;
      const isExpiredB = expireDateBNormalized < now;
      
      if (isExpiredA !== isExpiredB) {
        return isExpiredA ? 1 : -1;
      }
      
      if (!isExpiredA && !isExpiredB) {
        return expireDateANormalized.getTime() - expireDateBNormalized.getTime();
      } else {
        return expireDateBNormalized.getTime() - expireDateANormalized.getTime();
      }
    } else if (sortBy === 'expireDate') {
      const expireDateA = parseExpireDate(a.expireAt);
      const expireDateB = parseExpireDate(b.expireAt);
      
      if (!expireDateA && !expireDateB) return 0;
      if (!expireDateA) return 1;
      if (!expireDateB) return -1;
      
      const diff = expireDateA.getTime() - expireDateB.getTime();
      return sortOrder === 'asc' ? diff : -diff;
    } else if (sortBy === 'startDate') {
      const startDateA = parseStartDate(a.startAt);
      const startDateB = parseStartDate(b.startAt);
      
      if (!startDateA && !startDateB) return 0;
      if (!startDateA) return 1;
      if (!startDateB) return -1;
      
      const diff = startDateA.getTime() - startDateB.getTime();
      return sortOrder === 'asc' ? diff : -diff;
    } else if (sortBy === 'plan') {
      const planOrder: { [key: string]: number } = { pro: 1, nopro: 2 };
      const planA = planOrder[a.plan] || 999;
      const planB = planOrder[b.plan] || 999;
      const diff = planA - planB;
      return sortOrder === 'asc' ? diff : -diff;
    } else if (sortBy === 'status') {
      const statusOrder: { [key: string]: number } = { active: 1, inactive: 2 };
      const statusA = statusOrder[a.status] || 999;
      const statusB = statusOrder[b.status] || 999;
      const diff = statusA - statusB;
      return sortOrder === 'asc' ? diff : -diff;
    }
    
    // 默认返回行号排序
    return a.rowNumber - b.rowNumber;
  });
  
  const totalPages = Math.ceil(sortedMembers.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const paginatedMembers = sortedMembers.slice(startIndex, startIndex + itemsPerPage);

  const getStatusBadge = (status: string, expireAt?: string) => {
    // 如果提供了到期時間且已過期，強制顯示為「已過期」
    let displayStatus = status;
    if (expireAt && expireAt.trim() !== '') {
      const expireInfo = formatExpireDate(expireAt);
      if (expireInfo.isExpired) {
        displayStatus = 'expired';
      }
    }
    
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
          colors[displayStatus as keyof typeof colors] || 'bg-gray-100 text-gray-800 border border-gray-200'
        }`}
      >
        {labels[displayStatus as keyof typeof labels] || displayStatus || '未知'}
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
      lineName: member.lineName || member.displayName || '',
      startAt: toDateInputValue(member.startAt),
      expireAt: toDateInputValue(member.expireAt),
    });
  };

  const handleSave = async () => {
    if (!editingMember) return;

    try {
      await axios.put('/api/members', {
        rowNumber: editingMember.rowNumber,
        plan: editForm.plan,
        status: editForm.status,
        lineName: editForm.lineName.trim() || undefined,
        startAt: editForm.startAt.trim() || undefined,
        expireAt: editForm.expireAt.trim() || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['members'] });
      setEditingMember(null);
      setEditForm({ plan: '', status: '', lineName: '', startAt: '', expireAt: '' });
    } catch (error) {
      console.error('更新失敗:', error);
      alert('更新失敗，請稍後重試');
    }
  };

  const handleCancelEdit = () => {
    setEditingMember(null);
    setEditForm({ plan: '', status: '', lineName: '', startAt: '', expireAt: '' });
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
    { value: '30days', label: '30 天（一個月） / 500 元' },
    { value: '90days', label: '90 天（三個月） / 1,350 元' },
    { value: 'halfyear', label: '半年 / 2,400 元' },
    { value: 'oneyear', label: '一年 / 4,200 元' },
    { value: 'trial7days', label: '試用期 7 天 / 免費' },
  ];

  const toggleSelectMember = (rowNumber: number) => {
    setSelectedRowNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) next.delete(rowNumber);
      else next.add(rowNumber);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    const onPage = paginatedMembers.map((m) => m.rowNumber);
    const allSelected = onPage.every((rn) => selectedRowNumbers.has(rn));
    setSelectedRowNumbers((prev) => {
      const next = new Set(prev);
      if (allSelected) onPage.forEach((rn) => next.delete(rn));
      else onPage.forEach((rn) => next.add(rn));
      return next;
    });
  };

  const handleBulkAddValue = async () => {
    if (selectedRowNumbers.size === 0 || !bulkAddValueOption) return;
    const rowNumbers = Array.from(selectedRowNumbers);
    setBulkAddValueLoading(true);
    try {
      for (const rowNumber of rowNumbers) {
        await axios.post('/api/members', {
          action: 'add-value',
          rowNumber,
          option: bulkAddValueOption,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setSelectedRowNumbers(new Set());
      setShowBulkAddValueModal(false);
      setBulkAddValueOption('');
      alert(`已為 ${rowNumbers.length} 位會員加值完成。`);
    } catch (error) {
      console.error('批次加值失敗:', error);
      alert('批次加值失敗，請稍後重試');
    } finally {
      setBulkAddValueLoading(false);
    }
  };

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

  // 在會員詳情中儲存修改（LINE 名稱、狀態、加值時間）
  const handleDetailSave = async () => {
    if (!selectedMember || detailSaving) return;

    try {
      setDetailSaving(true);

      // 先處理加值時間（如果有選）
      if (detailForm.pendingDuration !== 'none') {
        await axios.post('/api/members', {
          action: 'add-value',
          rowNumber: selectedMember.rowNumber,
          option: detailForm.pendingDuration,
        });
      }

      // 更新狀態、LINE 名稱、開始/到期時間（保留 plan 公式邏輯由後端處理）
      await axios.put('/api/members', {
        rowNumber: selectedMember.rowNumber,
        plan: selectedMember.plan,
        status: detailForm.status,
        lineName: detailForm.lineName.trim() || undefined,
        startAt: detailForm.startAt.trim() || undefined,
        expireAt: detailForm.expireAt.trim() || undefined,
      });

      // 刷新列表
      await queryClient.invalidateQueries({ queryKey: ['members'] });

      // 關閉詳情
      setSelectedMember(null);
    } catch (error) {
      console.error('儲存會員詳情失敗:', error);
      alert('儲存失敗，請稍後重試');
    } finally {
      setDetailSaving(false);
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden border border-gray-200/50">
      <div className="px-6 py-6 sm:p-8">
        <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              會員管理
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              共 {members.length.toLocaleString()} 位會員
              {filteredMembers.length !== members.length && (
                <span className="ml-2 text-purple-600 font-semibold">
                  （已篩選：{filteredMembers.length.toLocaleString()} 位）
                </span>
              )}
            </p>
          </div>

          {/* User ID 搜尋欄位 */}
          <div className="w-full sm:w-64">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              搜尋 User ID
            </label>
            <input
              type="text"
              value={searchUserId}
              onChange={(e) => {
                setSearchUserId(e.target.value);
                setPage(1);
              }}
              placeholder="輸入 User ID 進行搜尋"
              className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
            />
          </div>
        </div>

        {/* 篩選和排序控制 */}
        <div className="mb-6 space-y-4">
          {/* 篩選選項 */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Filter className="w-4 h-4" />
              <span>篩選：</span>
            </div>
            
            {/* 過期狀態篩選 */}
            <button
              onClick={() => {
                setExpireFilter(expireFilter === 'all' ? 'expired' : expireFilter === 'expired' ? 'active' : 'all');
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                expireFilter === 'all'
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : expireFilter === 'expired'
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {expireFilter === 'all' ? '全部' : expireFilter === 'expired' ? '已過期' : '未過期'}
            </button>
            
            {/* 方案篩選 */}
            <button
              onClick={() => {
                setPlanFilter(planFilter === 'all' ? 'pro' : planFilter === 'pro' ? 'nopro' : 'all');
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                planFilter === 'all'
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : planFilter === 'pro'
                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {planFilter === 'all' ? '全部方案' : planFilter === 'pro' ? 'Pro' : '試用'}
            </button>
            
            {/* 狀態篩選 */}
            <button
              onClick={() => {
                setStatusFilter(statusFilter === 'all' ? 'active' : statusFilter === 'active' ? 'inactive' : 'all');
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                statusFilter === 'all'
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : statusFilter === 'active'
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {statusFilter === 'all' ? '全部狀態' : statusFilter === 'active' ? '啟用' : '停用'}
            </button>
            
            {/* 清除篩選 */}
            {(expireFilter !== 'all' || planFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setExpireFilter('all');
                  setPlanFilter('all');
                  setStatusFilter('all');
                  setPage(1);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all duration-200"
              >
                清除篩選
              </button>
            )}
          </div>

          {/* 排序選項 */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <ArrowUpDown className="w-4 h-4" />
              <span>排序：</span>
            </div>
            
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            >
              <option value="default">預設排序</option>
              <option value="expireDate">到期時間</option>
              <option value="startDate">開始時間</option>
              <option value="plan">方案</option>
              <option value="status">狀態</option>
            </select>
            
            {sortBy !== 'default' && (
              <button
                onClick={() => {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-all duration-200 flex items-center gap-2"
                title={sortOrder === 'asc' ? '升序' : '降序'}
              >
                {sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                <span>{sortOrder === 'asc' ? '升序' : '降序'}</span>
              </button>
            )}
          </div>
        </div>

        {selectedRowNumbers.size > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border-2 border-purple-200 bg-purple-50/80 px-4 py-3">
            <span className="text-sm font-semibold text-purple-800">
              已選 {selectedRowNumbers.size} 人
            </span>
            <select
              value={bulkAddValueOption}
              onChange={(e) => setBulkAddValueOption(e.target.value)}
              className="rounded-lg border border-purple-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">選擇加值方案</option>
              {valueTimeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => bulkAddValueOption && setShowBulkAddValueModal(true)}
              disabled={!bulkAddValueOption}
              className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              批次加值
            </button>
            <button
              type="button"
              onClick={() => setSelectedRowNumbers(new Set())}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              取消選取
            </button>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-4 py-4 text-left">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={paginatedMembers.length > 0 && paginatedMembers.every((m) => selectedRowNumbers.has(m.rowNumber))}
                      onChange={toggleSelectAllOnPage}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">全選</span>
                  </label>
                </th>
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
                  <td className="px-4 py-4 whitespace-nowrap">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRowNumbers.has(member.rowNumber)}
                        onChange={() => toggleSelectMember(member.rowNumber)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  </td>
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
                            <button
                              type="button"
                              onClick={() => handleEdit(member)}
                              className="text-left w-full"
                            >
                              <div className="text-sm font-semibold text-gray-900 truncate underline decoration-dashed decoration-gray-400 hover:decoration-solid">
                                {member.displayName || member.lineName || '未設定'}
                              </div>
                            </button>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="font-mono text-xs text-gray-500">
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
                        getStatusBadge(member.status, member.expireAt)
                      )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-col gap-1.5">
                        {isEditing ? (
                          <>
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-500 shrink-0">開始</label>
                              <input
                                type="date"
                                value={editForm.startAt}
                                onChange={(e) =>
                                  setEditForm((prev) => ({ ...prev, startAt: e.target.value }))
                                }
                                className="px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-500 shrink-0">到期</label>
                              <input
                                type="date"
                                value={editForm.expireAt}
                                onChange={(e) =>
                                  setEditForm((prev) => ({ ...prev, expireAt: e.target.value }))
                                }
                                className="px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
                              />
                            </div>
                            {editForm.expireAt && (() => {
                              const info = formatExpireDate(editForm.expireAt);
                              return info.daysLeft !== null ? (
                                <span className={`text-xs ${
                                  info.isExpired ? 'text-red-500' : info.daysLeft <= 30 ? 'text-orange-500' : 'text-gray-500'
                                }`}>
                                  {info.isExpired ? `已過期 ${info.daysLeft} 天` : `剩餘 ${info.daysLeft} 天`}
                                </span>
                              ) : null;
                            })()}
                          </>
                        ) : (
                          <>
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
                          </>
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
          <div className="relative top-10 mx-auto p-4 border border-gray-200 w-11/12 md:max-w-xl shadow-2xl rounded-2xl bg-white animate-slide-up">
            <div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">行號</label>
                    <p className="mt-2 text-sm font-semibold text-gray-900">{selectedMember.rowNumber}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">LINE 名稱</label>
                    <input
                      type="text"
                      value={detailForm.lineName}
                      onChange={(e) =>
                        setDetailForm((prev) => ({ ...prev, lineName: e.target.value }))
                      }
                      placeholder="輸入或修改 LINE 名稱"
                      className="mt-2 w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">方案</label>
                    <div className="mt-2 flex items-center space-x-2">
                      {getPlanBadge(selectedMember.plan, selectedMember.expireAt)}
                      <button
                        type="button"
                        onClick={() =>
                          setDetailForm((prev) => ({ ...prev, pendingDuration: 'trial7days' }))
                        }
                        className={`px-2 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                          detailForm.pendingDuration === 'trial7days'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        試用7天
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDetailForm((prev) => ({ ...prev, pendingDuration: '30days' }))
                        }
                        className={`px-2 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                          detailForm.pendingDuration === '30days'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 text-gray-600 hover:border-purple-300 hover:bg-purple-50'
                        }`}
                      >
                        會員30天
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">狀態</label>
                    <select
                      value={detailForm.status}
                      onChange={(e) =>
                        setDetailForm((prev) => ({ ...prev, status: e.target.value }))
                      }
                      className="mt-2 w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="active">啟用</option>
                      <option value="inactive">停用</option>
                      <option value="expired">已過期</option>
                    </select>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">開始時間</label>
                    <input
                      type="date"
                      value={detailForm.startAt}
                      onChange={(e) =>
                        setDetailForm((prev) => ({ ...prev, startAt: e.target.value }))
                      }
                      className="mt-2 w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">到期時間</label>
                    <input
                      type="date"
                      value={detailForm.expireAt}
                      onChange={(e) =>
                        setDetailForm((prev) => ({ ...prev, expireAt: e.target.value }))
                      }
                      className="mt-2 w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {detailForm.expireAt && (() => {
                      const expireInfo = formatExpireDate(detailForm.expireAt);
                      return expireInfo.daysLeft !== null ? (
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
                      ) : null;
                    })()}
                  </div>
                  {selectedMember.paymentMethod && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">繳費方式</label>
                      <p className="mt-2 text-sm font-semibold text-gray-900">
                        {selectedMember.paymentMethod}
                      </p>
                    </div>
                  )}
                  {selectedMember.paymentTime && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">繳費時間</label>
                      <p className="mt-2 text-sm font-semibold text-gray-900">
                        {selectedMember.paymentTime}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-8 flex justify-end space-x-3 border-t border-gray-200 pt-6">
                <button
                  onClick={() => setSelectedMember(null)}
                  className="px-5 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition-all duration-200"
                  disabled={detailSaving}
                >
                  關閉
                </button>
                <button
                  onClick={handleDetailSave}
                  disabled={detailSaving}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 font-semibold shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {detailSaving ? '儲存中…' : '儲存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 加值時間模態框 */}
      {showAddValueModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 animate-fade-in">
          <div className="relative top-10 mx-auto p-4 border border-gray-200 w-11/12 md:max-w-lg shadow-2xl rounded-2xl bg-white animate-slide-up">
            <div>
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">加值時間</h3>
                    <p className="text-xs text-gray-500 mt-1">
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

              <div className="space-y-3">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <p className="text-xs text-blue-800 font-medium">
                    💡 提示：如果會員已有到期時間，加值會從到期時間開始延長；如果沒有或已過期，則從今天開始計算。
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    選擇加值時間：
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {valueTimeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSelectedValueOption(option.value)}
                        className={`px-3 py-2 rounded-lg border-2 transition-all duration-200 text-left ${
                          selectedValueOption === option.value
                            ? 'border-purple-500 bg-purple-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-900">{option.label}</span>
                          {selectedValueOption === option.value && (
                            <CheckCircle className="w-5 h-5 text-purple-500" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {showAddValueModal.expireAt && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">當前到期時間</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatExpireDate(showAddValueModal.expireAt).formatted}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-5 flex justify-end space-x-3 border-t border-gray-200 pt-4">
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

      {/* 批次加值確認模態框 */}
      {showBulkAddValueModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 animate-fade-in">
          <div className="relative top-20 mx-auto p-6 border border-gray-200 w-11/12 md:max-w-md shadow-2xl rounded-2xl bg-white animate-slide-up">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">批次加值確認</h3>
              <button
                onClick={() => {
                  setShowBulkAddValueModal(false);
                }}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2"
              >
                <span className="text-xl">✕</span>
              </button>
            </div>
            <p className="text-gray-700 mb-4">
              確定為 <strong>{selectedRowNumbers.size}</strong> 位會員加值
              <strong className="text-purple-600 ml-1">
                {valueTimeOptions.find((o) => o.value === bulkAddValueOption)?.label ?? bulkAddValueOption}
              </strong>
              ？
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkAddValueModal(false)}
                disabled={bulkAddValueLoading}
                className="px-5 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleBulkAddValue}
                disabled={bulkAddValueLoading}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                {bulkAddValueLoading ? (
                  <>
                    <span className="animate-pulse">加值中…</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    確認加值
                  </>
                )}
              </button>
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
                        {getStatusBadge(deletingMember.status, deletingMember.expireAt)}
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
