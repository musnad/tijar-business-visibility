# TIJAR Website

## Overview
Build a complete mobile-first public website for TIJAR that communicates “learn, run, verify, grow, and become visible” within one minute. The experience will use a premium, restrained visual system: mostly white, deep green, warm gold, generous spacing, clear icons, and highly readable sans-serif typography.

## Pages
- **Home:** Full requested narrative from hero through problem, product pillars, learning example, business visibility, three-step flow, business categories, languages, and final CTA.
- **How TIJAR Works:** A focused explanation of the Learn → Run → Verify → Become Visible journey, with static product previews.
- **Learn:** Short lesson format, progress and XP examples, and plain-language learning benefits.
- **Business Visibility:** Verification and public business profile explanation, with the Aisha Foods example.
- **About:** TIJAR’s purpose, audience, philosophy, and long-term business growth vision.
- **Contact:** A simple accessible contact form and clear expectations without invented contact details.
- **Get Started:** The requested waitlist form and post-submission confirmation. Submission will remain an in-page prototype rather than claim persistent storage.
- **Privacy Policy and Terms:** Clear, concise placeholder legal pages that avoid invented company details.

## Shared Experience
- Sticky navigation with desktop links, a mobile menu, Sign In, and prominent Get Started action.
- Reusable wordmark, buttons, section headings, feature cards, app-screen mockups, lesson card, business profile card, CTA bands, and footer.
- All Get Started actions route to the waitlist page; Download TIJAR remains an honest coming-soon action instead of linking to a nonexistent store listing.
- Responsive smartphone mockups for Home, Record, Learn, and Business, using only the requested example data.
- Restrained entrance and interaction motion with reduced-motion support.
- Accessible focus states, high contrast, large touch targets, semantic structure, and short readable copy.

## Visual Direction
- Deep green for trust and growth, warm gold for emphasis, neutral white/charcoal surfaces.
- Clean TIJAR text wordmark with a small, simple visibility/growth symbol.
- No stock photography, decorative cultural clichés, fake social proof, fake metrics, gradients, or financial-app styling.
- Friendly geometric shapes and product UI previews will provide visual richness while keeping pages fast.

## Technical Details
- TanStack Start file-based routes, with unique SEO metadata on every page.
- Tailwind v4 semantic tokens defined centrally and reused throughout.
- Small typed data structures for repeated content and focused React components for the shared site shell and previews.
- Zod validation for waitlist and contact forms, with clear inline errors and accessible success states.
- No authentication, database, or external API in this phase.
- Verify the central navigation and waitlist flow on desktop and mobile, plus automated route/build checks.
