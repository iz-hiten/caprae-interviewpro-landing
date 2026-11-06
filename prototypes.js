// The one list of prototypes. Each version is a whole site in its own folder:
// prototypes/<slug>/<version>/index.html, features.html, how-it-works.html, candidates.html, contact.html (+ privacy.html, terms.html)
// Versions share nothing (own pages, own style.css, own img/), so any page can differ per version.
// Add drafts here as they're built, e.g.:
//   { slug: "draft-1", name: "Draft 1: …", note: "…", versions: [{ id: "a", note: "First draft" }] },
window.PROTOTYPES = [
  {
    slug: "draft-1",
    name: "Draft 1: The real app, recorded",
    note: "Light pages in the app's colours. Five pages: Home, Features, How it works, For candidates, About & contact. Pictures are stills of the real app with demo data.",
    versions: [
      { id: "a", note: "First draft" },
    ],
  },
  {
    slug: "draft-2",
    name: "Draft 2: Paper and ink",
    note: "Calm and editorial: warm paper, big serif headlines, Caprae gold as a small accent. Same five pages and content as Draft 1. References: Granola, Mercury, Tella.",
    versions: [
      { id: "a", note: "First version" },
    ],
  },
  {
    slug: "draft-3",
    name: "Draft 3: Blueprint",
    note: "Modelled on myrefactory.com: black, Roboto and Roboto Mono, blueprint linework, Caprae gold instead of their orange. Tick-ring linework with gold flowing through it; their 3D scroll story becomes a pinned How it works with real app screenshots. All five pages and legal.",
    versions: [
      { id: "a", note: "First version" },
    ],
  },
  {
    slug: "draft-4",
    name: "Draft 4: Clean product",
    note: "The CRM landing's Draft 3 template, for InterviewPro: white and calm, every app screen rebuilt in HTML with demo data. 5 pages + legal.",
    versions: [
      { id: "a", note: "First version" },
    ],
  },
];
