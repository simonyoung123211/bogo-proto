import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { formatActivityDateTime } from '../utils/activity'

type Endpoint = 'start' | 'end'
type DateTimeDraft = { date: string; time: string }
type TimeRange = { startTime: string; endTime: string }

const endpoints = [
  { id: 'start', label: '开始' },
  { id: 'end', label: '结束' },
] as const
const weekdays = ['一', '二', '三', '四', '五', '六', '日']
const firstMonth = '0001-01'
const lastMonth = '9999-11'
const arrowDays: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
const clockNumbers = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'))
const clockUnits = [
  { label: '小时', unit: '时', options: clockNumbers.slice(0, 24) },
  { label: '分钟', unit: '分', options: clockNumbers },
  { label: '秒', unit: '秒', options: clockNumbers },
]

function splitDateTime(value: string): DateTimeDraft {
  const [date = '', time = ''] = value.split(/[ T]/)
  return { date, time: time.endsWith(':00') && time.length === 8 ? time.slice(0, 5) : time }
}

function calendarDate(value: string) {
  const date = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date.startsWith('0000')) return ''
  const parsed = new Date(`${date}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : ''
}

function fullClock(value: string) {
  const clock = /^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/.exec(value.trim())
  if (!clock || Number(clock[1]) > 23) return ''
  return `${clock[1].padStart(2, '0')}:${clock[2]}:${clock[3] ?? '00'}`
}

function dateTime(draft: DateTimeDraft) {
  const date = calendarDate(draft.date)
  const time = fullClock(draft.time)
  return date && time ? `${date} ${time}` : ''
}

function shiftDay(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

function shiftMonth(month: string, months: number) {
  const value = new Date(`${month}-01T00:00:00Z`)
  value.setUTCMonth(value.getUTCMonth() + months)
  return value.toISOString().slice(0, 7)
}

function anchorFor(date: string) {
  const month = date.slice(0, 7)
  return month > lastMonth ? lastMonth : month
}

export function LimitDiscountDateRange({ startTime, endTime, minimumEndTime, readOnly, onChange }: TimeRange & {
  minimumEndTime?: string
  readOnly?: boolean
  onChange: (value: TimeRange) => void
}) {
  const [editing, setEditing] = useState<Endpoint | null>(null)
  const labelId = useId()
  const range = { start: startTime, end: endTime }

  return (
    <>
      <div className="ld-time-range">
        {endpoints.map(({ id, label }) => {
          const { date, time } = splitDateTime(range[id])
          return (
            <button key={id} type="button" className="ld-time-range__button"
              aria-label={`${label}时间`} aria-describedby={`${labelId}-${id}`} aria-haspopup="dialog"
              disabled={readOnly || (id === 'start' && minimumEndTime !== undefined)} onClick={() => setEditing(id)}>
              <span className="ld-time-range__label">{label}</span>
              <span id={`${labelId}-${id}`}>{date && time ? `${date} ${time}` : `选择${label}时间`}</span>
              {id === 'end' && <span className="ld-time-range__icon" aria-hidden="true" />}
            </button>
          )
        })}
      </div>
      {editing && <TimeRangeDialog startTime={startTime} endTime={endTime} minimumEndTime={minimumEndTime}
        initialEndpoint={editing} onClose={() => setEditing(null)}
        onConfirm={(range) => { onChange(range); setEditing(null) }} />}
    </>
  )
}

function TimeRangeDialog({ startTime, endTime, minimumEndTime, initialEndpoint, onClose, onConfirm }: TimeRange & {
  minimumEndTime?: string
  initialEndpoint: Endpoint
  onClose: () => void
  onConfirm: (value: TimeRange) => void
}) {
  const [draft, setDraft] = useState(() => ({ start: splitDateTime(startTime), end: splitDateTime(endTime) }))
  const [today] = useState(() => splitDateTime(formatActivityDateTime()).date)
  const startLocked = minimumEndTime !== undefined
  const initialTarget = startLocked ? 'end' : initialEndpoint
  const [target, setTarget] = useState<Endpoint>(initialTarget)
  const [month, setMonth] = useState(() => {
    const start = calendarDate(draft.start.date)
    const end = calendarDate(draft.end.date)
    if (start && end && end.slice(0, 7) <= shiftMonth(anchorFor(start), 1) && end >= start) return anchorFor(start)
    return anchorFor(calendarDate(draft[initialTarget].date) || today)
  })
  const [focusedDay, setFocusedDay] = useState('')
  const [clockEndpoint, setClockEndpoint] = useState<Endpoint | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const clockTrigger = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const clockPickerId = `${titleId}-clock-picker`
  const startDate = calendarDate(draft.start.date)
  const endDate = calendarDate(draft.end.date)
  const savedEndDate = calendarDate(splitDateTime(minimumEndTime ?? '').date)
  const earliestEndDate = startDate > savedEndDate ? startDate : savedEndDate
  const firstAllowedDate = target === 'end' ? earliestEndDate : ''
  const draftStart = dateTime(draft.start)
  const start = startLocked ? startTime : draftStart
  const end = dateTime(draft.end)
  let error = ''
  if (!draftStart) error = '请输入有效的开始日期和时刻'
  else if (!end) error = '请输入有效的结束日期和时刻'
  else if (end <= draftStart) error = '结束时间须晚于开始时间'
  else if (minimumEndTime && end < minimumEndTime) error = '结束时间不能早于原结束时间'
  const months = [month, shiftMonth(month, 1)]

  useEffect(() => {
    const dialog = dialogRef.current
    const trigger = document.activeElement
    dialog?.showModal()
    const input = dialog?.querySelector<HTMLInputElement>(`input[data-range-date="${initialTarget}"]`)
    input?.focus({ preventScroll: true })
    input?.select()
    return () => {
      dialog?.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [initialTarget])

  function reveal(date: string) {
    if (!date || months.includes(date.slice(0, 7))) return
    setMonth(anchorFor(date))
  }

  function selectEndpoint(endpoint: Endpoint) {
    setTarget(endpoint)
    setFocusedDay('')
    reveal(calendarDate(draft[endpoint].date))
  }

  function change(endpoint: Endpoint, value: Partial<DateTimeDraft>) {
    setDraft((current) => ({ ...current, [endpoint]: { ...current[endpoint], ...value } }))
  }

  function closeClockPicker() {
    setClockEndpoint(null)
    clockTrigger.current?.focus({ preventScroll: true })
  }

  function selectDay(date: string) {
    if (target === 'start') {
      setDraft((current) => ({
        start: { date, time: current.start.time || '00:00' },
        end: endDate && date > endDate ? { ...current.end, date: '' } : current.end,
      }))
      setTarget('end')
    } else {
      change('end', { date, time: draft.end.time || '23:59:59' })
    }
    setFocusedDay(date)
  }

  function moveCalendarFocus(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    const offset = arrowDays[event.key]
    if (!offset) return
    event.preventDefault()
    const next = calendarDate(shiftDay(date, offset))
    if (!next || next < firstAllowedDate) return
    reveal(next)
    setFocusedDay(next)
    requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLButtonElement>(`[data-day="${next}"]`)?.focus())
  }

  function applyPreset(days: number) {
    const base = startLocked ? splitDateTime(minimumEndTime) : splitDateTime(formatActivityDateTime())
    const baseDate = calendarDate(base.date)
    if (!baseDate) return
    const nextEnd = { date: calendarDate(shiftDay(baseDate, days)), time: base.time }
    if (!nextEnd.date) return
    setDraft((current) => ({ start: startLocked ? current.start : base, end: nextEnd }))
    setTarget('end')
    setFocusedDay('')
    setMonth(anchorFor(startLocked ? nextEnd.date : baseDate))
  }

  return (
    <dialog className="modal modal--lg ld-area-dialog" ref={dialogRef} aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        if (clockEndpoint) closeClockPicker()
        else onClose()
      }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <form noValidate onSubmit={(event) => {
        event.preventDefault()
        if (!error) onConfirm({ startTime: start, endTime: end })
      }}>
        <header className="modal__header">
          <h3 id={titleId}>{startLocked ? '延长活动时间' : '设置起止时间'}</h3>
          <button type="button" className="modal__close" aria-label="关闭起止时间选择" onClick={onClose}>×</button>
        </header>
        <div className="modal__body modal__body--scroll ld-time-dialog__body">
          <div className="ld-time-presets">
            <span>{startLocked ? '按原结束时间延长' : '快捷设置'}</span>
            {[7, 14].map((days) => <button key={days} type="button" className="btn btn--default btn--sm"
              onClick={() => applyPreset(days)}>{startLocked ? `延长 ${days} 天` : `从现在起 ${days} 天`}</button>)}
          </div>
          <div className="ld-time-endpoints">
            {endpoints.map(({ id, label }) => {
              const locked = id === 'start' && startLocked
              return (
                <section key={id} className={`ld-time-endpoint${target === id ? ' is-active' : ''}`}>
                  <button type="button" className="ld-time-endpoint__title" aria-pressed={target === id} disabled={locked}
                    onClick={() => selectEndpoint(id)}>{label}时间{locked && <small>已锁定</small>}</button>
                  <div className="ld-time-endpoint__inputs">
                    <input className="input" type="text" aria-label={`${label}日期`} data-range-date={id}
                      placeholder="YYYY-MM-DD" maxLength={10} disabled={locked} value={draft[id].date}
                      onFocus={() => setTarget(id)} onChange={(event) => {
                        const date = event.target.value
                        change(id, { date })
                        reveal(calendarDate(date))
                      }} />
                    <div className="ld-time-clock-field">
                      <input className="input" type="text" aria-label={`${label}时刻`} placeholder="HH:mm:ss"
                        maxLength={8} disabled={locked} value={draft[id].time}
                        onChange={(event) => change(id, { time: event.target.value })} />
                      <button type="button" className="ld-time-clock-field__toggle" disabled={locked}
                        aria-label={`选择${label}时刻`} title={`选择${label}时刻`} aria-expanded={clockEndpoint === id}
                        aria-controls={clockEndpoint === id ? clockPickerId : undefined}
                        onClick={(event) => {
                          clockTrigger.current = event.currentTarget
                          setClockEndpoint((current) => current === id ? null : id)
                        }}>
                        <span className="ld-time-clock" aria-hidden="true" />
                      </button>
                    </div>
                    {id === 'end' && <button type="button" className="link-btn" disabled={!endDate}
                      onClick={() => change('end', { time: '23:59:59' })}>当天结束</button>}
                  </div>
                </section>
              )
            })}
          </div>
          {clockEndpoint && <ClockPicker key={clockEndpoint} id={clockPickerId}
            label={clockEndpoint === 'start' ? '开始时刻' : '结束时刻'}
            time={fullClock(draft[clockEndpoint].time) || (clockEndpoint === 'start' ? '00:00:00' : '23:59:59')}
            onChange={(time) => change(clockEndpoint, { time })}
            onDone={(time) => { change(clockEndpoint, { time }); closeClockPicker() }} />}
          <div className="ld-time-calendar-nav">
            <button type="button" className="btn btn--default btn--icon" aria-label="上个月" disabled={month <= firstMonth}
              onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
            <span aria-live="polite">选择{target === 'start' ? '开始' : '结束'}日期</span>
            <button type="button" className="btn btn--default btn--icon" aria-label="下个月" disabled={month >= lastMonth}
              onClick={() => setMonth(shiftMonth(month, 1))}>›</button>
          </div>
          <div className="ld-time-calendars">
            {months.map((value) => {
              const selected = target === 'start' ? startDate : endDate
              const preferred = focusedDay.startsWith(value) ? focusedDay : selected
              return (
                <CalendarMonth key={value} month={value} today={today} startDate={startDate} endDate={endDate}
                  firstAllowedDate={firstAllowedDate} preferredDay={preferred}
                  onSelect={selectDay} onFocusDay={setFocusedDay} onKeyDown={moveCalendarFocus} />
              )
            })}
          </div>
        </div>
        <footer className="modal__footer">
          {error && <span className="ld-time-error" role="status">{error}</span>}
          <button type="button" className="btn btn--default" onClick={onClose}>取消</button>
          <button type="submit" className="btn btn--primary" disabled={Boolean(error)}>确定</button>
        </footer>
      </form>
    </dialog>
  )
}

function ClockPicker({ id, label, time, onChange, onDone }: {
  id: string
  label: string
  time: string
  onChange: (time: string) => void
  onDone: (time: string) => void
}) {
  const firstSelect = useRef<HTMLSelectElement>(null)
  const parts = time.split(':')

  useEffect(() => { firstSelect.current?.focus({ preventScroll: true }) }, [])

  return (
    <div id={id} className="ld-time-clock-picker" role="group" aria-label={`选择${label}`}>
      <strong>{label}</strong>
      {clockUnits.map(({ label, unit, options }, index) => (
        <label className="ld-time-clock-picker__unit" key={unit}>
          <select className="input select" ref={index === 0 ? firstSelect : undefined} aria-label={label} value={parts[index]}
            onChange={(event) => onChange(parts.map((value, part) => part === index ? event.target.value : value).join(':'))}>
            {options.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <span>{unit}</span>
        </label>
      ))}
      <button type="button" className="btn btn--default btn--sm" onClick={() => onDone(time)}>完成</button>
    </div>
  )
}

function CalendarMonth({ month, today, startDate, endDate, firstAllowedDate, preferredDay, onSelect, onFocusDay, onKeyDown }: {
  month: string
  today: string
  startDate: string
  endDate: string
  firstAllowedDate: string
  preferredDay: string
  onSelect: (date: string) => void
  onFocusDay: (date: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, date: string) => void
}) {
  const first = new Date(`${month}-01T00:00:00Z`)
  const offset = (first.getUTCDay() + 6) % 7
  first.setUTCMonth(first.getUTCMonth() + 1, 0)
  const days = first.getUTCDate()
  const title = `${month.slice(0, 4)} 年 ${Number(month.slice(5))} 月`
  const firstSelectable = firstAllowedDate.startsWith(month) ? firstAllowedDate : `${month}-01`
  const tabDay = preferredDay.startsWith(month) && preferredDay >= firstAllowedDate ? preferredDay : firstSelectable

  return (
    <section className="ld-time-calendar" aria-label={title}>
      <h4>{title}</h4>
      <div className="ld-time-calendar__grid">
        {weekdays.map((day) => <span className="ld-time-calendar__weekday" key={day}>{day}</span>)}
        {Array.from({ length: 42 }, (_, index) => {
          const day = index - offset + 1
          if (day < 1 || day > days) return <span key={index} aria-hidden="true" />
          const date = `${month}-${String(day).padStart(2, '0')}`
          const selected = date === startDate || date === endDate
          const inRange = startDate && endDate && date > startDate && date < endDate
          return (
            <button key={index} type="button" className="ld-time-calendar__day" data-day={date} aria-label={date}
              aria-current={date === today ? 'date' : undefined} aria-pressed={selected}
              data-in-range={Boolean(inRange)} disabled={date < firstAllowedDate} tabIndex={date === tabDay ? 0 : -1}
              onFocus={() => onFocusDay(date)} onKeyDown={(event) => onKeyDown(event, date)} onClick={() => onSelect(date)}>
              {day}
            </button>
          )
        })}
      </div>
    </section>
  )
}
