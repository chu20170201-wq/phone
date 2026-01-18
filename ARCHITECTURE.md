# 系统架构说明

## 数据流程

```
LINE 官方账号
    ↓
n8n 电话查询系统
    ↓
Google Sheets (数据存储)
    ↓
后台管理系统 (本系统)
    ↓
管理员查看和管理
```

## 数据关联逻辑

### 1. 电话查询记录 (Sheet1)
- **输入**: 用户通过 LINE 发送电话号码
- **处理**: n8n 系统处理并记录到 Sheet1
- **字段**: 
  - `phoneNumber`: 查询的电话号码
  - `userId`: LINE User ID（用于身份识别）
  - `riskLevel`: 风险等级（high/medium/low）
  - `isMember`: 是否为会员
  - `isPigeon`: 是否为鸽子号

### 2. 会员信息 (Members / Subscriptions)
- **数据来源**: 从 Sheet1 的 `userId` 字段关联
- **字段**:
  - `userId`: LINE User ID（主键）
  - `plan`: 会员方案（pro/basic/free）
  - `status`: 会员状态（active/inactive/expired）
  - `startAt`: 开始时间
  - `expireAt`: 到期时间

### 3. 数据关联
- 通过 `userId` 字段关联电话查询记录和会员信息
- 在电话查询记录中显示会员状态
- 在会员管理中可查看相关查询记录

## 系统组件

### 后端 API (`pages/api/`)

1. **`/api/phone-records`**
   - GET: 获取所有电话查询记录
   - Query params:
     - `phone`: 根据电话号码筛选
     - `userId`: 根据 User ID 筛选

2. **`/api/members`**
   - GET: 获取所有会员信息
   - Query params:
     - `userId`: 根据 User ID 获取单个会员

3. **`/api/stats`**
   - GET: 获取统计数据

### 前端组件 (`components/`)

1. **`PhoneRecordsTable`**
   - 显示电话查询记录列表
   - 支持搜索和筛选
   - 显示风险等级和会员状态
   - 详情查看功能

2. **`MembersTable`**
   - 显示会员列表
   - 显示方案和状态
   - 关联查询记录功能

3. **`StatsCards`**
   - 显示统计数据卡片
   - 实时更新

4. **`SearchBar`**
   - 搜索输入组件

### 工具库 (`lib/`)

1. **`googleSheets.ts`**
   - Google Sheets API 客户端初始化
   - 数据读取函数
   - 数据关联函数

## 技术栈

- **框架**: Next.js 14 (App Router)
- **UI**: React 18 + Tailwind CSS
- **数据获取**: React Query (@tanstack/react-query)
- **API 集成**: Google Sheets API (googleapis)
- **日期处理**: date-fns
- **图标**: lucide-react

## 安全考虑

1. **环境变量**: 敏感信息存储在 `.env.local` 中
2. **API 路由**: 所有 API 调用通过 Next.js API 路由，不直接暴露 Google Sheets 凭证
3. **只读权限**: 建议服务账号只授予读取权限

## 扩展功能建议

1. **数据导出**: 导出为 CSV/Excel
2. **数据筛选**: 更高级的筛选和排序
3. **数据可视化**: 图表展示统计数据
4. **实时更新**: WebSocket 实时数据更新
5. **权限管理**: 多用户权限控制
6. **数据编辑**: 允许编辑 Google Sheets 数据
