# Crazy3DS-PromptArchive (提示词仓库-疯狂的3DS)

[中文](#-中文文档) | [English](#-english-documentation)

---

## 🇨🇳 中文文档

> **提示词太多、太杂，无处安放，不好归类，厌烦了各种窗口切换到处复制再粘贴？**  
> 一个可以 ComfyUI 全局使用的“提示词仓库”，能在不同工作流中统一调用，随用随存随时切换。专为 ComfyUI 设计的轻量化本地持久化提示词管理与转接节点。支持多主题词库隔离、分类归档、工作流直通回显以及画板缩放自适应渲染。

### 📂 目录架构

```text
Crazy3DS-PromptArchive/
├── CIKU/                   # 词库 JSON 文件集中归档目录（支持自动生成与备份）
├── __init__.py             # 节点前端资源挂载与节点入口注册
├── prompt_archive.py       # 后端执行逻辑、异步 API 服务与文件持久化管理
├── prompt_archive.js       # 前端纯 DOM 自适应下拉组件、交互列表与通信逻辑
├── .gitignore              # Git 忽略配置（防止个人私有词库与缓存误传）
└── README.md               # 项目使用说明文档
```

### ✨ 核心特性

* **多词库物理隔离**：所有词库统一以 JSON 格式存放于节点目录下的 `CIKU/` 专属文件夹内。支持在界面中直接新建、重命名与安全删除（自动转为 `.bak` 备份文件，杜绝误删丢数据）。
* **画布原生等比缩放**：采用纯 DOM 自定义构建下拉菜单组件，彻底解决系统原生控件脱离画板缩放导致“字体极小”或“突兀胀大”的问题，在画板 50%~200% 缩放下始终保持 1:1 动态等比清晰渲染。
* **多标签分类归档 (Tabs)**：词库内部支持子分类横向标签页切换、双击重命名标签、一键新建与防误删确认删除。
* **全功能历史管理**：支持可选录入自定义短标题与自动时间戳（月-日 时:分）；点击提示词可在“单行省略”与“换行完整展开”之间自由切换；支持一键载入至当前编辑区参与运行，支持单条永久删除。
* **外部文本转接与同步**：支持上游提示词节点直通合并输入；在工作流运行时通过 WebSocket 实时将上游传入的文本回显同步到本节点编辑区。
* **画板防误触交互优化**：在输入框、分类列表及下拉菜单中滚动时彻底阻止事件冒泡，不触发画板缩放；空白区域保留画板缩放权；在节点上方任何位置直接支持鼠标中键拖拽平移画板。

### 📦 安装方法

1. 打开终端，进入你的 ComfyUI 插件目录：
   ```bash
   cd ComfyUI/custom_nodes/
   ```
2. 克隆本仓库：
   ```bash
   git clone [https://github.com/760689/Crazy3DS-PromptArchive.git](https://github.com/760689/Crazy3DS-PromptArchive.git)
   ```
3. 重启 ComfyUI 即可。

### 🚀 节点端口与使用指南

#### 接口定义
* **输入端口**：
  * `text` *(STRING)*: 节点主编辑框内的提示词文本。
  * `incoming_text` *(STRING, 可选)*: 外部上游提示词输入口（如反推提示词、大模型扩写等），接入后优先向下游输出该文本并在运行后回显。
* **输出端口**：
  * `text` *(STRING)*: 最终生效的提示词文本，直接连入 CLIP Text Encode 节点。

#### 使用流程
1. **接入管线**：将本节点的 `text` 输出口连入 KSampler 采样链路的 CLIP 文本编码器；如需接收上游文本，将上游连入 `incoming_text`。
2. **管理词库**：在右上方下拉菜单中切换现有词库，点击 `+` 新建主题库（如 `FLUX风格库`、`二次元角色`），点击 `✏️` 重命名，点击 `-` 安全备份删除。
3. **录入与归档**：在主输入框输入提示词，可在中间标题栏填入识别短标题，点击 **“存入”** 即可归档到当前分类。
4. **分类与调取**：
   * 点击标签页切换不同分类，双击分类标签可重命名。
   * 下方列表中点击提示词文本可切换展开/折叠，点击 **“载入”** 立即提取回主编辑框参与工作流。

---
<img width="650" height="604" alt="屏幕截图 2026-09-05 203938" src="https://github.com/user-attachments/assets/ee5c424f-4788-4f3e-b66d-8659145679d4" />

<img width="715" height="662" alt="屏幕截图 2026-09-05 201516" src="https://github.com/user-attachments/assets/d987e62d-2937-4607-a51c-8b939a9e8354" />

---

## 🇬🇧 English Documentation

> **Drowning in too many messy prompts with nowhere to organize them? Tired of constantly jumping between windows just to copy and paste?**  
> Here is a global **Prompt Archive** for ComfyUI that unifies prompt management across all your workflows—save, recall, and switch on the fly. A lightweight, locally persistent prompt manager and passthrough node designed specifically for ComfyUI, featuring multi-library isolation, tabbed categorization, pipeline passthrough with real-time feedback, and canvas-adaptive UI rendering.

### 📂 Directory Structure

```text
Crazy3DS-PromptArchive/
├── CIKU/                   # Dedicated folder for prompt library JSON files (auto-generated & backed up)
├── __init__.py             # Node registration and web directory mapping
├── prompt_archive.py       # Backend logic, async API routes, and JSON persistence
├── prompt_archive.js       # Pure DOM canvas-adaptive UI, list interactions, and WebSocket handlers
├── .gitignore              # Git ignore rules (prevents local prompt data & caches from syncing)
└── README.md               # Documentation
```

### ✨ Features

* **Multi-Library Physical Isolation**: All libraries are stored as JSON files inside the dedicated `CIKU/` subfolder. Create, rename, and safely soft-delete libraries directly in the UI (files are renamed to `.bak` backups to prevent data loss).
* **Canvas-Adaptive Native UI**: Built with a custom pure-DOM dropdown component. Completely resolves the issue where native browser controls fail to scale with the ComfyUI canvas, ensuring crisp, 1:1 proportional scaling whether canvas zoom is at 50% or 200%.
* **Tabbed Categorization System**: Organize prompts into multiple categories via horizontal tabs. Double-click any tab title to rename it, and add or delete tabs with built-in confirmation dialogues.
* **Comprehensive History Management**: Attach optional custom short titles and timestamps (`MM-DD HH:MM`) to prompt records. Click any prompt to toggle between single-line truncation and full multiline view. Features one-click reload back to the active workflow and single-record deletion.
* **Pipeline Passthrough & Real-Time Sync**: Connect upstream text nodes for seamless string concatenation and passthrough. Upstream text automatically synchronizes and echoes back into the node's editor via WebSocket upon workflow execution.
* **Smart Canvas Interaction & Anti-Misoperation**: Scroll events inside the text editor, lists, and dropdowns are isolated to prevent accidental canvas zooming. Middle-mouse drag panning works seamlessly across the entire node area.

### 📦 Installation

1. Open your terminal and navigate to your ComfyUI custom nodes folder:
   ```bash
   cd ComfyUI/custom_nodes/
   ```
2. Clone this repository:
   ```bash
   git clone [https://github.com/760689/Crazy3DS-PromptArchive.git](https://github.com/760689/Crazy3DS-PromptArchive.git)
   ```
3. Restart ComfyUI.

### 🚀 Node Ports & Usage Guide

#### Port Definitions
* **Inputs**:
  * `text` *(STRING)*: Internal editor prompt text.
  * `incoming_text` *(STRING, Optional)*: Upstream prompt input (e.g., interrogators, LLMs). When connected, it overrides internal text and syncs back to the UI upon execution.
* **Outputs**:
  * `text` *(STRING)*: The final prompt string, directly wired into your CLIP Text Encode node.

#### Workflow Walkthrough
1. **Wiring the Pipeline**: Connect the node's `text` output to your CLIP Text Encode node. Connect any upstream text generator to `incoming_text`.
2. **Managing Libraries**: Switch libraries via the top-right dropdown. Click `+` to create a new library (e.g., `FLUX_Styles`, `Characters`), `✏️` to rename, and `-` to safely backup and delete.
3. **Saving Prompts**: Type your prompt into the main editor, add an optional identifier in the title input, and click **"存入" (Save)** to archive it into the active category.
4. **Categorizing & Recalling**:
   * Click tabs to switch categories, or double-click to rename them.
   * In the history list, click any prompt text to toggle expanded view, and click **"载入" (Load)** to instantly load it into the active editor.
