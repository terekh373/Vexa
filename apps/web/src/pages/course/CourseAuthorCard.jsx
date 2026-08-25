import styled from "styled-components";
import Button from "../../components/ui/buttons/Button";
import authorAvatar from '../../assets/images/for-course-images/author-avatar.png'

const Card = styled.div`
  border: 1px solid var(--border-grey);
  padding: 24px;
  border-radius: 16px;
  display: flex;
  gap: 84px;
  align-items: center;
  margin-bottom: 48px;
  box-sizing: border-box;
`;

const AuthorInfo = styled.div`
  flex: 1;
  min-width: 0;
  border-radius: 16px;
  display: flex;
  gap: 16px;
  justify-content: flex-start;

  div {
    flex: 1;
    min-width: 0;
  }

`

const AuthorAvatar = styled.img`
  width: 88px;
  height: 88px;
  border-radius: 16px;
`

const AuthorName = styled.h2`
  color: var(--main-dark-color);
  font-size: 18px;
  font-weight: 700;
  line-height: 24px;
  margin-bottom: 4px;
`;
const AuthorRole = styled.h3`
  color: var(--main-dark-color);
  font-size: 18px;
  font-weight: 400;
  line-height: 24px;
  margin-bottom: 4px;
`;

const Description = styled.p`
  color: var(--main-dark-color);
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
`;

const AuthorCoursesInfo = styled.ul`
  display: flex;
  gap: 48px;
`
const AuthorCoursesInfoItem = styled.li`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;

  span:first-child {
    color: var(--purple-color);
    font-size: 24px;
    font-weight: 400;
    line-height: 24px;
    display: block;
  }

   span:last-child {
    color: var(--main-dark-color);
    font-size: 16px;
    font-weight: 400;
    line-height: 14px;
    width: 100%;
    display: block;
    width: 100%;
    text-align: center;
    white-space: nowrap;
  }
`

export const CourseAuthorCard = () => (
  <Card>
    <AuthorInfo>
      <AuthorAvatar
        src={authorAvatar}
        alt="author avatar"
      />
      <div>
        <AuthorName>Олена Коваль</AuthorName>
        <AuthorRole>3D-художниця та викладачка</AuthorRole>
        <Description>
        Понад 7 років працюю у сфері 3D-графіки. Створювала моделі
        для ігор, реклами та анімації. Навчаю просто про складне.
      </Description>
      </div>
    </AuthorInfo>

    <AuthorCoursesInfo>
      <AuthorCoursesInfoItem>
        <span>12</span>
        <span>Курсів</span>
      </AuthorCoursesInfoItem>

      <AuthorCoursesInfoItem>
        <span>8 450</span>
        <span>Студентів</span>
      </AuthorCoursesInfoItem>

      <AuthorCoursesInfoItem>
        <span>4.9</span>
        <span>Рейтинг автора</span>
      </AuthorCoursesInfoItem>
    </AuthorCoursesInfo>
    <Button  title='Всі курси автора' variant="secondary" size="medium" />
  </Card>
);