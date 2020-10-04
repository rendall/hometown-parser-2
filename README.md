# hometown-parser-2

Given any text, can a small program easily identify towns, cities and countries?

## Extracting location data from text

This approach uses a lookup dictionary to identify which sequences of words in a given text refer to locations, and then uses context clues to discern which specific location wherever the location is ambiguous

See a [working example here](https://rendall.github.io/hometown-parser-2/)

This project is a [second iteration of a previous project](https://rendall.github.io/hometown-parser/) which took a more procedural, content-neutral approach.

## Method

This is a brief overview of the approach used here, which can be understood as an analogy to computer language parsing:

### Lexer

Incoming text is normalized and cleaned, stripped of all characters that do not appear in world location names. Double spaces are replaced by single spaces.

These are all of the 208 non-Ascii characters that appear collectively in all place names in the data; which is to say, there are place names in the data that contain one or more of these characters:

`'(),-./0123456789ÁÂÄÅÇÉÍÎÐÑÓÖØÚÜßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýÿ`
`ĀāăąĆćČčďĐđēėęěğĦĩĪīĭİıĽľŁłńňŌōŎŏőœřŚśŞşŠšŢţťũŪūŬŭůųźŻżŽžƏơưǝșț`
`əʼ̧̱̄̇БЖЗКЛНПРСТавгдежиклмнопрстуцчшјاةعلمنḎḏḐḑḥḨḩḯṬṭẔẕẖạảầẩậắằẵếềệ`
`ỉịọốồộớờủừỳỹ–‘’`

*e.g. The name for location `{ "name": "Zürich (Kreis 2) / Wollishofen", "subcountry": "Zurich", "country": "Switzerland", "geonameid": 6295495 }` contains the characters `()2ü`*

Any non-Ascii character that does *not* appear in the string above can be safely removed (e.g. `?` or `~`)

Currently, for the sake of normalization/hashing, the entire text is converted to lower case, which may very well introduce subtle localization bugs into the process. In a future iteration, this should be investigated, but for now, as long as incoming text is normalized the *same way* as the key, it should be *good enough*

### Parser

The parsing stage checks successive sequences of words against the dictionary, and understands only successful lookups as *tokens*, discarding the rest

#### Successive sequences

The algorithm to discover all sequences is to iteratively remove the last word in the text until the first word is alone, and then to start again with the first word removed.

Consider a text with words in sequence: `a b c d e`. `a` may be a non-location word, while the sequences `b`, `b c`, `b c d`, `c d` and `e` may each be found in the dictionary. It is necessary to examine them all.

Two simplifying assumptions are made:

* Location names that comprise several words will always be adjacent (e.g. it's not necessary to consider whether `a c` is a location name)
* Location names will always appear in order (e.g. it's not necessary to consider `b a` as a location name)

Visually:
`a`
`a b`
`a b c`
`a b c d`
`a b c d e`
`b`
`b c`
`b c d`
`b c d e`
... and so on

#### Lookup

The datafile is a json formatted array of objects in the form:

```json
{
  "country": "Rwanda",
  "name": "Byumba",
  "subcountry": "Northern Province"
}
```

This raw data must be processed and converted into a lookup dictionary, wherein the `key` is a normalized version of the place name:

`key: byumba, value: <as above>`

In this example, a "sequence of words" consisting of `byumba` (alone) will be considered as a "token" of *Byumba* the place

To speed lookup, the normalized place-names are entered into a *Trie*

### Syntax

The final stage of the process is to analyze the tokens together and discard unlikely locations. This is a bit more art than science.

For example, given the input text *San Francisco, California*, the parser returns the following locations:

* *San*, Ségou, Mali
* *San Francisco*, Cordoba, Argentina
* *San Francisco*, Heredia, Costa Rica
* *San Francisco*, Central Luzon, Philippines
* *San Francisco*, Caraga, Philippines
* *San Francisco*, Morazán, El Salvador
* *San Francisco*, California, United States
* *California*, United States

Syntactical analysis should discard all but *San Francisco, California, United States*

This stage is *currently in development*

Briefly, the approach shall include these assumptions:

* The larger, encompassing location name is the correct one
  * `San Francisco` is correct while `San` is likely wrong
  * `New York` versus `York`
* A "region" token syntactically adjacent or nearby is intended to clarify ambiguity if there is any
  * The *California* in the example above is meant to distinguish the correct `San Francisco`
* Nearby locations will be mentioned together
  * e.g. The `San Francisco` of input text `"San Diego, San Francisco and Los Angeles"` likely refers to the *California* San Francisco
* Without other context, general trumps specific (this may be an unwarranted, arbitrary assumption)
  * Input text `"Colombia"` refers to the country, not *Colombia, Las Tunas, Cuba*
  * Input text `"Florida"` refers to one of the regions in either *United States* or *Uruguay* and not the town *Florida, Valle del Cauca, Colombia*
* Without other context, some place-names are more likely
  * The input text `"London"` alone likely refers to *London, England* and not *London, Ontario, Canada*
  * Allow for alternate syntactical weighting: a form for an Ontario business could weight *Canada* above *England* for instance

## Credit

This project relies heavily on two other projects:

* Datahub's _Major Cities of The World_ <https://datahub.io/core/world-cities>
* Mike de Boer's excellent, easy-to-use _Trie implementation_ <https://github.com/mikedeboer/trie>
