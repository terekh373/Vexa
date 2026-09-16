import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext.jsx';
import styles from './EditProfile.module.css';

const EditProfile = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    fullName: user?.fullName || user?.name || '',
    phone: '',
    email: user?.email || '',
    birthDate: '',
    grade: '',
    school: '',
    goals: ''
  });

  const [avatar, setAvatar] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAvatar(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    
    updateUser({ 
      fullName: formData.fullName 
    });

    
    alert('Профіль успішно оновлено!');
    navigate('/profile');
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        
        <button className={styles.backBtn} onClick={() => navigate('/profile')}>
          ← Назад до кабінету
        </button>

        <div className={styles.grid}>
          
          <div className={styles.photoCard}>
            <h3 className={styles.photoTitle}>Оновіть особисту інформацію та дані</h3>
            
            <div className={styles.avatarWrapper}>
              <img 
                src={avatar || `https://ui-avatars.com/api/?name=${formData.fullName || 'User'}&background=6236FF&color=fff&size=200`} 
                alt="Avatar" 
                className={styles.avatarImg} 
              />
            </div>
            
            <label className={styles.changePhotoBtn}>
              Змінити фото
              <input type="file" hidden accept="image/png, image/jpeg" onChange={handleAvatarChange} />
            </label>
            <p className={styles.photoHint}>PNG або JPG, до 5 МБ</p>
          </div>

          <div className={styles.formCard}>
            <h2 className={styles.formTitle}>Редагувати профіль учня</h2>
            
            <form className={styles.form} onSubmit={handleSave}>
              <input 
                type="text" name="fullName" placeholder="Ім'я та Прізвище" 
                className={styles.input} value={formData.fullName} onChange={handleInputChange} 
              />
              <input 
                type="tel" name="phone" placeholder="Номер телефону" 
                className={styles.input} value={formData.phone} onChange={handleInputChange} 
              />
              <input 
                type="email" name="email" placeholder="Email" disabled
                className={`${styles.input} ${styles.disabled}`} value={formData.email} 
                title="Email не можна змінити"
              />
              <input 
                type="text" name="birthDate" placeholder="Дата народження" 
                className={styles.input} value={formData.birthDate} onChange={handleInputChange} 
                onFocus={(e) => e.target.type = 'date'} onBlur={(e) => {if(!e.target.value) e.target.type = 'text'}}
              />
              <input 
                type="text" name="grade" placeholder="Клас" 
                className={styles.input} value={formData.grade} onChange={handleInputChange} 
              />
              <input 
                type="text" name="school" placeholder="Навчальний заклад" 
                className={styles.input} value={formData.school} onChange={handleInputChange} 
              />
              <input 
                type="text" name="goals" placeholder="Навчальні цілі" 
                className={styles.input} value={formData.goals} onChange={handleInputChange} 
              />

              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => navigate('/profile')}>
                  Скасувати
                </button>
                <button type="submit" className={styles.saveBtn}>
                  Зберегти зміни
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EditProfile;