# Luminous Deep — Naming & Tagging Standard (v1)

This document serves as the authoritative source for file naming and metadata tagging within the Luminous Deep ecosystem. All assets and database entries must adhere to this standard to ensure system scalability and consistent parsing.

## 1. File Naming Convention
All assets (images, video, audio) uploaded to Cloudinary or referenced in the code must follow this strict format:

`LD_<Place>_<Type>_<Description>_<Variant>.<Extension>`

### Segments
1. **Prefix**: Always `LD` (Luminous Deep).
2. **Place**: The domain or location the asset belongs to.
   - `Home` (or `Seagrove`)
   - `Workshop`
   - `Study`
   - `Boathouse`
3. **Type**: The architectural role of the asset.
   - `Scene` (Backgrounds, full-screen media)
   - `Object` (Interactive items, icons)
   - `Reveal` (Content displayed inside a card)
   - `UI` (Interface elements)
4. **Description**: 1-3 words describing the content (CamelCase or underscore_separated).
5. **Variant** (Optional): Versioning or state.
   - `v1`, `v2`
   - `Draft`, `Final`
   - `Bw` (Black & White), `Color`

### Examples
- **Home Background Video**: `LD_Home_Scene_HeroVideo_vFinal.mp4`
- **Workshop Lantern Icon**: `LD_Workshop_Object_LanternIcon.png`
- **Study Journal Image**: `LD_Study_Reveal_JournalPage_04.jpg`

---

## 2. Database Schema Metadata
The Convex database schema supports these standards via specific metadata fields.

### Scenes (`scenes` table)
- **`slug`**: Matches the `Place` (lowercase).
- **`domain`**: Enum (`workshop`, `study`, `boathouse`, `home`).
- **`tags`**: [String Array] General keywords for searchability.
- **`variant`**: [String] To track A/B versions of scenes.

### Objects (`objects` table)
- **`role`**: [String] Defines interaction behavior.
  - `trigger`: Opens a reveal.
  - `transition`: Navigates to another scene.
  - `state`: Toggles a local visual state.

### Reveals (`reveals` table)
- **`voice`**: [Enum] The narrative voice used in the content.
  - `cassie` (Workshop / Maker)
  - `eleanor` (Study / Historian)
  - `julian` (Boathouse / Engineer)
  - `neutral` (System / Omniscient)
- **`tone`**: [String] E.g., "urgent", "nostalgic", "technical".
- **`estimatedTime`**: [Number] Reading/viewing time in seconds.
- **`tags`**: [String Array] For thematic filtering.

---

## 3. Ingestion Rules
The Cloudinary Sync engine (`studio/media:syncCloudinaryAssets`) parses filenames to automatically link assets to Scenes.

- **Scene Backgrounds**: Only assets with `Type` = `Scene` or `Zone` will automatically update the `backgroundMediaUrl`.
- **Legacy Support**: Files not matching the `LD_` prefix will attempt to match based on keywords (`Cassie` -> Workshop, `Eleanor` -> Study, `Julian` -> Boathouse).
