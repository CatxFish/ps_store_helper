function increase_height(target,incresement){
	let height = target.offsetHeight;
	if(height){
		let new_height = height + incresement;
		target.style.height = new_height +'px';
	}
}

function insert_meta_score(node,score){
	const insert_span = document.createElement('span');
	if(score==='tbd'){
		insert_span.className='metascore_w tbd';
	}
	else if(score >= 75){
		insert_span.className='metascore_w positive';
	}
	else if(score >= 50){
		insert_span.className='metascore_w mixed';
	}
	else 
		insert_span.className='metascore_w negtive';
	insert_span.innerHTML= score;
	node.appendChild(insert_span);
}

function insert_user_score(node,score){
	const insert_span = document.createElement('span');
	if(score==='tbd'){
		insert_span.className='metascore_w user tbd';
	}
	else if(score >= 7.5){
		insert_span.className='metascore_w user positive';
	}
	else if(score >= 5){
		insert_span.className='metascore_w user mixed';
	}
	else 
		insert_span.className='metascore_w user negtive';
	insert_span.innerHTML= score;
	node.appendChild(insert_span);
}

function insert_detail_page_meta_score(node,score,count,url){
	const insert_span = document.createElement('span');
	const insert_div = document.createElement('div');
	if(score==='tbd'){
		insert_span.className='metascore_w tbd large';
	}
	else if(score >= 75){
		insert_span.className='metascore_w positive large';
	}
	else if(score >= 50){
		insert_span.className='metascore_w mixed large';
	}
	else 
		insert_span.className='metascore_w negtive large';
	insert_div.className ='detail_metascore_text small';
	insert_span.innerHTML= score;
	insert_div.innerHTML = `<a href="${url}" target="_blank"><div class="detail_metascore_title">MetaScore</div><div>${count} critics</div></a>`
	node.appendChild(insert_span);
	node.appendChild(insert_div);
}

function insert_detail_page_user_score(node,score,count,url){
	const insert_span = document.createElement('span');
	const insert_div = document.createElement('div');
	if(score==='tbd'){
		insert_span.className='metascore_w user tbd large';
	}
	else if(score >= 7.5){
		insert_span.className='metascore_w user positive large';
	}
	else if(score >= 5){
		insert_span.className='metascore_w user mixed large';
	}
	else 
		insert_span.className='metascore_w user negtive large';
	insert_div.className ='detail_metascore_text small';
	insert_span.innerHTML = score;
	insert_div.innerHTML = `<a href="${url}" target="_blank"><div class="detail_metascore_title">MetaCritic user score</div><div>${count} ratings</div></a>`;
	node.appendChild(insert_span);
	node.appendChild(insert_div);
}

function inject_game_list(){
	let nodelist = [...document.querySelectorAll('.__desktop-presentation__grid-cell__base__0ba9f')];
	let res = nodelist.map((node)=>{
		const locale = document.URL.split('/')[3].match('([^-]+)$')[1];
		if(!node.querySelector('.metascore_container')){
			const infoplane = node.querySelector('.grid-cell__body');
			const out_box = node.querySelector('.grid-cell');
			const insert_div = document.createElement('div');
			const infoplane_bot = infoplane.querySelector('.grid-cell__bottom');
			const infoplane_parent = infoplane_bot.parentNode;
			const psn_link = infoplane.querySelector('a');
			const psn_id = psn_link.getAttribute("href").match('([^\/]+)$')[1];
			insert_div.className='metascore_container';
			infoplane_parent.insertBefore(insert_div,infoplane_bot);
			increase_height(node,insert_div.offsetHeight);
			increase_height(infoplane,insert_div.offsetHeight);
			increase_height(out_box,insert_div.offsetHeight);
			document.querySelectorAll('.__desktop-presentation__grid-cell__base__0ba9f')
			get_metacritic_score(window.location.host,locale,psn_id,(response)=>{
				if(response.state ==='success'){
					insert_meta_score(insert_div,response.meta_score);
					const insert_span = document.createElement('span');
					insert_span.innerHTML= '|';
					insert_div.appendChild(insert_span);
					insert_user_score(insert_div,response.user_score);	
				}
			})
		}
	})
}

function inject_detail_page(){
	const sku_info = document.querySelector('div.sku-info');
	const meta_div = document.querySelector('#detail-meta-score');
	const user_div = document.querySelector('#detail-user-score');
	if(sku_info && !meta_div && !user_div){
		const locale = document.URL.split('/')[3].match('([^-]+)$')[1];
		const psn_id = document.URL.match('([^\/]+)$')[1];
		const insert_div = document.createElement('div');
		const insert_user_div = document.createElement('div');
		insert_div.id = 'detail-meta-score';
		insert_user_div.id = 'detail-user-score';
		sku_info.parentNode.insertBefore(insert_div,sku_info.nextSibling);
		sku_info.parentNode.insertBefore(insert_user_div,insert_div.nextSibling);	
		get_metacritic_score(window.location.host,locale,psn_id,(response)=>{
			if(response.state ==='success'){
				const url = `http://www.metacritic.com/game/${response.platform}/${response.name}`;
				insert_div.className='detail_metascore_container';
				insert_detail_page_meta_score(insert_div,response.meta_score,response.meta_count,url);				
				if(response.user_score!=='tbd'){
					insert_user_div.className='detail_metascore_container';				
					insert_detail_page_user_score(insert_user_div,response.user_score,response.user_count,url);	
				}
			}
		})		
	}
}

const observer = new MutationObserver(function(mutations) {
    inject_detail_page();
	inject_game_list();
});

chrome.runtime.onMessage.addListener((request, sender, callback) =>{
	if (request.action === 'inject_metacritic'){
		const target = document.querySelector('.application-container');
		const config = { attributes: true, childList: true, characterData: true ,subtree: true};
		observer.observe(target, config);
	}
	else if(request.action ==='disable_inject'){
		observer.disconnect();
	}
})