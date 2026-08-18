import styles from './ForAuthors.module.css'
import { Container } from '../../components/layout/container/Container.jsx'
import Breadcrumbs from '../../components/ui/breadcrumbs/Breadcrumbs.jsx'
import { CardList } from './CardList.jsx'
import { whyBecomeAuthorCards, howItWorksCards, whatPublishingCards, whatCanPublishingCards } from '../../data/featureCards.js'
import { Title } from '../../components/ui/title/Title.jsx'

const ForAuthors = () => {
  return (
    <>
      <Container>
        <main className={styles.container}>
          <Breadcrumbs title='Головна' link='/' pages='Для авторів' />
          <Title title='Чому варто стати автором VEXA' size='small' />
          <CardList cards={whyBecomeAuthorCards} variant='whyBecomeAuthor' />

          <Title title='Як це працює' size='small' />
          <CardList cards={howItWorksCards} variant='howItWorks' showArrow={true}/>

          <Title title='Що можна публікувати на VEXA' size='small' />
          <CardList cards={whatPublishingCards} last={true} variant='whatPublishing' showArrow={false}/>
        </main>
      </Container>

      <section className={styles.section}>
        <Container>
          <Title title='Що можна публікувати на VEXA' size='small' />
          <CardList cards={whatCanPublishingCards} last={true} variant='whatCanPublishing' showArrow={false}/>
        </Container>
      </section>

      <section className={styles.sectionReview}>
        <Container>
          <Title title='Що кажуть наші автори' size='small' />
          <CardList cards={whatCanPublishingCards} last={true} variant='whatCanPublishing' showArrow={false}/>
        </Container>
      </section>
    </>
  )
}

export default ForAuthors;