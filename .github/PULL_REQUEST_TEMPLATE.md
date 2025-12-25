# Pull Request

## Description
<!-- Provide a brief description of the changes in this PR -->

## Type of Change
<!-- Mark the relevant option with an 'x' -->

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Refactoring (no functional changes, code improvements)
- [ ] Documentation update
- [ ] Configuration/build changes

## Related Issues
<!-- Link to related issues: Fixes #123, Closes #456 -->

## Testing Checklist
<!-- Mark completed items with an 'x' -->

- [ ] Build passes (`npm run build` succeeds)
- [ ] TypeScript type check passes (`npx tsc --noEmit`)
- [ ] Manually tested in Chrome browser
- [ ] Extension loads without errors in chrome://extensions
- [ ] No console errors or warnings
- [ ] Tested core functionality affected by changes
- [ ] Tested in Dynamics 365 environment (if applicable)

## Code Quality Checklist
<!-- Mark completed items with an 'x' -->

- [ ] Follows project conventions in [openspec/project.md](../openspec/project.md)
- [ ] Follows React best practices (functional components, proper hooks usage)
- [ ] TypeScript strict mode compliance (no `any` unless necessary)
- [ ] Service layer separation maintained (business logic in `src/services/`)
- [ ] Uses Fluent UI components where appropriate
- [ ] No security vulnerabilities introduced (XSS, injection, etc.)
- [ ] Reviewed code changes in [CODE_REVIEW.md](../CODE_REVIEW.md) checklist

## AI Review Acknowledgment
<!-- CodeRabbit and Claude Code will automatically review this PR using CODE_REVIEW.md guidelines -->

- [ ] I have reviewed feedback from CodeRabbit and Claude Auto Review
- [ ] I have addressed the ❌/✅ suggestions from Claude's CODE_REVIEW.md checklist
- [ ] I understand I can mention @claude in PR comments for follow-up questions

## Screenshots (if applicable)
<!-- Add screenshots for UI changes -->

## Additional Notes
<!-- Any additional information reviewers should know -->
