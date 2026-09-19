import { useState } from 'react';

import { Container } from '../../../components/layout/container/Container.jsx';
import Breadcrumbs from '../../../components/ui/breadcrumbs/Breadcrumbs.jsx';
import Button from '../../../components/ui/buttons/Button.jsx';

import heroImage from '../../../assets/images/contacts/contacts-hero.png';
import mapImage from '../../../assets/images/contacts/map.png';

import emailIcon from '../../../assets/icons/contacts/email.svg';
import phoneIcon from '../../../assets/icons/contacts/phone.svg';
import locationIcon from '../../../assets/icons/contacts/location.svg';

import styles from './Contacts.module.css';

const contacts = [
  {
    id: 1,
    icon: emailIcon,
    title: 'Електронна пошта',
    lines: ['support@vexa.ua', 'Відповідаємо щодня'],
    href: 'mailto:support@vexa.ua',
  },
  {
    id: 2,
    icon: phoneIcon,
    title: 'Телефон',
    lines: ['+38 (XXX) XXX-XX-XX', 'Пн–Пт, 9:00–18:00'],
    href: 'tel:+380000000000',
  },
  {
    id: 3,
    icon: locationIcon,
    title: 'Адреса',
    lines: ['м. Харків, вул.', 'Сумська, 26'],
  },
];

const initialForm = {
  name: '',
  email: '',
  message: '',
};

const Contacts = () => {
  const [form, setForm] = useState(initialForm);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    console.log(form);

    // позже будет запрос к API
    setForm(initialForm);
  };

  return (
    <div className={styles.contacts}>
      <Container>
        <Breadcrumbs
          title="Головна"
          link="/"
          pages="Контакти"
        />

        <section className={styles.topSection}>
          <div className={styles.contactsContent}>
            <div className={styles.heading}>
              <h1>Контакти</h1>

              <p>
                Зв’яжіться з нами. Маєте запитання або пропозиції?
                Напишіть нам, і ми обов’язково допоможемо та відповімо
                найближчим часом.
              </p>
            </div>

            <div className={styles.contactsGrid}>
              {contacts.map((contact) => (
                <article className={styles.contactCard} key={contact.id}>
                  <img
                    className={styles.contactIcon}
                    src={contact.icon}
                    alt=""
                    aria-hidden="true"
                  />

                  <h2>{contact.title}</h2>

                  <div className={styles.contactInformation}>
                    {contact.lines.map((line) =>
                      contact.href ? (
                        <a href={contact.href} key={line}>
                          {line}
                        </a>
                      ) : (
                        <span key={line}>{line}</span>
                      ),
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <img
            className={styles.heroImage}
            src={heroImage}
            alt="Працівниця служби підтримки Vexa"
          />
        </section>

        <section className={styles.feedbackSection}>
          <div className={styles.mapWrapper}>
            <img
              className={styles.mapImage}
              src={mapImage}
              alt="Розташування офісу Vexa на карті"
            />
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <h2>Напишіть нам</h2>

            <label className={styles.field}>
              <span>Ім’я та прізвище</span>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Нікола Ніколь"
                autoComplete="name"
                required
              />
            </label>

            <label className={styles.field}>
              <span>Email</span>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="nicole.petrivna@gmail.com"
                autoComplete="email"
                required
              />
            </label>

            <label className={styles.field}>
              <span>Повідомлення</span>

              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                placeholder="Ваше повідомлення..."
                required
              />
            </label>

            <Button
              title="Надіслати"
              type="submit"
              size="medium"
            />
          </form>
        </section>
      </Container>
    </div>
  );
};

export default Contacts;