// import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Routes, Route } from 'react-router-dom'
// import ProtectedRoute from './components/protected-route/ProtectedRoute.jsx'

import { useState } from 'react'
import './App.css'
import Layout from './components/layout/Layout.jsx'
import Home from './pages/home/Home.jsx'
import Catalog from './pages/catalog/Catalog.jsx'

function App() {
  return (
      <Routes>
        {/* <Route path='/' element={<Auth /> /> */}

        <Route path='/' element={<Layout />} > 
          <Route index element={<Home />} />
          <Route path='/catalog' element={<Catalog />} />

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