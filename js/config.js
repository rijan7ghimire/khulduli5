/* ------------------------------------------------------------------
   खुल्दुली site config. Everything that changes by hand lives here.
   Update numbers every few months, swap links and posters when final.
------------------------------------------------------------------- */
window.KHULDULI = {
  // Change to the @khuldulinp.com address once the domain is live.
  email: "khulduli5@gmail.com",

  socials: {
    facebook: "https://www.facebook.com/khulduli.np",
    instagram: "https://www.instagram.com/khulduli_/",
    tiktok: "https://www.tiktok.com/@khulduli.np",
    youtube: "https://www.youtube.com/@khulduli_np"
  },

  statsNote: {
    en: "Figures from platform dashboards, Nov 2026",
    ne: "तथ्याङ्क प्लेटफर्म ड्यासबोर्डबाट, नोभेम्बर २०२६"
  },

  // Headline number: counts up to `value`, then shows `suffix`.
  headline: { value: 22, suffix: "M+" },

  reach: [
    { key: "tiktok",    name: "TikTok",    value: 13.1, decimals: 1, suffix: "M", share: 1.0,
      en: "15K followers · 832K likes · 179K shares",
      ne: "15K फलोअर · 832K लाइक · 179K सेयर" },
    { key: "instagram", name: "Instagram", value: 4.87, decimals: 2, suffix: "M", share: 0.372,
      en: "2.1M accounts reached · 772K interactions",
      ne: "2.1M अकाउन्टसम्म पहुँच · 772K अन्तरक्रिया" },
    { key: "facebook",  name: "Facebook",  value: 4.3,  decimals: 1, suffix: "M", share: 0.328,
      en: "2.3M viewers · 97% non-followers",
      ne: "2.3M दर्शक · 97% फलो नगर्नेहरू" },
    { key: "youtube",   name: "YouTube",   value: 284,  decimals: 0, suffix: "K", share: 0.022,
      en: "1,873 subscribers · Partner Program member",
      ne: "1,873 सब्स्क्राइबर · पार्टनर प्रोग्राम सदस्य" }
  ],

  /* Films.
     title:   Nepali title, shown in Nepali mode. titleEn: shown in English mode.
     en:      one English line under the title.
     link:    where the poster goes (final links come later).
     youtube: a YouTube video id. If set, the film plays in the on-page player.
     poster:  image path or URL. Leave "" to use the designed fallback poster.
              Drop final posters in assets/posters/ and point to them here.

     Playing on the page (reel mode). A short film plays here if it has one of:
       video:  "assets/reels/name.mp4"   your own file. Best quality, no platform frame.
       yt:     "YouTubeShortId"          plays through the YouTube player.
       tiktok: "TikTokVideoId"           plays through the TikTok player.
     If several are set, video wins, then yt, then tiktok. With none, the card opens `link`. */
  shorts: [
    { id: "bhaitika", title: "भाइटीका", titleEn: "Bhai Tika", en: "The ring of oil",
      platform: "TikTok + Instagram", result: "4.1M+", unit: { en: "TikTok views", ne: "TikTok भ्युज" },
      extra: "429K likes · 350K+ Instagram views",
      link: "https://www.tiktok.com/@khulduli.np/video/7705068120838294791",
      video: "", yt: "", tiktok: "7705068120838294791",
      poster: "", tone: ["#ff7a1a", "#5a1206"], lead: true },
    { id: "saat-minute", title: "सात मिनेट", titleEn: "Seven Minutes", en: "A short film",
      platform: "Facebook", result: "1.41M", unit: { en: "views", ne: "भ्युज" }, extra: "",
      link: "https://www.facebook.com/khulduli.np",
      video: "", yt: "", tiktok: "",
      poster: "", tone: ["#3f7cff", "#0a1436"] },
    { id: "manthan", title: "मन्थन", titleEn: "Manthan", en: "The churning of the ocean",
      platform: "Facebook", result: "280K", unit: { en: "views", ne: "भ्युज" }, extra: "",
      link: "https://www.facebook.com/khulduli.np",
      video: "", yt: "efWy-iv3lMc", tiktok: "",
      poster: "", tone: ["#19c3a6", "#04201f"] },
    { id: "indrajatra", title: "इन्द्रजात्रा", titleEn: "Indra Jatra", en: "Why is Indra tied up every year?",
      platform: "Instagram", result: "146.7K", unit: { en: "views", ne: "भ्युज" }, extra: "",
      link: "https://www.instagram.com/khulduli_/",
      video: "", yt: "FApswtvrHIE", tiktok: "",
      poster: "", tone: ["#e5484d", "#2a0508"] }
  ],

  // More reels for the rail and reel mode. Same fields as above, no result needed.
  moreReels: [
    // `latest: true` puts this film in the frame at the top of the page. Move the flag when a new film is out.
    { title: "छठ", titleEn: "Chhath", en: "Why is the first offering made to the setting sun?", platform: "TikTok",
      tiktok: "7707235293102968065", latest: true,
      link: "https://www.tiktok.com/@khulduli.np/video/7707235293102968065" },
    { title: "शेकल्टन इफेक्ट", titleEn: "The Shackleton Effect", en: "Why Dashain no longer feels the same", yt: "RedeIJitdlQ",
      link: "https://www.youtube.com/shorts/RedeIJitdlQ" },
    { title: "फूलपाती", titleEn: "Phulpati", en: "What is inside the palanquin that gets a cannon salute?", yt: "-oUA4C8lpTQ",
      link: "https://www.youtube.com/shorts/-oUA4C8lpTQ" },
    { title: "भँगेरा", titleEn: "The Sparrow", en: "Father asked three times", yt: "hPxqFqyjmRc",
      link: "https://www.youtube.com/shorts/hPxqFqyjmRc" },
    { title: "पर्खाल", titleEn: "The Wall", en: "This Dashain, take one step", yt: "LJlekUMUNXM",
      link: "https://www.youtube.com/shorts/LJlekUMUNXM" },
    { title: "गँगटो मानसिकता", titleEn: "Crab Mentality", en: "Why do we pull each other down?", yt: "ZTaIwb86X4g",
      link: "https://www.youtube.com/shorts/ZTaIwb86X4g" }
  ],

  longform: [
    { id: "sky-caves", title: "1,500 Year Old Bones With Knife Marks",
      ne: "मुस्ताङमा हजारौँ मानव हड्डी",
      tag: { en: "The channel's top video", ne: "च्यानलको सबैभन्दा धेरै हेरिएको भिडियो" },
      meta: "Nepal's Sky Caves · 23:53", coords: "29.18°N 83.96°E · MUSTANG",
      youtube: "pMsSViqJbnE",
      link: "https://www.youtube.com/watch?v=pMsSViqJbnE",
      poster: "https://i.ytimg.com/vi/pMsSViqJbnE/maxresdefault.jpg" },
    { id: "yeti", title: "The Hunt for the Yeti",
      ne: "यतीको टाउकोको छाला साँच्चै के हो?",
      tag: { en: "Latest documentary", ne: "नयाँ डकुमेन्ट्री" },
      meta: "Himalaya · 18:04", coords: "27.83°N 86.72°E · KHUMBU",
      youtube: "h9xF1wWUhJw",
      link: "https://www.youtube.com/watch?v=h9xF1wWUhJw",
      poster: "https://i.ytimg.com/vi/h9xF1wWUhJw/maxresdefault.jpg" }
  ]
};
