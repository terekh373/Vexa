import styles from './ComingSoon.module.css';

const ComingSoon = ({
  title = 'Розділ у розробці',
  description = 'Ця частина платформи зʼявиться в одному з наступних спринтів. Слідкуйте за оновленнями.',
}) => {
  return (
    <section className={styles.container}>
      <div className={styles.badge}>Незабаром</div>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>{description}</p>
    </section>
  );
};

export default ComingSoon;
