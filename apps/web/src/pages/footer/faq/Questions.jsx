import { useState } from 'react';
import styles from './Questions.module.css';
import { Container } from '../../../components/layout/container/Container.jsx';
import Breadcrumbs from '../../../components/ui/breadcrumbs/Breadcrumbs.jsx';
import { Search } from '../../../components/ui/search/Search.jsx';
import Button from '../../../components/ui/buttons/Button.jsx';
import robotImg from '../../../assets/images/robot-02.png';
import { Features } from '../../../data/footer-question.js';
import LetterIcon from '../../../assets/icons/msg.svg'

const questions = [
  {
    id: 1,
    title: 'Як зареєструватися на платформі?',
    text: 'Щоб створити акаунт, натисніть «Зареєструватися» у верхньому правому куті сторінки. Вкажіть ім’я, електронну пошту та створіть пароль. Після реєстрації ви зможете обирати курси, навчатися та зберігати свій прогрес.',
  },
  {
    id: 2,
    title: 'Як придбати курс?',
    text: 'Оберіть потрібний курс у каталозі, відкрийте його сторінку та натисніть кнопку придбання. Після успішної оплати курс буде доступний у вашому особистому кабінеті.',
  },
  {
    id: 3,
    title: 'Чи можна повернути кошти за курс?',
    text: 'Умови повернення коштів залежать від правил платформи та конкретної покупки. Детальну інформацію можна знайти в розділі повернення коштів.',
  },
  {
    id: 4,
    title: 'Як отримати сертифікат?',
    text: 'Якщо курс передбачає сертифікат, він стане доступним після виконання необхідних умов проходження курсу.',
  },
  {
    id: 5,
    title: 'Чи можна дивитися курси з мобільного пристрою?',
    text: 'Так. Платформа адаптована для мобільних пристроїв, тому навчатися можна зі смартфона або планшета.',
  },
  {
    id: 6,
    title: 'Як стати автором на Vexa?',
    text: 'Перейдіть до розділу «Для авторів», ознайомтеся з умовами та створіть свій перший навчальний матеріал або курс.',
  },
];

export const Questions = () => {
  const [search, setSearch] = useState('');
  const [openQuestion, setOpenQuestion] = useState(1);

  const handleQuestionClick = (id) => {
    setOpenQuestion((current) => (current === id ? null : id));
  };

  const filteredQuestions = questions.filter((question) => {
    const value = search.trim().toLowerCase();

    return (
      question.title.toLowerCase().includes(value) ||
      question.text.toLowerCase().includes(value)
    );
  });

  return (
    <main>
      <Container>
        <div className={styles.container}>
          <Breadcrumbs
            title="Головна"
            link="/"
            pages="FAQ"
          />

          <section className={styles.titleBox}>
            <div className={styles.titleInfo}>
              <h1>
                FAQ
                <br />
                Відповіді на найпоширеніші питання
              </h1>

              <p>
                Тут ми зібрали відповіді на запитання, які найчастіше
                виникають у наших користувачів. Якщо не знайшли потрібної
                відповіді — напишіть нам.
              </p>

              <div className={styles.search}>
                <Search 
                    placeholder="Пошук за питаннями"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>

            <div className={styles.robotBox}>
              <img src={robotImg} alt="Vexa робот" />
            </div>
          </section>

          <section className={styles.categories}>
            <h2 className={styles.sectionTitle}>
              Популярні категорії
            </h2>

            <ul className={styles.featuresList}>
              {Features.map((feature, index) => (
                <li key={feature.id ?? feature.title ?? index}>
                  <img
                    src={feature.image}
                    alt={feature.imageAlt ?? ''}
                    aria-hidden={!feature.imageAlt}
                  />

                  <p>{feature.title}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.questionsSection}>
            <div className={styles.questions}>
              <h2 className={styles.sectionTitle}>
                Поширені запитання
              </h2>

              {/* <div className={styles.questionsList}>
                {questions.map((question) => {
                  const isOpen = openQuestion === question.id;

                  return (
                    <article
                      className={`${styles.question} ${
                        isOpen ? styles.questionOpen : ''
                      }`}
                      key={question.id}
                    >
                      <button
                        className={styles.questionHeader}
                        type="button"
                        onClick={() => handleQuestionClick(question.id)}
                        aria-expanded={isOpen}
                      >
                        <span className={styles.number}>
                          {question.id}
                        </span>

                        <span className={styles.questionTitle}>
                          {question.title}
                        </span>

                        <span
                          className={`${styles.arrow} ${
                            !isOpen ? styles.arrowOpen : ''
                          }`}
                          aria-hidden="true"
                        >
                          ⌄
                        </span>
                      </button>

                      {isOpen && (
                        <div className={styles.answer}>
                          <p>{question.text}</p>

                          {question.id === 1 && (
                            <button
                              type="button"
                              className={styles.details}
                            >
                              Перейти до реєстрації →
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div> */}

              <div className={styles.questionsList}>
  {filteredQuestions.length > 0 ? (
    filteredQuestions.map((question) => {
      const isOpen = openQuestion === question.id;

      return (
        <article
          className={`${styles.question} ${
            isOpen ? styles.questionOpen : ''
          }`}
          key={question.id}
        >
          <button
            className={styles.questionHeader}
            type="button"
            onClick={() => handleQuestionClick(question.id)}
            aria-expanded={isOpen}
          >
            <span className={styles.number}>
              {question.id}
            </span>

            <span className={styles.questionTitle}>
              {question.title}
            </span>

            <span
              className={`${styles.arrow} ${
                !isOpen ? styles.arrowOpen : ''
              }`}
              aria-hidden="true"
            >
              ⌄
            </span>
          </button>

          {isOpen && (
            <div className={styles.answer}>
              <p>{question.text}</p>

              {question.id === 1 && (
                <button
                  type="button"
                  className={styles.details}
                >
                  Перейти до реєстрації →
                </button>
              )}
            </div>
          )}
        </article>
      );
    })
  ) : (
    <p className={styles.empty}>
      За вашим запитом нічого не знайдено
    </p>
  )}
</div>
            </div>

            <aside className={styles.supportCard}>
              <div className={styles.mailIcon} aria-hidden="true">
                <img src={LetterIcon} alt='letter icon' />
              </div>

              <h3>Не знайшли відповідь?</h3>

              <p>
                Напишіть нам у підтримку.
                <br />
                Ми завжди на зв’язку
                <br />
                і допоможемо.
              </p>

              <Button variant="primary" size="medium" title='Написати нам'>
                Написати нам
              </Button>
            </aside>
          </section>
        </div>
      </Container>
    </main>
  );
};