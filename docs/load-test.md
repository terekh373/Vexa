# Vexa API — навантажувальний тест каталогу та сторінки курсу

## Інструмент

Використовується `apps/api/test/load/catalog-course.mjs` на вбудованому `fetch`
Node.js 20+. Окрема бібліотека (k6/Artillery) не потрібна: сценарій має лише дві
HTTP GET-фази, а стандартний runtime уже є обов'язковою залежністю проєкту.
Це робить тест відтворюваним на Windows/macOS/Linux без глобальних інсталяцій.

## Сценарій

Скрипт виконує дві послідовні фази:

1. **100 одночасних запитів** до каталогу `/api/courses?page=1&limit=12`.
2. **100 одночасних запитів** до сторінки одного опублікованого курсу
   `/api/courses/:idOrSlug`.

Для кожної фази збираються: кількість запитів, HTTP status distribution, кількість
помилок, min/avg/p50/p95/p99/max latency і wall-clock time. Будь-яка HTTP/мережева
помилка завершує команду з exit code 1.

## Захист від запуску на production

За замовчуванням `LOAD_BASE_URL` має містити `staging`, `stage`, `preview` або
`test` у hostname. Це навмисно: за коментарем до #115 навантажувальний тест
виконується **на staging, не на production**.

`LOAD_ALLOW_NON_STAGING=1` існує лише для явно погодженого середовища і не має
використовуватися для production.

## Запуск

PowerShell:

```powershell
$env:LOAD_BASE_URL="https://api-staging.example.com"
$env:LOAD_COURSE_ID_OR_SLUG="published-course-slug"
npm run test:load --workspace @vexa/api
```

Bash:

```bash
LOAD_BASE_URL="https://api-staging.example.com" \
LOAD_COURSE_ID_OR_SLUG="published-course-slug" \
npm run test:load --workspace @vexa/api
```

За потреби concurrency можна змінити через `LOAD_CONCURRENCY`, але acceptance
run для #115 виконується зі значенням `100`.

## Результат

Після запуску скрипт автоматично створює `docs/load-test-results.json`. Саме цей
файл із фактичними staging-метриками треба додати до PR перед закриттям #115.

**Поточний статус:** staging-run ще не виконувався в цьому артефакті, тому що URL
staging і slug наповненого опублікованого курсу не є частиною репозиторію. Не
підміняти цей результат локальним або production-прогоном.
