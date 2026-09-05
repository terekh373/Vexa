import { Routes, Route } from 'react-router-dom';
import { routePatterns } from '@vexa/shared';

import './App.css';
import Layout from './components/layout/Layout.jsx';
import VerifyEmailPage from './pages/verify-email/VerifyEmailPage.jsx';
import Home from './pages/home/Home.jsx';
import Catalog from './pages/catalog/Catalog.jsx';
import ForAuthors from './pages/for-authors/ForAuthors.jsx';
import Course from './pages/course/Course.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import VexaAI from './pages/vexa-ai/VexaAI.jsx';
import LoginPage from './pages/login/LoginPage.jsx';
import RegisterPage from './pages/register/RegisterPage.jsx';
import RoleSelectionPage from './pages/role-selection/RoleSelectionPage.jsx';

import Profile from './pages/profile/Profile.jsx';
import { AuthProvider } from './context/AuthContext.jsx'; 

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path={routePatterns.home} element={<Layout />} > 

          <Route index element={<Home />} />
          <Route path={routePatterns.catalog} element={<Catalog />} />
          <Route path={routePatterns.forAuthors} element={<ForAuthors />} />
          <Route path={routePatterns.course} element={<Course />} />
          <Route path={routePatterns.vexaAi} element={<VexaAI />} />
          
          <Route path='register' element={<RegisterPage />} />
          <Route path='verify-email' element={<VerifyEmailPage />} />
          <Route path='role-selection' element={<RoleSelectionPage />} />
          <Route path='login' element={<LoginPage />} />
          
          <Route path='profile' element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />

          <Route path='learning' element={
            <ProtectedRoute>
              <div style={{ padding: '40px', textAlign: 'center' }}>Моє навчання (у розробці)</div>
            </ProtectedRoute>
          } />

          <Route path='orders' element={
            <ProtectedRoute>
              <div style={{ padding: '40px', textAlign: 'center' }}>Мої замовлення (у розробці)</div>
            </ProtectedRoute>
          } />

          <Route path='author' element={
            <ProtectedRoute>
              <div style={{ padding: '40px', textAlign: 'center' }}>Кабінет автора (у розробці)</div>
            </ProtectedRoute>
          } />

        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;