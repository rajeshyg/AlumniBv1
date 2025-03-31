import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import ProjectStatusViewer from '../project/ProjectStatusViewer';

// Lazy-loaded route components
const Home = lazy(() => import('../pages/Home'));
const Posts = lazy(() => import('../pages/Posts'));
const Profile = lazy(() => import('../pages/Profile'));
const Settings = lazy(() => import('../pages/Settings'));
const NotFound = lazy(() => import('../pages/NotFound'));
const Login = lazy(() => import('../pages/Login'));
const Admin = lazy(() => import('../pages/Admin'));
const ContentModeration = lazy(() => import('../pages/ContentModeration'));
const MyPosts = lazy(() => import('../pages/MyPosts'));
const PostReview = lazy(() => import('../pages/PostReview'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/home" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        path: 'home',
        element: <Home />,
      },
      {
        path: 'posts',
        element: <Posts />,
      },
      {
        path: 'profile',
        element: <Profile />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
      {
        path: 'admin',
        element: <Admin />,
      },
      {
        path: 'moderation',
        element: <ContentModeration />,
      },
      {
        path: 'my-posts',
        element: <MyPosts />,
      },
      {
        path: 'post-review',
        element: <PostReview />,
      },
      {
        path: 'project',
        element: <ProjectStatusViewer />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);