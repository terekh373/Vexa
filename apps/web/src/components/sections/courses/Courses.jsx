import styles from './Courses.module.css'
import { Container } from '../../layout/container/Container'
import { OpenMore } from '../../ui/openmore/OpenMore'
import CourseCard from '../../ui/cards/course-card/CourseCard.jsx'
import courses from '../../../data/courses.json'

import course01 from '../../../assets/images/img01.png'
import course02 from '../../../assets/images/img02.png'
import course03 from '../../../assets/images/img03.png'
import course04 from '../../../assets/images/img04.png'
import course05 from '../../../assets/images/img05.png'
import course06 from '../../../assets/images/img05.png'
import course07 from '../../../assets/images/img04.png'
import course08 from '../../../assets/images/img03.png'
import course09 from '../../../assets/images/img02.png'
import course10 from '../../../assets/images/img01.png'

const images = [
  course01,
  course02,
  course03,
  course04,
  course05,
  course06,
  course07,
  course08,
  course09,
  course10,
]

const Courses = () => {
  const cards = courses.map((course, index) => ({
    ...course,
    image: images[index],
  }));

  const recommendedCourses = cards.slice(0, 5);

  const newCourses = cards.filter((card) => card.isNew).slice(0, 5);

  return (
    <Container>
      <section className={styles.container}>
        <div className={styles.box}> 
          <OpenMore title='Рекомендовані курси' bttnTxt='Всі категорії'/>
          <ul className={styles.cardlist}>
            {recommendedCourses.map((card) => (
              <li key={card.id}><CourseCard card={card} key={card.id}/></li>
            ))}
          </ul>
        </div>

        <div className={styles.box}> 
          <OpenMore title='Нові курси' bttnTxt='Всі категорії'/>
           <ul className={styles.cardlist}>
            {newCourses.map((card) => (
              <li key={card.id}>
                <CourseCard card={card} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </Container>
  )
}

export default Courses;