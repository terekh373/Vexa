import styles from './CourseGrid.module.css'
import CourseCard from '../cards/course-card/CourseCard';

const CourseGrid = ({ courses }) => {
  return (
    <div className={styles.grid}>
      {courses.map((course) => (
        <CourseCard
          key={course.id}
          card={course}
        />
      ))}
    </div>
  )
}

export default CourseGrid;