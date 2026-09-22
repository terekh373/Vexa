# Vexa — карта фронтенд-маршрутів та API

Базовий URL API береться з `VITE_API_URL`. Локально: `http://localhost:3000`.
Усі шляхи API мають префікс `/api`.

## Реєстрація

`POST /api/auth/register`

Запит — усі чотири поля обов'язкові, назви малими літерами:

    { "email": "user@example.com",
      "password": "Vexa12345",
      "fullName": "Оксана Петренко",
      "acceptTerms": true }

Пароль: мінімум 8 символів, щонайменше одна літера й одна цифра.
`acceptTerms` приймає лише literal `true`; без згоди реєстрація повертає `400`.
Момент згоди сервер зберігає в `users.terms_accepted_at`.

Відповідь `201`:

    { "user": { "id", "email", "fullName", "roles": ["STUDENT"],
                "emailVerified": false, "locale": "uk" },
      "tokens": { "accessToken", "refreshToken", "expiresIn": 900 } }

Помилки: `409` — email зайнятий; `400` — валідація, поле `error.details`
масив `{ field, message }` з готовими українськими текстами під інпути.

## Вхід

`POST /api/auth/login` — `{ email, password }`. Відповідь як у реєстрації, `200`.
`401` — невірний email **або** пароль (одне повідомлення на оба випадки).


### Підтвердження email

Після реєстрації сервер надсилає український HTML + text лист через Brevo з
посиланням `${WEB_APP_URL}/verify-email?token=...`. Без `BREVO_API_KEY` діє
безпечний log-only транспорт.

`POST /api/auth/resend-verification`

    { "email": "user@example.com" }

Успіх → `204` без тіла. Відповідь однакова для невідомого email, вже
підтвердженого акаунта і акаунта, якому лист реально повторно надіслано.
Ендпоінт має окремий rate limit; клієнт не повинен використовувати відповідь
для визначення існування акаунта.

## Відновлення пароля

`POST /api/auth/forgot-password`

Тіло:

    { "email": "user@example.com" }

Для будь-якого **валідного за форматом** email відповідь однакова: `204` без
тіла, незалежно від того, чи існує акаунт. Клієнт не повинен робити висновок
про наявність користувача з цієї відповіді. Невалідний формат email → `400`.

Якщо акаунт існує, сервер створює одноразовий токен у Redis на 1 годину та
надсилає лист через Brevo. Посилання веде на
`${WEB_APP_URL}/reset-password?token=...`. Без `BREVO_API_KEY` (локально і в
тестах) лист не відправляється назовні, а факт доставки пишеться в лог.

`POST /api/auth/reset-password`

Тіло:

    { "token": "...", "password": "NewPass123" }

Новий пароль має ті самі правила, що й під час реєстрації: 8–128 символів,
щонайменше одна літера й одна цифра. Успіх → `204` без тіла. Після зміни
пароля всі refresh-сесії користувача відкликаються; старий пароль більше не
підходить для входу.

Помилки: `404` — токен не існує, протермінований або вже використаний;
`400` — невалідний токен/пароль; `429` — перевищено ліміт спроб. Обидва
ендпоінти відновлення мають обмеження частоти не слабше за `/auth/login`.

## Токени

- Приходять у тілі відповіді, не в куках. Зберігати на клієнті.
- Access живе 15 хвилин, надсилається як `Authorization: Bearer <token>`.
- На `401` → `POST /api/auth/refresh` з `{ refreshToken }` → нова пара, повторити
  запит. **Один раз.** Якщо refresh теж 401 — розлогінити, вести на `/login`.
- На `403` refresh робити **не можна**: прав недостатньо, новий токен не допоможе.
- Refresh одноразовий: після оновлення старий мертвий, зберігати новий.
  Паралельні запити з одним refresh вибудовувати в чергу, інакше чотири з п'яти
  отримають 401.

`POST /api/auth/logout` — `{ refreshToken }` → `204`.
`GET /api/auth/me` — з Bearer → профіль; без токена → `401`.

## Профіль

Усі маршрути нижче вимагають Bearer-токен і доступні будь-якій авторизованій
ролі (`STUDENT`, `AUTHOR`, `ADMIN`).

`PATCH /api/me` — редагування власного профілю. Тіло — будь-яке непорожнє
підмноження:

    { "fullName": "Оксана Петренко",
      "avatarFileId": "uuid" }

- `fullName` має ті самі обмеження, що при реєстрації.
- `avatarFileId` — власний підтверджений (`isReady = true`) файл типу `AVATAR`.
  Передати `null`, щоб прибрати аватар. Чужий файл → `403`; відсутній,
  непідтверджений або файл іншого типу → `400`.
- Відповідь `200` має ту саму форму, що `GET /api/auth/me`:
  `{ id, email, fullName, roles, emailVerified, locale }`.

`POST /api/me/password` — зміна локального пароля:

    { "currentPassword": "OldPass123",
      "newPassword": "NewPass456" }

Новий пароль має ті самі вимоги, що при реєстрації. Успіх → `204`, після чого
**всі refresh-сесії відкликані** — клієнт має очистити токени й виконати
повторний вхід. Невірний `currentPassword` → `400` (не `401`, щоб не запускати
refresh-флоу). Акаунт без локального пароля (`passwordHash = null`) → `409`.
Ендпоінт має таке саме обмеження частоти, як `/api/auth/login`.

## Сповіщення

Усі маршрути вимагають Bearer-токен і працюють тільки зі сповіщеннями
поточного користувача. Чуже `id` не розкриває існування запису й повертає
`404`.

    GET   /api/me/notifications?page=1&limit=20
    PATCH /api/me/notifications/:id/read
    PATCH /api/me/notifications/read-all

`GET /api/me/notifications` — найновіші спочатку. `limit` за замовчуванням
`20`, максимум `50`. Відповідь:

```json
{
  "items": [
    {
      "id": "uuid",
      "type": "PURCHASE | MODERATION | PAYOUT | REVIEW | ACCOUNT | SYSTEM",
      "title": "Новий продаж: «Математика, 7 клас»",
      "body": "... | null",
      "payload": { "href": "/author/balance", "courseId": "uuid" },
      "readAt": null,
      "createdAt": "2026-09-22T10:00:00.000Z"
    }
  ],
  "unreadCount": 3,
  "page": 1,
  "limit": 20,
  "total": 12,
  "totalPages": 1
}
```

`payload` — дані для переходу з дзвіночка. Якщо є `payload.href`, клієнт
переходить за ним; для старих moderation-подій клієнт також підтримує
`courseId`.

`PATCH /api/me/notifications/:id/read` → `204`. Повторна позначка власного
сповіщення теж `204`; чуже або неіснуюче → `404`.

`PATCH /api/me/notifications/read-all` →
`{ "updatedCount": 4 }` — кількість сповіщень, які щойно стали прочитаними.

Події створюються сервером: результат модерації та новий відгук уже
підключені до відповідних транзакцій. Сервіс також має атомарні hooks для
підтвердженої покупки та заявки на виплату; їх викликають платіжний webhook
(#84) і `POST /api/author/payouts` (#106), коли ці флоу доступні в `develop`.

### Профіль автора

`POST /api/me/author-profile` — активувати роль автора для поточного користувача.
Bearer-токен обов'язковий, окрема реєстрація не потрібна.

Тіло:

    { "displayName": "Оксана Петренко",
      "headline": "Викладач математики",
      "bio": "8 років досвіду..." }

`displayName` обов'язковий (2–160 символів), `headline` і `bio` необов'язкові.
Порожні необов'язкові поля клієнт може передати як `null`. Сервер в одній
транзакції створює `author_profiles` та додає `AUTHOR` до `users.roles`.
Успіх → `201`:

    { "user": { "id", "email", "fullName", "roles": ["STUDENT", "AUTHOR"],
                "emailVerified", "locale" },
      "tokens": { "accessToken", "refreshToken", "expiresIn" },
      "authorProfile": {
        "userId", "displayName", "headline", "bio", "isVerified",
        "ratingAvg", "reviewsCount", "studentsCount"
      } }

Нову пару токенів треба **одразу замінити** в клієнті: роль `AUTHOR` записана
в access-токені, тому старий access-токен її не знає. Повторна активація →
`409`; заблокований користувач → `403`.

`PATCH /api/me/author-profile` — редагування `displayName`, `headline`, `bio`.
Потрібне хоча б одне поле. Успіх → `200`, відповідь — `authorProfile` у формі
вище без `user` і `tokens`. Якщо профіль автора не існує → `404`.

`GET /api/authors/:id` — публічна сторінка автора, токен не потрібен. Якщо
профілю автора немає → `404`. Відповідь `200`:

```json
{
  "id": "uuid",
  "displayName": "Оксана Петренко",
  "headline": "Викладач математики",
  "bio": "...",
  "avatar": { "id": "uuid", "fileName": "avatar.jpg", "mimeType": "image/jpeg", "url": "..." },
  "isVerified": false,
  "ratingAvg": 4.8,
  "reviewsCount": 27,
  "studentsCount": 340,
  "courses": []
}
```

`courses[]` має ту саму форму картки, що `GET /api/courses`: `cover`, `author`,
`category`, `price`, `rating`, лічильники й `publishedAt`. Повертаються **лише**
курси/матеріали зі статусом `PUBLISHED`; чернетки, модерація, відхилені та
зняті з публікації у портфоліо не потрапляють.


## Підтримка

`POST /api/support/contact` — публічний ендпоінт, Bearer-токен не потрібен.

Тіло:

    { "name": "Оксана Петренко",
      "email": "user@example.com",
      "message": "Потрібна допомога з оплатою курсу..." }

Успіх → `204` без тіла. Повідомлення надсилається на `SUPPORT_EMAIL`, а
`Reply-To` містить email користувача. Поля перевіряються zod; діє жорсткий
rate limit (5 звернень на годину з одного ключа/IP). Помилка провайдера
логуються сервером і не повертає у відповідь секрети Brevo.

## Категорії

`GET /api/categories`

Публічний ендпоінт, без токена. Повертає дерево активних категорій
(`isActive = true`), відсортоване на бекенді: спершу `sortOrder`, далі
`nameUk`. Пагінації немає — довідник компактний.

Відповідь `200`:

    { "items": [
        { "id": "uuid", "slug": "shkilni-predmety", "nameUk": "Шкільні предмети",
          "parentId": null, "sortOrder": 1,
          "children": [
            { "id": "uuid", "slug": "anhliiska-mova", "nameUk": "Англійська мова",
              "parentId": "uuid", "sortOrder": 1, "children": [] }
          ] }
      ] }

- `children` присутній завжди, навіть порожній масив у листа дерева.
- `slug` іде прямо у `?category=` параметр каталогу (`GET /api/courses`).
- Лічильників курсів (`count`) у відповіді немає — з'являться разом із
  фасетами каталогу окремою задачею.
- Порожня база → `{ "items": [] }`, статус `200`, не `404`.
- Відповідь кешується на сервері на 5 хвилин (Redis, fail-open). Клієнту
  кешувати окремо не потрібно.

Тип відповіді — `CategoryTreeResponse` у `@vexa/shared`.

## Курси

### Каталог

`GET /api/courses`

Доступний без авторизації. Підтримує пошук, фільтрацію, сортування та пагінацію.

Query-параметри:

- `q` — текстовий пошук за назвою, описом і тегами.
- `type` — `course` або `material`.
- `category` — slug або id категорії. Враховуються також дочірні категорії.
- `grade` — клас від `1` до `11`.
- `priceMin` — мінімальна ціна у копійках.
- `priceMax` — максимальна ціна у копійках.
- `rating` — мінімальний рейтинг від `1` до `5`.
- `language` — `uk` або `en`.
- `sort` — `relevance`, `popularity`, `rating`, `date`, `price_asc` або `price_desc`.
- `page` — номер сторінки, починаючи з `1`. За замовчуванням `1`.
- `limit` — кількість елементів на сторінці. За замовчуванням `20`, максимум `50`.

Приклад:

`GET /api/courses?q=математика&type=course&grade=7&priceMax=50000&rating=4&language=uk&sort=rating&page=1&limit=20`

Відповідь `200`:

```json
{
  "items": [],
  "page": 1,
  "limit": 20,
  "total": 0,
  "totalPages": 0
}
```

### Сторінка курсу

`GET /api/courses/:idOrSlug` — доступний без токена (`optionalAuth`) для
опублікованого курсу. З Bearer-токеном додатково рахується `hasAccess` за
`Enrollment` користувача. Курс у статусі `UNPUBLISHED` повертається лише його
автору або користувачу з активним `Enrollment`; для гостя та інших
користувачів такий самий запит повертає `404`.

Верхній рівень відповіді:

- `type` — `COURSE` або `MATERIAL`.
- `price.amount` — ціна **в копійках**, integer; `price.currency`.
- `cover`, `category`, `author` (з `avatar`).
- `rating.average`, `rating.count`.
- `studentsCount`, `lessonsCount`, `durationSec`, `publishedAt`.
- `hasAccess` — куплено (`Enrollment`), автор курсу, або курс безкоштовний
  (`priceAmount === 0`).
- `canReview` — `true` лише для авторизованого користувача з роллю
  `STUDENT` або `AUTHOR`, активним `Enrollment` із `source = PURCHASE` або
  `FREE`, який ще не залишав відгук на цей курс. `ADMIN_GRANT` дає доступ до
  контенту, але не право залишати відгук. Використовується для показу форми
  створення відгуку.

`modules[]`: `id`, `title`, `position`, `lessons[]`.

`lessons[]`: `id`, `type`, `title`, `position`, `isPreview`, `isLocked`,
`durationSec`, і `content` — **лише коли урок доступний** (куплено або
безкоштовне прев'ю). **Відсутність поля `content` — ознака закритого уроку**,
клієнт не повинен намагатися його відрендерити.

**Розбіжність імен між публічним і авторським API** (це не помилка, а
поточний стан `develop` — фронт має мапити явно):

| Публічний (`/api/courses/:idOrSlug`) | Авторський (`/api/author/*`) |
|---|---|
| `position` | `sortOrder` |
| `isPreview` | `isFreePreview` |

`GET /api/courses/:id/reviews` — **лише по UUID**, не по slug (`404` на
slug). Query: `page` (за замовчуванням `1`), `limit` (за замовчуванням `10`,
максимум `50`). Відповідь: `averageRating`, `reviewsCount`, масив `reviews`
(з `author`, включно з `avatar`, а також `authorReply` / `authorRepliedAt`),
`pagination { page, limit, totalItems, totalPages }`.

`POST /api/courses/:id/reviews` — Bearer, лише ролі `STUDENT` або `AUTHOR`.
Створення відгуку для поточного користувача. Тіло:
`{ "rating": 1..5, "text"?: "..." }`. Потрібен активний `Enrollment` саме з
`source = PURCHASE` або `FREE`; `ADMIN_GRANT` не вважається покупкою і дає
`403`. Один користувач може мати лише один відгук на курс; повторна спроба →
`409`. Вставка відгуку та перерахунок `courses.ratingAvg` /
`courses.reviewsCount` і `author_profiles.ratingAvg` /
`author_profiles.reviewsCount` виконуються в одній транзакції. Відповідь
`201`: `{ review, rating: { average, count } }`.

`PATCH /api/courses/:id/reviews/my` — Bearer, лише ролі `STUDENT` або `AUTHOR`.
Редагування власного відгуку. Тіло: будь-яке непорожнє підмноження
`{ rating: 1..5, text?: string }`. Так само потрібен активний `Enrollment` з
`source = PURCHASE` або `FREE`; `ADMIN_GRANT` → `403`. Відповідь `200` має ту
саму форму `{ review, rating }`; денормалізовані рейтинги курсу й автора
перераховуються одразу.

## Файли

Файли не проходять через API: сервер лише видає **підписані URL** на приватний
бакет (ТЗ 20.2). Підпис живе **10 хвилин** — отримувати перед самим
завантаженням/відкриттям, не кешувати.

### Завантаження — три кроки

**1.** `POST /api/files/upload-url` — Bearer. `AVATAR` може завантажити
будь-який користувач; `COVER` і `ATTACHMENT` — лише `AUTHOR` або `ADMIN`
(інакше `403`).

    { "kind": "ATTACHMENT",
      "originalName": "Конспект.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 1048576 }

- `kind` — `COVER`, `AVATAR` або `ATTACHMENT`. Відео (`VIDEO`) — окремий потік
  через Cloudflare Stream, цим ендпоінтом не завантажується.
- `mimeType` — брати з `File.type` у браузері. Дозволено: `image/png`,
  `image/jpeg` (усі види); `application/pdf`, `.docx`, `.pptx`, `application/zip`
  (лише `ATTACHMENT`).
- `sizeBytes` — точний `File.size`. Ліміт: 5 МБ для `COVER`/`AVATAR`,
  100 МБ для `ATTACHMENT`.

Відповідь `201`:

    { "fileId", "uploadUrl", "storageKey", "expiresIn": 600 }

`400` з `error.details` — недозволений тип або перевищений розмір. Перевіряється
**до** видачі URL, тож клієнту варто показати помилку одразу після вибору файлу.

**2.** `PUT <uploadUrl>` — тіло: сирий файл, заголовок
`Content-Type: <той самий mimeType>`. Без `Authorization`. Розмір і тип
зашиті в підпис: інший файл сховище відхилить з `403`.

**3.** `POST /api/files/:fileId/confirm` — Bearer, той самий користувач.
Сервер перевіряє, що об'єкт справді лежить у сховищі, і ставить `isReady`.
До підтвердження файл не існує для решти системи.

Відповідь `200`:

    { "file": { "id", "kind", "originalName", "mimeType",
                "sizeBytes": "1048576", "isReady": true, "createdAt" } }

`409` — PUT ще не виконано або не вдався; `403` — чужий файл; `404` — немає.
Повторний confirm безпечний (ідемпотентний).

**`sizeBytes` у відповідях API завжди рядок** (у БД bigint). Для показу —
`Number(sizeBytes)`.

### Отримання файлу

`GET /api/files/:fileId/download-url` — Bearer, будь-яка роль.

Відповідь `200`: `{ "downloadUrl", "expiresIn": 600 }`. Відкривати
`downloadUrl` напряму (`window.open` / `Linking.openURL`), файл віддається з
оригінальним ім'ям.

`403` — немає доступу: файл не свій, не адмін, немає покупки курсу, до якого
файл прив'язаний, і файл не з безкоштовного прев'ю-уроку. `404` — файл не
існує або ще не підтверджений. Обкладинки курсів і аватари для показу в
каталозі беруть з `coverUrl`/`avatar.url` сторінки курсу, не з цього ендпоінта.

Типи запитів/відповідей — `CreateUploadUrlRequest`, `CreateUploadUrlResponse`,
`FileDto`, `DownloadUrlResponse` у `@vexa/shared`.

## Кабінет автора (конструктор курсу)

Усі маршрути під префіксом `/api/author`. Весь роутер вимагає Bearer-токен
**і** роль `AUTHOR`. **Роль `ADMIN` сюди не пускається.** Без токена — `401`;
з роллю `STUDENT` або `ADMIN` — `403`.

    POST   /api/author/courses
    GET    /api/author/courses            ?status=DRAFT|MODERATION|PUBLISHED|REJECTED|UNPUBLISHED
    GET    /api/author/courses/:id
    PATCH  /api/author/courses/:id
    DELETE /api/author/courses/:id
    POST   /api/author/courses/:id/modules
    PATCH  /api/author/modules/:id
    DELETE /api/author/modules/:id
    POST   /api/author/modules/:id/lessons
    PATCH  /api/author/lessons/:id
    DELETE /api/author/lessons/:id
    POST   /api/author/lessons/:id/quiz
    PATCH  /api/author/quizzes/:id
    DELETE /api/author/quizzes/:id
    POST   /api/author/quizzes/:id/questions
    PATCH  /api/author/questions/:id
    DELETE /api/author/questions/:id
    PATCH  /api/author/courses/:id/reorder
    POST   /api/author/courses/:id/submit
    POST   /api/author/courses/:id/unpublish
    POST   /api/author/reviews/:id/reply

### Відповіді автора на відгуки

`POST /api/author/reviews/:id/reply` — лише автор курсу, до якого належить
відгук. Тіло: `{ "text": "Дякую за відгук!" }` (`1..4000` символів).
Відповісти можна лише на відгук зі статусом `PUBLISHED`. Чужий,
неіснуючий або прихований відгук повертає `404`. Відповідь `200`:
`{ id, authorReply, authorRepliedAt }`. Повторний виклик замінює попередню
відповідь і оновлює `authorRepliedAt`.

### Курс

Поля: `type`, `title`, `categoryId`, `shortDescription`, `description`,
`outcomes[]`, `language`, `grade`, `priceAmount`, `currency`, `coverFileId`.

- На створенні (`POST /courses`) обов'язкові лише `type`, `title`,
  `categoryId` — решта опціональна.
- На оновленні (`PATCH /courses/:id`) додатково приймається `slug`, тіло не
  може бути порожнім (щонайменше одне поле).
- `priceAmount` — цілі копійки, integer, `min 0`.
- `currency` — рівно 3 символи, сервер приводить до верхнього регістру.
- `grade` — `1..11` або `null`.
- `GET /courses` додатково повертає для кабінету автора `ratingAvg` (number)
  і `studentsCount`; обкладинка визначається через наявний `coverFileId`.
- Схеми `.strict()` — **зайве поле в тілі повертає `400`, а не ігнорується**.
  Критично для форм: не надсилати нічого, чого немає у списку вище.

### Модуль і урок

Модуль (`.../modules`): `title`, `sortOrder`.

Урок (`.../lessons`): `type`, `title`, `sortOrder`, `isFreePreview`,
`textContent`, `videoFileId`, `durationSec`, `fileIds[]`.

`type: "QUIZ"` дозволений. Для такого уроку тест створюється окремим `POST /api/author/lessons/:id/quiz`.

### Тести (`QUIZ`)

Усі маршрути нижче доступні лише ролі `AUTHOR` і перевіряють, що урок/тест/питання належить курсу поточного автора. Чужий ресурс повертає `403`.

- `POST /api/author/lessons/:id/quiz` — створити тест для `QUIZ`-уроку. Тіло: `passScore` (`0..100`, default `60`), `attemptsAllowed` (`integer >= 1` або `null`).
- `PATCH /api/author/quizzes/:id` — змінити `passScore` / `attemptsAllowed`.
- `DELETE /api/author/quizzes/:id` — видалити тест разом із питаннями та варіантами.
- `POST /api/author/quizzes/:id/questions` — створити питання. Тіло: `text`, `type` (`SINGLE` / `MULTIPLE`), `sortOrder`, `options[]`.
- `PATCH /api/author/questions/:id` — змінити питання; якщо передано `options[]`, список варіантів замінюється повністю.
- `DELETE /api/author/questions/:id` — видалити питання.

Варіант відповіді: `{ text, isCorrect, sortOrder? }`. Потрібно щонайменше 2 варіанти і щонайменше 1 правильний; для `SINGLE` правильний варіант має бути рівно один. `isCorrect` є тільки в авторських відповідях API. Публічна відповідь курсу для доступного `QUIZ` містить питання й варіанти без `isCorrect`.

### Порядок (`reorder`)

`PATCH /api/author/courses/:id/reorder` приймає обидва списки одночасно,
кожен з дефолтом `[]`:

    { "modules": [
        { "id": "uuid", "sortOrder": 0,
          "lessons": [ { "id": "uuid", "sortOrder": 0 } ] }
      ],
      "lessons": [ { "id": "uuid", "sortOrder": 1 } ] }

- Вкладений `modules[].lessons[]` — порядок уроків усередині модуля.
- Плоский `lessons[]` — перенесення уроку між модулями (drag & drop).
- Дублікат `id` у межах одного запиту → `400`.

### Подача на модерацію

`POST /api/author/courses/:id/submit` — переводить `DRAFT`, `REJECTED` або
`UNPUBLISHED` у `MODERATION`.

`POST /api/author/courses/:id/unpublish` — лише власник курсу; переводить
`PUBLISHED → UNPUBLISHED`, тіло не потрібне. У `moderation_log` створюється
запис `action = UNPUBLISHED`, а `moderatorId` містить id автора. Повторний
виклик для курсу не в `PUBLISHED` повертає `409`. Після зняття курс можна
редагувати й повторно подати на модерацію; видалення як і раніше дозволене
лише для `DRAFT` та `REJECTED`.

Повний життєвий цикл статусів: `DRAFT → MODERATION → PUBLISHED / REJECTED →
UNPUBLISHED → MODERATION`. Покупці з активним `Enrollment` не втрачають
доступ до `UNPUBLISHED` курсу, але в каталозі він не показується.

## Адміністрування — модерація курсів

Усі маршрути під префіксом `/api/admin`. Весь роутер вимагає Bearer-токен
**і** роль `ADMIN`. Без токена — `401`; з роллю `STUDENT` або `AUTHOR` — `403`.

    GET  /api/admin/courses               ?status=&page=&limit=
    GET  /api/admin/courses/:id
    POST /api/admin/courses/:id/moderate
    POST /api/admin/courses/:id/unpublish

Життєвий цикл статусів курсу: `draft → moderation → published / rejected →
unpublished`. Модератор працює лише з переходами `moderation → published`,
`moderation → rejected` і `published → unpublished`; повернення чернетки в
роботу — задача автора (`POST /api/author/courses/:id/submit`), не адміна.

### Черга на модерацію

`GET /api/admin/courses`

Query-параметри (`.strict()` — зайвий параметр повертає `400`):

- `status` — будь-яке значення `CourseStatus` (`DRAFT`, `MODERATION`,
  `PUBLISHED`, `REJECTED`, `UNPUBLISHED`). За замовчуванням `MODERATION`.
- `page` — номер сторінки, від `1`. За замовчуванням `1`.
- `limit` — елементів на сторінці, `1..50`. За замовчуванням `20`.

Видалені курси (`deletedAt`) до вибірки не потрапляють. Сортування: для
`status=MODERATION` — за `submittedAt` зростаючим (старіші заявки першими),
для решти статусів — за `updatedAt` спадним; в обох випадках `id` як
вторинний ключ для стабільної пагінації.

Відповідь `200`:

```json
{
  "items": [
    {
      "id": "uuid",
      "slug": "matematyka-7-klas",
      "title": "Математика, 7 клас",
      "type": "COURSE",
      "status": "MODERATION",
      "priceAmount": 29900,
      "currency": "UAH",
      "lessonsCount": 12,
      "durationSec": 7200,
      "submittedAt": "2026-09-10T08:00:00.000Z",
      "publishedAt": null,
      "rejectionReason": null,
      "createdAt": "2026-09-01T08:00:00.000Z",
      "updatedAt": "2026-09-10T08:00:00.000Z",
      "category": { "id": "uuid", "slug": "matematyka", "nameUk": "Математика" },
      "author": { "id": "uuid", "fullName": "Оксана Петренко", "email": "author@example.com" }
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1,
  "totalPages": 1
}
```

### Повний вміст курсу для перевірки

`GET /api/admin/courses/:id`

Повна форма курсу: модулі й уроки з `textContent`, метаданими відео та
файлів — включно з уроками поза безкоштовним прев'ю (адмін бачить усе, на
відміну від публічного `GET /api/courses/:idOrSlug`), плюс `author { id,
fullName, email }` і `moderationHistory` — останні 20 записів журналу
модерації по курсу, `createdAt` спадним:

```json
{
  "id": "uuid",
  "...": "решта полів курсу, як у fullCourseSelect автора",
  "author": { "id": "uuid", "fullName": "Оксана Петренко", "email": "author@example.com" },
  "moderationHistory": [
    {
      "id": "uuid",
      "action": "SUBMITTED",
      "fromStatus": "DRAFT",
      "toStatus": "MODERATION",
      "comment": null,
      "createdAt": "2026-09-10T08:00:00.000Z",
      "moderator": null
    }
  ]
}
```

`moderator` — `{ id, fullName }` або `null` (наприклад, для запису
`SUBMITTED`, який залишає автор, а не модератор). `404` — курс не існує або
видалений.

### Модерація (`moderate`)

`POST /api/admin/courses/:id/moderate` — курс має бути в статусі
`MODERATION`, інакше `409`. Тіло (`.strict()`, форма залежить від `action`):

    { "action": "APPROVE", "comment": "Чудовий курс" }   // comment необов'язковий
    { "action": "REJECT",  "comment": "Додайте опис уроків" } // comment обов'язковий

`comment`, якщо є, після обрізання пробілів — `1..2000` символів; порожній
рядок або відсутній `comment` при `REJECT` → `400`.

- `APPROVE`: `moderation → published`. `publishedAt` не змінюється, якщо вже
  був заповнений (курс публікується вперше), інакше ставиться поточний час.
  `rejectionReason` скидається в `null`.
- `REJECT`: `moderation → rejected`, `rejectionReason` = `comment`.

Відповідь `200` — той самий об'єкт, що й у `GET /api/admin/courses/:id`,
перечитаний після переходу. `404` — курс не існує; `409` — курс не в
статусі `MODERATION` на момент запиту, або статус змінився паралельно (гонка
двох модераторів).

### Зняття з публікації (`unpublish`)

`POST /api/admin/courses/:id/unpublish` — курс має бути в статусі
`PUBLISHED`, інакше `409`. Тіло (`.strict()`):

    { "comment": "Порушення авторських прав" }

`comment` обов'язковий, після обрізання пробілів `1..2000` символів;
відсутній або порожній → `400`. Перехід `published → unpublished`,
`rejectionReason` = `comment`. Відповідь `200` — як у `moderate`.

### Побічні ефекти переходу

Кожен успішний перехід (`moderate` і `unpublish`) атомарно:

1. Змінює статус курсу.
2. Додає запис у журнал модерації (`moderationHistory` на сторінці курсу).
3. Створює автору курсу сповіщення `type: "MODERATION"` з `payload:
   { courseId, status }` — заголовок і текст українською:
   - `APPROVE` → `Курс «<title>» опубліковано`, текст — `comment` або `null`;
   - `REJECT` → `Курс «<title>» відхилено`, текст — `comment`;
   - `unpublish` → `Курс «<title>» знято з публікації`, текст — `comment`.

Листи не надсилаються — лише запис у `Notification`, показ на клієнті —
задача сторінки сповіщень.

## Адміністрування — користувачі та категорії

Усі маршрути під префіксом `/api/admin`. Весь роутер вимагає Bearer-токен
**і** роль `ADMIN`. Без токена — `401`; з роллю `STUDENT` або `AUTHOR` — `403`.

    GET    /api/admin/users
    PATCH  /api/admin/users/:id/status
    PATCH  /api/admin/users/:id/verify-author
    GET    /api/admin/categories
    POST   /api/admin/categories
    PATCH  /api/admin/categories/:id
    DELETE /api/admin/categories/:id

### Список користувачів

`GET /api/admin/users` — пагінований список для адмін-панелі. М'яко видалені
користувачі (`deletedAt != null`) не повертаються.

Query-параметри:

    q=<рядок>                // необов'язково: частина email або fullName, без урахування регістру
    role=STUDENT|AUTHOR|ADMIN
    status=ACTIVE|BLOCKED
    page=1                   // за замовчуванням 1
    limit=20                 // 1..50, за замовчуванням 20

Сортування стабільне: новіші акаунти спочатку (`createdAt DESC`), потім `id`.

Відповідь `200`:

    {
      "items": [
        {
          "id": "uuid",
          "email": "author@example.com",
          "fullName": "Олена Автор",
          "roles": ["AUTHOR"],
          "status": "ACTIVE",
          "createdAt": "2026-09-20T10:00:00.000Z",
          "displayName": "Олена Автор",
          "isVerified": true
        }
      ],
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }

`displayName` і `isVerified` додаються до елемента для акаунтів з роллю
`AUTHOR`; якщо роль автора вже є, але профіль ще не створено, повертаються
`displayName: null` та `isVerified: false`.

### Блокування користувача

`PATCH /api/admin/users/:id/status` — тіло (`.strict()`):

    { "status": "ACTIVE" }   // або "BLOCKED"

- `404` — користувача не існує або він видалений (`deletedAt` заповнений).
- `409` — у користувача є роль `ADMIN` (включно з власним акаунтом
  адміністратора, який робить запит) — адміна не можна заблокувати з
  адмін-панелі.
- Статус уже такий, як у запиті → `200` з поточними даними, без запису в базу.
- `BLOCKED`: статус змінюється, після чого відкликаються всі сесії
  користувача (усі refresh-токени в Redis і журнал у Postgres). Вже виданий
  access-токен продовжує діяти до кінця свого терміну (`JWT_ACCESS_TTL`, за
  замовчуванням 15 хвилин) — його неможливо відкликати достроково, а
  оновити (`/api/auth/refresh`) вже не вийде.
- `ACTIVE`: змінюється лише статус, сесії не чіпаються.

Відповідь `200`:

    { "id", "email", "fullName", "roles": ["STUDENT"], "status": "BLOCKED",
      "updatedAt" }

### Підтвердження автора

`PATCH /api/admin/users/:id/verify-author` — тіло (`.strict()`):

    { "isVerified": true }

- `404` — користувача не існує/видалений, або в нього немає профілю автора
  (`AuthorProfile`).
- `true`: `isVerified = true`; `verifiedAt` не змінюється, якщо вже було
  заповнене (повторне підтвердження), інакше ставиться поточний час.
- `false`: `isVerified = false`, `verifiedAt = null`.

Відповідь `200`:

    { "userId", "displayName", "isVerified": true, "verifiedAt" }

### Категорії каталогу

Елемент відповіді у всіх чотирьох маршрутах:

    { "id", "parentId", "slug", "nameUk", "nameEn", "iconKey",
      "sortOrder", "isActive", "coursesCount", "childrenCount",
      "createdAt", "updatedAt" }

`coursesCount` і `childrenCount` — лічильники пов'язаних курсів і
підкатегорій; курси рахуються включно з м'яко видаленими (вони все одно
тримають зовнішній ключ на категорію). Дерево категорій — **максимум два
рівні**: коренева категорія (`parentId: null`) і її прямі підкатегорії;
підкатегорія не може мати власних підкатегорій.

`GET /api/admin/categories` — плаский список усіх категорій, включно з
неактивними (на відміну від публічного `GET /api/categories`, який віддає
лише активні у вигляді дерева). Сортування: `sortOrder` зростаючим, потім
`nameUk` зростаючим. Без пагінації. Відповідь `200`: `{ "items": [...] }`.

`POST /api/admin/categories` → `201` з елементом. Тіло (`.strict()`):

    { "slug": "fizyka", "nameUk": "Фізика", "nameEn": "Physics",
      "iconKey": "atom", "parentId": null, "sortOrder": 4, "isActive": true }

- `slug` — після обрізання пробілів `2..120` символів, лише малі латинські
  літери, цифри й дефіси (`^[a-z0-9]+(?:-[a-z0-9]+)*$`).
- `nameUk` — обов'язкове, `1..120` символів після обрізання.
- `nameEn`, `iconKey` — необов'язкові, можуть бути `null`; `iconKey` —
  `1..64` символів.
- `parentId` — необов'язковий uuid або `null`.
- `sortOrder` — ціле `0..10000`, за замовчуванням `0`.
- `isActive` — булеве, за замовчуванням `true`.

Помилки: `409` — слаг уже зайнятий; `400` з `error.details[0].field ===
"parentId"` — батьківська категорія не знайдена, або в неї самої є свій
`parentId` (це зробило б нову категорію третім рівнем вкладеності).

`PATCH /api/admin/categories/:id` → `200` з елементом. Тіло — ті самі поля,
усі необов'язкові, без значень за замовчуванням, `.strict()`; порожнє тіло →
`400`. `404` — категорію не знайдено. Новий `slug`, зайнятий іншою
категорією, → `409`. Якщо в тілі `parentId` не `null`:

- дорівнює `id` категорії, що редагується, → `400`;
- батьківську категорію не знайдено → `400`;
- батьківська категорія сама не є кореневою → `400`;
- у категорії, що редагується, вже є власні підкатегорії → `400`.

Усі ці помилки — `error.details[0].field === "parentId"`.

`DELETE /api/admin/categories/:id` → `204` без тіла. `404` — категорію не
знайдено. `409` — `coursesCount > 0` (`"Category has courses"`) або
`childrenCount > 0` (`"Category has subcategories"`).

Кожен успішний запис (`POST`, `PATCH`, `DELETE`) одразу скидає кеш
публічного дерева категорій — наступний `GET /api/categories` бачить зміну
без затримки на TTL кешу.

## Кошик і замовлення

Шість маршрутів. Усі вимагають Bearer-токен; доступ має будь-яка авторизована
роль (`STUDENT`, `AUTHOR`, `ADMIN`) — купувати може будь-який зареєстрований
користувач, гість — ні. Без токена — `401`.

    GET    /api/cart
    POST   /api/cart/items
    DELETE /api/cart/items/:courseId
    POST   /api/orders
    GET    /api/me/orders
    GET    /api/me/orders/:id

**Цей крок не відкриває доступ до курсу.** Доступ (`Enrollment`) з'являється
лише після підтвердження оплати вебхуком — окрема задача. `POST /api/orders`
тільки фіксує, що і за скільки купується.

### Кошик

`GET /api/cart` — вид кошика:

```json
{
  "items": [
    {
      "courseId": "uuid",
      "slug": "matematyka-7-klas",
      "title": "Математика, 7 клас",
      "type": "COURSE",
      "priceAmount": 29900,
      "currency": "UAH",
      "coverFileId": "uuid | null",
      "author": { "id": "uuid", "displayName": "Оксана Петренко" },
      "isAvailable": true,
      "unavailableReason": null,
      "addedAt": "2026-09-17T10:00:00.000Z"
    }
  ],
  "itemsCount": 1,
  "totalAmount": 29900,
  "currency": "UAH"
}
```

`isAvailable` / `unavailableReason` перераховуються **при кожному `GET`**:
поки курс лежав у кошику, його могли зняти з публікації або купити. `author`
= `authorProfile.displayName`, якщо профіль заповнений, інакше `fullName`
(як у каталозі). `totalAmount` сумує лише **доступні** позиції.
`itemsCount` рахує всі позиції, включно з недоступними. Порожній кошик —
`items: []`, нулі.

`POST /api/cart/items` — тіло (`.strict()`): `{ "courseId": "uuid" }`.
Відповідь `200` — кошик у тій самій формі, що й `GET`. Повторне додавання
того самого курсу не створює дублікат.

- `404` — курсу не існує або він м'яко видалений (`deletedAt` заповнений).
- `409` — курс не можна додати в кошик; `error.details[0].field ===
  "courseId"`. П'ять причин і тексти для інтерфейсу:

  | Причина | `unavailableReason` / `details[0].message` |
  |---|---|
  | курс не `PUBLISHED` або видалений | `Курс недоступний для купівлі` |
  | `priceAmount === 0` (безкоштовний) | `Курс безкоштовний, купувати його не потрібно` |
  | покупець — автор курсу | `Не можна купити власний курс` |
  | у покупця вже є активний `Enrollment` | `Курс уже придбано` |
  | валюта курсу не `UAH` | `Курс продається у валюті, яку не підтримує оплата` |

  Оплата працює лише в гривні (LiqPay sandbox), тому курс в іншій валюті в
  кошик не потрапляє.

`DELETE /api/cart/items/:courseId` → `200`, кошик у тій самій формі.
Відсутність позиції — не помилка, теж `200`.

### Замовлення

`POST /api/orders` — тіло не потрібне. Створює замовлення з поточного
кошика і **одразу очищає кошик**. Відповідь `201`:

```json
{
  "id": "uuid",
  "number": 1024,
  "status": "PENDING",
  "totalAmount": 59800,
  "currency": "UAH",
  "createdAt": "2026-09-17T10:00:00.000Z",
  "paidAt": null,
  "cancelledAt": null,
  "items": [
    { "id": "uuid", "courseId": "uuid", "courseSlug": "matematyka-7-klas",
      "title": "Математика, 7 клас", "priceAmount": 29900 }
  ]
}
```

`title` — це `titleSnapshot`: назва курсу на момент покупки, курс можуть
перейменувати пізніше. Ціна завжди береться з курсу на сервері, клієнт її не
передає.

- `409` — кошик порожній (`"Cart is empty"`).
- `409` — у кошику є курси, які вже не можна купити (зняті з публікації,
  куплені раніше тощо, поки лежали в кошику). Замовлення **не створюється**,
  кошик **не змінюється**. Тіло помилки:

  ```json
  { "error": { "code": "CONFLICT", "message": "Some courses in the cart cannot be purchased",
    "details": [ { "field": "<courseId цього курсу>", "message": "Курс уже придбано" } ] } }
  ```

  На відміну від `POST /api/cart/items`, тут `field` — це **id курсу**, а не
  літерал `"courseId"`: помилка може стосуватися кількох позицій одразу, і
  фронт має прибрати з кошика саме ці курси.

**Одне замовлення, що очікує оплати, на користувача.** Новий успішний
`POST /api/orders` скасовує попереднє замовлення в статусі `PENDING`
(`status: "CANCELLED"`, заповнюється `cancelledAt`) — інакше один і той самий
курс можна було б оплатити двічі.

**Доступ до курсу після `POST /api/orders` не відкривається.** `Enrollment`
з'являється лише після підтвердження оплати вебхуком платіжної системи.

`GET /api/me/orders` — сторінка власних замовлень користувача, найновіші
першими. Query: `page` (за замовчуванням `1`), `limit` (за замовчуванням
`20`, максимум `50`). Відповідь `200`:

```json
{ "items": [ /* форма замовлення вище */ ], "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
```

`GET /api/me/orders/:id` → `200`, форма замовлення вище. Чуже замовлення
невідрізниме від неіснуючого — `404`.

Суми скрізь — цілі копійки (`number`), без дробової частини. У гривні
форматувати лише при відображенні, ніколи не зберігати й не передавати
дробове число.

## Маршрути фронтенду

| URL | Сторінка | Доступ |
|---|---|---|
| `/` | Головна | гість |
| `/courses` | Каталог | гість |
| `/courses/:id` | Сторінка курсу | гість |
| `/authors/:id` | Публічний профіль автора | гість |
| `/become-author` | Активація / редагування профілю автора | авторизований користувач |
| `/login`, `/register` | Авторизація | гість |
| `/cart`, `/checkout` | Кошик, оплата | учень |
| `/learn/:courseId/:lessonId` | Плеєр | учень |
| `/learning`, `/orders`, `/settings` | Кабінет учня | учень |
| `/author/*` | Кабінет автора | автор |
| `/admin/*` | Адмін-панель | адмін |

Будувати посилання лише через `routes` з `@vexa/shared`, не рядками в коді.
`routeAccess` там же — **підсказка для навігації, не захист**. Реальна перевірка
прав на сервері при кожному запиті.