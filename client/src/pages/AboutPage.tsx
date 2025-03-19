import { PageContainer } from "@/components/layout/PageContainer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { SiLinkedin } from "react-icons/si";
import { NavBar } from "@/components/NavBar";
import { JoinUsCard } from "@/components/JoinUsCard";
import { SocialLinks } from "@/components/ui/social-links";

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
      name: "Raymmar Tirado",
      position: "Chair",
      linkedIn: "https://www.linkedin.com/in/raymmar/",
    },
    {
      name: "Pete Petersen",
      position: "Vice Chair",
      linkedIn: "https://www.linkedin.com/in/petepetersen/",
    },
    {
      name: "Vlad Ljesevic",
      position: "Treasurer",
      linkedIn: "https://www.linkedin.com/in/vladljesevic/",
    },
    {
      name: "Toli Marchuk",
      position: "Secretary",
      linkedIn: "https://www.linkedin.com/in/tolimarchuk/",
    },
  ];

  return (
    <div className="space-y-12">
      <img 
        src="https://placehold.co/1140x400" 
        alt="Board Members" 
        className="w-full rounded-lg object-cover"
      />
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
    </div>
  );
}

function FoundingMembersSection() {
  const members = Array.from({ length: 22 }, (_, i) => ({
    name: `Founding Member ${i + 1}`,
    contributionArea: ["Technical", "Community", "Events", "Marketing"][i % 4],
  }));

  return (
    <div className="space-y-12">
      <h2 className="text-3xl pt-12 font-bold text-center">Founding Members</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-12">
        {members.map((member) => (
          <div key={member.name} className="text-center">
            <Avatar className="w-16 h-16 mx-auto mb-2">
              <AvatarFallback>
                {member.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <p className="font-medium text-sm">{member.name}</p>
            <p className="text-xs text-muted-foreground">
              {member.contributionArea}
            </p>
          </div>
        ))}
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
      name: "Jane Smith",
      position: "Product Manager",
      company: "StartupX",
      quote:
        `The monthly meetups are a highlight! It's amazing to see how the tech scene in Sarasota has grown through these events.`,
    },
    {
      name: "Mike Johnson",
      position: "CTO",
      company: "Innovation Labs",
      quote:
        `As a company leader, these events have helped us find great local talent and build meaningful partnerships.`,
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
                <p className="text-sm text-muted-foreground">
                  {testimonial.position} @ {testimonial.company}
                </p>
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
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-border/50" />
        </PageContainer>
      </div>

      <div className="flex-1">
        <div className="relative py-12 overflow-hidden">
          <PageContainer className="relative z-10 space-y-4 text-center max-w-[1140px]">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold">
              Welcome to Sarasota.Tech
            </h1>
            <p className="text-xl text-muted-foreground text-wrap-pretty max-w-2xl mx-auto">
              We're on a mission to connect the local tech community and drive
              Sarasota forward.
            </p>
            <div className="flex flex-col items-center space-y-6 pt-6">
              <SocialLinks />
              <div className="w-full max-w-md">
                <JoinUsCard showHeader={false} />
              </div>
            </div>

            <img 
              src="https://placehold.co/1140x400" 
              alt="Sarasota Tech" 
              className="w-full rounded-lg object-cover my-12"
            />

            <div className="text-center space-y-4">
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