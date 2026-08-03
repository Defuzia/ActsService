# Как правильно загрузить проект в GitHub (чтобы сборка exe заработала)

## Почему падает сборка
В репозиторий были загружены файлы **плоско, в корень** (без папок `static/`,
`templates/`, `uploads/`), и их содержимое **перемешалось и повредилось**
(например, `template.docx` стал размером с `favicon.png`).

Workflow ищет папку `static/` — её нет, поэтому шаг `Get-ChildItem -Force static`
завершается ошибкой `PathNotFound` и сборка останавливается.

## Шаг 1. Очистите репозиторий
Удалите все файлы, которые сейчас лежат в корне репозитория на GitHub
(Add file → Delete, или зайдите в файл → значок корзины).
Оставьте только папку `.git` и, если нужно, `README.md`.

## Шаг 2. Распакуйте архив
Распакуйте `acts_service_app.zip` на компьютере.
Внутри появится папка `acts_service_app/`.

## Шаг 3. Загрузите папку целиком
GitHub → репозиторий → **Add file → Upload files**.
Перетащите **папку `acts_service_app`** (саму папку, не отдельные файлы).
Веб-интерфейс сам поднимет структуру с подпапками.

## Шаг 4. Итоговая структура (обязательно)
```
acts_service_app/
├── .github/workflows/build-windows-exe.yml
├── .gitignore
├── app.py
├── desktop_app.py
├── requirements-desktop.txt
├── requirements.txt
├── build_windows_app.bat
├── run_windows.bat
├── run_desktop_dev.bat
├── run_linux_mac.sh
├── README.md
├── BUILD_EXE_WITHOUT_PYTHON.md
├── static/
│   ├── app.js
│   ├── style.css
│   └── favicon.ico, favicon.png, favicon-16/32/48/192.png, apple-touch-icon.png
├── templates/
│   ├── index.html
│   └── admin.html
└── uploads/
    └── template.docx
```

## Шаг 5. Запустите сборку
GitHub → **Actions** → **Build Windows EXE** → **Run workflow**.
После успешной сборки в артефакте **ActsGenerator-Windows** будет
`ActsGenerator.exe` и `README.txt`.

## Важные запреты
- ❌ Не открывайте бинарные файлы (`.docx`, `.png`, `.ico`) в текстовом редакторе
  и не вставляйте их содержимое — это портит файл.
- ❌ Не загружайте файлы по одному в корень — теряется структура папок.
- ✅ Загружайте **папку целиком** перетаскиванием.
