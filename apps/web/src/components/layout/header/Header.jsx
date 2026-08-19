import styles from './Header.module.css';
import { Logo } from '../../ui/logo/Logo.jsx'
import { Search } from '../../ui/search/Search.jsx'
import Button from '../../ui/buttons/Button.jsx'
import {Container} from '../container/Container.jsx';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <>
      <header className={styles.header}>
      <Container>
        <div className={styles.container}>
          <Logo />
          <ul className={styles.list}>
            <li>
              <Link to='/catalog' className={styles.link}>Каталог курсів</Link>
            </li>
            <li>
              <Link to='/for-authors' className={styles.link}>Для авторів</Link>
            </li>
            <li>
              <Link to='/vexa-ai' className={styles.link}>Vexa AI</Link>
            </li>
          </ul>

          <Search />

          <ul className={styles.list}>
            <Button title='Розпочати курс'/>
            <Button title='Мій простір'/>
          </ul>
        </div>
        </Container>
      </header>
    </>
  )
}

export default Header;