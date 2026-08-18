// import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Routes, Route } from 'react-router-dom'
// import ProtectedRoute from './components/protected-route/ProtectedRoute.jsx'

import { useState } from 'react'
import './App.css'
import Layout from './components/layout/Layout.jsx'
import Home from './pages/home/Home.jsx'
import Catalog from './pages/catalog/Catalog.jsx'
import ForAuthors from './pages/for-authors/ForAuthors.jsx'

function App() {
  return (
      <Routes>
        {/* <Route path='/' element={<Auth /> /> */}

        <Route path='/' element={<Layout />} > 
          <Route index element={<Home />} />
          <Route path='catalog' element={<Catalog />} />
          <Route path='for-authors' element={<ForAuthors />} />
          {/* <Route path='vexa-ai' element={<VexaAI />} /> */}

          {/* <Route path='/profile' element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>} 
          /> */}
        
        </Route>
      </Routes>
  )
}

export default App;