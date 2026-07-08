import { useState, type ReactNode } from 'react'

interface AdminLayoutProps {
  children: ReactNode
  breadcrumbs?: string[]
  activeKey?: string
  onNavigate?: (key: string) => void
}

type MenuItem = {
  id: string
  label: string
  icon: string
  navKey?: string
  children?: { id: string; label: string; navKey?: string }[]
}

const topModules = [
  { id: 'brand', label: '品牌管理', active: false },
  { id: 'marketing', label: '营销管理', active: true },
]

const sidebarMenus: MenuItem[] = [
  {
    id: 'activities',
    label: '营销活动',
    icon: 'activity',
    children: [
      { id: 'bogo', label: '买1送N', navKey: 'bogo' },
      { id: 'half-item', label: '第N件优惠', navKey: 'half_item' },
    ],
  },
  {
    id: 'orders',
    label: '订单管理',
    icon: 'order',
    children: [{ id: 'order-list', label: '订单查询', navKey: 'orders' }],
  },
  { id: 'share', label: '共享关系', icon: 'share' },
  { id: 'control', label: '营销管控', icon: 'control' },
  { id: 'report', label: '资产报告', icon: 'report' },
  { id: 'promo', label: '推广管理', icon: 'promo', children: [{ id: 'promo-list', label: '推广列表' }] },
  { id: 'ad', label: '广告管理', icon: 'ad' },
]

export function AdminLayout({ children, breadcrumbs = ['营销管理', '买一送一'], activeKey = 'bogo', onNavigate }: AdminLayoutProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    activities: true,
    orders: true,
    promo: false,
  })

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="admin">
      <header className="admin-header">
        <div className="admin-header__left">
          <div className="admin-header__brand">
            <span className="admin-header__brand-dot" aria-hidden />
            <span className="admin-header__logo">餐饮 2.0</span>
          </div>
          <nav className="admin-header__nav" aria-label="一级模块">
            {topModules.map((mod) => (
              <button
                key={mod.id}
                type="button"
                className={`admin-header__nav-item ${mod.active ? 'is-active' : ''}`}
              >
                {mod.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="admin-header__right">
          <div className="admin-header__search-wrap">
            <IconSearch />
            <input className="admin-header__search" placeholder="搜索品牌名称、手机号..." />
          </div>
          <button type="button" className="admin-header__feedback">
            <IconFeedback />
            问题反馈
          </button>
          <button type="button" className="admin-header__icon-btn" aria-label="通知">
            <IconBell />
          </button>
          <button type="button" className="admin-header__icon-btn" aria-label="下载">
            <IconDownload />
          </button>
          <button type="button" className="admin-header__user">
            <span className="admin-header__avatar">YYJ</span>
            <span className="admin-header__username">YYJ</span>
            <IconChevronDown />
          </button>
        </div>
      </header>

      <div className="admin-body">
        <aside className="admin-sidebar">
          <div className="admin-sidebar__head">营销管理</div>
          <nav className="admin-sidebar__nav" aria-label="营销管理菜单">
            {sidebarMenus.map((item) => {
              const hasChildren = Boolean(item.children?.length)
              const isOpen = expanded[item.id]
              const hasActiveChild = item.children?.some((c) => c.navKey && c.navKey === activeKey)

              return (
                <div key={item.id} className="admin-sidebar__group">
                  <button
                    type="button"
                    className={`admin-sidebar__item ${hasChildren ? 'has-children' : ''} ${hasActiveChild ? 'is-parent-active' : ''}`}
                    onClick={() => hasChildren && toggleExpand(item.id)}
                  >
                    <MenuIcon name={item.icon} />
                    <span className="admin-sidebar__label">{item.label}</span>
                    {hasChildren && (
                      <span className={`admin-sidebar__chevron ${isOpen ? 'is-open' : ''}`}>
                        <IconChevronDown />
                      </span>
                    )}
                  </button>
                  {hasChildren && isOpen && (
                    <div className="admin-sidebar__sub">
                      {item.children!.map((child) => (
                        <button
                          key={child.id}
                          type="button"
                          className={`admin-sidebar__sub-item ${child.navKey && child.navKey === activeKey ? 'is-active' : ''}`}
                          onClick={() => child.navKey && onNavigate?.(child.navKey)}
                        >
                          {child.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
          <div className="admin-sidebar__footer">
            <button type="button" className="admin-sidebar__footer-btn" aria-label="消息">
              <IconMessage />
            </button>
            <button type="button" className="admin-sidebar__footer-btn" aria-label="通知">
              <IconBell />
            </button>
            <button type="button" className="admin-sidebar__footer-btn" aria-label="设置">
              <IconSettings />
            </button>
          </div>
        </aside>

        <main className="admin-main">
          <div className="admin-breadcrumb">
            {breadcrumbs.map((b, i) => (
              <span key={b}>
                {i > 0 && <span className="admin-breadcrumb__sep">/</span>}
                {b}
              </span>
            ))}
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}

function MenuIcon({ name }: { name: string }) {
  const icons: Record<string, ReactNode> = {
    activity: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
        <rect x="2" y="3" width="12" height="10" rx="1.5" />
        <path d="M5 7h6M5 10h4" />
      </svg>
    ),
    share: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="4" cy="8" r="2" /><circle cx="12" cy="4" r="2" /><circle cx="12" cy="12" r="2" />
        <path d="M6 7l4-2M6 9l4 2" />
      </svg>
    ),
    control: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M8 2v2M8 12v2M2 8h2M12 8h2" />
        <circle cx="8" cy="8" r="3" />
      </svg>
    ),
    report: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M3 13V7M7 13V3M11 13V9" />
      </svg>
    ),
    promo: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M2 8h12M8 2v12" />
        <circle cx="8" cy="8" r="5.5" />
      </svg>
    ),
    ad: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
        <rect x="2" y="4" width="12" height="8" rx="1" /><path d="M5 8h6" />
      </svg>
    ),
    order: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
        <rect x="3" y="2" width="10" height="12" rx="1.5" />
        <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" />
      </svg>
    ),
  }
  return <span className="admin-sidebar__icon">{icons[name]}</span>
}

function IconSearch() {
  return (
    <svg className="admin-header__search-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="7" cy="7" r="4.5" /><path d="M11 11l3 3" />
    </svg>
  )
}

function IconFeedback() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M3 4h10v7H6l-3 2V4z" />
    </svg>
  )
}

function IconBell() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M4 6a4 4 0 018 0v3l1 2H3l1-2V6z" /><path d="M7 13a1.5 1.5 0 003 0" />
    </svg>
  )
}

function IconDownload() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M8 3v7M5 8l3 3 3-3" /><path d="M3 13h10" />
    </svg>
  )
}

function IconChevronDown() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 4.5l3 3 3-3" />
    </svg>
  )
}

function IconMessage() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M3 4h10v6H6l-3 2V4z" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="8" cy="8" r="2" />
      <path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M4 4l1 1M11 11l1 1M12 4l-1 1M5 11l-1 1" />
    </svg>
  )
}
