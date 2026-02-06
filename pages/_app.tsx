import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function App({ Component, pageProps }: AppProps) {
  // 优化 QueryClient 配置以减少延迟
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // 數據在 5 分鐘內視為新鮮，不會重複請求
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 1,
        retryDelay: 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        // 重新取得時先保留上一筆資料，體感較快
        placeholderData: (previousData: unknown) => previousData,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
    </QueryClientProvider>
  );
}
