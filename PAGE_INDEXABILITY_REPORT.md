# Page Indexability Report - What The Food

## INDEXABLE PAGES (Public, SEO-friendly)
**Total: 12 pages**

### Marketing/Public Pages
1. **/** (Homepage)
   - Route: `app/page.tsx`
   - Status: Indexable (default robots: true)

2. **/features**
   - Route: `app/(marketing)/features/page.tsx`
   - Status: Indexable (default robots: true)

3. **/pricing**
   - Route: `app/(marketing)/pricing/page.tsx`
   - Status: Indexable (default robots: true)

4. **/how-it-works**
   - Route: `app/(marketing)/how-it-works/page.tsx`
   - Status: Indexable (default robots: true)

5. **/widget**
   - Route: `app/(marketing)/widget/page.tsx`
   - Status: Indexable (default robots: true)

6. **/widget-results**
   - Route: `app/(marketing)/widget-results/page.tsx`
   - Status: Indexable (default robots: true)

7. **/about**
   - Route: `app/(marketing)/about/page.tsx`
   - Status: Indexable (default robots: true)

8. **/wall-of-love**
   - Route: `app/(marketing)/wall-of-love/page.tsx`
   - Status: Indexable (default robots: true)

9. **/blog**
   - Route: `app/(marketing)/blog/page.tsx`
   - Status: Indexable (default robots: true)

10. **/privacy**
    - Route: `app/(marketing)/privacy/page.tsx`
    - Status: Indexable (default robots: true)

11. **/terms**
    - Route: `app/(marketing)/terms/page.tsx`
    - Status: Indexable (default robots: true)

12. **/refund**
    - Route: `app/(marketing)/refund/page.tsx`
    - Status: Indexable (default robots: true)

13. **/disclaimer**
    - Route: `app/(marketing)/disclaimer/page.tsx`
    - Status: Indexable (default robots: true)

---

## NON-INDEXABLE PAGES (Private/Authenticated)
**Total: 24 pages**

### Authentication Pages
1. **/auth**
   - Route: `app/(auth)/auth/page.tsx`
   - Status: NOT Indexable (robots.ts disallow)

2. **/auth/callback**
   - Route: `app/(auth)/auth/callback/page.tsx`
   - Status: NOT Indexable (robots.ts disallow)

### App Dashboard & User Pages
3. **/dashboard**
   - Route: `app/(app)/dashboard/page.tsx`
   - Status: NOT Indexable (robots: { index: false })

4. **/profile**
   - Route: `app/(app)/profile/page.tsx`
   - Status: NOT Indexable (robots: { index: false })

5. **/settings**
   - Route: `app/(app)/settings/page.tsx`
   - Status: NOT Indexable (robots: { index: false })

6. **/billing**
   - Route: `app/(app)/billing/page.tsx`
   - Status: NOT Indexable (robots.ts disallow)

7. **/plans**
   - Route: `app/(app)/plans/page.tsx`
   - Status: NOT Indexable (robots.ts disallow, authenticated)

8. **/checkout/success**
   - Route: `app/(app)/checkout/success/page.tsx`
   - Status: NOT Indexable (robots.ts disallow)

9. **/history**
   - Route: `app/(app)/history/page.tsx`
   - Status: NOT Indexable (robots.ts disallow)

10. **/scan-histories**
    - Route: `app/(app)/scan-histories/page.tsx`
    - Status: NOT Indexable (robots: { index: false })

11. **/food-results**
    - Route: `app/(app)/food-results/page.tsx`
    - Status: NOT Indexable (robots.ts disallow)

12. **/saved-recipes**
    - Route: `app/(app)/saved-recipes/page.tsx`
    - Status: NOT Indexable (robots: { index: false })

13. **/meal-planner**
    - Route: `app/(app)/meal-planner/page.tsx`
    - Status: NOT Indexable (robots: { index: false })

14. **/meal-plan/[id]**
    - Route: `app/(app)/meal-plan/[id]/page.tsx`
    - Status: NOT Indexable (robots.ts disallow, authenticated)

15. **/my-food-analytics**
    - Route: `app/(app)/my-food-analytics/page.tsx`
    - Status: NOT Indexable (robots: { index: false })

16. **/analytics**
    - Route: `app/(app)/analytics/page.tsx`
    - Status: NOT Indexable (robots.ts disallow)

17. **/recipe/[id]**
    - Route: `app/(app)/recipe/[id]/page.tsx`
    - Status: NOT Indexable (authenticated, private user data)

### Widget Pages (Private/Admin)
18. **/widget/admin**
    - Route: `app/(app)/widget/admin/page.tsx`
    - Status: NOT Indexable (robots.ts disallow)

19. **/widget/dashboard**
    - Route: `app/(app)/widget/dashboard/page.tsx`
    - Status: NOT Indexable (robots.ts disallow)

20. **/widget/embed**
    - Route: `app/(app)/widget/embed/page.tsx`
    - Status: NOT Indexable (robots.ts disallow)

21. **/widget/plans**
    - Route: `app/(app)/widget/plans/page.tsx`
    - Status: NOT Indexable (robots.ts disallow)

---

## SHARED/DYNAMIC PAGES (Conditional Indexability)
**Total: 2 pages**

1. **/shared/[id]**
   - Route: `app/(marketing)/shared/[id]/page.tsx`
   - Status: Potentially Indexable (public shared food scans)
   - Note: No explicit robots metadata, but public content

2. **/shared-meal-plan/[id]**
   - Route: `app/(marketing)/shared-meal-plan/[id]/page.tsx`
   - Status: Potentially Indexable (public shared meal plans)
   - Note: No explicit robots metadata, but public content

---

## SUMMARY

- **Indexable Pages: 12**
- **Non-Indexable Pages: 24**
- **Conditional/Shared Pages: 2**
- **Total Pages: 38**

### Notes:
- All marketing pages (in `app/(marketing)/`) are indexable by default
- All app pages (in `app/(app)/`) are NOT indexable (require authentication)
- Auth pages are explicitly disallowed in robots.ts
- Shared pages have no explicit robots metadata but contain public content
- The sitemap includes only the 12 public marketing pages
