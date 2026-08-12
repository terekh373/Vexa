import React from 'react';
import styles from './VexaAI.module.css';
import { Container } from '../components/layout/container/Container.jsx';
import Button from '../components/ui/buttons/Button.jsx';
import robotImage from '../assets/images/robot.png';

const features = [
  { icon: '💬', title: 'AI-помічник', text: 'Поставте будь-яке запитання про навчання, викладання, предмети чи технології і AI підкаже відповіді.' },
  { icon: '📄', title: 'Генерація контенту', text: 'Створюйте конспекти, плани, презентації, тести, завдання та інші матеріали за кілька секунд.' },
  { icon: '💡', title: 'Ідеї для курсів', text: 'Шукайте теми, структуруйте курси, створюйте програми навчання разом з AI за лічені хвилини без зусиль.' },
  { icon: '✔️', title: 'Перевірка та аналіз', text: 'AI перевіряє тексти, знаходить помилки, покращує формулювання та надає рекомендації.' },
  { icon: '🌍', title: 'Переклад і адаптація', text: 'Перекладайте тексти, адаптуйте контент під різні аудиторії та рівні складності максимально точно.' },
  { icon: '✨', title: 'Персональні поради', text: 'Отримуйте індивідуальні рекомендації для навчання та розвитку навичок.' }
];

const steps = [
  { num: '1', icon: '👤', title: 'Поставте запитання або оберіть інструмент', text: 'Опишіть, що вам потрібно, або виберіть готовий шаблон одним кліком.' },
  { num: '2', icon: '✨', title: 'AI миттєво обробляє запит', text: 'VEXA AI аналізує інформацію та генерує найкращий результат відповідно до запиту.' },
  { num: '3', icon: '📄', title: 'Отримуйте готовий результат', text: 'Готовий контент, відповідь чи рекомендації миттєво за вашим запитом.' },
  { num: '4', icon: '🎓', title: 'Використовуйте та вдосконалюйте', text: 'Застосовуйте результат у навчанні або викладайте та розвивайтесь.' }
];

const audience = [
  { title: 'Студенти', text: 'Знаходьте відповіді, розбирайте складні теми та готуйтеся до іспитів.' },
  { title: 'Викладачі', text: 'Створюйте якісні матеріали, плани уроків та завдання за допомогою AI.' },
  { title: 'Автори курсів', text: 'Генеруйте ідеї, структуруйте курси та створюйте контент швидше.' },
  { title: 'Репетитори', text: 'Пояснюйте складне простими словами та знаходьте нові підходи до навчання.' },
  { title: 'Професіонали', text: 'Підвищуйте кваліфікацію та отримуйте актуальні знання у своїй сфері.' },
  { title: 'Батьки', text: 'Допомагайте дітям навчатися, знаходьте матеріали та підтримуйте розвиток.' }
];

const VexaAI = () => {
  return (
    <div className={styles.pageWrapper}>
      <Container>
        
        <div className={styles.breadcrumbs}>
          <span>Головна</span> / <span className={styles.activeBreadcrumb}>Vexa AI</span>
        </div>

        <section className={styles.hero}>
          <div className={styles.heroTextContent}>
            <h1 className={styles.mainTitle}>
              VEXA AI - Ваш розумний помічник<br />у навчанні та викладанні
            </h1>
            <p className={styles.heroSubtitle}>
              Штучний інтелект, який допомагає навчатися ефективніше, створювати якісний контент і економити час.
            </p>
            <div className={styles.heroButtons}>
              <Button title="Спробувати безкоштовно" />
              <button className={styles.outlineBtn}>Дізнатися більше</button>
            </div>
            <p className={styles.heroNote}>
              👤 Доступно всім користувачам VEXA
            </p>
          </div>
          
          <div className={styles.heroImageWrap}>
            <img src={robotImage} alt="Vexa AI Robot" className={styles.robotImage} />
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Можливості VEXA</h2>
          <div className={styles.grid6}>
            {features.map((item, index) => (
              <div key={index} className={styles.featureCard}>
                <div className={styles.iconWrap}>{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Як це працює</h2>
          <div className={styles.stepsContainer}>
            {steps.map((step, index) => (
              <React.Fragment key={index}>
                <div className={styles.stepCard}>
                  <div className={styles.stepHeader}>
                    <span className={styles.stepNum}>{step.num}</span>
                    <span className={styles.stepIcon}>{step.icon}</span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className={styles.stepArrow}>➔</div>
                )}
              </React.Fragment>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Для кого VEXA AI</h2>
          <div className={styles.grid6}>
            {audience.map((item, index) => (
              <div key={index} className={styles.audienceCard}>
                <div className={styles.audiencePhotoPlaceholder}>Фото</div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </section>

      </Container>
    </div>
  );
};

export default VexaAI;