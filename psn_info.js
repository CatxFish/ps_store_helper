function filter_char(name){
	if(name){
        const re = new RegExp(`[^a-z\\d\\?!\\-]`,'g');
        const filter_name = name.replace(/ /g,'-').replace(/& /g,'').toLowerCase().replace(re,'');
        return filter_name;
    }
	else{
        return '';
    }
}

function is_expired(date_string){
	const today = new Date();
	const expire_day = new Date(date_string);
	return (today > expire_day);
}

function get_expire_date(duration){
	const expire_time= new Date(new Date().getTime() + duration * 24 * 60 * 60 * 1000);
	const mm = expire_time.getMonth()+1;
	const dd = expire_time.getDate();
	const yy = expire_time.getFullYear();;
	const expire_day = `${mm}/${dd}/${yy}`;
	return expire_day;
}

async function get_us_store_id(psn_id){
	const url=`https://store.playstation.com/en-US/product/${psn_id}`;
	let state ='fail';
	const response = await fetch(url);
	if(response.ok) {
		const id = response.url.match('([^\/]+)$')[1];
		state = 'success';
		return {state,id};
	}

	return {state};
}

async function get_game_info_from_psn(host,country,lang,psn_id){
	const url=`https://${host}/store/api/chihiro/00_09_000/container/${country}/${lang}/999/${psn_id}`;
	const platform_list = ['ps4','ps3','ps2','ps','psvita','psp'];
	let state = 'fetching';
	try{
		const response = await fetch(url);		
		if(!response.ok) {
			throw 'connect error';
		}
		const res_json = await response.json();
		if(!res_json.game_contentType){ 
			throw 'type error';	
		}
		let platform = res_json.playable_platform[0].toLowerCase().replace(/[^a-z\d\-]/g,'');
		if( platform_list.indexOf(platform)!=-1){
			let names=[];
			res_json.name && names.push(res_json.name);
			res_json.title_name && names.push(res_json.title_name);
			res_json.parent_name && names.push(res_json.parent_name);
            names = names.filter((elem,index,self) =>{return index == self.indexOf(elem)});
			state = lang==='en'?'success':'not english';
			return{state,platform,names};		
		}
		else{
			throw 'platform error';
		}		
	}
	catch(err) {
		state=err;
		return {state};
	}
		
}

function get_game_info_from_storage(psn_id){
	return new Promise(resolve =>{
		chrome.storage.local.get(psn_id , item =>{
			let state ='loading';
			if(item && item[psn_id]){
                state = item[psn_id].state;
				resolve({state,...item[psn_id]});
			}
			else{				
				resolve({'state':'not found'});		
			}
		})
	})
}

function set_game_info_to_storage(psn_id,data){
    chrome.storage.local.get(psn_id , item =>{
        if(item && item[psn_id]){
            const merge_data = Object.assign(item[psn_id],data);
            chrome.storage.local.set({[psn_id]:merge_data});
        }
        else{
            chrome.storage.local.set({[psn_id]:data});
        }
    })
}

async function get_game_info_by_psn_id(host,locale,psn_id){
	let psn_info = await get_game_info_from_storage(psn_id);
	if(psn_info.state === 'not found'){
        const locale_list = locale.split('-');
        const country = locale_list[locale_list.length-1];
        const lang = locale_list[0];
        psn_info = await get_game_info_from_psn(host,country,'en',psn_id);
        
        if(psn_info.state === 'connect error'){
            psn_info = await get_game_info_from_psn(host,country,lang,psn_id);
        }

		if(psn_info.state === 'success'|| psn_info.state ==='not english'){
			const state = psn_info.state;
			const platform = psn_info.platform;
			const names = psn_info.names;
			const data = {state,platform,names};
			set_game_info_to_storage(psn_id,data);		
        }
		else if(psn_info.state !=='connect error'){
			const data = {state:'not game'};
			set_game_info_to_storage(psn_id,data);
		}
	}
	return psn_info;
}