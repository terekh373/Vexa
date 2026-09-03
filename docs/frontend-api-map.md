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