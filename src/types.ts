export interface Env {
  /** D1 关系型数据库 */
  DB: D1Database
  /** KV：会话 / 缓存 / 限流 */
  KV: KVNamespace
  /** R2：图片与附件（历史绑定，未启用时可为 undefined） */
  R2?: R2Bucket
  /** Workers AI */
  AI: any
  /** 外部图床 CloudFlare-ImgBed：站点地址 */
  IMGBED_BASE_URL?: string
  /** 外部图床 API Token —— 由 `wrangler secret put IMGBED_TOKEN` 注入，勿写入配置文件 */
  IMGBED_TOKEN?: string
  /** 外部图床 Token 名称（仅用于后台展示，可明文） */
  IMGBED_TOKEN_NAME?: string
  /** 后台写入的敏感配置加密主密钥（AES-GCM），不入库、页面不回显 */
  CONFIG_ENCRYPTION_KEY?: string
  /** Vectorize 语义索引（可能为 undefined 时自动降级） */
  VECTORIZE?: any
  /** 静态资源 */
  ASSETS?: Fetcher

  SITE_NAME?: string
  SITE_DESCRIPTION?: string
  SITE_URL?: string
  TURNSTILE_SITE_KEY?: string
  AI_SUMMARY_MODEL?: string
  AI_EMBED_MODEL?: string
  AI_EMBED_DIMS?: string
  ENABLE_AI?: string
  ENABLE_VECTORIZE?: string
  /** 由 wrangler secret put ADMIN_PASSWORD 注入，仅首次初始化使用 */
  ADMIN_PASSWORD?: string
}

export interface SessionUser {
  id: number
  username: string
  display_name: string
  role: string
}

export interface PostRow {
  id: number
  slug: string
  title: string
  excerpt: string
  content_md: string
  content_html: string
  cover: string
  status: string
  pinned: number
  category_id: number | null
  author_id: number | null
  views: number
  ai_summary: string
  reading_time: number
  created_at: string
  updated_at: string
  published_at: string | null
  category_name?: string | null
  category_slug?: string | null
  author_name?: string | null
}

export interface SiteSettings {
  site_name: string
  site_description: string
  site_keywords: string
  footer_text: string
  posts_per_page: string
  allow_comments: string
  turnstile_secret: string
  analytics_enabled: string
  /** 第三方统计代码（管理员填写，原样注入前台 </body> 前），与内置打点互不依赖 */
  analytics_script: string
  /** 站点 LOGO 完整外链，空则回退「图标 + 站名」默认样式 */
  site_logo: string
  site_logo_height: string
  /** 图床后台配置：地址 / Token 密文 / 掩码提示 / 名称 / 默认渠道 */
  imgbed_base_url: string
  imgbed_token_enc: string
  imgbed_token_hint: string
  imgbed_token_name: string
  imgbed_channel: string
  /** 页面缓存代数：发布时 +1，旧 key 立即失效（KV 只需 1 次写） */
  cache_gen: string
  /** 额度开关：0 = 关闭对应功能，不再产生 D1/KV 查询或写入 */
  enable_page_cache: string
  enable_hot: string
  enable_related: string
  enable_prevnext: string
  enable_semantic: string
  enable_ai: string
}
