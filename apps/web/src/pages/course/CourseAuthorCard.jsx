import styled from 'styled-components';
import authorAvatar from '../../assets/images/for-course-images/author-avatar.png';

const Card = styled.div`
  border: 1px solid var(--border-grey);
  padding: 24px;
  border-radius: 16px;
  display: flex;
  gap: 48px;
  align-items: center;
  margin-bottom: 48px;
  box-sizing: border-box;

  @media (max-width: 860px) {
    align-items: flex-start;
    flex-direction: column;
    gap: 24px;
  }
`;

const AuthorInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 16px;
  align-items: flex-start;

  div {
    flex: 1;
    min-width: 0;
  }
`;

const AuthorAvatar = styled.img`
  width: 88px;
  height: 88px;
  object-fit: cover;
  border-radius: 16px;
`;

const AuthorName = styled.h2`
  color: var(--main-dark-color);
  font-size: 18px;
  font-weight: 700;
  line-height: 24px;
  margin-bottom: 4px;
`;

const AuthorRole = styled.h3`
  color: var(--main-dark-color);
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  margin-bottom: 8px;
`;

const Description = styled.p`
  color: var(--main-dark-color);
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
`;

const Website = styled.a`
  display: inline-block;
  margin-top: 10px;
  color: var(--purple-color);
  font-size: 14px;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const AuthorStats = styled.ul`
  display: flex;
  gap: 36px;

  @media (max-width: 540px) {
    width: 100%;
    gap: 16px;
    justify-content: space-between;
  }
`;

const AuthorStat = styled.li`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;

  span:first-child {
    color: var(--purple-color);
    font-size: 24px;
    line-height: 28px;
  }

  span:last-child {
    color: var(--main-dark-color);
    font-size: 14px;
    line-height: 20px;
    text-align: center;
    white-space: nowrap;
  }
`;

export const CourseAuthorCard = ({ author = {} }) => {
  const avatarUrl = author.avatar?.url || authorAvatar;
  const rating = Number(author.rating ?? 0).toFixed(1);

  return (
    <Card>
      <AuthorInfo>
        <AuthorAvatar src={avatarUrl} alt={author.name || 'Автор курсу'} />
        <div>
          <AuthorName>
            {author.name || 'Автор курсу'}
            {author.isVerified ? ' ✓' : ''}
          </AuthorName>
          {author.headline && <AuthorRole>{author.headline}</AuthorRole>}
          {author.bio && <Description>{author.bio}</Description>}
          {author.websiteUrl && (
            <Website href={author.websiteUrl} target="_blank" rel="noreferrer">
              Сайт автора
            </Website>
          )}
        </div>
      </AuthorInfo>

      <AuthorStats>
        <AuthorStat>
          <span>{author.studentsCount ?? 0}</span>
          <span>Студентів</span>
        </AuthorStat>
        <AuthorStat>
          <span>{rating}</span>
          <span>Рейтинг</span>
        </AuthorStat>
        <AuthorStat>
          <span>{author.reviewsCount ?? 0}</span>
          <span>Відгуків</span>
        </AuthorStat>
      </AuthorStats>
    </Card>
  );
};
