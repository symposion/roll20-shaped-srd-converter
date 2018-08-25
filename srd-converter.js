'use strict';

const _ = require('underscore');

const generateUUID = (function _generateUUID() {
  let a = 0;
  const b = [];
  return function generateUUIDInternal() {
    let c = (new Date()).getTime();
    const d = c === a;
    a = c;
    const e = new Array(8);
    let f;
    for (f = 7; f >= 0; f -= 1) {
      e[f] = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz'.charAt(c % 64);
      c = Math.floor(c / 64);
    }
    c = e.join('');
    if (d) {
      for (f = 11; f >= 0 && b[f] === 63; f -= 1) {
        b[f] = 0;
      }
      b[f] += 1;
    } else {
      for (f = 0; f < 12; f += 1) {
        b[f] = Math.floor(64 * Math.random());
      }
    }
    for (f = 0; f < 12; f += 1) {
      c += '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz'.charAt(b[f]);
    }
    return c;
  };
}());

function generateRowID() {
  return generateUUID().replace(/_/g, 'Z');
}

function camelToSnakeCase(string) {
  return string.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function getRenameMapper(newName, uppercase) {
  return function renameMapper(key, value, output) {
    output[newName] = uppercase ? value.toUpperCase() : value;
  };
}

function getRenameMapperAndToggle(newName) {
  return function renameMapper(key, value, output) {
    output[newName] = value;
    output[`${newName}_toggle`] = 1;
  };
}

function hpMapper(key, value, output) {
  const match = value.match(/(\d+(?:\s?\(\s?\d+d\d+(?:\s?[-+]\s?\d+)?\s?\))?)(.*)/);
  if (match) {
    output.hp_from_srd = match[1];
    if (match[2]) {
      output.hp_note = match[2];
    }
  } else {
    output.hp_from_srd = '0';
    output.hp_note = value;
  }
}

function crUnMunger(key, value, output) {
  output.challenge_rating_from_srd = (_.isNumber(value) && value < 1) ? `1/${1 / value}` : value;
}

function upperCaseMapper(key, value, output) {
  output[key] = value ? value.toUpperCase() : value;
}

function identityMapper(key, value, output) {
  output[key] = value;
}

function booleanMapper(key, value, output) {
  if (value) {
    output[key] = 'Yes';
  }
}

function durationMapper(key, value, output, spellObj) {
  let newDuration = spellObj.concentration ? 'CONCENTRATION_' : '';
  newDuration += value.toUpperCase().replace(/\s/g, '_');
  output[key] = newDuration;
}

function spellLevelMapper(key, value, output) {
  let spellLevel;
  if (value === 0) {
    spellLevel = 'CANTRIP';
  } else {
    switch (value % 10) {
      case 1:
        spellLevel = `${value}ST_LEVEL`;
        break;
      case 2:
        spellLevel = `${value}ND_LEVEL`;
        break;
      case 3:
        spellLevel = `${value}RD_LEVEL`;
        break;
      default:
        spellLevel = `${value}TH_LEVEL`;
        break;
    }
  }
  output.spell_level = spellLevel;
  output.level = value;
}

function camelCaseFixAndToggleMapper(key, value, output) {
  const newKey = camelToSnakeCase(key);
  output[newKey] = value;
  output[`${newKey}_toggle`] = 1;
}

function camelCaseFixMapper(key, value, output) {
  const newKey = camelToSnakeCase(key);
  output[newKey] = value;
}

function getCastingStatMapper(prefix) {
  return function castingStatMapper(key, value, output) {
    if (value) {
      output[`${prefix}_ability`] = 'SPELL_ABILITY';
    }
  };
}

function castingTimeMapper(key, value, output) {
  if (value) {
    const match = value.match(/([^,]+)(?:, (.*))?/);
    output.casting_time = match[1].toUpperCase().replace(/\s/g, '_');
    if (match[2]) {
      output.reaction_condition = match[2];
    }
  }
}

function componentMapper(key, value, output) {
  const components = _.chain(value)
    .omit('materialCost')
    .map((propValue, propName) => {
      if (propName !== 'materialMaterial') {
        return propName.toUpperCase().slice(0, 1);
      }

      output.materials = propValue;
      return null;
    })
    .compact()
    .value()
    .join('_');

  if (components) {
    output.components = `COMPONENTS_${components}`;
  }
}

function attackTypeMapper(key, value, output) {
  switch (value) {
    case 'ranged':
      output.type_from_srd = 'Ranged';
      break;
    default:
      output.type_from_srd = 'Melee';
  }
}

function getDiceExploder(prefix) {
  return function damageMapper(key, value, output) {
    const match = value.match(/^(.+)(d[\d]+)$/);
    if (match) {
      output[`${prefix}_dice`] = match[1];
      output[`${prefix}_die`] = match[2];
    }
  };
}

function getDamageMapper(prefix) {
  return getDiceExploder(`${prefix}_damage`);
}

function getSecondaryDamageMapper(prefix) {
  const valueMapper = getDamageMapper(`${prefix}_second`);
  return function secondaryDamagerMapper(key, value, output) {
    valueMapper(key, value, output);
    output[`${prefix}_second_damage_condition`] = 'PLUS';
  };
}

function getPrefixCamelCaseFixMapper(prefix) {
  return function prefixCamelCaseFixMapper(key, value, output) {
    const newKey = `${prefix}_${camelToSnakeCase(key)}`;
    output[newKey] = value;
  };
}

function getSaveAttackMappings(prefix) {
  return {
    ability: getRenameMapper('saving_throw_vs_ability', 'uppercase'),
    type: attackTypeMapper,
    damage: getDamageMapper(prefix),
    damageBonus: getPrefixCamelCaseFixMapper(prefix),
    damageType: getPrefixCamelCaseFixMapper(prefix),
    saveSuccess: getRenameMapper('saving_throw_success'),
    higherLevelDice: getPrefixCamelCaseFixMapper(prefix),
    secondaryDamage: getSecondaryDamageMapper(prefix),
    secondaryDamageBonus: getRenameMapper(`${prefix}_second_damage_bonus`),
    secondaryDamageType: getRenameMapper(`${prefix}_second_damage_type`),
    higherLevelSecondaryDice: getRenameMapper(`${prefix}_second_higher_level_dice`),
    higherLevelSecondaryDie: getRenameMapper(`${prefix}_second_higher_level_die`),
    castingStat: getCastingStatMapper(`${prefix}_damage`),
    secondaryCastingStat: getCastingStatMapper(`${prefix}_second_damage`),
  };
}

function getObjectMapper(mappings) {
  return function objectMapper(key, value, output) {
    if (key === 'save') {
      output.saving_throw_toggle = 1;
    } else if (key === 'attack') {
      output.attack_toggle = 1;
    } else if (key === 'damage') {
      output.other_damage_toggle = 1;
    } else if (key === 'heal') {
      output.heal_toggle = 1;
    }
    _.each(value, (propVal, propName) => {
      const mapper = mappings[propName];
      if (!mapper) {
        throw new Error(`Unrecognised property when attempting to convert to srd format: [${propName}] ${JSON.stringify(output)}`);
      }
      mapper(propName, propVal, output, value);
    });
  };
}

const spellMapper = getObjectMapper({
  name: identityMapper,
  duration: durationMapper,
  level: spellLevelMapper,
  school: upperCaseMapper,
  emote: identityMapper,
  range: identityMapper,
  castingTime: castingTimeMapper,
  target: identityMapper,
  description: getRenameMapperAndToggle('content'),
  higherLevel: camelCaseFixAndToggleMapper,
  ritual: booleanMapper,
  concentration: booleanMapper,
  save: getObjectMapper(getSaveAttackMappings('saving_throw')),
  attack: getObjectMapper(getSaveAttackMappings('attack')),
  damage: getObjectMapper(getSaveAttackMappings('other')),
  heal: getObjectMapper({
    heal: getDiceExploder('heal'),
    castingStat: getCastingStatMapper('heal'),
    higherLevelDice: getRenameMapper('heal_higher_level_dice'),
    higherLevelAmount: getRenameMapper('higher_level_heal'),
    bonus: getRenameMapper('heal_bonus'),
  }),
  components: componentMapper,
  prepared(key, value, output) {
    if (value) {
      output.is_prepared = 'on';
    }
  },
  uses: identityMapper,
  usesMax: camelCaseFixMapper,
  recharge: identityMapper,
  classes: _.noop,
  aoe: _.noop,
  source: _.noop,
  effects: _.noop,
  domains: _.noop,
  oaths: _.noop,
  circles: _.noop,
  patrons: _.noop,
  lists: _.noop,
});

const monsterMapper = getObjectMapper({
  name: getRenameMapper('character_name'),
  size: getRenameMapper('size_from_srd'),
  type: getRenameMapper('type_from_srd'),
  alignment: getRenameMapper('alignment_from_srd'),
  AC: getRenameMapper('ac_from_srd'),
  HP: hpMapper,
  speed: getRenameMapper('speed_from_srd'),
  strength: identityMapper,
  dexterity: identityMapper,
  constitution: identityMapper,
  intelligence: identityMapper,
  wisdom: identityMapper,
  charisma: identityMapper,
  skills: getRenameMapper('skills_from_srd'),
  savingThrows: getRenameMapper('saving_throws_from_srd'),
  damageResistances: getRenameMapper('damage_resistances'),
  damageImmunities: getRenameMapper('damage_immunities'),
  conditionImmunities: getRenameMapper('condition_immunities'),
  damageVulnerabilities: getRenameMapper('damage_vulnerabilities'),
  environments: identityMapper,
  senses: getRenameMapper('senses_from_srd'),
  languages: identityMapper,
  challenge: crUnMunger,
  traits: identityMapper,
  actions: identityMapper,
  reactions: identityMapper,
  regionalEffects: identityMapper,
  regionalEffectsFade: identityMapper,
  legendaryPoints: identityMapper,
  legendaryActions: identityMapper,
  lairActions: identityMapper,
  spells: _.noop,
  source: _.noop,
});

const pronounTokens = {
  '{{GENDER_PRONOUN_HE_SHE}}': 'nominative',
  '{{GENDER_PRONOUN_HIM_HER}}': 'accusative',
  '{{GENDER_PRONOUN_HIS_HER}}': 'possessive',
  '{{GENDER_PRONOUN_HIMSELF_HERSELF}}': 'reflexive',
};

module.exports = {
  convertMonster(npcObject) {
    const output = {};
    monsterMapper(null, npcObject, output);

    const actionTraitTemplate = _.template('**<%=data.name%><% if(data.recharge) { print(" (" + data.recharge + ")") } %>:** <%=data.text%>',
      { variable: 'data' });
    const legendaryTemplate = _.template('**<%=data.name%><% if(data.cost && data.cost > 1){ print(" (Costs " + data.cost + " actions)") }%>:** <%=data.text%>',
      { variable: 'data' });

    const lairRegionalTemplate = item => `\u2022 ${item}`;

    const simpleSectionTemplate = _.template('\n <%=data.title%>\n<% print(data.items.join("\\n")); %>',
      { variable: 'data' });
    const legendarySectionTemplate = _.template('\n <%=data.title%>\n' +
      'The <%=data.name%> can take <%=data.legendaryPoints%> legendary actions, choosing from the options below. ' +
      'It can take only one legendary action at a time and only at the end of another creature\'s turn. ' +
      'The <%=data.name%> regains spent legendary actions at the start of its turn.\n' +
      '<% print(data.items.join("\\n")) %>', { variable: 'data' });
    const regionalSectionTemplate = _.template(' <%=data.title%>\n<% print(data.items.join("\\n")); %>\n' +
      '<% if(data.regionalEffectsFade) { print("**" + data.regionalEffectsFade) }%>', { variable: 'data' });

    const srdContentSections = [
      { prop: 'lairActions', itemTemplate: lairRegionalTemplate, sectionTemplate: simpleSectionTemplate },
      { prop: 'regionalEffects', itemTemplate: lairRegionalTemplate, sectionTemplate: regionalSectionTemplate },
      { prop: 'traits', itemTemplate: actionTraitTemplate, sectionTemplate: simpleSectionTemplate },
      { prop: 'actions', itemTemplate: actionTraitTemplate, sectionTemplate: simpleSectionTemplate },
      { prop: 'reactions', itemTemplate: actionTraitTemplate, sectionTemplate: simpleSectionTemplate },
      { prop: 'legendaryActions', itemTemplate: legendaryTemplate, sectionTemplate: legendarySectionTemplate },
    ];

    function makeDataObject(propertyName, itemList) {
      return {
        title: propertyName.replace(/([A-Z])/g, ' $1').replace(/^[a-z]/, letter => letter.toUpperCase()),
        name: output.character_name,
        legendaryPoints: output.legendaryPoints,
        regionalEffectsFade: output.regionalEffectsFade,
        items: itemList,
      };
    }

    output.is_npc = 1;
    output.edit_mode = 0;

    output.content_from_srd = _.chain(srdContentSections)
      .map((sectionSpec) => {
        const items = output[sectionSpec.prop];
        delete output[sectionSpec.prop];
        return _.map(items, sectionSpec.itemTemplate);
      })
      .map((sectionItems, sectionIndex) => {
        const sectionSpec = srdContentSections[sectionIndex];
        if (!_.isEmpty(sectionItems)) {
          return sectionSpec.sectionTemplate(makeDataObject(sectionSpec.prop, sectionItems));
        }

        return null;
      })
      .compact()
      .value()
      .join('\n');

    delete output.legendaryPoints;

    return output;
  },

  convertSpells(spellObjects, pronounInfo) {
    const result = _.chain(spellObjects)
      .map((spellObject) => {
        const converted = {};
        spellMapper(null, spellObject, converted);
        converted.toggle_details = 0;
        if (converted.emote) {
          _.each(pronounTokens, (pronounType, token) => {
            const replacement = pronounInfo[pronounType];
            converted.emote = converted.emote.replace(new RegExp(token, 'g'), replacement);
          });
        }
        return converted;
      })
      .reduce((attrsObject, spellProps) => {
        const rowId = generateRowID();
        _.each(_.omit(spellProps, 'level'), (propVal, propName) => {
          if (!_.isUndefined(propVal)) {
            attrsObject[`repeating_spell${spellProps.level}_${rowId}_${propName}`] = propVal;
          }
        });
        return attrsObject;
      }, {})
      .value();

    if (!_.isEmpty(result)) {
      result.show_spells = 1;
    }
    return result;
  },
};
