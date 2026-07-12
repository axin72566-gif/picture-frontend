import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const publicAuthRoutes = new Set(['/login', '/register'])

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../pages/index.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../pages/user/LoginPage.vue'),
      meta: { guestLayout: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../pages/user/RegisterPage.vue'),
      meta: { guestLayout: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../pages/user/ProfilePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: () => import('../pages/notification/NotificationPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/user/:id/followers',
      name: 'user-followers',
      component: () => import('../pages/user/UserFollowPage.vue'),
    },
    {
      path: '/user/:id/following',
      name: 'user-following',
      component: () => import('../pages/user/UserFollowPage.vue'),
    },
    {
      path: '/user/:id',
      name: 'creator-profile',
      component: () => import('../pages/user/CreatorProfilePage.vue'),
    },
    {
      path: '/my-pictures',
      name: 'my-pictures',
      redirect: '/profile',
    },
    {
      path: '/upload',
      name: 'picture-upload',
      component: () => import('../pages/picture/UploadPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return {
      path: '/login',
      query: to.fullPath === '/' ? undefined : { redirect: to.fullPath },
    }
  }

  if (publicAuthRoutes.has(to.path) && auth.isAuthenticated) {
    return '/'
  }
})

export default router
