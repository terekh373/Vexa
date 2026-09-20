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
import ForgotPasswordPage from './pages/forgot-password/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/reset-password/ResetPasswordPage.jsx';
import Settings from './pages/settings/Settings.jsx';
import NotFound from './pages/not-found/NotFound.jsx';
import ComingSoon from './pages/stubs/ComingSoon.jsx';
import AuthorCourses from './pages/author-courses/AuthorCourses.jsx';
import CourseWizard from './pages/author/course-wizard/CourseWizard.jsx';
import CheckoutSuccess from './pages/checkout-success/CheckoutSuccess.jsx';
import { ForVeterans } from './pages/footer/for-veterans-page/ForVeterans.jsx';
import { Questions } from './pages/footer/faq/Questions.jsx';
import Blog from './pages/footer/blog/Blog.jsx';
import About from './pages/footer/about/About.jsx';
import Contacts from './pages/footer/contacts/Contacts.jsx';
import Categories from './pages/categories/Categories.jsx';

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
          <Route path={routePatterns.forgotPassword} element={<ForgotPasswordPage />} />
        <Route path={routePatterns.resetPassword} element={<ResetPasswordPage />} />

        {/* сделать роутинг */}
        <Route path="/veterans" element={<ForVeterans />} />
        <Route path="/faq" element={<Questions />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/about" element={<About />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/authors" element={<About />} />
        <Route path="/ai" element={<VexaAi />} />
        <Route path="/vacancies" element={<ComingSoon />} />
        <Route path="/press" element={<ComingSoon />} />

        <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
          <Route path={routePatterns.learning} element={<ComingSoon title="Моє навчання" />} />
          <Route path={routePatterns.orders} element={<ComingSoon title="Замовлення" />} />
          <Route path={routePatterns.settings} element={<Settings />} />
          <Route path={routePatterns.checkoutSuccess} element={<CheckoutSuccess />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['AUTHOR']} />}>
          <Route path={routePatterns.authorCourses} element={<AuthorCourses />} />
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