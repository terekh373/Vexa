import styles from './Header.module.css';
import { Logo } from '../../ui/logo/Logo.jsx'
import { Search } from '../../ui/search/Search.jsx'
import Button from '../../ui/buttons/Button.jsx'
import {Container} from '../container/Container.jsx';

const Header = () => {
  return (
    <>
      <header className={styles.header}>
      <Container>
        <div className={styles.container}>
          <Logo />
          <ul className={styles.list}>
            <li>
              <a>Каталог курсів</a>
            </li>
            <li>
              <a>Для авторів</a>
            </li>
            <li>
              <a>Vexa AI</a>
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