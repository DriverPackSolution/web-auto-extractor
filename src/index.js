import $ from 'cheerio'
import LinkParser from './parsers/link-parser'
import MetaTagsParser from './parsers/metatag-parser'
import MicroRdfaParser from './parsers/micro-rdfa-parser'
import JsonldParser from './parsers/jsonld-parser'
if (!global._babelPolyfill) {
  require('babel-polyfill')
}

export default function () {
  let $html = null

  const loadCheerioObject = function (_$html) {
    $html = _$html
  }

  const parse = function (html, options) {
    if (!($html && $html.prototype && $html.prototype.cheerio)) {
      $html = $.load(html, options)
    }

    return {
      title: $html('title').text(),
      links: LinkParser($html),
      metatags: MetaTagsParser($html),
      microdata: MicroRdfaParser(html, 'micro'),
      rdfa: MicroRdfaParser(html, 'rdfa'),
      jsonld: JsonldParser($html)
    }
  }

  return {
    parse,
    loadCheerioObject
  }
}
