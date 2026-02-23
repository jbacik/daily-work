export interface WorkItem {
  id: number
  title: string
  category: 'BigThing' | 'SmallThing'
  isDone: boolean
  date: string
}

export interface ReadWatchItem {
  id: number
  title: string
  url: string
  isDone: boolean
  date: string
}
