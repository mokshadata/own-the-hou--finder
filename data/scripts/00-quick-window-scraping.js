function matchTransform(item, index) {
	if (index === 0) {
    return ['statusDetails', item]
  }

	if (item.includes(" beds")) {
		let [val, ...label] = item.split(' ')

		return ['beds', val * 1]
  }

	if (item.includes(" full bath")) {
		let [val, ...label] = item.split(' ')

		return ['fullBaths', val * 1]
  }

	if (item.includes(" half bath")) {
		let [val, ...label] = item.split(' ')

		return ['halfBaths', val * 1]
  }

	if (item.includes("/Sqft.")) {
		let [val, ...label] = item.split('/')

		return ['pricePer', val.replaceAll(/\$|\,/g, '') * 1]
  }

	if (item.includes(" Sqft.")) {
		let [val, ...label] = item.split(' ')

		return ['interiorSize', val.replaceAll(/\$|\,/g, '') * 1]
  }

	if (['-Family', 'Condo', 'Townhouse', '-Rise', 'flex'].find((style) => (item.includes(style)))) {

		return ['buildingType', item]
  }
}

function getItems() {
  return [...document.querySelectorAll('.equal-cards')].map((cardEl) => ({
    statusTitle: cardEl.querySelector('.cardv2--portrait__body_status .label').dataset.bsOriginalTitle || cardEl.querySelector('.cardv2--portrait__body_status .label').dataset.originalTitle,
    status: cardEl.querySelector('.cardv2--portrait__body_status .label').innerText,
    price: cardEl.querySelector('.cardv2--portrait__body_price').innerText.replaceAll(/\$|\,/g, '') * 1,
  
    imageURL: cardEl.querySelector('.cardv2--portrait__img').style.backgroundImage.split(/(?:url\(")|(?:"\)\,\s)|(?:\))/g).find((imageURL) => (imageURL.includes('.jpeg'))),
  
    harURL: cardEl.querySelector('.call_detail').href,
    addressLine1: cardEl.querySelector('.cardv2--portrait__body_flexrow .cardv2--portrait__body_address').childNodes[0].data.trim(),
    addressLine2: cardEl.querySelector('.cardv2--portrait__body_flexrow .cardv2--portrait__body_address').childNodes[2].data.trim(),
  
    ...Object.fromEntries(
      cardEl.querySelector('.cardv2--portrait__body_flexrow .cardv2--portrait__body_address').childNodes[2].data.trim().split(/(?:\,\s)|\s/g).map((val, idx) => (
        [
          ['city', 'state', 'zip'][idx], val,
        ]
      ))
    ),

    statusDetails: '',
    beds: 0,
    fullBaths: 0,
    halfBaths: 0,
    pricePer: 0,
    interiorSize: 0,
    buildingType: '',
  
    ...Object.fromEntries(
      [...cardEl.querySelectorAll('.cardv2--portrait__body_features li')]
        .map((listItemEl) => listItemEl.innerText)
        .map((item) => (item.split(/(?:\,\s)|\(|\)/g)))
        .reduce((res, curr) => ([...res, ...curr]), [])
        .map((item) => (item.trim()))
        .filter((item) => (item))
        .map(matchTransform)
        .filter((item) => (item && item.length))
    ),
  }))
}