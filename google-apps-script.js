/*
 * ============================================================
 *  СКРИПТ ДЛЯ GOOGLE ТАБЛИЦЫ (Google Apps Script)
 * ============================================================
 *
 *  Инструкция:
 *  1. Создайте новую Google Таблицу
 *  2. В первой строке впишите заголовки: Дата | Имя | Телефон | Согласие ПД
 *  3. Меню → Расширения → Apps Script
 *  4. Удалите стандартный код и вставьте этот скрипт
 *  5. Нажмите «Развернуть» → «Новое развертывание»
 *     → Тип: «Веб-приложение»
 *     → Выполнять от: «Меня»
 *     → Доступ: «Все»
 *  6. Скопируйте URL и вставьте в config.js → GOOGLE_SCRIPT_URL
 *
 * ============================================================
 */

function doPost(e) {
    try {
        var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        var data = JSON.parse(e.postData.contents);

        sheet.appendRow([
            data.date || new Date().toLocaleString('ru-RU'),
            data.name || '',
            data.phone || '',
            data.consent || ''
        ]);

        return ContentService
            .createTextOutput(JSON.stringify({ status: 'ok' }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService
            .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}