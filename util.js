class Utility{

    static get_data(key){
        return new Promise(resolve =>{
			chrome.storage.local.get(key , item =>{
				if(item && item[key]){
					resolve(item[key]);
				}
				else{				
					resolve();		
				}
			})
		})
    }

    static set_data(key,data){
		return new Promise(resolve=>{
			chrome.storage.local.get(key , item =>{
				if(item && item[key]){
					const merge_data = Object.assign(item[key],data);
					chrome.storage.local.set({[key]:merge_data},()=>{resolve()});
				}
				else{
					chrome.storage.local.set({[key]:data},()=>{resolve()});
				}
			})
		})
	}

	static is_expired(date_string){
		const today = new Date();
		const expire_day = new Date(date_string);
		return (today > expire_day);
	}

	static get_expire_date(duration){
		const expire_time= new Date(new Date().getTime() + duration * 24 * 60 * 60 * 1000);
		const mm = expire_time.getMonth()+1;
		const dd = expire_time.getDate();
		const yy = expire_time.getFullYear();;
		const expire_day = `${mm}/${dd}/${yy}`;
		return expire_day;
	}
}