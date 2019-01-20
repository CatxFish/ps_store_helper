class Discount {

  constructor(host, locale, psn_id) {
    this.host = host;
    this.id = psn_id;
    this.locale = locale;
    const locale_list = locale.split('-');
    this.country = locale_list[locale_list.length - 1];
    this.state = "not connect";
    this.low_price = "";
    this.low_plus_price = "";
    this.url = '';
  }

  async load_price_from_storage(key) {
    const data = await Utility.get_data(key);
    if (data && data.discount && !Utility.is_expired(data.discount.expire_date)) {
      this.low_price = data.discount.low_price;
      this.low_plus_price = data.discount.low_plus_price;
      this.url = data.discount.url;
      this.state = 'ok';
      return true;
    }
    else if (data && data.discount) {
      this.state = 'expired';
      this.url = data.discount.url;
    }
    else {
      this.state = 'storage not found';
    }
  }

  async save_price_to_storage(key) {
    const expire_date = Utility.get_expire_date(1);
    const url = this.url;
    const low_price = this.low_price;
    const low_plus_price = this.low_plus_price;
    return await Utility.set_data(key, { discount: { url, low_price, low_plus_price, expire_date } });
  }

  adjust_price(low_price, low_plus_price) {
    if (low_plus_price === '--') {
      return low_price;
    }
    else {
      const num_plus_price = Number(low_plus_price.replace(/[^0-9\.]/g, ''));
      const num_low_price = Number(low_price.replace(/[^0-9\.]/g, ''));
      if (num_plus_price && num_low_price && num_plus_price > num_low_price) {
        return low_price;
      }
    }
    return low_plus_price;
  }

  async search_discount_link(key, page_count) {

    const page = page_count.toString()
    const url = `https://psdeals.net/${this.country}-store/all-games/${page}?search=${key}&sort=title-desc&type=all`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw 'connect error';
      }
      const parser = new DOMParser();
      const doc = parser.parseFromString(await response.text(), "text/html");
      const results = doc.querySelectorAll('.game-collection-item-link');
      for (let link of results) {
        const image_obj = link.querySelector('.game-collection-item-image');
        const image_id = image_obj ? image_obj.src.split('/')[11] : '';
        if (image_id && image_id === this.id) {
          const re = new RegExp(`https://${this.host}`, 'g');
          const pathname = link.href.replace(re, '');
          this.state = 'link_get';
          this.url = `https://psdeals.net${pathname}`;
          break;
        }
      }

      const next_page = doc.querySelector('li.next>a');
      if (this.state !== 'link_get' && next_page && page_count < 6) {
        return this.search_discount_link(key, page_count + 1);
      }

      return this.state === 'link_get';
    }
    catch (err) {
      this.state = err;
      return false;
    }
  }

  async fetch_discount_page(url) {
    const response = await fetch(url);
    if (response.ok) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(await response.text(), "text/html");
      const low_price_div = doc.querySelector('span.game-stats-col-number-green');
      const low_plus_div = doc.querySelector('span.game-stats-col-number-yellow');
      const low_price = low_price_div ? low_price_div.innerHTML : '';
      let low_plus_price = low_plus_div ? low_plus_div.innerHTML : '';
      if (low_price_div || low_plus_div) {
        this.low_price = low_price;
        this.low_plus_price = this.adjust_price(low_price, low_plus_price);
        this.state = 'ok';
        return true;
      }
      else {
        this.state = 'discount page error';
        return false;
      }
    }
    else {
      this.state = 'connect error';
      return false;
    }
  }

  async get_lowest_price() {

    if (await this.load_price_from_storage(this.id)) {
      return true;
    }
    else if (this.state === 'storage not found') {
      let psn = new Psn_info(this.host, this.locale, this.id);
      await psn.get_game_info();
      if (psn.state === 'ok') {
        const search_key = psn.names[0].replace(/\'/g, '').replace(/ +/g, '+');
        await this.search_discount_link(search_key, 1);
      }
    }

    if (this.url) {
      await this.fetch_discount_page(this.url);
    }

    if (this.state === 'ok') {
      await this.save_price_to_storage(this.id);
    }

    return this.state === 'ok';
  }

  async is_lowest_price() {
    if (this.state !== 'ok') {
      if (!await this.load_price_from_storage(this.id)) {
        return 0;
      }
    }

    let psn = new Psn_info(this.host, this.locale, this.id);
    await psn.get_game_info();

    if (psn.state !== 'ok') {
      return 0;
    }
    else if (!psn.discount_end_time || Utility.is_expired(psn.discount_end_time)) {
      await psn.get_game_info(true);
    }

    //{0:not lowest,1:lowest,2:plus lowest,3:both lowest}
    let ret = 0

    if (this.is_lower(psn.price, psn.plus_price, this.low_plus_price)) {
      ret += 2;
    }
    if (this.is_lower(psn.price, psn.discount_price, this.low_price)) {
      ret += 1;
    }

    return ret;
  }

  is_lower(default_price, price1, price2) {
    if (!default_price || !price1 || !price2) {
      return false;
    }
    const price1_ = price1.replace(/[^0-9\.-]+/g, "");
    const price2_ = price2.replace(/[^0-9\.-]+/g, "");
    const default_price_ = default_price.replace(/[^0-9\.-]+/g, "");

    return Number(price1_) < Number(default_price_) && Number(price1_) <= Number(price2_);
  }
}