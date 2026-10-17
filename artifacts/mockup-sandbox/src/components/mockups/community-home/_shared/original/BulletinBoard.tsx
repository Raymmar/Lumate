import { FeaturedMemberCard, HomeStats, LinksSection, MembershipCard, PinnedPostsCarousel, PublicPostsTable, SponsorGrid, VideoEmbed } from "./HomeSections";
import contentSource from "../content.json?raw";

const content = JSON.parse(contentSource) as Record<string, any>;

export function BulletinBoard() {
  return (
    <div className="space-y-4 !border-none">
      <PinnedPostsCarousel content={content} />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <LinksSection />
        <MembershipCard content={content} />
      </div>

      <HomeStats content={content} />

      {/* Video and Featured Member section */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <VideoEmbed content={content} />
        </div>
        <div>
          <FeaturedMemberCard content={content} />
        </div>
      </div>

      {/* Posts Section */}
      <PublicPostsTable content={content} />

      {/* General sponsor displays follow the annual calendar year, not the featured summit. */}
      <SponsorGrid content={content} />
    </div>
  );
}
