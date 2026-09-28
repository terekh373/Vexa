import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Container } from '../../../components/layout/container/Container.jsx';
import { Search } from '../../../components/ui/search/Search.jsx';
import Breadcrumbs from '../../../components/ui/breadcrumbs/Breadcrumbs.jsx';

import styles from './Blog.module.css';
import img01 from '../../../assets/images/blog/img01.png'
import img02 from '../../../assets/images/blog/img02.png'
import img03 from '../../../assets/images/blog/img03.png'
import img04 from '../../../assets/images/blog/img04.png'
import img05 from '../../../assets/images/blog/img05.png'
import img06 from '../../../assets/images/blog/img06.png'
import img07 from '../../../assets/images/blog/img07.png'
import clock from '../../../assets/images/blog/clock.svg'

const categories = [
  'Усі',
  'Освіта',
  'Кар’єра',
  'Технології',
  'Новини',
];

const posts = [
  {
    id: 1,
    category: 'Освіта',
    title: 'Як обрати свій перший онлайн-курс',
    date: '15 серпня 2026',
    time: '5 хв',
    image: img02,
  },
  {
    id: 2,
    category: 'Розвиток',
    title: 'Як вчитися ефективно: 5 порад від експертів',
    date: '8 серпня 2026',
    time: '6 хв',
    image: img03,
  },
  {
    id: 3,
    category: 'Кар’єра',
    title: 'Тренди в онлайн-освіті у 2026 році',
    date: '2 серпня 2026',
    time: '4 хв',
    image: img04,
  },
  {
    id: 4,
    category: 'Поради',
    title: 'Переваги навчання для дорослих',
    date: '27 липня 2026',
    time: '7 хв',
    image: img05,
  },
  {
    id: 5,
    category: 'Кар’єра',
    title: 'Як створити успішний освітній курс',
    date: '21 липня 2026',
    time: '5 хв',
    image: img06,
  },
  {
    id: 6,
    category: 'Новини',
    title: 'Історії успіху наших авторів',
    date: '15 липня 2026',
    time: '5 хв',
    image: img07,
  },
];

const Blog = () => {
  const [activeCategory, setActiveCategory] = useState('Усі');
  const [search, setSearch] = useState('');

  const filteredPosts = posts.filter((post) => {
    const matchesCategory =
      activeCategory === 'Усі' || post.category === activeCategory;

    const matchesSearch =
      post.title.toLowerCase().includes(search.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <section className={styles.blog}>
      <Container>
        <Breadcrumbs title='Головна' link='/' pages='Блог' />

        <div className={styles.hero}>
          <div className={styles.heroContent}>
            <h1>Блог</h1>
            <p>Корисні статті, новини та інсайти зі світу освіти і розвитку.</p>

            <div className={styles.search}>
              <Search
                size="large"
                placeholder="Пошук у блозі"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className={styles.categories}>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={
                    activeCategory === category
                      ? styles.categoryActive
                      : styles.category
                  }
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.heroImage}>
            <img
              src={img01}
              alt="Навчання онлайн"
            />
          </div>
        </div>

        <div className={styles.grid}>
          {filteredPosts.map((post) => (
            <article className={styles.card} key={post.id}>
              <Link to={`/blog/${post.id}`} className={styles.imageLink}>
                <img src={post.image} alt="" />
                 <span className={styles.tag}>
                  {post.category}
                </span>
              </Link>

              <div className={styles.cardBody}>
               

                <Link
                  to={`/blog/${post.id}`}
                  className={styles.title}
                >
                  {post.title}
                </Link>

                <div className={styles.meta}>
                  <span>{post.date}</span>

                  <span className={styles.time}>
                    <img src={clock} alt='clock icon' />
                    {post.time}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
};

export default Blog;