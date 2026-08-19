import Preview from '../../sections/preview/Preview.jsx'
import {PopularCategories} from '../../sections/popular-categories/PopularCategories.jsx'
import Courses from '../../sections/courses/Courses.jsx'
import { Features } from '../../sections/features/Features.jsx'
import AIHelper from '../../sections/ai-helper/AIHelper.jsx'
import BecomeAuthor from '../../sections/become-author/BecomeAuthor.jsx'
import { Review } from '../../sections/rewiew/Review.jsx'
import { whyVexaCards } from '../../../data/featureCards.js'

const Main = () => {
  return (
    <main>
      <Preview />
      <PopularCategories />
      <Courses />
      <BecomeAuthor />
      <Features cards={whyVexaCards} />
      <AIHelper />
      <Review />
    </main>
  )
}

export default Main;