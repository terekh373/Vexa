import { Route, Routes } from 'react-router-dom';
import { routePatterns, routes } from '@vexa/shared';

import './App.css';
import Layout from './components/layout/Layout.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import Home from './pages/home/Home.jsx';
import Catalog from './pages/catalog/Catalog.jsx';
import ForAuthors from './pages/for-authors/ForAuthors.jsx';
import Course from './pages/course/Course.jsx';
import VexaAI from './pages/vexa-ai/VexaAI.jsx';
import LoginPage from './pages/login/LoginPage.jsx';
import RegisterPage from './pages/register/RegisterPage.jsx';
import VerifyEmailPage from './pages/verify-email/VerifyEmailPage.jsx';
import NotFound from './pages/not-found/NotFound.jsx';
import ComingSoon from './pages/stubs/ComingSoon.jsx';
import CourseWizard from './pages/author/course-wizard/CourseWizard.jsx';

function App() {
  return (
    <Routes>
      <Route path={routePatterns.home} element={<Layout />}>
        <Route index element={<Home />} />
        <Route path={routePatterns.catalog} element={<Catalog />} />
        <Route path={routePatterns.forAuthors} element={<ForAuthors />} />
        <Route path={routePatterns.course} element={<Course />} />
        <Route path={routePatterns.vexaAi} element={<VexaAI />} />
        <Route path={routePatterns.login} element={<LoginPage />} />
        <Route path={routePatterns.register} element={<RegisterPage />} />
        <Route path={routePatterns.verifyEmail} element={<VerifyEmailPage />} />

        <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
          <Route path={routePatterns.learning} element={<ComingSoon title="Моє навчання" />} />
          <Route path={routePatterns.orders} element={<ComingSoon title="Замовлення" />} />
          <Route path={routePatterns.settings} element={<ComingSoon title="Налаштування" />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['AUTHOR']} />}>
          <Route path={routes.authorCourseNew()} element={<CourseWizard />} />
          <Route path={routePatterns.authorCourseEdit} element={<CourseWizard />} />
          <Route path={routePatterns.authorArea} element={<ComingSoon title="Кабінет автора" />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route path={routePatterns.adminArea} element={<ComingSoon title="Адмін-панель" />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
