import styles from './BecomeAuthor.module.css'
import { Container } from '../../layout/container/Container';
import img from '../../../assets/images/author.png'
import ToLessonButton from '../../ui/to-lesson-button/ToLessonButton.jsx'
import Button from '../../ui/buttons/Button';
import graduationIcon from '../../../assets/icons/school.svg'
import wallet from '../../../assets/icons/wallet.svg'

const BecomeAuthor = () => {
  return (
    <section className={styles.section}>
      <Container>
        <div className={styles.container}>
          <img src={img} alt='author photo' className={styles.img} />

          <div className={styles.content}>
            <h3>Стань автором</h3>
            <p>Створюйте та монетизуйте курси без рутини</p>
            <p>Створюйте власні курси, керуйте навчальними матеріалами та отримуйте дохід від їх продажу. VEXA надає всі необхідні інструменти для розвитку вашої аудиторії та монетизації знань.</p>

            <ToLessonButton
              title="Урок 1. Вступ до професії"
              subtitle="Відео • 15 хв • Тест"
              icon={graduationIcon}
              to="/lesson/1"
            />

            <ToLessonButton
              title="Ваш прибуток за місяць"
              subtitle="24 500 грн"
              icon={wallet}
              to="/lesson/2"
            />

            <Button title='Отримати прибуток' />
          </div>
        </div>
      </Container>
    </section>
  )
}

export default BecomeAuthor;