import { getCheerioObject } from './utils'
import $ from 'cheerio'

export default function (html, config = {}) {
  const $html = getCheerioObject(html)
  let jsonldData = {}

  $html('script[type="application/ld+json"]').each((index, item) => {
    try {
      let json = $(item).text().trim().replace(/^<!\[CDATA\[|\]\]>$/gi, '')
      let parsedJSON = JSON.parse(json)
      if (!Array.isArray(parsedJSON)) {
        parsedJSON = [parsedJSON]
      }
      parsedJSON.forEach(obj => {
        const type = obj['@type']
        jsonldData[type] = jsonldData[type] || []
        jsonldData[type].push(obj)
      })
    } catch (e) {
      console.log(`Error in jsonld parse - ${e}`)
    }
  })

  return jsonldData
}
