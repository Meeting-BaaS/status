<p align="center"><a href="https://discord.com/invite/dsvFgDTr6c"><img height="60px" src="https://user-images.githubusercontent.com/31022056/158916278-4504b838-7ecb-4ab9-a900-7dc002aade78.png" alt="Join our Discord!"></a></p>

# Meeting BaaS Status

A public status page built with Next.js to monitor and analyze the status of all meeting bots across multiple platforms.

## Meeting BaaS Status Overview

Meeting BaaS Status is a public-facing status page that provides real-time insights into the performance of all meeting bots across the platform. This project is a fork of the Meeting BaaS Analytics dashboard, modified to provide a public view of all bots rather than just user-specific analytics. The platform offers:

- **Public Status Monitoring**: Track the status of all meeting bots across Zoom, Google Meet, and Microsoft Teams
- **Real-time Performance Tracking**: Monitor bot success rates, error rates, and performance metrics
- **Interactive Visualizations**: Beautiful and responsive charts for data visualization
- **Customizable Filters**: Filter data by date range, platform, error type, and more
- **Error Analysis**: Comprehensive insights into error patterns and trends
- **Duration Analytics**: Analysis of meeting durations and patterns
- **Issue Reports**: Track and monitor reported issues across all bots

## Relationship with Meeting BaaS Analytics

This project is a fork of the Meeting BaaS Analytics dashboard, with the following key differences:

- **Public Access**: Unlike the analytics dashboard which shows user-specific data, this status page displays information for all bots
- **Simplified Interface**: Focused on public-facing status information rather than detailed analytics

## Tech Stack

- **Framework**: Next.js 15.3.2
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: Shadcn (Radix UI)
- **Charts**: Recharts with D3
- **Authentication**: Centralised Auth app integration
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- Node.js (LTS version)
- pnpm 10.6.5 or later

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Meeting-Baas/status
   cd status
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env
   ```

   Fill in the required environment variables in `.env`. Details about the expected values for each key is documented in .env.example

### Development

Start the development server:

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

### Authentication Integration

This project is pre-configured to integrate with the authentication app. While the app itself doesn't need authentication, certain UI features like the header make use of authentication services. Ensure the authentication service is running and properly configured. Update the `.env` file with the required environment variables for authentication.

## Design System Documentation

### ShadCN Components Usage

We use ShadCN UI components throughout the application:

```tsx
// Core components we use frequently
import {
  Card,
  CardHeader,
  CardContent,
  CardDescription,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  RadioGroup,
  RadioGroupItem,
  Badge,
  Label,
  AlertDialog,
} from "@/components/ui";
```

### Layout Patterns

#### Page Structure

- Header with title and description
- Tabbed interface for different analytics views
- Content sections with clear visual hierarchy

#### Component Patterns

- Analytics cards with consistent styling
- Interactive charts with tooltips
- Filter controls for data manipulation

### Common Element Styling

```tsx
// Tab styling with animated underline
<TabsTrigger
  className="flex-1 flex items-center justify-center gap-2 relative group"
  style={{ minHeight: "40px" }}
>
  <div className={`w-2 h-2 ${colorVariable} rounded-full`}></div>
  <span>{label}</span>
  <div className="absolute bottom-0 left-0 w-full h-0.5 scale-x-0 group-data-[state=active]:scale-x-100 transition-transform duration-300 ease-in-out"
       style={{ backgroundColor: colorVariable }}></div>
</TabsTrigger>

// Analytics cards
<div className="p-6 bg-gradient-to-r from-muted/30 to-background rounded-lg border border-border/70 shadow-sm">
  {/* Content */}
</div>
```

### State Management / Data Fetching Pattern

```tsx
const [loading, setLoading] = useState(true);
const [data, setData] = useState<DataType>({});

useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const apiData = await apiFunction();
      setData(apiData);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, []);
```

### Notification System

We use Sonner toast for notifications:

```tsx
// Success notification
toast.success("Action completed successfully");

// Error notification
toast.error("Failed to complete action");
```

### API Integration

The status API provides comprehensive data for public status visualization:

```tsx
// Example API function in your status-api.ts
export async function getBotStats(
  params: BotStatsParams
): Promise<BotStatsData> {
  try {
    return await axios({
      method: "GET",
      url: `/api/bot-stats`,
      params,
    }).data;
  } catch (error) {
    console.error("[API] Error:", error);
    throw error;
  }
}
```
