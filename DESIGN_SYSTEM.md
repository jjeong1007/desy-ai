# Desy design system: how to build the platform

This file is for AI agents building screens in this repo. Read it before you write any UI.

The design system comes from the Figma file **Desy → Product v0**
(`https://www.figma.com/design/824iCL7oo58guEQ2z8z1Ku/Desy?node-id=85-39`). The code mirrors it in
`src/styles/theme.css` (tokens) and `src/components/ui/` (components). Figma is the source of truth.

## The core rule

**Use only what already exists. Never invent design decisions.**

- Do not create new colors.
- Do not create new tokens of any kind: color, type, radius, shadow or size.
- Do not create new rules or conventions for the design system.
- Do not build new components from scratch.

If what you need doesn't exist, **stop and ask the user**. Don't pick a "close enough" value or
make something up, and don't plan to clean it up later.

## What you may decide on your own

**Spacing** is the only thing you may infer. That covers padding, margin and gap between elements
when you lay out a page.

- Use the 4px scale: `0.5` = 2px, `1` = 4px, `1.5` = 6px, `2` = 8px, `3` = 12px, `4` = 16px,
  `6` = 24px, `8` = 32px. For example `p-3`, `gap-2`, `mt-6`.
- Don't use off-scale values such as `p-[10px]` or `gap-[18px]`.
- When a Figma frame shows the spacing, match it.

You may also arrange existing components into a page layout (flex, grid, ordering, widths that fill
their container). Arranging them is fine. Styling them in a new way is not.

## What needs the user's approval first

Ask before doing any of these, even when it looks small:

| Change | Example |
|---|---|
| New color or color token | "A blue for info banners" |
| Using a color for a new purpose | Using `bg-highlight` as a card background |
| New type size, weight pairing, radius, shadow or layout size | `text-[13px]`, `rounded-[5px]`, a new shadow |
| New component | A dropdown menu, modal or toast |
| New variant or prop on an existing component | `Button variant="danger"` |
| Restyling a component at the call site | `<Button className="bg-... rounded-full">` |
| New design-system rule or convention | "Section headers are always uppercase" |
| Changing a token value | Editing a hex value in `theme.css` |
| A new icon library or custom SVG icons | Anything other than `lucide-react` |

## Colors

Use only these semantic tokens with Tailwind's `bg-`, `text-`, `border-`, `ring-` or `outline-`
prefixes. Never use primitives (`orange-500`, `gray-200`, `warm-950`), raw hex values or arbitrary
colors (`bg-[#...]`).

| Group | Tokens | Use |
|---|---|---|
| Surfaces | `canvas`, `subtle`, `muted`, `placeholder`, `highlight` | Page and card background, hovered/selected rows, image placeholders, highlighted transcript text |
| Brand | `brand`, `brand-hover`, `brand-active`, `brand-subtle`, `on-brand` | Primary actions, active nav/selection background, text on brand fills |
| Text | `fg`, `fg-secondary`, `fg-tertiary`, `fg-brand` | Primary, secondary, meta/placeholder, brand-colored text |
| Lines | `line`, `line-strong`, `focus` | Borders and dividers, focused input border, focus ring |
| Tags | `positive`, `positive-subtle`, `confusion`, `confusion-subtle`, `frustration`, `frustration-subtle` | Sentiment tags only (text on its matching `-subtle` background) |
| Tag palette | `tag-<hue>` and `tag-<hue>-subtle` for `red`, `rust`, `amber`, `yellow`, `green`, `emerald`, `teal`, `cyan`, `blue`, `indigo`, `violet`, `purple`, `pink`, `rose` | User-created tags only, through `<Tag variant="<hue>">`. AI-generated from the Figma tag colors, pending design review |
| Speakers | `speaker-self`, `speaker-other` | Transcript speaker names only |
| Canvas panels | `panel-line`, `panel-field`, `panel-fg`, `panel-fg-secondary`, `panel-fg-tertiary` | The Design Canvas Layers and Configuration panels only |
| Source control | `scm-line`, `scm-fg`, `scm-fg-secondary`, `scm-fg-tertiary`, `git-added`, `git-modified`, `git-deleted`, `git-renamed` | The Branch / source control panel only |

- Orange `#DF5732` is the **brand** color, not an accent.
- Keep each group to its listed use. For example, don't use `positive` for success messages or
  `panel-*` outside the canvas panels without asking.
- Some Figma colors are below WCAG AA contrast for small text (brand text, `fg-tertiary`,
  `speaker-other`). Don't "fix" them by swapping in other colors. If contrast matters for what
  you're building, tell the user.

## Typography, radius, shadows

**Type:** `text-page-title`, `text-heading`, `text-title`, `text-body`, `text-small`, `text-panel`
or `text-caption`, combined with `font-normal`, `font-medium` or `font-semibold`. Font is Geist
(`font-sans`), with `font-mono` for code.

**Radius:** `rounded-sm` (inputs, chips, nav items), `rounded-md` (buttons), `rounded-lg` (cards,
panels), `rounded-full` (avatars, pills).

**Shadows:** `shadow-ring`, `shadow-card`, `shadow-popover`.

**Layout sizes:** `w-(--width-sidebar)` and `h-(--height-topnav)`.

**Icons:** `lucide-react`. Most components size their child icons, so don't size icons by hand
inside them.

If none of these fits, ask. Don't add an arbitrary value.

## Components

Import everything from `@/components/ui`. Check this list before writing any markup.

| Area | Components |
|---|---|
| Core | `Button`, `IconButton`, `Tag`, `Card`, `Avatar`, `AvatarGroup`, `Checkbox` |
| Inputs | `SearchInput`, `TextInput`, `PromptInput`, `Kbd` |
| Navigation | `Sidebar`, `NavSection`, `NavItem`, `TeamSwitcher`, `TopNav`, `Logo` |
| Research | `TranscriptLine`, `SpeakerLabel`, `SelectionToolbar`, `Highlight`, `HighlightCard` |
| Canvas | `Tabs`, `LayerRow`, `PropertyInput`, `ChangedFileRow` |

Variants and props are listed in `README.md` and shown in Storybook (`npm run storybook`).

Pass layout classes such as width, margin or flex to a component's `className` when needed. Don't
pass classes that change how it looks (color, radius, font, shadow).

## When a page needs a component that doesn't exist

1. **Stop and ask the user before building it.** Say which page needs it, what it does, why the
   existing components can't cover it, and which tokens and components you'd build it from. Check
   the Figma file first, in case the component is already designed there.
2. **Wait for approval.** If the user declines, build the page with existing components or leave
   a clearly marked placeholder.
3. **If approved, build it from existing pieces:**
   - Compose existing components where you can, and use only the tokens listed above.
   - Put it in `src/components/ui/` and export it from `src/components/ui/index.ts`.
   - Add a Storybook story in `src/stories/` and flag it as AI-generated (see below).
   - Add it to the component table in `README.md` with "AI-generated" in the Figma source column.

### Flagging AI-generated components in Storybook

Every component that wasn't designed in Figma must carry the `ai-generated` tag and a notice in its
docs description, so designers can find it and review it:

```tsx
export default {
  title: "Core/Dropdown",
  component: Dropdown,
  tags: ["ai-generated"],
  parameters: {
    docs: {
      description: {
        component:
          "⚠️ **AI-generated, not from Figma.** Created for <page name> on <YYYY-MM-DD>. " +
          "Needs design review before it is treated as part of the design system.",
      },
    },
  },
} satisfies Meta<typeof Dropdown>;
```

Also add a short comment above the component in its source file:

```tsx
/** Dropdown — AI-generated, not from Figma. Created for <page name>. Pending design review. */
```

## How to ask

Keep the question short and concrete, and offer the closest existing option:

> The Settings page needs a toggle switch. Nothing in `@/components/ui` covers it. Figma's
> Configuration panel has a toggle visual (node 201:5315) but no component. I'd build `Switch` from
> `bg-brand`, `bg-line` and `rounded-full`, and flag it as AI-generated in Storybook. Should I go
> ahead, or use a `Checkbox` instead?

## Checklist before you finish

- [ ] No raw hex values, arbitrary colors or primitive color classes.
- [ ] No new tokens, and no arbitrary type, radius or shadow values.
- [ ] Spacing is on the 4px scale.
- [ ] All UI comes from `@/components/ui`, with no restyling at the call site.
- [ ] Any new component was approved by the user, is exported, has a story tagged `ai-generated`,
      and is listed in `README.md`.
- [ ] Every `IconButton` has a `label`, and focus outlines are intact.
