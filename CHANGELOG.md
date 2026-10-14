# Changelog

## 2026-10-14 — [RELEASE] v0.1.0 — hermes-agent for emino

- First tagged release. Tag and release point at main HEAD `6663b734`.
- Ships five pet generators side by side: v1 `pixelpet.js`, v2 `wordpet2.js`, v3 `wordpet3.js`, v4 `wordpet4.js`, v5 `wordpet5.js`.
- v5 is the recommended one: 48 animals, own renderer, sentence, emoji line and seal.
- Demo pages built by `build.js` into `docs/` and served by GitHub Pages at https://eminogrande.github.io/wordpet/.
- `node test5.js` and `node test-pages.js` pass on `6663b734`.
- Docs: README gains Logs, Status, Architecture, User flow, Components, Run sections. CHANGELOG.md and PROMPTLOG.md added.

## 2026-09-09

- `6663b734` Fix the v5 page: it read `t.col`, which only v2 to v4 have, so the v5 page now renders.
- `b968ce9b` Add v5: own renderer with a softer look, 48 animals, larger vocabulary (1.47e14 identities).

## 2026-09-08

- `3533aa45` Add v4: four more slots (scene, worn item, both hands, companion) and outlined accessories.
- `96aa953f` Add v3: picture, sentence and emoji line all describe the same traits, with round-trip parsers.
- `85c52261` Add v2: describable pets with a spoken phrase and an independent emoji code.
- `fac46ca8` First commit: v1 deterministic pixel pet avatars from words.
