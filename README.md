# 2026_1_Eshkere
Репозиторий команды Эщкере с проектом Реклама

### Участники команды
 1. [Здобнов Владимир](https://github.com/chocaboy)
 2. [Ващило Игнатий](https://github.com/badamPss)
 3. [Уразгалиев Дмитрий](https://github.com/current3)
 4. [Евтович Марко](https://github.com/SSKPss4567)

### Внешние ссылки - TODO
 - [Figma](https://www.figma.com/design/rbnwxrv896e0UNpOAswobu/Esketit-Ad-web-design?node-id=0-1&p=f&t=HQEMbsCg4WYOV4FC-0)
 - [Backend](https://github.com/go-park-mail-ru/2026_1_Eshkere)
 - [Deploy](http://212.233.96.112:8080/)
 - [Jira](https://a4-code.yougile.com/team/e78120020d9d/Eshkere-Ads?lang=ru)

### Локальный full stack с новым backend
1. Скопируйте `.env.example` в `.env` в корне проекта при необходимости.
2. Запустите `docker compose up --build`.
3. Откройте `http://localhost:8081`.

Фронтенд в контейнере проксирует `/api/*` в backend, backend подключается к `postgres` и `redis` внутри compose-сети.

### Правила оформления Pull Requests
  1. Ветка создается с названием `ADS-###`, где ### - номер задачи в jira.
  2. Название Pull Request'а соответствует названию задачки в jira: `ADS-###: description`, где description - название из jira.
  3. При создании Pull Request'а нужно указать в описании ссылку на задачу в jira.
  4. Для того, чтобы залить изменения в ветку main нужен апрув от [Кости](https://t.me/PassPort_Guardian)
