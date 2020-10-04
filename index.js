var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Trie } from "./lib/trie.js";
const DATA_URL = 'core/world-cities/data/world-cities_json.json';
const fetchData = () => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield fetch(DATA_URL);
    const reader = response.body.getReader();
    const contentLength = response.headers.get('Content-Length');
    const progressBar = document.querySelector("#data-download");
    progressBar.max = parseInt(contentLength);
    let receivedLength = 0;
    let chunks = [];
    while (true) {
        const { done, value } = yield reader.read();
        if (done) {
            break;
        }
        chunks.push(value);
        receivedLength += value.length;
        progressBar.value = receivedLength;
    }
    progressBar.parentElement.remove();
    const chunksAll = new Uint8Array(receivedLength); // (4.1)
    let position = 0;
    for (let chunk of chunks) {
        chunksAll.set(chunk, position); // (4.2)
        position += chunk.length;
    }
    const result = new TextDecoder("utf-8").decode(chunksAll);
    const commits = JSON.parse(result);
    return commits;
});
const removeDoubleSpaces = (str) => str.indexOf("  ") >= 0 ? removeDoubleSpaces(str.replace("  ", " ")) : str;
const cleanString = (str) => removeDoubleSpaces(str.trim().replace(/[\(\)&'’\/,\?-]|\.\./g, " "))
    .replace(/[^\w '\(\),\-\/0123456789ÁÂÄÅÇÉÍÎÐÑÓÖØÚÜßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýÿĀāăąĆćČčďĐđēėęěğĦĩĪīĭİıĽľŁłńňŌōŎŏőœřŚśŞşŠšŢţťũŪūŬŭůųźŻżŽžƏơưǝșțəʼ̧̱̄̇БЖЗКЛНПРСТавгдежиклмнопрстуцчшјاةعلمنḎḏḐḑḥḨḩḯṬṭẔẕẖạảầẩậắằẵếềệỉịọốồộớờủừỳỹ\–‘’]/g, "");
const expandAbbreviation = (word) => {
    switch (word) {
        case "usa": return "united states";
        default: return word;
    }
};
const parseString = (trie, str, words, startIndex = 0, endIndex = 1, result = []) => {
    if (!words) {
        const val = cleanString(str.toLowerCase());
        const expanded = val.split(" ").map(word => expandAbbreviation(word));
        console.clear();
        console.info(`Input string "${str}" is normalized to "${val}"`);
        return parseString(trie, str, expanded, startIndex, endIndex);
    }
    if (startIndex === words.length)
        return result;
    if (endIndex > words.length)
        return parseString(trie, str, words, startIndex + 1, startIndex + 2, result);
    const potentialCity = words.slice(startIndex, endIndex).join(" ");
    // console.info("considering sequence:", potentialCity, startIndex, endIndex)
    const find = trie.find(potentialCity);
    const isLocation = find !== null && find.meta && find.meta.length;
    // if (isLocation) console.log(`${potentialCity}: `, find.meta)
    if (isLocation) {
        const getIndices = (start, end, ix = []) => start === end ? ix : getIndices(start + 1, end, [...ix, start]);
        return parseString(trie, str, words, startIndex, endIndex + 1, [...result, { key: potentialCity, indices: getIndices(startIndex, endIndex), value: find.meta }]);
    }
    else
        return parseString(trie, str, words, startIndex, endIndex + 1, result);
};
/** This rule will discard a token that is discovered to be
 * part of a larger token,
 * e.g. the "York" part of "New York" and
 * the "New York" part of "New York City" */
const takeLargerRule = (tokens) => {
    // ordered from largest to smallest
    const ordered = tokens.sort((a, b) => b.indices.length - a.indices.length);
    // console.log({ ordered })
    // discard those which are entirely subsets of another
    const largerOnly = ordered.reduce((acc, t) => acc.some(a => t.indices.every(i => a.indices.includes(i))) ? acc : [...acc, t], []);
    return largerOnly;
};
const isRegion = (t) => t.hasOwnProperty("country") && !t.hasOwnProperty("subcountry");
const hasRegion = (loc) => loc.value.some(isRegion);
const greatestIndex = (ix) => ix[ix.length - 1];
const lowestIndex = (ix) => ix[0];
/** There is a Turkish town "Of"
 * "in" will expand to "Indiana",
 * "West" is probably never "West, Camaroon"
 * "wa" is probably never "Wa, Ghana" but always "Washington"
 * Discard such tokens if there are no other relevant tokens
 */
const removeConfusingSmallWordsRule = (tokens) => {
    const smallConfusingWords = ["wa", "in", "of", "west"];
    const isSmallConfusing = (t) => {
        if (!smallConfusingWords.includes(t.key))
            return false;
        const allRegions = tokens.filter(tok => tok !== t).reduce((acc, loc) => [...acc, ...loc.value], []).filter(isRegion).map(v => v.subcountry);
        switch (t.key) {
            case "in":
                if (allRegions.includes("Indiana"))
                    return false;
                else
                    return true;
            default:
                return false;
        }
    };
    return tokens.filter(t => !isSmallConfusing(t));
};
/** If there is ambiguity, but an adjacent token has
 * the region (subcountry) of one of the locations
 * discard all the others */
const adjacentRegionRule = (tokens) => {
    const getSubsequent = (a) => tokens.find(t => greatestIndex(a.indices) + 1 === lowestIndex(t.indices));
    const resolveAmbiguity = (t) => {
        const adjacentToken = getSubsequent(t);
        const regions = adjacentToken && adjacentToken.value.filter(isRegion);
        const isRegionOf = (loc, regionsNames) => regionsNames.some(name => loc.value.some(v => v.subcountry === name));
        // The subsequent token does not exist or is not a region, so return it unchanged
        if (!regions || regions.length === 0)
            return t;
        const regionNames = regions.map(r => r.name);
        const value = isRegionOf(t, regionNames) ? t.value.filter(v => regionNames.includes(v.subcountry)) : t.value;
        return Object.assign(Object.assign({}, t), { value });
    };
    return tokens.map(t => t.value.length > 1 ? resolveAmbiguity(t) : t);
};
/** If a region token is adjacent to a city token and the
 * city token has one value with that region, remove the
 * redundant region token
 * e.g. San Francisco, California
 * should not return both *San Francisco, California* and *California*
 */
const removeUsedRegionsRule = (tokens) => {
    const getPreviousToken = (a) => tokens.find(t => greatestIndex(t.indices) + 1 === lowestIndex(a.indices));
    /** Answers true iff t has a region token
     * and the previous token is a city token
     * with one value, and that value's region
     * is the same as that of t */
    const isUsedRegion = (t) => {
        if (!hasRegion(t))
            return false;
        const prev = getPreviousToken(t);
        if (!prev)
            return false;
        if (prev.value.length > 1)
            return false;
        const regionNames = t.value.filter(isRegion).map(t => t.name);
        const isRegionOf = regionNames.some(rName => prev.value[0].subcountry === rName);
        return isRegionOf;
    };
    const filtered = tokens.filter(t => !isUsedRegion(t));
    return filtered;
};
// These syntax rules will be applied in order
// each step reducing or altering the LocTokens
const syntaxRules = [
    removeConfusingSmallWordsRule,
    takeLargerRule,
    adjacentRegionRule,
    removeUsedRegionsRule
];
const syntax = (tokens) => {
    const appliedRules = syntaxRules.reduce((toks, rule) => rule(toks), tokens);
    const out = appliedRules.reduce((acc, t) => [...acc, ...t.value], []);
    return out;
};
const displayInfo = (metas) => {
    const locationList = document.querySelector("#location-list");
    if (locationList)
        locationList.remove();
    const newList = document.createElement("ul");
    newList.setAttribute("id", "location-list");
    const header = document.createElement("li");
    header.textContent = "Detected locations:";
    newList.appendChild(header);
    const lis = metas.map(info => newList.appendChild(document.createElement("li")));
    lis.forEach((li, i) => li.textContent = `${metas[i].name}${metas[i].hasOwnProperty("subcountry") ? ', ' + metas[i].subcountry : ''}${metas[i].hasOwnProperty("country") ? ', ' + metas[i].country : ''} `);
    document.body.appendChild(newList);
};
const onCommentBoxChange = (trie, memo) => () => {
    const commentBox = document.querySelector("#comment-box");
    const val = commentBox.value;
    const tokens = parseString(trie, val);
    const metas = syntax(tokens);
    displayInfo(metas);
};
const createLookupDictionary = (locations) => {
    const trie = new Trie();
    locations.forEach(loc => trie.add(loc[0], loc[1]));
    return trie;
};
/** Returns US states, Canadian provinces + others as they come that have abbreviations */
const getAbbreviatedSubcountries = (data) => SUB_COUNTRY_CODES
    .map(([abbr, name]) => [abbr.toLowerCase(), data.find(c => c.subcountry === name)])
    // @ts-ignore
    .map(([name, city]) => [name, { name: city.subcountry, country: city.country }]);
const getAbbreviatedCities = (data) => CITY_CODES.map(([abbr, loc]) => [abbr.toLowerCase(), loc.split(", ")]).map(([abbr, loc]) => [abbr, { city: loc[0], region: loc[1] }]).map(([abbr, loc]) => [abbr, data.find(c => c.name === loc.city && c.subcountry === loc.region)]);
const prepareData = (data) => {
    const cities = data.map(loc => [cleanString(loc.name.toLowerCase()), loc]);
    const subcountries = data
        .reduce((acc, loc) => acc.findIndex(a => a.country === loc.country && a.subcountry === loc.subcountry) > -1 ? acc : [...acc, { subcountry: loc.subcountry, country: loc.country }], [])
        .filter(sc => sc.subcountry != null)
        .map(sc => [cleanString(sc.subcountry.toLowerCase()), { name: sc.subcountry, country: sc.country }]);
    const abbreviatedSubcountries = getAbbreviatedSubcountries(data);
    const abbreviatedCities = getAbbreviatedCities(data);
    const countries = subcountries.reduce((acc, o) => acc.includes(o[1].country) ? acc : [...acc, o[1].country], []).map(c => [cleanString(c.toLowerCase()), { name: c }]);
    return [...cities, ...abbreviatedCities, ...subcountries, ...abbreviatedSubcountries, ...countries];
};
const decodeNames = (data) => data.map(c => (Object.assign(Object.assign({}, c), { name: decodeURI(c.name), subcountry: decodeURI(c.subcountry) })));
/** Generates a string of all non-Ascii characters found in all place-names
 * Kept here, commented, to be used if there is an update to the datafile
 * Add it to fetchData below as in the example:
 * fetchData().then(decodeNames).then(outputUniqueCharacters).then...
 * Use `allUniqueCharacters` as below in the cleaning regex to *not* strip those characters
 * i.e: `placename.replace(/[^\w <allUniqueCharacters>]/g, "")` */
// const outputUniqueCharacters = (data: City[]) => {
//   const getCharacters = (city: City) => `${city.subcountry.replace(/[A-Za-z ]/g, '')}${city.name.replace(/[A-Za-z, ]/g, '')}`
//   const allUniqueCharacters = data.map(getCharacters).filter(i => i.length > 0).reduce((acc: string[], i) => [...acc, ...i], []).reduce((uq: string[], char: string) => uq.includes(char) ? uq : [...uq, char], []).sort().join("")
//   console.log({ allUniqueCharacters })
//   return data
//}
const setupUI = (trie) => {
    const commentBox = document.querySelector("#comment-box");
    let memo = {};
    commentBox.addEventListener("keyup", onCommentBoxChange(trie, memo));
    // This line is in case there is a default message already in the Textarea comment box
    const str = commentBox.value;
    if (str && str.length)
        onCommentBoxChange(trie, memo)();
};
fetchData().then(decodeNames).then(prepareData).then(createLookupDictionary).then(setupUI);
const CITY_CODES = [
    ["NYC", "New York City, New York"],
    ["LA", "Los Angeles, California"],
    ["NOLA", "New Orleans, Lousiana"],
    ["SF", "San Francisco, California"]
];
/* These are commonly-used sub-country codes */
const SUB_COUNTRY_CODES = [
    ["AL", "Alabama"],
    ["AK", "Alaska"],
    ["AZ", "Arizona"],
    ["AR", "Arkansas"],
    ["CA", "California"],
    ["CO", "Colorado"],
    ["CT", "Connecticut"],
    ["DE", "Delaware"],
    ["DC", "Washington, D.C."],
    ["FL", "Florida"],
    ["GA", "Georgia"],
    ["HI", "Hawaii"],
    ["ID", "Idaho"],
    ["IL", "Illinois"],
    ["IN", "Indiana"],
    ["IA", "Iowa"],
    ["KS", "Kansas"],
    ["KY", "Kentucky"],
    ["LA", "Louisiana"],
    ["ME", "Maine"],
    ["MD", "Maryland"],
    ["MA", "Massachusetts"],
    ["MI", "Michigan"],
    ["MN", "Minnesota"],
    ["MS", "Mississippi"],
    ["MO", "Missouri"],
    ["MT", "Montana"],
    ["NE", "Nebraska"],
    ["NV", "Nevada"],
    ["NH", "New Hampshire"],
    ["NJ", "New Jersey"],
    ["NM", "New Mexico"],
    ["NY", "New York"],
    ["NC", "North Carolina"],
    ["ND", "North Dakota"],
    ["OH", "Ohio"],
    ["OK", "Oklahoma"],
    ["OR", "Oregon"],
    ["PA", "Pennsylvania"],
    ["RI", "Rhode Island"],
    ["SC", "South Carolina"],
    ["SD", "South Dakota"],
    ["TN", "Tennessee"],
    ["TX", "Texas"],
    ["UT", "Utah"],
    ["VT", "Vermont"],
    ["VA", "Virginia"],
    ["WA", "Washington"],
    ["WV", "West Virginia"],
    ["WI", "Wisconsin"],
    ["WY", "Wyoming"],
    // [ "NU", "Nunavut" ], // Nunavut does not appear in the datafile though NU is an official designation
    ["AB", "Alberta"],
    ["BC", "British Columbia"],
    ["MB", "Manitoba"],
    ["NB", "New Brunswick"],
    ["NL", "Newfoundland and Labrador"],
    ["NF", "Newfoundland and Labrador"],
    ["LB", "Newfoundland and Labrador"],
    ["ON", "Ontario"],
    ["PE", "Prince Edward Island"],
    ["QC", "Quebec"],
    ["SK", "Saskatchewan"],
    ["YT", "Yukon"]
];
