import styles from './AIHelper.module.css'
import { Container } from '../../layout/container/Container';
import robot from '../../../assets/images/robot.png'


const AIHelper = () => (
  <Container>
    <section className={styles.container}>
      <div className={styles.descriptionContainer}>
        <h2>VEXA AI — ваш розумний помічник у навчанні</h2>
        <p className={styles.intro}>Отримуйте персональні рекомендації, швидкі відповіді та підтримку на кожному етапі навчання. VEXA AI допоможе знайти потрібний курс, пояснить складні теми та зробить навчання ще ефективнішим.
        </p>

        <div>
          <h4>Персональні рекомендації</h4>
          <p>AI аналізує ваші інтереси та пропонує курси, які відповідають вашим цілям і рівню підготовки.</p>
        </div>
        <div>
          <h4>Миттєві відповіді</h4>
          <p>Швидко пояснює складні теми, допомагає знаходити потрібну інформацію та відповідає на запитання.</p>
        </div>
        <div>
          <h4>Навчання без перешкод</h4>
          <p>Підтримує ваш прогрес, допомагає планувати навчання та мотивує рухатися до результату.</p>
        </div>
      </div>
    <img src={robot} alt='ai robot image' className={styles.img} />      
    </section>
  </Container>
)

export default AIHelper;