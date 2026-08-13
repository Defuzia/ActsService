from __future__ import annotations

import multiprocessing
import shutil
import socket
import sys
import threading
import time
from pathlib import Path
from urllib.request import urlopen

import webview

from app import OUTPUT_DIR, app


APP_TITLE = "Генерация актов"


class DesktopApi:
    """Методы, доступные из JavaScript через window.pywebview.api."""

    def save_archive(self, filename: str) -> dict:
        """
        Сохраняет ZIP через системный диалог сохранения.

        В desktop-окне pywebview обычное браузерное скачивание может не работать,
        поэтому ZIP копируется приложением в выбранное место. Если системный диалог
        по какой-то причине не открылся, архив автоматически сохраняется в папку
        «Загрузки»/Downloads.
        """
        try:
            safe_name = Path(filename or "").name
            if not safe_name or safe_name != filename or not safe_name.lower().endswith(".zip"):
                return {"ok": False, "error": "Некорректное имя ZIP-архива."}

            source_path = OUTPUT_DIR / safe_name
            if not source_path.exists():
                return {
                    "ok": False,
                    "error": "ZIP-архив не найден. Сгенерируйте акты повторно.",
                }

            destination_path, used_fallback = self._choose_destination_path(safe_name)
            if destination_path is None:
                return {"ok": False, "cancelled": True, "message": "Сохранение отменено."}

            destination_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source_path, destination_path)

            # Поведение как в веб-версии: после скачивания/сохранения архив удаляется.
            source_path.unlink(missing_ok=True)

            if used_fallback:
                message = f"✅ Диалог сохранения не открылся, архив сохранён в папку Загрузки: {destination_path}"
            else:
                message = f"✅ Архив сохранён: {destination_path}"

            return {
                "ok": True,
                "path": str(destination_path),
                "message": message,
            }
        except Exception as exc:  # noqa: BLE001
            return {"ok": False, "error": str(exc)}

    def _choose_destination_path(self, safe_name: str) -> tuple[Path | None, bool]:
        """
        Возвращает (путь, used_fallback).

        Важно: намеренно НЕ используем file_types в create_file_dialog. В некоторых
        версиях pywebview/Windows фильтры вызывают ошибку вида
        "... is not a valid file filter".
        """
        window = webview.windows[0] if webview.windows else None

        if window is not None:
            try:
                selected_path = window.create_file_dialog(
                    webview.SAVE_DIALOG,
                    save_filename=safe_name,
                )

                if not selected_path:
                    return None, False

                if isinstance(selected_path, (list, tuple)):
                    selected_path = selected_path[0] if selected_path else ""

                destination_path = Path(str(selected_path))
                if destination_path.suffix.lower() != ".zip":
                    destination_path = destination_path.with_suffix(".zip")
                return destination_path, False
            except Exception:
                # Если диалог сломался, не роняем сохранение — сохраним в Downloads.
                pass

        return self._downloads_path(safe_name), True

    @staticmethod
    def _downloads_path(safe_name: str) -> Path:
        downloads_dir = Path.home() / "Downloads"
        if not downloads_dir.exists():
            downloads_dir = Path.home() / "Загрузки"
        if not downloads_dir.exists():
            downloads_dir = Path.home()

        target = downloads_dir / safe_name
        if not target.exists():
            return target

        stem = target.stem
        suffix = target.suffix
        for index in range(1, 1000):
            candidate = downloads_dir / f"{stem}_{index}{suffix}"
            if not candidate.exists():
                return candidate

        return downloads_dir / f"{stem}_{int(time.time())}{suffix}"


def find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def run_server(port: int) -> None:
    app.run(
        host="127.0.0.1",
        port=port,
        debug=False,
        use_reloader=False,
        threaded=True,
    )


def wait_until_ready(port: int, timeout_seconds: int = 20) -> None:
    url = f"http://127.0.0.1:{port}/"
    deadline = time.time() + timeout_seconds

    while time.time() < deadline:
        try:
            with urlopen(url, timeout=1) as response:
                if response.status < 500:
                    return
        except Exception:
            time.sleep(0.2)

    raise RuntimeError("Локальный сервер приложения не запустился вовремя.")


def main() -> None:
    multiprocessing.freeze_support()

    port = find_free_port()
    thread = threading.Thread(target=run_server, args=(port,), daemon=True)
    thread.start()
    wait_until_ready(port)

    webview.create_window(
        APP_TITLE,
        f"http://127.0.0.1:{port}/",
        width=1450,
        height=900,
        min_size=(1100, 720),
        js_api=DesktopApi(),
    )
    webview.start(debug=False)

    # После закрытия окна завершаем процесс, чтобы daemon-thread с Flask тоже умер.
    sys.exit(0)


if __name__ == "__main__":
    main()
