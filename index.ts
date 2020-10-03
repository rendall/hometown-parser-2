import { Trie } from "./lib/trie.js"

interface City {
  country: string
  geonameid: number
  name: string
  subcountry: string
}

interface TrieMeta {
  country?: string
  geonameid?: number
  name: string
  subcountry?: string
  word: string
}

// const DATA_URL = 'core/world-cities/data/world-cities_json.json'
const DATA_URL = 'https://raw.githubusercontent.com/rendall/hometown-parser-2/master/core/world-cities/data/world-cities_json.json'

const fetchData = async () => {
  const response = await fetch(DATA_URL)
  const reader = response.body!.getReader()
  const contentLength = response.headers.get('Content-Length')!
  const progressBar: HTMLProgressElement = document.querySelector("#data-download")! as HTMLProgressElement

  progressBar.max = parseInt(contentLength)

  let receivedLength = 0
  let chunks = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) { break; }

    chunks.push(value)
    receivedLength += value!.length
    progressBar.value = receivedLength

  }

  progressBar.parentElement!.remove()

  const chunksAll = new Uint8Array(receivedLength); // (4.1)
  let position = 0
  for (let chunk of chunks) {
    chunksAll.set(chunk!, position); // (4.2)
    position += chunk!.length
  }

  const result = new TextDecoder("utf-8").decode(chunksAll)

  const commits = JSON.parse(result)

  return commits
}

const removeDoubleSpaces = (str: string): string =>
  str.indexOf("  ") >= 0 ? removeDoubleSpaces(str.replace("  ", " ")) : str

const cleanString = (str: string) =>
  removeDoubleSpaces( str.trim().replace(/[\.\(\)&'’\/]/g, " "))
    .replace(/[^\w ]/, "")
    .replace(/,/g, " ")

const expandAbbreviation = (word: string) => {
  switch (word) {
    case "usa": return "united states"
    default: return word
  }
}
const breakDown = (trie: Trie, str: string, words?: string[], endIndex: number = 1, result: any = []): any[] => {

  if (!words) {
    const val = cleanString(str.toLowerCase())
    console.log(str, val)
    const expanded = val.split(" ").map(word => expandAbbreviation(word))
    return breakDown(trie, str, expanded, 0)
  }

  if (words.length === 0) return result
  if (endIndex > words.length) return breakDown(trie, str, words.slice(1), 1, result)

  const potentialCity = words.slice(0, endIndex).join(" ")
  console.info(potentialCity)

  const find = trie.find(potentialCity)

  if (find !== null && find.meta && find.meta.length) return breakDown(trie, str, words, endIndex + 1, [...result, ...find.meta])
  else return breakDown(trie, str, words, endIndex + 1, result)
}

const displayInfo = (metas: TrieMeta[]) => {
  const locationList = document.querySelector("#location-list") as HTMLUListElement
  if (locationList) locationList.remove()

  const newList = document.createElement("ul") as HTMLUListElement
  newList.setAttribute("id", "location-list")

  const lis = metas.map(info => newList.appendChild(document.createElement("li")))
  lis.forEach((li, i) => li.textContent = `${metas[i].name}${metas[i].hasOwnProperty("subcountry") ? ', ' + metas[i].subcountry : ''}${metas[i].hasOwnProperty("country") ? ', ' + metas[i].country : ''} `)

  document.body.appendChild(newList)
}

const onCommentBoxChange = (trie: Trie, memo: { [key: string]: any }) => () => {
  const commentBox: HTMLTextAreaElement = document.querySelector("#comment-box") as HTMLTextAreaElement
  const val = commentBox.value.toLowerCase()

  const metas: TrieMeta[] = breakDown(trie, val)

  displayInfo(metas)
}
const createTrie = (locations: [string, object][]) => {
  const trie = new Trie()
  locations.forEach(loc => trie.add(loc[0], loc[1]))
  return trie
}


/** Returns US states, Canadian provinces + others as they come that have abbreviations */
const getAbbreviatedSubcountries = (data: City[]): [string, { name: string, country: string }][] =>
  SUB_COUNTRY_CODES
    .map(([abbr, name]) => [abbr.toLowerCase(), data.find(c => c.subcountry === name)])
    // @ts-ignore
    .map(([name, city]: [string, City]) => [name, { name: city.subcountry, country: city.country }])




const coalesceData = (data: City[]) => {

  const cities: [string, City][] = data.map(loc => [loc.name.toLowerCase(), loc])
  const subcountries: [string, { country: string }][] = data
    .reduce((acc: { subcountry: string, country: string }[], loc: City) => acc.findIndex(a => a.country === loc.country && a.subcountry === loc.subcountry) > -1 ? acc : [...acc, { subcountry: loc.subcountry, country: loc.country }], [])
    .filter(sc => sc.subcountry != null)
    .map(sc => [sc.subcountry.toLowerCase(), { name: sc.subcountry, country: sc.country }])

  const abbreviatedSubcountries: [string, object][] = getAbbreviatedSubcountries(data)

  const countries: [string, object][] = subcountries.reduce((acc: string[], o) => acc.includes(o[1].country) ? acc : [...acc, o[1].country], []).map(c => [c.toLowerCase(), { name: c }])

  return [...cities, ...subcountries, ...abbreviatedSubcountries, ...countries]

}
fetchData().then(coalesceData).then(createTrie).then((trie: Trie) => {
  const commentBox: HTMLTextAreaElement = document.querySelector("#comment-box") as HTMLTextAreaElement
  let memo: { [key: string]: any } = {}
  commentBox.addEventListener("change", onCommentBoxChange(trie, memo))

  const str = commentBox.value
  if (str && str.length) onCommentBoxChange(trie, memo)()

})

/* These are commonly-used sub-country codes */
const SUB_COUNTRY_CODES: [string, string][] = [
  [
    "AL",
    "Alabama"
  ],
  [
    "AK",
    "Alaska"
  ],
  [
    "AZ",
    "Arizona"
  ],
  [
    "AR",
    "Arkansas"
  ],
  [
    "CA",
    "California"
  ],
  [
    "CO",
    "Colorado"
  ],
  [
    "CT",
    "Connecticut"
  ],
  [
    "DE",
    "Delaware"
  ],
  [
    "DC",
    "Washington, D.C."
  ],
  [
    "FL",
    "Florida"
  ],
  [
    "GA",
    "Georgia"
  ],
  [
    "HI",
    "Hawaii"
  ],
  [
    "ID",
    "Idaho"
  ],
  [
    "IL",
    "Illinois"
  ],
  [
    "IN",
    "Indiana"
  ],
  [
    "IA",
    "Iowa"
  ],
  [
    "KS",
    "Kansas"
  ],
  [
    "KY",
    "Kentucky"
  ],
  [
    "LA",
    "Louisiana"
  ],
  [
    "ME",
    "Maine"
  ],
  [
    "MD",
    "Maryland"
  ],
  [
    "MA",
    "Massachusetts"
  ],
  [
    "MI",
    "Michigan"
  ],
  [
    "MN",
    "Minnesota"
  ],
  [
    "MS",
    "Mississippi"
  ],
  [
    "MO",
    "Missouri"
  ],
  [
    "MT",
    "Montana"
  ],
  [
    "NE",
    "Nebraska"
  ],
  [
    "NV",
    "Nevada"
  ],
  [
    "NH",
    "New Hampshire"
  ],
  [
    "NJ",
    "New Jersey"
  ],
  [
    "NM",
    "New Mexico"
  ],
  [
    "NY",
    "New York"
  ],
  [
    "NC",
    "North Carolina"
  ],
  [
    "ND",
    "North Dakota"
  ],
  [
    "OH",
    "Ohio"
  ],
  [
    "OK",
    "Oklahoma"
  ],
  [
    "OR",
    "Oregon"
  ],
  [
    "PA",
    "Pennsylvania"
  ],
  [
    "RI",
    "Rhode Island"
  ],
  [
    "SC",
    "South Carolina"
  ],
  [
    "SD",
    "South Dakota"
  ],
  [
    "TN",
    "Tennessee"
  ],
  [
    "TX",
    "Texas"
  ],
  [
    "UT",
    "Utah"
  ],
  [
    "VT",
    "Vermont"
  ],
  [
    "VA",
    "Virginia"
  ],
  [
    "WA",
    "Washington"
  ],
  [
    "WV",
    "West Virginia"
  ],
  [
    "WI",
    "Wisconsin"
  ],
  [
    "WY",
    "Wyoming"
  ],
  [
    "AB",
    "Alberta"
  ],
  [
    "BC",
    "British Columbia"
  ],
  [
    "MB",
    "Manitoba"
  ],
  [
    "NB",
    "New Brunswick"
  ],
  [
    "NL",
    "Newfoundland and Labrador"
  ],
  [
    "NF",
    "Newfoundland and Labrador"
  ],
  [
    "LB",
    "Newfoundland and Labrador"
  ],
  // [ "NU", "Nunavut" ],
  [
    "ON",
    "Ontario"
  ],
  [
    "PE",
    "Prince Edward Island"
  ],
  [
    "QC",
    "Quebec"
  ],
  [
    "SK",
    "Saskatchewan"
  ],
  [
    "YT",
    "Yukon"
  ]
]