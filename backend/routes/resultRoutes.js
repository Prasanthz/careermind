const express = require('express')
const router = express.Router()
const { execFile } = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')

router.post('/download', async (req, res) => {
  const { result, type } = req.body  // type = 'pdf' or 'png'
  const ts = Date.now()
  const pdfPath = path.join(os.tmpdir(), `report-${ts}.pdf`)
  const pngPath = path.join(os.tmpdir(), `card-${ts}.png`)
  const script  = path.join(__dirname, '../generateReport.py')

  execFile('python', [script, JSON.stringify(result), pdfPath, pngPath], (err, stdout, stderr) => {
    if (err) {
        console.error('STDOUT:', stdout)
        console.error('STDERR:', stderr)
        console.error('ERROR:', err.message)
        return res.status(500).json({ 
        message: 'Report generation failed',
        error: err.message,
        stderr: stderr,
        stdout: stdout
        })
    }
    const filePath = type === 'png' ? pngPath : pdfPath
    const mime     = type === 'png' ? 'image/png' : 'application/pdf'
    const filename = type === 'png'
      ? `${result.personality_type}-CareerMind-Card.png`
      : `${result.personality_type}-CareerMind-Report.pdf`

    res.setHeader('Content-Type', mime)
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    const stream = fs.createReadStream(filePath)
    stream.pipe(res)
    stream.on('end', () => {
      try { fs.unlinkSync(pdfPath); fs.unlinkSync(pngPath) } catch(e){}
    })
  })
})

module.exports = router