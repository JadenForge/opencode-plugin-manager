// oh-my-openagent 各 agent / category 的中文名称与描述。
// 来源：oh-my-openagent 官方文档对各角色职责的定义。

interface Meta {
  label: string;
  desc: string;
}

const AGENT_META: Record<string, Meta> = {
  sisyphus: {
    label: "Sisyphus 主执行者",
    desc: "核心编排智能体，负责执行、委派与验证任务",
  },
  "sisyphus-junior": {
    label: "Sisyphus Junior 执行助手",
    desc: "专注型任务执行者，同等纪律但不再向下委派",
  },
  oracle: {
    label: "Oracle 顾问",
    desc: "只读高智力顾问，用于疑难调试与架构设计",
  },
  librarian: {
    label: "Librarian 资料员",
    desc: "多仓库分析、检索远程代码库与官方文档、查找实现示例",
  },
  explore: {
    label: "Explore 探索者",
    desc: "代码库上下文检索，快速定位文件、模式与实现",
  },
  "multimodal-looker": {
    label: "Multimodal Looker 多模态",
    desc: "分析 PDF、图片、图表等需要视觉理解的媒体文件",
  },
  prometheus: {
    label: "Prometheus 规划师",
    desc: "探索优先的规划顾问，产出可直接执行的工作计划",
  },
  metis: {
    label: "Metis 预规划顾问",
    desc: "分析请求以识别隐藏意图、歧义与 AI 失败点",
  },
  momus: {
    label: "Momus 计划评审",
    desc: "以清晰性、可验证性、完整性标准评审工作计划",
  },
  atlas: {
    label: "Atlas 承载者",
    desc: "承担繁重的长时任务执行",
  },
};

const CATEGORY_META: Record<string, Meta> = {
  "visual-engineering": {
    label: "视觉工程",
    desc: "前端、UI/UX、设计、样式、动画",
  },
  artistry: {
    label: "创意求解",
    desc: "以非常规、创造性方式解决复杂问题",
  },
  ultrabrain: {
    label: "深度推理",
    desc: "仅用于真正困难、逻辑密集的任务",
  },
  deep: {
    label: "深度自主",
    desc: "面向需要深入研究的棘手问题，目标导向自主求解",
  },
  quick: {
    label: "快速任务",
    desc: "单文件改动、错别字修复等琐碎任务",
  },
  "unspecified-low": {
    label: "杂项（低）",
    desc: "不属于其他类别、所需投入较低的任务",
  },
  "unspecified-high": {
    label: "杂项（高）",
    desc: "不属于其他类别、所需投入较高的任务",
  },
  writing: {
    label: "文档写作",
    desc: "文档、散文、技术写作",
  },
};

export const getAgentMeta = (key: string): Meta =>
  AGENT_META[key] ?? { label: key, desc: "" };

export const getCategoryMeta = (key: string): Meta =>
  CATEGORY_META[key] ?? { label: key, desc: "" };
