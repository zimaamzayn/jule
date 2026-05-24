# Civilization-Level Interactive Da‘wah App for Medical Students
## Axiom: Journey of Existence

This document provides a comprehensive, extreme-detail, production-grade architecture and design specification for the "Axiom" platform.

---

## 1. Complete App Vision
**The Ultimate Goal**: To create the most intellectually serious, emotionally moving, and beautiful Islamic educational experience ever designed for modern university students, with a specific focus on medical students, scientifically minded individuals, and curious non-Muslims.

**Core Identity**:
- **What it is**: An interactive journey into truth, existence, consciousness, morality, science, and God.
- **What it is NOT**: A preachy, sectarian, aggressive, anti-science, or cult-like generic religious app.

**Key Emotions Evoked**:
- Awe, serenity, intellectual stimulation, spiritual curiosity, and deep reflection. Users should feel respected and intellectually challenged.

**Theological Framework**:
- Grounded firmly in Sunni Islam, Ahl al-Sunnah, and traditional scholarship.
- Non-anthropomorphic, utilizing the refined theological language of traditional Kalam when dealing with the attributes of God.
- Shafi‘i-friendly orthodoxy, presented with universal appeal and profound compassion.

**Chosen Naming System**:
- **App Name**: *Axiom: Journey of Existence*
- **Tagline**: "Discover truth, beauty, meaning, and God."
- **Alternative Names Considered**: *Tafakkur*, *Lumina*, *Noorani*, *Synapse*, *Aether*.

**Visual Identity & Logo Concept**:
- **Logo**: A minimalist, sacred-geometry inspired representation of a synapse connecting to a star, symbolizing the intersection of the human mind and the divine cosmos.
- **Symbolic Design Language**: Using visual metaphors (trees for knowledge, light paths for guided reasoning, deep space for consciousness).

---

## 2. Full UX Architecture
The user experience is built around spatial, exploratory "worlds" rather than traditional lists and menus.

**Information Architecture**:
- **Level 1 (Entry)**: Cinematic Onboarding & Worldview Profiling.
- **Level 2 (The Hub)**: The 'Astrolabe' - a 3D, rotatable interface acting as the central hub.
- **Level 3 (Journeys)**: Immersive, linear/branching interactive modules (e.g., The Journey of Existence).
- **Level 4 (Deep Dives)**: Scholarly articles, citation pop-overs, tafsir layers.
- **Level 5 (Inner Space)**: The "Night Reflection" mode and journaling hub.

**Core User Flow**:
1. Open App -> Ambient soundscape initiates.
2. Personalized daily reflection prompt (e.g., "What does your heartbeat tell you about purpose?").
3. Transition to the Astrolabe Hub.
4. Select a module (e.g., "Islam & Science").
5. Engage with an interactive 3D model (e.g., embryonic development history).
6. Save insights to personal journal.

---

## 3. User Journey Maps

### Journey Map A: The Medical Student (Aisha/Rahul)
- **Persona**: Highly analytical, stressed, interested in bioethics and human physiology.
- **Trigger**: Sees an aesthetic Instagram reel about "The Neuroscience of Sujud".
- **Onboarding**: Selects "Medical/Science Background".
- **Path**: Navigates directly to "Medical Ethics & Islam". Reads an interactive case study on End-of-Life ethics.
- **Climax**: Uses the "Ask Anything AI" to query specific rulings on organ donation. Is impressed by the heavily cited, empathetic response.
- **Retention**: Returns daily for the "Inner Transformation" mode to de-stress before exams using the 5-minute deep-breathing + Dhikr tool.

### Journey Map B: The Agnostic Philosophy Major (Sam)
- **Persona**: Skeptical, widely read, averse to dogma.
- **Trigger**: Recommended by a friend to check out the "Mind-Body Problem" section.
- **Path**: Enters "Journey of Existence". Engages with branching dialogue simulations regarding the Fine-Tuning of the Universe.
- **Climax**: Experiences the "Night Reflection" mode, listening to a soft Quranic recitation about the creation of the heavens, feeling an unexpected sense of awe.
- **Retention**: Engages with "Comparative Worldviews" engine.

---

## 4. Wireframes (Architectural Layouts)

- **The Astrolabe Hub**:
  - Full screen canvas.
  - Floating UI. Bottom navigation is a translucent glass pill (`backdrop-blur-xl`).
  - Nodes: Glowing orbs representing different journeys.
- **Interactive Reading View**:
  - Parallax scrolling.
  - Large serif typography for main text.
  - Right edge: A subtle vertical timeline or progress bar resembling a thread of light.
  - Tap-to-expand words: Dotted underline on complex philosophical terms; tapping opens a bottom sheet with definitions.
- **AI Companion (Axiom AI)**:
  - Chat interface but elevated.
  - User messages align right, AI messages align left but are presented as beautiful cards.
  - "Thinking" animation: A subtle pulsing nebula effect.
  - Below AI response: Small pill buttons for citations [1], [2].

---

## 5. Screen Descriptions

1.  **Splash & Breathe Screen**: Deep cosmic blue `#050814`. "Breathe in" (circle expands) -> "Breathe out" (circle contracts) -> App fades in.
2.  **The Journey of Existence - 'Consciousness' Chapter**: A dark screen with a single point of light. As the user scrolls, text fades in discussing the Hard Problem of Consciousness. The light expands into a complex neural network animation.
3.  **Comparative Worldviews Engine**: A split-screen interactive scale. Dragging "Materialism" to one side and "Islamic Theism" to the other populates the screen with differing epistemological frameworks.
4.  **The Night Reflection (Special Mode)**: Dark mode forced. OLED black background. Slow, simulated star-field. Guided audio plays automatically. A glowing, distraction-free text input for journaling.

---

## 6. Feature Hierarchy

**MVP (Phase 1)**
- Cinematic Onboarding
- The Astrolabe Hub (2D fallback for web)
- Journey of Existence (Text + Basic Animation)
- Ask Anything AI (RAG based on verified texts)
- Night Reflection Mode

**Phase 2**
- Islam & Science / Medical Ethics modules
- Full Quran Experience with Audio Sync
- User Accounts & Journaling
- Gamification (Streaks, Beautiful Badges)

**Phase 3**
- 3D Interactive modules (WebGL/Three.js)
- Social features (Anonymous reading groups)
- Multi-language support

---

## 7. Design System

- **Design Language**: "Luminous Minimalism".
- **Primary Colors**:
  - Void Blue: `#030712` (Backgrounds)
  - Starlight: `#F9FAFB` (Primary Text)
  - Gold Axiom: `#D4AF37` (Accents, Highlights)
  - Serene Emerald: `#10B981` (Success, Halal/Positive indicators)
- **UI Components**:
  - `GlassCard`: `bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl`
  - `GlowButton`: Button with an underlying `box-shadow` matching the Gold Axiom color, pulsing softly on hover.
- **Accessibility**:
  - High Contrast Toggle (switches to `#000000` and `#FFFFFF`).
  - Reduced Motion (disables Framer Motion complex variants).

---

## 8. Typography System

- **Display/Headings**: *Playfair Display* (or *Cormorant Garamond*). Provides intellectual weight, historical connection, and elegance.
- **Body Text**: *Inter* (or *SF Pro*). Highly legible, modern, clean.
- **Arabic Script**: *KFGQPC Uthman Taha Naskh*. The gold standard for Quranic legibility.
- **Hierarchy**:
  - H1: 48px, Playfair, Bold, Tracking-tight
  - H2: 32px, Playfair, Semi-Bold
  - Body: 18px, Inter, Regular, Leading-relaxed (1.7)

---

## 9. Animation Philosophy

- **Engine**: Framer Motion (React).
- **Principles**:
  - *No sudden snaps*: Everything must ease in and ease out. Use spring physics, not linear transitions.
  - *Stiffness and Damping*: `type: "spring", stiffness: 50, damping: 20` for a floating, deliberate feel.
  - *Micro-interactions*: Hovering over a philosophical concept should cause a subtle magnetic pull and a slight glow.
  - *Page Transitions*: Instead of sliding, pages should perform a 'cinematic crossfade' with a slight scale-down of the exiting page.

---

## 10. React Component Architecture

**Tech Stack**: Next.js 14+ (App Router), React, TypeScript, TailwindCSS, Framer Motion, Zustand.

```typescript
src/
├── app/
│   ├── (auth)/             # Login/Signup/Onboarding
│   ├── (journeys)/         # Dynamic routes for interactive chapters
│   │   ├── existence/
│   │   ├── science/
│   │   └── quran/
│   ├── ai-companion/       # Chat interface
│   ├── night-reflection/   # Special mode
│   ├── layout.tsx          # Global providers (Theme, Auth, Audio)
│   └── page.tsx            # The Astrolabe Hub
├── components/
│   ├── atoms/              # Button.tsx, Typography.tsx, Icon.tsx
│   ├── molecules/          # GlassCard.tsx, JourneyNode.tsx
│   ├── organisms/          # TopNav.tsx, BottomNav.tsx, AIResponse.tsx
│   └── templates/          # JourneyLayout.tsx, CinematicScroll.tsx
├── hooks/
│   ├── useAudioSync.ts     # For syncing Quran recitation with text
│   ├── useJourneyState.ts  # Tracking progress
│   └── useLLMStream.ts     # Handling SSE streams from AI backend
├── store/
│   ├── userStore.ts        # Zustand: User worldview, preferences
│   └── uiStore.ts          # Zustand: Theme, ambient audio state
├── lib/
│   ├── ai/                 # Langchain/OpenAI wrapper utilities
│   ├── db/                 # Supabase client
│   └── utils.ts            # Tailwind merge, formatting
```

---

## 11. Database Schema (Supabase/PostgreSQL)

```sql
-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE,
  worldview_profile JSONB, -- e.g., {"background": "medical", "belief": "agnostic"}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journeys (Content Metadata)
CREATE TABLE journeys (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255),
  category VARCHAR(50),
  total_steps INT
);

-- User Progress
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  journey_id VARCHAR(50) REFERENCES journeys(id),
  current_step INT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  last_accessed TIMESTAMPTZ DEFAULT NOW()
);

-- Reflections (Journaling)
CREATE TABLE reflections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  prompt_text TEXT,
  content TEXT,
  is_private BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Conversations
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  title VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 12. Backend Architecture

- **Primary Paradigm**: Serverless via Next.js API Routes / Vercel Edge Functions for low-latency global access.
- **Database**: Supabase (PostgreSQL) for relational data, authentication, and Row Level Security (RLS).
- **Caching**: Upstash (Serverless Redis) to cache frequent AI questions (e.g., "What is the Islamic view on the Big Bang?") to save LLM costs and reduce latency.
- **Media Storage**: Cloudflare R2 or Supabase Storage for high-quality audio files (Quran recitations, ambient soundscapes) and 3D assets.

---

## 13. AI System Design (Axiom AI)

**Architecture**: Advanced RAG (Retrieval-Augmented Generation).
**Objective**: To provide highly accurate, empathetic, and scholarly backed answers.

1.  **Knowledge Base Ingestion**:
    - Ingest classical Tafsir (Ibn Kathir, Al-Qurtubi - English translations), texts on Kalam (Al-Ghazali, Al-Razi), modern Islamic philosophy (e.g., works from Yaqeen Institute), and verified medical ethics fatwas.
    - Chunking strategy: Semantic chunking by paragraph/section.
    - Vectorization: OpenAI `text-embedding-3-large` -> stored in Supabase pgvector.
2.  **Query Processing**:
    - User asks a question -> LLM classifies intent (Theology, Jurisprudence, Emotional Support, Medical Ethics).
    - If "Medical Ethics", query is embedded and searched specifically within the Medical Ethics namespace in pgvector.
3.  **Generation**:
    - LLM: `gpt-4o` or `claude-3.5-sonnet` (Claude preferred for nuanced, empathetic tone).
    - System Prompt enforces: Strict adherence to orthodox Sunni theology, no anthropomorphism, absolute prohibition of Takfir (excommunication), empathetic tone, explicit citation of retrieved chunks.

---

## 14. Moderation System

To protect the platform's integrity and ensure user safety:
- **Pre-Processing Guardrails**: Langchain's self-query or a lightweight fast LLM (e.g., Llama-3-8B on Groq) evaluates the input for extreme profanity or direct malicious injection.
- **Post-Processing Guardrails**: If the AI attempts to generate a ruling (Fatwa) on a highly sensitive real-world medical issue (e.g., "Should I unplug my mother's life support right now?"), the system intercepts it via keyword detection/classification and replaces the output with a pre-written empathetic response advising consulting a local scholar and medical professional.
- **Hallucination Reduction**: The LLM is instructed: `If the retrieved context does not contain the answer, you must output: "I do not have sufficient scholarly sources to answer this accurately." Do not guess.`

---

## 15. Content Pipeline

- **CMS**: Sanity.io or a custom internal dashboard built on Supabase.
- **Structure**: Content is authored in Rich Text / Portable Text or a specialized JSON schema that Next.js parses to render interactive components (e.g., `{ type: "simulation", id: "embryology-1" }`).
- **Workflow**:
  1. Author drafts content.
  2. Content enters `pending_review` state.
  3. Islamic Scholarly Board reviews and signs off.
  4. Content is published to edge CDN.

---

## 16. Gamification Engine

- **Philosophy**: Intrinsic over Extrinsic. No toxic "FOMO" notifications.
- **Mechanics**:
  - *Constellations*: Instead of a progress bar, completing modules lights up stars in a personal digital constellation.
  - *Intellectual Quests*: E.g., "The Seeker of Origins" - awarded for completing the Cosmology and Fine-Tuning modules.
  - *Meaningful Streaks*: "7 Days of Deep Reflection". If a user breaks a streak, the app says, "Rest is also a mercy. Pick up whenever you are ready."

---

## 17. Psychological Engagement Framework

- **Cognitive Load Management**: Complex theological arguments are broken into "cards". A user must swipe to proceed, allowing processing time.
- **Emotional Pacing**: After a dense philosophical module, the app suggests a 2-minute audio contemplation to integrate the knowledge.
- **Autonomy**: Users are not forced down a linear path. The Astrolabe Hub allows them to follow their curiosity.

---

## 18. Islamic Scholarly Review Framework

- **The Board**: A coalition of recognized scholars specialized in Aqeedah (Theology), Fiqh (Jurisprudence), and contemporary issues (Medical Bioethics).
- **The Matrix**:
  - *Green Content*: Basic UI text, historical facts (Requires 1 reviewer).
  - *Yellow Content*: Tafsir summaries, basic philosophical arguments (Requires 2 reviewers).
  - *Red Content*: Direct theological refutations, medical ethics rulings (Requires unanimous board approval).
- **Transparency**: Every article/module has a "Reviewed By" tag, establishing intellectual trust.

---

## 19. Accessibility System

- **Visual**: WCAG 2.1 AA compliance. Minimum contrast ratios enforced via Tailwind config.
- **Auditory**: All audio recitations and ambient sounds have full closed captions and transcripts.
- **Motor/Cognitive**:
  - Full keyboard navigation support.
  - "Low Stimulation Mode": Strips out parallax, glowing animations, and complex transitions, rendering clean, static text.
  - "Dyslexia Mode": Toggles font to OpenDyslexic or scales up letter spacing in Inter.

---

## 20. Security Architecture

- **Authentication**: JWT via Supabase Auth.
- **Data Privacy**: Users can use the app without an account (Local Storage only). If an account is created, journal entries (`reflections`) are encrypted at rest.
- **API Protection**: Rate limiting on AI endpoints via Upstash/Redis to prevent abuse and manage API costs.

---

## 21. Offline Support System

- **Service Workers**: Implemented via `next-pwa` or Workbox.
- **Caching Strategy**:
  - Shell UI: Cache-first.
  - Text Content: Stale-while-revalidate.
  - Media: Handled via manual "Download Pack" buttons. Users can download "The Quran Experience (Surah Yaseen)" which saves audio and text locally to IndexedDB.

---

## 22. PWA Architecture

- **Manifest**: Complete `manifest.json` with high-res icons (maskable), theme color `#050814`, background color `#050814`, and display `standalone`.
- **Installation**: A custom, beautifully designed "Add to Home Screen" prompt that appears after the user completes their first module, explaining the benefits of full-screen immersion.

---

## 23. Monetization without Ruining Sincerity

- **Strict Rule**: ZERO advertisements. No paywalls on core theological or philosophical content.
- **The Waqf Model (Digital Endowment)**:
  - Users are presented with an elegant "Sponsor a Seeker" page.
  - E.g., "Your $10/month covers the AI API costs for 50 students."
  - High-tier donors get access to physical beautifully printed companion journals, or exclusive Q&A webinars with scholars.
- **Institutional Grants**: Partnering with Islamic educational endowments.

---

## 24. Viral Growth System

- **Elegant Sharing**: When a user highlights a profound quote or Quranic verse, tapping 'Share' generates a stunning, branded image (using `@vercel/og` Edge functions for dynamic image generation) perfect for Instagram Stories or X.
- **Deep Linking**: Sharing a specific node in the "Journey of Existence" creates a link that drops a new user exactly into that interactive experience on the web.

---

## 25. Campus Ambassador Model

- **The Strategy**: Equip university students with tools.
- **Ambassador Kit**: Ambassadors receive access to a special portal in the app: "Host a Reflection Night".
- **Execution**: Provides a step-by-step guide to gathering friends, playing a specific app module on a screen, and using provided discussion prompts.

---

## 26. Analytics Architecture

- **Tool**: PostHog (Self-hosted or Privacy-configured cloud).
- **Metrics Tracked**:
  - Journey completion rates (Where do users drop off in the "Free Will" module?).
  - AI Topic Clustering (Are thousands of medical students suddenly asking about AI in healthcare? Update the content pipeline).
- **Strictly NOT Tracked**: Identifiable journaling data, specific individual religious doubts.

---

## 27. Privacy-First Architecture

- **Zero-Knowledge Journaling (Optional)**: Provide a toggle for users to encrypt their journal entries on the client-side before syncing to Supabase, meaning even database admins cannot read their personal reflections.
- **Right to be Forgotten**: A prominent, single-tap "Delete My Account & All Data" button in settings that triggers a cascading delete via Supabase Edge Functions.

---

## 28. Deployment Architecture

- **Frontend & Serverless APIs**: Deployed on Vercel. Global Edge network ensures fast loading of the UI worldwide.
- **Database**: Supabase Pro plan (managed PostgreSQL) hosted in a central region (e.g., AWS eu-central-1 or us-east-1) to balance global latency.
- **AI Backend**: Direct integration with OpenAI/Anthropic APIs from Vercel Edge functions, utilizing streaming responses (`StreamingTextResponse`) for fast TTFB (Time to First Byte).

---

## 29. Future Roadmap

- **Year 1**: Web/PWA Launch. Core Journeys (Existence, Quran, Science). AI Companion MVP.
- **Year 2**: Native Apps (React Native/Expo). Gamification layer. Urdu, Arabic, Spanish, French translations. Complete Medical Ethics Interactive Course.
- **Year 3**: "Axiom VR" - A WebXR / Meta Quest experience allowing users to walk through the cosmic timeline and embryological development in 3D space.

---

## 30. Full Production-Grade Implementation Plan

### Phase 1: Foundation (Weeks 1-3)
- Initialize Next.js, Tailwind, Framer Motion repository.
- Setup Supabase database, run migrations for users, journeys, and progress.
- Implement Authentication and the onboarding worldview questionnaire.
- Create base UI component library (GlassCards, Typography hierarchy).

### Phase 2: The Core Experience (Weeks 4-7)
- Build "The Astrolabe" navigation hub using CSS 3D transforms or basic Three.js.
- Develop the "Journey Engine" - a specialized React context/layout for rendering interactive, sequenced text and animations.
- Write and implement the "Journey of Existence" content.

### Phase 3: AI & Integrations (Weeks 8-11)
- Setup Langchain, Supabase pgvector, and OpenAI/Anthropic integration.
- Build the data ingestion pipeline for the scholarly corpus.
- Develop the "Ask Anything AI" chat interface with streaming responses and citation mapping.

### Phase 4: Specific Modules (Weeks 12-16)
- Develop "Medical Ethics & Islam" specific interactive case studies.
- Develop "The Night Reflection" mode (forced dark mode, ambient audio player integration).
- Implement the "Comparative Worldviews" interactive scale.

### Phase 5: Refinement, Polish & PWA (Weeks 17-20)
- Implement `next-pwa` for offline capabilities and caching.
- Extensive Framer Motion animation tuning (ensuring 60fps performance on mobile devices).
- Accessibility audits (VoiceOver testing, contrast checks).
- Content Board Review: All text finalized and approved by scholars.

### Phase 6: Launch & Scale (Week 21+)
- Soft launch to MSA (Muslim Student Association) leaders.
- Monitor PostHog analytics for immediate UX bottlenecks.
- Begin Ambassador program outreach.
- Open WaQF endowment funding channels.

---
*End of Specification.*
