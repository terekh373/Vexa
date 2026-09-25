import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { routes } from '@vexa/shared';

import { Container } from '../../layout/container/Container';
import Button from '../../ui/buttons/Button';
import { OpenMore } from '../../ui/openmore/OpenMore';
import { getCategories } from '../../../services/coursesService.js';

const Section = styled.section`
  padding: 48px 0;
  background: var(--footer-bg-color);
  margin-bottom: 48px;

  @media (max-width: 960px) {
    padding: 32px 0;
  }

  @media (max-width: 540px) {
    padding: 16px 0;
  }
`;

const List = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;

  @media (max-width: 960px) {
    gap: 12px;
    row-gap: 16px;
    justify-content: flex-start;
  }

  @media (max-width: 540px) {
    gap: 8px;
    row-gap: 10px;
  }
`;

const State = styled.div`
  min-height: 64px;
  display: flex;
  align-items: center;
  gap: 16px;
  color: var(--main-dark-color);
`;

export const PopularCategories = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const data = await getCategories();
      const rootCategories = Array.isArray(data?.items)
        ? data.items.filter((category) => category.parentId === null)
        : [];

      setCategories(rootCategories);
    } catch {
      setCategories([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);


  const openCategory = (slug) => {
    navigate(routes.catalog({ category: slug }));
  };

  const openCategories = () => {
    navigate('/categories');
  };

  return (
    <Section>
      <Container>
        <OpenMore
          title='Популярні категорії'
          bttnTxt='Всі категорії'
          onClick={openCategories}
        />

        {loading && <State>Завантажуємо категорії...</State>}

        {!loading && error && (
          <State role='alert'>
            <span>Не вдалося завантажити категорії.</span>
            <Button
              title='Спробувати ще'
              size='small'
              variant='secondary'
              onClick={loadCategories}
            />
          </State>
        )}

        {!loading && !error && categories.length === 0 && (
          <State>Категорій поки немає.</State>
        )}

        {!loading && !error && categories.length > 0 && (
          <List>
            {categories.map((category) => (
              <Button
                key={category.id}
                title={category.nameUk}
                size='small'
                variant='secondary-gray'
                onClick={() => openCategory(category.slug)}
              />
            ))}
          </List>
        )}
      </Container>
    </Section>
  );
};
