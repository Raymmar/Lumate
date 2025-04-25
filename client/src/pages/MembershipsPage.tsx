import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { NavBar } from "@/components/NavBar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Briefcase, UserCircle2, Building2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/hooks/use-auth";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PricingPlan {
  name: string;
  price: string;
  description: string;
  features: PlanFeature[];
  cta: {
    text: string;
    action?: () => void;
    disabled?: boolean;
    accent?: boolean;
  };
  icon: React.ReactNode;
  popular?: boolean;
  cardClassName?: string;
}

export default function MembershipsPage() {
  const { toast } = useToast();
  const { isPremium, startSubscription, isLoading } = useSubscription();
  const { user } = useAuth();
  const isLoggedIn = !!user;

  const handleContactClick = () => {
    window.open("https://calendly.com/srqyou/sarasotatech", "_blank");
  };

  const pricingPlans: PricingPlan[] = [
    {
      name: "Free",
      price: "$0",
      description: "Basic membership for community members",
      icon: <UserCircle2 className="h-6 w-6" />,
      features: [
        { text: "Claim your free member profile", included: true },
        { text: "Custom bio & profile greeting", included: true },
        { text: "Attend free events", included: true },
        { text: "Keep up with community updates", included: true },
      ],
      cta: {
        text: isPremium ? "Current Plan" : isLoggedIn ? "Current Plan" : "Sign Up",
        disabled: true,
      },
    },
    {
      name: "Premium",
      price: "$199",
      description: "Premium features for professionals and businesses",
      icon: <Sparkles className="h-6 w-6" />,
      popular: true,
      cardClassName: "border-primary",
      features: [
        { text: "Everything in Free plan", included: true },
        { text: "Custom company profile", included: true },
        { text: "Premium badge", included: true },
        { text: "Includes Tech Summit ticket", included: true },
      ],
      cta: {
        text: isPremium
          ? "Current Plan"
          : isLoading
          ? "Loading..."
          : "Upgrade Now",
        action: isPremium ? undefined : startSubscription,
        disabled: isPremium || isLoading,
        accent: true,
      },
    },
    {
      name: "Growth",
      price: "Custom",
      description: "Enhanced features for larger organizations",
      icon: <Building2 className="h-6 w-6" />,
      features: [
        { text: "Everything in Pro plan", included: true },
        { text: "Link multiple member profiles", included: true },
        { text: "Featured placement in directory", included: true },
        { text: "Corporate sponsorship recognition", included: true },
      ],
      cta: {
        text: "Contact Us",
        action: handleContactClick,
      },
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <div className="sticky top-0 w-full bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/40 z-50">
        <PageContainer className="max-w-[1140px]">
          <NavBar />
        </PageContainer>
      </div>

      <div className="flex-1">
        <div className="relative py-12 overflow-hidden">
          <PageContainer className="relative z-10 space-y-8 max-w-[1140px]">
            <div className="text-center space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold">
                Join the Sarasota Tech Community
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Choose the membership tier that's right for you and take your place in Sarasota's growing tech ecosystem.
              </p>
            </div>

            {/* Pricing Plans */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
              {pricingPlans.map((plan) => (
                <Card
                  key={plan.name}
                  className={`relative flex flex-col ${
                    plan.popular
                      ? "border-primary shadow-lg shadow-primary/10"
                      : ""
                  } ${plan.cardClassName || ""}`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                      <span className="bg-primary px-3 py-1 text-xs rounded-full text-primary-foreground">
                        Popular
                      </span>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-full bg-muted">
                        {plan.icon}
                      </div>
                      <CardTitle>{plan.name}</CardTitle>
                    </div>
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      {plan.price !== "Custom" && (
                        <span className="text-muted-foreground mb-1">
                          /year
                        </span>
                      )}
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-2">
                      {plan.features.map((feature, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2"
                        >
                          <div className="rounded-full p-1 mt-0.5">
                            {feature.included ? (
                              <Check className="h-4 w-4 text-primary" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border border-muted"></div>
                            )}
                          </div>
                          <span className={feature.included ? "" : "text-muted-foreground"}>
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className={`w-full ${
                        plan.cta.accent ? "bg-primary hover:bg-primary/90" : ""
                      }`}
                      disabled={plan.cta.disabled}
                      onClick={plan.cta.action}
                    >
                      {plan.cta.text}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {/* Corporate sponsorship */}
            <Card className="bg-muted/50 mt-8">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-3">Corporate Sponsorship</h2>
                    <p className="text-muted-foreground mb-4">
                      Support the Sarasota tech community while gaining visibility for your brand. 
                      Our corporate sponsors receive exclusive benefits including premium placement 
                      in our directory, recognition at all events, and opportunities to engage
                      directly with the local tech ecosystem.
                    </p>
                    <Button onClick={handleContactClick}>
                      <Briefcase className="mr-2 h-4 w-4" />
                      Contact Us About Sponsorship
                    </Button>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="p-4 bg-background rounded-xl shadow-sm">
                      <ul className="space-y-2">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          <span>Featured placement in directory</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          <span>Logo on website & event materials</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          <span>Speaking opportunities at events</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </PageContainer>
        </div>
      </div>
    </div>
  );
}