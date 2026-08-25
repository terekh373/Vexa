import styles from './Course.module.css'
import { useParams } from 'react-router-dom';

import { Container } from '../../components/layout/container/Container';
import Breadcrumbs from '../../components/ui/breadcrumbs/Breadcrumbs';

import Clock from '../../assets/icons/Clock.svg'
import Book from '../../assets/icons/Book-2.svg'
import Star from '../../assets/icons/star.svg'
import Group from '../../assets/icons/for-authors-icons/groups.svg'

import InfoBg from '../../assets/images/for-course-images/course-info-bg.png'
import authorAvatar from '../../assets/images/for-course-images/author-avatar.png'
import checkingIcon from '../../assets/icons/checking.svg'

import Button from '../../components/ui/buttons/Button';

const Course = () => {
  const { idOrSlug } = useParams();
  console.log(idOrSlug);

  return (
    <Container>
      <main className={styles.container}>
      <Breadcrumbs title='Головна' link='/' pages='Нові курси / 3D Моделювання' />

      <div className={styles.courseRow}>
        <div className={styles.courseMainInfo} style={{ backgroundImage: `url(${InfoBg})`}}>
          <h2 className={styles.title}>3D-моделювання у Blender</h2>
          <p>Навчіться створювати професійні 3D-моделі з нуля та оживляти свої ідеї у Blender.</p>
          <ul className={styles.listCoursePage}>
            <li className={styles.itemCoursePage}>
              <img src={Star} alt='star icon' />
              <span>4.9 (244 відгуків)</span>
            </li>
            <li className={styles.itemCoursePage}>
              <img src={Group} alt='group icon' />
              <span>1 250 студентів</span>
            </li>
            <li className={styles.itemCoursePage}>
              <img src={Clock} alt='clock icon' />
              <span>28 годин</span>
            </li>
            <li className={styles.itemCoursePage}>
              <img src={Book} alt='book icon' />
              <span>42 уроки</span>
            </li>
          </ul>

          <div className={styles.author}>
            <img src={authorAvatar} alt='author avatar'/>
            <div>
              <span>Олена Коваль</span>
              <span>3D-художниця та викладачка</span>
            </div>
          </div>

        </div>
        
        <div className={styles.coursePriceInfo}>
          <div className={styles.coursePrice}>
            <span>$56.00</span>
            <span>$79.00</span>
            <span>-29%</span>
          </div>
          <div className={styles.courseRowBttn}>
            <Button title='Придбати курс' variant='primary' size='medium' />
            <Button title='Додати в обране' variant='secondary' size='medium' />
          </div>
          <ul className={styles.priorityList}>
            <li>
              <div className={styles.checkBox}><img src={checkingIcon} alt='check icon'/></div>
              <span>Доступ назавжди</span>
            </li>

            <li>
              <div className={styles.checkBox}><img src={checkingIcon} alt='check icon'/></div>
              <span>Доступ на мобільних пристроях</span>
            </li>

            <li>
              <div className={styles.checkBox}><img src={checkingIcon} alt='check icon'/></div>
              <span>Сертифікат після завершення</span>
            </li>

            <li>
              <div className={styles.checkBox}><img src={checkingIcon} alt='check icon'/></div>
              <span>Повернення протягом 14 днів</span>
            </li>
          </ul>
          <p>Без ризику. 14 днів на повернення коштів.</p>
        </div>
      </div>

      <section className={styles.aboutCourseBox}>
        <div className={styles.courseDetails}>
          <ul>
            <li>Про курс</li>
            <li>Програма</li>
            <li>Автор</li>
            <li>Відгуки</li>
            <li>Питання та відповіді</li>
          </ul>

          <div className={styles.about}>
            <h3>Про курс</h3>
            <h4>Blender - це потужний безкоштовний інструмент для створення 3D-графіки та візуалізації.</h4>
            <p>На цьому курсі ви з нуля опануєте основи роботи в Blender: розберетеся з інтерфейсом, навчитеся створювати та редагувати 3D-об'єкти, працювати з матеріалами, освітленням і камерою.
            Ви пройдете весь шлях від перших кроків до створення власних 3D-сцен та їх рендерингу. Курс підійде як новачкам, так і тим, хто хоче систематизувати свої знання та впевненіше працювати з 3D.
            </p>

          </div>
        </div>

        <div className={styles.courseInfo}>
        </div>

      </section>
      </main>
    </Container>
  )
};

export default Course;