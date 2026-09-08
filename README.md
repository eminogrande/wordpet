# Wordpet

Deterministic pixel pets from words. The same string always draws the same creature, on every
machine, in every browser, forever.

Three versions ship side by side. None replaces the one before it.

| | v1 | v2 | v3 |
| --- | --- | --- | --- |
| Demo | **[/](https://eminogrande.github.io/wordpet/)** | **[/v2](https://eminogrande.github.io/wordpet/v2/)** | **[/v3](https://eminogrande.github.io/wordpet/v3/)** |
| Module | `pixelpet.js` | `wordpet2.js` | `wordpet3.js` |
| Hash | FNV-1a x4, 128 bit | SHA-256, sliced into 16 fields | same, reuses the v2 renderer |
| Output | a picture | picture, sentence, separate emoji code | picture, sentence and emoji that all say the same thing, plus a separate seal |
| Identities | 445,906,944,000 | 559,054,848 + 4,410,780 codes | 46,559,232 + 2,803,080 seals |
| Good for | avatars | verifying a payment in English | verifying a payment in any language |

![v3 pets](preview3.png)

```js
const t = Wordpet3.traitsFor('emino');
t.petName     // 'Green Seal'
t.emojiLine   // '🟢🦭 🟠🪖 👀 🚫 🍦'
t.phrase      // 'the green seal, orange helmet, big eyes, bare feet, holding an ice cream'
t.seal        // ['🔬','🎾','🧭']
t.fingerprint // full SHA-256 hex
Wordpet3.render(t, 0, false);            // 2304 hex colours or nulls
Wordpet3.parseEmoji(t.emojiLine);        // the traits, read back out of the emoji alone
```

## Which one to use

**v3** if people who do not share a language have to check each other, or if you want the check to
be teachable to a child. **v2** if everyone reads English and you want the largest identity space
per spoken word. **v1** if it is only ever decoration.

## Why v2 exists

v1 makes a picture. Comparing pictures is a private act: you cannot say a picture down a phone
line, and a person glancing at one registers maybe nine bits of it, which is 221 ground addresses
away from a convincing forgery.

v2 turns the identity into a sentence. The hash picks words from fixed vocabularies in a fixed
slot order, and the renderer draws that sentence. The description is therefore canonical rather
than subjective, so two people always describe one pet with the same words, and verification
becomes something two humans can do out loud.

The emoji code is deliberately **not** a description of the pet. It reads digest bits the phrase
never touches, so matching the phrase does not hand an attacker the code, and the two costs
multiply instead of overlapping.

## Why v3 exists

v2's emoji code deliberately described nothing. That bought the most security per emoji, and it
cost comprehension: the code was a second thing to check rather than a second way to read the
first thing.

v3 takes the opposite trade. Five slots, five emoji groups, five parts of the drawing, and the
emoji line is a literal transcription of the sentence:

```
Green Seal
🟢🦭  🟠🪖  👀  🚫  🍦
the green seal, orange helmet, big eyes, bare feet, holding an ice cream
seal 🔬🎾🧭
```

`🟢🦭` is "green seal". `🟠🪖` is "orange helmet". `🚫` in the shoe slot is "bare feet". Someone who
reads no English can still check every slot.

This is not a claim, it is a round trip. `parsePhrase` rebuilds the traits from the sentence alone
and `parseEmoji` rebuilds them from the emoji alone, and `test3.js` checks both against the
original on 150,000 pets. If a word, an emoji or a drawn part ever drifted, the test fails.

**What the rule costs.** The vocabulary shrinks to what can be drawn **and** named **and** given an
unmistakable emoji, which is the tightest of the three constraints:

- Colours drop from 12 to 9. Turquoise, pink and grey have no emoji circle every vendor draws the same.
- Coat patterns are gone entirely. No emoji reliably means "striped".
- Hats drop from 16 to 8. Beanie, halo, headband and chef hat have no object emoji.
- The movement trait is gone. Every v3 pet has one idle bob, because a moving pet that no word
  names would break the rule.

Result: 46,559,232 identities against v2's 559 million. That is the price of the correspondence,
and it is why the seal exists.

**The seal** is three emoji drawn from a pool of 142 that name no trait, read from digest fields
the sentence never touches. It is presented separately in the UI because it is a different kind of
thing. Identity and seal together are 46.9 bits.

## The v2 phrase

Nine slots, fixed order, every one visible in the still image and nameable by a child.

| Slot | Options | Example |
| --- | --- | --- |
| Coat pattern | plain, spotted, striped, patched | spotted |
| Body colour | 12 unambiguous names | blue |
| Species | 32 | elephant |
| Headwear | 16 including no hat | top hat |
| Headwear colour | 8 | white |
| Eyes | 8 | closed eyes |
| Shoes | 4 including bare feet | boots |
| Shoe colour | 8 | black |
| Held item | 16 including nothing | sword |

The pet's short name is the first two slots, so everyone is "the Blue Elephant" in casual use and
the full sentence is the long form when it matters.

Species is a preset that owns the silhouette: snout, ears, neck length, back, tail, limb type and
body proportion. The 32 are chosen to be distinct by shape **and** by sound. No crocodile beside
alligator, no crow beside raven, no dog beside frog.

Two consistency rules are enforced by the tests, because a sentence that disagrees with the
picture teaches people to ignore the picture:

- A species with no drawn feet is never described as wearing shoes.
- The article before a held item matches the word: an umbrella, a sword.

## Determinism

All three use only integer arithmetic, `Math.imul`, `Math.round`, `Math.abs` and division by
powers of two in the drawing path. There is deliberately no `Math.sin`, `Math.cos`, `Math.sqrt` or
`**`, because those are not required to be bit-identical across JavaScript engines, and one
unit-in-the-last-place of difference flips a pixel after rounding. The one curved tail in v1 is
stored as a literal pixel table for exactly that reason. The tests enforce this.

Nothing reads the clock, the locale, the platform or a random source. v2's SHA-256 is checked
against Node's `crypto` on every block boundary and on non-ASCII input.

**Normalisation differs between versions, on purpose.**

- v1 folds to `[a-z0-9-]`, so `eminö` and `emino` are one pet. Fine for a friendly avatar.
- v2 and v3 fold case and punctuation only and keep letters as they are, so `eminö`, `emino` and
  `eminо` with a Cyrillic o are three different people with three different pets. For a lookalike
  check, collapsing them would hide exactly the attack you are looking for.

## Threat model

Measured, not estimated. Reproduce with `node test.js`, `node test2.js`, `node test3.js`, `node grind.js`.

### Accidental collisions

| Users | v1 | v2 | v3 |
| --- | --- | --- | --- |
| 10,000 | 0.00% | 0.00% | 0.02% |
| 100,000 | 0.00% | 0.02% | 0.21% |
| 1,000,000 | 0.00% | 0.18% | 2.12% |
| 10,000,000 | 0.00% | 1.77% | 19.33% |

v3's row is the honest cost of a vocabulary a person can actually say. At ten million users, one
in five would share an identity with somebody. That is fine for recognising your own contacts and
not fine as a global uniqueness claim, so do not make one.

v1 has the larger raw space, because 360 free hues buy combinations cheaply. v2 trades that away
for nameability, which is the right trade: a hue nobody can say is worth nothing in a verbal check.

One million sampled usernames in v2 produced 995,963 distinct phrases and 1,000,000 distinct
phrase-plus-emoji pairs.

Global uniqueness is also the wrong target. You never compare yourself against ten million
strangers, only against your own address book. For a user with 100 saved contacts, the chance any
two of them collide is around two in a million. The claim to make in the product is "no two people
you deal with will have the same pet", which is true, and not "your pet is unique in the world",
which is not.

### Deliberate collisions

An attacker does not need your exact pet. They need one you will not question. Measured on one
laptop core at 343,643 candidates per second, and again at 10,000 times that rate for a serious
GPU grinder:

| Identity being forged | States | One core | 10,000x |
| --- | --- | --- | --- |
| v1, at a glance: colour, hat, shape | 480 | instant | instant |
| v1, a careful look | 737,280 | 2.5 s | instant |
| v2, colour and species and hat only | 6,144 | instant | instant |
| v2, the whole phrase | 559,054,848 | 27 min | 0.2 s |
| v3, the full three-way identity | 46,559,232 | 2.5 min | instant |
| **v3, identity and seal** | **1.31e14** | **13.4 years** | **11.7 h** |
| **v2, phrase and emoji code together** | **2.47e15** | **227 years** | **8.3 days** |

That last row is the only one in this table that is safe to gate a payment on, and only if the
person actually reads both the sentence and the code. A glance is worth nothing no matter which
version renders it.

**Use it as a reject signal.** A wrong pet means stop. A right pet is not proof, and for anything
irreversible the address still has to be checked in full.

## API

No dependencies, no build step, browser and Node.

```html
<script src="wordpet2.js"></script>   <!-- window.Wordpet2 -->
```
```js
const Wordpet2 = require('./wordpet2.js');
```

| Call | Returns |
| --- | --- |
| `traitsFor(name)` | traits, `phrase`, `segments`, `petName`, `emoji`, `fingerprint`, `col`, `words` |
| `render(traits, phase, blink)` | flat array of hex strings or `null`, `W * H` long |
| `motion(traits, f)` | `{dx, dy, sx, sy, rot}` for animation frame `f` in `0..1` |
| `segmentsOf(traits)` | `[{text, trait, slot}]`, the sentence split into slots for highlighting |
| `emojiGroupsOf(traits)` | v3 only: `[{slot, emoji, says}]`, one group per sentence slot |
| `parsePhrase(str)` / `parseEmoji(line)` | v3 only: read the traits back out of either view |
| `normalize(name)` | the canonical string that gets hashed |
| `sha256(str)` | the raw 32-byte digest |

v1 exposes the same shape as `window.PixelPet` minus the phrase parts. `phase` is `0..3` and drives
limbs, tail and hat wobble; ignore it and `blink` for a still avatar.

Build the sentence UI from `segments`, not by matching words against the rendered phrase. Both come
from one list, so they cannot drift apart.

## Files

| File | Purpose |
| --- | --- |
| `pixelpet.js` | v1 algorithm |
| `wordpet2.js` | v2 algorithm and the shared renderer |
| `wordpet3.js` | v3 vocabulary, emoji transcription and parsers; needs `wordpet2.js` |
| `page*.html` | UI templates, each with inlining markers |
| `build.js` | writes `artifact*.html` and `docs/**/index.html` |
| `test.js`, `test2.js`, `test3.js` | determinism, agreement, round trips, collision maths |
| `grind.js` | v1 deliberate-forgery cost |
| `preview*.js` | contact sheets |

```
node test.js && node test2.js && node test3.js   # correctness, determinism, round trips
node grind.js                                   # forgery cost
node preview.js && node preview2.js && node preview3.js
node build.js                                   # rebuild all three pages
```

## Licence

MIT
