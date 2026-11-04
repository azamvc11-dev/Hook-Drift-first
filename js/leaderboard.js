// Таблицы лидеров через Supabase. Поддерживает два поля: best_distance и
// total_playtime_seconds — используется для обеих таблиц (дистанция / время игры).
window.Leaderboard = {
  enabled(){ return AuthManager.enabled() && !!AuthManager.getClient(); },

  // топ-N по выбранному полю
  async top(field, limit=10){
    const client = AuthManager.getClient();
    if(!client) return [];
    try{
      const { data, error } = await client
        .from('profiles')
        .select('username,' + field)
        .order(field, { ascending:false })
        .limit(limit);
      return error ? [] : data;
    }catch(e){ return []; }
  },

  // полный список (с разумным лимитом), для экрана "подробнее"
  async full(field, limit=200){
    return this.top(field, limit);
  },

  // позиция текущего игрока в рейтинге по полю (1 = первое место)
  async myRank(field){
    const client = AuthManager.getClient();
    const profile = AuthManager.profile;
    if(!client || !profile) return null;
    try{
      const { count, error } = await client
        .from('profiles')
        .select('id', { count:'exact', head:true })
        .gt(field, profile[field]);
      if(error) return null;
      return count + 1;
    }catch(e){ return null; }
  }
};
