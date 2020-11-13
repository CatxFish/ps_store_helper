function increase_height(target,incresement){
	let height = target.offsetHeight;
	if(height){
		let new_height = height + incresement;
		target.style.height = new_height +'px';
	}
}

function create_link(link){
	const insert_link = document.createElement('a');
	insert_link.setAttribute('href', link);
	insert_link.setAttribute('target','_blank');
	return insert_link;
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
	insert_span.textContent= score;
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
	insert_span.textContent= score;
	node.appendChild(insert_span);
}

function insert_detail_page_meta_score(node,score,count,url){
	const insert_span = document.createElement('span');
	const insert_div = document.createElement('div');
	const insert_link = create_link(url);
	const insert_meta_title = document.createElement('div');
	const insert_meta_count = document.createElement('div');
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
	insert_meta_title.className='detail_metascore_title';
	insert_span.textContent= score;
	insert_meta_title.textContent='MetaScore';
	insert_meta_count.textContent=`${count} critics`;
	insert_link.appendChild(insert_meta_title);
	insert_link.appendChild(insert_meta_count);
	insert_div.appendChild(insert_link);
	node.appendChild(insert_span);
	node.appendChild(insert_div);
	
}

function insert_detail_page_user_score(node,score,count,url){
	const insert_span = document.createElement('span');
	const insert_div = document.createElement('div');
	const insert_link = create_link(url);
	const insert_score_title = document.createElement('div');
	const insert_score_count = document.createElement('div');

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
	insert_score_title.className='detail_metascore_title';
	insert_span.textContent = score;
	insert_score_title.textContent='MetaCritic user score';
	insert_score_count.textContent=`${count} ratings`;
	insert_link.appendChild(insert_score_title);
	insert_link.appendChild(insert_score_count);
	insert_div.appendChild(insert_link);
	node.appendChild(insert_span);
	node.appendChild(insert_div);
}

function insert_detail_page_discount(node,low_price,low_plus_price,url){
	const title = document.createElement('p');
	const price = document.createElement('p');
	const divider = document.createElement('hr');
	const price_link = create_link(url);
	const span_low_price = document.createElement('span');
	title.textContent='Lowest price:';
	span_low_price.textContent = `${low_price} / ${low_plus_price}(PS+)`;
	divider.className='sku-info__divider';
	price_link.appendChild(span_low_price);
	price.appendChild(price_link);
	node.appendChild(title);
	node.appendChild(price);
	node.appendChild(divider);
}

function insert_loweset_badge(node,lowest_state){
	const div = document.createElement('div');
	div.textContent='Lowest';
	if(lowest_state === 1){
		div.className='lowest_badge regular_lowest';
	}
	else if(lowest_state === 2){
		div.className='lowest_badge plus_lowest';
	}
	else if(lowest_state === 3){
		div.className='lowest_badge both_lowest';
	}
	node.appendChild(div);
}

async function inject_game_list(){
	let nodelist = [...document.querySelectorAll('.__desktop-presentation__grid-cell__base__0ba9f')];
	let k = Math.ceil(nodelist.length/5)
	for(i=0; i<k; i++)
	{
		start = i*5
		if(i == k-1)
			end = nodelist.length%5
		else
			end = (i+1)*5
		
		updatelist = nodelist.slice(start,end)


		let res = await Promise.all(updatelist.map(async (node)=>{
			if(!node.querySelector('.metascore_container')){
				const infoplane = node.querySelector('.grid-cell__body');
				const out_box = node.querySelector('.grid-cell');
				const insert_div = document.createElement('div');
				const infoplane_bot = infoplane.querySelector('.grid-cell__bottom');
				const infoplane_parent = infoplane_bot.parentNode;
				const psn_link = infoplane.querySelector('a');
				const psn_id = psn_link.getAttribute("href").match('([^/]+)$')[1].replace(/\?.*$/,'');
				insert_div.className='metascore_container';
				infoplane_parent.insertBefore(insert_div,infoplane_bot);
				increase_height(node,insert_div.offsetHeight);
				increase_height(infoplane,insert_div.offsetHeight);
				increase_height(out_box,insert_div.offsetHeight);
				document.querySelectorAll('.__desktop-presentation__grid-cell__base__0ba9f')
				let meta= new MetaInfo(window.location.host,locale,psn_id);
				if(await meta.get_metacritic_score()){
					insert_meta_score(insert_div,meta.meta_score);
					const insert_span = document.createElement('span');
					insert_span.textContent= '|';
					insert_div.appendChild(insert_span);
					insert_user_score(insert_div,meta.user_score);	
				}
				const discount_badge = node.querySelector('.product-image__discount-badge');
				if(discount_badge && discount_badge.clientHeight>0){
					let discount = new Discount(window.location.host,locale,psn_id);
					if(await discount.get_lowest_price()){
						lowest_state = await discount.is_lowest_price();
						if(lowest_state>0){
							const img_plane = node.querySelector('.product-image')
							insert_loweset_badge(img_plane,lowest_state);
						}

					}
				}
			}
		}))
	}
}

async function inject_detail_page(){
	const sku_info = document.querySelector('div.sku-info');
	const meta_div = document.querySelector('#detail-meta-score');
	const user_div = document.querySelector('#detail-user-score');

	if(sku_info && !meta_div && !user_div){
		const insert_div = document.createElement('div');
		const insert_user_div = document.createElement('div');
		const psn_id = document.URL.match('([^/]+)$')[1].replace(/\?.*$/,'');		
		insert_div.id = 'detail-meta-score';
		insert_user_div.id = 'detail-user-score';
		sku_info.parentNode.insertBefore(insert_div,sku_info.nextSibling);
		sku_info.parentNode.insertBefore(insert_user_div,insert_div.nextSibling);
		let meta= new MetaInfo(window.location.host,locale,psn_id);		
		if (await meta.get_metacritic_score()){
			insert_div.className='detail_metascore_container';
			insert_detail_page_meta_score(insert_div,meta.meta_score,meta.meta_count,meta.url);				
			if(meta.user_score!=='tbd'){
				insert_user_div.className='detail_metascore_container';				
				insert_detail_page_user_score(insert_user_div,meta.user_score,meta.user_count,meta.url);	
			}
		}

	}
}

async function inject_discount_info_detail_page(){
	const sku_info = document.querySelector('div.sku-info');
	const discount_div = document.querySelector('#detail-discount');
	if(sku_info && !discount_div){
		const insert_low_price = document.createElement('div');
		const playable = sku_info.querySelector('.playable-on');
		const psn_id = document.URL.match('([^/]+)$')[1].replace(/\?.*$/,'');
		sku_info.insertBefore(insert_low_price,playable);
		insert_low_price.id='detail-discount';
		let dicount = new Discount(window.location.host,locale,psn_id);
		if(await dicount.get_lowest_price()){
			insert_low_price.className = 'discount_container';
			insert_detail_page_discount(insert_low_price,dicount.low_price,dicount.low_plus_price,dicount.url);
		}	
	}
}

function clear_inject(){
	const meta_div = document.querySelector('#detail-meta-score');
	const user_div = document.querySelector('#detail-user-score');
	const discount_div = document.querySelector('#detail-discount');
	meta_div && meta_div.parentNode.removeChild(meta_div);
	user_div && user_div.parentNode.removeChild(user_div);
	discount_div && discount_div.parentNode.removeChild(discount_div);
}

let last_inject_url;
const locale = document.URL.split('/')[3];

const observer = new MutationObserver( mutations=> {
	inject_detail_page();
	inject_discount_info_detail_page();
	inject_game_list();
});

chrome.runtime.onMessage.addListener((request, sender, callback) =>{
	if (request.action === 'inject_metacritic'){
		const target = document.querySelector('.application-container');
		const config = { attributes: true, childList: true, characterData: true ,subtree: true};
		observer.observe(target, config);
		if(document.URL !== last_inject_url){
			clear_inject();
			last_inject_url = document.URL;
		}
	}
	else if(request.action ==='disable_inject'){
		observer.disconnect();
		clear_inject();
	}
})