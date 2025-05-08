<p align="center"><a href="https://discord.com/invite/dsvFgDTr6c"><img height="60px" src="https://user-images.githubusercontent.com/31022056/158916278-4504b838-7ecb-4ab9-a900-7dc002aade78.png" alt="Join our Discord!"></a></p>

# Meeting BaaS Settings

A simple settings interface built with Next.js to handle user settings.

## Meeting BaaS Overview

Meeting BaaS (Backend as a Service) is a platform that provides backend services for video meetings and collaboration. The platform offers:

Meeting BaaS is a comprehensive meeting intelligence API platform providing programmatic access to meeting data across Zoom, Google Meet, and Microsoft Teams. We offer a complete suite of tools that enable developers to deploy recording bots to meetings, sync calendar events from major providers, create AI-powered meeting agents that can speak and interact, access meeting transcripts and recordings, and receive real-time updates through webhooks.

Our platform delivers multiple integration paths including RESTful APIs with JSON payloads, a fully-typed TypeScript SDK, event-driven webhook architecture, and open-source components for customization. With core APIs spanning Meeting Bots, Calendars, Speaking Bots, and Webhooks, Meeting BaaS provides enterprise-grade meeting intelligence features that can be integrated into any application with minimal development effort.

- **API Integration**: RESTful APIs for calendars, meetings, users, and webhooks management
- **SDK Support**: TypeScript SDK for easy integration into web applications
- **Bot Capabilities**: Support for speaking bots and interactive meeting assistants
- **Transcript Processing**: Tools for analyzing and searching meeting transcripts

This settings application allows users to configure their Meeting BaaS preferences and integrations.

## Tech Stack

- **Framework**: Next.js 15.3.2
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: Shadcn
- **Authentication**: Centralised Auth app integration
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- Node.js (LTS version)
- pnpm 10.6.5 or later

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Meeting-Baas/settings
   cd meeting-baas-auth
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

This project is pre-configured to integrate with the authentication app. Ensure the authentication service is running and properly configured. Update the `.env` file with the required environment variables for authentication.

### Guidelines

## Design System Documentation for the Analytics Page

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

#### Page Structure:

- Header with title and description
- Tabbed interface for category separation
- Content sections with clear visual hierarchy

#### Component Patterns:

- Service-wide controls in highlighted gradient cards
- Individual items in standard cards with consistent spacing
- Radio options in 2×4 grids for responsive layout

### Common Element Styling:

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

// Highlighted sections
<div className="p-6 bg-gradient-to-r from-muted/30 to-background rounded-lg border border-border/70 shadow-sm">
  {/* Content */}
</div>

// Radio options
<label
  className={`flex items-center space-x-2 bg-background p-4 rounded-md
              hover:bg-muted/80 transition-colors cursor-pointer border
              ${isSelected ? 'ring-2 ring-primary border-primary' : 'border-muted'}`}
>
  <RadioGroupItem value="value" id="id" />
  <Label className="text-sm font-medium cursor-pointer">Label</Label>
</label>
```

### State Management / Data Fetching Pattern:

```tsx
const [loading, setLoading] = useState(true);
const [data, setData] = useState<DataType>({});

useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const apiData = await apiFunction(USER_TOKEN);
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

### Central Types System:

- Define all types in a dedicated types file
- Use consistent naming across components

### Notification System

We use Sonner toast for notifications:

```tsx
// Success notification
toast.success("Action completed successfully");

// Error notification
toast.error("Failed to complete action");
```

### API Integration

Mock the API first, then replace with real implementation:

```tsx
// Example API function in your analytics-api.ts
export async function getAnalyticsData(
  userToken: string
): Promise<AnalyticsData> {
  console.log("[MOCK API] Fetching analytics data");

  try {
    return await axios({
      method: "GET",
      url: `/api/analytics/data`,
      headers: { Authorization: userToken },
    }).data;
  } catch (error) {
    console.error("[MOCK API] Error:", error);
    // Return mock data for development
    return {
      /* mock data */
    };
  }
}
```
