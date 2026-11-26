import { Component, createRef, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  settings: ReactNode
}

interface ListPosition {
  windowTop: number
  mainTop: number
  trigger: HTMLElement | null
}

/** 列表在编辑期间保留筛选和分页，切换前记录滚动位置，避免内容高度变化导致浏览器截断位置。 */
export class ActivityListWithSettings extends Component<Props> {
  private list = createRef<HTMLDivElement>()
  private position: ListPosition | null = null

  getSnapshotBeforeUpdate(previous: Props): ListPosition | null {
    if (previous.settings || !this.props.settings) return null
    const active = document.activeElement
    return {
      windowTop: window.scrollY,
      mainTop: this.list.current?.closest('main')?.scrollTop ?? 0,
      trigger: active instanceof HTMLElement && this.list.current?.contains(active) ? active : null,
    }
  }

  componentDidMount() {
    if (this.props.settings) this.focusSettings()
  }

  componentDidUpdate(previous: Props, _state: unknown, snapshot: ListPosition | null) {
    if (snapshot) {
      this.position = snapshot
      this.focusSettings()
    } else if (previous.settings && !this.props.settings) {
      this.position?.trigger?.focus({ preventScroll: true })
      this.list.current?.closest('main')?.scrollTo({ top: this.position?.mainTop ?? 0 })
      window.scrollTo({ top: this.position?.windowTop ?? 0 })
      this.position = null
    }
  }

  private focusSettings() {
    const main = this.list.current?.closest('main')
    main?.querySelector<HTMLElement>('.settings-page-header h1')?.focus({ preventScroll: true })
    main?.scrollTo({ top: 0 })
    window.scrollTo({ top: 0 })
  }

  render() {
    return (
      <>
        <div hidden={Boolean(this.props.settings)} ref={this.list}>{this.props.children}</div>
        {this.props.settings}
      </>
    )
  }
}
