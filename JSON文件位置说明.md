# 📁 JSON 密钥文件位置说明

## 📍 默认下载位置

### Mac 系统
JSON 文件通常会自动下载到：
```
/Users/caijunchang/Downloads/
```
或者中文系统：
```
/Users/caijunchang/下载/
```

---

## 🔍 如何找到 JSON 文件

### 方法 1: 使用 Finder（最简单）

1. **打开 Finder**
2. **点击左侧边栏的「下载」或「Downloads」**
3. **查找文件名类似这样的文件**：
   ```
   项目名-xxxxx-xxxxx.json
   ```
   例如：
   ```
   phone-query-admin-abc123-def456.json
   my-project-12345-67890.json
   ```

### 方法 2: 使用终端查找

在终端中运行：
```bash
# 查找所有 .json 文件
find ~/Downloads -name "*.json" -type f

# 或者查找最近下载的 JSON 文件
ls -lt ~/Downloads/*.json | head -5
```

### 方法 3: 检查浏览器下载记录

1. **打开浏览器**（Chrome、Safari 等）
2. **查看下载历史**：
   - Chrome: `Cmd + Shift + J` 或点击右上角下载图标
   - Safari: `Cmd + Option + L` 或点击右上角下载图标
3. **找到最近下载的 JSON 文件**

---

## 📝 JSON 文件特征

### 文件名格式
- 通常以项目名称开头
- 包含随机字符（如：`-abc123-def456`）
- 扩展名是 `.json`

### 文件内容
打开 JSON 文件（用文本编辑器），应该看到类似这样的内容：

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service@project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

**关键字段**：
- `"client_email"`: 服务账号邮箱（需要复制这个）
- `"private_key"`: 私钥（需要复制这个）

---

## 🎯 确认找到了正确的文件

### 检查方法

1. **文件扩展名**：必须是 `.json`
2. **文件大小**：通常 2-5 KB
3. **文件内容**：打开后应该包含 `"type": "service_account"` 和 `"client_email"` 字段

### 如果找不到文件

**可能的原因**：
1. 下载被浏览器阻止了
2. 文件下载到了其他位置
3. 下载过程中出错了

**解决方法**：
1. 重新创建密钥（在 Google Cloud Console 中）
2. 下载时注意浏览器的下载提示
3. 检查浏览器的下载设置

---

## 💻 使用 JSON 文件配置

### 方法 1: 使用自动配置脚本（推荐）

1. **找到 JSON 文件的完整路径**，例如：
   ```
   /Users/caijunchang/Downloads/phone-query-admin-abc123.json
   ```

2. **运行配置脚本**：
   ```bash
   npm run setup
   ```

3. **当提示输入路径时**：
   - **方法 A**：直接输入完整路径
   - **方法 B**：将 JSON 文件从 Finder 拖拽到终端窗口

### 方法 2: 手动配置

1. **打开 JSON 文件**（用文本编辑器）
2. **复制 `client_email` 的值**
3. **复制 `private_key` 的值**（完整复制，包括 `-----BEGIN PRIVATE KEY-----` 和 `-----END PRIVATE KEY-----`）
4. **编辑 `.env.local` 文件**，填入这些值

---

## 📋 完整操作步骤

### 步骤 1: 在 Google Cloud Console 下载 JSON

1. 进入服务账号页面
2. 点击服务账号邮箱
3. 点击「密钥」标签
4. 点击「添加密钥」→「创建新密钥」
5. 选择「JSON」格式
6. 点击「创建」
7. **文件会自动下载**

### 步骤 2: 找到下载的文件

1. 打开 Finder
2. 进入「下载」文件夹
3. 找到最新的 `.json` 文件
4. **记住文件路径**（可以右键点击文件 →「显示简介」查看完整路径）

### 步骤 3: 使用文件配置

```bash
# 运行配置脚本
npm run setup

# 输入文件路径（可以直接拖拽文件到终端）
/Users/caijunchang/Downloads/你的文件名.json
```

---

## 🔍 快速查找命令

在终端中运行以下命令，可以快速找到 JSON 文件：

```bash
# 查找所有 JSON 文件
find ~ -name "*.json" -type f -mtime -1 2>/dev/null | grep -v node_modules

# 或者只查找下载文件夹
ls -lt ~/Downloads/*.json 2>/dev/null | head -5
```

---

## ⚠️ 重要提示

1. **文件安全**：JSON 文件包含敏感信息，请妥善保管
2. **不要提交到 Git**：`.env.local` 和 JSON 文件已经在 `.gitignore` 中
3. **备份文件**：建议将 JSON 文件保存到安全的地方

---

## 🆘 如果还是找不到

### 检查下载设置

1. **Chrome**：
   - 设置 → 高级 → 下载内容
   - 查看「下载前询问每个文件的保存位置」设置

2. **Safari**：
   - 偏好设置 → 通用
   - 查看「文件下载位置」设置

### 重新下载

如果找不到文件，可以：
1. 回到 Google Cloud Console
2. 重新创建密钥
3. 这次注意浏览器的下载提示
4. 选择保存位置
