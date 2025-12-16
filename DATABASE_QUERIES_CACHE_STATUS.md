# Database Queries & Cache Status

## ✅ Already Cached (Instant Loading)

### 1. **User Session & Profile**
**Query:** `profiles` table
- ✅ Cached in: `wtf_session_cache`, `wtf_profile_cache_{userId}`
- Duration: 5-10 minutes
- Used in: AuthContext, all pages
- **Status: OPTIMIZED** ⚡

### 2. **Free Scans Count**
**Query:** `/api/free-scans`
- ✅ Cached in: `wtf_free_scans_cache`
- Duration: 1 minute
- Used in: Hero components
- **Status: OPTIMIZED** ⚡

### 3. **User Subscription**
**Query:** `subscriptions` table via `getPlatformSubscription()`
- ✅ Cached in: `wtf_cache_subscription_{userId}`
- Duration: 5 minutes
- Used in: Dashboard, Pricing, all authenticated pages
- **Status: OPTIMIZED** ⚡

### 4. **Recent Scans (Dashboard)**
**Query:** `food_scans` table (6 most recent)
- ✅ Cached in: `wtf_cache_scans_{userId}`
- Duration: 2 minutes
- Used in: Dashboard
- **Status: OPTIMIZED** ⚡

### 5. **Pricing Plans**
**Query:** `platform_plans` table
- ✅ Cached in: `wtf_cache_pricing_plans`
- Duration: 10 minutes
- Used in: Pricing page
- **Status: OPTIMIZED** ⚡

---

## ⚠️ NOT Cached (Needs Optimization)

### 1. **Scan History (Full List)**
**Query:** `food_scans` table (all scans with pagination)
**Files:** `src/components/ScanHistory/ScanHistoryClient.tsx`
**Impact:** Loads on `/history` page
**Recommendation:** Cache with 2-minute duration
**Priority:** HIGH (users visit this frequently)

### 2. **Analytics Data**
**Query:** `food_scans` table (aggregated stats)
**Files:** `src/components/Analytics/AnalyticsClient.tsx`
**Impact:** Loads on `/analytics` page
**Recommendation:** Cache with 5-minute duration
**Priority:** MEDIUM

### 3. **Meal Plans**
**Query:** `meal_plans` table
**Files:** `src/components/MealPlanner/MealPlannerClient.tsx`
**Impact:** Loads on `/meal-planner` page
**Recommendation:** Cache with 5-minute duration
**Priority:** MEDIUM

### 4. **Widget Data**
**Query:** Various widget-related tables
**Files:** `src/components/WidgetDashboard/WidgetDashboardClient.tsx`
**Impact:** Loads on widget pages
**Recommendation:** Cache with 5-minute duration
**Priority:** LOW (admin only)

---

## 🎯 Recommendation Priority

Based on user frequency and impact:

### Priority 1 (HIGH) - Implement Now
1. **Scan History** (`/history`)
   - Users check this often
   - Query can be slow with many scans
   - Easy to cache

### Priority 2 (MEDIUM) - Implement Soon  
2. **Analytics Data** (`/analytics`)
   - Aggregated queries are slow
   - Data doesn't change often

3. **Meal Plans** (`/meal-planner`)
   - Users revisit plans
   - Plans don't change frequently

### Priority 3 (LOW) - Later
4. **Widget Admin Data**
   - Admin-only pages
   - Less frequently accessed

---

## 📊 Current Cache Coverage

```
Cached:     40% of pages ✅
Not Cached: 60% of pages ⚠️

Most Important Pages:
- / (Home)           ✅ Cached
- /dashboard         ✅ Cached  
- /pricing           ✅ Cached
- /history           ❌ NOT cached (HIGH PRIORITY)
- /analytics         ❌ NOT cached (MEDIUM PRIORITY)
- /meal-planner      ❌ NOT cached (MEDIUM PRIORITY)
```

---

## 🚀 Which Page Do You Want to Optimize?

Tell me which page is slow and I'll add caching:

1. **`/history`** - Scan history list
2. **`/analytics`** - Analytics dashboard
3. **`/meal-planner`** - Meal planning
4. **Other page?** - Specify the URL

---

## ✨ Example Cache Implementation

For any page, the pattern is:

```typescript
// 1. Check cache first
const cached = DataCache.get('page_data');
if (cached) {
  setData(cached);
  setLoading(false);
}

// 2. Fetch fresh data
const fresh = await fetchData();
setData(fresh);

// 3. Cache for next time
DataCache.set('page_data', fresh, CACHE_DURATION.MEDIUM);
```

**Tell me which page is slow and I'll optimize it!** 🎯
