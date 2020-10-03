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
const cleanString = (str) => removeDoubleSpaces(str.trim().replace(/[\.\(\)&'’\/]/g, " "))
    .replace(/[^\w ]/g, "")
    .replace(/[,\?]/g, " ");
const expandAbbreviation = (word) => {
    switch (word) {
        case "usa": return "united states";
        default: return word;
    }
};
const breakDown = (trie, str, words, endIndex = 1, result = []) => {
    if (!words) {
        const val = cleanString(str.toLowerCase());
        const expanded = val.split(" ").map(word => expandAbbreviation(word));
        console.info(`${str} =>
     ${val}`);
        return breakDown(trie, str, expanded, 0);
    }
    if (words.length === 0)
        return result;
    if (endIndex > words.length)
        return breakDown(trie, str, words.slice(1), 1, result);
    const potentialCity = words.slice(0, endIndex).join(" ");
    // console.info(potentialCity)
    const find = trie.find(potentialCity);
    if (find !== null && find.meta && find.meta.length)
        return breakDown(trie, str, words, endIndex + 1, [...result, ...find.meta]);
    else
        return breakDown(trie, str, words, endIndex + 1, result);
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
    const val = commentBox.value.toLowerCase();
    const metas = breakDown(trie, val);
    displayInfo(metas);
};
const createTrie = (locations) => {
    const trie = new Trie();
    locations.forEach(loc => trie.add(loc[0], loc[1]));
    return trie;
};
/** Returns US states, Canadian provinces + others as they come that have abbreviations */
const getAbbreviatedSubcountries = (data) => SUB_COUNTRY_CODES
    .map(([abbr, name]) => [abbr.toLowerCase(), data.find(c => c.subcountry === name)])
    // @ts-ignore
    .map(([name, city]) => [name, { name: city.subcountry, country: city.country }]);
const coalesceData = (data) => {
    const cities = data.map(loc => [loc.name.toLowerCase(), loc]);
    const subcountries = data
        .reduce((acc, loc) => acc.findIndex(a => a.country === loc.country && a.subcountry === loc.subcountry) > -1 ? acc : [...acc, { subcountry: loc.subcountry, country: loc.country }], [])
        .filter(sc => sc.subcountry != null)
        .map(sc => [sc.subcountry.toLowerCase(), { name: sc.subcountry, country: sc.country }]);
    const abbreviatedSubcountries = getAbbreviatedSubcountries(data);
    const countries = subcountries.reduce((acc, o) => acc.includes(o[1].country) ? acc : [...acc, o[1].country], []).map(c => [c.toLowerCase(), { name: c }]);
    return [...cities, ...subcountries, ...abbreviatedSubcountries, ...countries];
};
fetchData().then(coalesceData).then(createTrie).then((trie) => {
    const commentBox = document.querySelector("#comment-box");
    let memo = {};
    commentBox.addEventListener("keyup", onCommentBoxChange(trie, memo));
    const str = commentBox.value;
    if (str && str.length)
        onCommentBoxChange(trie, memo)();
});
/* These are commonly-used sub-country codes */
const SUB_COUNTRY_CODES = [
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
];
