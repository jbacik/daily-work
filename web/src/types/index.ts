export interface WorkItem {
  id: number
  title: string
  category: 'BigThing' | 'SmallThing'
  isDone: boolean
  sortOrder: number
  date: string
  weekOf: string
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

export interface WorkSession {
  id: number
  date: string
  clockedInAt: string | null
  clockedOutAt: string | null
  createdAt: string
}
