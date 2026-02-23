import { createRouter, createWebHistory } from 'vue-router'
import DailyBoard from './views/DailyBoard.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: DailyBoard },
  ],
})

export default router
