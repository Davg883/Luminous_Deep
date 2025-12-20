# Security & Access Control

## Zones

### Public Zone
- **Access**: Anonymous + Logged In
- **Content**:
    - Scenes list (published)
    - Objects metadata
    - Published chapters
- **Enforcement**: Public queries in `convex/public`

### Studio Zone
- **Access**: Admin / Creator only
- **Content**:
    - Draft chapters
    - Upload pipelines
    - Analytics
- **Enforcement**:
    - Clerk Middleware protects `/studio*` routes.
    - Convex functions in `convex/studio` require `studio` role/permission.

## Auth policies
- All studio mutations must explicitly check for admin identity.
