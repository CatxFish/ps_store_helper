function adjust_price(low_price,low_plus_price){
    if(low_plus_price ==='--'){
        return low_price;
    }
    else{
        const num_plus_price = Number(low_plus_price.replace(/[^0-9\.]/g,''));
        const num_low_price = Number(low_price.replace(/[^0-9\.]/g,''));
        if(num_plus_price && num_low_price && num_plus_price>num_low_price){
            return low_price;
        }
    }
    return low_plus_price;
}

async function search_discount_link(country,host,key,psn_id,page_count){
    
    const page = page_count.toString()
    const url = `https://psdeals.net/${country}-store/all-games/${page}?search=${key}&sort=title-desc`;
    try{
        const response = await fetch(url);  
        if(!response.ok){
            throw 'connect error';       
        }
        const doc = document.implementation.createHTMLDocument('discount_search');
        doc.documentElement.innerHTML = await response.text();
        const results = doc.querySelectorAll('.game-collection-item-link');
        let discount_link = {state:'not found'};
        for(link of results){
            const image_obj = link.querySelector('.game-collection-item-image');
            const image_id = image_obj ? image_obj.src.split('/')[11]:'';
            if(image_id && image_id ===psn_id){
                const re = new RegExp(`https://${host}`,'g');
                const pathname = link.href.replace(re,'');  // can't use link.pathname in Firefox ...
                discount_link.state = 'success';
                discount_link.url = `https://psdeals.net${pathname}`;
                break;
            }
        }

        const next_page = doc.querySelector('li.next>a');
        if(discount_link.state !== 'success' && next_page && page_count < 6 ){
            return search_discount_link(country,host,key,psn_id,page_count+1);
        }

        return discount_link;          
    }
    catch(err) {
        state=err;
		return {state};
    } 
}

async function fetch_discount_page(url){
    const response = await fetch(url); 
    if(response.ok){
        const doc = document.implementation.createHTMLDocument('discount');
        doc.documentElement.innerHTML = await response.text();
        const low_price_div = doc.querySelector('span.game-stats-col-number-green');
        const low_plus_div = doc.querySelector('span.game-stats-col-number-yellow');
        const low_price = low_price_div ? low_price_div.innerHTML : '';
        let low_plus_price = low_plus_div ? low_plus_div.innerHTML :'';
        if(low_price_div || low_plus_div){
            low_plus_price = adjust_price(low_price,low_plus_price);
            return {state:'success',url,low_price,low_plus_price};
        }
        else{
           return {state:'get discount error'};
        }              
    }
    else{
        return {state:'connect error'};
    }
}

async function get_lowest_price(host,locale,psn_id){

    let discount_info = {state:'error'};
    let psn_info = await get_game_info_by_psn_id(host,locale,psn_id);

    if(psn_info.state === 'success' || psn_info.state === 'not english'){
        if(psn_info.discount && !is_expired(psn_info.discount.expire_date)){
            discount_info ={state:'success',...psn_info.discount};
        }
        else{
            let url;
            if(!psn_info.discount || !psn_info.discount.url){
                const locale_list = locale.split('-');
                const country = locale_list[locale_list.length-1];
                const search_key = psn_info.names[0].replace(/\'/g,'').replace(/ +/g,'+');
                const search_result = await search_discount_link(country,host,search_key,psn_id,1);
                url = search_result.state === 'success' ? search_result.url:'';                      
            }
            else{
                url = psn_info.discount.url;
            }

            if(url){
                discount_info = await fetch_discount_page(url);
            }

            if(discount_info.state === 'success'){
                const expire_date = get_expire_date(1);
                const url = discount_info.url;
                const low_price = discount_info.low_price;
                const low_plus_price = discount_info.low_plus_price;
                set_game_info_to_storage(psn_id,{discount:{url,low_price,low_plus_price,expire_date}});
            }
        }
    }

    return discount_info;
}