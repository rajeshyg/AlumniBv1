import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { logger } from '../utils/logger';
import {
  Bell,
  Calendar,
  Users,
  FileText,
  Activity,
  BarChart2,
  MessageSquare,
  Newspaper,
  ChevronRight,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';

interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  type: 'info' | 'warning' | 'success';
}

interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
}

interface Activity {
  id: string;
  user: {
    name: string;
    avatar?: string;
  };
  action: string;
  target: string;
  timestamp: string;
  type: 'post' | 'comment' | 'like' | 'event';
}

const Home: React.FC = () => {
  const { authState } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState({
    posts: 0,
    connections: 0,
    messages: 0,
    events: 0
  });

  // Get current time for greeting
  const currentHour = new Date().getHours();
  let greeting = "Good morning";
  if (currentHour >= 12 && currentHour < 17) {
    greeting = "Good afternoon";
  } else if (currentHour >= 17) {
    greeting = "Good evening";
  }

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);

        // In a real app, these would be API calls
        // Mock data for demo purposes
        setAnnouncements([
          {
            id: '1',
            title: 'New Feature: Chat System',
            content: 'We have launched a new chat system to help you connect with fellow alumni more easily.',
            date: '2023-07-01T10:00:00Z',
            type: 'info'
          },
          {
            id: '2',
            title: 'Alumni Meet 2023',
            content: 'The annual alumni meet is scheduled for October 15, 2023. Registration opens next week.',
            date: '2023-06-28T14:30:00Z',
            type: 'success'
          },
          {
            id: '3',
            title: 'Platform Maintenance',
            content: 'Scheduled maintenance on July 5th from 2AM to 4AM. Some features may be unavailable.',
            date: '2023-06-25T09:15:00Z',
            type: 'warning'
          }
        ]);

        setEvents([
          {
            id: '1',
            title: 'Career Fair 2023',
            date: '2023-07-15T09:00:00Z',
            location: 'Virtual Event'
          },
          {
            id: '2',
            title: 'Workshop: Leadership Skills',
            date: '2023-07-22T14:00:00Z',
            location: 'Main Campus'
          },
          {
            id: '3',
            title: 'Alumni Meet 2023',
            date: '2023-10-15T10:00:00Z',
            location: 'Convention Center'
          }
        ]);

        setActivities([
          {
            id: '1',
            user: { name: 'Alex Johnson' },
            action: 'posted',
            target: 'Job Opportunity at Tech Solutions',
            timestamp: '2023-06-30T11:23:00Z',
            type: 'post'
          },
          {
            id: '2',
            user: { name: 'Priya Sharma' },
            action: 'commented on',
            target: 'Alumni Meet 2023',
            timestamp: '2023-06-29T15:45:00Z',
            type: 'comment'
          },
          {
            id: '3',
            user: { name: 'Mohamed Ali' },
            action: 'attending',
            target: 'Career Fair 2023',
            timestamp: '2023-06-28T09:10:00Z',
            type: 'event'
          },
          {
            id: '4',
            user: { name: 'Sarah Williams' },
            action: 'posted',
            target: 'Mentorship Program Open',
            timestamp: '2023-06-27T14:30:00Z',
            type: 'post'
          },
          {
            id: '5',
            user: { name: 'David Chen' },
            action: 'liked',
            target: 'your post about the networking event',
            timestamp: '2023-06-26T16:15:00Z',
            type: 'like'
          }
        ]);

        setStats({
          posts: 124,
          connections: 78,
          messages: 32,
          events: 8
        });
      } catch (error) {
        logger.error('Error loading dashboard data:', error);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-md">
        {error}
      </div>
    );
  }

  // Format timestamp for display
  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMins / 60);
    const diffDays = Math.round(diffHours / 24);

    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 to-primary/5 p-6 rounded-xl">
        <div>
          <h1 className="text-3xl font-bold mb-2">{greeting}, {authState.currentUser?.name?.split(' ')[0]}</h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, MMMM do, yyyy")} • Welcome to your alumni community dashboard
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>My Calendar</span>
          </Button>
          <Button size="sm" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span>New Message</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.posts}</div>
              <FileText className="w-8 h-8 text-primary/40" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.connections}</div>
              <Users className="w-8 h-8 text-primary/40" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.messages}</div>
              <MessageSquare className="w-8 h-8 text-primary/40" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
      <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.events}</div>
              <Calendar className="w-8 h-8 text-primary/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Announcements */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Announcements</CardTitle>
              <Newspaper className="w-5 h-5 text-muted-foreground" />
            </div>
            <CardDescription>Latest updates from the community</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {announcements.map(announcement => (
              <div key={announcement.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{announcement.title}</h3>
                    <p className="text-sm text-muted-foreground">{announcement.content}</p>
                  </div>
                  <Badge
                    variant={
                      announcement.type === 'warning' ? 'destructive' :
                      announcement.type === 'success' ? 'default' : 'secondary'
                    }
                  >
                    {announcement.type === 'warning' ? 'Important' :
                     announcement.type === 'success' ? 'New' : 'Info'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {format(new Date(announcement.date), "MMM d, yyyy")}
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" className="ml-auto flex items-center gap-1">
              View All <ChevronRight className="w-3 h-3" />
            </Button>
          </CardFooter>
        </Card>

        {/* Right Column: Activity & Events */}
        <div className="space-y-6">
          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Upcoming Events</CardTitle>
                <Calendar className="w-5 h-5 text-muted-foreground" />
              </div>
              <CardDescription>Events you might be interested in</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {events.slice(0, 3).map(event => (
                <div key={event.id} className="flex items-start space-x-3">
                  <div className="bg-primary/10 text-primary rounded p-2 text-center w-12">
                    <div className="text-xs">{format(new Date(event.date), "MMM")}</div>
                    <div className="text-lg font-bold">{format(new Date(event.date), "d")}</div>
                  </div>
                  <div>
                    <h4 className="font-medium">{event.title}</h4>
                    <p className="text-xs text-muted-foreground">{event.location}</p>
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="ml-auto flex items-center gap-1">
                View Calendar <ChevronRight className="w-3 h-3" />
              </Button>
            </CardFooter>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Activity</CardTitle>
                <Activity className="w-5 h-5 text-muted-foreground" />
              </div>
              <CardDescription>What's happening in your network</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activities.slice(0, 5).map(activity => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="bg-muted h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground">
                    {activity.type === 'post' && <FileText className="w-4 h-4" />}
                    {activity.type === 'comment' && <MessageSquare className="w-4 h-4" />}
                    {activity.type === 'like' && <Activity className="w-4 h-4" />}
                    {activity.type === 'event' && <Calendar className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm">
                      <span className="font-medium">{activity.user.name}</span>{' '}
                      {activity.action}{' '}
                      <span className="text-primary">{activity.target}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimeAgo(activity.timestamp)}
                    </p>
                  </div>
          </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="ml-auto flex items-center gap-1">
                View All Activity <ChevronRight className="w-3 h-3" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Reports & Community Insights */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Community Insights</CardTitle>
            <BarChart2 className="w-5 h-5 text-muted-foreground" />
          </div>
          <CardDescription>Statistics and trends from your alumni community</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="engagement">
            <TabsList className="custom-tabs-list mb-4">
              <TabsTrigger value="engagement" className="custom-tab-trigger">Engagement</TabsTrigger>
              <TabsTrigger value="posts" className="custom-tab-trigger">Posts</TabsTrigger>
              <TabsTrigger value="jobs" className="custom-tab-trigger">Job Opportunities</TabsTrigger>
            </TabsList>
            <TabsContent value="engagement" className="space-y-4">
              <div className="h-[200px] bg-primary/5 rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Engagement chart visualization would appear here</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-muted/40 p-4 rounded-lg">
                  <p className="text-sm font-medium mb-1">Most Active Time</p>
                  <p className="text-2xl font-bold">Wednesdays</p>
                  <p className="text-xs text-muted-foreground">2-4 PM is peak engagement</p>
                </div>
                <div className="bg-muted/40 p-4 rounded-lg">
                  <p className="text-sm font-medium mb-1">Top Engagement</p>
                  <p className="text-2xl font-bold">Career Posts</p>
                  <p className="text-xs text-muted-foreground">32% higher than average</p>
                </div>
                <div className="bg-muted/40 p-4 rounded-lg">
                  <p className="text-sm font-medium mb-1">Your Engagement</p>
                  <p className="text-2xl font-bold">Above Average</p>
                  <p className="text-xs text-muted-foreground">Top 25% of community members</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="posts">
              <div className="h-[280px] bg-primary/5 rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Posts analytics visualization would appear here</p>
              </div>
            </TabsContent>
            <TabsContent value="jobs">
              <div className="h-[280px] bg-primary/5 rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Job opportunities visualization would appear here</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" className="ml-auto flex items-center gap-1">
            View Full Reports <ChevronRight className="w-3 h-3" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Home;