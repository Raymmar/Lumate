import { PageContainer } from "@/components/layout/PageContainer";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, ExternalLink, Ticket, Building2, Users } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { FeaturedCompaniesGrid } from "@/components/companies/FeaturedCompaniesGrid";
import imageUrl from "@assets/image_1761417110623.png";

function EventLinksCard() {
  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <CardTitle>Event Links</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex flex-col gap-3">
          <a href="https://luma.com/sts26" target="_blank" rel="noopener noreferrer" className="block">
            <Button variant="outline" className="w-full justify-between font-normal hover:bg-muted">
              <span className="flex items-center gap-2">
                <Ticket className="h-4 w-4" />
                Get Tickets
              </span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
          <a href="https://www.dropbox.com/scl/fo/tx5vb725ywzytkfog1iv1/AGfyY_yWKWKsnOn64QjCXiA?rlkey=ue2nlaso4lrb3ug59memgqqmh&dl=0" target="_blank" rel="noopener noreferrer" className="block">
            <Button variant="outline" className="w-full justify-between font-normal hover:bg-muted">
              <span className="flex items-center gap-2">
                Photos from 2025
              </span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
          <Button variant="outline" className="w-full justify-between font-normal hover:bg-muted" asChild>
            <Link href="/summit2025">
              2025 Summit Archive
            </Link>
          </Button>
          <Button variant="outline" className="w-full justify-between font-normal hover:bg-muted" asChild>
            <Link href="/about">
              About Sarasota Tech
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EventDetailsCard() {
  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <CardTitle>Event Details</CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 mt-0.5 text-muted-foreground" />
          <div>
            <div className="font-medium">January 15th, 2026</div>
            <div className="text-sm text-muted-foreground">5:00 PM - 10:00 PM</div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 mt-0.5 text-muted-foreground" />
          <div>
            <div className="font-medium">MOTE SEA Event Space</div>
            <div className="text-sm text-muted-foreground">Downtown Sarasota</div>
          </div>
        </div>
        <div className="pt-2">
          <a href="https://luma.com/sts26" target="_blank" rel="noopener noreferrer" className="block">
            <Button className="w-full" size="lg">
              Register Now
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

function AgendaCard() {
  return (
    <Card className="border">
      <CardHeader>
        <CardTitle>Event Agenda</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="font-bold min-w-[80px] text-sm">5:00 - 6:00</div>
            <div className="flex-1">
              <div className="font-semibold text-sm">Registration & Networking</div>
              <div className="text-xs text-muted-foreground mt-1">Arrival + Food + Startup Fair Opens</div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="font-bold min-w-[80px] text-sm">6:00 - 6:30</div>
            <div className="flex-1">
              <div className="font-semibold text-sm">Opening Keynote</div>
              <div className="text-xs text-muted-foreground mt-1">Welcome & State of Sarasota Tech</div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="font-bold min-w-[80px] text-sm">6:30 - 7:30</div>
            <div className="flex-1">
              <div className="font-semibold text-sm">Panel Discussion</div>
              <div className="text-xs text-muted-foreground mt-1">Building Successful Startups in Sarasota</div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="font-bold min-w-[80px] text-sm">7:30 - 8:30</div>
            <div className="flex-1">
              <div className="font-semibold text-sm">Startup Showcase</div>
              <div className="text-xs text-muted-foreground mt-1">Local startups present to the community</div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="font-bold min-w-[80px] text-sm">8:30 - 10:00</div>
            <div className="flex-1">
              <div className="font-semibold text-sm">Networking Reception</div>
              <div className="text-xs text-muted-foreground mt-1">Connect with founders & investors</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SponsorCardProps {
  sponsor: {
    name: string;
    logo: string;
    description: string;
    category?: string;
    url?: string;
  };
}

function SponsorCard({ sponsor }: SponsorCardProps) {
  return (
    <Card className="border h-full">
      <CardContent className="p-4 flex flex-col h-full">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 flex-shrink-0 bg-muted rounded-md p-2 flex items-center justify-center">
            <img 
              src={sponsor.logo} 
              alt={sponsor.name} 
              className="max-w-full max-h-full object-contain" 
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm truncate">{sponsor.name}</h3>
            {sponsor.category && (
              <p className="text-xs text-muted-foreground">{sponsor.category}</p>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground flex-grow line-clamp-3">
          {sponsor.description}
        </p>
        {sponsor.url && (
          <div className="mt-3 pt-3 border-t">
            <a 
              href={sponsor.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs font-medium text-primary hover:text-primary/80 flex items-center"
            >
              Learn more <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ImageGalleryCard() {
  const galleryImages = [
    {
      src: "https://file-upload.replit.app/api/storage/images%2F1744267083489-Thumbnail--Main.png",
      alt: "Sarasota Tech Summit 2025"
    },
    {
      src: "https://file-upload.replit.app/api/storage/images%2F1744267132207-2-Question.png",
      alt: "Event highlights"
    },
    {
      src: "https://file-upload.replit.app/api/storage/images%2F1744267136780-3-VC-Sponsors.png",
      alt: "Sponsors"
    },
    {
      src: "https://file-upload.replit.app/api/storage/images%2F1744267140023-4-Abstract-text.png",
      alt: "Event graphics"
    }
  ];

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <>
      <Card className="border">
        <CardHeader>
          <CardTitle>2025 Event Gallery</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {galleryImages.map((image, index) => (
              <div 
                key={index} 
                className="relative overflow-hidden rounded-lg cursor-pointer group aspect-video"
                onClick={() => setSelectedImage(image.src)}
              >
                <img 
                  src={image.src} 
                  alt={image.alt} 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">View</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lightbox */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-screen-lg max-h-[90vh]">
            <img 
              src={selectedImage} 
              alt="Enlarged view" 
              className="max-h-[90vh] max-w-full object-contain"
            />
            <button 
              className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function SummitPage() {
  const vcSponsors = [
    {
      name: "Truist Foundation",
      logo: "https://cdn.prod.website-files.com/65a1eea802e18211e164d424/67327c7631db707c11c708cf_1icejcbpd-8VNNJZRB.webp",
      description: "Truist's purpose is to inspire and build better lives and communities.",
      category: "Finance",
      url: "https://www.sarasota.tech/entities/truist-foundation"
    },
    {
      name: "EDC of Sarasota County",
      logo: "https://cdn.prod.website-files.com/65a1eea802e18211e164d424/65cd141854050092684729e6_1hmkhcvr3-CZZEY10D.webp",
      description: "The EDC works to grow, diversify and sustain the economy of Sarasota County.",
      category: "Professional Services",
      url: "https://www.sarasota.tech/entities/sarasota-edc"
    }
  ];

  const startupSponsors = [
    {
      name: "ROBRADY",
      logo: "https://cdn.prod.website-files.com/65a1eea802e18211e164d424/65fb0982b27fdcf74e7f4a4f_1hpe9q1is-CGNXH684.webp",
      description: "ROBRADY design is a full-service, multi-disciplined product design and development studio.",
      category: "Technology",
      url: "https://www.sarasota.tech/entities/robrady"
    },
    {
      name: "RevContent",
      logo: "https://cdn.prod.website-files.com/65a1eea802e18211e164d424/675b318431e4c0210021f821_281762150_3940173906208184_4235986378783041098_n.jpg",
      description: "RevContent connects advertisers to highly engaged audiences on the web's leading publisher sites.",
      category: "Technology",
      url: "https://www.sarasota.tech/entities/revcontent"
    },
    {
      name: "lab SRQ",
      logo: "https://cdn.prod.website-files.com/65a1eea802e18211e164d424/674faa1452273d5c064600af_1ie7j0mp0-M2JWEPRT.webp",
      description: "Whether you're looking to work on your own or collaborate with others, this space is for anyone ready to get their grind on.",
      category: "Coworking",
      url: "https://www.sarasota.tech/entities/lab-srq"
    }
  ];

  const advisorySponsors = [
    {
      name: "SCF Center for Advanced Technology and Innovation",
      logo: "https://cdn.prod.website-files.com/65a1eea802e18211e164d424/677d469885576e2f6410432b_1ih0lnd76-2WP2JX8W.webp",
      description: "Advancing education and innovation in technology.",
      category: "Education",
      url: "https://www.sarasota.tech/entities/scf-center-for-advanced-technology-and-innovation"
    },
    {
      name: "Suncoast Science Center/Faulhaber Fab Lab",
      logo: "https://cdn.prod.website-files.com/65a1eea802e18211e164d424/677b768a14094b95e1f1a6e6_327319518_480901650901561_1132036045765432866_n.png",
      description: "Fostering STEM education and innovation through hands-on learning.",
      category: "Education",
      url: "https://www.sarasota.tech/entities/suncoast-science-center-faulhaber-fab-lab"
    },
    {
      name: "USF Muma College of Business",
      logo: "https://cdn.prod.website-files.com/65a1eea802e18211e164d424/675b55d2bf9d5cdf9fadc0ec_1ieuceb3b-631TKYGH.png",
      description: "Preparing students for success in business and technology.",
      category: "Education",
      url: "https://www.sarasota.tech/entities/usf-muma-college-of-business-sarasota-manatee"
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Gradient Sunburst Background - centered on top right corner */}
      <div className="fixed top-0 right-0 pointer-events-none z-0" style={{ transform: 'translate(50%, -50%)' }}>
        <img 
          src="https://file-upload.replit.app/api/storage/images%2F1761418188502-gradient-sunburst.png" 
          alt="" 
          className="w-auto h-auto opacity-80"
        />
      </div>

      {/* Navigation Bar */}
      <div className="sticky top-0 w-full bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 shadow-sm">
        <PageContainer className="max-w-[1440px]">
          <NavBar />
        </PageContainer>
      </div>

      {/* Split Hero Section */}
      <div className="w-full">
        <div className="grid lg:grid-cols-2 min-h-[60vh]">
          {/* Left Side - Full Background Image */}
          <div className="relative min-h-[40vh] lg:min-h-[60vh]">
            <img 
              src="https://file-upload.replit.app/api/storage/images%2F1742359287380-STS_Jan'25-109%20compressed.jpeg" 
              alt="Startup Sarasota" 
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
          
          {/* Right Side - Event Information */}
          <div className="bg-background flex items-center p-8 lg:p-12">
            <div className="w-full max-w-xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
                STARTUP SARASOTA
              </h1>
              
              <p className="text-xl md:text-2xl font-semibold mb-4 text-foreground">
                Second Annual Sarasota Tech Summit
              </p>
              
              <div className="space-y-3 mb-8 text-muted-foreground">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5" />
                  <span className="text-lg">January 15th, 2026</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5" />
                  <span className="text-lg">MOTE SEA Event Space</span>
                </div>
              </div>

              <p className="text-base text-muted-foreground mb-8">
                Join us for the second annual Sarasota Tech Summit featuring a startup fair, 
                investor panels, networking opportunities, and insights into building the future 
                of Sarasota's tech ecosystem.
              </p>

              <div className="flex flex-wrap gap-4">
                <a href="https://luma.com/sts26" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="text-base">
                    Get Tickets
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </a>
                <a href="https://www.dropbox.com/scl/fo/tx5vb725ywzytkfog1iv1/AGfyY_yWKWKsnOn64QjCXiA?rlkey=ue2nlaso4lrb3ug59memgqqmh&dl=0" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="text-base">
                    2025 Event Photos
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              </div>

              <p className="text-sm text-muted-foreground mt-6">
                Powered by Sarasota Tech Community
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1">
        <PageContainer className="max-w-7xl py-8">
          <div className="space-y-6">
            
            {/* Top Row: Links and Event Details */}
            <div className="grid gap-4 sm:grid-cols-2">
              <EventLinksCard />
              <EventDetailsCard />
            </div>

            {/* Agenda and Gallery Row */}
            <div className="grid gap-4 lg:grid-cols-2">
              <AgendaCard />
              <ImageGalleryCard />
            </div>

            {/* Marquee Sponsors */}
            <Card className="border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Marquee Sponsors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {vcSponsors.map((sponsor, index) => (
                    <SponsorCard key={index} sponsor={sponsor} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Startup Ecosystem Sponsors */}
            <Card className="border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Startup Ecosystem Sponsors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {startupSponsors.map((sponsor, index) => (
                    <SponsorCard key={index} sponsor={sponsor} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Advisory Sponsors */}
            <Card className="border">
              <CardHeader>
                <CardTitle>Advisory Sponsors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {advisorySponsors.map((sponsor, index) => (
                    <SponsorCard key={index} sponsor={sponsor} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Featured Companies */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Participating Companies</h2>
              <FeaturedCompaniesGrid />
            </div>

          </div>
        </PageContainer>
      </div>
    </div>
  );
}
