export type XPostAuthor = {
  name: string;
  handle: string;
  avatarUrl: string;
  verified: boolean;
  orgVerified?: boolean;
};

export type XPostCardData = XPostAuthor & {
  text: string;
  createdAt: string;
  replyToHandle?: string;
  quoted?: XPostAuthor & { text: string };
  media?: { type: "photo" | "video"; url?: string };
};

export type SocialSignal = {
  title: string;
  profile: string;
  where: string;
  followers: string;
  post: XPostCardData;
};

const X_ZCASHNAMES = {
  name: "Zcash Names",
  handle: "ZcashNames",
  avatarUrl: "https://pbs.twimg.com/profile_images/2090894295037595648/9Tih0xbJ.jpg",
  verified: true,
} as const;

const X_ZCASHNAME_INTERNS = {
  name: "Interns @ Zcash Names",
  handle: "zcashname",
  avatarUrl: "https://pbs.twimg.com/profile_images/2038225942179627008/SOt2cu0E.jpg",
  verified: false,
} as const;

export const SOCIAL_SIGNALS: SocialSignal[] = [
  {
    title: "WallStreetBets",
    profile: "https://x.com/wallstreetbets",
    where: "https://x.com/wallstreetbets/status/2057981502089031689",
    followers: "2.1M",
    post: {
      name: "WallStreetBets",
      handle: "wallstreetbets",
      avatarUrl: "https://pbs.twimg.com/profile_images/2014881157167345664/NEmNTwOr.jpg",
      verified: true,
      createdAt: "May 23, 2026",
      text: "wait zcash names are a thing now?\n\nhttps://www.zcashnames.com/waitlist?ref=wallstreetbets\n\nnot an endorsement, just bullish on $ZEC and like the idea as well\n\nmight want to grab yours before someone else does 👀",
      quoted: {
        name: "Barry Silbert",
        handle: "BarrySilbert",
        avatarUrl: "https://pbs.twimg.com/profile_images/1726604328578732032/IlumNl_N.jpg",
        verified: true,
        text: "Sending and receiving $ZEC will be much easier with @ZcashNames.\n\nGet your @ZcashName before it's taken:\nhttps://www.zcashnames.com/waitlist?ref=barrysilbert",
      },
    },
  },
  {
    title: "Co-Founder, Gemini, Cypherpunk, Winklevoss Capital",
    profile: "https://x.com/tyler",
    where: "https://x.com/tyler/status/2092350393007169788",
    followers: "1.1M",
    post: {
      name: "Tyler Winklevoss",
      handle: "tyler",
      avatarUrl: "https://pbs.twimg.com/profile_images/1924482946796269568/E1HKFmRx.jpg",
      verified: true,
      createdAt: "Aug 25, 2026",
      text: "👀",
      quoted: { ...X_ZCASHNAMES, text: "More of Zcash Names on Gemini soon" },
    },
  },
  {
    title: "Host of Free The Money",
    profile: "https://x.com/briteresi",
    where: "https://x.com/briteresi/status/2042270024929325079",
    followers: "1.1M",
    post: {
      name: "Bri Teresi",
      handle: "briteresi",
      avatarUrl: "https://pbs.twimg.com/profile_images/1889306007852965888/cOQ-6x3P.jpg",
      verified: true,
      createdAt: "Apr 9, 2026",
      text: "This is amazing! 🤣",
      quoted: {
        ...X_ZCASHNAME_INTERNS,
        text: "\"My grandma has to be able to use Zcash\"\n- BriTeresi.zcash\n\nShe will!",
      },
    },
  },
  {
    title: "Founder/CEO, DCG & Yuma; Chairman, Grayscale",
    profile: "https://x.com/BarrySilbert",
    where: "https://x.com/BarrySilbert/status/2057870840155255245",
    followers: "0.8M",
    post: {
      name: "Barry Silbert",
      handle: "BarrySilbert",
      avatarUrl: "https://pbs.twimg.com/profile_images/1726604328578732032/IlumNl_N.jpg",
      verified: true,
      createdAt: "May 22, 2026",
      text: "Sending and receiving $ZEC will be much easier with @ZcashNames.\n\nGet your @ZcashName before it's taken:\nhttps://www.zcashnames.com/waitlist?ref=barrysilbert\n\nYou'll get your own referral link to earn rewards too.\n\n[Not an endorsement. Just think this seems cool]",
    },
  },
  {
    title: "Founder/CEO, DCG & Yuma; Chairman, Grayscale",
    profile: "https://x.com/BarrySilbert",
    where: "https://x.com/BarrySilbert/status/2057889303036854726",
    followers: "0.8M",
    post: {
      name: "Barry Silbert",
      handle: "BarrySilbert",
      avatarUrl: "https://pbs.twimg.com/profile_images/1726604328578732032/IlumNl_N.jpg",
      verified: true,
      createdAt: "May 22, 2026",
      text: "Fascinating to watch everybody racing to register their names (or famous names). This seems quite viral",
      quoted: {
        name: "Barry Silbert",
        handle: "BarrySilbert",
        avatarUrl: "https://pbs.twimg.com/profile_images/1726604328578732032/IlumNl_N.jpg",
        verified: true,
        text: "Sending and receiving $ZEC will be much easier with @ZcashNames.\n\nGet your @ZcashName before it's taken:\nhttps://www.zcashnames.com/waitlist?ref=barrysilbert",
      },
    },
  },
  {
    title: "Media Shock Jock",
    profile: "https://x.com/CryptoWendyO",
    where: "https://x.com/CryptoWendyO/status/2050311798491062323",
    followers: "468k",
    post: {
      name: "Wendy O",
      handle: "CryptoWendyO",
      avatarUrl: "https://pbs.twimg.com/profile_images/1755320890378903552/aCNLX_em.jpg",
      verified: true,
      createdAt: "May 1, 2026",
      text: "I signed up to @ZcashNames because Zebra Head asked me to and claimed CRYPTOWENDYO.ZCASH\n\nSign up here or don't\nhttps://www.zcashnames.com/waitlist?ref=rzM7Y35P",
      quoted: {
        ...X_ZCASHNAME_INTERNS,
        text: "A new challenger has arrived 😁\n\nWe're going to make privacy as normal as names",
      },
    },
  },
  {
    title: "Corpsec attorney, MetaLeX",
    profile: "https://x.com/lex_node",
    where: "https://x.com/lex_node/status/2058005038748897777",
    followers: "78k",
    post: {
      name: "gabriel shapiro",
      handle: "lex_node",
      avatarUrl: "https://pbs.twimg.com/profile_images/2058233189882032128/pRSMN_6C.jpg",
      verified: true,
      createdAt: "May 23, 2026",
      text: ". @zcashnames waitlist, I reserved lexnode\n\n https://www.zcashnames.com/waitlist?ref=lexnode",
    },
  },
  {
    title: "Cake Wallet",
    profile: "https://x.com/cakewallet",
    where: "https://x.com/cakewallet/status/2014707565750292908",
    followers: "63k",
    post: {
      name: "Cake Wallet",
      handle: "cakewallet",
      avatarUrl: "https://pbs.twimg.com/profile_images/1926033445777551360/PuJd_-cp.jpg",
      verified: true,
      createdAt: "Jan 23, 2026",
      text: "1/ 🍰 Cake Wallet v5.8 is live\n\nThis update adds:\n • Arbitrum support\n • Jupiter DEX swaps\n • Blink API integration\n • BirdPay + https://zcash.me/ aliases for Zcash\n\nMore speed. Less friction. Same Cake simplicity.",
      media: { type: "photo", url: "https://pbs.twimg.com/media/G_Wt2qOWkAAQhK2.jpg" },
    },
  },
  {
    title: "Edge Wallet",
    profile: "https://x.com/EdgeWallet",
    where: "https://x.com/EdgeWallet/status/2070122343456760068",
    followers: "38k",
    post: {
      name: "Edge",
      handle: "EdgeWallet",
      avatarUrl: "https://pbs.twimg.com/profile_images/1925809098689327104/6OnC2Aqd.jpg",
      verified: true,
      createdAt: "Jun 25, 2026",
      text: "What if sending crypto felt as easy as sending an email?\nZcash Names (beta) are now available in Edge, replacing complex shielded addresses with simple human-readable names.\nA giant step toward making private crypto usable for everyday payments🗲",
      media: { type: "photo", url: "https://pbs.twimg.com/media/HLqNTJEXkAAkuLr.jpg" },
    },
  },
  {
    title: "Former Advisor to POTUS",
    profile: "https://x.com/ThorTorrens",
    where: "https://x.com/ThorTorrens/status/2049679001661137325",
    followers: "33k",
    post: {
      name: "Thor Torrens",
      handle: "ThorTorrens",
      avatarUrl: "https://pbs.twimg.com/profile_images/1888433671754928128/KuHT1wwF.jpg",
      verified: true,
      createdAt: "Apr 30, 2026",
      text: "You don't send a message by typing a phone number anymore.\n\nYou search a name in your contacts.\n\nSame with payments on Zelle, Venmo or Cash App.\n\nCrypto still feels stuck in the past.\n\n@ZcashNames fixes that\n\nGet early access 👇🏼",
    },
  },
  {
    title: "Cake Wallet founder",
    profile: "https://x.com/vikrantnyc",
    where: "https://x.com/vikrantnyc/status/2014364318758740244",
    followers: "32k",
    post: {
      name: "Vik Sharma",
      handle: "vikrantnyc",
      avatarUrl: "https://pbs.twimg.com/profile_images/2031219174941536256/aPMVrtGi.jpg",
      verified: true,
      createdAt: "Jan 22, 2026",
      text: "Version 5.8.0 of @cakewallet is rolling out on iOS and Android:\n\n🚀Added support for https://zcash.me/\n🚀Birdpay now supports zcash (see my pinned tweet)\n🚀Arbitrum is now in Cake!\n🚀Jupiter Dex for Solana!  Trade your meme coins and stocks @xstocksfi !\n\nWe ain't lazy!",
    },
  },
  {
    title: "Head of Mining, Cypherpunk",
    profile: "https://x.com/SinoCrypto",
    where: "https://x.com/SinoCrypto/status/2099194151367741536",
    followers: "19k",
    post: {
      name: "Kevin Zhang",
      handle: "SinoCrypto",
      avatarUrl: "https://pbs.twimg.com/profile_images/1716945136012414976/nDmfnKM8.jpg",
      verified: true,
      createdAt: "Sep 13, 2026",
      text: ".@ZcashNames is pretty cool. Check it out for yourself!\n\nhttps://www.zcashnames.com/waitlist?ref=kevin-3",
    },
  },
  {
    title: "$CYPH public co.",
    profile: "https://x.com/cypherpunk",
    where: "https://x.com/cypherpunk/status/2063240118505246989",
    followers: "17k",
    post: {
      name: "Cypherpunk",
      handle: "cypherpunk",
      avatarUrl: "https://pbs.twimg.com/profile_images/1989137192078245888/7pO8BOUK.jpg",
      verified: false,
      orgVerified: true,
      createdAt: "Jun 6, 2026",
      text: "JUST IN: @noir_wallet has partnered with @ZcashNames to build human-readable Zcash addresses inside their wallet.",
      media: { type: "photo", url: "https://pbs.twimg.com/media/HKIZ7ePXwAAKU9w.jpg" },
    },
  },
  {
    title: "Tax partner, CahillNXT",
    profile: "https://x.com/CryptoTaxGuyETH",
    where: "https://x.com/CryptoTaxGuyETH/status/2054594983450058915",
    followers: "10k",
    post: {
      name: "CryptoTaxGuy",
      handle: "CryptoTaxGuyETH",
      avatarUrl: "https://pbs.twimg.com/profile_images/2013724182790422529/VrNM7-R3.jpg",
      verified: true,
      createdAt: "May 13, 2026",
      text: "Sharing this because I think it’s a cool initiative (ENS for Zcash sends):\n\n“Sending and receiving $ZEC will be much easier with @ZcashNames.\n\nGet your @ZcashName before it's taken:\nhttps://www.zcashnames.com/waitlist?ref=jjzPTnc9\n\nYou'll get your own referral link to earn rewards too.”",
    },
  },
  {
    title: "Ex-Odysee/LBRY",
    profile: "https://x.com/TomZarebczan",
    where: "https://x.com/TomZarebczan/status/2093002803455107518",
    followers: "7k",
    post: {
      name: "Tom Zarebczan",
      handle: "TomZarebczan",
      avatarUrl: "https://pbs.twimg.com/profile_images/1985164138876715008/EzsuLgd-.jpg",
      verified: true,
      createdAt: "Aug 27, 2026",
      text: "Woohoo!\n\nI just reserved \"tom\" for Zcash Names Early Access. It pays to be early!\n\nJoin the waitlist with my referral link if you want a name for your shielded address, too.\nhttps://www.zcashnames.com/waitlist?ref=tom-3",
    },
  },
  {
    title: "Chief Policy & Regulatory Officer, Zodl",
    profile: "https://x.com/paulbrigner",
    where: "https://x.com/paulbrigner/status/2057908108647690560",
    followers: "5k",
    post: {
      name: "Paul Brigner",
      handle: "paulbrigner",
      avatarUrl: "https://pbs.twimg.com/profile_images/2031148069933174784/Y6egkRMe.jpg",
      verified: true,
      createdAt: "May 22, 2026",
      replyToHandle: "GoodTexture",
      text: "I believe the @ZcashNames project was incubated by @ns, where we’ve already seen some solid Zcash innovation.",
    },
  },
  {
    title: "Founder / Techstars",
    profile: "https://x.com/rickmanelius",
    where: "https://x.com/rickmanelius/status/2099246255503286505",
    followers: "5k",
    post: {
      name: "Rick Manelius",
      handle: "rickmanelius",
      avatarUrl: "https://pbs.twimg.com/profile_images/2101427206979235840/k62cIZaz.jpg",
      verified: true,
      createdAt: "Sep 13, 2026",
      text: "It's now way more affordable to secure a @ZcashNames\n\nIf you haven't yet, here's my referral link\nhttps://www.zcashnames.com/waitlist?ref=rickmanelius\n\nIt'll be so much easier to receive Zcash payments with one!",
      quoted: {
        ...X_ZCASHNAMES,
        text: "🆕Zcash Names will start at just $20/year (or $60 forever)\n\nThat's down from the previously stated minimum of 0.25 $ZEC (about $300)! 📉",
      },
    },
  },
  {
    title: "Noir Wallet",
    profile: "https://x.com/noir_wallet",
    where: "https://x.com/noir_wallet/status/2096492977917178034",
    followers: "3.3k",
    post: {
      name: "Noir | Privacy first Wallet",
      handle: "noir_wallet",
      avatarUrl: "https://pbs.twimg.com/profile_images/2054580752843698176/x2pKwVa-.png",
      verified: true,
      createdAt: "Sep 6, 2026",
      text: "Your @Zcash  address is 100+ characters no one will ever remember.\n\nYour .zcash/ .zec name is one line anyone can read\n\nHere's how to reserve your .zcash name for everything you do across the Zcash ecosystem, powered by @ZcashNames.",
      media: { type: "video" },
    },
  },
  {
    title: "Engineer, Gemini",
    profile: "https://x.com/bicepcurl",
    where: "https://x.com/bicepcurl/status/2092357598888816977",
    followers: "3k",
    post: {
      name: "Jeremy",
      handle: "bicepcurl",
      avatarUrl: "https://pbs.twimg.com/profile_images/2088730284397146112/Q__Ib3Df.jpg",
      verified: true,
      createdAt: "Aug 25, 2026",
      text: "huge things happening",
      quoted: { ...X_ZCASHNAMES, text: "More of Zcash Names on Gemini soon" },
    },
  },
  {
    title: "Zingo! Wallet",
    profile: "https://x.com/ZingoLabs",
    where: "https://x.com/ZingoLabs/status/2070666166926754072",
    followers: "1.1k",
    post: {
      name: "Zingo!",
      handle: "ZingoLabs",
      avatarUrl: "https://pbs.twimg.com/profile_images/1660759600004464640/T_KGdF39.jpg",
      verified: true,
      createdAt: "Jun 27, 2026",
      text: "🚀 Want to try @ZcashNames with Zingo Wallet?\n\nApply for beta access and be among the first to experience a simpler way to interact with Zcash.\n\n👉 https://www.zcashnames.com/beta/apply/zingo",
      media: { type: "photo", url: "https://pbs.twimg.com/media/HLx7yj4X0AIpdyj.jpg" },
    },
  },
  {
    title: "Zcash Blockchain Explorer",
    profile: "https://x.com/cipherscan_app",
    where: "https://x.com/cipherscan_app/status/2047247131191148899",
    followers: "793",
    post: {
      name: "CipherScan",
      handle: "cipherscan_app",
      avatarUrl: "https://pbs.twimg.com/profile_images/2027239514855575552/u99LwDAc.jpg",
      verified: true,
      createdAt: "Apr 23, 2026",
      text: "Zcash Name Service is now on CipherScan.\n\nSearch any ZNS name → see the resolved address, registration history, marketplace status.\n\nIf the name is available, you'll see pricing and a direct link to claim it.\n\nTry it: https://cipherscan.app/name/sacrebleu\n\nAPI: https://cipherscan.app/api/name\n\nBuilt by @zcashme & @ZcashNames",
    },
  },
];

export const PODCAST_SIGNALS: SocialSignal[] = [
  {
    title: "Engineering Manager, Shielded Labs",
    profile: "https://x.com/shieldedmark",
    where: "https://x.com/shieldedmark/status/2038971499206336676",
    followers: "1.6k",
    post: {
      name: "🛡️",
      handle: "shieldedmark",
      avatarUrl: "https://pbs.twimg.com/profile_images/1901398034019500032/RMZIuIl4.jpg",
      verified: true,
      createdAt: "Mar 31, 2026",
      text: "Zcash Engineering Office Hours #7: The ZcashNames service.\n\n- how .zcash names resolve to addresses\n- wallet integration without centralized lookup\n- their \"Log in with Zcash\" implementation.\n\nMore info: @zcashme / @zcashnames\n\nMonday April 7 @  1PM UTC https://luma.com/y8pj39vc",
    },
  },
  {
    title: "Whale Coin Talk",
    profile: "https://x.com/WhaleCoinTalk",
    where: "https://x.com/WhaleCoinTalk/status/2099514622688846026",
    followers: "168k",
    post: {
      name: "Moby from Whale Coin Talk",
      handle: "WhaleCoinTalk",
      avatarUrl: "https://pbs.twimg.com/profile_images/2090497987197960192/FQsWb22z.jpg",
      verified: true,
      createdAt: "Sep 14, 2026",
      text: "@ZcashNames: Personal names for shielded $ZEC addresses https://x.com/i/broadcasts/1PJqrNyAQBNxb",
    },
  },
  {
    title: "Bitcoin Takeover Podcast",
    profile: "https://x.com/Vladcostea",
    where: "https://x.com/Vladcostea/status/2066603150363017522",
    followers: "26k",
    post: {
      name: "VLAD HOSTS THE BEST PODCAST IN BITCOIN",
      handle: "Vladcostea",
      avatarUrl: "https://pbs.twimg.com/profile_images/2002527941658292225/HM5WkM1M.jpg",
      verified: true,
      createdAt: "Jun 15, 2026",
      text: "On Wednesday I was invited to moderate a conversation between @ZcashNames and @paullinator of @EdgeWallet\n\nOne of the biggest UX challenges in the industry is dealing with addresses that consist of long random letters & numbers\n\nSo registering a name, especially on a privacy friendly network, can help the factor that brings the next million users",
    },
  },
];
