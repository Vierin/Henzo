// Vietnamese location mappings for geocoding and search
export const VIETNAM_LOCATION_MAPPINGS: { [key: string]: string[] } = {
	// Major cities
	hanoi: ['hà nội', 'ha noi', 'hanoi'],
	'hồ chí minh': ['ho chi minh', 'hcm', 'saigon', 'sài gòn'],
	danang: ['đà nẵng', 'da nang'],
	cantho: ['cần thơ', 'can tho'],
	haiphong: ['hải phòng', 'hai phong'],

	// Provinces and regions
	binhduong: ['bình dương', 'binh duong'],
	dongnai: ['đồng nai', 'dong nai'],
	longan: ['long an', 'longan'],
	thaibinh: ['thái bình', 'thai binh'],
	quangninh: ['quảng ninh', 'quang ninh'],
	khanhhoa: ['khánh hòa', 'khanh hoa', 'nha trang'],
	lamdong: ['lâm đồng', 'lam dong', 'dalat', 'đà lạt'],
	binhthuan: ['bình thuận', 'binh thuan', 'phan thiet', 'phan thiết'],
	quangnam: ['quảng nam', 'quang nam', 'hoi an', 'hội an'],
	thuathienhue: ['thừa thiên huế', 'thua thien hue', 'hue', 'huế'],
	angiang: ['an giang', 'angiang'],
	bacgiang: ['bắc giang', 'bac giang'],
	backan: ['bắc kạn', 'bac kan'],
	baclieu: ['bạc liêu', 'bac lieu'],
	bacninh: ['bắc ninh', 'bac ninh'],
	bentre: ['bến tre', 'ben tre'],
	camau: ['cà mau', 'ca mau'],
	caobang: ['cao bằng', 'cao bang'],
	daklak: ['đắk lắk', 'dak lak'],
	daknong: ['đắk nông', 'dak nong'],
	dienbien: ['điện biên', 'dien bien'],
	dongthap: ['đồng tháp', 'dong thap'],
	gialai: ['gia lai'],
	hagiang: ['hà giang', 'ha giang'],
	hanam: ['hà nam', 'ha nam'],
	hatinh: ['hà tĩnh', 'ha tinh'],
	haiduong: ['hải dương', 'hai duong'],
	haugiang: ['hậu giang', 'hau giang'],
	hoabinh: ['hòa bình', 'hoa binh'],
	hungyen: ['hưng yên', 'hung yen'],
	kiengiang: ['kiên giang', 'kien giang'],
	kontum: ['kon tum'],
	laichau: ['lai châu', 'lai chau'],
	langson: ['lạng sơn', 'lang son'],
	laocai: ['lào cai', 'lao cai'],
	namdinh: ['nam định', 'nam dinh'],
	nghean: ['nghệ an', 'nghe an'],
	ninhbinh: ['ninh bình', 'ninh binh'],
	ninhthuan: ['ninh thuận', 'ninh thuan'],
	phutho: ['phú thọ', 'phu tho'],
	phuyen: ['phú yên', 'phu yen'],
	quangbinh: ['quảng bình', 'quang binh'],
	quangngai: ['quảng ngãi', 'quang ngai'],
	quangtri: ['quảng trị', 'quang tri'],
	soctrang: ['sóc trăng', 'soc trang'],
	sonla: ['sơn la', 'son la'],
	tayninh: ['tây ninh', 'tay ninh'],
	thainguyen: ['thái nguyên', 'thai nguyen'],
	thanhhoa: ['thanh hóa', 'thanh hoa'],
	tiengiang: ['tiền giang', 'tien giang'],
	travinh: ['trà vinh', 'tra vinh'],
	tuyenquang: ['tuyên quang', 'tuyen quang'],
	vinhlong: ['vinh long'],
	vinhphuc: ['vinh phúc', 'vinh phuc'],
	yenbai: ['yên bái', 'yen bai'],
};

// Helper function to normalize Vietnamese text
export const normalizeVietnameseText = (text: string): string => {
	return text
		.replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
		.replace(/[èéẹẻẽêềếệểễ]/g, 'e')
		.replace(/[ìíịỉĩ]/g, 'i')
		.replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
		.replace(/[ùúụủũưừứựửữ]/g, 'u')
		.replace(/[ỳýỵỷỹ]/g, 'y')
		.replace(/[đ]/g, 'd')
		.toLowerCase();
};

// Helper function to clean address from country indicators
export const cleanAddressFromCountry = (address: string): string => {
	return address
		.replace(/,\s*Vietnam$/i, '')
		.replace(/,\s*Việt Nam$/i, '')
		.replace(/,\s*VN$/i, '')
		.replace(/,\s*Viet Nam$/i, '')
		.replace(/\s*Vietnam$/i, '')
		.replace(/\s*Việt Nam$/i, '')
		.replace(/\s*VN$/i, '')
		.replace(/\s*Viet Nam$/i, '')
		.trim();
};

// Helper function to check location matches
export const checkLocationMatch = (
	salonAddress: string,
	searchLocation: string
): boolean => {
	// Normalize search location
	const normalizedSearch = normalizeVietnameseText(searchLocation);

	// Check if any mapping matches
	for (const [key, variations] of Object.entries(VIETNAM_LOCATION_MAPPINGS)) {
		if (variations.some((variation) => normalizedSearch.includes(variation))) {
			// Check if salon address contains any of these variations
			return variations.some(
				(variation) =>
					salonAddress.includes(variation) || salonAddress.includes(key)
			);
		}
	}

	// Fallback: check for district/ward matches
	const searchParts = searchLocation
		.split(' ')
		.filter((part) => part.length > 2);
	return searchParts.some((part) => salonAddress.includes(part));
};
