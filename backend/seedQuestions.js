require('dotenv').config()
const mysql = require('mysql2/promise')

async function seedQuestions() {
  const db = await mysql.createConnection({
    host: 'gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com',
    port: 4000,
    user: '25gn9QxvasSnwdc.root',
    password: 'FBaJuhXIwsDZKQs2',
    database: 'careermind',
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
  })

  const questions = [
    { q: "When solving a problem, you prefer", a: "Logic & Analysis", b: "Intuition & Feelings", cat: "Thinking/Feeling" },
    { q: "In a group project, you naturally become", a: "The Leader", b: "The Supporter", cat: "Extrovert/Introvert" },
    { q: "You feel more energized by", a: "Meeting & talking to people", b: "Spending time alone", cat: "Extrovert/Introvert" },
    { q: "You prefer working with", a: "Structured plans & deadlines", b: "Flexible & spontaneous approach", cat: "Judging/Perceiving" },
    { q: "Under pressure, you usually", a: "Stay calm & think clearly", b: "Feel anxious & overwhelmed", cat: "Thinking/Feeling" },
    { q: "You are more focused on", a: "Present facts & details", b: "Future possibilities & ideas", cat: "Sensing/Intuition" },
    { q: "When making decisions, you rely on", a: "Facts & data", b: "Emotions & values", cat: "Thinking/Feeling" },
    { q: "Your workspace is usually", a: "Organized & tidy", b: "Creative chaos", cat: "Judging/Perceiving" },
    { q: "You prefer tasks that are", a: "Practical & hands-on", b: "Theoretical & conceptual", cat: "Sensing/Intuition" },
    { q: "In conversations, you tend to", a: "Talk more & share openly", b: "Listen more & think before speaking", cat: "Extrovert/Introvert" },
    { q: "When learning something new, you prefer", a: "Step-by-step instructions", b: "Figuring it out yourself", cat: "Sensing/Intuition" },
    { q: "You find it easier to", a: "Follow a routine", b: "Try new things every day", cat: "Judging/Perceiving" },
    { q: "When someone is upset, you first", a: "Offer solutions", b: "Offer emotional support", cat: "Thinking/Feeling" },
    { q: "You trust more in", a: "Experience & proven methods", b: "New ideas & innovations", cat: "Sensing/Intuition" },
    { q: "At parties or social events, you", a: "Enjoy meeting new people", b: "Stick with people you know", cat: "Extrovert/Introvert" },
    { q: "You prefer projects that", a: "Have clear goals & outcomes", b: "Allow creativity & exploration", cat: "Judging/Perceiving" },
    { q: "When giving feedback, you are", a: "Direct & honest", b: "Gentle & diplomatic", cat: "Thinking/Feeling" },
    { q: "You get more satisfaction from", a: "Completing tasks on time", b: "Keeping options open", cat: "Judging/Perceiving" },
    { q: "You are more drawn to", a: "Real-world applications", b: "Abstract theories & concepts", cat: "Sensing/Intuition" },
    { q: "After a long social event, you feel", a: "Energized & happy", b: "Tired & need alone time", cat: "Extrovert/Introvert" },
    { q: "You handle conflicts by", a: "Addressing them directly", b: "Avoiding & keeping peace", cat: "Thinking/Feeling" },
    { q: "Your decisions are mostly based on", a: "Logic & efficiency", b: "How it affects people", cat: "Thinking/Feeling" },
    { q: "You prefer a job that is", a: "Stable & predictable", b: "Varied & challenging", cat: "Judging/Perceiving" },
    { q: "When starting a project, you", a: "Plan everything first", b: "Jump in and figure it out", cat: "Sensing/Intuition" },
    { q: "You consider yourself more", a: "Realistic & practical", b: "Imaginative & visionary", cat: "Sensing/Intuition" },
    { q: "When you are given a free day, you prefer to", a: "Go out and meet friends", b: "Stay home and relax alone", cat: "Extrovert/Introvert" },
  ]

  console.log('Seeding questions to TiDB...')
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    await db.execute(
      'INSERT INTO questions (question_text, category, option_a, option_b, display_order) VALUES (?, ?, ?, ?, ?)',
      [q.q, q.cat, q.a, q.b, i + 1]
    )
    console.log(`Question ${i + 1} added`)
  }
  console.log('All 26 questions seeded!')
  await db.end()
}

seedQuestions()