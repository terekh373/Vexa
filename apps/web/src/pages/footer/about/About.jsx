import { useNavigate } from 'react-router-dom';
import { routes } from '@vexa/shared';

import { Container } from '../../../components/layout/container/Container.jsx';
import Breadcrumbs from '../../../components/ui/breadcrumbs/Breadcrumbs.jsx';
import Button from '../../../components/ui/buttons/Button.jsx';

import heroImage from '../../../assets/images/about/about-hero.png';
import teamImage from '../../../assets/images/about/team.png';
import booksImage from '../../../assets/images/about/books.png';

import annaPhoto from '../../../assets/images/about/team/anna.png'
import alinaPhoto from '../../../assets/images/about/team/alina.png'
import antonPhoto from '../../../assets/images/about/team/anton.png'
import davidPhoto from '../../../assets/images/about/team/david.png'
import valeriiaPhoto from '../../../assets/images/about/team/valeriia.png'
import anastasiiaPhoto from '../../../assets/images/about/team/anastasiia.png'
import dmytroPhoto from '../../../assets/images/about/team/dmytro.png'
import yehorPhoto from '../../../assets/images/about/team/yehor.png'

import styles from './About.module.css';
import i01 from '../../../assets/icons/about/i01.svg'
import i02 from '../../../assets/icons/about/i02.svg'
import i03 from '../../../assets/icons/about/i03.svg'
import i04 from '../../../assets/icons/about/i04.svg'
import i05 from '../../../assets/icons/about/i05.svg'
import i06 from '../../../assets/icons/about/i06.svg'

const values = [
  {
    icon: i01,
    title: 'Люди',
    description:
      'Ми створюємо платформу, де кожен може навчатися, розвиватися та ділитися своїми знаннями у власному темпі.',
  },
  {
    icon: i02,
    title: 'Якість',
    description:
      'Ми дбаємо про якісний контент, зручне навчання та корисний досвід для кожного користувача.',
  },
  {
    icon: i03,
    title: 'Розвиток',
    description:
      'Ми постійно вдосконалюємо платформу, впроваджуємо нові можливості та допомагаємо рухатися вперед.',
  },
  {
    icon: i04,
    title: 'Партнерство',
    description:
      'Ми будуємо відкриту спільноту, підтримуємо взаємодію та співпрацю між авторами й студентами.',
  },
  {
    icon: i05,
    title: 'Доступність',
    description:
      'Ми прагнемо зробити сучасну освіту зрозумілою, зручною та доступною для кожного користувача.',
  },
  {
    icon: i06,
    title: 'Інновації',
    description:
      'Ми використовуємо сучасні технології та нові підходи, щоб зробити навчання ще простішим.',
  },
];

const designers = [
  {
    id: 1,
    name: 'Малігон Анастасія',
    role: 'Graphic Designer',
    image: anastasiiaPhoto,
    description:
      'Створює стиль VEXA, щоб кожен банер, ілюстрація та графіка говорили однією мовою-нашою.',
  },
  {
    id: 2,
    name: 'Цапенко Анна',
    role: 'UI/UX Designer',
    image: annaPhoto,
    description:
      'Створює зручні та естетичні інтерфейси, щоб користувачі завжди знали, куди натиснути і навіщо.',
  },
  {
    id: 3,
    name: 'Моргун Валерія',
    role: 'UI/UX Designer',
    image: valeriiaPhoto,
    description:
      'Продумує логіку та досвід користувачів, перетворюючи складні сценарії на прості рішення.',
  },
  {
    id: 4,
    name: 'Авалян Давід',
    role: 'Motion Designer',
    image: davidPhoto,
    description:
      'Додає дизайну руху та характеру, щоб анімації допомагали користувачам і тішили око.',
  },
];

const developers = [
  {
    id: 5,
    name: 'Потапова Аліна',
    role: 'Front-end',
    image: alinaPhoto,
    description:
      'Перетворює дизайн із Figma на справжній інтерфейс і робить так, щоб красиві макети ще й працювали.',
  },
  {
    id: 6,
    name: 'Терещенко Антон',
    role: 'Back-end',
    image: antonPhoto,
    description:
      'Будує надійну систему за інтерфейсом, щоб дані були на місці, а сервер не пішов відпочити.',
  },
  {
    id: 7,
    name: 'Пивоваров Дмитро',
    role: 'Back-end',
    image: dmytroPhoto,
    description:
      'Відповідає за логіку платформи та сервер — усе важливе, чого користувач не бачить.',
  },
  {
    id: 8,
    name: 'Воронцов Єгор',
    role: 'Front-end',
    image: yehorPhoto,
    description:
      'Оживляє кнопки, сторінки та компоненти, щоб усе працювало швидко, адаптивно і без зайвих проблем.',
  },
];

const TeamCard = ({ member }) => (
  <article className={styles.memberCard}>
    <img
      className={styles.memberImage}
      src={member.image}
      alt={member.name}
    />

    <div className={styles.memberContent}>
      <span className={styles.memberRole}>{member.role}</span>
      <h3>{member.name}</h3>
      <p>{member.description}</p>
    </div>
  </article>
);

const TeamGroup = ({ title, members }) => (
  <section className={styles.teamGroup}>
    <h2 className={styles.groupTitle}>{title}</h2>

    <div className={styles.teamGrid}>
      {members.map((member) => (
        <TeamCard key={member.id} member={member} />
      ))}
    </div>
  </section>
);

const About = () => {
  const navigate = useNavigate();

  const goToCatalog = () => {
    navigate(routes.catalog());
  };

  return (
    <div className={styles.about}>
      <Container>
        <Breadcrumbs title="Головна" link="/" pages="Про нас" />

        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1>Наша місія — робити освіту доступною для кожного</h1>

            <p>
              Vexa — це сучасна освітня платформа, яка об’єднує
              студентів, авторів і бренди. Ми створюємо простір, де
              знання надихають, розвивають і відкривають нові можливості.
            </p>

            <Button
              title="Дізнатися більше про платформу"
              size="medium"
              onClick={goToCatalog}
            />

            <div className={styles.statistics}>
              <div className={styles.statistic}>
                <span className={styles.statisticIcon}>♟</span>

                <div>
                  <span>5 000+</span>
                  <span>активних студентів</span>
                </div>
              </div>

              <div className={styles.statistic}>
                <span className={styles.statisticIcon}>◆</span>

                <div>
                  <span>1 200+</span>
                  <span>курсів</span>
                </div>
              </div>

              <div className={styles.statistic}>
                <span className={styles.statisticIcon}>♟</span>

                <div>
                  <span>350+</span>
                  <span>авторів</span>
                </div>
              </div>

              <div className={styles.statistic}>
                <span className={styles.statisticIcon}>＄</span>

                <div>
                  <span>₴2,5 млн+</span>
                  <span>виплат авторам</span>
                </div>
              </div>
            </div>
          </div>

          <img
            className={styles.heroImage}
            src={heroImage}
            alt="Навчання на платформі Vexa"
          />
        </section>

        <section className={styles.values}>
          <h2>Наші цінності</h2>

          <div className={styles.valuesGrid}>
            {values.map((value) => (
              <article className={styles.valueCard} key={value.title}>
                <img src={value.icon} alt='icon' className={styles.valueIcon}/>
                <h3>{value.title}</h3>
                <p>{value.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.teamIntro}>
          <img
            className={styles.teamImage}
            src={teamImage}
            alt="Команда Vexa"
          />

          <div className={styles.teamIntroContent}>
            <h2>Наша команда</h2>

            <p>
              Ми — команда однодумців, яких об’єднує віра в силу освіти.
              Дизайнери, розробники, освітні експерти та менеджери щодня
              працюють над тим, щоб VEXA ставала ще кращою для вас.
            </p>

            <Button
              title="Перейти до курсів"
              onClick={goToCatalog}
            />
          </div>
        </section>

        <div className={styles.team}>
          <TeamGroup title="Дизайнери" members={designers} />
          <TeamGroup title="Розробники" members={developers} />
        </div>
      </Container>

      <section className={styles.callToAction}>
        <Container>
          <div className={styles.callToActionContent}>
            <div className={styles.callToActionText}>
              <h2>Освіта змінює життя</h2>
              <p>Приєднуйтесь до спільноти Vexa!</p>

              <Button
                title="Обрати курс"
                onClick={goToCatalog}
              />
            </div>

            <img
              className={styles.booksImage}
              src={booksImage}
              alt=""
              aria-hidden="true"
            />
          </div>
        </Container>
      </section>
    </div>
  );
};

export default About;