# Hometown Parser v2

Given any text, can a small program easily identify towns, cities and countries?

[Let's see!](https://rendall.github.io/hometown-parser-2/) <https://rendall.github.io/hometown-parser-2/>

## Extracting location data from text

Consider the sentence *"We left New York City for a weekend in Montreal."*  It mentions two locations, *New York City* and *Montreal*, and the 6 other words do not refer to any location. Further, it contains a `.` which might naively be considered a part of the word *Montreal*

To a computer, all words are equally meaningless, and there is no reason for a computer to know that *Montreal* refers to a physical place in the world but *weekend* does not. Furthermore, there is some ambiguity in whether the sequences of words *New York City* refers to the city itself and not the *State of New York* followed by a non-location word *city*. Or perhaps that sequence refers to *York, England* or *York, Pennsylvania*, with the adjacent words *new* and *city* having no particular relevence to *York*

If researchers or data analysts for example wanted to understand something about the locations mentioned in a text, how might they go about it?

This approach uses a lookup dictionary to identify which sequences of words in a given text refer to locations, and then uses context clues to discern which specific location wherever the location is ambiguous

See a [working example here](https://rendall.github.io/hometown-parser-2/)

This project is a [second iteration of a previous project](https://rendall.github.io/hometown-parser/)

## Method

This method has 3 stages: *lexing*, which prepares and normalizes text; *parsing*, which identifies meaningful units of text; and *applying syntactical rules*, which resolves any ambiguities

### Lexer

Incoming text is normalized and cleaned, stripped of all characters that do not appear in world location names, double spaces replaced by single spaces and so forth.

These are all of the 208 non-Latin characters that appear collectively in all place names in the data; which is to say, there are place names in the data that contain one or more of these characters:

`'(),-./0123456789ÁÂÄÅÇÉÍÎÐÑÓÖØÚÜßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýÿ`
`ĀāăąĆćČčďĐđēėęěğĦĩĪīĭİıĽľŁłńňŌōŎŏőœřŚśŞşŠšŢţťũŪūŬŭůųźŻżŽžƏơưǝșț`
`əʼ̧̱̄̇БЖЗКЛНПРСТавгдежиклмнопрстуцчшјاةعلمنḎḏḐḑḥḨḩḯṬṭẔẕẖạảầẩậắằẵếềệ`
`ỉịọốồộớờủừỳỹ–‘’`

*e.g. The name for location `{ "name": "Zürich (Kreis 2) / Wollishofen", "subcountry": "Zurich", "country": "Switzerland", "geonameid": 6295495 }` contains the non-Latin characters `(`, `)`, `2` and `ü`*

Any non-Latin character that does *not* appear in the string above can be safely removed (e.g. `?` or `~`)

Currently, for the sake of normalization/hashing, the entire text is converted to lower case, which may very well introduce subtle localization bugs into the process. In a future iteration, this should be investigated, but for now, as long as incoming text is normalized the *same way* as the key, it should be *good enough*

### Parser

The parsing stage checks *successive sequences of words* against the dictionary, and understands only successful lookups as *location tokens*, discarding the rest

#### Successive sequences of words

Consider a sequence of words `a b c d e`. In analyzing this text for location data, two simplifying assumptions are made:

* Location names that comprise several words will always be adjacent (e.g. it's not necessary to consider whether `a c` is a location name)
* Location names will always appear in order (e.g. it's not necessary to consider `b a` as a location name)

From this, all possible sequences of words are generated. Starting with the first word alone, successively add subsequent words, considering each in turn, until the end of the text is reached. Then the first word is removed from the text, and the process begins anew. After the last word of the sequence is considered alone, the process completes.

The sequence of words `a b c d e` would be checked against the dictionary in this order:

* `a`
* `a b`
* `a b c`
* `a b c d`
* `a b c d e`
* `b`
* `b c`
* `b c d`
* `b c d e`
... and so on to:
* `d`
* `d e`
* `e`

In this way, every multi-word sequence that has a dictionary entry is identified

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

In this example, the "sequence of words" consisting of `byumba` (alone) will be considered to be a key of the *token* of *Byumba*, the place

To speed lookup, the normalized place-names are entered into a *Trie*

### Syntax analysis

This stage is *currently in development*

The final stage of the process is to analyze the tokens together and discard unlikely locations

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

This is a bit more art than science and relies on procedural trial and error to find the right rules for *good enough*

## Credit

This project relies heavily on two other projects:

* Datahub's _Major Cities of The World_ <https://datahub.io/core/world-cities>
* Mike de Boer's excellent, easy-to-use _Trie implementation_ <https://github.com/mikedeboer/trie>
