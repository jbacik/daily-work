export interface WorkItem {
  id: number
  title: string
  category: 'BigThing'
  isDone: boolean
  date: string
}

export interface DailyTask {
  id: number
  title: string
  isDone: boolean
  day: number // 0-4 for Mon-Fri
  weekOf: string
}

export interface ReadWatchItem {
  id: number
  title: string
  url: string
  type: 'read' | 'watch' | 'learn'
  isDone: boolean
  date: string
}
