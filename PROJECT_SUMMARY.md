# 电话查询系统后台管理系统 - 项目总结

## ✅ 已完成功能

### 1. 项目基础架构
- ✅ Next.js 14 项目搭建
- ✅ TypeScript 配置
- ✅ Tailwind CSS 样式配置
- ✅ React Query 数据获取配置

### 2. Google Sheets API 集成
- ✅ Google Sheets API 客户端初始化
- ✅ 服务账号认证配置
- ✅ Sheet1 (电话查询记录) 数据读取
- ✅ Members / Subscriptions (会员信息) 数据读取
- ✅ 数据关联功能（User ID 关联）

### 3. 后端 API 路由
- ✅ `/api/phone-records` - 电话查询记录 API
  - 支持按电话号码查询
  - 支持按 User ID 查询
  - 支持获取所有记录
- ✅ `/api/members` - 会员信息 API
  - 支持按 User ID 查询单个会员
  - 支持获取所有会员
- ✅ `/api/stats` - 统计数据 API
  - 总记录数统计
  - 风险等级统计
  - 会员状态统计

### 4. 前端界面组件
- ✅ 主页面 (`pages/index.tsx`)
  - 标签页导航（电话记录/会员管理/数据统计）
  - 响应式布局
- ✅ 电话查询记录表格 (`components/PhoneRecordsTable`)
  - 列表展示
  - 搜索功能
  - 分页功能
  - 详情查看模态框
  - 风险等级标识
  - 会员状态显示
  - User ID 关联链接
- ✅ 会员管理表格 (`components/MembersTable`)
  - 列表展示
  - 分页功能
  - 详情查看模态框
  - 方案和状态标识
  - 关联查询记录功能
- ✅ 数据统计卡片 (`components/StatsCards`)
  - 8 个统计指标
  - 实时数据更新
  - 图标和颜色标识
- ✅ 搜索栏组件 (`components/SearchBar`)
  - 搜索输入框
  - 图标提示

### 5. 数据关联功能
- ✅ User ID 与电话号码关联
- ✅ 电话记录中显示会员信息
- ✅ 会员管理中查看相关查询记录
- ✅ 跨表数据查询

## 📁 项目结构

```
phone-query-admin/
├── components/          # React 组件
│   ├── PhoneRecordsTable.tsx
│   ├── MembersTable.tsx
│   ├── StatsCards.tsx
│   └── SearchBar.tsx
├── lib/                # 工具库
│   └── googleSheets.ts
├── pages/              # Next.js 页面
│   ├── api/            # API 路由
│   │   ├── phone-records.ts
│   │   ├── members.ts
│   │   └── stats.ts
│   ├── _app.tsx
│   └── index.tsx
├── styles/             # 样式文件
│   └── globals.css
├── .env.local.example  # 环境变量示例
├── .gitignore
├── ARCHITECTURE.md     # 架构说明
├── package.json
├── postcss.config.js
├── README.md           # 项目说明
├── SETUP.md            # 安装配置指南
├── tailwind.config.js
└── tsconfig.json
```

## 🔧 配置要求

### 环境变量
需要在 `.env.local` 中配置：
- `GOOGLE_SHEETS_SPREADSHEET_ID`: Google Sheets 文档 ID
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: 服务账号邮箱
- `GOOGLE_PRIVATE_KEY`: 服务账号私钥

### Google Sheets 工作表
- **Sheet1**: 电话查询记录
- **Members / Subscriptions**: 会员信息

## 🚀 快速开始

1. 安装依赖：
   ```bash
   npm install
   ```

2. 配置环境变量：
   ```bash
   cp .env.local.example .env.local
   # 编辑 .env.local 填入配置
   ```

3. 运行开发服务器：
   ```bash
   npm run dev
   ```

4. 访问 http://localhost:3000

## 📊 功能说明

### 电话查询记录
- 查看所有电话查询记录
- 根据电话号码或 User ID 搜索
- 查看记录详情（包括风险等级、会员状态等）
- 风险等级标识（高/中/低）
- 鸽子号标识
- 会员状态显示

### 会员管理
- 查看所有会员信息
- 查看会员详情（方案、状态、时间等）
- 关联查看该会员的查询记录
- 方案和状态标识

### 数据统计
- 总查询记录数
- 总会员数
- 高风险记录数
- 中风险记录数
- 活跃会员数
- Pro 会员数
- 鸽子号记录数
- 有会员记录数

## 🔗 数据关联逻辑

1. **电话查询记录 → 会员信息**
   - 通过 `userId` 字段关联
   - 在电话记录中显示会员状态和方案

2. **会员信息 → 电话查询记录**
   - 通过 `userId` 字段关联
   - 在会员管理中可查看相关查询记录

## 📝 注意事项

1. **列映射**: 如果 Google Sheets 的列结构发生变化，需要更新 `lib/googleSheets.ts` 中的列索引
2. **权限**: 确保服务账号有读取 Google Sheets 的权限
3. **性能**: 大量数据时建议添加缓存或分页优化
4. **安全**: 不要将 `.env.local` 文件提交到版本控制

## 🎯 后续优化建议

1. 数据导出功能（CSV/Excel）
2. 高级筛选和排序
3. 数据可视化图表
4. 实时数据更新（WebSocket）
5. 数据编辑功能
6. 多用户权限管理
7. 数据缓存优化
8. 错误处理和重试机制
