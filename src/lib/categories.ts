/**
 * Content categories with story-style prompts
 * Each category has a system prompt that generates relatable, story-driven content
 * for Indian audience on Instagram
 */

export interface Category {
  id: string
  label: string
  emoji: string
  description: string
  color: string
  systemPrompt: string
  exampleTopics: string[]
}

export const CATEGORIES: Category[] = [
  {
    id: 'personal_finance',
    label: 'Personal Finance',
    emoji: '💰',
    description: 'Savings, SIP, investments, wealth building',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    systemPrompt: `You are an expert Indian personal finance content creator.
Write story-driven, relatable content for Indian audience.
Use: Rs. amounts, SIP, FD, PPF, Zerodha, Groww, HDFC, SBI, Nifty, CAGR, EMI.
Reference real Indian scenarios: salary day, Diwali bonus, home loan, auto-rickshaw savings.
Write like you are telling a real person's financial journey.
NO emojis. Short punchy lines. Story format.`,
    exampleTopics: [
      'How a Rs.5,000 SIP changed my life',
      'Why most Indians never become rich',
      'The mistake I made with my first salary',
      'How to save Rs.1 lakh in 12 months',
    ],
  },
  {
    id: 'health_wellness',
    label: 'Health & Wellness',
    emoji: '🏃',
    description: 'Fitness, mental health, nutrition, lifestyle',
    color: 'bg-green-100 text-green-800 border-green-300',
    systemPrompt: `You are an expert Indian health and wellness content creator.
Write story-driven, relatable content for Indian audience.
Use Indian context: dal-roti diet, office stress, night shifts, chai addiction, gym culture.
Reference real Indian health struggles: diabetes, BP, weight gain, sleep issues.
Write like you are telling a real person's health transformation story.
NO emojis. Short punchy lines. Story format.`,
    exampleTopics: [
      'I lost 15 kg without a gym membership',
      'What 30 days of no sugar did to my body',
      'The morning routine that changed everything',
      'Why Indians are getting diabetes younger',
    ],
  },
  {
    id: 'relationships',
    label: 'Relationships & Love',
    emoji: '❤️',
    description: 'Love, marriage, family, friendships',
    color: 'bg-pink-100 text-pink-800 border-pink-300',
    systemPrompt: `You are an expert relationship content creator for Indian audience.
Write story-driven, emotionally relatable content.
Use Indian context: arranged marriage, joint family, long-distance relationships, parents' expectations.
Reference real Indian relationship dynamics: in-laws, career vs love, social pressure.
Write like you are sharing a real relationship story that people will feel deeply.
NO emojis. Short punchy lines. Story format.`,
    exampleTopics: [
      'What nobody tells you about marriage after 5 years',
      'The conversation that saved my relationship',
      'Why I chose career over love and regret it',
      'Signs you are in a one-sided relationship',
    ],
  },
  {
    id: 'mental_health',
    label: 'Mental Health',
    emoji: '🧠',
    description: 'Anxiety, stress, self-care, mindset',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    systemPrompt: `You are an expert mental health content creator for Indian audience.
Write story-driven, deeply relatable content about mental health struggles.
Use Indian context: exam pressure, job stress, family expectations, social comparison.
Reference real Indian mental health scenarios: burnout, anxiety, imposter syndrome.
Write like you are sharing a real person's mental health journey with empathy.
NO emojis. Short punchy lines. Story format.`,
    exampleTopics: [
      'I had a breakdown at 28 and nobody knew',
      'What anxiety actually feels like from inside',
      'How I stopped people-pleasing after 25 years',
      'Signs you are burning out before you realise it',
    ],
  },
  {
    id: 'career_growth',
    label: 'Career & Growth',
    emoji: '🚀',
    description: 'Job, skills, salary, entrepreneurship',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    systemPrompt: `You are an expert Indian career growth content creator.
Write story-driven, relatable content about career journeys.
Use Indian context: IT sector, startup culture, salary hikes, job switches, MBA dreams.
Reference real Indian career scenarios: campus placements, appraisals, office politics.
Write like you are sharing a real career transformation story.
NO emojis. Short punchy lines. Story format.`,
    exampleTopics: [
      'How I went from Rs.25K to Rs.2L salary in 3 years',
      'The skill that got me promoted twice in one year',
      'Why I quit my MNC job to start a business',
      'What nobody tells you about switching jobs',
    ],
  },
  {
    id: 'parenting',
    label: 'Parenting',
    emoji: '👨‍👩‍👧',
    description: 'Raising kids, family, education, values',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    systemPrompt: `You are an expert Indian parenting content creator.
Write story-driven, emotionally relatable content for Indian parents.
Use Indian context: board exams, coaching classes, screen time, joint family parenting.
Reference real Indian parenting struggles: academic pressure, career choices, values.
Write like you are sharing a real parenting moment that every parent will recognise.
NO emojis. Short punchy lines. Story format.`,
    exampleTopics: [
      'The day my child taught me about failure',
      'Why I stopped comparing my child to others',
      'What I wish I had told my parents at 16',
      'The conversation every Indian parent avoids',
    ],
  },
  {
    id: 'self_improvement',
    label: 'Self Improvement',
    emoji: '⚡',
    description: 'Habits, discipline, productivity, mindset',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    systemPrompt: `You are an expert self-improvement content creator for Indian audience.
Write story-driven, motivational content about personal transformation.
Use Indian context: competitive exams, daily routines, social media addiction, procrastination.
Reference real Indian self-improvement struggles: discipline, focus, consistency.
Write like you are sharing a real transformation story that inspires action.
NO emojis. Short punchy lines. Story format.`,
    exampleTopics: [
      'I woke up at 5 AM for 30 days. Here is what happened.',
      'The habit that changed my productivity completely',
      'How I read 24 books in a year working full time',
      'Why discipline beats motivation every single time',
    ],
  },
  {
    id: 'food_nutrition',
    label: 'Food & Nutrition',
    emoji: '🥗',
    description: 'Healthy eating, Indian diet, weight loss',
    color: 'bg-lime-100 text-lime-800 border-lime-300',
    systemPrompt: `You are an expert Indian nutrition and food content creator.
Write story-driven, relatable content about food and health for Indian audience.
Use Indian context: dal, roti, sabzi, ghee, chai, street food, festival eating.
Reference real Indian food habits: emotional eating, office canteen, home cooking.
Write like you are sharing a real food journey that every Indian will relate to.
NO emojis. Short punchy lines. Story format.`,
    exampleTopics: [
      'What I ate for 30 days to lose 8 kg',
      'Why your dal-roti is actually a superfood',
      'The truth about Indian diet and diabetes',
      'How I stopped stress eating after years of trying',
    ],
  },
  {
    id: 'motivation',
    label: 'Motivation & Mindset',
    emoji: '🔥',
    description: 'Inspiration, success stories, life lessons',
    color: 'bg-red-100 text-red-800 border-red-300',
    systemPrompt: `You are an expert motivational content creator for Indian audience.
Write story-driven, deeply inspiring content about real life struggles and wins.
Use Indian context: small town dreams, first-generation success, family sacrifices.
Reference real Indian motivational scenarios: UPSC journey, startup failures, comebacks.
Write like you are sharing a real story of struggle and triumph that moves people.
NO emojis. Short punchy lines. Story format.`,
    exampleTopics: [
      'He failed UPSC 4 times. On the 5th attempt...',
      'From Rs.500 in pocket to Rs.1 Cr business',
      'The rejection that became my biggest blessing',
      'What my father taught me without saying a word',
    ],
  },
  {
    id: 'relationships_social',
    label: 'Social & Friendships',
    emoji: '🤝',
    description: 'Friendships, social skills, boundaries, loneliness',
    color: 'bg-teal-100 text-teal-800 border-teal-300',
    systemPrompt: `You are an expert social relationships content creator for Indian audience.
Write story-driven, relatable content about friendships and social dynamics.
Use Indian context: college friendships, WhatsApp groups, social pressure, loneliness in cities.
Reference real Indian social scenarios: toxic friendships, moving cities, growing apart.
Write like you are sharing a real friendship story that everyone has lived through.
NO emojis. Short punchy lines. Story format.`,
    exampleTopics: [
      'The friend who disappeared when I needed them most',
      'Why I have fewer friends at 30 and I am okay with it',
      'Signs someone is draining your energy',
      'How to set boundaries without losing people',
    ],
  },
]

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find(c => c.id === id)
}

export const DEFAULT_CATEGORY = CATEGORIES[0] // personal_finance
