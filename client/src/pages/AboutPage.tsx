import { PageContainer } from "@/components/layout/PageContainer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CursorEffect } from "@/components/ui/cursor-effect";
import {
  SiLinkedin,
  SiFacebook,
  SiInstagram,
  SiWhatsapp,
} from "react-icons/si";
import { FaTwitter } from "react-icons/fa";
import { NavBar } from "@/components/NavBar";
import { JoinUsCard } from "@/components/JoinUsCard";
import { Button } from "@/components/ui/button";
import { Billboard, BillboardItem } from "@/components/ui/billboard";
import { SocialLinks } from "@/components/ui/social-links";

function TimelineSection() {
  const events = [
    {
      date: "May 2023",
      title: "The First Drinky Thinky",
      description:
        "Early in May of 2023 a few friends started talking about how to connect with folks from the broader tech community in Sarasota. A couple weeks later we organized 'Drinky Thinky'. A casual happy hour at State street. 6 people showed up.",
      imageUrl: "https://placehold.co/600x400",
    },
    {
      date: "August 2023",
      title: "Growth and Momentum",
      description:
        "Our next event drew 12 attendees. Then 35. Then 65. Word was spreading across the region and people were driving from as far as Tampa, Orlando, Naples and even Miami to attend our events.",
      imageUrl: "https://placehold.co/600x400",
    },
    {
      date: "January 2024",
      title: "First Tech JAM",
      description:
        "A few months later we hosted our first Tech JAM and 130 people showed up! Since then we have hosted 22 events with more than 2,000 attendees.",
      imageUrl: "https://placehold.co/600x400",
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
      avatar: "https://placehold.co/150",
    },
    {
      name: "Pete Petersen",
      position: "Vice Chair",
      avatar: "https://placehold.co/150",
    },
    {
      name: "Vlad Ljesevic",
      position: "Treasurer",
      avatar: "https://placehold.co/150",
    },
    {
      name: "Toli Marchuk",
      position: "Secretary",
      avatar: "https://placehold.co/150",
    },
  ];

  return (
    <div className="space-y-12">
      <h2 className="text-3xl font-bold text-center">Founding Board Members</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {members.map((member) => (
          <Card key={member.name}>
            <CardHeader className="text-center">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarImage src={member.avatar} alt={member.name} />
                <AvatarFallback>
                  {member.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-semibold text-lg">{member.name}</h3>
              <p className="text-muted-foreground">{member.position}</p>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

function FoundingMembersSection() {
  const members = Array.from({ length: 22 }, (_, i) => ({
    name: `Founding Member ${i + 1}`,
    contributionArea: ["Technical", "Community", "Events", "Marketing"][i % 4],
    avatar: "https://placehold.co/150",
  }));

  return (
    <div className="space-y-12">
      <h2 className="text-3xl pt-12 font-bold text-center">Founding Members</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-12">
        {members.map((member) => (
          <div key={member.name} className="text-center">
            <Avatar className="w-16 h-16 mx-auto mb-2">
              <AvatarImage src={member.avatar} alt={member.name} />
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
      name: "John Doe",
      position: "Software Engineer",
      company: "Tech Corp",
      quote:
        "Sarasota.Tech events have been instrumental in connecting me with the local tech community. The networking opportunities are invaluable!",
      avatar: "https://placehold.co/150",
    },
    {
      name: "Jane Smith",
      position: "Product Manager",
      company: "StartupX",
      quote:
        "The monthly meetups are a highlight! It's amazing to see how the tech scene in Sarasota has grown through these events.",
      avatar: "https://placehold.co/150",
    },
    {
      name: "Mike Johnson",
      position: "CTO",
      company: "Innovation Labs",
      quote:
        "As a company leader, these events have helped us find great local talent and build meaningful partnerships.",
      avatar: "https://placehold.co/150",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 max-w-[1140px] pt-12 sm:grid-cols-2 lg:grid-cols-3 gap-6 mx-auto">
        {testimonials.map((testimonial) => (
          <Card key={testimonial.name}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Avatar className="w-10 h-10">
                  <AvatarImage
                    src={testimonial.avatar}
                    alt={testimonial.name}
                  />
                  <AvatarFallback>
                    {testimonial.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.position} @ {testimonial.company}
                  </p>
                </div>
              </div>
              <blockquote className="mt-4 text-muted-foreground">
                "{testimonial.quote}"
              </blockquote>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function BillboardSection() {
  const stats = [
    { title: "Tech Events", value: "22+" },
    { title: "Members", value: "2,000+" },
    { title: "Cities Reached", value: "5+" },
  ];

  return (
    <Billboard className="my-12">
      {stats.map((stat) => (
        <BillboardItem key={stat.title}>
          <h3 className="text-4xl font-bold">{stat.value}</h3>
          <p className="text-muted-foreground">{stat.title}</p>
        </BillboardItem>
      ))}
    </Billboard>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <CursorEffect />
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

            <BillboardSection />
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold">Join us on the 3rd Thursday of every month</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Every month we bounce around to
                different locations around town. Sometimes we meet at a bar/restaurant,
                sometimes at a local business HQ. Either way, it's always a blast!
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