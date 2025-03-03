import { useQuery } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout/PageContainer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SiLinkedin, SiFacebook, SiInstagram, SiWhatsapp } from "react-icons/si";
import { FaTwitter } from "react-icons/fa";
import { NavBar } from "@/components/NavBar";
import type { TimelineEvent, BoardMember, FoundingMember, Testimonial, Person } from "@shared/schema";

function SocialLinks() {
  const socialLinks = [
    { Icon: SiLinkedin, href: "#", label: "LinkedIn" },
    { Icon: SiFacebook, href: "#", label: "Facebook" },
    { Icon: SiInstagram, href: "#", label: "Instagram" },
    { Icon: FaTwitter, href: "#", label: "Twitter" },
    { Icon: SiWhatsapp, href: "#", label: "WhatsApp" },
  ];

  return (
    <div className="flex gap-4 justify-center">
      {socialLinks.map(({ Icon, href, label }) => (
        <a
          key={label}
          href={href}
          className="text-muted-foreground hover:text-primary transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon className="w-6 h-6" />
          <span className="sr-only">{label}</span>
        </a>
      ))}
    </div>
  );
}

function TimelineSection({ events }: { events: Array<TimelineEvent & { imageUrl: string | null }> }) {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-center">Our Journey</h2>
      <div className="space-y-12">
        {events.map((event, index) => (
          <div
            key={event.id}
            className={`flex gap-8 items-center ${
              index % 2 === 0 ? "flex-row" : "flex-row-reverse"
            }`}
          >
            {event.imageUrl && (
              <div className="flex-1">
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="rounded-lg object-cover w-full aspect-video"
                />
              </div>
            )}
            <div className="flex-1 space-y-4">
              <time className="text-muted-foreground">
                {new Date(event.date).toLocaleDateString()}
              </time>
              <h3 className="text-2xl font-semibold">{event.title}</h3>
              <p className="text-muted-foreground">{event.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BoardMembersSection({ members }: { members: Array<BoardMember & { person: Person }> }) {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-center">Board Members</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {members.map((member) => (
          <Card key={member.id}>
            <CardHeader className="text-center">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                {member.person.avatarUrl ? (
                  <AvatarImage src={member.person.avatarUrl} alt={member.person.fullName || ""} />
                ) : (
                  <AvatarFallback>
                    {member.person.fullName?.split(" ").map((n) => n[0]).join("") || "?"}
                  </AvatarFallback>
                )}
              </Avatar>
              <h3 className="font-semibold text-lg">{member.person.fullName}</h3>
              <p className="text-muted-foreground">{member.position}</p>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

function FoundingMembersSection({ members }: { members: Array<FoundingMember & { person: Person }> }) {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-center">Founding Members</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {members.map((member) => (
          <div key={member.id} className="text-center">
            <Avatar className="w-16 h-16 mx-auto mb-2">
              {member.person.avatarUrl ? (
                <AvatarImage src={member.person.avatarUrl} alt={member.person.fullName || ""} />
              ) : (
                <AvatarFallback>
                  {member.person.fullName?.split(" ").map((n) => n[0]).join("") || "?"}
                </AvatarFallback>
              )}
            </Avatar>
            <p className="font-medium text-sm">{member.person.fullName}</p>
            {member.contributionArea && (
              <p className="text-xs text-muted-foreground">{member.contributionArea}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TestimonialsSection({ testimonials }: { testimonials: Array<Testimonial & { person: Person }> }) {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-center">What Our Members Say</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testimonials.map((testimonial) => (
          <Card key={testimonial.id}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Avatar className="w-10 h-10">
                  {testimonial.person.avatarUrl ? (
                    <AvatarImage
                      src={testimonial.person.avatarUrl}
                      alt={testimonial.person.fullName || ""}
                    />
                  ) : (
                    <AvatarFallback>
                      {testimonial.person.fullName?.split(" ").map((n) => n[0]).join("") || "?"}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="font-medium">{testimonial.person.fullName}</p>
                  {(testimonial.position || testimonial.company) && (
                    <p className="text-sm text-muted-foreground">
                      {[testimonial.position, testimonial.company].filter(Boolean).join(" @ ")}
                    </p>
                  )}
                </div>
              </div>
              <blockquote className="mt-4 text-muted-foreground">"{testimonial.quote}"</blockquote>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function AboutPage() {
  const { data: timelineData } = useQuery<{ events: TimelineEvent[] }>({
    queryKey: ["/api/timeline-events"],
  });

  const { data: boardData } = useQuery<{ members: Array<BoardMember & { person: Person }> }>({
    queryKey: ["/api/board-members"],
  });

  const { data: foundingData } = useQuery<{ members: Array<FoundingMember & { person: Person }> }>({
    queryKey: ["/api/founding-members"],
  });

  const { data: testimonialsData } = useQuery<{
    testimonials: Array<Testimonial & { person: Person }>;
  }>({
    queryKey: ["/api/testimonials"],
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Global Navigation */}
      <div className="sticky top-0 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 border-b">
        <PageContainer>
          <NavBar />
        </PageContainer>
      </div>

      {/* Hero Section */}
      <div className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-background" />
        </div>
        <PageContainer className="relative z-10 space-y-8 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold">
            Welcome to Sarasota.Tech
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We're on a mission to connect the local tech community and push Sarasota forward.
          </p>
          <SocialLinks />
        </PageContainer>
      </div>

      {/* Content Sections */}
      <PageContainer className="py-16 space-y-24">
        {/* Monthly Meetup Section */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold">3rd Thursday Meetups</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Join us every third Thursday of the month as we bounce around to different locations.
            Sometimes we meet at a bar/restaurant, sometimes at a local business HQ. Either way,
            it's always a blast!
          </p>
        </div>

        {/* Timeline Section */}
        {timelineData?.events && <TimelineSection events={timelineData.events} />}

        {/* Board Members Section */}
        {boardData?.members && <BoardMembersSection members={boardData.members} />}

        {/* Founding Members Section */}
        {foundingData?.members && <FoundingMembersSection members={foundingData.members} />}

        {/* Testimonials Section */}
        {testimonialsData?.testimonials && (
          <TestimonialsSection testimonials={testimonialsData.testimonials} />
        )}
      </PageContainer>
    </div>
  );
}