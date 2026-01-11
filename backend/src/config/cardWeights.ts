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
  "P.E.K.K.A (Evo)": -1.0,    // P.E.K.K.A has evo 
  
  "Minions": 0.2,
  "Balloon": -1.0,
  
  "Witch": -0.3,
  "Witch (Evo)": -1.0,        // Witch has evo
  
  "Barbarians": 0.5,
  "Barbarians (Evo)": 1.0,   // Barbarians has evo
  
  "Golem": -1.5,
  
  "Skeletons": 0.0,
  "Skeletons (Evo)": 0.0,    // Skeletons has evo
  
  "Valkyrie": 0.5,
  "Valkyrie (Evo)": -0.5,      // Valkyrie has evo
  
  "Skeleton Army": -0.2,
  "Skeleton Army (Evo)": -0.5, // Skeleton Army has evo
  
  "Bomber": 0.5,
  "Bomber (Evo)": 0.5,       // Bomber has evo
  
  "Musketeer": 0,
  "Musketeer (Evo)": -0.2,     // Musketeer has evo
  "Musketeer (Hero)": -0.8,   // Musketeer has hero
  
  "Baby Dragon": -0.3,
  "Baby Dragon (Evo)": -0.8,  // Baby Dragon has evo
  
  "Prince": -0.7,
  
  "Wizard": 1.0,
  "Wizard (Evo)": 0.5,       // Wizard has evo
  "Wizard (Hero)": -0.5,     // Wizard has hero
  
  "Mini P.E.K.K.A": -0.2,
  "Mini P.E.K.K.A (Hero)": -0.5, // Mini P.E.K.K.A has hero
  
  "Giant Skeleton": 1.0,
  
  "Hog Rider": 0.0,
  
  "Minion Horde": -0.5,
  
  "Ice Wizard": 0.5,
  
  "Royal Giant": -0.6,
  "Royal Giant (Evo)": -1.0,  // Royal Giant has evo
  
  "Guards": 0.7,
  
  "Princess": 0.5,
  "Dark Prince": -0.5,
  "Three Musketeers": -0.5,
  "Lava Hound": 0.5,
  
  "Ice Spirit": 0.1,
  "Ice Spirit (Evo)": 0.5,   // Ice Spirit has evo
  
  "Fire Spirit": 0.0,
  "Mega Minion": 1.0,
  
  "Dart Goblin": -0.8,
  "Dart Goblin (Evo)": -1.0, // Dart Goblin has evo
  
  "Goblin Gang": 0.5,
  "Electro Wizard": -0.5,
  
  "Elite Barbarians": -0.5,
  
  "Hunter": -0.5,
  "Hunter (Evo)": -0.5,       // Hunter has evo
  
  "Executioner": -0.5,
  "Executioner (Evo)": -1.0,  // Executioner has evo
  
  "Bandit": 0.5,
  
  "Royal Recruits": -1.0,
  "Royal Recruits (Evo)": -1.5, // Royal Recruits has evo
  
  "Night Witch": -0.5,
  
  "Bats": 0.0,
  "Bats (Evo)": -0.5,        // Bats has evo
  
  "Royal Ghost": -0.5,
  "Royal Ghost (Evo)": -1.0,  // Royal Ghost has evo
  
  "Ram Rider": 0.5,
  
  "Battle Ram": -0.5,
  "Battle Ram (Evo)": -0.8,   // Battle Ram has evo
  
  "Zappies": 0.3,
  "Rascals": -0.3,
  "Cannon Cart": -0.3,
  
  "Mega Knight": -1.5,
  "Mega Knight (Evo)": -1.5,  // Mega Knight has evo
  
  "Skeleton Barrel": -0.5,
  "Skeleton Barrel (Evo)": -1.0, // Skeleton Barrel has evo
  
  "Flying Machine": 0.0,
  
  "Wall Breakers": -0.8,
  "Wall Breakers (Evo)": -1.0, // Wall Breakers has evo
  
  "Royal Hogs": -0.5,
  "Royal Hogs (Evo)": -0.5,   // Royal Hogs has evo
  
  "Goblin Giant": -0.5,
  "Goblin Giant (Evo)": -0.5, // Goblin Giant has evo
  
  "Fisherman": 0.5,
  "Magic Archer": 0.5,
  
  "Electro Dragon": -0.5,
  "Electro Dragon (Evo)": -1.0, // Electro Dragon has evo
  
  "Firecracker": -0.5,
  "Firecracker (Evo)": -0.8, // Firecracker has evo
  
  "Mighty Miner": 0.5,
  "Elixir Golem": -1.5,
  "Battle Healer": 0.5,
  
  "Skeleton King": -0.5,
  
  "Archer Queen": -0.5,
  
  "Golden Knight": -0.5,
  
  "Skeleton Dragons": 0.5,
  "Mother Witch": -0.3,
  "Electro Giant": -1.0,
  "Electro Spirit": 0.3,
  
  "Goblin Drill": -0.8,
  "Goblin Drill (Evo)": 1.0, // Goblin Drill has evo
  
  "Goblin Cage": 0.3,
  "Goblin Cage (Evo)": -0.3,  // Goblin Cage has evo
  
  "Fireball": -0.3,
  "Arrows": 0.0,
  "Rage": -0.3,
  "Rocket": -1.0,
  
  "Goblin Barrel": -0.5,
  "Goblin Barrel (Evo)": -0.8, // Goblin Barrel has evo
  
  "Freeze": -0.8,
  "Mirror": 2.0,
  "Lightning": -1.0,
  
  "Zap": 0.0,
  "Zap (Evo)": 0.3,           // Zap has evo
  
  "Poison": -0.5,
  "Graveyard": -0.5,
  "The Log": 0.5,
  "Tornado": 0.5,
  "Clone": 0.5,
  "Earthquake": -0.5,
  
  "Giant Snowball": 0.0,
  "Giant Snowball (Evo)": 0.5, // Giant Snowball has evo
  
  "Royal Delivery": 0.5,
  "Heal Spirit": 0.5,
  "Goblin Hut": -0.5,
  
  "Mortar": -0.5,
  "Mortar (Evo)": -0.8,       // Mortar has evo
  
  "Inferno Tower": -0.3,
  "Bomb Tower": 0.3,
  "Barbarian Hut": 2.0,
  
  "Tesla": 0.5,
  "Tesla (Evo)": 0.5,        // Tesla has evo
  
  "Elixir Collector": 0.0,
  "X-Bow": -0.7,
  "Tombstone": 0.5,
  
  "Furnace": -0.5,
  "Furnace (Evo)": -0.8,      // Furnace has evo
  
  "Cannon": 0.5,
  "Cannon (Evo)": 0.8,       // Cannon has evo
  
  "Inferno Dragon": -0.3,
  "Inferno Dragon (Evo)": -0.3, // Inferno Dragon has evo
  
  "Ice Golem": 0.5,
  "Ice Golem (Hero)": 0.0,    // Ice Golem has hero
  
  "Miner": 0.0,
  "Sparky": 0.5,
  
  "Lumberjack": -0.5,
  "Lumberjack (Evo)": -0.8,   // Lumberjack has evo
  

};

/**
 * Get the weight for a card by name
 * Returns 0 if card not found (neutral)
 */
export function getCardWeight(cardName: string): number {
  return CARD_WEIGHTS[cardName] ?? 0;
}
