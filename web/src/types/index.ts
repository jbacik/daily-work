export interface WorkItem {
  id: number
  title: string
  category: 'BigThing' | 'SmallThing'
  isDone: boolean
  date: string
  weekOf: string
}

export interface ReadWatchItem {
  id: number
  title: string
  url: string
  type: 'read' | 'watch' | 'learn'
  isDone: boolean
  isActive?: boolean
  date: string
}
