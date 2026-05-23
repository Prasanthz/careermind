const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()

app.use(cors({
  origin: '*'
}))
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ 
    message: '🧠 CareerMind API Running!',
    status: 'success'
  })
})

app.use('/api/auth', require('./routes/authRoutes'))
app.use('/api/quiz', require('./routes/quizRoutes'))
app.use('/api/result', require('./routes/resultRoutes'))
app.use('/api/admin', require('./routes/adminRoutes'))

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`)
})