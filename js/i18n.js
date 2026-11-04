// Простой словарь переводов интерфейса. Применяется через data-i18n атрибуты
// в index.html (текст) и data-i18n-ph (placeholder у полей ввода), плюс
// функция t(key) для строк, которые собираются динамически в main.js.
window.I18N = (function(){
  const STRINGS = {
    ru: {
      badge_main: 'Hook & Swing',
      hud_distance: 'Дистанция',
      sub_main: 'Тапай, чтобы зацепиться крюком за точку впереди. Держи — подтягивай трос. Блоки на пути рикошетят тебя в сторону, батуты снизу — подбрасывают вверх.',
      guest_title: 'Гость',
      guest_desc: 'Войди, чтобы попасть в таблицу лидеров',
      login_btn: 'Войти',
      logout_btn: 'Выйти',
      playtime_label: 'Наиграно',
      leaderboard_btn: '🏆 Таблицы лидеров',
      stat_best: 'рекорд',
      start_btn: 'Начать',
      hint_main: 'Тап / клик — крюк · Удержание — подтягивание троса',
      settings_btn: '⚙️',

      auth_badge: 'Аккаунт',
      auth_title_login: 'ВХОД',
      auth_title_register: 'РЕГИСТРАЦИЯ',
      auth_sub: 'Ник и пароль — без почты и подтверждений. Аккаунт сохраняет твой рекорд, ники в таблице лидеров и наигранное время.',
      auth_username_ph: 'Ник',
      auth_password_ph: 'Пароль',
      auth_submit_login: 'Войти',
      auth_submit_register: 'Создать аккаунт',
      auth_switch_to_register: 'Ещё нет аккаунта? Зарегистрироваться',
      auth_switch_to_login: 'Уже есть аккаунт? Войти',
      auth_cancel: 'Назад',
      auth_fill_both: 'Заполни оба поля',
      auth_wait: 'Подождите…',
      auth_err_generic: 'Ошибка',
      auth_not_configured: 'Аккаунты не настроены (нет подключения к Supabase)',
      auth_username_short: 'Ник слишком короткий (мин. 3 символа)',
      auth_username_long: 'Ник слишком длинный (макс. 16 символов)',
      auth_username_chars: 'Только буквы, цифры, _ и -',
      auth_password_short: 'Пароль слишком короткий (мин. 4 символа)',
      auth_username_taken: 'Этот ник уже занят',
      auth_bad_login: 'Неверный ник или пароль',
      auth_network_err: 'Не удалось связаться с сервером',
      auth_confirm_email_issue: 'Регистрация создана, но вход не подтверждён. Проверь настройку "Confirm email" в Supabase (должна быть выключена).',

      lb_badge: 'Топ игроков',
      lb_title: 'ЛИДЕРЫ',
      lb_tab_distance: 'Дистанция',
      lb_tab_playtime: 'Время игры',
      lb_detail_btn: 'Подробнее',
      lb_close: 'Закрыть',
      lb_not_configured: 'Аккаунты не подключены — впиши данные Supabase в js/supabase-config.js',
      lb_loading: 'Загрузка…',
      lb_empty: 'Пока пусто — стань первым!',
      lb_title_distance: 'ДИСТАНЦИЯ',
      lb_desc_distance: 'Лучший результат каждого игрока за один забег, в метрах.',
      lb_title_playtime: 'ВРЕМЯ ИГРЫ',
      lb_desc_playtime: 'Суммарное время, проведённое в игре, по всем забегам.',
      lb_my_rank: 'Твоё место',

      over_badge: 'Обрыв троса',
      over_title: 'ПАДЕНИЕ',
      stat_result: 'результат',
      revive_btn: '📺 Продолжить (реклама)',
      retry_btn: 'Ещё раз',
      menu_btn: 'В меню',
      unlock_prefix: 'Открыто',
      unlock_skin_prefix: 'Скин',
      unlock_spider: 'Секретный режим Паука',

      settings_title: 'НАСТРОЙКИ',
      settings_language: 'Язык',
      settings_orientation: 'Ориентация экрана',
      orientation_auto: 'Авто',
      orientation_portrait: 'Вертикально',
      orientation_landscape: 'Горизонтально',
      settings_music: 'Музыка',
      settings_auto_change: 'Автосмена жанра',
      genre_calm: 'Спокойная',
      genre_phonk: 'Фонк',
      genre_synth: 'Электро',
      genre_chip: 'Чиптюн',
      genre_space: 'Эмбиент',
      settings_close: 'Закрыть',

      spider_toggle_label: 'Режим Паука',
      spider_on: 'ВКЛ',
      spider_off: 'ВЫКЛ',
    },
    en: {
      badge_main: 'Hook & Swing',
      hud_distance: 'Distance',
      sub_main: 'Tap to fire the hook at the next point ahead. Hold to reel the rope in. Blocks ricochet you sideways, boost pads underneath launch you up.',
      guest_title: 'Guest',
      guest_desc: 'Log in to appear on the leaderboard',
      login_btn: 'Log in',
      logout_btn: 'Log out',
      playtime_label: 'Played',
      leaderboard_btn: '🏆 Leaderboards',
      stat_best: 'best',
      start_btn: 'Start',
      hint_main: 'Tap / click — hook · Hold — reel in the rope',
      settings_btn: '⚙️',

      auth_badge: 'Account',
      auth_title_login: 'LOG IN',
      auth_title_register: 'SIGN UP',
      auth_sub: 'Username and password — no email, no confirmation. Your account keeps your record, leaderboard name and total playtime.',
      auth_username_ph: 'Username',
      auth_password_ph: 'Password',
      auth_submit_login: 'Log in',
      auth_submit_register: 'Create account',
      auth_switch_to_register: "Don't have an account? Sign up",
      auth_switch_to_login: 'Already have an account? Log in',
      auth_cancel: 'Back',
      auth_fill_both: 'Fill in both fields',
      auth_wait: 'Please wait…',
      auth_err_generic: 'Error',
      auth_not_configured: 'Accounts aren\'t set up (no Supabase connection)',
      auth_username_short: 'Username too short (min. 3 characters)',
      auth_username_long: 'Username too long (max. 16 characters)',
      auth_username_chars: 'Only letters, numbers, _ and -',
      auth_password_short: 'Password too short (min. 4 characters)',
      auth_username_taken: 'This username is taken',
      auth_bad_login: 'Wrong username or password',
      auth_network_err: 'Could not reach the server',
      auth_confirm_email_issue: 'Account created, but sign-in wasn\'t confirmed. Check the "Confirm email" setting in Supabase (it should be OFF).',

      lb_badge: 'Top players',
      lb_title: 'LEADERS',
      lb_tab_distance: 'Distance',
      lb_tab_playtime: 'Playtime',
      lb_detail_btn: 'View more',
      lb_close: 'Close',
      lb_not_configured: 'Accounts aren\'t connected — add your Supabase details in js/supabase-config.js',
      lb_loading: 'Loading…',
      lb_empty: 'Nobody yet — be the first!',
      lb_title_distance: 'DISTANCE',
      lb_desc_distance: "Each player's best single run, in meters.",
      lb_title_playtime: 'PLAYTIME',
      lb_desc_playtime: 'Total time spent playing, across all runs.',
      lb_my_rank: 'Your rank',

      over_badge: 'Rope snapped',
      over_title: 'YOU FELL',
      stat_result: 'result',
      revive_btn: '📺 Continue (watch ad)',
      retry_btn: 'Retry',
      menu_btn: 'Menu',
      unlock_prefix: 'Unlocked',
      unlock_skin_prefix: 'Skin',
      unlock_spider: 'Secret Spider Mode',

      settings_title: 'SETTINGS',
      settings_language: 'Language',
      settings_orientation: 'Screen orientation',
      orientation_auto: 'Auto',
      orientation_portrait: 'Portrait',
      orientation_landscape: 'Landscape',
      settings_music: 'Music',
      settings_auto_change: 'Auto-change genre',
      genre_calm: 'Calm',
      genre_phonk: 'Phonk',
      genre_synth: 'Synth',
      genre_chip: 'Chiptune',
      genre_space: 'Ambient',
      settings_close: 'Close',

      spider_toggle_label: 'Spider Mode',
      spider_on: 'ON',
      spider_off: 'OFF',
    }
  };

  let lang = 'ru';

  function t(key){
    const dict = STRINGS[lang] || STRINGS.ru;
    return dict[key] !== undefined ? dict[key] : (STRINGS.ru[key] || key);
  }

  function apply(){
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el=>{
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
    });
  }

  async function load(){
    try{
      if(window.storage){
        const r = await window.storage.get('hookdrift_lang', false);
        if(r && r.value && STRINGS[r.value]) lang = r.value;
      }
    }catch(e){
      // no saved preference yet — fall back to browser language
      const browserLang = (navigator.language || 'ru').slice(0,2);
      if(STRINGS[browserLang]) lang = browserLang;
    }
  }

  async function setLang(v){
    if(!STRINGS[v]) return;
    lang = v;
    apply();
    try{ if(window.storage) await window.storage.set('hookdrift_lang', v, false); }catch(e){}
  }

  return { t, apply, load, setLang, get current(){ return lang; } };
})();
