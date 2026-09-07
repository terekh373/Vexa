import { Routes, Route } from 'react-router-dom'
import { routePatterns } from '@vexa/shared';

import './App.css'
import Layout from './components/layout/Layout.jsx'
import Home from './pages/home/Home.jsx'
import Catalog from './pages/catalog/Catalog.jsx'
import ForAuthors from './pages/for-authors/ForAuthors.jsx'
import Course from './pages/course/Course.jsx'
import VexaAI from './pages/vexa-ai/VexaAI.jsx';
import NotFound from './pages/not-found/NotFound.jsx'

function App() {
  return (
      <Routes>
        <Route path={routePatterns.home} element={<Layout />} > 
          <Route index element={<Home />} />
          <Route path={routePatterns.catalog} element={<Catalog />} />
          <Route path={routePatterns.forAuthors} element={<ForAuthors />} />
          <Route path={routePatterns.course} element={<Course />} />
  
          <Route path={routePatterns.vexaAi} element={<VexaAI />} />
          <Route path='*' element={<NotFound />} />
        </Route>
      </Routes>
  )
};

export default App;