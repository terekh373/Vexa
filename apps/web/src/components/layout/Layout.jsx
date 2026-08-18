import Header from './header/Header.jsx'
import Main from './main/Main.jsx'
import Footer from './footer/Footer.jsx'
import Newsletter from '../sections/newsletter/Newsletter.jsx'
import { Outlet } from 'react-router-dom'

const Layout = () => {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <Newsletter />
      <Footer />
    </>
  )
}

export default Layout;