# Conductor Foundation Spec
**Project:** The Luminous Deep
**Type:** Immersive Narrative Platform
**Status:** Foundation Lock (v1.0)

## 1. Product Intent (Why This Exists)
The Luminous Deep is a narrative-first, immersive digital environment that behaves more like a living place than a traditional website.
It is designed to:
- Tell interconnected stories through space, atmosphere, and discovery
- Encourage curiosity rather than consumption
- Allow non-technical creators to publish evolving content without breaking immersion
- Demonstrate a human–AI co-creation model (VectisONE) in a calm, emotionally grounded way

The platform must feel quiet, intentional, and spatial, never noisy, gamified, or sales-driven.

## 2. Core Experience Model (Mental Model)
The system operates as a Living House.

**Core Loop**
1. **Scene:** A full-screen, looping visual environment (video or image) representing a physical place.
2. **Object:** Subtle, discoverable interaction points embedded in the scene (hotspots).
3. **Reveal:** A soft, glassmorphic overlay that delivers narrative payloads (Text, Audio, Video, Linked artifacts).

There is no scrolling feed. Navigation is spatial, not linear.

## 3. Primary Sections (Canonical Areas)
The site is divided into three persistent narrative domains. These names are locked.

**🛠️ The Workshop**
- **Purpose:** Creation, experimentation, emergence
- **Tone:** Curious, lively, unfinished
- **Owner Voice:** Cassie
- **Content:** Sketches, Planners, Tools, prompts

**🏛️ The Study**
- **Purpose:** Reflection, story, memory
- **Tone:** Calm, literary, grounded
- **Owner Voice:** Eleanor
- **Content:** Essays, Letters, Personal reflections, Audio readings

**⚓ The Boathouse**
- **Purpose:** Systems, structure, architecture
- **Tone:** Technical, restrained, maritime
- **Owner Voice:** Julian
- **Content:** Diagrams, Blueprints, Technical logs

## 4. Navigation Rules (UX Constraints)
- Navigation is persistent but minimal.
- Bottom-center pill navigation: [Home] [Workshop] [Study] [Boathouse]
- No hamburger menus, breadcrumbs, or pagination metaphors.
- Users move through rooms, not pages.

## 5. Asset & Scene Constraints (Non-Negotiable)
**Scene Backgrounds**
- Video-first where possible.
- Muted audio (ambient added separately).
- Looping, seamless.
- Center-safe framing (mobile crop tolerant).

**Objects / Hotspots**
- Must be visually motivated (light, motion, placement).
- Never more than 3–5 per scene.
- Never flashing or animated aggressively.
- Discovery > instruction.

**Reveals**
- Glassmorphic modal.
- Soft motion (fade / slide).
- Dismissible without penalty.

## 6. Content Architecture (Backend Truth)
All content is data-driven, not hardcoded.
Each object reveal is backed by:
- A unique ID
- A scene reference
- A content payload (text/audio/video)
- Tags for: Section, Tone, Chronology, Visibility state

## 7. Identity & Access (Foundation Layer)
- Clerk is used for authentication.
- Anonymous users can explore.
- Authenticated users unlock: Saved progress, Private drafts (future), Studio access (admin only).
- No social feeds. No public comments.

## 8. AI & Agent Role (VectisONE Alignment)
AI agents are assistive, never authoritative.
- **Allowed:** Suggest copy, Summarise content, Generate drafts, Maintain consistency.
- **Forbidden:** Publish autonomously, Alter canonical content without approval, Break tone.
- **Human-in-the-loop:** Mandatory for Publishing, Deleting, and Structural changes.

## 9. Explicit Non-Goals
❌ Not a blog platform
❌ Not a marketing site
❌ Not a SaaS dashboard
❌ Not a social network
❌ Not a game with scores, timers, or rewards

## 10. Success Criteria
- A first-time visitor understands how to explore without instructions.
- Content can be added without developer involvement.
- The experience feels calm on desktop and mobile.
- The site invites return visits without notifications.
