# Как получить готовый `.exe` без Python на своём компьютере

Если на вашем компьютере нет Python, можно собрать приложение через GitHub Actions — сборка выполнится в облаке на Windows.

## Что получится

В результате вы скачаете архив `ActsGenerator-Windows`, внутри будет:

```text
ActsGenerator.exe
README.txt
```

`ActsGenerator.exe` можно запускать на Windows-компьютерах без Python.

Важно: для генерации PDF на компьютере пользователя должен быть установлен Microsoft Word.

## Шаги

1. Создайте пустой репозиторий на GitHub.
2. Загрузите в него содержимое папки `acts_service_app`.
3. Убедитесь, что в репозитории есть файл:

```text
.github/workflows/build-windows-exe.yml
```

4. Откройте вкладку **Actions**.
5. Выберите workflow **Build Windows EXE**.
6. Нажмите **Run workflow**.
7. Дождитесь завершения сборки.
8. Внизу страницы сборки скачайте artifact:

```text
ActsGenerator-Windows
```

9. Распакуйте скачанный artifact.
10. Запускайте:

```text
ActsGenerator.exe
```

## Требования на компьютере, где запускается exe

Python не нужен.

Нужны:

1. Microsoft Word — для PDF.
2. Microsoft Edge WebView2 Runtime — обычно уже установлен в Windows 10/11.

## Если Windows ругается на неизвестного издателя

Это нормально для самосборного `.exe`, потому что он не подписан цифровым сертификатом.

Нужно нажать:

```text
Подробнее → Выполнить в любом случае
```
