## PART 4: Advanced Memory Techniques

### 1. Code Markers for Context

In your code files, add:

// CLAUDE-CONTEXT: This handles user authentication
// CLAUDE-TODO: Add rate limiting here
// CLAUDE-CAREFUL: Security-critical - don't modify without review

Reference these in CLAUDE.md:

## Code Markers

- Look for CLAUDE-TODO markers for quick tasks
- CLAUDE-CONTEXT explains complex sections
- CLAUDE-CAREFUL marks security-sensitive code

### 2. Decision Log

Add to CLAUDE.md:

## Architecture Decisions

### 2024-03-15: Chose PostgreSQL over MongoDB

- **Reason**: Need ACID compliance for financial data
- **Trade-off**: Less flexible schema
- **Mitigation**: Using JSONB columns for flexibility

### 3. Progress Tracking

## Project Milestones

- [x] Phase 1: Basic Setup (Week 1)
- [x] Phase 2: Core Features (Week 2-3)
- [ ] Phase 3: Testing (Week 4)
- [ ] Phase 4: Deployment (Week 5)

Current Phase: 2 (60% complete)

### 4. Context Preservation

## Important Context

- **Client Requirement**: Must work offline
- **Performance Target**: <100ms response time
- **Browser Support**: Chrome, Firefox, Safari (no IE)
- **Mobile**: Responsive, not native

### 5. Session Continuity

Always end CLAUDE.md with:

## 🔄 Next Session Setup

1. First, run: `npm install` (if any new dependencies)
2. Check tests: `npm test`
3. Continue with: [Specific task]
4. Watch out for: [Any gotchas]


