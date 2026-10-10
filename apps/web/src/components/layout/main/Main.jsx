import Preview from '../../sections/preview/Preview.jsx'
import {PopularCategories} from '../../sections/popular-categories/PopularCategories.jsx'
import Courses from '../../sections/courses/Courses.jsx'
import { Features } from '../../sections/features/Features.jsx'
import BecomeAuthor from '../../sections/become-author/BecomeAuthor.jsx'
import { whyVexaCards } from '../../../data/featureCards.js'

const Main = () => {
  return (
    <main>
      <Preview />
      <PopularCategories />
      <Courses />
      <BecomeAuthor />
      <Features cards={whyVexaCards} />
    </main>
  )
}

export default Main;