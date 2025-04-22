// router/index.js
import Landing from '../components/Landing.js';
import Tasks from '../components/Tasks.js';

const routes = [
  {
    path: '/',
    component: Landing,
    name: 'landing',
  },
  {
    path: '/:channelName',
    component: Landing,
    name: 'landingWithChannel',
    props: true,
  },
];

const router = VueRouter.createRouter({
  history: VueRouter.createWebHistory(),
  routes,
});

export default router;