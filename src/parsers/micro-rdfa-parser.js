import htmlparser from 'htmlparser2'

function getPropValue (tagName, attribs, TYPE, PROP) {
  if (attribs[TYPE]) {
    return null
  } else if ((tagName === 'a' || tagName === 'link') && attribs.href) {
    return attribs.href.trim()
  } else if (attribs.content) {
    return attribs.content.trim()
  } else if (attribs[PROP] === 'image' && attribs.src) {
    return attribs.src.trim()
  } else if (tagName === 'img' && attribs.src) {
    return attribs.src.trim()
  } else {
    return null
  }
}

const getAttrNames = (specName) => {
  let TYPE, PROP
  if (specName.toLowerCase().startsWith('micro')) {
    TYPE = 'itemtype'
    PROP = 'itemprop'
  } else if (specName.toLowerCase().startsWith('rdfa')) {
    TYPE = 'typeof'
    PROP = 'property'
  } else {
    throw new Error('Unsupported spec: use either micro or rdfa')
  }
  return { TYPE, PROP }
}

const importantTags = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'p',
  'a',
  'ul',
  'li',
  'b',
  'table',
  'caption',
  'tr',
  'th',
  'td',
  'div',
  'img'
]

const getType = (typeString) => {
  const match = (/(.*\/)(\w+)/g).exec(typeString)
  return {
    context: match && match[1] ? match[1] : undefined,
    type: match && match[2] ? match[2] : typeString
  }
}

const createHandler = function (specName) {
  let scopes = []
  let tags = []
  let topLevelScope = {}
  let textForProp = null
  let currentTagName = null
  const { TYPE, PROP } = getAttrNames(specName)

  const onopentag = function (tagName, attribs) {
    currentTagName = tagName
    let currentScope = scopes[scopes.length - 1]
    let tag = false

    if (attribs[TYPE]) {
      if (attribs[PROP] && currentScope) {
        let newScope = {}
        currentScope[attribs[PROP]] = currentScope[attribs[PROP]] || []
        currentScope[attribs[PROP]].push(newScope)
        currentScope = newScope
      } else {
        currentScope = {}
        const { type } = getType(attribs[TYPE])
        topLevelScope[type] = topLevelScope[type] || []
        topLevelScope[type].push(currentScope)
      }
    }

    if (currentScope) {
      if (attribs[TYPE]) {
        const { context, type } = getType(attribs[TYPE])
        const vocab = attribs.vocab
        currentScope['@context'] = context || vocab
        currentScope['@type'] = type
        tag = TYPE
        scopes.push(currentScope)
      } else if (attribs[PROP]) {
        if (currentScope[attribs[PROP]] && !Array.isArray(currentScope[attribs[PROP]])) {
          // PROP occurs for the second time, storing it as an array
          currentScope[attribs[PROP]] = [currentScope[attribs[PROP]]]
        }

        var value = getPropValue(tagName, attribs, TYPE, PROP)
        if (!value) {
          tag = PROP
          if (Array.isArray(currentScope[attribs[PROP]])) {
            currentScope[attribs[PROP]].push('')
          } else {
            currentScope[attribs[PROP]] = ''
          }
          textForProp = attribs[PROP]
        } else {
          if (Array.isArray(currentScope[attribs[PROP]])) {
            currentScope[attribs[PROP]].push(value)
          } else {
            currentScope[attribs[PROP]] = value
          }
        }
      }
    }

    if (tag !== PROP && textForProp && (['headline', 'name'].indexOf(textForProp) === -1) && (importantTags.indexOf(tagName) !== -1)) {
      let openTagString
      if (tagName === 'a' && attribs.href) {
        openTagString = `<a href="${attribs.href}">`
      } else if (tagName === 'img') {
        openTagString = `<img class="schema-image-illustration" src="${attribs.src}" />`
      } else {
        openTagString = `<${tagName}>`
      }
      if (Array.isArray(scopes[scopes.length - 1][textForProp])) {
        scopes[scopes.length - 1][textForProp][scopes[scopes.length - 1][textForProp].length - 1] += openTagString
      } else {
        scopes[scopes.length - 1][textForProp] += openTagString
      }
    }

    tags.push(tag)
  }
  const ontext = function (text) {
    if (['script', 'style'].indexOf(currentTagName) !== -1) {
      text = ''
    }
    if (textForProp) {
      if (Array.isArray(scopes[scopes.length - 1][textForProp])) {
        scopes[scopes.length - 1][textForProp][scopes[scopes.length - 1][textForProp].length - 1] += text
      } else {
        scopes[scopes.length - 1][textForProp] += text
      }
    }
  }
  const onclosetag = function (tagname) {
    const tag = tags.pop()
    if (tag === TYPE) {
      let scope = scopes.pop()
      if (!scope['@context']) {
        delete scope['@context']
      }
      Object.keys(scope).forEach((key) => {
        if (Array.isArray(scope[key]) && scope[key].length === 1) {
          scope[key] = scope[key][0]
        }
      })
    } else if (tag === PROP) {
      textForProp = false
    }

    if (textForProp && (['headline', 'name'].indexOf(textForProp) === -1) && (importantTags.indexOf(tagname) !== -1)) {
      if (Array.isArray(scopes[scopes.length - 1][textForProp])) {
        scopes[scopes.length - 1][textForProp][scopes[scopes.length - 1][textForProp].length - 1] += `</${tagname}>`
      } else {
        scopes[scopes.length - 1][textForProp] += `</${tagname}>`
      }
    }
  }

  return {
    onopentag,
    ontext,
    onclosetag,
    topLevelScope
  }
}

export default (html, specName) => {
  const handler = createHandler(specName)
  new htmlparser.Parser(handler).end(html)
  return handler.topLevelScope
}
