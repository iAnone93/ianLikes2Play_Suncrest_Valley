# Suncrest Valley - Stage 1 Plan

Nov 17, 2026 · @ian

## Goal and scope

Stage 1 is a small, fully playable farming game on one map: grow three Spring crops, sell them, and earn 500G to restore the Homestead Banner.

- **Included:** simple Start screen, one farm map, hoe, watering can, 3 crops, shipping bin, sleep and day cycle, 1 auto-save slot.
- **Not included:** seasons, weather, backpack, crafting, villagers, pets, survival mode, audio, particles.
- **Platform:** desktop only (keyboard and mouse). Touch support is not planned for Stage 1.

## Game rules

All numbers below are starting suggestions. Adjust them after you playtest.

### Crops (Spring only, no regrow)

| Crop | Seed cost (G) | Grows in (days) | Sells for (G) | Profit (G) |
| --- | --- | --- | --- | --- |
| Turnip | 20 | 3 | 45 | 25 |
| Potato | 40 | 5 | 90 | 50 |
| Strawberry | 60 | 4 | 130 | 70 |

A crop only grows on days it was watered. Unwatered crops pause but do not die.

### Money and goal

- Start with 100G on Day 1 at 06:00 AM.
- Goal: earn **500G in total** to restore the Homestead Banner. Total earned counts, not gold held, so buying seeds never moves you backward.
- At 500G, show a "Banner restored!" message. The game keeps going as free play.
- Expected pace: about 10 to 12 days if you plant turnips first and reinvest. If it is much slower or faster, change the sell prices.

### Stamina

- Max stamina is 100. Hoe costs 2, watering costs 1. Planting and harvesting cost 0.
- At 0 stamina, hoe and watering are blocked with a "Too tired" message. Walking, planting, and harvesting still work.
- Sleeping in bed restores stamina to full.

### Time

- One game minute passes per real second, so a day (06:00 to 24:00) takes about 18 real minutes.
- At 24:00 the player passes out and wakes at 06:00 the next day with 50% stamina.
- After Day 10, Spring repeats until Stage 2A adds real seasons.

### Map

- One farm plot of 6 by 4 tiles (24 tiles), plus Farmhouse (bed), Shipping Bin, Well, and Seed Shop Stall.
- With 100 stamina, the player can till and water most of the plot in one day, so the limit matters without being annoying.

## Technical notes

- **Game loop:** run the simulation in a plain TypeScript engine with `requestAnimationFrame` and `dt = Math.min(rawDt, 0.05)`. Keep it separate from React.
- **Input:** track `held` keys (movement) and `justPressed` keys (actions) separately. Clear all held keys on `window.blur` so the player never gets stuck walking.
- **Save version:** write `saveVersion: 1` into the save data from the first day. Later stages change the data, and this lets old saves be upgraded instead of lost.
- **HUD clicks:** the HUD wrapper uses `pointer-events: none` so it does not block the canvas, but every button inside it must set `pointer-events: auto`, or it will not be clickable.
- **Sprites:** start with plain colored squares. Add code-drawn pixel sprites last (task 13).

## Task list

Build in this order. Real sprites come last on purpose, so you have a working game before you decide how it looks.

1. **Project setup.** Canvas, game loop, input handling (`held` and `justPressed`), clear keys on `window.blur`.
2. **Save format.** Add `saveVersion: 1` to the save data.
3. **Placeholder map.** Colored squares for grass, soil, water, house, bin, well, and shop.
4. **Player movement.** WASD and arrow keys, collision, facing direction.
5. **Hoe and watering can.** Till soil, water tiles, refill at the well, apply stamina costs.
6. **Seed shop and planting.** Buy seeds, plant them, track growth stages.
7. **Harvest and shipping bin.** Harvest ripe crops and put them in the bin.
8. **Time and sleep.** Clock, passing out at 24:00, bed, and the End-of-Day Ledger (earnings and total gold).
9. **HUD.** Day, clock, gold, stamina, and the 10-slot quick bar. Set `pointer-events: auto` on HUD buttons.
10. **Title screen.** Title, control hint, Start button, and Continue if a save exists.
11. **Auto-save.** Save on sleep, load on Continue.
12. **Goal.** The 500G total-earned check and the "Banner restored!" message.
13. **Real sprites.** Replace placeholders with code-drawn pixel sprites.

## Sprite checkpoint and Done when

After task 13, look at the farmer, crops, and tiles at normal game size. If they look rough, switch to a free pixel asset pack now. This is much cheaper than changing later, when villagers and pets exist.

Stage 1 is finished when all of these are true:

- [ ] Start enters the farm at 06:00 on Day 1 with 100G and smooth 60fps movement.
- [ ] You can buy seeds, till, plant, water, refill at the well, harvest, and ship all three crops.
- [ ] Stamina blocks the hoe and watering can at 0, and passing out at 24:00 works.
- [ ] Reaching 500G total earned shows the "Banner restored!" message.
- [ ] Refreshing the page and pressing Continue restores crops, day, gold, and stamina.
- [ ] HUD buttons are clickable and the canvas still receives clicks.

## Notes for later stages

These do not block Stage 1. Handle them when you reach those stages.

- **Stage 3 is too big.** Split it into 3A (villagers, quests, new map areas) and 3B (cooking, pet companion).
- **Stage 4 has two big jobs.** Split it into survival mode and the 3-slot save system.
- **Season length.** A 10-day season is short. Check crop growth times again in Stage 2A.
