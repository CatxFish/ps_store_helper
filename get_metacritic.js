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
	let search_names = psn_info.m_name ? psn_info.m_name : psn_info.names
	for(let name of search_names){
		const platform = get_metacritic_platform_alias(psn_info.platform);			
		meta_info = await get_metascore_from_storage(platform,filter_char(name));
		if(meta_info.state !=='not found'){
			break;
		}
		else{
			meta_info = await get_metascore_from_metacritic(platform,filter_char(name));
		}	
		if(meta_info.state ==='success'){
			save_metascore_to_storage(meta_info,true);
			break;
		}
	}
	if(meta_info.state === 'expired'){
		meta_info = await get_metascore_from_metacritic(meta_info.platform,meta_info.name);
		save_metascore_to_storage(meta_info,true);
	}

	if(meta_info.state ==='connect error'){
		meta_info.platform = psn_info.platform;
		meta_info.name = psn_info.names[0];
		save_metascore_to_storage(meta_info,false);
	}

	return meta_info;
}

async function get_metacritic_score(host,locale,psn_id,use_us_info=false){
	let search_id = psn_id;
	let search_locale = locale;
	let psn_info ={};
	let meta_info ={};
	if(use_us_info){
		const us_store_page = await get_us_store_id(psn_id);
		if(us_store_page.state ==='success'){
			search_id = us_store_page.id;
			search_locale = 'en-us';
		}
		else{
			meta_info.state = 'connect error';
			return meta_info;
		}
	}

	psn_info = await get_game_info_by_psn_id(host,search_locale,search_id);
	
	if(psn_info.state === 'success' || psn_info.m_name){
		meta_info = await get_metascore_by_psn_info(psn_info);
	}
	else{
		meta_info.state = 'connect error';
	}

	if(meta_info.state ==='success'){
		set_game_info_to_storage(psn_id,{m_name:[meta_info.name]});
	}

	return meta_info;
}

function get_metacritic_platform_alias(name){
	const platform_list = {
		'ps4':'playstation-4',
		'ps3':'playstation-3',
		'ps2':'playstation-2',
		'ps':'playstation',
		'psvita':'playstation-vita',
		'psp':'psp'
		};
	
	if(name in platform_list){
		return platform_list[name];
	}
}





