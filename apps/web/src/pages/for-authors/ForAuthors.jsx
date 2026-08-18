import styles from './ForAuthors.module.css'
import { Container } from '../../components/layout/container/Container.jsx'
import Breadcrumbs from '../../components/ui/breadcrumbs/Breadcrumbs.jsx'
import { CardList } from './CardList.jsx'
import { whyBecomeAuthorCards, howItWorksCards, whatPublishingCards, whatCanPublishingCards } from '../../data/featureCards.js'
import { Title } from '../../components/ui/title/Title.jsx'
import { authorsReviewCards } from '../../data/authorsReview.js'
import Preview from '../../assets/images/for-authors-images/preview.png'

import Button from '../../components/ui/buttons/Button.jsx'

import groups from '../../assets/icons/for-authors-icons/groups.svg'
import user from '../../assets/icons/for-authors-icons/user.svg'
import library from '../../assets/icons/for-authors-icons/library.svg'
import paid from '../../assets/icons/for-authors-icons/paid.svg'

const ForAuthors = () => {
  return (
    <>
      <Container>
        <main className={styles.container}>
          <Breadcrumbs title='Головна' link='/' pages='Для авторів' />

          <div className={styles.row}>
            <div className={styles.info}>
              <h2>Перетворіть свої знання на дохід</h2>
              <p>Створюйте курси, продавайте навчальні матеріали та знаходьте тисячі учнів на платформі VEXA.</p>

              <div className={styles.bttnRow}>
                <Button title='Стати автором' variant='primary' size='medium'/>
                <Button title='Дізнатися більше' variant='secondary' size='medium'/>
              </div>

              <ul className={styles.infoList}>
                <li className={styles.infoItem}>
                  <img src={groups} alt='group of user icon' />
                  <div>
                    <span>5 000+</span> <br />
                    <span>активних студентів</span>
                  </div>
                </li>

                <li className={styles.infoItem}>
                  <img src={library} alt='library icon'/>
                  <div>
                    <span>1 200+</span> <br />
                    <span>курсів</span>
                  </div>
                </li>

                <li className={styles.infoItem}>
                  <img src={user} alt='user icon' />
                  <div>
                    <span>350+</span> <br />
                    <span>авторів</span>
                  </div>
                </li>

                <li className={styles.infoItem}>
                  <img src={paid} alt='paid icon' />
                  <div>
                    <span>₴2,5 млн+</span> <br />
                    <span>виплат авторам</span>
                  </div>
                </li>
              </ul>
            </div>

            <img src={Preview} alt='Preview image' />
          </div>

          <Title title='Чому варто стати автором VEXA' size='small' />
          <CardList cards={whyBecomeAuthorCards} variant='whyBecomeAuthor' />

          <Title title='Як це працює' size='small' />
          <CardList cards={howItWorksCards} variant='howItWorks' showArrow={true}/>

          <Title title='Що можна публікувати на VEXA' size='small' />
          <CardList cards={whatPublishingCards} beforeLast variant='whatPublishing' showArrow={false}/>
        </main>
      </Container>

      <section className={styles.section}>
        <Container>
          <Title title='Що можна публікувати на VEXA' size='small' />
          <CardList cards={whatCanPublishingCards} last variant='whatCanPublishing' showArrow={false}/>
        </Container>
      </section>

      <section className={styles.sectionReview}>
        <Container>
          <Title title='Що кажуть наші автори' size='small' />
          <CardList cards={authorsReviewCards} review beforeLast/>
        </Container>
      </section>
    </>
  )
}

export default ForAuthors;