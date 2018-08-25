'use strict';

/* globals describe: false, it:false */
const srdConverter = require('../srd-converter');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

describe('srd-converter', () => {
  describe('#convertMonster', () => {
    const fullObject = {
      name: 'Wobbler',
      traits: [
        { name: 'Trait One', recharge: '1/day', text: 'trait text blah blah\nblah' },
        { name: 'Trait Two', text: 'trait 2 text blah blah\nblah' },
      ],
      actions: [
        { name: 'Action One', recharge: '5-6', text: 'action text blah blah\nblah' },
        { name: 'Action Two', text: 'action 2 text blah blah\nblah' },
      ],
      reactions: [
        { name: 'Reaction One', recharge: '5-6', text: 'reaction text blah blah\nblah' },
        { name: 'Reaction Two', text: 'reaction 2 text blah blah\nblah' },
      ],
      legendaryPoints: 3,
      legendaryActions: [
        { name: 'Legendary Action One', cost: 1, text: 'legendary text blah blah\nblah' },
        { name: 'Legendary Action Two', cost: 2, text: 'legendary 2 text blah blah\nblah' },
      ],
    };

    const emptyObject = {
      name: 'Wobbler',
    };

    const emptyArrayObject = {
      name: 'Wobbler',
      traits: [],
      actions: [],
      reactions: [],
      legendaryActions: [],
    };

    const someMissing = {
      name: 'Wobbler',
      traits: [
        { name: 'Trait Two', text: 'trait 2 text blah blah\nblah' },
      ],
      actions: [
        { name: 'Action One', recharge: '5-6', text: 'action text blah blah\nblah' },
        { name: 'Action Two', text: 'action 2 text blah blah\nblah' },
      ],
    };

    it('correctly concatenates a full object', () => {
      // noinspection JSUnresolvedVariable
      const converted = srdConverter.convertMonster(fullObject);
      expect(converted).toHaveProperty('content_from_srd',
        '\n Traits\n' +
        '**Trait One (1/day):** trait text blah blah\nblah\n' +
        '**Trait Two:** trait 2 text blah blah\nblah\n' +
        '\n Actions\n' +
        '**Action One (5-6):** action text blah blah\nblah\n' +
        '**Action Two:** action 2 text blah blah\nblah\n' +
        '\n Reactions\n' +
        '**Reaction One (5-6):** reaction text blah blah\nblah\n' +
        '**Reaction Two:** reaction 2 text blah blah\nblah\n' +
        '\n Legendary Actions\n' +
        'The Wobbler can take 3 legendary actions, choosing from the options below. ' +
        'It can take only one legendary action at a time and only at the end of another creature\'s turn. ' +
        'The Wobbler regains spent legendary actions at the start of its turn.\n' +
        '**Legendary Action One:** legendary text blah blah\nblah\n' +
        '**Legendary Action Two (Costs 2 actions):** legendary 2 text blah blah\nblah');

      ['traits', 'actions', 'reactions', 'legendaryActions', 'legendary_actions']
        .forEach(k => expect(converted).not.toHaveProperty(k));
    });

    it('correctly adds extra fields', () => {
      // noinspection JSUnresolvedVariable
      const converted = srdConverter.convertMonster(fullObject);
      expect(converted).toHaveProperty('is_npc', 1);
      expect(converted).toHaveProperty('edit_mode', 0);
      ['traits', 'actions', 'reactions', 'legendaryActions', 'legendary_actions']
        .forEach(k => expect(converted).not.toHaveProperty(k));
    });

    it('correctly concatenates an empty object', () => {
      // noinspection JSUnresolvedVariable
      const converted = srdConverter.convertMonster(emptyObject);
      expect(converted).toHaveProperty('content_from_srd', '');
      ['traits', 'actions', 'reactions', 'legendaryActions', 'legendary_actions']
        .forEach(k => expect(converted).not.toHaveProperty(k));
    });

    it('correctly concatenates an object with empty arrays', () => {
      // noinspection JSUnresolvedVariable
      const converted = srdConverter.convertMonster(emptyArrayObject);
      expect(converted).toHaveProperty('content_from_srd', '');
      ['traits', 'actions', 'reactions', 'legendaryActions', 'legendary_actions']
        .forEach(k => expect(converted).not.toHaveProperty(k));
    });

    it('correctly concatenates a medium object', () => {
      // noinspection JSUnresolvedVariable
      const converted = srdConverter.convertMonster(someMissing);
      expect(converted).toHaveProperty('content_from_srd',
        '\n Traits\n' +
        '**Trait Two:** trait 2 text blah blah\nblah\n' +
        '\n Actions\n' +
        '**Action One (5-6):** action text blah blah\nblah\n' +
        '**Action Two:** action 2 text blah blah\nblah');
      ['traits', 'actions', 'reactions', 'legendaryActions', 'legendary_actions']
        .forEach(k => expect(converted).not.toHaveProperty(k));
    });
  });

  describe('#convertJson', () => {
    if (process.env.CI) {
      return;
    }

    const monsterFiles = glob.sync(path.normalize(path.join(__dirname, '../../5eshapedscriptdata/sources/{public,private}/*.json')));
    expect(monsterFiles).not.toBe({});
    monsterFiles.forEach((jsonFile) => {
      describe(`JSON file:  ${jsonFile}`, () => {
        const json = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
        if (json.monsters) {
          json.monsters.forEach((monster) => {
            it(`convert ${monster.name}`, () => {
              srdConverter.convertMonster(monster);
            });
          });
        }
        if (json.spells) {
          it('should parse spell correctly', () => {
            srdConverter.convertSpells(json.spells.filter(spell => !spell.newName), 'female');
          });
        }
      });
    });
  });
});
