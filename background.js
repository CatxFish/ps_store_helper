function set_badge(enable){
	const text = enable ? '':'off';
	enable ? chrome.browserAction.setBadgeText({text}) :chrome.browserAction.setBadgeText({text});	
}

function set_insert_enable(enable){	
	if(enable){
		chrome.browserAction.setIcon({path: 'icon/green128.png'});	
		chrome.browserAction.setBadgeBackgroundColor({color: '#ff0000'});	
	}
	else{
		chrome.browserAction.setIcon({path: 'icon/gray.png'});
		chrome.browserAction.setBadgeBackgroundColor({color: '#cccccc'});		
	}
}

function check_insert_enable(){
	chrome.tabs.query({active: true,currentWindow: true}, tabs => {
		tabs[0] && set_insert_enable(tabs[0].url.match(/^https:\/\/store.playstation.com\//g));
	});
}

let extension_enable = true;

chrome.storage.local.get('pss_meta',item =>{
	item['pss_meta']!== undefined && (extension_enable = item['pss_meta']);
	check_insert_enable();
	set_badge(extension_enable);
});

chrome.storage.local.get('pss_version',item=>{
	const current_version = chrome.runtime.getManifest().version;
	const storage_version = item && item['pss_version']?item['pss_version']:'0.0.0';
	if(current_version !== storage_version){
		chrome.storage.local.clear();
	}
	chrome.storage.local.set({'pss_version': current_version});
});


chrome.tabs.onUpdated.addListener((tabId,changeInfo,tab) =>{
	if(tab.url.match(/^https:\/\/store.playstation.com\//g) && extension_enable){
		extension_enable && chrome.tabs.sendMessage(tab.id, { action: "inject_metacritic" });
	}
	check_insert_enable();
});

chrome.browserAction.onClicked.addListener(tab => {
	extension_enable = extension_enable ? false : true;
	set_badge(extension_enable);
	if(tab.url.match(/^https:\/\/store.playstation.com\//g)){
		const action = extension_enable ? 'inject_metacritic' : 'disable_inject';
		chrome.tabs.sendMessage(tab.id, {action});
	}
	chrome.storage.local.set({'pss_meta':extension_enable });
});

chrome.tabs.onHighlighted.addListener(highlightInfo =>{
	check_insert_enable();
});

chrome.runtime.onMessage.addListener((request, sender, callback)=> {
    if (request.action === 'fetch_http') {
		fetch(request.url,{method: 'get'})
		.then(response=> {
			if (!response.ok) throw new Error(response.statusText);			
			return response.text();
		})
		.then(response_text =>{
			callback({state: 'ok',content: response_text});		
			return;		
		})
		.catch(err =>{
			callback({state: 'error',content:err});
		})
        return true; 
    }
});
