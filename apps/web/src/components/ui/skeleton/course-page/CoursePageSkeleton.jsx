import styles from './CoursePageSkeleton.module.css';

const CoursePageSkeleton = () => {
  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb} />

      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.lineLarge} />
          <div className={styles.line} />
          <div className={styles.line} />

          <div className={styles.stats}>
            <div className={styles.stat} />
            <div className={styles.stat} />
            <div className={styles.stat} />
            <div className={styles.stat} />
          </div>

          <div className={styles.author}>
            <div className={styles.avatar} />

            <div>
              <div className={styles.lineSmall} />
              <div className={styles.lineSmall} />
            </div>
          </div>
        </div>

        <div className={styles.price}>
          <div className={styles.priceLine} />
          <div className={styles.button} />
          <div className={styles.button} />
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.title} />
        <div className={styles.line} />
        <div className={styles.line} />
        <div className={styles.lineShort} />
      </div>

      <div className={styles.section}>
        <div className={styles.title} />

        <div className={styles.module} />
        <div className={styles.module} />
        <div className={styles.module} />
      </div>
    </div>
  );
};

export default CoursePageSkeleton;