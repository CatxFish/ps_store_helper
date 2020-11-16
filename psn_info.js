class Psn_info {

  constructor(host, locale, psn_id) {
    const locale_list = locale.split('-');
    this.id = psn_id;
    this.host = host;
    this.country = locale_list[locale_list.length - 1];
    this.lang = locale_list[0];
    this.state = 'not connect';
    this.is_en = true;
    this.fetch_us_store = false;
    this.platform = '';
    this.names = [];
    this.price = '';
    this.discount_price = '';
    this.plus_price = '';
    this.discount_end_time = '';
  }

  async use_us_store_id(psn_id) {
    const url = `https://store.playstation.com/en-US/product/${this.id}`;
    const response = await fetch(url);
    if (response.ok) {
      this.id = response.url.match('([^\/]+)$')[1];
      this.country = 'us';
      this.lang = 'en';
      this.fetch_us_store = true;
      return await this.connect_psn('en') === 'ok';
    }
    return false;
  }

  async connect_psn(language) {
    const url = `https://${this.host}/store/api/chihiro/00_09_000/container/${this.country}/${language}/999/${this.id}`;
    const platform_list = ['ps5','ps4', 'ps3', 'ps2', 'ps', 'psvita', 'psp'];
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw 'connect error';
      }
      const res_json = await response.json();
      if (!res_json.top_category) {
        throw 'type error';
      }

      if (Array.isArray(res_json.playable_platform)) {
        this.platform = res_json.playable_platform[0].toLowerCase().replace(/[^a-z\d\-]/g, '');
      }
      else if (Array.isArray(res_json.playable_platform.values)){
        this.platform = res_json.playable_platform.values[0].toLowerCase().replace(/[^a-z\d\-]/g, '');
      }

      if (platform_list.indexOf(this.platform) != -1) {
        res_json.name && this.names.push(res_json.name);
        res_json.title_name && this.names.push(res_json.title_name);
        res_json.parent_name && this.names.push(res_json.parent_name);
        this.names = this.names.filter((elem, index, self) => { return index == self.indexOf(elem) });
        let rewards = res_json.default_sku.rewards;
        if (rewards.length > 0) {
          this.price = res_json.default_sku.display_price;
          if (rewards[0].isPlus) {
            this.discount_price = '';
            this.plus_price = rewards[0].display_price ? rewards[0].display_price : '';
          }
          else {
            this.discount_price = rewards[0].display_price ? rewards[0].display_price : '';
            this.plus_price = rewards[0].bonus_display_price ? rewards[0].bonus_display_price : '';
          }
          if (rewards[0].campaigns && rewards[0].campaigns.length > 0) {
            this.discount_end_time = rewards[0].campaigns[0].end_date;
          }
          else {
            this.discount_end_time = Utility.get_expire_date(1);
          }
        }
        this.state = 'ok';
        return true;
      }
      else {
        throw 'platform error';
      }
    }
    catch (err) {
      this.state = err;
      return false;
    }
  }

  async get_game_info_from_storage(key) {
    const data = await Utility.get_data(key);
    if (data) {
      this.state = data.state;
      if (data.state === 'ok') {
        this.platform = data.platform;
        this.names = [...data.names];
        this.is_en = data.is_en;
        this.price = data.price ? data.price : '';
        this.discount_price = data.discount_price ? data.discount_price : '';
        this.plus_price = data.plus_price ? data.plus_price : '';
        this.discount_end_time = data.discount_end_time ? data.discount_end_time : '';
      }
      return true;
    }
    else {
      this.state = 'not found';
    }
  }

  async set_game_info_to_storage(key, data) {
    return await Utility.set_data(key, data);
  }

  async get_game_info(force_update = false) {
    if (!force_update) {
      await this.get_game_info_from_storage(this.id);
    }
    if (this.state === 'not found' || force_update) {

      await this.connect_psn('en');

      if (this.state === 'connect error' && this.lang !== 'en') {
        this.is_en = false;
        await this.connect_psn(this.lang);
      }

      if (this.state === 'ok') {
        const data = { state: 'ok', platform: this.platform, names: this.names, is_en: this.is_en };
        if (this.price) data.price = this.price;
        if (this.discount_price) data.discount_price = this.discount_price;
        if (this.plus_price) data.plus_price = this.plus_price;
        if (this.discount_end_time) data.discount_end_time = this.discount_end_time;
        await this.set_game_info_to_storage(this.id, data);
      }
      else if (this.state !== 'connect error') {
        const data = { state: 'not game' };
        await this.set_game_info_to_storage(this.id, data);
      }
    }
    return this.state === 'ok';
  }
}