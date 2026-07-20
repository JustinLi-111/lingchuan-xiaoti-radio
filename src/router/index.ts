import { createRouter, createWebHistory } from 'vue-router'
import EntryPage from '@/views/EntryPage.vue'
import HomePage from '@/views/HomePage.vue'
import ArchivePage from '@/views/ArchivePage.vue'
import MailboxPage from '@/views/MailboxPage.vue'
import MomentsPage from '@/views/MomentsPage.vue'

const routes = [
  {
    path: '/',
    name: 'entry',
    component: EntryPage,
  },
  {
    path: '/home',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/archive',
    name: 'archive',
    component: ArchivePage,
  },
  {
    path: '/mailbox',
    name: 'mailbox',
    component: MailboxPage,
  },
  {
    path: '/moments',
    name: 'moments',
    component: MomentsPage,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
