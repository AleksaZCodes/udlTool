import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import RecordingView from '@/views/RecordingView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: 'udltool/',
      name: 'home',
      component: HomeView
    },
    {
      path: 'udltool/recording',
      name: 'recording',
      component: RecordingView
    }
  ]
})

export default router
