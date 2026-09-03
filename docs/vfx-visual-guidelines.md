# VFX and actor-sprite rules

## Start with mechanics, not the ability name

Before approving art, read the implemented ability and record its source anatomy or weapon, damage type, range, strike count, target shape, saving throw, conditions, movement, and duration. The name alone is never an art brief.

## Choose the correct visual carrier

- **Body action:** bites, claws, pounces, slams, weapon swings, and attached tentacles belong in the actor's physical or signature sprite cell. Do not add a second creature-shaped overlay.
- **Detached effect:** arrows, thrown objects, bolts, breath after it leaves the mouth, and persistent terrain may use a separate VFX sprite.
- **Hybrid action:** animate the actor first, then originate the detached effect from the correct body part or weapon.
- **UI only:** ability names, class labels, descriptions, and icons remain in the interface. Never render an ability name as battlefield artwork.

## Required actor sheet

Every monster sheet is a transparent 1086×362 image with six equal 181×362 cells in this order: idle, move, physical action, damage, downed, signature action. Every registered attack must map to a depicted physical/signature action or an intentional hybrid/projectile extension.

## Review checklist

1. Does the pose depict what the implemented mechanics actually do?
2. Does the effect begin at the correct mouth, hand, weapon, tail, or impact point?
3. Does its direction and footprint match point, line, or area targeting?
4. Are damage type, conditions, and duration visually readable?
5. Is actor-owned motion kept on the actor sheet?
6. Is the PNG/WebP genuinely transparent with no checkerboard, label, frame, text, or watermark?
7. Does it remain readable at the game's actual token and tile size?
