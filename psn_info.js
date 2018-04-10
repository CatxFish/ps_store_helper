class Psn_info {

	constructor(host,locale,psn_id) {
		const locale_list = locale.split('-');		
		this.id = psn_id;
		this.host = host;
		this.country = locale_list[locale_list.length-1];
		this.lang = locale_list[0];
		this.state = 'not connect';
		this.is_en = true;
		this.fetch_us_store = false;
		this.platform = '';
		this.names = [];
	}

	async use_us_store_id(psn_id){
		const url=`https://store.playstation.com/en-US/product/${this.id}`;
		const response = await fetch(url);
		if(response.ok) {
			this.id = response.url.match('([^\/]+)$')[1];
			this.country = 'us';
			this.lang = 'en';
			this.fetch_us_store = true;
			return await this.connect_psn('en') === 'ok';
		}
		return false;
	}

	async connect_psn(language){
		const url=`https://${this.host}/store/api/chihiro/00_09_000/container/${this.country}/${language}/999/${this.id}`;
		const platform_list = ['ps4','ps3','ps2','ps','psvita','psp'];
		try{
			const response = await fetch(url);		
			if(!response.ok) {
				throw 'connect error';
			}
			const res_json = await response.json();
			if(!res_json.game_contentType){ 
				throw 'type error';	
			}
			this.platform = res_json.playable_platform[0].toLowerCase().replace(/[^a-z\d\-]/g,'');
			if( platform_list.indexOf(this.platform)!=-1){
				res_json.name && this.names.push(res_json.name);
				res_json.title_name && this.names.push(res_json.title_name);
				res_json.parent_name && this.names.push(res_json.parent_name);
				this.names = this.names.filter((elem,index,self) =>{return index == self.indexOf(elem)});
				this.state='ok';
				return true;		
			}
			else{
				throw 'platform error';
			}		
		}
		catch(err) {
			this.state=err;
			return false;
		}		
	}

	async get_game_info_from_storage(key){
		let state ='loading';
		const data = await Utility.get_data(key);
		if(data){
			this.state = data.state;
			this.platform = data.platform;
			this.names = [...data.names];
			this.is_en = data.is_en;
		}
		else{
			this.state = 'not found';
		}
		return state;
	}

	set_game_info_to_storage(key,data){
		return Utility.set_data(key,data);
	}

	async get_game_info(){
		await this.get_game_info_from_storage(this.id);
		if(this.state === 'not found'){

			await this.connect_psn('en');
			
			if(this.state === 'connect error' && this.lang !== 'en'){
				this.is_en = false;
				await this.connect_psn(this.lang);
			}

			if(this.state === 'ok'){
				const data = {state:'ok',platform:this.platform,names:this.names,is_en:this.is_en};
				this.set_game_info_to_storage(this.id,data);		
			}
			else if(this.state !=='connect error'){
				const data = {state:'not game'};
				this.set_game_info_to_storage(this.id,data);
			}
		}
		return this.state ==='ok';
	}
}