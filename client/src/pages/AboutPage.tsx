import { PageContainer } from "@/components/layout/PageContainer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SiLinkedin } from "react-icons/si";
import { NavBar } from "@/components/NavBar";
import { JoinUsCard } from "@/components/JoinUsCard";
import { SocialLinks } from "@/components/ui/social-links";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ExternalLink } from "lucide-react";

function TimelineSection() {
  const events = [
    {
      date: "May 2023",
      title: "The First Drinky Thinky",
      description:
        "May of 2023 a few friends started talking about how to connect with the broader tech community in Sarasota. A couple weeks later we organized 'Drinky Thinky'. A casual happy hour at State street. 6 people showed up.",
      imageUrl: "https://file-upload.replit.app/api/storage/images%2F1742358869475-%231%20-%20Drinky%20Thinky.jpeg",
    },
    {
      date: "August 2023",
      title: "Growth and Momentum",
      description:
        "Our next event drew 12 attendees. Then 35. Then 65. Word was spreading across the region and people were driving from as far as Tampa, Orlando, Naples and even Miami to attend our events.",
      imageUrl: "https://file-upload.replit.app/api/storage/images%2F1742358937012-%232%20-%20ST%20%40%20CMPSE.jpeg",
    },
    {
      date: "Feb 2024",
      title: "First Tech JAM",
      description:
        "A few months later we hosted our first Tech JAM with more than 130 people from around the region! Since then we've hosted more than 20 events with more than 2,000 attendees.",
      imageUrl: "https://file-upload.replit.app/api/storage/images%2F1742359075546-LAS-285.jpg",
    },
    {
      date: "Jan 2025",
      title: "Sarasota Tech Summit",
      description:
        "In 2025 we're asking the question: Can Sarasota become a tech town? With the caveat that every town is quickly becoming a tech town. Join us as we push the city forward.",
      imageUrl: "https://file-upload.replit.app/api/storage/images%2F1742359287380-STS_Jan'25-109%20compressed.jpeg",
    },
  ];

  return (
    <div className="space-y-12 max-w-[960px] py-12 md:py-24 mx-auto">
      <div className="space-y-12 md:space-y-24">
        <h2 className="text-3xl font-bold text-center">Sarasota Tech Timeline</h2>
        {events.map((event, index) => (
          <div
            key={index}
            className={`flex flex-col gap-8 md:flex-row ${
              index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
            }`}
          >
            <div className="flex-1">
              <img
                src={event.imageUrl}
                alt={event.title}
                className="rounded-lg object-cover w-full aspect-video"
              />
            </div>
            <div className="flex-1 space-y-4">
              <time className="text-muted-foreground">{event.date}</time>
              <h3 className="text-2xl font-semibold">{event.title}</h3>
              <p className="text-muted-foreground">{event.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BoardMembersSection() {
  const members = [
    {
      name: "Pete Petersen",
      position: "Vice Chair",
      linkedIn: "https://www.linkedin.com/in/petepetersen/",
    },
    {
      name: "Toli Marchuk",
      position: "Secretary",
      linkedIn: "https://www.linkedin.com/in/tolimar/",
    },
    {
      name: "Raymmar Tirado",
      position: "Chair",
      linkedIn: "https://www.linkedin.com/in/raymmar/",
    },
    {
      name: "Vlad Ljesevic",
      position: "Treasurer",
      linkedIn: "https://www.linkedin.com/in/vladimir-ljesevic/",
    },
  ];

  return (
    <div className="space-y-12">
      <h2 className="text-3xl font-bold text-center">Founding Board Members</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {members.map((member) => (
          <a
            key={member.name}
            href={member.linkedIn}
            target="_blank"
            rel="noopener noreferrer"
            className="block transition-transform hover:scale-105"
          >
            <Card className="h-full">
              <CardContent className="text-center pt-6">
                <h3 className="font-semibold text-lg flex items-center justify-center gap-2">
                  {member.name}
                  <SiLinkedin className="text-[#0A66C2]" />
                </h3>
                <p className="text-muted-foreground">{member.position}</p>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
      <img
        src="https://file-upload.replit.app/api/storage/images%2F1742362765806-LAS-105%201.png"
        alt="Sarasota Tech Founding Board Members"
        className="w-full max-h-[50vh] rounded-lg object-cover"
      />
    </div>
  );
}

interface Person {
  id: number;
  userName: string | null;
  avatarUrl: string | null;
}

interface Member {
  id: number;
  displayName: string;
  email: string;
  person: Person | null;
}

interface BadgeUsersResponse {
  badge: {
    id: number;
    name: string;
  };
  users: Member[];
}

function FoundingMembersSection() {
  const { data, isLoading, error } = useQuery<BadgeUsersResponse>({
    queryKey: ['/api/badges/Founding Member/users'],
    enabled: true,
  });
  
  // Fisher-Yates shuffle algorithm to randomize the order of founding members
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };
  
  // Shuffle the founding members whenever the component renders
  const foundingMembers = data?.users ? shuffleArray(data.users) : [];
  
  if (isLoading) {
    return (
      <div className="space-y-12">
        <h2 className="text-3xl pt-12 font-bold text-center">Founding Members</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-12">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="w-16 h-16 mx-auto mb-2 rounded-full" />
              <Skeleton className="h-4 w-20 mx-auto" />
              <Skeleton className="h-3 w-16 mx-auto mt-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-3xl pt-12 font-bold text-center">Founding Members</h2>
        <p className="text-center text-muted-foreground">
          Unable to load founding members. Please try again later.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-12">
      <h2 className="text-3xl pt-12 font-bold text-center">Founding Members</h2>
      {foundingMembers.length === 0 ? (
        <p className="text-center text-muted-foreground">
          No founding members found.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-12">
          {foundingMembers.map((member: Member) => {
            const displayName = member.displayName || member.email?.split('@')[0];
            const initials = displayName
              .split(" ")
              .map((n: string) => n[0])
              .join("");
            const userName = member.person?.userName;
            
            const memberElement = (
              <div className="text-center">
                <Avatar className="w-16 h-16 mx-auto mb-2">
                  {member.person?.avatarUrl ? (
                    <AvatarImage src={member.person.avatarUrl} alt={displayName} />
                  ) : (
                    <AvatarFallback>{initials}</AvatarFallback>
                  )}
                </Avatar>
                <p className="font-medium text-sm">{displayName}</p>
              </div>
            );
            
            return userName ? (
              <Link key={member.id} href={`/people/${userName}`}>
                {memberElement}
              </Link>
            ) : (
              <div key={member.id}>
                {memberElement}
              </div>
            );
          })}
        </div>
      )}
      
      <div className="text-center mt-8">
        <p className="text-muted-foreground mb-4">
          If you are a founding member and do not see your name listed here, reach out to set up your account.
        </p>
        <a href="https://calendly.com/srqyou/full" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="gap-2">
            Schedule a Meeting
            <ExternalLink size={16} />
          </Button>
        </a>
      </div>
    </div>
  );
}

function TestimonialsSection() {
  const testimonials = [
    {
      name: "Chris Schrade",
      position: "Software Engineer",
      company: "Tech Corp",
      quote:
        `Great event! I've been to events in another city and it was never about building up the community/tech scene. People here seem to genuinely want to help each other where in other places it was more about 'what can you do for me?'`,
    },
    {
      name: "Thomas Waples",
      position: "Product Manager",
      company: "StartupX",
      quote:
        `Raymmar and the rest of the team do an amazing job of bringing the Sarasota Tech community together and as an outsider who works in media, they make me feel welcome every time! Congrats to another great event. Can't wait till the next one!`,
    },
    {
      name: "Rox",
      position: "CTO",
      company: "Innovation Labs",
      quote:
        `Tonight was a gem for the Sarasota tech scene, truly a golden nugget! The balance between networking and inspirational talks hit the mark. Impressive work, gentlemen. Looking forward to more!`,
    },
  ];

  return (
    <div className="max-w-[1140px] mx-auto py-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {testimonials.map((testimonial) => (
          <Card key={testimonial.name}>
            <CardContent className="pt-6">
              <blockquote className="mb-4 text-muted-foreground">
                {testimonial.quote}
              </blockquote>
              <div>
                <p className="font-medium">{testimonial.name}</p>
                {/* <p className="text-sm text-muted-foreground">
                  {testimonial.position} @ {testimonial.company}
                </p> */}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <div className="sticky top-0 w-full bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/40 z-50">
        <PageContainer className="max-w-[1140px]">
          <NavBar />
        </PageContainer>
      </div>

      <div className="flex-1">
        <div className="relative py-12 overflow-hidden">
          <PageContainer className="relative z-10 space-y-4 text-center max-w-[1140px]">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold">
              Welcome to Sarasota.Tech
            </h1>
            <p className="text-2xl text-muted-foreground text-wrap-pretty max-w-2xl mx-auto">
              We're on a mission to connect the local tech community and drive
              Sarasota forward.
            </p>
            <div className="flex flex-col items-center space-y-6 pt-6">
              <SocialLinks />
            </div>

            <div className="relative py-8">
              <img
                src="https://file-upload.replit.app/api/storage/images%2F1742362143660-STS_Jan'25-25%20compressed.jpeg"
                alt="Sarasota Tech Summit 2025"
                className="w-full max-h-[50vh] rounded-lg object-cover"
              />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-20">
                <JoinUsCard showHeader={false} />
              </div>
            </div>

            <div className="text-center space-y-4 mt-12">
              <h2 className="text-3xl font-bold">Join us on the 3rd Thursday of every month</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Every month we bounce around to
                different locations around town. Sometimes we meet at a bar/restaurant,
                sometimes at a local business HQ. Either way, you'll be networking with Sarasota's top tech professionals.
              </p>
            </div>
            <TestimonialsSection />
            <TimelineSection />
            <BoardMembersSection />
            <FoundingMembersSection />
          </PageContainer>
        </div>
      </div>
    </div>
  );
}