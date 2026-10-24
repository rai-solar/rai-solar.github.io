# Type / Matter — research references

**Context:** Visual research for a prospective `raimundo.solar` portfolio, especially a restrained, selectable-HTML-text transition in which the top of the letterforms softens, melts, erodes, or burns downward and a new phrase resolves into a crisp font.

**Design decision (17 October 2026):** Prefer **Codrops' “Dreams”** over flamboyant liquid/fire simulations; keep the typography *actual HTML text* with a normal web font, selectable and accessible, not flattened to canvas, SVG outlines, 3D or images. Make the deformation **progress from top to bottom**. The user particularly wants the **upper parts to travel down / splat before lower parts**.

This is a **reference inventory from the conversation**, not an assertion that every linked site is currently online or that every animation has been retested. Priority items below were checked as public pages; some other links were supplied in earlier research but not independently revalidated in this handoff. References are for inspiration and analysis, not permission to copy their code or identity.

## A. Highest-priority references — actual HTML text, restrained typographic effects
xx
1. **Codrops — Scroll-based SVG Filter Animations on Text (especially `Dreams`)**  
   Demo: https://tympanus.net/Development/OnScrollSVGFilterText/  
   Article: https://tympanus.net/codrops/2024/08/22/scroll-based-svg-filter-animations-on-text/  
   Source code reference: https://github.com/codrops/OnScrollSVGFilterText/  
   **Priority: highest.** Developer describes SVG filters applied to HTML headings, with experimental animations (Dreams, Wave, Unreal, Fear, Deception, Delete). The user's favorite visual treatment is **Dreams**. The source demo is scroll/replay based; our project must be an independent time-based *word-to-word* transition. Important: evaluate the **directionality** of its visual distortion; the desired version proceeds top → bottom.

2. **bleibtgleich'26 — Maksym Ponomarenko**  
   Site: https://bleibtgleich.dev/  
   Case study: https://tympanus.net/codrops/2026/09/23/bleibtgleich26-a-180-turn-from-brutalism-to-minimalism/  
   **Priority: high, not exact.** A restrained, blurred/liquid text-reveal aesthetic. The user likes it somewhat but prefers the Dreams direction and a physically descending transition. Investigate blur-to-crisp rhythm, not the visual identity itself.

3. **Codrops — Morphing Gooey Text Hover Effect**  
   Demo: https://tympanus.net/Development/GooeyTextHover/  
   **Priority: medium.** Filtered live DOM typography in navigation. More interactive than the intended looping headline, but useful for SVG blur/threshold strategies.

4. **Codrops — Inspiration for Text Block Transitions**  
   Demo: https://tympanus.net/Development/TextBlockTransitions/  
   **Priority: medium.** Many approaches to transitioning between two passages. Compare semantic word swaps and visual rhythms.

5. **Codrops — Type Shuffle Animation**  
   Demo: https://tympanus.net/Development/TypeShuffleAnimation/  
   **Priority: low for this prototype.** Useful baseline for text transformations but scrambling is not a melt/erosion effect.

6. **CSSScript / argyleink — Morphing text / gooey transitions**  
   https://www.cssscript.com/morphing-text-gooey-transitions/  
   **Priority: medium.** Blur + contrast soft-word replacement. Often reads like generic crossfade; avoid making this the only effect.

7. **FWD Tools — Gooey Text Morph**  
   https://fwdtools.com/ui-snippets/gooey-text/  
   **Priority: medium.** Simple word-to-word gooey transition. Check whether it retains DOM text when adapting.

8. **Sanna Granqvist — Melty Gooey Text**  
   https://melty.framer.website/  
   **Priority: medium.** Adjustable typography distortion using turbulence. May be too rubbery unless dialed down.

9. **MDN — `feMorphology`**  
   https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feMorphology  
   **Technical reference.** Erode/dilate live glyph rendering without outlining it. Pair with top-down clipping for the gentle burning/eroding concept.

10. **MDN — `feDisplacementMap`**  
    https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feDisplacementMap  
    **Technical reference.** Render filtered HTML text with SVG turbulence and a displacement map; check filter bounds and Safari/Firefox behavior.

11. **MDN — CSS `clip-path`**  
    https://developer.mozilla.org/en-US/docs/Web/CSS/clip-path  
    **Technical reference.** Suitable for progressively exposing real DOM letters at an irregular vertical front.

## B. Text transformation and kinetic typography — portfolio/studio research

12. **LA MORT — A Collective Mystery School** — https://www.lamort.org/  
    The original inspiration: “A Collective Mystery School in service of…” with rotating / typed / erased completion words. This is **semantic animation**, distinct from physical glyph deformation.

13. **Jonas Reymondin** — https://jonasreymondin.com/  
    Case study: https://tympanus.net/codrops/2026/03/16/jonas-reymondins-portfolio-reclaiming-the-ui-eye-through-systems-code-and-pixel-motion/  
    Typing / pixel / scramble references, precise layout.

14. **Thibault Guignand** — https://www.thibaultguignand.com/  
    Case study: https://tympanus.net/codrops/2026/05/06/from-shader-uniforms-to-clip-path-wipes-how-gsap-drives-my-portfolio/  
    Character scramble, masking, coherent motion language.

15. **Stefan Vitasović** — https://stefanvitasovic.dev/  
    Case study: https://tympanus.net/codrops/2025/03/05/case-study-stefan-vitasovic-portfolio-2025/  
    Graphic segmented typography, motion and restrained layout.

16. **DIA Studio** — https://dia.studio/  
    Kinetic identity and typographic systems; study aesthetics of living typography rather than implementation specifics.
xx
17. **HOLOGRAPHIK** — https://www.holographik.co/  
    Example animation: https://dribbble.com/shots/16174007-Kinetic-Typography  
    Expressive high-end brand/motion direction (more maximal than brief).

18. **Andreas Gysin** — https://andreasgysin.com/  
    LCD 1: https://lcd.ertdfgcvb.xyz/  
    Generative typography, procedural visuals and intelligent constraints.

19. **Roman Jean-Elie** — https://www.romanjeanelie.com/  
    Case study: https://tympanus.net/codrops/2025/11/27/letting-the-creative-process-shape-a-webgl-portfolio/  
    Spatial/WebGL type morphing. **Not** a suitable implementation strategy here; useful conceptual study.

20. **Studio Freight** — https://studiofreight.com/  
    Editorial motion and typographic page transitions; referenced in discussion of typewriter reveal.

21. **Codrops — Interlude / Typewriter transitions** — https://interlude.crnacura.workers.dev/  
    Includes typewriter transition variants. Useful for rhythm and swapping narrative statements, but not our preferred material effect.

22. **Joe Chung / Flamegame — Gestalt** — https://flamegame.studio/projects/gestalt  
    Geometric type construction; deliberately more graphic than the requested direction.

## C. Actual liquid / fire / material studies — mostly too literal for current brief

23. **Artificial Noodles — The Melt** — https://www.artificialnoodles.com/archive/the-melt/  
    Process: https://www.artificialnoodles.com/blog/the-melt/  
    Word turns into fluid and back. Excellent **physical idea** but visually too illustrative/literal to copy.

24. **PADU Studio** — https://padu.studio/  
    Project explanation: https://alasu.works/projects/padu-studio/  
    Gooey/metaball-type interactive lettering. Extract restraint/material behavior rather than brand graphics.

25. **edum — Procedural Liquid Text Transition** — https://dribbble.com/shots/14062461-Procedural-Liquid-Text-Transition  
    Motion concept, not an HTML-text website.

26. **edum — Liquid Ice Typography** — https://dribbble.com/shots/14247672-Liquid-Ice-Typography  
    Motion concept, not an HTML-text website.

27. **Sharon and Guy — Melt** — https://www.sharonandguy.com/projects/melt  
    Dyed-ice typographic experiments, physical material inspiration, not DOM implementation.

28. **Oded Ezer — Memory Palace** — https://a-g-i.org/design/memory-palace  
    Physical alteration/destruction of lettering, useful for erosion visual language.

29. **Ksenia Kondrashova — On-Scroll Fire Transition** — https://codepen.io/Jaybird-Farrow/pen/qBGZqPE  
    Noise/burn-front idea; much too literal to import wholesale. The desired site has no flames or particle smoke.

30. **Joseph Santamaria** — https://joseph-san.com/  
    Ink-spreading / burning-paper interface transition referenced in previous research. Not a confirmed word-morph example.

31. **Matt Rothenberg — HTML in Canvas / The Burn Transition** — https://mattrothenberg.com/notes/html-in-canvas/  
    Shader/browser experiment; impressive but explicitly **not compatible** with the user's ordinary selectable-DOM-first requirement. Some demo features may need experimental Chrome.

## D. Broader editorial, high-end, playful personal-website references

These were discussed to frame the broader identity; not all feature the desired effect.

32. **Gabe Ferreira** — https://gabeferreira.com/ — refined design/development reference.
33. **Bryant Codes Art** — https://bryantcodes.art/ — playful expressive web portfolio.
34. **Corentin Bernadou** — https://corentinbernadou.com/ — Swiss-inspired graphic systems and subtle experimentation.
35. **Rauno Freiberg** — https://rauno.me/ — precise, restrained interaction design.
36. **Tiger Dingsun** — https://tiger.exposed/ — multidisciplinary personal web identity.
37. **Vera van de Seyp** — https://veravandeseyp.com/ — graphic design + computational typography.
38. **Studio Feixen** — https://www.studiofeixen.ch/ — Swiss visual identity that combines rigor and play.
39. **Lynn Fisher** — https://lynnandtonic.com/ — experimental personal websites / CSS.
40. **Laurel Schwulst** — https://laurelschwulst.com/ — personal website as a creative place.
41. **Jules Esick** — https://www.julesesick.com/ — playful project browsing.
42. **Hannah Bohnen** — https://hannahbohnen.de/ — tactile object-based interaction.
43. **Bruno Simon** — https://bruno-simon.com/ — fully interactive 3D portfolio, not the desired approach.
44. **Simon Müller** — https://www.seimon.ch/ — Swiss cross-disciplinary web/editorial portfolio.
45. **Hoverstat.es archive** — https://www.hoverstat.es/archive/ — independent interaction discovery archive.
46. **Codrops** — https://tympanus.net/codrops/ — demos and construction articles.
47. **EDITORA** — https://editora.jp/ — website cited by Codrops as inspiration for its SVG-filter article, created by MisatoDaiq / Garden Eight.
48. **Garden Eight** — https://garden-eight.com/ — studio credited in Codrops' SVG-filter article.

## Implementation principles

- **Actual HTML text:** visible word(s) should be real text nodes (`<span>`, `<h1>`), with CSS/SVG filters applied to those nodes. Never outline text as SVG glyph paths or rasterize to `<canvas>`, videos, images or shaders that replace the underlying text.
- **Top-down physical movement:** define a travelling melt/erosion front along the *vertical axis of the glyph box*. Upper portions soften/detach and fall first, lower portions remain crisp until the front reaches them.
- **Material behavior, not special effects:** “melting” can be a small localized drift/sag + softness; “burning” can be a tiny uneven erosion and optional ink-colored edge. Do not add smoke, realistic fire or reflective 3D liquid.
- **Word-to-word:** A dissolves, B becomes readable, and the typography returns to the exact original font weight, kerning, color, antialiasing and position.
- **Comparison:** demonstrate multiple treatment approaches side by side, same words, same typeface, same duration so differences can be judged fairly.
- **Accessibility and robustness:** keep accessible live text; decorative strips must have `aria-hidden=true`; ensure reduced motion, Firefox/Safari/Chrome checks and a readable no-JS fallback.

## What to investigate next

1. Is Codrops Dreams' strongest visual detail created by `feDisplacementMap`, `feTurbulence`, blur, or their timing/order? Inspect the **source repo**, do not assume.
2. Which combination best suggests **upper ink/liquid falling and splatting over the lower characters** without looking like a bad glitch?
3. How can vertical slices of real HTML text sag subtly while avoiding duplicate-selectable text and excessive DOM rendering?
4. Does an irregular CSS `clip-path` front look refined enough, or should the front be constructed with an SVG mask/filter on HTML text?
5. Test the chosen effects with a **thin serif, a medium sans, and a long phrase** at 390px mobile width.

_Last edited: 17 October 2026._

## Source inspection — 18 October 2026

- https://raw.githubusercontent.com/codrops/OnScrollSVGFilterText/main/js/filter2.js — Dreams controller: applies an SVG filter to HTML text and animates blur (20→0), displacement (100→0), turbulence frequency (0.1→0.05), plus opacity with GSAP. This is a whole-element reveal, without a vertical consumption/regrowth front. Source read through the web tool; live motion could not be visually reviewed in this environment. No third-party animation code was imported.
