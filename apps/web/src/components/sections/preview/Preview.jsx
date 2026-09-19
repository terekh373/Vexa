import styles from './Preview.module.css'
import {Container} from '../../layout/container/Container.jsx';
import heroVisual from '../../../assets/images/hero-visual.png'

import Button from '../../ui/buttons/Button.jsx';

const Preview = () => {
  return (  
      <Container>
       <section className={styles.container}>
        <div className={styles.description}>
          <h2>Навчайся</h2>
          <h2>Розвивайся</h2>
          <h2>Досягай</h2>

          <p>
            Створюйте власні курси, діліться знаннями, <br />
            знаходьте якісне навчання, <br />
            Vexa — платформа, що об'єднує авторів і тих, хто прагне навчатися.
          </p>

          <div className={styles.row}>
            <Button title='Знайти курси' variant='primary' size='medium' />
            <Button title='Стати автором' variant='secondary' size='medium' />
          </div>
        </div>

        <div className={styles.img}>
          <img src={heroVisual} alt='hero visual'/>
        </div>
       </section>
      </Container>
  )
}

export default Preview;