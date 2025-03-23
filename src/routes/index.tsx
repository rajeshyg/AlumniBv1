import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy } from 'react';
import { AppLayout } from '../components/layout/AppLayout';

// Lazy-loaded route components
const Home = lazy(() => import('../pages/Home'));
const Posts = lazy(() => import('../pages/Posts'));
const Profile = lazy(() => import('../pages/Profile'));
const Settings = lazy(() => import('../pages/Settings'));
const NotFound = lazy(() => import('../pages/NotFound'));
const Login = lazy(() => import('../pages/Login')); // Add Login page

export const router = createBrowserRouter([
  // Root redirect to login
  {
    path: '/',
    element: <Navigate to="/login" replace />,
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
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);