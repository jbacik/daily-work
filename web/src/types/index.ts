export interface WorkItem {
  id: number
  title: string
  category: 'BigThing' | 'SmallThing'
  isDone: boolean
  sortOrder: number
  date: string
  weekOf: string
  originalDate: string
  timesMoved: number
  isSkipped: boolean
}

export type CommandType = 'standup' | 'weekly' | 'evaluate-my-week' | 'punch'

export interface ReadWatchItem {
  id: number
  title: string
  url: string
  type: 'Read' | 'Watch' | 'Learn' | 'Experiment'
  isDone: boolean
  isActive: boolean
  worthSharing: boolean | null
  notes: string | null
  weekConsumed: string | null
  date: string
}

export interface WorkSessionReflections {
  wins: string | null
  whines: string | null
  valueAdds: string | null
}

export interface ReflectionsInput {
  wins?: string
  whines?: string
  valueAdds?: string
}

export interface WorkSession {
  id: number
  date: string
  clockedInAt: string | null
  clockedOutAt: string | null
  createdAt: string
  reflections: WorkSessionReflections | null
  calendarForecastJson?: string | null
}

export interface ForecastFocusBlock {
  startTime: string
  endTime: string
  duration: string
}

export interface ForecastPto {
  title: string
  start: string
  end: string
  allDay: boolean
  eventType: string
}

export interface DailyForecast {
  date: string
  dayOfWeek: string
  workdayWindow: string
  meetings: { count: number; totalHours: number }
  focusTime: { count: number; totalHours: number; blocks: ForecastFocusBlock[] }
  syncMeetings: string[]
  recommendedLunch: string | null
  upcomingPTO: ForecastPto[]
  targets?: { meetingHours: number; focusHours: number }
}

export type ForecastStatus = 'loading' | 'loaded' | 'missing' | 'error'
