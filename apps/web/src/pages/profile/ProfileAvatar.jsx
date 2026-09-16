import React, { useState, useRef, useEffect } from 'react';
import styles from './Profile.module.css';

export const ProfileAvatar = () => {
  const [avatar, setAvatar] = useState(() => localStorage.getItem('user_avatar') || null);
  const fileInputRef = useRef(null);

  const saveAvatar = (url) => {
    setAvatar(url);
    localStorage.setItem('user_avatar', url);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => saveAvatar(reader.result);
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          const reader = new FileReader();
          reader.onloadend = () => saveAvatar(reader.result);
          reader.readAsDataURL(file);
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  return (
    <div className={styles.avatarCard}>
      <div 
        className={styles.avatarFrame} 
        onClick={() => fileInputRef.current.click()}
        title="Клікніть або натисніть Ctrl+V для вставки з буфера"
      >
        {avatar ? (
          <img src={avatar} alt="Аватар" className={styles.avatarImg} />
        ) : (
          <div className={styles.avatarPlaceholder}>
            <span className={styles.avatarPlus}>+</span>
            <span>Додати фото</span>
          </div>
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        style={{ display: 'none' }} 
      />

      <div className={styles.userRoleBadge}>student</div>
    </div>
  );
};