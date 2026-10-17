"""Read public presentation data for isolated previews; never call write APIs."""
import concurrent.futures
import datetime
import json
import os
from pathlib import Path
import shutil
import sys
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
GROUP = ROOT / "src/components/mockups/community-home/_shared"
IMAGES = ROOT / "public/images"
BASE = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "https://" + os.environ["REPLIT_DEV_DOMAIN"]


def get(path):
    request = urllib.request.Request(BASE + path, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=40) as response:
        return json.load(response)


def pick(record, fields):
    return {key: record[key] for key in fields.split() if key in record}


events = [
    pick(e, "id api_id title description startTime endTime coverUrl url timezone location visibility")
    for e in get("/api/events")["events"]
]
posts = [
    pick(p, "id title summary body featuredImage tags ctaText ctaLink videoUrl isPinned membersOnly createdAt updatedAt")
    for p in get("/api/public/posts")["posts"]
]
for p in posts:
    if p.get("membersOnly"):
        p["body"] = ""
people_response = get("/api/people?page=1&limit=50&sort=events&verifiedOnly=false")
people = [
    pick(p, "id api_id userName fullName avatarUrl bio slug isVerified eventCount stats companyName jobTitle")
    for p in people_response["people"]
]
featured = pick(get("/api/people/featured"), "id api_id userName fullName avatarUrl bio slug isVerified eventCount stats companyName jobTitle")
sponsors = [
    pick(s, "id name logo url logoPadding tier year companyId")
    for s in get("/api/sponsors?year=2026")["sponsors"]
]
summit = get("/api/summits/current")["summit"]
stats = get("/api/public/stats")
now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)


def date(value):
    return datetime.datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)


upcoming = sorted((e for e in events if date(e["startTime"]) > now), key=lambda e: e["startTime"])
posts.sort(key=lambda p: p.get("createdAt", ""), reverse=True)
fixture = {
    "capturedAt": now.isoformat(),
    "events": events,
    "upcomingEvents": upcoming,
    "posts": posts,
    "people": people,
    "peopleTotal": people_response["total"],
    "featuredMember": featured,
    "sponsors": sponsors,
    "summit": summit,
    "stats": stats,
    "logo": "/__mockup/images/sarasota-logo.png",
}
IMAGES.mkdir(parents=True, exist_ok=True)
logo = ROOT.parents[1] / "client/public/256x256.png"
if not logo.exists():
    logo = ROOT.parents[1] / "public/256x256.png"
shutil.copyfile(logo, IMAGES / "sarasota-logo.png")
assets = {}
for record in upcoming[:4] + posts[:8] + people[:16] + sponsors + [featured]:
    for field in ("coverUrl", "featuredImage", "avatarUrl", "logo"):
        url = record.get(field)
        if url and url.startswith("https://") and url not in assets:
            assets[url] = f"community-{len(assets):02d}.img"


def download(item):
    url, filename = item
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(request, timeout=35) as response:
            content = response.read(5_000_001)
            if len(content) > 5_000_000:
                raise ValueError("Image exceeds preview asset budget")
        (IMAGES / filename).write_bytes(content)
        return url, "/__mockup/images/" + filename
    except Exception as error:
        print("Asset unavailable:", filename, type(error).__name__)
        return url, url


with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
    replacements = dict(executor.map(download, assets.items()))


def rewrite(value):
    if isinstance(value, dict):
        return {k: rewrite(v) for k, v in value.items()}
    if isinstance(value, list):
        return [rewrite(v) for v in value]
    if isinstance(value, str):
        return replacements.get(value, value)
    return value


GROUP.mkdir(parents=True, exist_ok=True)
(GROUP / "content.json").write_text(json.dumps(rewrite(fixture), indent=2))
print("Public fixture ready:", len(upcoming), "upcoming events,", len(posts), "posts,",
      len(people), "people,", len(sponsors), "sponsors;", len(assets), "image assets.")
print("Next events:", [(e["title"], e["startTime"]) for e in upcoming[:4]])
print("Recent news:", [p["title"] for p in posts[:4]])
