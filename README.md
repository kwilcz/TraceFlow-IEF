# B2C Replacement Designer

A web application for designing and managing Azure B2C trust framework policies.

## Project Structure

- **B2CReplacementDesigner.Server** - .NET 8 backend API
- **B2CReplacementDesigner.Client** - Next.js frontend application

## Getting Started

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/en/)
- [npm](https://www.npmjs.com/get-npm) or [yarn](https://yarnpkg.com/)

### Running the Backend

Navigate to the backend project:

```bash
cd B2CReplacementDesigner.Server
```

Run the project:

```bash
dotnet run
```

The API will be available at:

- **HTTPS:** `https://localhost:7285`
- **Swagger UI:** [`https://localhost:7285/swagger`](https://localhost:7285/swagger)

### Running the Frontend

Navigate to the frontend project:

```bash
cd B2CReplacementDesigner.Client
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The application will be available at:

- `http://localhost:3000`

## Starting the Application

1. Start the backend API.
2. Start the frontend development server.
3. (Optional) Start Storybook for component development.

## Development

### Frontend Development with Storybook

Storybook is used for developing and testing UI components in isolation.

Start Storybook:

```bash
npm run storybook
```

Storybook will be available at:

- `http://localhost:6006`

### Creating New Stories

Add story files next to your components with `.stories.tsx` extension.

**Basic story template:**

```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { YourComponent } from "./YourComponent";

const meta: Meta<typeof YourComponent> = {
    component: YourComponent,
};

export default meta;
type Story = StoryObj<typeof YourComponent>;

export const Primary: Story = {
    args: {
        // component props
    },
};
```

Build Storybook for deployment:

```bash
npm run build-storybook
```

## Environment Variables

### Backend (.NET)

- `ASPNETCORE_ENVIRONMENT`: `Development` or `Production`
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins

### Frontend (Next.js)

- `NEXT_PUBLIC_API_BASE_URL`: Backend API URL. Defaulted to `http://localhost:7285`


## Available Scripts

### Backend

- `dotnet run` - Run the application.
- `dotnet build` - Build the application.
- `dotnet test` - Run tests.

### Frontend

- `npm run dev` - Start development server.
- `npm run build` - Build for production.
- `npm run start` - Start production server.
- `npm run lint` - Run ESLint.
- `npm run storybook` - Start Storybook.
- `npm run build-storybook` - Build Storybook.

## CI/CD

The project uses GitHub Actions for continuous integration and deployment:

- Automated builds on push to the `main` branch.
- Deployment to Azure Web Apps.
- Environment-specific configurations.

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Azure B2C Documentation](https://learn.microsoft.com/en-us/azure/active-directory-b2c/)
- [Storybook Documentation](https://storybook.js.org/docs)
- [ReactFlow Documentation](https://reactflow.dev/docs)
