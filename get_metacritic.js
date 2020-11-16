class MetaInfo {

  constructor(host, locale, psn_id) {
    this.host = host;
    this.id = psn_id;
    this.locale = locale;
    this.state = "not connect";
    this.meta_score = "";
    this.user_score = "";
    this.meta_count = "";
    this.user_count = "";
    this.platform = "";
    this.meta_name = [];
    this.url = '';
  }

  async load_metacritic_name_from_stroage(key) {
    const data = await Utility.get_data(key);
    if (data && data.m_skip_time && !Utility.is_expired(data.m_skip_time)) {
      this.state = 'skip';
      return true;
    }
    if (data && data.m_name && data.platform) {
      this.platform = data.platform;
      this.meta_name.push(data.m_name);
      const platform = this.get_metacritic_platform_alias(data.platform);
      this.url = `http://www.metacritic.com/game/${platform}/${data.m_name}`;
      return true;
    }
  }

  async save_metacritic_name_to_storage(key, name) {
    const data = { m_name: name };
    return await Utility.set_data(key, data);
  }

  async set_skip_time_to_storage(key, days) {
    const date = Utility.get_expire_date(days);
    const data = { m_skip_time: date };
    return await Utility.set_data(key, data);
  }

  async save_metascore_to_storage(name) {
    const key = `${this.platform}/${name}`;
    let data = {};
    const expire_date = Utility.get_expire_date(7);
    const meta_score = this.meta_score;
    const user_score = this.user_score;
    const meta_count = this.meta_count;
    const user_count = this.user_count;
    data = { meta_score, user_score, meta_count, user_count, expire_date };

    return await Utility.set_data(key, data);
  }

  async load_metascore_from_storage() {
    const key = `${this.platform}/${this.meta_name[0]}`;
    const data = await Utility.get_data(key);
    if (data && !Utility.is_expired(data.expire_date)) {
      this.meta_score = data.meta_score;
      this.user_score = data.user_score;
      this.meta_count = data.meta_count;
      this.user_count = data.user_count;
      this.state = "ok";
      return true;
    }
    else if (data && data.exist) {
      this.state = "expired";
      return false;
    }
    else {
      this.state = "error";
      return false;
    }
  }

  filter_char(name) {
    if (name) {
      const re = new RegExp(`[^\\w\\s\\-\\+\\!]`, 'g');
      const filter_name = name.toLowerCase().replace(re, '').replace(/ +/g, '-').replace(/& /g, '')
      return filter_name;
    }
    else {
      return '';
    }
  }

  async get_metascore_from_metacritic(name) {
    const platform = this.get_metacritic_platform_alias(this.platform);
    const url = `https://www.metacritic.com/game/${platform}/${name}`;
    this.state = 'fetching metacritic';
    const response = await Utility.back_fetch(url);
    if (response.state === 'ok') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(response.content, "text/html");
      if (doc.querySelector('div.section.product_scores')) {
        const meta_score_obj = doc.querySelector('div.metascore_w.xlarge.game >span');
        const user_score_obj = doc.querySelector('div.metascore_w.user');
        const meta_critic_count_obj = doc.querySelector('.highlight_metascore > .summary > p > .count > a');
        const user_count_obj = doc.querySelector('.feature_userscore > .summary > p > .count > a');
        this.meta_score = meta_score_obj ? meta_score_obj.innerHTML : 'tbd';
        this.user_score = user_score_obj ? user_score_obj.innerHTML : 'tbd';
        this.meta_count = meta_critic_count_obj ? meta_critic_count_obj.innerHTML.replace(/\D+/g, '') : '0';
        this.user_count = user_count_obj ? user_count_obj.innerHTML.replace(/\D+/g, '') : '0';
        this.url = url;
        this.state = 'ok';
        return true;
      }
      else {
        this.state = 'connect error';
        return false;
      }
    }
    else {
      this.state = 'connect error';
      return false;
    }
  }

  async get_metacritic_score() {

    if (await this.load_metacritic_name_from_stroage(this.id)) {
      if (this.state === 'skip') {
        return false;
      }
      else if (await this.load_metascore_from_storage()) {
        return true;
      }
    }
    else {
      let psn = new Psn_info(this.host, this.locale, this.id);
      await psn.get_game_info();
      if (psn.is_en === false) {
        await psn.use_us_store_id();
      }

      if (psn.state === 'ok') {
        this.meta_name = [...psn.names];
        this.platform = psn.platform;
      }
    }

    for (let name of this.meta_name) {
      if (await this.get_metascore_from_metacritic(this.filter_char(name))) {
        await this.save_metascore_to_storage(this.filter_char(name), true);
        await this.save_metacritic_name_to_storage(this.id, this.filter_char(name));
        break;
      }
    }

    if (this.state !== 'ok') {
      await this.set_skip_time_to_storage(this.id, 1);
      return false;
    }

    return true;
  }

  get_metacritic_platform_alias(name) {
    const platform_list = {
      'ps5': 'playstation-5',
      'ps4': 'playstation-4',
      'ps3': 'playstation-3',
      'ps2': 'playstation-2',
      'ps': 'playstation',
      'psvita': 'playstation-vita',
      'psp': 'psp'
    };

    if (name in platform_list) {
      return platform_list[name];
    }
  }
}




