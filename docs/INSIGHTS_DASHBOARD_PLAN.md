# Futuristic Insights Dashboard Plan

## Vision
A cutting-edge, AI-powered insights dashboard that transforms raw Meta Ads data into actionable intelligence through beautiful visualizations, trend analysis, and predictive analytics.

---

## Core Design Principles

### 1. **Data-First Visualization**
- Every metric tells a story
- Interactive charts that respond to user queries
- Real-time data updates with smooth animations
- Multi-dimensional views (time, campaigns, audiences, demographics)

### 2. **AI-Powered Intelligence**
- Natural language queries: "Show me campaigns with declining ROAS"
- Automated insights: "Your CPM increased 15% - here's why"
- Predictive trends: "Based on current trajectory, you'll hit $50K spend by month-end"
- Anomaly detection: "Unusual spike in CPC detected - investigate?"

### 3. **Trend Analysis**
- Historical comparisons (YoY, MoM, WoW)
- Performance trajectories with confidence intervals
- Seasonal patterns identification
- Growth rate indicators

### 4. **Modern UI/UX**
- Glassmorphism effects
- Smooth micro-interactions
- Dark mode optimized
- Responsive grid layouts
- Customizable dashboards

---

## Dashboard Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Header: Campaign Selector | Date Range | Account Switcher | Export | Settings│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Breadcrumb: All Campaigns > Campaign Name > Ad Set Name > Ad Name          │
│                                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Spend    │  │  Results   │  │    ROAS     │  │    CTR      │        │
│  │  $45,230   │  │    1,234   │  │    2.8x     │  │   6.70%     │        │
│  │  ↑ 12.5%   │  │  ↑ 8.3%    │  │  ↓ 3.2%     │  │  ↑ 0.5%     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Performance Trends (Interactive Line Chart)                         │  │
│  │  View: [Account] [Campaign] [Ad Set] [Ad]                            │  │
│  │  Metrics: [Spend] [Impressions] [Clicks] [Results] [ROAS] [CTR]     │  │
│  │  ┌───────────────────────────────────────────────────────────────┐    │  │
│  │  │                                                               │    │  │
│  │  │         Multi-line trend visualization                        │    │  │
│  │  │         with hover tooltips                                   │    │  │
│  │  │                                                               │    │  │
│  │  └───────────────────────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  ┌──────────────────────┐  ┌──────────────────────┐                        │
│  │  Campaign Performance│  │  Audience Insights   │                        │
│  │  (Heatmap/Table)     │  │  (Demographics)      │                        │
│  │  Click to drill down │  │  Breakdown by: Age,  │                        │
│  │                      │  │  Gender, Location    │                        │
│  └──────────────────────┘  └──────────────────────┘                        │
│                                                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  AI Insights & Recommendations                                       │  │
│  │  • "Campaign X has 23% lower CPC - scale it"                        │  │
│  │  • "Ad Set Y is underperforming - pause?"                            │  │
│  │  • "Peak performance: Tuesdays 2-4 PM"                               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Features & Components

### 1. **KPI Cards (Top Row)**
**Purpose**: Quick overview of key metrics

**Design**:
- Glassmorphic cards with gradient borders
- Large number, small percentage change indicator
- Sparkline mini-chart showing trend
- Click to drill down into detailed view

**Metrics**:
- Total Spend
- Results (Conversions/Purchases)
- ROAS (Return on Ad Spend)
- CTR (Click-Through Rate)
- CPM (Cost Per Mille)
- CPC (Cost Per Click)
- Impressions
- Reach

**Visual Elements**:
- Up/Down arrows with color coding (green ↑, red ↓)
- Percentage change with trend indicator
- Mini sparkline chart showing 7-day trend
- Hover tooltip with historical comparison

---

### 2. **Campaign Structure & Filtering System** ⭐ NEW
**Purpose**: Advanced filtering and hierarchical navigation

**Features**:
- **Campaign Selector Dropdown**:
  - Multi-select campaigns (or "All Campaigns")
  - Search/filter campaigns by name
  - Group by status (Active, Paused, Archived)
  - Show campaign count and total spend
  
- **Hierarchical Drill-Down Navigation**:
  - **Account Level** → See all campaigns
  - **Campaign Level** → Click campaign → See its ad sets
  - **Ad Set Level** → Click ad set → See its ads
  - **Ad Level** → Click ad → See ad-specific insights
  - Breadcrumb navigation: `All Campaigns > Campaign Name > Ad Set Name > Ad Name`
  - Back button to navigate up hierarchy

- **Advanced Filtering Options**:
  - **Campaign Filters**:
    - Status (Active, Paused, Archived)
    - Objective (CONVERSIONS, TRAFFIC, ENGAGEMENT, etc.)
    - Budget range (Daily/Lifetime)
    - Date created range
    - Performance threshold (e.g., ROAS > 2.0)
  
  - **Date Range Options**:
    - Presets: Today, Yesterday, Last 7/30/90 Days, This Month, Last Month, Maximum
    - Custom date range picker (from/to dates)
    - Comparison mode: Compare with previous period (same length)
  
  - **Breakdown Filters**:
    - By Age & Gender
    - By Device (Mobile, Desktop, Tablet)
    - By Placement (Facebook Feed, Instagram Stories, etc.)
    - By Region/Country
    - By Time (Hour of day, Day of week)
    - By Action Type (Purchase, Add to Cart, etc.)

- **View Level Selector**:
  - Toggle between: Account | Campaign | Ad Set | Ad
  - Shows data aggregated at selected level
  - Maintains selected filters when switching levels

### 3. **Performance Trends Chart**
**Purpose**: Visualize performance over time with drill-down capability

**Features**:
- **View Level Context**: Shows trends for selected campaign/ad set/ad or all campaigns
- **Multi-metric toggle**: Switch between Spend, Impressions, Clicks, Results, ROAS, CTR, CPM, CPC
- **Time range selector**: Today, 7D, 30D, 90D, Custom
- **Comparison mode**: Compare current period vs previous period
- **Interactive tooltips**: Hover to see exact values
- **Zoom & Pan**: Click and drag to zoom into specific date ranges
- **Anomaly markers**: Highlight unusual spikes/drops
- **Forecast overlay**: Show AI-predicted future trends (dashed line)
- **Click to drill down**: Click data point → Show breakdown for that day/period

**Chart Types**:
- **Line Chart**: Primary view for trends
- **Area Chart**: Option to show cumulative values
- **Candlestick Chart**: For spend efficiency (high/low/open/close)
- **Bar Chart**: For daily breakdowns

**Interactions**:
- Click data point → Show campaign breakdown for that day
- Double-click → Zoom to that time period
- Right-click → Export data for that range

---

### 4. **Campaign Performance Matrix**
**Purpose**: Compare campaigns/ad sets/ads side-by-side with drill-down

**Visualization Options**:

**A. Heatmap View**
- Rows: Campaigns/Ad Sets/Ads (based on selected view level)
- Columns: Metrics (Spend, Results, ROAS, CTR, CPC, CPM, Reach)
- Color intensity: Performance level (green = good, red = poor)
- Sortable by any metric
- Click row → Drill down to next level (Campaign → Ad Sets → Ads)
- Filter by performance thresholds (e.g., show only ROAS > 2.0)

**B. Scatter Plot**
- X-axis: Spend (configurable)
- Y-axis: ROAS (configurable)
- Bubble size: Results count (configurable)
- Color: Status (Active/Paused) or Performance tier
- Quadrants: High ROAS/Low Spend (scale), High ROAS/High Spend (maintain), etc.
- Click bubble → Drill down to entity details

**C. Table View**
- Sortable columns (all metrics)
- Expandable rows for details
- Quick actions (Pause, Edit, Duplicate, View Details)
- Performance indicators (trending up/down)
- Multi-select for bulk actions
- Export selected rows to CSV

---

### 5. **Audience Insights Panel**
**Purpose**: Understand who is engaging with ads

**Components**:

**A. Demographics Breakdown**
- Age groups (bar chart)
- Gender distribution (pie chart)
- Geographic heatmap (world map with intensity)
- Device breakdown (mobile/desktop/tablet)

**B. Audience Overlap**
- Venn diagram showing audience intersections
- Lookalike audience performance
- Custom audience performance vs broad targeting

**C. Behavioral Insights**
- Time of day performance (heatmap: day × hour)
- Day of week patterns
- Purchase funnel visualization (impressions → clicks → conversions)

---

### 6. **AI Insights & Recommendations**
**Purpose**: Actionable intelligence powered by AI

**Features**:
- **Automated Insights**: 
  - "Your CPM decreased 12% this week - likely due to improved ad relevance"
  - "Campaign 'Summer Sale' is performing 3x better than average - consider increasing budget"
  - "Ad Set 'Lookalike 1%' has 0 conversions - review targeting"

- **Predictive Analytics**:
  - "At current spend rate, you'll reach $50K by month-end"
  - "ROAS trending downward - projected to hit 2.1x by Friday"
  - "Based on historical data, Tuesday 2 PM is optimal for new campaign launches"

- **Anomaly Detection**:
  - "Unusual spike in CPC detected on Campaign X - investigate?"
  - "Impressions dropped 40% - possible ad disapproval?"
  - "CTR increased 200% - viral ad performance detected"

- **Recommendations**:
  - "Scale Campaign X - it has lowest CPC"
  - "Pause Ad Set Y - underperforming for 7 days"
  - "Increase budget for Campaign Z - high ROAS, low spend"
  - "Test new creative - current ad fatigue detected"

**UI Design**:
- Card-based layout
- Color-coded priority (High/Medium/Low)
- Dismissible insights
- "Take Action" buttons
- Expandable details

---

### 7. **Trend Analysis Deep Dive**
**Purpose**: Understand what's driving changes

**Features**:

**A. Trend Decomposition**
- Show trend components: Trend + Seasonality + Noise
- Identify cyclical patterns
- Highlight structural changes

**B. Correlation Analysis**
- "Spend correlates with Results (r=0.85)"
- "CPM inversely correlates with CTR (r=-0.62)"
- Visual correlation matrix

**C. Cohort Analysis**
- Performance by campaign age
- Performance by ad set creation date
- Retention curves

**D. Attribution Analysis**
- First-touch vs last-touch attribution
- Multi-touch attribution visualization
- Conversion path analysis

---

### 8. **Customizable Dashboard Builder**
**Purpose**: Let users create their own views

**Features**:
- Drag-and-drop widgets
- Save custom dashboard layouts
- Share dashboards with team
- Pre-built templates:
  - "Executive Summary"
  - "Performance Optimizer"
  - "Budget Manager"
  - "Creative Tester"

---

## Technical Implementation Plan

### Phase 1: Foundation ✅ COMPLETED
1. ✅ **Create Insights Page Route**
   - `src/app/(dashboard)/insights/page.tsx`
   - Basic layout structure
   - API route: `src/app/api/meta/insights/route.ts`

2. ✅ **KPI Cards Component**
   - `src/components/insights/KPICard.tsx`
   - Fetch aggregate metrics
   - Display with trend indicators

3. ✅ **Basic Trend Chart**
   - `src/components/insights/TrendChart.tsx`
   - Use Recharts
   - Multi-metric line chart
   - Date range selector

### Phase 2: Campaign Structure & Filtering (Week 3-4) ⭐ NEXT
4. **Campaign Selector Component**
   - `src/components/insights/CampaignSelector.tsx`
   - Multi-select dropdown with search
   - Group by status/objective
   - Show campaign metadata (spend, status, objective)

5. **Hierarchical Navigation System**
   - `src/components/insights/InsightsBreadcrumb.tsx`
   - Breadcrumb navigation component
   - State management for view level (Account/Campaign/AdSet/Ad)
   - Back navigation functionality

6. **Advanced Filtering Panel**
   - `src/components/insights/FilterPanel.tsx`
   - Campaign status filter
   - Objective filter
   - Budget range filter
   - Custom date range picker
   - Breakdown selector (age, gender, device, etc.)
   - Save filter presets

7. **Enhanced Insights API**
   - Update `src/app/api/meta/insights/route.ts`
   - Support campaign/ad set/ad filtering
   - Support breakdowns parameter
   - Support custom date ranges
   - Support level parameter (account/campaign/adset/ad)

8. **View Level Context**
   - Update insights page to show selected entity context
   - Pass selected campaign/ad set/ad IDs to API
   - Update KPI cards to reflect selected level
   - Update trend chart to show selected entity data

### Phase 3: Core Features (Week 5-6)
9. **Campaign Performance Matrix**
   - `src/components/insights/CampaignMatrix.tsx`
   - Heatmap visualization
   - Scatter plot view
   - Sortable table view
   - Drill-down functionality (click row → navigate to next level)

10. **Audience Insights**
    - `src/components/insights/AudienceInsights.tsx`
    - Demographics charts (age, gender)
    - Geographic visualization (world map)
    - Device breakdown (mobile/desktop/tablet)
    - Placement breakdown (Feed, Stories, etc.)

11. **Enhanced Trend Chart**
    - Add comparison mode (current vs previous period)
    - Add breakdown visualization (toggle breakdowns)
    - Add zoom & pan functionality
    - Add anomaly detection markers

### Phase 4: AI Features (Week 7-8)
12. **AI Insights Panel**
    - `src/components/insights/AIInsights.tsx`
    - Connect to LangGraph agent
    - Generate automated insights based on selected filters
    - Display recommendations with context awareness
    - Entity-specific insights (campaign/ad set/ad level)

13. **Anomaly Detection**
    - Statistical analysis for outliers
    - Alert system for unusual patterns
    - Investigation prompts with drill-down links
    - Context-aware anomaly detection (compares to entity's historical performance)

14. **Predictive Analytics**
    - Time series forecasting
    - Trend projection with confidence intervals
    - Budget pacing predictions
    - ROAS projections based on current trends

### Phase 5: Advanced Features (Week 9-10)
15. **Custom Dashboard Builder**
    - `src/components/insights/DashboardBuilder.tsx`
    - Drag-and-drop interface
    - Widget library (KPI cards, charts, tables)
    - Save/load custom dashboard layouts
    - Share dashboards with team

16. **Export & Sharing**
    - PDF report generation with selected filters
    - CSV export with breakdowns
    - Shareable dashboard links with filter presets
    - Scheduled email reports

17. **Real-time Updates**
    - WebSocket connection for live data
    - Auto-refresh options (15min, 30min, 1hr)
    - Notification system for significant changes
    - Performance alerts (ROAS drops, budget pacing issues)

---

## Data Requirements

### Meta API Endpoints Needed:
1. **Insights API** (already implemented)
   - Account-level insights ✅
   - Campaign-level insights ✅
   - Ad set-level insights ✅
   - Ad-level insights ✅

2. **Breakdowns** (to implement):
   - **Demographics**:
     - `age` - Age groups (18-24, 25-34, 35-44, etc.)
     - `gender` - Male, Female, Unknown
     - `age_gender` - Combined age and gender
   
   - **Geographic**:
     - `country` - Country-level breakdown
     - `region` - Regional breakdown
     - `dma` - Designated Market Area (US only)
     - `city` - City-level breakdown
   
   - **Device & Placement**:
     - `device_platform` - Mobile, Desktop, Tablet
     - `publisher_platform` - Facebook, Instagram, Audience Network, Messenger
     - `platform_position` - Feed, Stories, Reels, etc.
     - `impression_device` - Device type breakdown
   
   - **Time-based**:
     - `hourly_stats_aggregated_by_advertiser_time_zone` - Hour of day
     - `day_parting` - Day part breakdown (Morning, Afternoon, Evening, Night)
     - `day_of_week` - Day of week breakdown
   
   - **Action-based**:
     - `action_type` - Purchase, Add to Cart, Lead, etc.
     - `action_reaction_time` - Time to action
     - `action_destination` - Where action led
   
   - **Advanced**:
     - `product_id` - Product-level breakdown (for catalog ads)
     - `video_play_curation_type` - Video curation type
     - `video_sound` - Sound on/off breakdown
     - `conversion_device` - Device used for conversion

3. **Filtering & Filtering** (to implement):
   - Filter by campaign IDs (multiple)
   - Filter by ad set IDs (multiple)
   - Filter by ad IDs (multiple)
   - Filter by status (ACTIVE, PAUSED, etc.)
   - Filter by objective
   - Filter by date range (custom)

4. **Attribution** (to add):
   - Conversion attribution windows (1-day, 7-day, 28-day click/view)
   - Multi-touch attribution models
   - Attribution breakdown by conversion type

5. **Additional Meta API Features** (to leverage):
   - **Reach & Frequency**: Reach estimates, frequency distribution
   - **Delivery Insights**: Delivery status, optimization insights
   - **Creative Insights**: Creative performance breakdown
   - **Audience Insights**: Audience overlap, lookalike performance
   - **Budget Insights**: Budget pacing, spend predictions
   - **Bid Insights**: Bid strategy performance

### Data Aggregation:
- Daily aggregations for trends
- Hourly aggregations for time-of-day analysis
- Weekly aggregations for patterns
- Monthly aggregations for comparisons

---

## UI/UX Design Specifications

### Color Palette:
- **Primary**: Blue (#3B82F6) - Main actions
- **Success**: Green (#10B981) - Positive trends
- **Warning**: Yellow (#F59E0B) - Caution
- **Error**: Red (#EF4444) - Negative trends
- **Neutral**: Gray scale for backgrounds

### Typography:
- **Headers**: Inter Bold, 24-32px
- **Body**: Inter Regular, 14-16px
- **Metrics**: Inter Medium, 20-48px
- **Labels**: Inter Medium, 12px

### Spacing:
- Card padding: 24px
- Section spacing: 32px
- Grid gap: 16px

### Animations:
- Chart transitions: 300ms ease-out
- Card hover: Scale 1.02, shadow increase
- Loading states: Skeleton screens
- Data updates: Smooth fade-in

---

## Success Metrics

### User Engagement:
- Time spent on insights page
- Number of insights clicked
- Actions taken from recommendations
- Custom dashboards created

### Business Impact:
- Campaign optimizations made
- Budget reallocations
- Performance improvements
- Cost savings identified

---

## Future Enhancements (Post-MVP)

1. **Advanced AI Features**:
   - Natural language query interface
   - Automated A/B test suggestions
   - Creative performance predictions
   - Budget optimization recommendations

2. **Collaboration**:
   - Team annotations on insights
   - Shared reports
   - Comment threads
   - Notification system

3. **Integrations**:
   - Google Analytics integration
   - Shopify sales data
   - Email marketing data
   - CRM data

4. **Mobile App**:
   - Native iOS/Android apps
   - Push notifications
   - Quick actions
   - Offline viewing

---

## Next Steps

### ✅ Phase 1 Complete:
1. ✅ Update sidebar to show only Overview and Insights
2. ✅ Create insights page route structure
3. ✅ Build KPI cards component
4. ✅ Implement basic trend chart

### 🔄 Phase 2 - Campaign Structure & Filtering (NEXT):
1. **Build Campaign Selector Component**
   - Multi-select dropdown with search
   - Fetch all campaigns from Meta API
   - Display campaign metadata
   - Store selected campaigns in state

2. **Implement Hierarchical Navigation**
   - Breadcrumb component
   - View level state management (Account/Campaign/AdSet/Ad)
   - Navigation handlers for drill-down
   - Back navigation

3. **Enhance Insights API**
   - Add campaign filtering support
   - Add level parameter support (campaign/adset/ad)
   - Add breakdowns parameter support
   - Add custom date range support

4. **Update Insights Page**
   - Add campaign selector to header
   - Add breadcrumb navigation
   - Add filter panel
   - Update API calls to include filters
   - Update components to reflect selected level

5. **Add Advanced Filtering**
   - Status filter (Active/Paused)
   - Objective filter
   - Budget range filter
   - Custom date range picker
   - Breakdown selector

### Phase 3 - Core Features:
6. Add campaign performance matrix
7. Add audience insights with breakdowns
8. Enhance trend chart with comparison mode

### Phase 4 - AI Features:
9. Integrate AI insights panel
10. Add anomaly detection
11. Add predictive analytics

### Phase 5 - Advanced Features:
12. Build dashboard builder
13. Add export & sharing
14. Add real-time updates

---

## Advanced Features & Meta API Capabilities

### All Meta API Breakdowns Available:
- **Demographics**: `age`, `gender`, `age_gender`
- **Geographic**: `country`, `region`, `dma`, `city`
- **Device**: `device_platform`, `impression_device`, `conversion_device`
- **Placement**: `publisher_platform`, `platform_position`
- **Time**: `hourly_stats_aggregated_by_advertiser_time_zone`, `day_parting`, `day_of_week`
- **Action**: `action_type`, `action_reaction_time`, `action_destination`
- **Creative**: `product_id`, `video_play_curation_type`, `video_sound`

### Decision-Making Features:
1. **Performance Comparison**:
   - Compare campaigns side-by-side
   - Compare time periods (this month vs last month)
   - Compare breakdowns (age groups, devices, placements)
   - Statistical significance indicators

2. **Optimization Recommendations**:
   - Budget reallocation suggestions
   - Bid optimization recommendations
   - Audience expansion opportunities
   - Creative refresh suggestions

3. **Predictive Models**:
   - ROAS forecasting
   - Budget pacing predictions
   - Conversion rate predictions
   - Optimal spend allocation

4. **Anomaly Detection**:
   - Unusual performance changes
   - Budget pacing issues
   - Delivery problems
   - Creative fatigue detection

## Questions to Consider

1. **Data Refresh Frequency**: Real-time vs 15-min intervals? → **15-min intervals** (Meta API rate limits)
2. **Historical Data**: How far back to store? → **2 years** (Maximum date range)
3. **Caching Strategy**: Cache insights for performance? → **Yes, cache for 5 minutes**
4. **User Permissions**: Who can see what insights? → **All users see all campaigns** (future: role-based access)
5. **Export Formats**: PDF, Excel, CSV, PNG? → **All formats** (CSV for data, PDF for reports, PNG for charts)
6. **Mobile Responsiveness**: Full features or simplified mobile view? → **Full features** (responsive design)

---

## Key Principles for Best-in-Class SaaS

1. **Data-Driven Decisions**: Every visualization should help users make better decisions
2. **Context-Aware**: Insights should be relevant to selected filters and view level
3. **Actionable**: Every insight should have a clear action or recommendation
4. **Performance**: Fast loading, efficient API usage, smart caching
5. **User Experience**: Intuitive navigation, clear visualizations, helpful tooltips
6. **Comprehensive**: Use all available Meta API features and breakdowns
7. **Scalable**: Handle large accounts with hundreds of campaigns efficiently

---

*Last Updated: December 1, 2025*
*Enhanced with Campaign Structure & Advanced Filtering*

