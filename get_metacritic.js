
async function get_info_by_psn_id(host,locale,psn_id){
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
			let game_names =[];
			psn_info.name && game_names.push(transform_name(psn_info.name));
			psn_info.title_name && game_names.push(transform_name(psn_info.title_name));
			psn_info.parent_name && game_names.push(transform_name(psn_info.parent_name));
			state = 'success';
			platform = platform_list[platform];
			const data = {game_names,platform};
			return{state,data};		
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

function transform_name(game_name){
	if(game_name)
		return game_name.replace(/ /g,'-').replace(/& /g,'').toLowerCase().replace(/[^a-z\d\?!\-]/g,'');	
	else
		return '';
}

function fetch_metacritic(game_name,platform){
	return new Promise((resolve, reject) =>{
		const action ='fetch_http';
		const url = `http://www.metacritic.com/game/${platform}/${game_name}`;
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
					const data = {url,meta_score,user_score,meta_count,user_count};
					state = 'success';				
					resolve({state,data});
				}
				else{
					state = 'Page error';
					resolve({state});
				}
				
			}
			else{
				state = 'connect error';
				resolve({state});
			}
		});
	})	

}

function is_not_expire(date_string){
	const today = new Date();
	const expire_day = new Date(date_string);
	return (expire_day > today);
}

function get_expire_date(duration){
	const expire_time= new Date(new Date().getTime() + duration * 24 * 60 * 60 * 1000);
	const mm = expire_time.getMonth()+1;
	const dd = expire_time.getDate();
	const yy = expire_time.getFullYear();;
	const expire_day = `${mm}/${dd}/${yy}`;
	return expire_day;
}

function get_storage(psn_id){
	return new Promise((resolve, reject) =>{
		chrome.storage.local.get(psn_id , item =>{
			let state ='loading'
			if(item && item[psn_id] && is_not_expire(item[psn_id].expire_date)){
				if(item[psn_id].url){
					const url = item[psn_id].url;
					const meta_score = item[psn_id].meta_score;
					const user_score = item[psn_id].user_score;
					const meta_count = item[psn_id].meta_count;
					const user_count = item[psn_id].user_count;
					const data = {url,meta_score,user_score,meta_count,user_count};
					state = 'success';	
					resolve({state,data});
				}
				else{
					state = 'metacritic not found';
					resolve({state});
				}
			}
			else{				
				resolve({'state':'not found'});		
			}
		})
	})
}

function set_storage(psn_id,url,meta_score,user_score,meta_count,user_count){
		const expire_date = get_expire_date(1);
		const data = {url,meta_score,user_score,meta_count,user_count,expire_date};
		chrome.storage.local.set({[psn_id]:data},function(){});
}

async function get_metacritic_score(host,locale,psn_id,callback){
	
	let response=await get_storage(psn_id);
	if(response.state !== 'success' && response.state!=='metacrtic not found'){
		let game_name;
		let psn_info = await get_info_by_psn_id(host,locale,psn_id);		
		if(psn_info.state ==='success'){
			for(let name of psn_info.data.game_names){
				game_name = name;
				response = await fetch_metacritic(name,psn_info.data.platform);				
				if(response.state ==='success') {
					break
				}
			}
		}		
		if(response.state !=='success'){
			let state;
			if(psn_info.state === 'success')
				state =response.state;
			else
				state =psn_info.state;
			const meta_score ='';
			const user_score ='';
			const data = {game_name,meta_score,user_score};
			response = {state,data};
			set_storage(psn_id,'','','');
		}
		else{
			set_storage(psn_id,response.data.url,response.data.meta_score,response.data.user_score,response.data.meta_count,response.data.user_count);
		}
	}
		callback(response);
}






