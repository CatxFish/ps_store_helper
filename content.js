function insertAfter(newElement, targetElement) {
    var parent = targetElement.parentNode;
    if (parent.lastChild == targetElement) {
        parent.appendChild(targetElement);
    } else {
        parent.insertBefore(newElement, targetElement.nextSibling);
    }
}


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
	const price_link = create_link(url);
	const span_low_price = document.createElement('span');
	span_low_price.className = "detail_discount_text"
	title.textContent='Historical lowest : ';
	span_low_price.textContent = `${low_price} / ${low_plus_price}(PS+)`;
	price_link.appendChild(span_low_price);
	title.appendChild(price_link);
	node.appendChild(title);
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
	let nodelist = [...document.querySelectorAll('.psw-product-tile')];
	for(const node of nodelist)
	{
		let k = Math.ceil(nodelist.length/3)
		for(i=0; i<k; i++)
		{
			start = i*3
			if(i == k-1)
				end = nodelist.length
			else
				end = (i+1)*3
			
			updatelist = nodelist.slice(start,end)

			try {
				await Promise.any(updatelist.map(async (node)=>{
					if(document.contains(node) && !node.querySelector('.metascore_container')){
						const image_box = node.querySelector('.psw-game-art')
						const insert_div = document.createElement('div');
						let psn_id = "0000"
						if (node.parentNode && node.parentNode.tagName == 'A') {
							psn_id = node.parentNode.getAttribute("href").match('([^/]+)$')[1].replace(/\?.*$/,'');
						}
						else {
							return
						}

						insert_div.className='metascore_container';
						image_box.appendChild(insert_div)
						let meta= new MetaInfo(window.location.host,locale,psn_id);
						
						const discount_badge = node.querySelector('.psw-discount-badge');
						if(document.contains(node) && discount_badge && !node.querySelector('.lowest_badge')){
							let discount = new Discount(window.location.host,locale,psn_id);
							if(await discount.get_lowest_price()){
								lowest_state = await discount.is_lowest_price();
								if(lowest_state>0){
									insert_loweset_badge(image_box,lowest_state);
								}
							}
						}

						if(document.contains(node) && await meta.get_metacritic_score()){
							insert_meta_score(insert_div,meta.meta_score);
							const insert_span = document.createElement('span');
							insert_span.textContent= '|';
							insert_div.appendChild(insert_span);
							insert_user_score(insert_div,meta.user_score);	
						}


					}			
				}))
			}
			catch (error) {
				// do nothing , keep going
			}
		}
	}
}

async function inject_detail_page(psn_id){
	const sku_info = document.querySelector('[data-qa="mfe-game-title"]');
	const meta_div = document.querySelector('#detail-meta-score');
	const user_div = document.querySelector('#detail-user-score');

	if(sku_info && !meta_div && !user_div){
		const main_div = document.createElement('div');
		const insert_div = document.createElement('div');
		const insert_user_div = document.createElement('div');	
		insert_div.id = 'detail-meta-score';
		insert_user_div.id = 'detail-user-score';
		sku_info.parentNode.append(main_div);
		main_div.append(insert_div);
		main_div.append(insert_user_div);
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

async function inject_discount_info_detail_page(psn_id){
	const div_infos = document.querySelectorAll('[data-qa="mfeCtaMain#cta"]')

	for (let div_info of div_infos){
		const discount_div = div_info.parentNode.querySelector('.discount_container');
		if(!discount_div){			
			const insert_low_price = document.createElement('div');
			div_info.parentNode.insertBefore(insert_low_price,div_info)
			insert_low_price.className = 'discount_container';
			let discount = new Discount(window.location.host,locale,psn_id);
			if(await discount.get_lowest_price()){
				insert_detail_page_discount(insert_low_price,discount.low_price,discount.low_plus_price,discount.url);
			}	
		}
	}

	
	const related_sells = document.querySelectorAll('[data-qa$="#ctaWithPrice#cta"]')
	
	for (let sell of related_sells) {
		let related_id = get_psn_id(sell)
		let related_div = sell.parentNode.querySelector('.discount_container');
		
		if(!related_div){			
			let discount = new Discount(window.location.host,locale,related_id);		
			let related_low_price = document.createElement('div');
			related_low_price.className = 'discount_container';
			sell.parentNode.insertBefore(related_low_price,sell)			
			if(await discount.get_lowest_price()){
				insert_detail_page_discount(related_low_price,discount.low_price,discount.low_plus_price,discount.url);
			}	
			
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

function get_psn_id(root) {
	const button = root.querySelector('button')
	if (button){
		const psn_data = button.getAttribute("data-telemetry-meta")
		if (psn_data){
			const psn_json_data = JSON.parse(psn_data)
			const productDetail = psn_json_data.productDetail
			if(productDetail && Array.isArray(productDetail) && productDetail.length >0 && productDetail[0].productId) {
				const psn_id = psn_json_data.productDetail[0].productId
				return psn_id
			}
		}
	}
	return null
}

let last_inject_url;
let last_inject_game_list_time = new Date().getTime()
const locale = document.URL.split('/')[3];

function checkmutations(mutations) {

	added_by_extension = false

	for (mutation of mutations) {
		for (node of mutation.addedNodes) {
			added_by_extension = node.classList.contains("metascore_container") || 
								 node.classList.contains("lowest_badge") ||
								 node.classList.contains("metascore_w")
		}
	}

	return added_by_extension
}


const observer = new MutationObserver( mutations=> {
	const detail_button = document.querySelector('[data-qa="mfeCtaMain#cta"]');
	if(detail_button) {
		psn_id  =  get_psn_id(detail_button)
		if (psn_id) {
			inject_detail_page(psn_id);
			inject_discount_info_detail_page(psn_id);
		}
	}
	let now_time = new Date().getTime()
	if (now_time > last_inject_game_list_time && !checkmutations(mutations)) {
		setTimeout(()=> { inject_game_list() }, 1000);
		last_inject_game_list_time = now_time + 1000;
	}	
});

chrome.runtime.onMessage.addListener((request, sender, callback) =>{
	if (request.action === 'inject_metacritic'){
		const target = document.querySelector('body');
		const config = { attributes: false, childList: true, characterData: false ,subtree: true};		
		if(document.URL !== last_inject_url){
			clear_inject();
			last_inject_url = document.URL;
		}
		observer.observe(target, config);
	}
	else if(request.action ==='disable_inject'){
		observer.disconnect();
		clear_inject();
	}
})