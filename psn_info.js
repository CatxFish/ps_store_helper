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
		const res_json = await response.json();
		if(!res_json.game_contentType){ 
			throw 'type error';	
		}
		let platform = res_json.playable_platform[0].toLowerCase().replace(/[^a-z\d\-]/g,'');
		if( platform in platform_list){
            let names=[];
			res_json.name && names.push(res_json.name);
			res_json.title_name && names.push(res_json.title_name);
            res_json.parent_name && names.push(res_json.parent_name);
            names = names.filter((elem,index,self) =>{return index == self.indexOf(elem)});
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
                state = item[psn_id].isgame? 'success' : 'not game';
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
		psn_info = await get_game_info_from_psn(host,locale,psn_id);

		if(psn_info.state === 'success'){
			const isgame = true;
			const platform = psn_info.platform;
			const names = psn_info.names;
			const data = {isgame,platform,names};
			set_game_info_to_storage(psn_id,data);		
		}
		else if(psn_info.state !=='connect error'){
			const data = {isgame:false};
			set_game_info_to_storage(psn_id,data);
		}
	}
	return psn_info;
}