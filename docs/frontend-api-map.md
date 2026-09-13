# Vexa — карта фронтенд-маршрутів та API

Базовий URL API береться з `VITE_API_URL`. Локально: `http://localhost:3000`.
Усі шляхи API мають префікс `/api`.

## Реєстрація

`POST /api/auth/register`

Запит — усі три поля обов'язкові, назви малими літерами:

    { "email": "user@example.com",
      "password": "Vexa12345",
      "fullName": "Оксана Петренко" }

Пароль: мінімум 8 символів, щонайменше одна літера й одна цифра.

Відповідь `201`:

    { "user": { "id", "email", "fullName", "roles": ["STUDENT"],
                "emailVerified": false, "locale": "uk" },
      "tokens": { "accessToken", "refreshToken", "expiresIn": 900 } }

Помилки: `409` — email зайнятий; `400` — валідація, поле `error.details`
масив `{ field, message }` з готовими українськими текстами під інпути.

## Вхід

`POST /api/auth/login` — `{ email, password }`. Відповідь як у реєстрації, `200`.
`401` — невірний email **або** пароль (одне повідомлення на оба випадки).

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

`GET /api/courses/:idOrSlug` — доступний без токена (`optionalAuth`). З
Bearer-токеном додатково рахується `hasAccess` за `Enrollment` користувача.

Верхній рівень відповіді:

- `type` — `COURSE` або `MATERIAL`.
- `price.amount` — ціна **в копійках**, integer; `price.currency`.
- `cover`, `category`, `author` (з `avatar`).
- `rating.average`, `rating.count`.
- `studentsCount`, `lessonsCount`, `durationSec`, `publishedAt`.
- `hasAccess` — куплено (`Enrollment`), автор курсу, або курс безкоштовний
  (`priceAmount === 0`).

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
(з `author`, включно з `avatar`), `pagination { page, limit, totalItems,
totalPages }`.

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
    PATCH  /api/author/courses/:id/reorder
    POST   /api/author/courses/:id/submit

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
- Схеми `.strict()` — **зайве поле в тілі повертає `400`, а не ігнорується**.
  Критично для форм: не надсилати нічого, чого немає у списку вище.

### Модуль і урок

Модуль (`.../modules`): `title`, `sortOrder`.

Урок (`.../lessons`): `type`, `title`, `sortOrder`, `isFreePreview`,
`textContent`, `videoFileId`, `durationSec`, `fileIds[]`.

**`type: "QUIZ"` зараз відхиляється валідацією** — дозволені лише `VIDEO`,
`TEXT`, `FILE`. Конструктор тестів — окрема задача (#59).

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

`POST /api/author/courses/:id/submit` — переводить курс `draft → moderation`.
Повний життєвий цикл статусів: `draft → moderation → published / rejected →
unpublished`.

## Маршрути фронтенду

| URL | Сторінка | Доступ |
|---|---|---|
| `/` | Головна | гість |
| `/courses` | Каталог | гість |
| `/courses/:id` | Сторінка курсу | гість |
| `/login`, `/register` | Авторизація | гість |
| `/cart`, `/checkout` | Кошик, оплата | учень |
| `/learn/:courseId/:lessonId` | Плеєр | учень |
| `/learning`, `/orders`, `/settings` | Кабінет учня | учень |
| `/author/*` | Кабінет автора | автор |
| `/admin/*` | Адмін-панель | адмін |

Будувати посилання лише через `routes` з `@vexa/shared`, не рядками в коді.
`routeAccess` там же — **підсказка для навігації, не захист**. Реальна перевірка
прав на сервері при кожному запиті.