import { major } from './major.js';
import { wands } from './wands.js';
import { cups } from './cups.js';
import { swords } from './swords.js';
import { pents } from './pents.js';

export const cards = [...major, ...wands, ...cups, ...swords, ...pents];

export const getCardById = (id) => cards.find(c => c.id === id);
