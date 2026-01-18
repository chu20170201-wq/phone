import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Phone, Users, AlertTriangle, Shield, TrendingUp } from 'lucide-react';

export default function StatsCards() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await axios.get('/api/stats');
      return res.data.data;
    },
    refetchInterval: 30000, // 每30秒刷新一次
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white overflow-hidden shadow rounded-lg animate-pulse">
            <div className="p-5">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 shadow-lg">
        <p className="text-red-800 font-medium">載入統計資料失敗，請稍後重試</p>
      </div>
    );
  }

  const stats = [
    {
      name: '總查詢記錄',
      value: data?.totalRecords || 0,
      icon: Phone,
      color: 'text-blue-600',
      bgColor: 'bg-gradient-to-br from-blue-100 to-blue-200',
      borderColor: 'border-blue-300',
    },
    {
      name: '總會員數',
      value: data?.totalMembers || 0,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-gradient-to-br from-green-100 to-emerald-200',
      borderColor: 'border-green-300',
    },
    {
      name: '高風險記錄',
      value: data?.highRiskRecords || 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-gradient-to-br from-red-100 to-rose-200',
      borderColor: 'border-red-300',
    },
    {
      name: '活躍會員',
      value: data?.activeMembers || 0,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-gradient-to-br from-purple-100 to-indigo-200',
      borderColor: 'border-purple-300',
    },
    {
      name: '中風險記錄',
      value: data?.mediumRiskRecords || 0,
      icon: Shield,
      color: 'text-yellow-600',
      bgColor: 'bg-gradient-to-br from-yellow-100 to-amber-200',
      borderColor: 'border-yellow-300',
    },
    {
      name: 'Pro 會員',
      value: data?.proMembers || 0,
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-gradient-to-br from-indigo-100 to-blue-200',
      borderColor: 'border-indigo-300',
    },
    {
      name: '鴿子號記錄',
      value: data?.pigeonRecords || 0,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-gradient-to-br from-orange-100 to-amber-200',
      borderColor: 'border-orange-300',
    },
    {
      name: '有會員記錄',
      value: data?.recordsWithMembers || 0,
      icon: Users,
      color: 'text-teal-600',
      bgColor: 'bg-gradient-to-br from-teal-100 to-cyan-200',
      borderColor: 'border-teal-300',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div 
            key={stat.name} 
            className="bg-white/90 backdrop-blur-sm overflow-hidden shadow-xl rounded-2xl border-2 border-gray-200/50 hover:shadow-2xl hover:scale-105 transition-all duration-300 animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <dt className="text-sm font-semibold text-gray-600 mb-2">
                    {stat.name}
                  </dt>
                  <dd className="flex items-baseline">
                    <div className={`text-3xl font-bold ${stat.color}`}>
                      {stat.value.toLocaleString()}
                    </div>
                  </dd>
                </div>
                <div className={`flex-shrink-0 ${stat.bgColor} rounded-xl p-4 border-2 ${stat.borderColor} shadow-lg`}>
                  <Icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
