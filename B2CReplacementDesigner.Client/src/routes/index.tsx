import { createFileRoute, Link } from '@tanstack/react-router';
import { ContentLayout } from '@/components/layout/content-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ArrowRight, FileText, Upload, Users, Workflow, Star, Bug } from 'lucide-react';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const features = [
    {
      icon: <Upload className="w-6 h-6" />,
      title: 'Policy Upload and Interpretation',
      description: 'Seamlessly upload and display B2C policies',
    },
    {
      icon: <Workflow className="w-6 h-6" />,
      title: 'Interactive Visualization',
      description: 'Transform complex policies into clear, interactive journey diagrams',
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: 'Easy Documentation',
      description:
        'Generate detailed diagram images with comments for your solution design documents',
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Enhanced User Experience',
      description: 'Enjoy an intuitive interface designed for easy policy interpretation',
    },
  ];

  const changelogs = [
    {
      version: '1.0.0',
      date: 'September 2024',
      changes: ['Initial solution deployment'],
      type: 'feature',
    },
    {
      version: '1.1.0',
      date: 'November 2024',
      changes: [
        'Notes can bow added to the policy flow using context menu (RMB)',
        'Added expand & collapse functionality to SubJourneys',
        'Updated HomePage with changelog and updated visuals',
        'Changed menu bar to be thinner and more compact',
      ],
      type: 'feature',
    },
    {
      version: '1.1.1',
      date: 'November 2024',
      changes: [
        'Fixed a bug where Edges were covered by group nodes',
        'Fixed an issue where node updates were incorrectly processed',
      ],
      type: 'bug',
    },
    {
      version: '1.2.0',
      date: 'November 2024',
      changes: [
        'New custom nodes have been introduced for the following orchestration steps: ' +
          '<ul><li>CombinedSignInAndSignUp</li><li>ClaimsExchange</li></ul>',
        'Claims Exchange nodes are expanding on hover to ease readability',
      ],
      type: 'feature',
    },
    {
      version: '1.3.0',
      date: 'September 2025',
      changes: [
        'Update to policy upload process to improve user experience.<br/>' +
          '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Now a modal is displayed with full progress instead of a simple processing message.',
      ],
      type: 'feature',
    },
  ].sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));

  return (
    <ContentLayout title="Home">
      <div className="space-y-6 flex flex-col">
        <Card className="lg:rounded-lg rounded-none lg:border border-0">
          <CardContent className="pt-8">
            <div className="max-w-2xl">
              <h1 className="text-4xl font-bold tracking-tight mb-4">
                Visualize Your Customer Journey Policies
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                Transform complex B2C policies into interactive, step-by-step diagrams for better
                understanding and optimization of your customer journey.
              </p>
              <div className="flex items-center space-x-4">
                <Link to="/b2c/policy-template">
                  <Button>
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Button variant="outline">Learn More</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-secondary/20 rounded-lg">{feature.icon}</div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="flex-grow lg:rounded-lg rounded-none lg:border border-0 border-y">
          <CardHeader>
            <CardTitle>Changelog</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="min-h-80 pr-4">
              <div className="ml-4 relative border-l-2 border-border">
                {changelogs.map((log, index) => (
                  <div key={index} className="relative pl-8 pb-8 last:pb-0">
                    <div className="absolute -left-[15px] top-0 bg-background p-1 rounded-full border-2 border-border">
                      {log.type === 'feature' ? (
                        <Star className="w-4 h-4 text-primary" />
                      ) : (
                        <Bug className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold">Version {log.version}</h3>
                      <Badge variant={log.type === 'feature' ? 'default' : 'destructive'}>
                        {log.type}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{log.date}</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {log.changes.map((change, changeIndex) => (
                        <li key={changeIndex} dangerouslySetInnerHTML={{ __html: change }} />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}
