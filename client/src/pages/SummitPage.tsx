import { PageContainer } from "@/components/layout/PageContainer";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Calendar, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import React, { useState, useEffect, useRef } from "react";

interface SlideShowProps {
  images: {
    src: string;
    alt: string;
    title?: string;
    description?: string;
  }[];
}

function SlideShow({ images }: SlideShowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Auto-advance the slideshow every 5 seconds
    timerRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [images.length]);

  const goToNext = () => {
    // Reset timer when manually changing slides
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000);
    
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const goToPrevious = () => {
    // Reset timer when manually changing slides
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000);
    
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="relative w-full h-[350px] md:h-[500px]">
        {images.map((image, index) => (
          <div
            key={index}
            className={`absolute top-0 left-0 w-full h-full transition-opacity duration-1000 ${
              index === currentIndex ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <img
              src={image.src}
              alt={image.alt}
              className="w-full h-full object-cover"
            />
            {(image.title || image.description) && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-4">
                {image.title && <h3 className="text-lg md:text-xl font-bold">{image.title}</h3>}
                {image.description && <p className="text-sm md:text-base mt-1">{image.description}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Navigation Controls */}
      <div className="absolute inset-0 flex items-center justify-between p-2">
        <button
          onClick={goToPrevious}
          className="bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors focus:outline-none"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          onClick={goToNext}
          className="bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors focus:outline-none"
          aria-label="Next slide"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
      
      {/* Dot Indicators */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentIndex(index);
              // Reset timer when manually changing slides
              if (timerRef.current) {
                clearInterval(timerRef.current);
              }
              timerRef.current = setInterval(() => {
                setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
              }, 5000);
            }}
            className={`h-2 w-2 rounded-full ${
              index === currentIndex ? "bg-white" : "bg-white/50"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

interface ImageGalleryProps {
  images: {
    src: string;
    alt: string;
    aspectRatio?: string;
  }[];
  columns?: number;
}

function ImageGallery({ images, columns = 3 }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <>
      <div 
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${columns} gap-4`}
        style={{ 
          gridTemplateColumns: `repeat(${Math.min(columns, images.length)}, minmax(0, 1fr))` 
        }}
      >
        {images.map((image, index) => (
          <div 
            key={index} 
            className="relative overflow-hidden rounded-lg cursor-pointer group"
            style={{ aspectRatio: image.aspectRatio || 'auto' }}
            onClick={() => setSelectedImage(image.src)}
          >
            <img 
              src={image.src} 
              alt={image.alt} 
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <span className="text-white text-lg font-medium">View</span>
            </div>
          </div>
        ))}
      </div>

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

interface SponsorSectionProps {
  title: string;
  sponsors: {
    name: string;
    logo: string;
    description: string;
    category?: string;
    url?: string;
  }[];
  columns?: number;
  backgroundImage?: string;
}

function SponsorSection({ title, sponsors, columns = 3, backgroundImage }: SponsorSectionProps) {
  const containerStyle = backgroundImage 
    ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  return (
    <div className="py-16 md:py-20 relative" style={containerStyle}>
      {backgroundImage && <div className="absolute inset-0 bg-black/50"></div>}
      <PageContainer className={`max-w-[1140px] relative ${backgroundImage ? 'z-10 text-white' : ''}`}>
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">{title}</h2>
        <div 
          className="grid gap-6"
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.floor(100/columns)}%, 1fr))` }}
        >
          {sponsors.map((sponsor, index) => (
            <Card key={index} className={`h-full ${backgroundImage ? 'bg-white/10 backdrop-blur border-none text-white' : ''}`}>
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 flex-shrink-0">
                    <img 
                      src={sponsor.logo} 
                      alt={sponsor.name} 
                      className="w-full h-full object-contain" 
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{sponsor.name}</h3>
                    {sponsor.category && <p className="text-sm text-muted-foreground">{sponsor.category}</p>}
                  </div>
                </div>
                <p className={`text-sm flex-grow ${backgroundImage ? 'text-white/80' : 'text-muted-foreground'}`}>
                  {sponsor.description}
                </p>
                {sponsor.url && (
                  <div className="mt-4">
                    <a 
                      href={sponsor.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`text-sm font-medium ${backgroundImage ? 'text-white hover:text-white/80' : 'text-primary hover:text-primary/80'} flex items-center`}
                    >
                      Learn more <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </PageContainer>
    </div>
  );
}

export default function SummitPage() {
  const agendaSlides = [
    {
      src: "https://file-upload.replit.app/api/storage/images%2F1744267170221-Investments.png",
      alt: "Is Sarasota Investable?",
      title: "Is Sarasota Investable?",
      description: "Peter Offringa, Saxon Baum, and Scott Lopano discuss investment opportunities in Sarasota."
    },
    {
      src: "https://file-upload.replit.app/api/storage/images%2F1744267508219-Tech-Trends.jpeg",
      alt: "Good, Bad & Ugly of AI",
      title: "Emerging Tech Trends: The Good, Bad & Ugly of AI",
      description: "Toby Wade, Elizabeth Stamoulis, and Sam Bobo explore the multifaceted impacts of artificial intelligence."
    },
    {
      src: "https://file-upload.replit.app/api/storage/images%2F1744267166461-Fireside-Chat.png",
      alt: "Fireside Chat",
      title: "How to Move a City Forward?",
      description: "Fireside chat with AG Lafley and Anand Pallegar on shaping Sarasota's future."
    },
    {
      src: "https://file-upload.replit.app/api/storage/images%2F1744267544912-Final-Thoughts.jpeg",
      alt: "Looking Ahead",
      title: "Looking Ahead: The Future of Sarasota Tech",
      description: "Introducing the 2025 Sarasota Tech Board of Directors."
    }
  ];

  const galleryImages = [
    {
      src: "https://file-upload.replit.app/api/storage/images%2F1744267083489-Thumbnail--Main.png",
      alt: "Sarasota Tech Summit Header",
      aspectRatio: "16/9"
    },
    {
      src: "https://file-upload.replit.app/api/storage/images%2F1744267132207-2-Question.png",
      alt: "Can Sarasota become a tech town?",
      aspectRatio: "16/9"
    },
    {
      src: "https://file-upload.replit.app/api/storage/images%2F1744267136780-3-VC-Sponsors.png",
      alt: "Marquee sponsors",
      aspectRatio: "16/9"
    },
    {
      src: "https://file-upload.replit.app/api/storage/images%2F1744267140023-4-Abstract-text.png",
      alt: "Abstract text background",
      aspectRatio: "16/9"
    },
    {
      src: "https://file-upload.replit.app/api/storage/images%2F1744267148243-5-Startup-Sponsors.png",
      alt: "Startup sponsors",
      aspectRatio: "16/9"
    },
    {
      src: "https://file-upload.replit.app/api/storage/images%2F1744267152043-6-Advisory-Sponsors.png",
      alt: "Advisory sponsors",
      aspectRatio: "16/9"
    },
    {
      src: "https://file-upload.replit.app/api/storage/images%2F1744267155376-7-Founding-Members.png",
      alt: "Founding members",
      aspectRatio: "16/9"
    }
  ];

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
      {/* Navigation Bar */}
      <div className="sticky top-0 w-full bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 shadow-sm">
        <PageContainer className="max-w-[1440px]">
          <NavBar />
        </PageContainer>
      </div>

      <div className="flex-1">
        {/* Hero Section with Full-Width Header Image */}
        <div className="w-full">
          <div className="relative w-full h-[40vh] md:h-[60vh] lg:h-[70vh]">
            <img 
              src="https://file-upload.replit.app/api/storage/images%2F1744267083489-Thumbnail--Main.png" 
              alt="Sarasota Tech Summit" 
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <div className="text-center text-white max-w-3xl mx-auto px-4">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-4 animate-fade-in">
                  SARASOTA TECH SUMMIT
                </h1>
                <div className="flex items-center justify-center space-x-2 mb-6">
                  <Calendar className="h-5 w-5" />
                  <div className="text-xl font-medium">January 9th, 2025</div>
                </div>
                <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto">
                  Connecting Sarasota's tech community and driving the city forward.
                </p>
                <div className="flex flex-wrap gap-4 justify-center">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-white text-lg px-6 py-6">
                    <a 
                      href="https://lu.ma/r21g3q5c?coupon=EARLY25" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center"
                    >
                      Get Tickets <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" className="bg-white/20 backdrop-blur-sm border-white text-white hover:bg-white/30 text-lg px-6 py-6">
                    <a 
                      href="https://www.dropbox.com/scl/fo/tx5vb725ywzytkfog1iv1/AGfyY_yWKWKsnOn64QjCXiA?rlkey=ue2nlaso4lrb3ug59memgqqmh&dl=0" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center"
                    >
                      Photos & Video <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* "Can Sarasota Become a Tech Town?" Section */}
        <div className="py-16 md:py-24">
          <PageContainer className="max-w-[1440px]">
            <div className="flex flex-col md:flex-row gap-10 items-center">
              <div className="w-full md:w-1/2">
                <img 
                  src="https://file-upload.replit.app/api/storage/images%2F1744267132207-2-Question.png"
                  alt="Can Sarasota become a tech town?" 
                  className="rounded-lg shadow-lg"
                />
              </div>
              <div className="w-full md:w-1/2 space-y-6">
                <h2 className="text-4xl font-bold">Can Sarasota Become a Tech Town?</h2>
                <div className="prose prose-lg">
                  <p>
                    The inaugural <strong>Sarasota Tech Summit</strong> brings together over 200 tech professionals, 
                    investors, and thought leaders to explore whether Sarasota has what it takes to become 
                    a thriving tech hub.
                  </p>
                  <p>
                    Join us for an evening of engaging discussions, networking, and collaborative problem-solving 
                    as we chart the course for Sarasota's tech future.
                  </p>
                </div>
                <div className="pt-2">
                  <Button className="bg-black hover:bg-black/90 text-white">
                    <a 
                      href="https://lu.ma/r21g3q5c?coupon=EARLY25" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center"
                    >
                      Register Now <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </PageContainer>
        </div>

        {/* Abstract Background Full-Width Section */}
        <div className="relative py-24 bg-fixed bg-center bg-cover" style={{ backgroundImage: `url(https://file-upload.replit.app/api/storage/images%2F1744267140023-4-Abstract-text.png)` }}>
          <div className="absolute inset-0 bg-black/40"></div>
          <PageContainer className="relative z-10 max-w-[1440px] text-center text-white">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Join Us for a Night of Innovation</h2>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto">
              Art Ovation Hotel · Downtown Sarasota · January 9, 2025 · 5:00 PM - 10:00 PM
            </p>
          </PageContainer>
        </div>

        {/* Agenda Section with Gallery */}
        <div className="py-16 md:py-24 bg-gradient-to-b from-background to-primary/5">
          <PageContainer className="max-w-[1440px]">
            <div className="flex flex-col lg:flex-row gap-10">
              <div className="w-full lg:w-1/2 space-y-8">
                <div className="text-left">
                  <h2 className="text-4xl font-bold mb-4">Event Agenda</h2>
                  <p className="text-lg text-muted-foreground max-w-2xl">
                    Join us for a packed evening of insightful discussions, networking, and visioning the future of tech in Sarasota.
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
                  <div className="space-y-6">
                    <ul className="space-y-6">
                      <li className="pb-5 border-b">
                        <div className="flex gap-2">
                          <div className="font-bold min-w-[120px]">5:00 - 6:00</div>
                          <div>
                            <div className="font-bold">Let's Taco Bout Tech</div>
                            <div className="text-muted-foreground">(Taco bar by Art Ovation)</div>
                            <div className="pl-4 mt-1 text-sm">
                              • Arrival + Food + Networking + Demo tables
                            </div>
                          </div>
                        </div>
                      </li>
                      
                      <li className="pb-5 border-b">
                        <div className="flex gap-2">
                          <div className="font-bold min-w-[120px]">6:00</div>
                          <div>
                            <div className="font-bold">Opening Remarks</div>
                            <div className="text-muted-foreground">(Main Ballroom)</div>
                            <div className="pl-4 mt-1 text-sm">
                              • EDC of Sarasota County
                            </div>
                          </div>
                        </div>
                      </li>
                      
                      <li className="pb-5 border-b">
                        <div className="flex gap-2">
                          <div className="font-bold min-w-[120px]">6:05 - 6:35</div>
                          <div>
                            <div className="font-bold">Is Sarasota Investable?</div>
                            <div className="pl-4 mt-1 text-sm">
                              • Peter Offringa | Saxon Baum | Scott Lopano
                            </div>
                            <div className="pl-4 text-sm">
                              • Moderated by Vlad Ljesevic
                            </div>
                          </div>
                        </div>
                      </li>
                      
                      <li className="pb-5 border-b">
                        <div className="flex gap-2">
                          <div className="font-bold min-w-[120px]">6:35 - 7:00</div>
                          <div>
                            <div className="font-bold">Emerging Tech Trends</div>
                            <div className="text-muted-foreground">(The Good, The Bad, The Ugly of AI)</div>
                            <div className="pl-4 mt-1 text-sm">
                              • Toby Wade | Elizabeth Stamoulis | Sam Bobo
                            </div>
                            <div className="pl-4 text-sm">
                              • Moderated by Pete Petersen
                            </div>
                          </div>
                        </div>
                      </li>
                      
                      <li className="pb-5 border-b">
                        <div className="flex gap-2">
                          <div className="font-bold min-w-[120px]">7:10 - 7:45</div>
                          <div>
                            <div className="font-bold">How to move a city forward?</div>
                            <div className="pl-4 mt-1 text-sm">
                              • Fireside chat with AG Lafley + Anand Pallegar
                            </div>
                          </div>
                        </div>
                      </li>
                      
                      <li className="pb-5 border-b">
                        <div className="flex gap-2">
                          <div className="font-bold min-w-[120px]">7:45 - 8:15</div>
                          <div>
                            <div className="font-bold">Town hall discussion</div>
                            <div className="text-muted-foreground">Connecting the dots</div>
                            <div className="pl-4 mt-1 text-sm">
                              • Moderated by Raymmar Tirado
                            </div>
                          </div>
                        </div>
                      </li>
                      
                      <li className="pb-5 border-b">
                        <div className="flex gap-2">
                          <div className="font-bold min-w-[120px]">8:15 - 8:30</div>
                          <div>
                            <div className="font-bold">Looking Ahead</div>
                            <div className="pl-4 mt-1 text-sm">
                              • 2025 Sarasota Tech Board of Directors
                            </div>
                            <div className="pl-4 text-sm">
                              • Raymmar Tirado | Pete Petersen | Vlad Ljesevic | Toli Marschuk
                            </div>
                          </div>
                        </div>
                      </li>
                      
                      <li>
                        <div className="flex gap-2">
                          <div className="font-bold min-w-[120px]">8:30 - 10:00</div>
                          <div>
                            <div className="font-bold">VIP Afterparty</div>
                            <div className="text-muted-foreground">Art Ovation Lobby</div>
                          </div>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="w-full lg:w-1/2">
                <div className="h-full flex items-center">
                  <ImageGallery images={galleryImages.slice(0, 4)} columns={2} />
                </div>
              </div>
            </div>
            
            {/* Slideshow Section below agenda */}
            <div className="mt-16">
              <div className="text-center mb-10">
                <h3 className="text-2xl font-bold">Agenda Highlights</h3>
              </div>
              <div className="mx-auto" style={{ maxWidth: "1000px", aspectRatio: "16/9" }}>
                <SlideShow images={agendaSlides} />
              </div>
            </div>
          </PageContainer>
        </div>

        {/* Ticket Information */}
        <div className="py-16 md:py-24">
          <PageContainer className="max-w-[1440px]">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold">Ticket Information</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-2">
                Secure your spot at the premier tech event in Sarasota.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card className="relative overflow-hidden border-2 hover:border-primary hover:shadow-lg transition-all">
                <div className="absolute top-0 right-0 w-24 h-24">
                  <div className="absolute transform rotate-45 bg-primary text-white text-center text-xs font-semibold py-1 right-[-35px] top-[32px] w-[170px]">
                    MOST POPULAR
                  </div>
                </div>
                <CardContent className="pt-10 p-8 space-y-6">
                  <h3 className="text-2xl font-bold">General Admission</h3>
                  <div className="text-4xl font-bold">
                    $49
                    <span className="text-base font-normal text-muted-foreground ml-2">Early Bird</span>
                  </div>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Taco bar by Art Ovation</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Cash bar</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Display area</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Networking with top regional tech professionals and investors</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Insights into current tech trends</span>
                    </li>
                  </ul>
                  <div className="pt-4">
                    <Button className="w-full bg-primary hover:bg-primary/90 text-white py-6">
                      <a 
                        href="https://lu.ma/r21g3q5c?coupon=EARLY25" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center"
                      >
                        Purchase General Admission
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2 border-primary hover:shadow-lg transition-all">
                <CardContent className="pt-10 p-8 space-y-6">
                  <h3 className="text-2xl font-bold">VIP Admission</h3>
                  <div className="text-4xl font-bold">
                    $99
                    <span className="text-base font-normal text-muted-foreground ml-2">Early Bird</span>
                  </div>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-semibold">All general admission benefits</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>VIP meet-and-greet before the event</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Entry to rooftop afterparty</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Complimentary drink ticket</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Reserved seating in main ballroom</span>
                    </li>
                  </ul>
                  <div className="pt-4">
                    <Button className="w-full bg-black hover:bg-black/90 text-white py-6">
                      <a 
                        href="https://lu.ma/r21g3q5c?coupon=EARLY25" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center"
                      >
                        Purchase VIP Admission
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </PageContainer>
        </div>
      </div>
    </div>
  );
}