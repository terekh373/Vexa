import styles from './ForVeterans.module.css'
import { Container } from '../../../components/layout/container/Container'
import forVeteransImg from '../../../assets/images/for-veterans.png'
import forVeteransImg02 from '../../../assets/images/for-veterans-2.png'
import Button from '../../../components/ui/buttons/Button.jsx'
import Breadcrumbs from '../../../components/ui/breadcrumbs/Breadcrumbs.jsx'
import { ForVeteransFeatures } from '../../../data/featureCards.js'

export const ForVeterans = () => {

  const list = ForVeteransFeatures;

  return (
    <Container>
      <main className={styles.container}>
      <Breadcrumbs title='Головна' link='/' pages='Для ветеранів' />
        <div className={styles.row}>
          <div className={styles.titleBoxInfo}>
            <h2>Платформа можливостей для тих, хто захищає Україну</h2>
            <p>Ми підтримуємо ветеранів та їхні родини, надаючи доступ до якісної освіти, розвитку та нових професійних можливостей.</p>
            <Button title='Дізнатися більше' variant='primary' />
          </div>

          <img src={forVeteransImg} alt='veterans image'  className={styles.rowImg} />
        </div>

        <div className={styles.featuresBox}>
          <h3>Можливості для ветеранів</h3>

          <div className={styles.rowFeatures}>
            {list.map((item, index) => (
              <div className={styles.card} key={item.id ?? item.title ?? index}>
                <img src={item.image} alt={item.imageAlt} />
                <h3>{item.title}</h3>
                <p>{item.subtitle}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.row}>
          <img src={forVeteransImg02} alt='vateran image' className={styles.rowImg} />
          <div className={styles.titleBoxInfo}>
            <h2>Разом створюємо краще майбутнє</h2>
            <p>Освіта. Розвиток. Можливості.</p>
            <Button title='Перейти до курсів' variant='primary' />
          </div>
        </div>

      </main>
    </Container>
  )
};