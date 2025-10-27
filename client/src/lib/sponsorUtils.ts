export function generateSponsorInquiryEmail(): string {
  const subject = encodeURIComponent("Sarasota Tech Sponsor Inquiry");
  const body = encodeURIComponent(
    `I'm interested I learning more about sponsorships for Sarasotas Tech.

Here is my info:
Company name: 
Company website:
Contact name:
Contact mobile: 
Goals of sponsoring:`
  );
  
  return `mailto:?subject=${subject}&body=${body}`;
}
