# T058 - Loading & Skeletons Implementation

## Overview
Complete implementation of skeleton loaders and spinner components with animated shimmer effects for improved user experience during loading states.

## Files Created

### Skeleton Components
- `matex/src/components/LoadingSkeletons.tsx` - Comprehensive skeleton loader components
- `matex/src/components/Spinners.tsx` - Various spinner components for different use cases

### CSS Animations
- Updated `matex/src/app/globals.css` - Added shimmer, spin, and pulse animations

## Features Implemented

### Skeleton Components

#### Base Skeleton Component
- **Shimmer Animation**: Smooth left-to-right shimmer effect using CSS transforms
- **Flexible Styling**: Accepts custom className for size and shape variations
- **Accessibility**: Proper ARIA attributes and screen reader support

#### Specialized Skeleton Components
1. **ListingCardSkeleton**: Mimics listing card structure with image, title, description, price, seller info
2. **ListingGridSkeleton**: Grid layout of multiple listing card skeletons (configurable count)
3. **TableSkeleton**: Admin table skeleton with header and configurable rows/columns
4. **ProfileCardSkeleton**: User profile card with avatar, details, and action button
5. **NotificationSkeleton**: Individual notification item skeleton
6. **NotificationListSkeleton**: List of notification skeletons
7. **BidHistorySkeleton**: Auction bid history with bidder info and amounts
8. **FormSkeleton**: Generic form skeleton with fields and action buttons
9. **StatsCardSkeleton**: Dashboard statistics card skeleton
10. **StatsGridSkeleton**: Grid of stats cards for dashboards
11. **PageHeaderSkeleton**: Page header with title, description, and breadcrumbs
12. **SearchBarSkeleton**: Search input field skeleton
13. **FilterSidebarSkeleton**: Filter sidebar with categories and options
14. **ContentSkeleton**: Generic content skeleton for text blocks

### Spinner Components

#### Base Spinner Types
1. **Spinner**: Classic circular spinner with rotating border
2. **DotsSpinner**: Three animated dots with staggered timing
3. **PulseSpinner**: Simple pulsing circle
4. **ButtonSpinner**: Small spinner for loading buttons

#### Specialized Spinner Components
1. **PageSpinner**: Full-page loading with centered spinner and text
2. **InlineSpinner**: Small inline spinner with customizable text
3. **LoadingOverlay**: Overlay spinner that covers existing content
4. **CardLoader**: Loading state for card components
5. **TableLoader**: Loading state for table components
6. **FormLoader**: Loading state for form components
7. **SearchLoader**: Loading state for search operations
8. **UploadSpinner**: Progress spinner for file uploads
9. **ProcessingSpinner**: Highlighted spinner for processing states
10. **SavingSpinner**: Green-themed spinner for save operations
11. **LoadingButton**: Button component with integrated loading state

### CSS Animations

#### Shimmer Animation
```css
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```
- **Duration**: 2 seconds infinite loop
- **Effect**: Smooth left-to-right highlight sweep
- **Performance**: GPU-accelerated transform animations

#### Spin Animation
```css
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```
- **Duration**: 1 second linear infinite
- **Usage**: Circular spinners and loading indicators

#### Pulse Animation
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```
- **Duration**: 2 seconds with cubic-bezier easing
- **Usage**: Skeleton components and pulse indicators

## Design Principles

### User Experience
- **Perceived Performance**: Skeleton loaders make loading feel faster
- **Content Awareness**: Skeletons match the structure of actual content
- **Smooth Transitions**: Seamless transition from skeleton to real content
- **Progressive Loading**: Different loading states for different scenarios

### Accessibility
- **Screen Readers**: Proper ARIA labels and roles
- **Semantic HTML**: Meaningful structure for assistive technologies
- **Reduced Motion**: Respects user's motion preferences
- **Focus Management**: Proper focus handling during loading states

### Performance
- **CSS Animations**: Hardware-accelerated transforms and opacity changes
- **Minimal JavaScript**: Pure CSS animations where possible
- **Efficient Rendering**: Optimized for smooth 60fps animations
- **Memory Usage**: Lightweight components with minimal overhead

## Usage Examples

### Skeleton Loaders

#### Listing Grid Loading
```tsx
import { ListingGridSkeleton } from '@/components/LoadingSkeletons';

function ListingsPage() {
  const { listings, isLoading } = useListings();
  
  if (isLoading) {
    return <ListingGridSkeleton count={12} />;
  }
  
  return <ListingsGrid listings={listings} />;
}
```

#### Table Loading
```tsx
import { TableSkeleton } from '@/components/LoadingSkeletons';

function AdminTable() {
  const { data, isLoading } = useAdminData();
  
  if (isLoading) {
    return <TableSkeleton rows={10} columns={5} />;
  }
  
  return <DataTable data={data} />;
}
```

#### Form Loading
```tsx
import { FormSkeleton } from '@/components/LoadingSkeletons';

function DynamicForm() {
  const { formConfig, isLoading } = useFormConfig();
  
  if (isLoading) {
    return <FormSkeleton />;
  }
  
  return <Form config={formConfig} />;
}
```

### Spinner Components

#### Page Loading
```tsx
import { PageSpinner } from '@/components/Spinners';

function App() {
  const { isInitializing } = useApp();
  
  if (isInitializing) {
    return <PageSpinner />;
  }
  
  return <MainApp />;
}
```

#### Button Loading
```tsx
import { LoadingButton } from '@/components/Spinners';

function SubmitForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  return (
    <LoadingButton
      isLoading={isSubmitting}
      onClick={handleSubmit}
      variant="primary"
    >
      Save Changes
    </LoadingButton>
  );
}
```

#### Overlay Loading
```tsx
import { LoadingOverlay } from '@/components/Spinners';

function DataView() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  return (
    <LoadingOverlay isLoading={isRefreshing}>
      <DataContent />
    </LoadingOverlay>
  );
}
```

#### Search Loading
```tsx
import { SearchLoader } from '@/components/Spinners';

function SearchResults() {
  const { results, isSearching } = useSearch();
  
  if (isSearching) {
    return <SearchLoader />;
  }
  
  return <ResultsList results={results} />;
}
```

## Component Variants

### Size Options
- **sm**: Small components (16px spinners, compact skeletons)
- **md**: Medium components (24px spinners, standard skeletons)
- **lg**: Large components (32px spinners, prominent skeletons)
- **xl**: Extra large components (48px spinners, hero skeletons)

### Color Options
- **primary**: Brand color (#0ea5e9)
- **secondary**: Accent color (#eab308)
- **white**: White for dark backgrounds
- **gray**: Neutral gray for subtle loading

### Animation Timing
- **Shimmer**: 2s infinite linear
- **Spin**: 1s infinite linear
- **Pulse**: 2s infinite cubic-bezier
- **Dots**: Staggered 150ms delays

## Integration Patterns

### Conditional Rendering
```tsx
{isLoading ? <SkeletonComponent /> : <ActualComponent />}
```

### Loading States
```tsx
const LoadingState = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
};
```

### Progressive Enhancement
```tsx
// Show skeleton immediately
// Load data in background
// Transition smoothly to content
```

## Performance Considerations

### Animation Performance
- Use `transform` and `opacity` for smooth animations
- Avoid animating layout properties (`width`, `height`, `margin`)
- Leverage GPU acceleration with `will-change` when needed
- Use `animation-fill-mode: both` for smooth start/end states

### Memory Management
- Components are lightweight with minimal state
- CSS animations don't require JavaScript execution
- Proper cleanup of animation listeners
- Efficient re-rendering with React.memo where appropriate

### Bundle Size
- Tree-shakeable exports for individual components
- No external dependencies for core functionality
- Minimal CSS footprint with shared base classes
- Optimized for production builds

## Testing Scenarios

### Visual Testing
1. Skeleton components match content structure
2. Animations run smoothly at 60fps
3. Responsive design works across device sizes
4. Color contrast meets accessibility standards

### Functional Testing
1. Loading states trigger appropriate skeletons/spinners
2. Transitions from loading to content are smooth
3. Error states handle loading component cleanup
4. Accessibility features work with screen readers

### Performance Testing
1. Animation performance under load
2. Memory usage during extended loading
3. CPU usage of CSS animations
4. Bundle size impact on page load

## Browser Compatibility

### Modern Browsers
- Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- Full support for CSS transforms and animations
- Hardware acceleration available

### Fallbacks
- Graceful degradation for older browsers
- Static loading states when animations not supported
- Progressive enhancement approach

## Maintenance

### Adding New Skeletons
1. Follow existing component patterns
2. Use base Skeleton component for consistency
3. Match structure of target component
4. Include proper accessibility attributes

### Customizing Animations
1. Modify CSS keyframes in globals.css
2. Update animation classes in components
3. Test performance impact
4. Maintain accessibility compliance

### Performance Monitoring
- Monitor animation frame rates
- Track loading state durations
- Measure user experience metrics
- Optimize based on real usage data

This implementation provides a comprehensive loading system that enhances user experience through perceived performance improvements, maintains accessibility standards, and offers flexible integration patterns for various use cases throughout the MatEx platform.
