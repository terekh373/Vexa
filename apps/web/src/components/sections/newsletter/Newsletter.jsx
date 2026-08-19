import { useState } from 'react';
import styles from './Newsletter.module.css';
import { Container } from '../../layout/container/Container.jsx';
import mailIcon from '../../../assets/icons/mail.svg';
import { Search } from '../../ui/search/Search.jsx'
import Button from '../../ui/buttons/Button.jsx'

const Newsletter = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!email) return;

    console.log('Подписка:', email);
    setEmail('');
  };

  return (
    <section className={styles.newsletter}>
      <Container>
        <div className={styles.container}>

          <div className={styles.info}>
            <div className={styles.icon}>
              <img
                src={mailIcon}
                alt=""
                aria-hidden="true"
              />
            </div>

            <div className={styles.description}>
              <h3>Будьте в курсі новинок</h3>

              <p>
                Підпишіться на нашу розсилку та отримуйте
                <br />
                добірки найкращих курсів, акції та корисні поради першими.
              </p>
            </div>
          </div>

          <form
            className={styles.form}
            onSubmit={handleSubmit}
          >
            <Search 
              type='email' 
              placeholder='Пошук курсів...' 
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button 
              type='submit' 
              title='Підписатися' 
              size='medium'
              variant='secondary-purple'

            />
          </form>
        </div>
      </Container>
    </section>
  );
};

export default Newsletter;