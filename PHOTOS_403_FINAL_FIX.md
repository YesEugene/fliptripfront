# ✅ Финальное решение для фотографий (403 → 200)

## Подтверждение проблемы
Когда установлено **"None"** в Application Restrictions - фото работают. Это означает, что проблема точно в настройке доменов.

## Решение

### Шаг 1: Вернуть Application Restrictions на "Websites"

1. Google Cloud Console → **APIs & Services** → **Credentials**
2. Откройте ваш API ключ
3. В разделе **"Application restrictions"** выберите **"Websites"**

### Шаг 2: Добавить ВСЕ возможные варианты доменов

**КРИТИЧЕСКИ ВАЖНО:** Добавьте ВСЕ эти варианты (не только один):

1. `flip-trip.com/*` (без www, без https)
2. `www.flip-trip.com/*` (с www, без https)
3. `*.flip-trip.com/*` (для всех поддоменов)
4. `*.fliptripfrontend.vercel.app/*` (для Vercel)
5. `fliptripfrontend.vercel.app/*` (конкретный поддомен)
6. `*.vercel.app/*` (для всех Vercel deployments)
7. `localhost:5173/*` (для разработки)

### Шаг 3: Формат записи

**Правильный формат:**
- ✅ `www.flip-trip.com/*`
- ✅ `flip-trip.com/*`
- ✅ `*.flip-trip.com/*`

**Неправильный формат:**
- ❌ `https://www.flip-trip.com/` (не должно быть https://)
- ❌ `www.flip-trip.com` (должно быть `/*` в конце)
- ❌ `https://www.flip-trip.com/*` (не должно быть https://)

### Шаг 4: Проверить Referer в запросе

1. Откройте консоль браузера (F12) → **Network**
2. Найдите запрос к `/place/photo`
3. Откройте **Headers** → **Request Headers**
4. Найдите **Referer** - скопируйте точное значение
5. Убедитесь, что домен из Referer добавлен в Application Restrictions

**Примеры Referer:**
- `https://www.flip-trip.com/` → добавить `www.flip-trip.com/*`
- `https://flip-trip.com/itinerary?...` → добавить `flip-trip.com/*`
- `https://fliptripfrontend.vercel.app/...` → добавить `*.fliptripfrontend.vercel.app/*`

### Шаг 5: Сохранить и проверить

1. Нажмите **"SAVE"**
2. Подождите **2-3 минуты** (изменения применяются не мгновенно)
3. Сделайте **Hard Refresh** (Cmd+Shift+R или Ctrl+Shift+R)
4. Проверьте, что фото загружаются

### Шаг 6: Если все еще 403

1. Проверьте, что **Places API (New)** включен в **API Restrictions**
2. Убедитесь, что все домены добавлены правильно (без https://, с /*)
3. Попробуйте добавить домен **точно как в Referer**, но:
   - Уберите `https://`
   - Добавьте `/*` в конце
   - Например: Referer `https://www.flip-trip.com/` → добавить `www.flip-trip.com/*`

## Важно для безопасности

**НЕ оставляйте "None"** в продакшене! Это позволит любому использовать ваш API ключ.

После правильной настройки Application Restrictions:
- ✅ Фото будут работать
- ✅ Ключ будет защищен
- ✅ Только ваши домены смогут использовать API

## Проверка результата

После настройки:
1. Фото должны загружаться (Status 200, не 403)
2. В консоли не должно быть ошибок 403 для `/place/photo`
3. Если некоторые фото не загружаются - это нормально (API может иметь задержки)




