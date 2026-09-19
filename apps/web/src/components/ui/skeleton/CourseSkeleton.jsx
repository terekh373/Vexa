import styles from './CourseSkeleton.module.css'

const CourseSkeleton = () => {
  return (
    <div className={styles.card}>
      <div className={styles.image} />

      <div className={styles.content}>
        <div className={styles.line} />
        <div className={`${styles.line} ${styles.short}`} />
        <div className={styles.line} />
      </div>
    </div>
  )
}

export default CourseSkeleton;