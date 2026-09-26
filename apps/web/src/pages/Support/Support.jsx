import React, { useState } from 'react';
import styles from './Support.module.css';

const Support = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setStatus('loading');
      setTimeout(() => {
        setStatus('success');
        setFormData({ name: '', email: '', message: '' });
      }, 1000);
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Служба підтримки</h1>
      
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.inputGroup}>
          <label>Ваше ім'я</label>
          <input 
            type="text" 
            className={styles.input} 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required 
          />
        </div>
        
        <div className={styles.inputGroup}>
          <label>Email для зв'язку</label>
          <input 
            type="email" 
            className={styles.input} 
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required 
          />
        </div>

        <div className={styles.inputGroup}>
          <label>Повідомлення</label>
          <textarea 
            className={styles.textarea} 
            placeholder="Опишіть вашу проблему або питання..."
            value={formData.message}
            onChange={(e) => setFormData({...formData, message: e.target.value})}
            required 
          />
        </div>

        <button type="submit" className={styles.submitBtn} disabled={status === 'loading'}>
          {status === 'loading' ? 'Відправлення...' : 'Надіслати'}
        </button>
        
        {status === 'success' && <p style={{color: 'green', marginTop: '10px'}}>Ваше повідомлення успішно надіслано!</p>}
      </form>
    </div>
  );
};

export default Support;