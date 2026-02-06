import { useState } from 'react';
import Head from 'next/head';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import PhoneRecordsTable from '@/components/PhoneRecordsTable';
import MembersTable from '@/components/MembersTable';
import StatsCards from '@/components/StatsCards';
import RiskListTable from '@/components/RiskListTable';
import LineOAPanel from '@/components/LineOAPanel';
import SearchBar from '@/components/SearchBar';
import { Phone, Users, BarChart3, AlertTriangle, TrendingUp, MessageCircle } from 'lucide-react';
import RecentDataReport from '@/components/RecentDataReport';

type Tab = 'records' | 'recent' | 'members' | 'stats' | 'risks' | 'lineoa';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('records');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemberUserId, setSelectedMemberUserId] = useState<string | null>(null);

  // 記錄哪些分頁已經掛載過，避免每次切換都重新掛載造成卡頓
  const [mountedTabs, setMountedTabs] = useState<Record<Tab, boolean>>({
    records: true,
    recent: false,
    members: false,
    stats: false,
    risks: false,
    lineoa: false,
  });

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setMountedTabs((prev) => ({
      ...prev,
      [tab]: true,
    }));
  };

  return (
    <>
      <Head>
        <title>電話查詢系統後台管理</title>
        <meta name="description" content="電話查詢系統後台管理系統" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        {/* 頂部導航欄 */}
        <nav className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    電話查詢系統後台管理
                  </h1>
                  <p className="text-xs text-gray-500 mt-0.5">Phone Query Admin System</p>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* 標籤頁導航 */}
        <div className="bg-white/60 backdrop-blur-sm border-b border-gray-200/50 sticky top-20 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-1">
              <button
                onClick={() => handleTabChange('records')}
                className={`flex items-center py-4 px-6 border-b-2 font-semibold text-sm transition-all duration-200 ${
                  activeTab === 'records'
                    ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                }`}
              >
                <Phone className="w-5 h-5 mr-2" />
                電話查詢記錄
              </button>
              <button
                onClick={() => handleTabChange('recent')}
                className={`flex items-center py-4 px-6 border-b-2 font-semibold text-sm transition-all duration-200 ${
                  activeTab === 'recent'
                    ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                }`}
              >
                <TrendingUp className="w-5 h-5 mr-2" />
                最新數據
              </button>
              <button
                onClick={() => handleTabChange('members')}
                className={`flex items-center py-4 px-6 border-b-2 font-semibold text-sm transition-all duration-200 ${
                  activeTab === 'members'
                    ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                }`}
              >
                <Users className="w-5 h-5 mr-2" />
                會員管理
              </button>
              <button
                onClick={() => handleTabChange('stats')}
                className={`flex items-center py-4 px-6 border-b-2 font-semibold text-sm transition-all duration-200 ${
                  activeTab === 'stats'
                    ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                }`}
              >
                <BarChart3 className="w-5 h-5 mr-2" />
                數據統計
              </button>
              <button
                onClick={() => handleTabChange('risks')}
                className={`flex items-center py-4 px-6 border-b-2 font-semibold text-sm transition-all duration-200 ${
                  activeTab === 'risks'
                    ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                }`}
              >
                <AlertTriangle className="w-5 h-5 mr-2" />
                風險名單
              </button>
              <button
                onClick={() => handleTabChange('lineoa')}
                className={`flex items-center py-4 px-6 border-b-2 font-semibold text-sm transition-all duration-200 ${
                  activeTab === 'lineoa'
                    ? 'border-green-500 text-green-600 bg-green-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                }`}
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                LINE OA
              </button>
            </div>
          </div>
        </div>

        {/* 主要內容區域（會員管理時加寬） */}
        <main className={`mx-auto px-4 sm:px-6 lg:px-8 py-8 ${activeTab === 'members' ? 'max-w-[1600px]' : 'max-w-7xl'}`}>
          {/* 搜索欄 */}
          {activeTab === 'records' && (
            <div className="mb-6 animate-fade-in">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="搜尋電話號碼或 User ID..."
              />
            </div>
          )}

          {/* 標籤頁內容 */}
          <div className="relative">
            {mountedTabs.records && (
              <div className={activeTab === 'records' ? 'animate-fade-in' : 'hidden'}>
                <PhoneRecordsTable
                  searchQuery={searchQuery}
                  onNavigateToMember={(userId) => {
                    setSelectedMemberUserId(userId);
                    handleTabChange('members');
                  }}
                />
              </div>
            )}

            {mountedTabs.recent && (
              <div className={activeTab === 'recent' ? 'animate-fade-in' : 'hidden'}>
                <RecentDataReport />
              </div>
            )}

            {mountedTabs.members && (
              <div className={activeTab === 'members' ? 'animate-fade-in' : 'hidden'}>
                <MembersTable
                  selectedUserId={selectedMemberUserId}
                  onUserIdProcessed={() => setSelectedMemberUserId(null)}
                />
              </div>
            )}

            {mountedTabs.stats && (
              <div className={activeTab === 'stats' ? 'animate-fade-in' : 'hidden'}>
                <StatsCards />
              </div>
            )}

            {mountedTabs.risks && (
              <div className={activeTab === 'risks' ? 'animate-fade-in' : 'hidden'}>
                <RiskListTable />
              </div>
            )}

            {mountedTabs.lineoa && (
              <div className={activeTab === 'lineoa' ? 'animate-fade-in' : 'hidden'}>
                <LineOAPanel />
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
