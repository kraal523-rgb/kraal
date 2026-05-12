import React, { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/kraal-logo-black.svg";
import brahman from "../assets/brahman.jpg";
import tuli from "../assets/tuli-cattle.webp";
import vaccination from "../assets/vaccination.webp";
import roadrunner from "../assets/chicken-1.jpg";
import drought  from "../assets/tuli-cattle.webp";
import goat from "../assets/goats-2.jpg";
import goat1 from "../assets/goats-1.jpg";
import drought2 from "../assets/drought.png";
import transport from "../assets/transport-1.jpg";
import cow from "../assets/cow.png";
import breeds from "../assets/breeds.jpg";
import records from "../assets/records.jpg";
import online1 from "../assets/online-1.jpg";
import "./Blog.css";

export const BLOG_POSTS = [
  {
    id: "how-to-price-livestock",
    title: "How to Price Your Livestock for a Fast Sale",
    excerpt:
      "Pricing too high loses buyers. Too low loses money. Here's how experienced Zimbabwean farmers find the sweet spot.",
    cover: brahman,
    emoji: "💰",
    category: "Selling Tips",
    date: "May 10, 2026",
    readTime: "4 min read",
    author: "Kraal Team",
    content: `
Pricing livestock is part science, part local knowledge. The biggest mistake new sellers make is pricing based on what they paid — not what the market will bear today.

## Know your local benchmark

Before listing, check what similar animals are selling for in your province. A Brahman bull in Mashonaland East will fetch a different price than the same animal in Matabeleland South due to transport costs and local demand. Kraal's live price ticker gives you a real-time sense of market averages.

## Factor in your costs

Work backwards from your costs:
- Feed cost per month × age in months
- Vet bills and vaccinations
- Transport to market
- Your time

This gives you your floor — the minimum you can accept without losing money.

## Price for negotiation

Most buyers in Zimbabwe expect to negotiate. Build 10–15% into your asking price so you can come down and still hit your target. If your actual target is USD 900, list at USD 1,000.

## When to drop the price

If you've had your listing up for more than 2 weeks with no serious enquiries, drop the price by 8–10%. A fast sale at a slightly lower price beats feeding an animal for another month.

## Bulk discounts work

If you're selling a lot of animals, offer a per-head discount for buyers taking more than 5. "USD 180/head or USD 160 if you take 10+" converts browsers into buyers.
    `,
  },
  {
    id: "vaccinations-zimbabwe",
    title: "Essential Vaccinations for Livestock in Zimbabwe",
    excerpt:
      "A complete guide to the vaccinations your cattle, goats and chickens need — and when to give them.",
    cover: vaccination,
    emoji: "💉",
    category: "Animal Health",
    date: "May 5, 2026",
    readTime: "6 min read",
    author: "Kraal Team",
    content: `
Vaccinated animals sell faster and for more money. Buyers on Kraal consistently prefer listings with a vaccination history — and for good reason.

## Cattle vaccinations

**Foot and Mouth Disease (FMD)** is compulsory in Zimbabwe and administered by the government. Keep your vaccination certificate — buyers will ask for it.

**Anthrax** — vaccinate annually before the rainy season (September–October). Areas like Kariba, Binga and parts of Matabeleland are higher risk.

**Blackleg (Clostridial diseases)** — vaccinate calves at 3–4 months, booster at 6 months. Annual boosters for adults in high-risk areas.

**Lumpy Skin Disease** — vaccinate annually. Outbreaks have increased in recent years across Zimbabwe.

## Goats and sheep

**Pulpy Kidney (Enterotoxaemia)** — vaccinate kids at 6–8 weeks, booster 4–6 weeks later. Annual boosters for adults.

**Pasteurellosis** — vaccinate before stress events (weaning, transport, seasonal change).

**Orf (Contagious Ecthyma)** — live vaccine, use with caution. Consult your vet.

## Chickens (Road Runners)

**Newcastle Disease** — the most critical. Vaccinate at day 1 (eye drop), day 14 (drinking water), then every 2 months. Newcastle kills entire flocks within days.

**Marek's Disease** — vaccinate day-old chicks if sourcing from a hatchery.

**Infectious Bursal Disease (Gumboro)** — vaccinate at 14 and 28 days.

## Record keeping

Keep a simple exercise book with each animal's vaccination date, vaccine batch number and next due date. This record adds real value at sale time.
    `,
  },
  {
    id: "preparing-livestock-for-sale",
    title: "How to Prepare Your Animals for Sale Day",
    excerpt:
      "First impressions matter. How you present your animals on sale day can mean hundreds of dollars difference in final price.",
    cover: tuli,
    emoji: "🐄",
    category: "Selling Tips",
    date: "April 28, 2026",
    readTime: "5 min read",
    author: "Kraal Team",
    content: `
A well-presented animal signals a well-cared-for animal. Buyers notice everything — and price accordingly.

## Two weeks before sale

- Deworm all animals being sold. Animals that look lean from parasite load won't fetch top dollar.
- Treat any visible wounds, skin conditions or foot problems.
- If selling cattle, trim hooves if overgrown.

## One week before

- Put animals on good quality feed to improve body condition. Buyers assess condition score quickly.
- For cattle, brush and clean the coat.
- Ensure all vaccinations are up to date and certificates are ready.

## The day before

- Keep animals in a clean, dry area. Mud-covered animals give a bad impression.
- Check that all ear tags are readable.
- Prepare your paperwork — movement permits, vaccination cards, breed certificates if applicable.

## Photography for Kraal listings

Good photos add thousands of dollars of perceived value:
- Shoot in morning or late afternoon light — midday sun creates harsh shadows
- Stand the animal on flat, clean ground
- Shoot from the side to show body shape, from behind to show width
- Get close enough to show the animal's condition but wide enough to show the whole body
- Include at least one photo of the face — buyers connect with eyes

## Be honest about condition

Buyers who travel far and find animals in worse condition than photos suggest will not buy — and will tell others. Honest listings that deliver on expectations build your seller reputation over time.
    `,
  },
  {
    id: "road-runner-chickens-guide",
    title: "Raising Road Runner Chickens: A Complete Guide",
    excerpt:
      "Road Runners are Zimbabwe's most popular indigenous chicken. Here's everything you need to know to raise them profitably.",
    cover: roadrunner,
    emoji: "🐓",
    category: "Farming Guide",
    date: "April 20, 2026",
    readTime: "7 min read",
    author: "Kraal Team",
    content: `
Road Runner chickens — Zimbabwe's beloved indigenous breed — are hardy, disease-resistant and in consistently high demand. Here's how to raise them profitably.

## Why Road Runners

Unlike broilers, Road Runners thrive in free-range conditions and require less specialized feed. Buyers prefer their meat for its taste and cultural significance. A healthy adult Road Runner sells for USD 6–12 depending on size and location.

## Housing

Road Runners are hardy but still need:
- A secure overnight shelter that keeps out predators (dogs, hawks, mongoose)
- Roosting poles at 1–1.5m height
- 1 square metre per 5–6 birds minimum
- Good ventilation but no direct drafts

Simple thatched or iron sheet structures work well. Concrete floors are ideal but not essential.

## Feeding

Road Runners are natural foragers. In a good free-range environment they'll find 40–60% of their own food. Supplement with:
- Maize bran or crushed maize
- Sunflower cake for protein
- Oyster shell or crushed eggshell for calcium (laying hens)

Feed twice daily — morning and evening. Always provide clean water.

## Health management

**Newcastle Disease is the biggest killer.** Vaccinate every 2 months without fail. Signs of Newcastle: twisted necks, paralysis, sudden deaths. There is no treatment — prevention is everything.

Deworm every 3 months with Levamisole or similar.

## When to sell

Road Runners reach marketable weight at 4–5 months. Sell before 7 months — older birds become tough and buyers discount them. Sell in batches of 12–24 for better prices.

## Profitability example

- 50 chicks at USD 0.80 = USD 40
- Feed for 5 months ≈ USD 45
- Vaccines and deworm ≈ USD 8
- **Total cost: ≈ USD 93**
- 45 survivors × USD 7 average = **USD 315**
- **Profit: ≈ USD 222 per cycle**

Three cycles per year = USD 666 profit from 50 birds. Scale to 200 birds and the numbers become very significant.
    `,
  },
  {
    id: "drought-livestock-management",
    title: "Managing Your Livestock Through Drought",
    excerpt:
      "Zimbabwe's farmers face drought regularly. Here's how to protect your herd when the rains fail.",
    cover: cow,
    emoji: "☀️",
    category: "Animal Health",
    date: "April 12, 2026",
    readTime: "5 min read",
    author: "Kraal Team",
    content: `
Drought is one of the most challenging events for any livestock farmer. The decisions you make in the first weeks of a dry spell determine whether you protect your herd or lose years of breeding investment.

## Destocking early saves money

The hardest but most important decision: sell before prices collapse. When drought hits, everyone tries to sell at once — prices drop 30–50%. Farmers who destock early at good prices are far better positioned than those who hold and are forced to sell starving animals at rock-bottom prices.

Use Kraal to list early. Buyers are still active before the crisis peaks.

## Identify which animals to keep

Priority order for keeping:
1. Breeding females with the best genetics
2. Young animals close to marketable weight
3. Pregnant animals near term

Sell first: old cows, poor-condition animals, and excess males.

## Emergency feeding options

**Crop residues** — maize stover, groundnut tops, sorghum stalks. Supplement with protein (sunflower cake, cotton seed cake) as residues are low in protein.

**Hay and silage** — if you made reserves, now is when they pay off. For next season, consider making hay during good rains.

**Urea-treated straw** — low-quality straw treated with urea becomes more digestible. Ask your local Agritex officer for guidance.

## Water management

Cattle need 30–50 litres per day in hot weather. Check boreholes, wells and dams weekly. Dehydrated animals lose condition rapidly and become disease-prone.

## After the drought

Restock carefully. Don't rush back to pre-drought numbers before your pasture has recovered. Overgrazing during recovery sets back your land for years.
    `,
  },
  {
    id: "understanding-livestock-breeds-zimbabwe",
    title: "Understanding Livestock Breeds for the Zimbabwean Market",
    excerpt:
      "Not all breeds perform equally in Zimbabwe's climate. Here's a breakdown of the most popular cattle, goat and sheep breeds and what they're best suited for.",
    cover: breeds,
    emoji: "🐂",
    category: "Farming Guide",
    date: "May 12, 2026",
    readTime: "6 min read",
    author: "Kraal Team",
    content: `
Choosing the right breed is one of the most important decisions a livestock farmer makes. The wrong breed in the wrong environment costs you money every single month.

## Cattle breeds

**Brahman** — the most popular commercial breed in Zimbabwe. Highly heat-tolerant, tick-resistant and able to maintain condition on poor pasture. Excellent for communal and commercial farming alike. Bulls reach 700–900kg at maturity.

**Tuli** — Zimbabwe's own indigenous breed. Hardy, fertile and adapted to harsh conditions. Smaller than Brahman but extremely efficient converters of poor-quality feed. Highly sought after by buyers who want low-input cattle.

**Hereford and Angus** — perform well in high-rainfall areas like the Eastern Highlands. Poor tick resistance means higher vet costs in lowveld areas. Premium beef prices at slaughter.

**Sanga** — traditional Zimbabwean cattle with a hump. Extremely drought-tolerant. Common in communal areas. Good for farmers with limited inputs.

## Goat breeds

**Boer** — the gold standard for meat production. Fast-growing, heavily muscled and in high demand from butcheries and export markets. Requires better nutrition than indigenous goats.

**Matebele (Ndebele) goat** — indigenous breed, extremely hardy. Smaller carcass but very low input requirements. Ideal for communal farmers.

**Kalahari Red** — gaining popularity in Zimbabwe. Heat-tolerant, good meat yield, and attractive red coat that buyers like.

## Sheep breeds

**Dorper** — the dominant meat sheep in Zimbabwe. Fast-growing, heat-tolerant and does not require shearing. Strong demand from abattoirs.

**Merino** — suited to cooler highland areas only. Dual-purpose wool and meat. Niche market but wool prices can be attractive.

## Matching breed to your environment

Lowveld (hot, dry, poor pasture) → Tuli, Brahman, Sanga, Matebele goat, Dorper
Middleveld (moderate rainfall) → Brahman, Boer, Kalahari Red, Dorper
Highveld/Eastern Highlands → Hereford, Angus, Merino, Boer

Buying the breed your environment supports means lower feed costs, lower vet bills and healthier animals at sale time.
    `,
  },
  {
    id: "feeding-cattle-dry-season",
    title: "How to Feed Your Cattle Through the Dry Season",
    excerpt:
      "The dry season from May to October is when most farmers lose condition on their cattle. Here's how to keep your herd in top shape without breaking the bank.",
    cover: drought2,
    emoji: "🌾",
    category: "Farming Guide",
    date: "May 8, 2026",
    readTime: "5 min read",
    author: "Kraal Team",
    content: `
Zimbabwe's dry season runs from May to October. Pastures dry out, nutritional value in grass drops sharply, and cattle lose condition fast. Planning your dry-season feeding strategy before May is what separates profitable farmers from struggling ones.

## Why condition matters at sale time

A cattle buyer assessing your animals assigns a body condition score (BCS) from 1–5. Animals at BCS 3.5–4 fetch full market price. Animals at BCS 2 or below are heavily discounted — sometimes by 30–40%. Everything you spend keeping condition on your cattle during the dry season pays back at sale.

## The dry season feed toolkit

**Crop residues** — maize stover, groundnut tops, sorghum stalks. Widely available after harvest. Low in protein but useful as a bulk filler. Always supplement with a protein source.

**Protein licks** — commercial lick blocks or sunflower cake. Even small amounts (200–300g per animal per day) dramatically improve how cattle utilize dry roughage. This is the single highest-return input in dry-season management.

**Hay** — if you baled hay during the rains, now is when it pays off. Aim to have 1–2 bales per adult animal for the dry season.

**Silage** — fermented green fodder. Labour-intensive to make but high nutritional value. Increasingly popular among commercial farmers in Zimbabwe.

**Browse** — cattle will naturally browse shrubs and trees when grass is poor. Acacia pods are high in protein and cattle relish them. Don't fence cattle away from browse areas during the dry season.

## Water

Never underestimate water during the dry season. Cattle need 30–50 litres per day. At high temperatures, dehydrated cattle stop eating and lose condition rapidly. Check your water sources weekly.

## Feed planning checklist

- Count your herd and calculate feed needs in April
- Source protein licks before the dry season peak (prices rise)
- Identify and protect your best browse areas
- Sell animals you cannot afford to carry before they lose condition
    `,
  },
  {
    id: "goat-farming-zimbabwe",
    title: "Starting a Goat Farm in Zimbabwe: What You Need to Know",
    excerpt:
      "Goats are one of the best entry points into livestock farming. Lower cost, faster returns and strong demand. Here's how to start right.",
    cover: goat1,
    emoji: "🐐",
    category: "Farming Guide",
    date: "May 1, 2026",
    readTime: "6 min read",
    author: "Kraal Team",
    content: `
Goats are Zimbabwe's most accessible livestock investment. They're cheaper to buy, faster to reproduce, easier to manage and sell quickly at good prices. For new farmers, goats are often the best starting point.

## Why goats make sense

A good Boer doe costs USD 120–200. She can produce two kids per pregnancy and kid twice a year — that's potentially 4 kids annually. At USD 60–80 per kid at weaning, returns come quickly. Indigenous does cost less and require even fewer inputs.

## Housing

Goats need:
- A dry, draft-free overnight shelter
- Raised slatted floors if possible — goats on wet, dirty floors develop hoof rot and respiratory problems
- Separate pens for pregnant does and kids
- Strong fencing — goats are escape artists

## Feeding

Goats are browsers, not grazers. They prefer shrubs, leaves and forbs over grass. In Zimbabwe's environment this is an advantage — they utilise browse that cattle ignore.

Supplement with:
- Maize bran or crushed maize
- Sunflower cake for protein (especially for pregnant and lactating does)
- Mineral lick — copper is particularly important for goats

## Health management

**Worms** are the number one killer of goats in Zimbabwe. Deworm every 8 weeks with a rotation of products (resistance develops fast if you use one product repeatedly). Learn the FAMACHA eye-scoring method — it tells you which animals need deworming without wasting product on the whole herd.

**Pasteurellosis** — vaccinate before stress events.

**Foot rot** — keep pens dry. Treat early with zinc sulphate foot bath.

## When to sell

Kids reach marketable weight (15–20kg) at 3–4 months for Boer crosses. Indigenous kids take 5–6 months. Peak demand and best prices are around Easter, Independence (April 18), Heroes holidays and December/Christmas. List on Kraal 3–4 weeks before these dates.

## Starter herd recommendation

Start with 1 Boer buck and 10 does (mix of Boer and indigenous). This gives you breed improvement, fast growth rates and hardiness. Cull does that fail to conceive within two seasons.
    `,
  },
  {
    id: "livestock-record-keeping",
    title: "Simple Record Keeping Every Livestock Farmer Should Do",
    excerpt:
      "You don't need accounting software. A simple exercise book and these records will tell you exactly how profitable your farm is.",
    cover: records,
    emoji: "📒",
    category: "Business",
    date: "April 25, 2026",
    readTime: "4 min read",
    author: "Kraal Team",
    content: `
Most livestock farmers in Zimbabwe work from memory. They know roughly how many animals they have and roughly what they've spent — but they can't tell you their profit per animal or which part of their operation is costing them money. Simple records change that.

## What to record

**Animal register** — every animal gets a row: ear tag number, date acquired, breed, sex, dam/sire if known, purchase price. Update it when animals are born, sold or die.

**Health records** — date, animal tag, treatment given, dose, cost and next due date. This record adds direct value at sale time — buyers pay more for documented animals.

**Feed and input costs** — date, item purchased (feed, vaccines, dewormers, minerals), quantity, price. Total this monthly.

**Sales record** — date, buyer name, number of animals, description, price received, payment method. Keep a copy of any movement permits.

**Death and loss record** — date, animal tag, cause of death if known. A death rate above 3–5% annually signals a management problem worth investigating.

## The one number every farmer must know

**Cost per animal per month.** Add your total monthly costs, divide by number of animals. If your 20 cattle cost you USD 180/month to run, that's USD 9 per animal per month. A steer you hold for 18 months costs you USD 162 before purchase price. That's your floor when selling.

## Simple profit calculation

Sale price
− Purchase price
− Holding cost (months held × cost per animal per month)
− Transport to market
= **Profit per animal**

If this number is negative, you're losing money on that animal type — and you need to know it.

## Tools you need

An exercise book. A pen. That's it. Keep it consistent and update it weekly. After 12 months you'll have data that tells you which animals, which seasons and which buyers make you the most money.
    `,
  },
  {
    id: "transporting-livestock-zimbabwe",
    title: "How to Transport Livestock Safely in Zimbabwe",
    excerpt:
      "Poor transport causes injuries, weight loss and stress that can cost you hundreds of dollars at the sale. Here's how to do it right.",
    cover: transport,
    emoji: "🚛",
    category: "Selling Tips",
    date: "April 15, 2026",
    readTime: "4 min read",
    author: "Kraal Team",
    content: `
Transport is one of the most stressful events in an animal's life. Poorly managed transport causes bruising, injury, weight loss and illness — all of which reduce what your animals fetch at sale. Getting transport right protects your investment.

## Before loading

- Withhold feed for 6–8 hours before loading (reduces gut content and bloat risk during transport) but always provide water up to loading time
- Load in the cool of the morning — heat stress during transport is a major cause of deaths
- Check that the truck or trailer floor is non-slip. Sprinkle sand or use rubber matting
- Inspect the vehicle for sharp protrusions that could injure animals

## Loading

- Use proper loading ramps — animals forced to jump up injure themselves and lose condition
- Load calmly and quietly. Noise, dogs and rushing cause panic and injury
- Separate bulls from cows and large animals from small ones
- Do not overload. Cattle need space to balance. A general rule: 1 adult Brahman needs 1.5–2 square metres of floor space

## Stocking density guide

| Animal | Floor space needed |
|---|---|
| Adult cattle (500kg+) | 1.8 m² |
| Weaners (200–300kg) | 1.0 m² |
| Goats/sheep | 0.4 m² |
| Pigs | 0.5 m² |

## During transport

- Drive smoothly — hard braking and sharp corners cause falls and pile-ups
- Stop every 4 hours for journeys over 8 hours. Check animals, provide water if possible
- Avoid transporting in the heat of the day (11am–3pm) in summer months

## Documentation

You need a movement permit for cattle in Zimbabwe — obtainable from your local veterinary office. Travelling without one risks confiscation of your animals. Keep vaccination certificates with you.

## After arrival

- Allow animals to rest and rehydrate for at least 24 hours before sale or showing
- Provide good quality hay and water — not lush green feed which can cause bloat in stressed animals
- Check for injuries and treat immediately
    `,
  },
  {
    id: "selling-livestock-online-zimbabwe",
    title: "Why More Zimbabwean Farmers Are Selling Livestock Online",
    excerpt:
      "The livestock market is changing. Farmers who list online are reaching more buyers, getting better prices and selling faster. Here's what's driving the shift.",
    cover: online1,
    emoji: "📱",
    category: "Business",
    date: "April 8, 2026",
    readTime: "4 min read",
    author: "Kraal Team",
    content: `
For generations, selling livestock in Zimbabwe meant one thing: loading your animals and taking them to the nearest auction or roadside market. That model still works — but a growing number of farmers are discovering that listing online gets them better prices with less effort.

## The problem with traditional markets

Traditional auction markets have real advantages — an established buyer pool, immediate payment, no need to negotiate. But they also have real costs:

- Transport to the auction: fuel, truck hire, risk of injury in transit
- Auction commission: typically 5–8% of sale price
- Market day prices: if buyers are few that day, you take what's offered or haul your animals home
- Time: a full auction day is a full day away from your farm

## What online selling changes

When you list on Kraal, your animals are visible to buyers across Zimbabwe — not just those who happened to show up at one market on one day. A buyer in Harare can see your Brahman bull in Gwanda. A hotel buyer in Victoria Falls can contact your poultry operation in Chinhoyi.

This wider reach directly improves your negotiating position. When three buyers are interested instead of one, prices go up.

## What farmers are reporting

Farmers using Kraal consistently report:
- Selling faster — often within days of listing
- Reaching buyers they'd never have met at local auction
- Getting 10–20% better prices by negotiating directly without auction commission
- Being able to sell smaller numbers (2–5 animals) that aren't worth the cost of taking to auction

## What makes a good online listing

- At least 3 clear photos taken in good light
- Accurate weight or age estimate
- Vaccination and health history
- Honest description of body condition
- A fair asking price with room to negotiate

Buyers on Kraal are serious. They've searched, found your listing and made contact — that's a warm lead that a roadside market rarely gives you.

## Getting started

Creating a listing on Kraal takes under 10 minutes. You set your price, upload your photos and buyers come to you. No transport costs, no commission, no auction day chaos.
    `,
  },
];

export default function Blog() {
  const [activeCategory, setActiveCategory] = useState("All");
  const categories = ["All", ...new Set(BLOG_POSTS.map((p) => p.category))];
  const filtered =
    activeCategory === "All"
      ? BLOG_POSTS
      : BLOG_POSTS.filter((p) => p.category === activeCategory);

  return (
    <div className="blog-page">
      <nav className="blog-nav">
        <Link to="/" className="blog-logo">
          <img src={logo} style={{ width: "140px" }} alt="Kraal" />
        </Link>
        <div className="blog-nav-links">
          <Link to="/marketplace">Marketplace</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/register" className="blog-nav-cta">
            Start selling
          </Link>
        </div>
      </nav>

      <section className="blog-hero">
        <img
  src={brahman}
  alt="Brahman cattle on a Zimbabwe farm at golden hour"
  className="blog-hero-img"
/>
        <p className="blog-eyebrow">Knowledge base</p>
        <h1>Farming Tips</h1>
        <p className="blog-hero-sub">
          Practical advice for livestock farmers across Zimbabwe and Southern
          Africa.
        </p>
      </section>

      <div className="blog-cats">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`blog-cat-btn ${activeCategory === cat ? "active" : ""}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="blog-grid-wrap">
        <div className="blog-grid">
          {filtered.map((post, i) => (
            <Link key={post.id} to={`/blog/${post.id}`} className="blog-card">
              <div className="blog-card-cover">
                {post.cover ? (
                  <img src={post.cover} alt={post.title} />
                ) : (
                  <span className="blog-cover-emoji">{post.emoji}</span>
                )}
                <span className="blog-category-badge">{post.category}</span>
              </div>
              <div className="blog-card-body">
                <p className="blog-card-meta">
                  {post.date} · {post.readTime}
                </p>
                <h2 className="blog-card-title">{post.title}</h2>
                <p className="blog-card-excerpt">{post.excerpt}</p>
                <span className="blog-read-more">Read more →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <footer className="blog-footer">
        <div className="blog-footer-inner">
          <span>© 2026 Kraal Market · Zimbabwe 🇿🇼</span>
          <div className="blog-footer-links">
            <Link to="/marketplace">Marketplace</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
