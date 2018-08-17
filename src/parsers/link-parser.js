
export default ($) => {
  let linksData = {}
  $('link').each((index, elem) => {
    const name = elem.attribs['rel']
    const value = elem.attribs['href']
    if (!linksData[name]) {
      linksData[name] = []
    }
    linksData[name].push(value)
  })
  return linksData
}
