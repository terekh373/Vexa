import { Routes, Route } from 'react-router-dom'
import './App.css'
import Layout from './components/layout/Layout.jsx'
import Home from './pages/Home.jsx'
import VexaAI from './pages/VexaAI.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

function App() {
  return (

    <AuthProvider>
      <Routes>
        <Route path='/' element={<Layout />} > 
          <Route index element={<Home />} />
          <Route path='vexa-ai' element={<VexaAI />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App;