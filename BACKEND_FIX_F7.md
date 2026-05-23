# Backend Fix F7: Add Name Field to UpdateCommunityRequest

**Status**: ⚠️ Requires Backend Implementation (Java files not in this workspace)

## Overview
The settings form in AdminPanel (DetailPanel) attempts to send a `name` field in the PUT request to `/api/communities/{id}`, but the backend `UpdateCommunityRequest` DTO lacks this field, causing name changes to be silently dropped.

## Required Changes

### 1. Update CommunityDto.java - UpdateCommunityRequest Class

Add the `name` field to the DTO:

```java
public static class UpdateCommunityRequest {
    @Size(min = 3, max = 100, message = "Name must be 3–100 characters")
    private String name;           // ← ADD THIS

    @Size(max = 1000) private String description;
    private String   category;
    private Boolean  allowMemberPosts;
    private Boolean  requirePostApproval;
    private Boolean  feedEligible;
    private String   avatarUrl;
    
    // Getters and setters...
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
```

### 2. Update CommunityService.java - updateCommunity() Method

Add handling for the name field with duplicate name collision check:

```java
public Community updateCommunity(Long communityId, UpdateCommunityRequest req, User currentUser) {
    Community community = getCommunityOrThrow(communityId);
    authorizeAsOwner(community, currentUser);
    
    // Add BEFORE the existing field updates:
    if (req.getName() != null && !req.getName().equals(community.getName())) {
        if (communityRepo.existsByName(req.getName())) {
            throw new IllegalArgumentException("A community named '" + req.getName() + "' already exists.");
        }
        community.setName(req.getName());
    }
    
    // Existing updates:
    if (req.getDescription() != null) community.setDescription(req.getDescription());
    if (req.getCategory() != null) community.setCategory(req.getCategory());
    if (req.getAllowMemberPosts() != null) community.setAllowMemberPosts(req.getAllowMemberPosts());
    if (req.getRequirePostApproval() != null) community.setRequirePostApproval(req.getRequirePostApproval());
    if (req.getFeedEligible() != null) community.setFeedEligible(req.getFeedEligible());
    if (req.getAvatarUrl() != null) community.setAvatarUrl(req.getAvatarUrl());
    
    return communityRepo.save(community);
}
```

## Frontend Implementation
✅ The frontend AdminPanel already sends the `name` field in the settings form:
```typescript
const settingsForm = {
  name: c.name,              // ← Already being sent
  description: c.description,
  // ... other fields
}
```

Once this backend fix is implemented, community name updates from the admin settings panel will work correctly.
