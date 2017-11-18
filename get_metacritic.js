async function get_game_info_from_psn(host,locale,psn_id){
	const url=`https://${host}/store/api/chihiro/00_09_000/container/${locale}/en/999/${psn_id}`;
	const platform_list = {
		'ps4':'playstation-4',
		'ps3':'playstation-3',
		'ps2':'playstation-2',
		'ps':'playstation',
		'psvita':'playstation-vita',
		'psp':'psp'
		};
	
	let state = 'fetching';
	try{
		const response = await fetch(url);		
		if(!response.ok) {
			throw 'connect error';
		}
		const psn_info = await response.json();
		if(!psn_info.game_contentType){ 
			throw 'type error';	
		}
		let platform = psn_info.playable_platform[0].toLowerCase().replace(/[^a-z\d\-]/g,'');
		if( platform in platform_list){
			let names =[];
			psn_info.name && names.push(psn_info.name);
			psn_info.title_name && names.push(psn_info.title_name);
			psn_info.parent_name && names.push(psn_info.parent_name);
			state = 'success';
			platform = platform_list[platform];
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
				if(item[psn_id].isgame){
					const platform = item[psn_id].platform;
					const names = item[psn_id].names;
					state = 'success';
					resolve({state,platform,names});
				}
				else{
					resolve({'state':'not game'});
				}
			}
			else{				
				resolve({'state':'not found'});		
			}
		})
	})
}
async function get_game_info_by_psn_id(host,locale,psn_id){
	let psn_info = await get_game_info_from_storage(psn_id);
	if(psn_info.state === 'not found'){
		psn_info = await get_game_info_from_psn(host,locale,psn_id);
		if(locale!='us'){
			const us_store_page = await get_us_store_id(psn_id);
			if(us_store_page.state ==='success'){
				let psn_info_us = await get_game_info_from_psn(host,'us',us_store_page.id);
				if(psn_info_us.state === 'success' && psn_info.state === 'success'){
					psn_info.names.push(...psn_info_us.names);
				}
				else if(psn_info_us.state === 'success'){
					psn_info = psn_info_us;
				}
			}
		}
		if(psn_info.state === 'success'){
			const isgame = true;
			const platform = psn_info.platform;
			const names = psn_info.names;
			const data = {isgame,platform,names};
			chrome.storage.local.set({[psn_id]:data});		
		}
		else if(psn_info.state !=='connect error'){
			const data = {isgame:false};
			chrome.storage.local.set({[psn_id]:data});
		}
	}
	return psn_info;
}

function filter_char(name){
	if(name)
		return name.replace(/ /g,'-').replace(/& /g,'').toLowerCase().replace(/[^a-z\d\?!\-]/g,'');	
	else
		return '';
}

function save_metascore_to_storage(meta_info,exist){
	const key = `${meta_info.platform}/${meta_info.name}`;
	let data ={};
	if(exist){
		const expire_date = get_expire_date(7);
		const meta_score = meta_info.meta_score;
		const user_score = meta_info.user_score;
		const meta_count = meta_info.meta_count;
		const user_count = meta_info.user_count;
		data = {exist,meta_score,user_score,meta_count,user_count,expire_date};
	}
	else{
		const expire_date = get_expire_date(1);
		data = {exist,expire_date};
	}
	chrome.storage.local.set({[key]:data});
}

function get_metascore_from_storage(platform,name){
	return new Promise(resolve =>{				
		const key = `${platform}/${name}`;
		chrome.storage.local.get(key , item =>{
			if(item && item[key] && !is_expired(item[key].expire_date)){
				if(item[key].exist){
					const meta_score = item[key].meta_score;
					const user_score = item[key].user_score;
					const meta_count = item[key].meta_count;
					const user_count = item[key].user_count;
					resolve ({state:'success',platform,name,meta_score,user_score,meta_count,user_count});
				}
				else{
					resolve ({'state':'metacritic not found'});
				}
			}
			else if (item && item[key] && item[key].exist){
				resolve({state:'expired',platform,name});
			}
			else{
				resolve({'state':'not found'});
			}
		})
	})
}

async function get_metascore_from_metacritic(platform,name){
	return new Promise(resolve =>{	
		const action ='fetch_http';
		const url = `http://www.metacritic.com/game/${platform}/${name}`;
		chrome.runtime.sendMessage({action,url},response =>{
			let state ='fetching';
			if(response.state ==='ok'){
				const doc = document.implementation.createHTMLDocument('extern-http');
				let meta_score_connect4_obj;
				doc.documentElement.innerHTML = response.content;
				score_section = doc.querySelector('div.section.product_scores')			
				if(score_section){
					const meta_score_obj = doc.querySelector('span[itemprop=ratingValue]');
					const user_score_obj = doc.querySelector('div.metascore_w.user');
					const meta_critic_count_obj = doc.querySelector('span[itemprop=reviewCount]');
					const user_count_obj = doc.querySelector('.feature_userscore > .summary > p > .count > a');
					const meta_score = meta_score_obj? meta_score_obj.innerHTML : 'tbd';
					const user_score = user_score_obj? user_score_obj.innerHTML : 'tbd';
					const meta_count = meta_critic_count_obj? meta_critic_count_obj.innerHTML : '0';
					const user_count = user_count_obj ? user_count_obj.innerHTML.replace(/\D+/g,''): '0';
					state = 'success';				
					resolve({state,platform,name,meta_score,user_score,meta_count,user_count});
				}
				else{
					state = 'connect error';
					resolve ({state});
				}			
			}
			else{
				state = 'connect error';
				resolve({state});
			}
		});
	})
}

async function get_metascore_by_psn_info(psn_info){
	let meta_info;
	for(let name of psn_info.names){				
		meta_info = await get_metascore_from_storage(psn_info.platform,filter_char(name));
		if(meta_info.state !=='not found'){
			break;
		}		
	}

	if(meta_info.state === 'expired'){
		meta_info = await get_metascore_from_metacritic(meta_info.platform,meta_info.name);
	}
	else if(meta_info.state === 'not found'){
		for(let name of psn_info.names){				
			meta_info = await get_metascore_from_metacritic(psn_info.platform,filter_char(name));
			if(meta_info.state ==='success'){
				save_metascore_to_storage(meta_info,true);
				break;
			}		
		}
	}

	if(meta_info.state ==='connect error'){
		meta_info.platform = psn_info.platform;
		meta_info.name = psn_info.names[0];
		save_metascore_to_storage(meta_info,false);
	}

	return meta_info;
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

async function get_metacritic_score(host,locale,psn_id,callback){
	let psn_info = await get_game_info_by_psn_id(host,locale,psn_id);
	let meta_info ={};
	if(psn_info.state === 'success'){
		meta_info = await get_metascore_by_psn_info(psn_info);
	}

	callback(meta_info);
}






