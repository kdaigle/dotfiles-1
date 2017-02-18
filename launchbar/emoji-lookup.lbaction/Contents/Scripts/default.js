include('../vendor/underscore/underscore-min.js');

class EmojiCharacter {
  constructor(name, metadata) {
    this.name = name;
    this.data = metadata;
  }

  get character() {
    return this.data['char'];
  }

  get tag() {
    return ':' + this.name + ':';
  }

  get keywords() {
    return this.data['keywords'];
  }

  // Returns an Array of Strings.
  get unicodeCodePoints() {
    if (this.character == null) {
      return [];
    } else {
      // Most emojis have only a single codepoint, but some have more.
      //
      // Country flags use two codepoints, determined by the ISO 3166-1
      // two-character country code. For example, the US flag emoji is:
      // U+1F1FA (for "U") followed by U+1F1F8 (for "S").
      //
      // Many of the people emojis are made up of several codepoints. For
      // example, the female sleuth with no skin tone is made up of the
      // following five codepoints:
      // - U+1F575 Sleuth
      // - U+FE0F  Variation selector 16 (http://emojipedia.org/variation-selector-16/)
      // - U+200D  Zero-width joiner
      // - U+2640  Female sign ♀
      // - U+FE0F  Variation selector 16 (http://emojipedia.org/variation-selector-16/)
      //
      // For our purposes, we don't care about the variation selector or the
      // zero-width joiner, so we'll discard them (if present) and get the
      // remaining codepoints.
      const VARIATION_SELECTOR_16 = "\ufe0f";
      const ZERO_WIDTH_JOINER = "\u200d";

      var parts = [...this.character];
      var relevantParts =
        _.without(parts, VARIATION_SELECTOR_16, ZERO_WIDTH_JOINER);

      var codePointHexValues = _.map(relevantParts, function(part){
        return part.codePointAt(0).toString(16);
      });

      return codePointHexValues;
    }
  }

  toLaunchbarItem() {
    return {
      title: this.launchbarItemTitle(),
      label: this.launchbarItemLabel(),
      action: 'paste',
      actionArgument: this.characterOrTag(),
      icon: this.launchbarIcon()
    }
  }

  launchbarItemTitle() {
    return this.tag;
  }

  launchbarItemLabel() {
    if (this.isUnicode()) {
      return '';
    } else {
      return 'custom';
    }
  }

  launchbarIcon() {
    var resourcesPath = Action.path + '/Contents/Resources/';
    if (this.isUnicode()) {
      var iconFileBasename = this.unicodeCodePoints.join("-");
      return resourcesPath + 'unicode/' + iconFileBasename + '.png';
    } else {
      return resourcesPath + this.name + '.png'
    }
  }

  characterOrTag() {
    if (this.character != null) {
      return this.character;
    } else {
      return this.tag;
    }
  }

  isUnicode() {
    return this.unicodeCodePoints.length > 0;
  }
}

// Determine the list of emojis that match the given search term. If the given
// search term is empty, return all available emojis. If the given search term
// is non-empty, return all emojis where the emoji name or one of its keywords
// starts with the search term.
//
// argument - A String search term.
//
// Returns an Array of Objects.
function runWithString(argument) {
  var dictionary = getEmojiDictionary();
  var searchIndex = getSearchIndexFrom(dictionary);

  var emojiNames = [];
  if (argument.length > 0) {
    function isMatch(searchTerm) {
      return searchTerm.startsWith(argument);
    }
    var indexedSearchTerms = _.keys(searchIndex);
    var matchedSearchTerms = indexedSearchTerms.filter(isMatch);
    var matchedEmojiNames = _.chain(searchIndex)
      .pick(matchedSearchTerms)
      .values()
      .flatten()
      .uniq()
      .value();

    emojiNames = matchedEmojiNames;
  } else {
    emojiNames = _.keys(dictionary);
  }

  return _.map(emojiNames.sort(), function(name) {
    var character = new EmojiCharacter(name, dictionary[name]);
    return character.toLaunchbarItem();
  });
}

function paste(character) {
  LaunchBar.paste(character);
}

// Returns an Object describing all the supported emojis. Each key is a String
//   representing the name of an emoji. Each value is an Object containing the
//   metadata for that emoji (e.g., the emoji character, the emoji's keywords).
function getEmojiDictionary() {
  path = Action.path + '/Contents/vendor/emojilib/emojis.json';
  return File.readJSON(path);
}

// Returns an Object describing supported search terms and the emojis that are
//   matched by those search terms. Each key is a String representing a search
//   term. Each value is an Array of Strings representing the names of the
//   emojis that match the search term.
function getSearchIndexFrom(dictionary) {
  var searchIndex = {};

  var emojiNames = _.keys(dictionary);
  emojiNames.forEach(function(name) {
    // Use each word in an emoji's name as a search term. For example, the
    // 'hourglass_flowing_sand' emoji has three search terms derived from its
    // name: 'hourglass', 'flowing', and 'sand'.
    var nameParts = name.split('_');

    // Use each keyword as a search term.
    var keywords = dictionary[name]['keywords'];

    var searchTerms = _.union(nameParts, keywords);
    searchTerms.forEach(function(term) {
      if (!_.has(searchIndex, term)) {
        searchIndex[term] = [];
      }
      searchIndex[term].push(name);
    });
  });

  return searchIndex;
}