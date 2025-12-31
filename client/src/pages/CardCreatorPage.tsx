import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { CardCreator } from "@/components/ui/card-creator";
import { Button } from "@/components/ui/button";
import { Upload, Sparkles } from "lucide-react";
import { Link } from "wouter";

export default function CardCreatorPage() {
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Create Your Promo Card</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Show your support for the event! Upload your photo and create a personalized promotional card to share on social media.
          </p>
        </div>

        <div className="bg-card border rounded-lg p-8 text-center">
          <div className="max-w-sm mx-auto space-y-6">
            <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center text-muted-foreground p-6">
                <Upload className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">
                  Your promotional card will appear here
                </p>
              </div>
            </div>
            
            <Button
              size="lg"
              onClick={() => setIsCreatorOpen(true)}
              className="w-full"
              data-testid="button-create-promo-card"
            >
              <Upload className="h-4 w-4 mr-2" />
              Create Your Card
            </Button>

            <p className="text-xs text-muted-foreground">
              By creating a card, you agree to share your excitement about the event!
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Are you a speaker at our event?
          </p>
          <Button variant="outline" asChild>
            <Link href="/speakers" data-testid="link-view-speakers">
              View All Speakers
            </Link>
          </Button>
        </div>

        <CardCreator
          isOpen={isCreatorOpen}
          onClose={() => setIsCreatorOpen(false)}
          mode="upload"
        />
      </div>
    </DashboardLayout>
  );
}
