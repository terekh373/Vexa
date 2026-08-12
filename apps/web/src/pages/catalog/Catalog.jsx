import styles from './Catalog.module.css'
import { Container } from "../../components/layout/container/Container";
import Breadcrumbs from '../../components/ui/breadcrumbs/Breadcrumbs';
import { Search } from '../../components/ui/search/Search';
import Dropdown from '../../components/ui/dropdown/Dropdown';

const Catalog = () => {
  return (
    <Container>
      <section className={styles.container}>
        <Breadcrumbs />
        <h2 className={styles.title}>Каталог курсів</h2>
        <p className={styles.subtitle}>Знайди курс, який допоможе тобі розвиватися та досягати нових вершин</p>
        <div className={styles.row}>
          <Search size='large' />
          <Dropdown 
            label='Сортування'
            options={[
              {value: 'Популярні', label: 'Популярні'},
              {value: 'Не Популярні', label: 'Не Популярні'},
              {value: 'Помірно Популярні', label: 'Помірно Популярні'},
            ]}
          />
        </div>

        
      </section>
    </Container>
  )
}

export default Catalog;