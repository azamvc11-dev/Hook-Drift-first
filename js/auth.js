// Простая регистрация/вход по нику и паролю — без реальной почты.
// Под капотом используется Supabase Auth (email+password), но email
// синтетический: "ник@hookdrift.game". Игрок его никогда не видит и не вводит.
window.AuthManager = (function(){
  let client = null;
  let session = null;
  let profile = null; // { id, username, best_distance, total_playtime_seconds }
  let initialized = false;

  function enabled(){
    return !!(window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url && window.SUPABASE_CONFIG.anonKey);
  }

  function emailFor(username){
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '');
    return clean + '@hookdrift-player.com';
  }

  async function init(){
    if(initialized) return client !== null;
    initialized = true;
    if(!enabled() || !window.supabase){ return false; }
    try{
      client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      const { data } = await client.auth.getSession();
      session = data ? data.session : null;
      if(session) await loadProfile();
      return true;
    }catch(e){
      client = null;
      return false;
    }
  }

  async function loadProfile(){
    if(!client || !session) return null;
    try{
      const { data, error } = await client.from('profiles').select('*').eq('id', session.user.id).single();
      if(!error) profile = data;
      return profile;
    }catch(e){ return null; }
  }

  function validate(username, password){
    const u = username.trim();
    if(u.length < 3) return 'auth_username_short';
    if(u.length > 16) return 'auth_username_long';
    if(!/^[a-zA-Zа-яА-Я0-9_\-]+$/.test(u)) return 'auth_username_chars';
    if(password.length < 4) return 'auth_password_short';
    return null;
  }

  async function register(username, password){
    if(!client) return { ok:false, error:'auth_not_configured' };
    const validationError = validate(username, password);
    if(validationError) return { ok:false, error:validationError };
    const uname = username.trim();
    const email = emailFor(uname);
    try{
      const { data, error } = await client.auth.signUp({ email, password });
      if(error){
        if(/registered|exists/i.test(error.message)) return { ok:false, error:'auth_username_taken' };
        return { ok:false, error: error.message, raw:true };
      }
      if(!data.session){
        // "Confirm email" включен на проекте — по факту письмо отправить некому,
        // поэтому просим владельца проекта выключить эту настройку (см. README)
        return { ok:false, error:'auth_confirm_email_issue' };
      }
      session = data.session;
      const { error: profErr } = await client.from('profiles').insert({ id: data.user.id, username: uname });
      if(profErr){
        return { ok:false, error:'auth_username_taken' };
      }
      await loadProfile();
      return { ok:true };
    }catch(e){
      return { ok:false, error:'auth_network_err' };
    }
  }

  async function login(username, password){
    if(!client) return { ok:false, error:'auth_not_configured' };
    const email = emailFor(username.trim());
    try{
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if(error) return { ok:false, error:'auth_bad_login' };
      session = data.session;
      await loadProfile();
      return { ok:true };
    }catch(e){
      return { ok:false, error:'auth_network_err' };
    }
  }

  async function logout(){
    if(client){ try{ await client.auth.signOut(); }catch(e){} }
    session = null;
    profile = null;
  }

  async function submitDistance(distance){
    if(!client || !session) return;
    try{
      await client.rpc('submit_distance', { p_distance: distance });
      await loadProfile();
    }catch(e){}
  }

  async function addPlaytime(seconds){
    if(!client || !session || seconds <= 0) return;
    try{
      await client.rpc('add_playtime', { p_seconds: Math.round(seconds) });
      await loadProfile();
    }catch(e){}
  }

  return {
    enabled, init, register, login, logout,
    submitDistance, addPlaytime, loadProfile,
    getClient(){ return client; },
    isLoggedIn(){ return !!session; },
    get profile(){ return profile; }
  };
})();
