/**
 * CARD ETHICS WEIGHTS CONFIGURATION
 * 
 * ⚠️EDIT CARD WEIGHTS ⚠️
 * 
 * HOW TO EDIT:
 * - Each card name maps to a number representing its ethical value
 * - Positive values = more ethical/good cards (e.g., +1.0)
 * - Negative values = less ethical/bad cards (e.g., -1.0)
 * - Zero = neutral (0.0)
 * - Values typically range from -2.0 to +2.0
 * 
 * TO UPDATE WEIGHTS:
 * 1. Find the card name in the CARD_WEIGHTS object below (starts around line 30)
 * 2. Change its numeric value to your desired weight
 * 
 * EXAMPLE:
 *   "Knight": 0.5,              // Base card weight
 *   "Knight (Evo)": 0.7,        // Evolution version (Knight has evo)
 *   "Knight (Hero)": 0.6,       // Hero version (Knight has hero)
 *   "Elite Barbarians": -1.0,   // No evo/hero weights (Elite Barbarians doesn't have variants)
 * 
 */

export const CARD_WEIGHTS: Record<string, number> = {
  
  // Base card weights with evo/hero variants
  "Knight": 0.5,
  "Knight (Evo)": -0.1,        // Knight has evo
  "Knight (Hero)": -0.6,       // Knight has hero
  
  "Archers": 0.3,
  "Archers (Evo)": 0.1,       // Archers has evo
  
  "Goblins": 0.1,
  
  "Giant": 0.1,
  "Giant (Hero)": -0.1,       // Giant has hero
  
  "P.E.K.K.A": -0.5,
  "P.E.K.K.A (Evo)": -0.7,    // P.E.K.K.A has evo 
  
  "Minions": 0.2,
  "Balloon": -0.6,
  
  "Witch": -0.3,
  "Witch (Evo)": -0.6,        // Witch has evo
  
  "Barbarians": 0.2,
  "Barbarians (Evo)": 0.1,   // Barbarians has evo
  
  "Golem": -0.8,
  
  "Skeletons": 0.0,
  "Skeletons (Evo)": -0.1,    // Skeletons has evo
  
  "Valkyrie": 0.2,
  "Valkyrie (Evo)": -0.3,      // Valkyrie has evo
  
  "Skeleton Army": -0.2,
  "Skeleton Army (Evo)": -0.4, // Skeleton Army has evo
  
  "Bomber": 0.1,
  "Bomber (Evo)": -0.1,       // Bomber has evo
  
  "Musketeer": -0.2,
  "Musketeer (Evo)": -0.2,     // Musketeer has evo
  "Musketeer (Hero)": -0.8,   // Musketeer has hero
  
  "Baby Dragon": -0.3,
  "Baby Dragon (Evo)": -0.6,  // Baby Dragon has evo
  
  "Prince": -0.4,
  
  "Wizard": -0.2,
  "Wizard (Evo)": -0.3,       // Wizard has evo
  "Wizard (Hero)": -0.7,     // Wizard has hero
  
  "Mini P.E.K.K.A": -0.3,
  "Mini P.E.K.K.A (Hero)": -1.0, // Mini P.E.K.K.A has hero
  
  "Giant Skeleton": -0.5,
  
  "Hog Rider": -0.8,
  
  "Minion Horde": -0.2,
  
  "Ice Wizard": 0.3,
  
  "Royal Giant": -0.6,
  "Royal Giant (Evo)": -0.9,  // Royal Giant has evo
  
  "Guards": 0.2,
  
  "Princess": 0.1,
  "Dark Prince": -0.1,
  "Three Musketeers": -0.5,
  "Lava Hound": 0.2,
  
  "Ice Spirit": 0.1,
  "Ice Spirit (Evo)": 0.05,   // Ice Spirit has evo
  
  "Fire Spirit": 0.4,
  "Mega Minion": 0.6,
  
  "Dart Goblin": -0.4,
  "Dart Goblin (Evo)": -0.6, // Dart Goblin has evo
  
  "Goblin Gang": 0.3,
  "Electro Wizard": -0.1,
  
  "Elite Barbarians": -0.6,
  
  "Hunter": -0.3,
  "Hunter (Evo)": -0.5,       // Hunter has evo
  
  "Executioner": -0.5,
  "Executioner (Evo)": -0.7,  // Executioner has evo
  
  "Bandit": -0.2,
  
  "Royal Recruits": -0.2,
  "Royal Recruits (Evo)": -0.4, // Royal Recruits has evo
  
  "Night Witch": -0.2,
  
  "Bats": -0.1,
  "Bats (Evo)": -0.3,        // Bats has evo
  
  "Royal Ghost": 0.2,
  "Royal Ghost (Evo)": -0.4,  // Royal Ghost has evo
  
  "Ram Rider": -0.5,
  
  "Battle Ram": -0.4,
  "Battle Ram (Evo)": -0.5,   // Battle Ram has evo
  
  "Zappies": 0.2,
  "Rascals": -0.1,
  "Cannon Cart": -0.1,
  
  "Mega Knight": -1.2,
  "Mega Knight (Evo)": -1.4,  // Mega Knight has evo
  
  "Skeleton Barrel": -0.2,
  "Skeleton Barrel (Evo)": -0.4, // Skeleton Barrel has evo
  
  "Flying Machine": 0.0,
  
  "Wall Breakers": -0.6,
  "Wall Breakers (Evo)": -0.7, // Wall Breakers has evo
  
  "Royal Hogs": -0.3,
  "Royal Hogs (Evo)": -0.4,   // Royal Hogs has evo
  
  "Goblin Giant": -0.4,
  "Goblin Giant (Evo)": -0.8, // Goblin Giant has evo
  
  "Fisherman": 0.1,
  "Magic Archer": -0.2,
  
  "Electro Dragon": -0.2,
  "Electro Dragon (Evo)": -0.9, // Electro Dragon has evo
  
  "Firecracker": -0.1,
  "Firecracker (Evo)": -0.15, // Firecracker has evo
  
  "Mighty Miner": -0.4,
  "Elixir Golem": -0.8,
  "Battle Healer": 0.2,
  
  "Skeleton King": -0.5,
  
  "Archer Queen": -0.6,
  
  "Golden Knight": -0.4,
  
  "Skeleton Dragons": -0.2,
  "Mother Witch": -0.3,
  "Electro Giant": -0.7,
  "Electro Spirit": 0.0,
  
  "Goblin Drill": -0.8,
  "Goblin Drill (Evo)": -0.9, // Goblin Drill has evo
  
  "Goblin Cage": 0.1,
  "Goblin Cage (Evo)": 0.15,  // Goblin Cage has evo
  
  "Fireball": -0.2,
  "Arrows": 0.0,
  "Rage": -0.3,
  "Rocket": -0.4,
  
  "Goblin Barrel": -0.5,
  "Goblin Barrel (Evo)": -0.6, // Goblin Barrel has evo
  
  "Freeze": -0.6,
  "Mirror": 0.0,
  "Lightning": -0.3,
  
  "Zap": 0.0,
  "Zap (Evo)": 0.1,           // Zap has evo
  
  "Poison": -0.4,
  "Graveyard": -0.5,
  "The Log": 0.1,
  "Tornado": 0.0,
  "Clone": -0.1,
  "Earthquake": -0.2,
  
  "Giant Snowball": 0.0,
  "Giant Snowball (Evo)": 0.1, // Giant Snowball has evo
  
  "Royal Delivery": 0.1,
  "Heal Spirit": 0.2,
  "Goblin Hut": -0.2,
  
  "Mortar": -0.3,
  "Mortar (Evo)": -0.4,       // Mortar has evo
  
  "Inferno Tower": -0.2,
  "Bomb Tower": 0.0,
  "Barbarian Hut": -0.1,
  
  "Tesla": 0.1,
  "Tesla (Evo)": 0.15,        // Tesla has evo
  
  "Elixir Collector": 0.0,
  "X-Bow": -0.7,
  "Tombstone": 0.0,
  
  "Furnace": -0.2,
  "Furnace (Evo)": -0.3,      // Furnace has evo
  
  "Cannon": 0.1,
  "Cannon (Evo)": 0.15,       // Cannon has evo
  
  "Inferno Dragon": -0.3,
  "Inferno Dragon (Evo)": -0.4, // Inferno Dragon has evo
  
  "Ice Golem": 0.0,
  "Ice Golem (Hero)": 0.1,    // Ice Golem has hero
  
  "Miner": -0.3,
  "Sparky": -0.5,
  
  "Lumberjack": -0.3,
  "Lumberjack (Evo)": -0.4,   // Lumberjack has evo
  

};

/**
 * Get the weight for a card by name
 * Returns 0 if card not found (neutral)
 */
export function getCardWeight(cardName: string): number {
  return CARD_WEIGHTS[cardName] ?? 0;
}
