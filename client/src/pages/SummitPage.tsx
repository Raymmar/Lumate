import { PageContainer } from "@/components/layout/PageContainer";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { Link } from "wouter";

export default function SummitPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Navigation Bar */}
      <div className="sticky top-0 w-full bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/40 z-50">
        <PageContainer className="max-w-[1140px]">
          <NavBar />
        </PageContainer>
      </div>

      <div className="flex-1">
        <div className="relative overflow-hidden">
          {/* Summit Hero Section */}
          <div className="bg-primary/10 py-12">
            <PageContainer className="relative z-10 space-y-8 max-w-[1140px]">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                {/* Summit Logo/Image */}
                <div className="w-full md:w-1/2">
                  <img 
                    src="https://file-upload.replit.app/api/storage/images%2F1741407871857-STS_Jan'25-109%20compressed.jpeg" 
                    alt="Sarasota Tech Summit Logo" 
                    className="rounded-lg shadow-lg"
                  />
                </div>
                
                {/* Summit Info */}
                <div className="w-full md:w-1/2 space-y-4">
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                    SARASOTA TECH<br />
                    <span className="text-5xl md:text-6xl">SUMMIT</span>
                  </h1>
                  <div className="flex items-center space-x-2">
                    <div className="text-lg font-medium">Jan 9th, 2025</div>
                  </div>
                  <div className="prose prose-lg max-w-none">
                    <p className="text-lg">
                      The premier event that brings together over 200 tech professionals, investors, and thought 
                      leaders from across the region to explore pivotal topics shaping the future of technology.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-4 pt-2">
                    <Button size="lg" className="bg-black hover:bg-black/90 text-white">
                      <a 
                        href="https://lu.ma/r21g3q5c?coupon=EARLY25" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center"
                      >
                        Get Tickets <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                    <Button size="lg" variant="outline">
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
            </PageContainer>
          </div>

          {/* Event Details Section */}
          <PageContainer className="max-w-[1140px] py-12 space-y-12">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">About the Event</h2>
              <div className="prose prose-lg max-w-none">
                <p>
                  <strong>Sarasota, FL</strong> — Sarasota Tech is excited to announce the inaugural <strong><em>Sarasota Tech Summit</em></strong> in 
                  collaboration with the Economic Development Corporation of Sarasota County and the Truist Foundation.
                </p>
                <p>
                  The event is set to take place on January 9, 2025, from 5:00 PM to 10:00 PM at the Art Ovation Hotel in downtown Sarasota. 
                  This premier event aims to bring together over 200 tech professionals, investors, and thought leaders from across the region, 
                  to explore pivotal topics shaping the future of technology.
                </p>
                <p>
                  Attendees will engage in discussions on subjects such as the investability of Sarasota startups, the multifaceted impacts 
                  of artificial intelligence, and the potential for Sarasota to emerge as a leading tech hub. The summit will also feature a 
                  Tech Town Hall, providing an open forum for community dialogue.
                </p>
              </div>
            </div>

            {/* Hot Topics Section */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">Hot Topics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-xl font-semibold mb-2">Is Sarasota Investable?</h3>
                    <p className="text-muted-foreground">
                      Exploring the investment potential of Sarasota's growing tech ecosystem and what it means for 
                      startups and investors alike.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-xl font-semibold mb-2">The AI Revolution</h3>
                    <p className="text-muted-foreground">
                      Understanding the impact of artificial intelligence on businesses, jobs, and society at large as we 
                      navigate this technological shift.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-xl font-semibold mb-2">Building a Tech Hub</h3>
                    <p className="text-muted-foreground">
                      Discussing the strategies and infrastructure needed to position Sarasota as a thriving center for 
                      technology innovation and growth.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Ticket Information */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">Ticket Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <h3 className="text-xl font-semibold">General Admission</h3>
                    <ul className="space-y-2">
                      <li>• Taco bar</li>
                      <li>• Cash bar</li>
                      <li>• Display area</li>
                      <li>• Networking with top regional tech professionals and investors</li>
                      <li>• Insights into current tech trends</li>
                    </ul>
                    <div className="pt-4">
                      <Button className="w-full bg-black hover:bg-black/90 text-white">
                        <a 
                          href="https://lu.ma/r21g3q5c?coupon=EARLY25" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full"
                        >
                          Purchase General Admission
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <h3 className="text-xl font-semibold">VIP Admission</h3>
                    <ul className="space-y-2">
                      <li>• All general admission benefits</li>
                      <li>• VIP meet-and-greet before the event</li>
                      <li>• Entry to rooftop afterparty</li>
                      <li>• Complimentary drink ticket</li>
                    </ul>
                    <div className="pt-4">
                      <Button className="w-full bg-black hover:bg-black/90 text-white">
                        <a 
                          href="https://lu.ma/r21g3q5c?coupon=EARLY25" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full"
                        >
                          Purchase VIP Admission
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="bg-primary/10 p-6 rounded-lg">
                <p className="text-lg">
                  <strong>Early bird discounts</strong> are available through December 20, offering 25% off any ticket 
                  purchase with the code <strong>EARLY25</strong>.
                </p>
                <p className="mt-2">
                  For more information or to inquire about bulk ticket discounts please contact:
                  <br />
                  <strong>Raymmar Tirado</strong> - <a href="mailto:me@raymmar.com" className="text-primary hover:underline">me@raymmar.com</a>
                </p>
              </div>
            </div>

            {/* Sponsors Section */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">Our Sponsors</h2>
              <p className="text-lg">
                The Sarasota Tech Summit is made possible by the generous support of our sponsors.
              </p>
              
              {/* VC Sponsors */}
              <div>
                <h3 className="text-2xl font-semibold mb-4">VC Sponsors</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="flex flex-col">
                    <CardContent className="pt-6 space-y-4 flex-1 flex flex-col">
                      <div className="flex items-center space-x-4">
                        <img 
                          src="https://cdn.prod.website-files.com/65a1eea802e18211e164d424/67327c7631db707c11c708cf_1icejcbpd-8VNNJZRB.webp" 
                          alt="Truist Foundation" 
                          className="w-16 h-16 object-contain"
                        />
                        <div>
                          <h4 className="text-lg font-medium">Truist Foundation</h4>
                          <p className="text-sm text-muted-foreground">Finance</p>
                        </div>
                      </div>
                      <p className="text-muted-foreground flex-1">
                        Truist's purpose is to inspire and build better lives and communities.
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="flex flex-col">
                    <CardContent className="pt-6 space-y-4 flex-1 flex flex-col">
                      <div className="flex items-center space-x-4">
                        <img 
                          src="https://cdn.prod.website-files.com/65a1eea802e18211e164d424/65cd141854050092684729e6_1hmkhcvr3-CZZEY10D.webp" 
                          alt="EDC of Sarasota County" 
                          className="w-16 h-16 object-contain"
                        />
                        <div>
                          <h4 className="text-lg font-medium">EDC of Sarasota County</h4>
                          <p className="text-sm text-muted-foreground">Professional Services</p>
                        </div>
                      </div>
                      <p className="text-muted-foreground flex-1">
                        The EDC works to grow, diversify and sustain the economy of Sarasota County.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Startup Sponsors */}
              <div>
                <h3 className="text-2xl font-semibold mb-4">Startup Sponsors</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center space-x-4">
                        <img 
                          src="https://cdn.prod.website-files.com/65a1eea802e18211e164d424/65fb0982b27fdcf74e7f4a4f_1hpe9q1is-CGNXH684.webp" 
                          alt="ROBRADY" 
                          className="w-12 h-12 object-contain"
                        />
                        <div>
                          <h4 className="text-lg font-medium">ROBRADY</h4>
                          <p className="text-sm text-muted-foreground">Technology</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center space-x-4">
                        <img 
                          src="https://cdn.prod.website-files.com/65a1eea802e18211e164d424/675b318431e4c0210021f821_281762150_3940173906208184_4235986378783041098_n.jpg" 
                          alt="RevContent" 
                          className="w-12 h-12 object-contain"
                        />
                        <div>
                          <h4 className="text-lg font-medium">RevContent</h4>
                          <p className="text-sm text-muted-foreground">Technology</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center space-x-4">
                        <img 
                          src="https://cdn.prod.website-files.com/65a1eea802e18211e164d424/674faa1452273d5c064600af_1ie7j0mp0-M2JWEPRT.webp" 
                          alt="lab SRQ" 
                          className="w-12 h-12 object-contain"
                        />
                        <div>
                          <h4 className="text-lg font-medium">lab SRQ</h4>
                          <p className="text-sm text-muted-foreground">Coworking</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* About Section */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">About Sarasota Tech</h2>
              <div className="prose prose-lg max-w-none">
                <p>
                  Sarasota Tech is a grassroots community initiative dedicated to connecting Sarasota's tech community and driving the city forward.
                </p>
                <p>
                  We meet on the third Thursday of every month at different locations around town. Sometimes we meet at a bar/restaurant, 
                  sometimes at a local business HQ. Either way, you'll be networking with Sarasota's top tech professionals.
                </p>
              </div>
              <div className="pt-4">
                <Link href="/about">
                  <Button variant="outline">Learn More About Sarasota Tech</Button>
                </Link>
              </div>
            </div>
          </PageContainer>
        </div>
      </div>

      {/* Footer powered by Atmos */}
      <div className="bg-black text-white py-12">
        <PageContainer className="max-w-[1140px]">
          <div className="flex flex-col md:flex-row items-center justify-center md:justify-between gap-6">
            <div className="text-center md:text-left">
              <h2 className="text-xl font-bold mb-2">Powered by Atmos</h2>
              <p className="max-w-md">
                We're building a suite of tools designed to help real world communities amplify and monetize their online presence.
              </p>
              <a
                href="https://atmospr.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 text-white hover:text-primary transition-colors underline"
              >
                Learn more
              </a>
            </div>
            <div>
              <img
                src="https://file-upload.replit.app/api/storage/images%2F1742336837549-OG%20placeholder%203%20reducedd.jpeg"
                alt="Atmos"
                className="w-48 h-auto object-contain"
              />
            </div>
          </div>
        </PageContainer>
      </div>
    </div>
  );
}