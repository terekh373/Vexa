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


### Вхід через Google OAuth 2.0

`GET /api/auth/google` — браузерний redirect на Google. API створює випадковий
`state`, зберігає його в Redis на 10 хвилин і передає Google для CSRF-захисту.
Цей endpoint треба відкривати через `window.location`, а не XHR.

Google повертає користувача на `GET /api/auth/google/callback`. API одноразово
споживає `state`, обмінює authorization code на профіль Google (`sub`, `email`,
`email_verified`, `name`) і **не** передає access/refresh токени через URL.
Натомість створюється одноразовий внутрішній код на 60 секунд, після чого API
редіректить на веб:

    /auth/google/callback?code=<one-time-code>

або при помилці:

    /auth/google/callback?error=<error-code>

Веб одразу викликає:

`POST /api/auth/google/exchange`

    { "code": "..." }

Успіх → `200` і та сама форма `{ user, tokens }`, що у звичайного
`POST /api/auth/login`. Код атомарно одноразовий: повторне використання → `404`.
Заблокований користувач → `403`.

Правило акаунтів: спочатку пошук за `google_id`; якщо не знайдено — за email.
До існуючого акаунта Google прив'язується лише для підтвердженого Google email.
Новий Google-користувач створюється з `password_hash = null`, стандартною роллю
`STUDENT` і підтвердженим email. Акаунт з паролем і Google залишається одним.

Змінні API: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.
Локальний callback: `http://localhost:3000/api/auth/google/callback`.


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

## Шкільна програма

`GET /api/curriculum`

Публічний ендпоінт, без токена. Повертає дерево «предмет → клас → тема».
Предмети відсортовані за `nameUk`; класи — за зростанням, група
`grade: null` (поза шкільною програмою, наприклад підготовка до НМТ) іде
останньою; теми — за `sortOrder`, далі за `title`.

Відповідь `200`:

    { "items": [
        { "id": "uuid", "slug": "matematyka", "nameUk": "Математика",
          "grades": [
            { "grade": 9,
              "topics": [
                { "id": "uuid", "title": "Квадратні рівняння", "sortOrder": 1 }
              ] },
            { "grade": null, "topics": [] }
          ] }
      ] }

- Предмет без тем повертається з `grades: []`.
- Порожня база → `{ "items": [] }`, статус `200`.
- Відповідь кешується на сервері на 5 хвилин (Redis, fail-open). Адмінського
  керування програмою немає, тож нові дані з'являються після завершення
  кешу. Клієнту кешувати окремо не потрібно.

Тип відповіді — `CurriculumResponse` у `@vexa/shared`.

### Навігація «предмет → клас → тема»

Дерево будується прямо з відповіді, окремих запитів на кожен рівень немає.
Посилання на каталог ведуть так:

- предмет або клас у предметі — `routes.catalog({ subject: subject.slug })` і
  `routes.catalog({ subject: subject.slug, grade })`; клас фільтрує поле
  `grade` курсу;
- тема — `routes.catalog({ topic: topic.id })`.

Групу `grade: null` показувати окремим блоком («Поза програмою»); посилання
для неї — лише на теми, без параметра `grade`.

## Курси

### Каталог

`GET /api/courses`

Доступний без авторизації. Підтримує пошук, фільтрацію, сортування та пагінацію.

Query-параметри:

- `q` — текстовий пошук за назвою, описом і тегами.
- `type` — `course` або `material`.
- `category` — slug або id категорії. Враховуються також дочірні категорії.
- `subject` — slug предмета шкільної програми (`GET /api/curriculum`).
  Невідомий slug → порожній список, не помилка.
- `topic` — id теми шкільної програми. Не uuid → `400`.
- `grade` — клас від `1` до `11`. Фільтрує клас курсу (`courses.grade`), тому
  зв'язка «предмет → клас» — це `?subject=...&grade=...`.
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

### Підказки пошуку

`GET /api/courses/suggest?q=`

Доступний без авторизації. Автодоповнення для рядка пошуку: назви опублікованих
курсів і матеріалів, що містять запит.

- `q` — від `2` до `120` символів (після обрізання пробілів). Коротший або
  відсутній `q` → `400`; інші параметри не приймаються.
- Повертає не більше `8` результатів. Спершу назви, що починаються із запиту,
  далі — за схожістю та популярністю.
- Стійкий до одруківок: `квадратни` знайде «Квадратні рівняння…».
- Викликати з debounce приблизно `250` мс, щоб не надсилати запит на кожну
  літеру.

Відповідь `200` (тип `CourseSuggestResponse` у `@vexa/shared`):

    { "items": [
        { "id": "uuid", "slug": "kvadratni-rivnyannya-9-klas",
          "title": "Квадратні рівняння для 9 класу", "type": "course" }
      ] }

`type` — `course` або `material`. Порожній результат → `{ "items": [] }`.

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

Для відео цей ендпоінт завжди повертає `409`: відео лише стрімиться (ТЗ 20.2).
Плеєр отримує посилання через `GET /api/learn/lessons/:lessonId`.

Типи запитів/відповідей — `CreateUploadUrlRequest`, `CreateUploadUrlResponse`,
`FileDto`, `DownloadUrlResponse` у `@vexa/shared`.

### Відео уроку (Cloudflare Stream)

Відео йде з браузера напряму в Cloudflare Stream, повз API. Лише `AUTHOR`.

**1.** `POST /api/files/video-upload-url` — Bearer, лише `AUTHOR`.

    { "originalName": "lesson.mp4",
      "mimeType": "video/mp4",
      "sizeBytes": 52428800 }

- `mimeType` — `video/mp4`, `video/quicktime` або `video/webm`.
- `sizeBytes` — точний `File.size`, не більше **200 МБ**. Довші відео потребують
  tus, його не підтримуємо; тривалість — до години.

Відповідь `201`: `{ "fileId", "uploadUrl" }`. `uploadUrl` одноразовий.

`400` — недозволений тип або розмір; `403` — не автор; `503` — відео не
налаштоване на сервері або Stream недоступний.

**2.** `POST <uploadUrl>` — `multipart/form-data`, поле `file`, без
`Authorization`, напряму в Stream.

    const form = new FormData();
    form.append('file', file);
    await fetch(uploadUrl, { method: 'POST', body: form });

**3.** `POST /api/files/:fileId/confirm` — Bearer, той самий автор.

- `200` — відео готове (`file.isReady: true`).
- `202` — Stream ще обробляє відео (`file.isReady: false`). Повторювати запит
  кожні ~5 с; зупинитися приблизно через 5 хв і показати «відео обробляється».
- `409` «Video has not been uploaded yet» — завантаження не завершилося.
- `409` «Video processing failed» — причина в `error.details`; завантажити інший
  файл.

**4.** Прив'язка: `PATCH /api/author/lessons/:id` з `{ "videoFileId": "<fileId>" }`
— лише для готового файлу (інакше `404`). Тривалість уроку береться з відео.

## Кабінет автора (конструктор курсу)

Усі маршрути під префіксом `/api/author`. Весь роутер вимагає Bearer-токен
**і** роль `AUTHOR`. **Роль `ADMIN` сюди не пускається.** Без токена — `401`;
з роллю `STUDENT` або `ADMIN` — `403`.

    GET    /api/author/dashboard          ?period=7d|30d|90d|all
    GET    /api/author/balance
    GET    /api/author/balance/entries    ?page=1&limit=20
    POST   /api/author/payouts
    GET    /api/author/payouts            ?page=1&limit=20
    GET    /api/author/reviews            ?page=1&limit=20
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
    POST   /api/author/courses/:id/files
    PATCH  /api/author/courses/:id/files/reorder
    PATCH  /api/author/courses/:id/files/:courseFileId
    DELETE /api/author/courses/:id/files/:courseFileId
    PATCH  /api/author/courses/:id/reorder
    POST   /api/author/courses/:id/submit
    POST   /api/author/courses/:id/unpublish
    POST   /api/author/reviews/:id/reply

### Дашборд, баланс, виплати та відгуки автора

Усі суми нижче — **цілі копійки**. Форматування у гривні робить клієнт.

`GET /api/author/dashboard?period=7d|30d|90d|all`

Відповідь `200`:

    {
      "period": "30d",
      "salesCount": 12,
      "revenueAmount": 245000,
      "studentsCount": 9,
      "ratingAvg": 4.75,
      "reviewsCount": 8,
      "coursesByStatus": {
        "DRAFT": 1,
        "MODERATION": 0,
        "PUBLISHED": 3,
        "REJECTED": 0,
        "UNPUBLISHED": 1
      },
      "currency": "UAH"
    }

`salesCount` і `revenueAmount` рахуються лише за оплаченими `order_items` автора
у вибраному періоді; `studentsCount` — унікальні активні зарахування за цей
період; рейтинг — лише опубліковані відгуки за період. `coursesByStatus`
показує поточний стан усіх не видалених курсів автора.

`GET /api/author/balance`

    {
      "availableAmount": 180000,
      "pendingAmount": 0,
      "withdrawnAmount": 50000,
      "currency": "UAH",
      "payoutMinAmount": 50000,
      "updatedAt": "2026-09-23T12:00:00.000Z"
    }

Якщо запису балансу ще немає, усі суми повертаються як `0`, валюта — `UAH`.
`payoutMinAmount` приходить із `PAYOUT_MIN_AMOUNT` серверного конфігу.

`GET /api/author/balance/entries?page=1&limit=20` — історія ledger. Відповідь:

    {
      "items": [
        {
          "id": "uuid",
          "type": "SALE",
          "amount": 8500,
          "comment": "Продаж «Курс»",
          "createdAt": "...",
          "orderItem": { "id": "uuid", "titleSnapshot": "Курс" },
          "payout": null
        }
      ],
      "page": 1, "limit": 20, "total": 1, "totalPages": 1
    }

`POST /api/author/payouts`

    { "amount": 50000, "method": "CARD", "destination": "4444 3333 2222 1111" }

`method`: `CARD | IBAN`. `amount` має бути integer, не менше
`payoutMinAmount` і не більше `availableAmount`. Успіх → `201`:

    {
      "id": "uuid",
      "amount": 50000,
      "currency": "UAH",
      "method": "CARD",
      "destinationMasked": "**** 1111",
      "status": "REQUESTED",
      "comment": null,
      "processedAt": null,
      "createdAt": "..."
    }

Повні реквізити після валідації **не зберігаються**: у БД лишається тільки
`destinationMasked` з останніми 4 символами. Створення заявки атомарно зменшує
`availableAmount` і додає `balance_entries` типу `PAYOUT` з від'ємною сумою.
Паралельні заявки не можуть вивести баланс у мінус. Нижче мінімуму → `400`;
сума більша за доступну → `409`. Після успіху автор отримує email і внутрішнє
сповіщення; збій email не відкочує заявку.

`GET /api/author/payouts?page=1&limit=20` — історія заявок у форматі
`{ items, page, limit, total, totalPages }`; кожний елемент має ту саму форму,
що відповідь `POST /api/author/payouts`.

`GET /api/author/reviews?page=1&limit=20` — опубліковані відгуки на курси
автора:

    {
      "items": [
        {
          "id": "uuid", "rating": 5, "text": "...",
          "authorReply": null, "authorRepliedAt": null, "hasReply": false,
          "createdAt": "...", "updatedAt": "...",
          "user": { "id": "uuid", "fullName": "Учень" },
          "course": { "id": "uuid", "title": "Курс", "slug": "course" }
        }
      ],
      "page": 1, "limit": 20, "total": 1, "totalPages": 1
    }

Відповідь на відгук залишається окремим
`POST /api/author/reviews/:id/reply`.

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

#### Теми шкільної програми курсу

Автор прив'язує курс до тем програми (`GET /api/curriculum`) через
`PATCH /api/author/courses/:id`:

    { "topicIds": ["uuid", "uuid"] }

- `topicIds` — до `10` унікальних id тем, усі з **одного предмета**. Список
  замінює попередній набір цілком.
- Порожній масив `[]` знімає всі теми курсу.
- Поле можна надсилати разом з іншими або окремо. Без `topicIds` теми курсу
  не змінюються.
- Як і інші зміни, працює лише для курсу у редагованому статусі
  (`DRAFT`, `REJECTED`, `UNPUBLISHED`); інакше `409`.
- `GET /api/author/courses/:id` повертає обрані теми в `topics`:

      "topics": [
        { "topic": { "id": "uuid", "title": "Квадратні рівняння", "grade": 9,
                     "subject": { "id": "uuid", "slug": "matematyka", "nameUk": "Математика" } } }
      ]

- Помилки `400` з `details`: повтор id (`field: "topicIds.1"`), більше `10` id,
  не uuid, тема не існує (`Одна або кілька тем не існують`), теми з різних
  предметів (`Теми мають належати одному предмету`).

### Модуль і урок

Модуль (`.../modules`): `title`, `sortOrder`.

Урок (`.../lessons`): `type`, `title`, `sortOrder`, `isFreePreview`,
`textContent`, `videoFileId`, `durationSec`, `fileIds[]`.

`type: "QUIZ"` дозволений. Для такого уроку тест створюється окремим `POST /api/author/lessons/:id/quiz`.

### Тести (`QUIZ`)

Усі маршрути нижче доступні лише ролі `AUTHOR` і перевіряють, що урок/тест/питання належить курсу поточного автора. Чужий ресурс повертає `403`. Тести редагуються в `DRAFT`, `REJECTED` та `UNPUBLISHED` — так само, як уроки; в інших статусах — `409`.

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

### Файли матеріалу (MATERIAL)

Курс з `type = MATERIAL` наповнюється файлами, а не уроками. Порядок дій:

1. Завантажити файл як `ATTACHMENT` через `POST /api/files/upload-url` і
   `confirm` (див. розділ «Файли»).
2. Прив'язати його: `POST /api/author/courses/:id/files`.

Маршрути:

- `POST /api/author/courses/:id/files` — тіло `{ "fileId": "uuid", "title": "Конспект" }`
  (`title`: `1..180` символів після trim). `201`. `sortOrder` призначається
  автоматично — наступний після останнього.
- `PATCH /api/author/courses/:id/files/:courseFileId` — тіло `{ "title" }`. `200`.
- `PATCH /api/author/courses/:id/files/reorder` — тіло
  `{ "files": [ { "id": "courseFileId", "sortOrder": 0 } ] }`; `id` — це `id`
  прив'язки (не `fileId`), дублікат `id` → `400`. `200`, відповідь — масив
  усіх файлів матеріалу в новому порядку.
- `DELETE /api/author/courses/:id/files/:courseFileId` — `204`. Видаляється
  лише прив'язка, сам файл лишається.

Відповідь `POST` і `PATCH` (і елементи масиву `reorder`):

    { "id": "uuid", "fileId": "uuid", "title": "Конспект", "sortOrder": 0,
      "file": { "id": "uuid", "kind": "ATTACHMENT", "originalName": "notes.pdf",
                "mimeType": "application/pdf", "isReady": true } }

Помилки:

- `404 Course not found` — курс не існує, чужий або видалений;
- `409` — курс не в `DRAFT` / `REJECTED` / `UNPUBLISHED`;
- `409 Files can be attached only to a MATERIAL` — курс має тип `COURSE`;
- `404 File not found` — файл чужий, не `ATTACHMENT`, ще не готовий або видалений;
- `409 File is already attached` — файл уже прив'язаний до цього курсу;
- `404 Course file not found` — прив'язка не належить цьому курсу.

`GET /api/author/courses/:id` повертає масив `courseFiles` (за `sortOrder`, потім
за часом створення) з тими самими полями, що й відповідь `POST`.

### Подача на модерацію

`POST /api/author/courses/:id/submit` — переводить `DRAFT`, `REJECTED` або
`UNPUBLISHED` у `MODERATION`.

`POST /api/author/courses/:id/unpublish` — лише власник курсу; переводить
`PUBLISHED → UNPUBLISHED`, тіло не потрібне. У `moderation_log` створюється
запис `action = UNPUBLISHED`, а `moderatorId` містить id автора. Повторний
виклик для курсу не в `PUBLISHED` повертає `409`. Після зняття курс можна
редагувати й повторно подати на модерацію; видалення як і раніше дозволене
лише для `DRAFT` та `REJECTED`.

Перед переведенням у `MODERATION` сервер перевіряє повноту курсу:

- `COURSE` — щонайменше один урок;
- урок `VIDEO` — завантажене й оброблене відео;
- урок `QUIZ` — тест хоча б з одним питанням, і в кожному питанні є правильна відповідь;
- `MATERIAL` — хоча б один готовий файл.

Якщо чогось бракує, відповідь `400` (`VALIDATION_ERROR`), статус не змінюється:

    { "error": { "code": "VALIDATION_ERROR",
                 "message": "Course is not ready for moderation",
                 "details": [
                   { "field": "lessons.<lessonId>.video",
                     "message": "Урок «Вступ»: відео не завантажене або ще обробляється" },
                   { "field": "lessons.<lessonId>.quiz.questions.<questionId>",
                     "message": "Урок «Тест 1»: у питанні немає правильної відповіді" } ] } }

Можливі `field`: `lessons`, `lessons.<id>.video`, `lessons.<id>.quiz`,
`lessons.<id>.quiz.questions.<questionId>`, `courseFiles`. Порада для UI:
показувати кожну проблему біля відповідного уроку (або блоку файлів) за
`field`, а не одним списком помилок.

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
лише після підтвердження оплати вебхуком — див. «Оплата (LiqPay sandbox)»
нижче. `POST /api/orders` тільки фіксує, що і за скільки купується.

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

### Оплата (LiqPay sandbox)

`POST /api/orders/:id/checkout` — почати оплату замовлення. Права ті самі,
що й в решти маршрутів цього розділу (`STUDENT`, `AUTHOR`, `ADMIN`, Bearer
обов'язковий). Відповідь `200`:

```json
{
  "paymentId": "uuid",
  "checkoutUrl": "https://www.liqpay.ua/api/3/checkout",
  "data": "base64-рядок",
  "signature": "base64-рядок"
}
```

- `401` — без токена.
- `404` — замовлення не знайдено або воно чуже (невідрізнимо від неіснуючого).
- `409` — замовлення не в статусі `PENDING` (вже оплачене, скасоване тощо).

Повторний виклик для того самого замовлення, поки платіж ще не завершився,
повертає той самий `paymentId` — новий платіж не створюється.

Як відправити: HTML-форма, що постить `data` і `signature` прямо на LiqPay,
без проміжного запиту з фронту:

```html
<form method="POST" action="{checkoutUrl}" accept-charset="utf-8">
  <input type="hidden" name="data" value="{data}" />
  <input type="hidden" name="signature" value="{signature}" />
  <button type="submit">Оплатити</button>
</form>
```

Після оплати LiqPay повертає користувача на `routes.checkoutSuccess(orderId)`
(`/checkout/success/:orderId`). Ця сторінка нічого не знає про результат
оплати сама по собі — доступ відкриває вебхук, а не редирект. Фронт має
опитувати `GET /api/me/orders/:id` кожні ~2 секунди, поки `status ===
"PENDING"`, і зупинитись максимум після ~30 секунд:

- `"PAID"` — оплата пройшла, показати успіх і посилання на курс;
- `"FAILED"` — оплату відхилено, запропонувати спробувати ще раз;
- `"CANCELLED"` — замовлення скасоване (наприклад, користувач створив нове),
  оплата за цим замовленням більше не приймається;
- якщо після ~30 секунд статус усе ще `"PENDING"` — показати «оплата
  обробляється», без помилки.

Параметрам самого URL (query-рядку) довіряти не можна — LiqPay не підписує
`result_url`, тож єдине надійне джерело статусу — `GET /api/me/orders/:id`.

`POST /api/payments/webhook` — лише для LiqPay, фронт його ніколи не
викликає напряму.

Тестові картки sandbox: `4242 4242 4242 4242` — успіх, `4000 0000 0000 0002`
— відмова. Термін дії — будь-яка майбутня дата, CVV — будь-які 3 цифри.

Комісія рахується один раз, у момент обробки вебхука: округлення вниз, на
користь автора. Покупцю поля комісії (`commissionRateBps`,
`commissionAmount`, `authorAmount`) ніколи не повертаються — так само, як і
в `POST /api/orders`.

## Навчання (плеєр)

### Вміст уроку

`GET /api/learn/lessons/:lessonId` — Bearer; ролі `STUDENT`, `AUTHOR`, `ADMIN`.

**Доступ перевіряється на кожен запит**, окремою чистою функцією
(`decideLessonAccess`), правила застосовуються по черзі, перше, що
спрацювало, — перемагає:

1. Адмін бачить усе (`access: "ADMIN"`).
2. Автор курсу бачить усе своє (`access: "AUTHOR"`).
3. Активний `Enrollment` (без `revokedAt`) дає доступ незалежно від статусу
   курсу (`access: "ENROLLED"`) — покупка не втрачається, коли курс потім
   знімають з публікації. Закрити куплений доступ може лише
   `Enrollment.revokedAt`.
4. Якщо курс не в статусі `PUBLISHED` і жодне з правил 1–3 не спрацювало —
   `404`, як і `GET /api/courses/:idOrSlug`: для такого користувача курсу
   не існує.
5. Безкоштовне прев'ю опублікованого курсу — `access: "PREVIEW"`.
6. Інакше — `403`.

Поле `access` визначає, що показувати навколо плеєра: при
`access === "PREVIEW"` елементи прогресу (позначки "переглянуто", прогрес-бар
курсу тощо) не показуються — у користувача ще немає `Enrollment`, писати
прогрес нема куди.

Приклад відповіді `200`:

    {
      "access": "ENROLLED",
      "lesson": {
        "id": "uuid",
        "courseId": "uuid",
        "moduleId": "uuid",
        "type": "VIDEO",
        "title": "string",
        "position": 0,
        "isPreview": false,
        "durationSec": 612,
        "text": null,
        "video": { "status": "READY", "hlsUrl": "https://...", "expiresIn": 1212, "durationSec": 612 },
        "materials": [
          { "id": "uuid", "fileId": "uuid", "name": "Конспект.pdf", "format": "pdf", "mimeType": "application/pdf", "sizeBytes": "1204224" }
        ],
        "quiz": null
      }
    }

- `position` = `Lesson.sortOrder`, `isPreview` = `Lesson.isFreePreview` — ті
  самі імена, що й у публічному `GET /api/courses/:idOrSlug`.
- `text` — вміст `TEXT`-уроку, або `null`.
- `video` — `null`, якщо в уроку немає відео. Інакше `video.status`:
  - `"READY"` — відео на Cloudflare Stream і підпис налаштована на сервері:
    `hlsUrl` і `expiresIn` справжні, плеєр може відтворювати;
  - `"PROCESSING"` — файл ще не готовий (`File.isReady = false`):
    `hlsUrl`/`expiresIn` — `null`, показати "відео обробляється";
  - `"UNAVAILABLE"` — підпис не налаштована на сервері або відео не на
    Cloudflare Stream: `hlsUrl`/`expiresIn` — `null`, показати заглушку
    "відео тимчасово недоступне", це не помилка користувача.

  **`hlsUrl` не кешувати** — посилання живе `expiresIn` секунд від моменту
  відповіді. Якщо плеєр під час відтворення отримав `403` від CDN (посилання
  протухло) — повторно запросити цей самий ендпоінт і продовжити з поточної
  позиції відтворення, а не перезавантажувати урок з нуля.
- `materials` — вкладення уроку, та сама форма, що й `content.materials`
  сторінки курсу (`format` — розширення імені файлу в нижньому регістрі або
  `null`). Підписаних посилань тут немає: за посиланням на конкретний файл
  клієнт звертається до `GET /api/files/:fileId/download-url` у момент кліку,
  а не заздалегідь.
- `quiz` — `null`, якщо в уроку немає тесту. Питання й варіанти віддаються
  без ознаки правильної відповіді (`isCorrect` немає в жодному полі) —
  відповіді перевіряє сервер, див. "Спроба тесту".

**Урок безкоштовного курсу без запису повертає `403`** (окрім безкоштовного
прев'ю): для безкоштовного курсу спершу створюється запис через
`POST /api/learn/courses/:courseId/enroll`, див. "Безкоштовний запис".

Помилки:

- `400` — `lessonId` не є UUID;
- `401` — немає токена;
- `403` — курс опублікований, але доступу немає (не куплено, не прев'ю);
- `404` — урок не існує, або курс для цього користувача не існує (не
  опублікований і немає ні ролі, ні активного запису).

### Мої курси й матеріали

`GET /api/me/enrollments` — Bearer; ролі `STUDENT`, `AUTHOR`, `ADMIN`.

Query-параметр `type` (необов'язковий): `COURSE` або `MATERIAL`. Будь-яке
інше значення чи невідомий параметр — `400`. Пагінації немає: у користувача
десятки записів, не тисячі.

Яка сторінка що викликає:

- `/learning` — `?type=COURSE`;
- `/learning/materials` — `?type=MATERIAL`.

У відповідь потрапляють активні записи (`revokedAt = null`) на курси, що не
видалені. Статус курсу не фільтрується: покупка переживає зняття з
публікації, тож у `course.status` може бути й `UNPUBLISHED`. Порядок — від
останнього оновленого запису.

Приклад відповіді `200`:

    {
      "items": [
        {
          "id": "enrollment-uuid",
          "source": "PURCHASE",
          "enrolledAt": "2026-09-23T10:00:00.000Z",
          "course": {
            "id": "uuid",
            "slug": "string",
            "title": "string",
            "type": "COURSE",
            "status": "PUBLISHED",
            "cover": { "url": "https://..." },
            "category": { "id": "uuid", "slug": "string", "name": "Математика" },
            "author": { "id": "uuid", "name": "string" }
          },
          "progress": {
            "state": "IN_PROGRESS",
            "percent": 33,
            "completedLessons": 1,
            "totalLessons": 3,
            "continueLesson": { "id": "uuid", "title": "string" },
            "completedAt": null
          },
          "materials": null
        }
      ]
    }

- `enrolledAt` — дата створення запису.
- `course.cover` — `null`, якщо обкладинки немає; `cover.url` може бути `null`,
  якщо на сервері не налаштований публічний базовий URL.
- `course.author.name` — відображуване ім'я профілю автора, а за його
  відсутності — повне ім'я користувача. `course.category.name` — українська
  назва категорії.
- `progress` — для `COURSE`; для `MATERIAL` — `null`.
  - `state`: `NOT_STARTED` — показати "Почати"; `IN_PROGRESS` — "Продовжити"
    і прогрес-бар; `COMPLETED` — позначку "Пройдено".
  - `percent` округлений вниз: `100` лише коли пройдено всі уроки. Рахується
    за актуальною програмою, видалені уроки не враховуються.
  - `completedAt` — дата першого завершення курсу, `null`, якщо курс ще не
    завершували. Ця дата не перераховується, коли в курс додають нові уроки.
  - `continueLesson` — перший за порядком непройдений урок, `null`, якщо
    пройдено все або уроків немає.
- Кнопка "Продовжити" веде на
  `routes.playerLesson(course.id, progress.continueLesson.id)`; якщо
  `continueLesson` дорівнює `null` — на `routes.player(course.id)`.
- `materials` — для `MATERIAL`; для `COURSE` — `null`. `filesCount` — кількість
  готових файлів, `totalSizeBytes` — сумарний розмір рядком, `formats` —
  унікальні розширення в нижньому регістрі за алфавітом. Сам файл
  завантажується через `GET /api/files/:fileId/download-url`.

Помилки:

- `400` — невідомий параметр або значення `type`;
- `401` — немає токена.

### Програма курсу

`GET /api/learn/courses/:courseId` — Bearer; ролі `STUDENT`, `AUTHOR`,
`ADMIN`. Викликається бічною панеллю плеєра.

Доступ визначається на кожен запит тими самими правилами 1–4, що й для уроку
(`decideCourseAccess`):

- запис, автор курсу або адмін — повна програма (`access: "ENROLLED"`,
  `"AUTHOR"` або `"ADMIN"`);
- будь-який інший користувач опублікованого курсу — `access: "PREVIEW"`:
  програма видна, але уроки, що не є безкоштовним прев'ю, мають
  `isLocked: true`, а `progress` дорівнює `null`;
- неопублікований курс для користувача без запису, ролі автора чи адміна — `404`.

Прогрес повертається завжди, коли в користувача є активний запис — у тому
числі в адміна чи автора.

Приклад відповіді `200`:

    {
      "access": "ENROLLED",
      "course": { "id": "uuid", "slug": "string", "title": "string", "type": "COURSE", "status": "PUBLISHED" },
      "progress": {
        "state": "IN_PROGRESS",
        "percent": 33,
        "completedLessons": 1,
        "totalLessons": 3,
        "continueLesson": { "id": "uuid", "title": "string" },
        "completedAt": null
      },
      "modules": [
        {
          "id": "uuid",
          "title": "string",
          "position": 0,
          "lessons": [
            { "id": "uuid", "type": "VIDEO", "title": "string", "position": 0, "isPreview": true, "durationSec": 612, "isLocked": false, "isCompleted": true }
          ]
        }
      ],
      "materials": [
        { "id": "uuid", "fileId": "uuid", "title": "string", "name": "Конспект.pdf", "format": "pdf", "mimeType": "application/pdf", "sizeBytes": "1204224" }
      ]
    }

- `position` = `sortOrder`, `isPreview` = `isFreePreview` — ті самі імена, що
  й у `GET /api/learn/lessons/:lessonId` та публічному
  `GET /api/courses/:idOrSlug`.
- `isLocked` — урок закритий (лише в режимі `PREVIEW`); `isCompleted` — урок
  пройдений. Для користувача без запису `isCompleted` завжди `false`.
- `progress` — той самий об'єкт, що й у списку "Мої курси": для `COURSE` із
  записом, інакше `null`.
- `materials` — файли курсу (`id` — це `CourseFile.id`); для `COURSE`
  зазвичай порожній масив. Файл завантажується через
  `GET /api/files/:fileId/download-url` за `fileId`.
- Вміст уроку (текст, відео, вкладення, тест) програма **не містить** — його
  можна отримати лише через `GET /api/learn/lessons/:lessonId`.
- Позначка проходження уроку й тести — див. "Позначка проходження уроку" та
  "Спроба тесту".

Помилки:

- `400` — `courseId` не є UUID;
- `401` — немає токена;
- `404` — курсу не існує, або для цього користувача його не існує
  (не опублікований і немає ні ролі, ні активного запису).

### Безкоштовний запис

`POST /api/learn/courses/:courseId/enroll` — Bearer; ролі `STUDENT`, `AUTHOR`,
`ADMIN`. Тіла немає.

Створює `Enrollment` із `source = "FREE"` лише для опублікованого курсу з
`priceAmount === 0`. Платний курс відкривається тільки вебхуком оплати.

**Кнопка "Почати навчання" для курсу з `price.amount === 0` завжди спершу
викликає цей ендпоінт.** `hasAccess` сторінки курсу для безкоштовного курсу
дорівнює `true` ще до запису, а плеєр і прогрес вимагають запис. Виклик
ідемпотентний, тож його безпечно повторювати; після відповіді клієнт
переходить у плеєр.

Приклад відповіді `201` (або `200`, якщо запис уже був):

    {
      "enrollment": { "id": "uuid", "source": "FREE", "enrolledAt": "2026-09-24T10:00:00.000Z" },
      "created": true
    }

- `201`, `created: true` — запис створено, або відновлено раніше скасований
  (тоді `source` стає `FREE`);
- `200`, `created: false` — активний запис уже був, нічого не змінилося.
  Для вже купленого курсу `source` лишається `"PURCHASE"`;
- одночасні повторні виклики створюють один запис;
- лічильники студентів курсу й автора перераховуються.

Помилки:

- `400` — `courseId` не є UUID;
- `401` — немає токена;
- `404` — курсу не існує, він видалений або не опублікований;
- `409` — `Author cannot enroll in own course` (автор курсу) або
  `Course is not free` (платний курс).

### Позначка проходження уроку

`POST /api/learn/lessons/:lessonId/complete` — Bearer; ролі `STUDENT`,
`AUTHOR`, `ADMIN`. Тіла немає.

Потрібен активний запис на курс. Автор і адмін без запису отримують `403`:
дивитися курс їм можна, вести прогрес — ні. Кнопка "Далі" для всіх уроків,
крім `QUIZ`, викликає цей ендпоінт. Урок `QUIZ` із тестом позначається
пройденим лише успішною спробою тесту.

Повторна позначка ідемпотентна: дата проходження уроку не змінюється.
Сервер перераховує `progressPercent`, `completedAt` (дата першого завершення
курсу) і `lastLessonId` записи в тій самій транзакції.

Приклад відповіді `200`:

    {
      "lessonId": "uuid",
      "isCompleted": true,
      "progress": {
        "state": "IN_PROGRESS",
        "percent": 66,
        "completedLessons": 2,
        "totalLessons": 3,
        "continueLesson": { "id": "uuid", "title": "string" },
        "completedAt": null
      }
    }

`progress` має ту саму форму, що у "Мої курси й матеріали" та "Програма
курсу". **Після позначки клієнт бере `progress` з відповіді і не робить
повторного запиту програми.**

Помилки:

- `400` — `lessonId` не є UUID;
- `401` — немає токена;
- `403` — немає активного запису (`Progress is tracked only for enrolled
  learners`);
- `404` — урок не існує, або курс для цього користувача не існує
  (не опублікований і немає ні ролі, ні запису);
- `409` — урок `QUIZ` з тестом (`Quiz lessons are completed by passing the quiz`).

### Спроба тесту

`POST /api/learn/quizzes/:quizId/attempts` — Bearer; ролі `STUDENT`, `AUTHOR`,
`ADMIN`. `quizId` — `lesson.quiz.id` з відповіді `GET /api/learn/lessons/:lessonId`.

Потрібен активний запис на курс (правило доступу те саме, що й для позначки
проходження). Тіло:

    { "answers": [ { "questionId": "uuid", "optionIds": ["uuid"] } ] }

`answers` — до 200 елементів, може бути порожнім; `optionIds` — до 50 uuid.
Питання без відповіді вважається неправильним. Питання зараховується, лише
якщо обрано **точно** множину правильних варіантів (без часткових балів, і для
`SINGLE`, і для `MULTIPLE`). Бали — сума `points` правильних питань, `percent`
округлений вниз, тест здано, коли `percent >= passScore`.

Приклад відповіді `201`:

    {
      "attempt": {
        "id": "uuid", "score": 1, "maxScore": 2, "percent": 50, "passScore": 60, "isPassed": false,
        "attemptsUsed": 1, "attemptsAllowed": 2, "finishedAt": "2026-09-24T10:00:00.000Z"
      },
      "questions": [
        { "questionId": "uuid", "isCorrect": true, "selectedOptionIds": ["uuid"], "correctOptionIds": null }
      ],
      "progress": {
        "state": "IN_PROGRESS",
        "percent": 33,
        "completedLessons": 1,
        "totalLessons": 3,
        "continueLesson": { "id": "uuid", "title": "string" },
        "completedAt": null
      }
    }

- `correctOptionIds` приходять **лише після здачі або коли спроби
  вичерпано** (`attemptsUsed >= attemptsAllowed`); до того в усіх питань
  `null`, і клієнт показує лише `isCorrect` по кожному питанню.
  `attemptsAllowed: null` — спроб необмежено.
- Успішна спроба позначає урок `QUIZ` пройденим; неуспішна прогрес уроку не
  змінює. **Клієнт бере `progress` з відповіді, без повторного запиту
  програми.**
- `timeLimitSec` — це таймер на клієнті: сервер час не перевіряє, бо спроба
  надсилається одним запитом.

Помилки:

- `400` — `quizId` не є UUID, тіло не проходить валідацію, або відповіді
  некоректні (`Invalid answers`, `details[].field` вказує шлях, наприклад
  `answers.0.optionIds.1`): питання чи варіант не з цього тесту, повтор питання
  чи варіанта, кілька варіантів у питанні `SINGLE`;
- `401` — немає токена;
- `403` — немає активного запису;
- `404` — тесту не існує, або курс для цього користувача не існує;
- `409` — `Quiz has no questions` або `No attempts left` (ліміт спроб
  вичерпано, у тому числі при одночасних запитах).

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