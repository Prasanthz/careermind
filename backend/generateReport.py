"""
CareerMind AI — Report Generator
Usage: python generateReport.py <json_string> <output_pdf> <output_png>
"""
import sys, json, textwrap, os, math
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas as pdfcanvas
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import io

# ─── BRAND COLORS ─────────────────────────────────────────────
PURPLE      = colors.HexColor('#7C3AED')
PINK        = colors.HexColor('#DB2777')
PURPLE_DARK = colors.HexColor('#4C1D95')
PURPLE_MID  = colors.HexColor('#5B21B6')
BG_DARK     = colors.HexColor('#0F0F1A')
BG_CARD     = colors.HexColor('#16213E')
TEXT_WHITE  = colors.HexColor('#F8FAFC')
TEXT_GRAY   = colors.HexColor('#94A3B8')
TEXT_LIGHT  = colors.HexColor('#CBD5E1')
BORDER      = colors.HexColor('#2D1B69')
GOLD        = colors.HexColor('#F59E0B')
GREEN       = colors.HexColor('#10B981')
RED_SOFT    = colors.HexColor('#F87171')

W, H = A4  # 595 x 842 pt

# ─── DRAW BRAIN+CIRCUIT LOGO (ReportLab vector) ──────────────
def draw_logo_rl(c, x, y, size=28):
    """Draw brain+circuit logo using ReportLab canvas at position (x,y), size in pts."""
    s = size / 28.0  # scale factor

    # Gradient circle background
    steps = 20
    for i in range(steps, 0, -1):
        t = i / steps
        r = PURPLE.red * t + PINK.red * (1 - t)
        g = PURPLE.green * t + PINK.green * (1 - t)
        b = PURPLE.blue * t + PINK.blue * (1 - t)
        c.setFillColorRGB(r, g, b, alpha=0.15 + 0.05 * (steps - i) / steps)
        radius = size * 0.6 * i / steps
        c.circle(x, y, radius, fill=1, stroke=0)

    # Outer ring
    c.setStrokeColorRGB(PURPLE.red, PURPLE.green, PURPLE.blue)
    c.setLineWidth(1.5 * s)
    c.circle(x, y, size * 0.55, fill=0, stroke=1)

    # Brain lobes (simplified)
    c.setFillColorRGB(1, 1, 1, alpha=0.9)
    c.setStrokeColorRGB(1, 1, 1, alpha=0.9)
    c.setLineWidth(1.2 * s)

    # Left lobe
    p = c.beginPath()
    p.moveTo(x - 1*s, y + 8*s)
    p.curveTo(x - 12*s, y + 8*s, x - 14*s, y - 2*s, x - 10*s, y - 6*s)
    p.curveTo(x - 14*s, y - 10*s, x - 8*s, y - 13*s, x - 1*s, y - 8*s)
    c.drawPath(p, fill=0, stroke=1)

    # Right lobe
    p = c.beginPath()
    p.moveTo(x + 1*s, y + 8*s)
    p.curveTo(x + 12*s, y + 8*s, x + 14*s, y - 2*s, x + 10*s, y - 6*s)
    p.curveTo(x + 14*s, y - 10*s, x + 8*s, y - 13*s, x + 1*s, y - 8*s)
    c.drawPath(p, fill=0, stroke=1)

    # Center divider
    p = c.beginPath()
    p.moveTo(x, y + 7*s)
    p.lineTo(x, y - 7*s)
    c.drawPath(p, fill=0, stroke=1)

    # Circuit dots
    c.setFillColorRGB(PINK.red, PINK.green, PINK.blue, alpha=1)
    for dx, dy in [(-6, 4), (6, 4), (-6, -4), (6, -4), (0, 7), (0, -7)]:
        c.circle(x + dx*s, y + dy*s, 1.5*s, fill=1, stroke=0)

    # Circuit lines
    c.setStrokeColorRGB(PINK.red, PINK.green, PINK.blue, alpha=0.7)
    c.setLineWidth(0.8*s)
    c.line(x - 6*s, y + 4*s, x - 10*s, y + 4*s)
    c.line(x + 6*s, y + 4*s, x + 10*s, y + 4*s)
    c.line(x - 6*s, y - 4*s, x - 10*s, y - 4*s)
    c.line(x + 6*s, y - 4*s, x + 10*s, y - 4*s)


# ─── PDF CANVAS WITH HEADER+FOOTER ON EVERY PAGE ──────────────
class CareerMindCanvas(pdfcanvas.Canvas):
    def __init__(self, filename, result_data):
        super().__init__(filename, pagesize=A4)
        self.result_data = result_data
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page(num_pages)
            super().showPage()
        super().save()

    def draw_page(self, total_pages):
        self.draw_header()
        self.draw_footer(total_pages)

    def draw_header(self):
        # Purple→pink gradient header bar
        steps = 40
        for i in range(steps):
            t = i / steps
            r = PURPLE_DARK.red + (PINK.red - PURPLE_DARK.red) * t
            g = PURPLE_DARK.green + (PINK.green - PURPLE_DARK.green) * t
            b = PURPLE_DARK.blue + (PINK.blue - PURPLE_DARK.blue) * t
            self.setFillColorRGB(r, g, b)
            self.rect(W * i / steps, H - 52*mm, W / steps + 1, 52*mm, fill=1, stroke=0)

        # Logo icon
        draw_logo_rl(self, 22*mm, H - 26*mm, size=22)

        # App name
        self.setFillColor(TEXT_WHITE)
        self.setFont("Helvetica-Bold", 18)
        self.drawString(40*mm, H - 22*mm, "CAREERMIND AI")
        self.setFont("Helvetica", 9)
        self.setFillColorRGB(1, 1, 1, alpha=0.7)
        self.drawString(40*mm, H - 31*mm, "Personality Assessment Report")

        # Website
        self.setFont("Helvetica", 8)
        self.setFillColorRGB(1, 1, 1, alpha=0.6)
        self.drawRightString(W - 15*mm, H - 27*mm, "careermind.app")

        # Bottom border of header
        self.setStrokeColor(PINK)
        self.setLineWidth(1)
        self.line(0, H - 52*mm, W, H - 52*mm)

    def draw_footer(self, total_pages):
        # Dark footer bar
        self.setFillColor(BG_DARK)
        self.rect(0, 0, W, 14*mm, fill=1, stroke=0)

        # Footer text
        self.setFillColor(TEXT_GRAY)
        self.setFont("Helvetica", 7)
        pt = self._pageNumber
        self.drawString(15*mm, 5*mm,
            "Generated by CareerMind AI  |  careermind.app  |  Discover your personality, find your career path")
        self.drawRightString(W - 15*mm, 5*mm, f"Page {pt}")

        # Footer top border
        self.setStrokeColor(BORDER)
        self.setLineWidth(0.5)
        self.line(0, 14*mm, W, 14*mm)


# ─── STYLES ───────────────────────────────────────────────────
def make_styles():
    base = getSampleStyleSheet()
    S = {}

    S['section_title'] = ParagraphStyle('section_title',
        fontName='Helvetica-Bold', fontSize=11, textColor=TEXT_WHITE,
        spaceAfter=4, spaceBefore=10,
        borderPad=(6, 8, 6, 8),
        backColor=PURPLE_MID,
        borderRadius=4,
        leading=16)

    S['body'] = ParagraphStyle('body',
        fontName='Helvetica', fontSize=9, textColor=TEXT_LIGHT,
        leading=14, spaceAfter=4, alignment=TA_JUSTIFY)

    S['label'] = ParagraphStyle('label',
        fontName='Helvetica-Bold', fontSize=8.5, textColor=TEXT_GRAY,
        spaceAfter=2)

    S['value'] = ParagraphStyle('value',
        fontName='Helvetica', fontSize=9, textColor=TEXT_WHITE,
        leading=13)

    S['career_title'] = ParagraphStyle('career_title',
        fontName='Helvetica-Bold', fontSize=9.5, textColor=TEXT_WHITE,
        spaceAfter=1)

    S['career_sub'] = ParagraphStyle('career_sub',
        fontName='Helvetica', fontSize=8.5, textColor=TEXT_GRAY,
        spaceAfter=2)

    S['tag'] = ParagraphStyle('tag',
        fontName='Helvetica-Bold', fontSize=8, textColor=TEXT_WHITE,
        leading=11)

    S['bullet'] = ParagraphStyle('bullet',
        fontName='Helvetica', fontSize=9, textColor=TEXT_LIGHT,
        leading=14, leftIndent=10, bulletIndent=0, spaceAfter=2)

    S['famous'] = ParagraphStyle('famous',
        fontName='Helvetica-Bold', fontSize=8.5, textColor=TEXT_WHITE,
        alignment=TA_CENTER)

    return S


# ─── SECTION HEADING HELPER ──────────────────────────────────
def section_heading(title, styles):
    return [
        Spacer(1, 6),
        Paragraph(f"  {title}", styles['section_title']),
        Spacer(1, 6),
    ]


# ─── GENERATE PDF ─────────────────────────────────────────────
def generate_pdf(result, pdf_path):
    S = make_styles()
    MARGIN_TOP    = 60*mm
    MARGIN_BOTTOM = 20*mm
    MARGIN_LR     = 15*mm

    story = []

    ptype       = result.get('personality_type', 'ESTJ')
    pname       = result.get('personality_name', 'The Executive')
    description = result.get('description', '')
    strengths   = result.get('strengths', [])
    weaknesses  = result.get('weaknesses', [])
    careers     = result.get('careers', [])
    courses     = result.get('courses', [])
    skills_have = result.get('skills_have', [])
    skills_need = result.get('skills_need', [])
    roadmap     = result.get('roadmap', [])
    work_style  = result.get('work_style', {})
    famous      = result.get('famous_people', [])

    inner_w = W - 2 * MARGIN_LR

    # ── PERSONALITY TYPE HERO ─────────────────────────────────
    hero_data = [[
        Paragraph(f"<font size='28' color='#F8FAFC'><b>{ptype}</b></font>", S['body']),
        Paragraph(f"<font size='11' color='#CBD5E1'>{pname}</font><br/>"
                  f"<font size='7' color='#94A3B8'>MBTI Personality Type</font>", S['body']),
    ]]
    hero_table = Table(hero_data, colWidths=[45*mm, inner_w - 45*mm])
    hero_table.setStyle(TableStyle([
        ('BACKGROUND',  (0,0), (-1,-1), BG_CARD),
        ('ROUNDEDCORNERS', [6]),
        ('VALIGN',      (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING',  (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('TOPPADDING',   (0,0), (-1,-1), 12),
        ('BOTTOMPADDING',(0,0), (-1,-1), 12),
        ('LINEAFTER',    (0,0), (0,-1), 2, PURPLE),
    ]))
    story.append(hero_table)
    story.append(Spacer(1, 8))

    # Description
    if description:
        story.append(Paragraph(description, S['body']))
        story.append(Spacer(1, 6))

    # ── STRENGTHS ────────────────────────────────────────────
    story += section_heading("TOP STRENGTHS", S)
    if strengths:
        tags_text = "  •  ".join(str(s) for s in strengths)
        story.append(Paragraph(f"<font color='#10B981'>{tags_text}</font>", S['body']))
        story.append(Spacer(1, 4))
    if weaknesses:
        story.append(Paragraph(
            f"<font color='#94A3B8'><b>Areas to Improve:</b></font> "
            f"<font color='#F87171'>{', '.join(str(w) for w in weaknesses)}</font>",
            S['body']))
    story.append(Spacer(1, 4))

    # ── CAREER MATCHES ───────────────────────────────────────
    story += section_heading("TOP CAREER MATCHES", S)
    for i, career in enumerate(careers[:5], 1):
        if isinstance(career, dict):
            title   = career.get('title', str(career))
            salary  = career.get('salary_range', career.get('salary', ''))
            reason  = career.get('reason', career.get('description', ''))
        else:
            title, salary, reason = str(career), '', ''

        row_data = [[
            Paragraph(f"<font color='#A855F7'><b>{i}.</b></font>", S['body']),
            Paragraph(f"<b>{title}</b>", S['career_title']),
            Paragraph(f"<font color='#10B981'><b>{salary}</b></font>", S['body']),
        ]]
        t = Table(row_data, colWidths=[8*mm, inner_w - 8*mm - 30*mm, 30*mm])
        t.setStyle(TableStyle([
            ('BACKGROUND',   (0,0), (-1,-1), BG_CARD),
            ('TOPPADDING',   (0,0), (-1,-1), 7),
            ('BOTTOMPADDING',(0,0), (-1,-1), 4),
            ('LEFTPADDING',  (0,0), (-1,-1), 8),
            ('VALIGN',       (0,0), (-1,-1), 'TOP'),
            ('LINEBELOW',    (0,0), (-1,-1), 0.5, BORDER),
        ]))
        story.append(t)
        if reason:
            reason_row = [[
                Paragraph('', S['body']),
                Paragraph(reason, S['career_sub']),
                Paragraph('', S['body']),
            ]]
            rt = Table(reason_row, colWidths=[8*mm, inner_w - 8*mm - 30*mm, 30*mm])
            rt.setStyle(TableStyle([
                ('BACKGROUND',   (0,0), (-1,-1), BG_CARD),
                ('TOPPADDING',   (0,0), (-1,-1), 2),
                ('BOTTOMPADDING',(0,0), (-1,-1), 7),
                ('LEFTPADDING',  (0,0), (-1,-1), 8),
                ('LINEBELOW',    (0,0), (-1,-1), 0.5, BORDER),
            ]))
            story.append(rt)
    story.append(Spacer(1, 4))

    # ── RECOMMENDED COURSES ──────────────────────────────────
    if courses:
        story += section_heading("RECOMMENDED COURSES", S)
        course_rows = [[
            Paragraph('<b>#</b>', S['label']),
            Paragraph('<b>Course Name</b>', S['label']),
            Paragraph('<b>Platform</b>', S['label']),
            Paragraph('<b>Duration</b>', S['label']),
            Paragraph('<b>Cost</b>', S['label']),
        ]]
        for i, c in enumerate(courses[:5], 1):
            if isinstance(c, dict):
                name     = c.get('name', str(c))
                platform = c.get('platform', '')
                duration = c.get('duration', '')
                cost     = c.get('cost', c.get('price', 'Free'))
            else:
                name, platform, duration, cost = str(c), '', '', 'Free'
            course_rows.append([
                Paragraph(str(i), S['value']),
                Paragraph(name,   S['value']),
                Paragraph(platform, S['value']),
                Paragraph(duration, S['value']),
                Paragraph(cost,   S['value']),
            ])
        ct = Table(course_rows, colWidths=[8*mm, inner_w-8*mm-56*mm, 26*mm, 16*mm, 14*mm],
                   repeatRows=1)
        ct.setStyle(TableStyle([
            ('BACKGROUND',   (0,0), (-1,0), PURPLE_MID),
            ('BACKGROUND',   (0,1), (-1,-1), BG_CARD),
            ('ROWBACKGROUNDS',(0,1),(-1,-1), [BG_CARD, BG_DARK]),
            ('TEXTCOLOR',    (0,0), (-1,0), TEXT_WHITE),
            ('GRID',         (0,0), (-1,-1), 0.3, BORDER),
            ('TOPPADDING',   (0,0), (-1,-1), 5),
            ('BOTTOMPADDING',(0,0), (-1,-1), 5),
            ('LEFTPADDING',  (0,0), (-1,-1), 6),
        ]))
        story.append(ct)
        story.append(Spacer(1, 4))

    # ── SKILL GAP ANALYSIS ───────────────────────────────────
    story += section_heading("SKILL GAP ANALYSIS", S)
    have_items = [Paragraph(f"• {s}", S['bullet']) for s in skills_have[:6]]
    need_items = [Paragraph(f"• {s}", S['bullet']) for s in skills_need[:6]]
    max_rows = max(len(have_items), len(need_items))
    while len(have_items) < max_rows: have_items.append(Paragraph('', S['bullet']))
    while len(need_items) < max_rows: need_items.append(Paragraph('', S['bullet']))

    skill_header = [[
        Paragraph("<font color='#10B981'><b>✓  SKILLS YOU HAVE</b></font>", S['label']),
        Paragraph("<font color='#F59E0B'><b>→  SKILLS TO LEARN</b></font>", S['label']),
    ]]
    skill_rows = [[h, n] for h, n in zip(have_items, need_items)]
    half = (inner_w - 4*mm) / 2
    skill_table = Table(skill_header + skill_rows, colWidths=[half, half])
    skill_table.setStyle(TableStyle([
        ('BACKGROUND',   (0,0), (-1,0), BG_CARD),
        ('BACKGROUND',   (0,1), (0,-1), colors.HexColor('#0D2818')),
        ('BACKGROUND',   (1,1), (1,-1), colors.HexColor('#1A1500')),
        ('TOPPADDING',   (0,0), (-1,-1), 5),
        ('BOTTOMPADDING',(0,0), (-1,-1), 5),
        ('LEFTPADDING',  (0,0), (-1,-1), 8),
        ('GRID',         (0,0), (-1,-1), 0.3, BORDER),
        ('LINEBETWEEN',  (0,0), (0,-1), 1, PURPLE),
    ]))
    story.append(skill_table)
    story.append(Spacer(1, 4))

    # ── LEARNING ROADMAP ─────────────────────────────────────
    if roadmap:
        story += section_heading("LEARNING ROADMAP", S)
        rm_cols = min(len(roadmap), 3)
        col_w = inner_w / rm_cols
        rm_cells = []
        for phase in roadmap[:3]:
            if isinstance(phase, dict):
                month = phase.get('month', '')
                goal  = phase.get('goal', '')
                tasks = phase.get('tasks', [])
            else:
                month, goal, tasks = str(phase), '', []
            tasks_text = '<br/>'.join(f"• {t}" for t in tasks[:4])
            cell_content = [
                Paragraph(f"<font color='#A855F7'><b>{month}</b></font>", S['label']),
                Spacer(1, 3),
                Paragraph(f"<b>{goal}</b>", S['career_title']),
                Spacer(1, 4),
                Paragraph(tasks_text or '—', S['career_sub']),
            ]
            rm_cells.append(cell_content)
        rm_table = Table([rm_cells], colWidths=[col_w]*rm_cols)
        rm_table.setStyle(TableStyle([
            ('BACKGROUND',   (0,0), (-1,-1), BG_CARD),
            ('VALIGN',       (0,0), (-1,-1), 'TOP'),
            ('TOPPADDING',   (0,0), (-1,-1), 10),
            ('BOTTOMPADDING',(0,0), (-1,-1), 10),
            ('LEFTPADDING',  (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ('LINEBETWEEN',  (0,0), (-1,-1), 0.5, BORDER),
            ('BOX',          (0,0), (-1,-1), 0.5, BORDER),
        ]))
        story.append(rm_table)
        story.append(Spacer(1, 4))

    # ── WORK & LEADERSHIP STYLE ──────────────────────────────
    if work_style:
        story += section_heading("WORK & LEADERSHIP STYLE", S)
        ws_rows = []
        for key, label in [('team_style','Team Style'), ('leadership_style','Leadership Style'),
                            ('ideal_environment','Ideal Environment')]:
            val = work_style.get(key, work_style.get(key.replace('_',' ').title(), ''))
            if val:
                ws_rows.append([
                    Paragraph(f"<b>{label}</b>", S['label']),
                    Paragraph(str(val), S['value']),
                ])
        if ws_rows:
            ws_t = Table(ws_rows, colWidths=[38*mm, inner_w - 38*mm])
            ws_t.setStyle(TableStyle([
                ('BACKGROUND',   (0,0), (0,-1), BG_CARD),
                ('BACKGROUND',   (1,0), (1,-1), BG_DARK),
                ('TOPPADDING',   (0,0), (-1,-1), 7),
                ('BOTTOMPADDING',(0,0), (-1,-1), 7),
                ('LEFTPADDING',  (0,0), (-1,-1), 8),
                ('GRID',         (0,0), (-1,-1), 0.3, BORDER),
            ]))
            story.append(ws_t)
            story.append(Spacer(1, 4))

    # ── FAMOUS PEOPLE ─────────────────────────────────────────
    if famous:
        story += section_heading("FAMOUS PEOPLE WITH YOUR PERSONALITY", S)
        fp_cells = [[Paragraph(str(name), S['famous']) for name in famous[:4]]]
        fp_t = Table(fp_cells, colWidths=[inner_w / len(famous[:4])] * len(famous[:4]))
        fp_t.setStyle(TableStyle([
            ('BACKGROUND',   (0,0), (-1,-1), BG_CARD),
            ('TOPPADDING',   (0,0), (-1,-1), 12),
            ('BOTTOMPADDING',(0,0), (-1,-1), 12),
            ('ALIGN',        (0,0), (-1,-1), 'CENTER'),
            ('GRID',         (0,0), (-1,-1), 0.3, BORDER),
        ]))
        story.append(fp_t)

    story.append(Spacer(1, 10))

    # ── BUILD PDF ─────────────────────────────────────────────
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=MARGIN_LR,
        rightMargin=MARGIN_LR,
        topMargin=MARGIN_TOP,
        bottomMargin=MARGIN_BOTTOM,
    )

    def make_canvas(filename, doc):
        c = CareerMindCanvas(filename, result)
        c.setTitle(f"CareerMind AI — {ptype} {pname}")
        return c

    doc.build(story, canvasmaker=make_canvas)
    print(f"PDF generated: {pdf_path}", file=sys.stderr)


# ─── GENERATE PNG SHARE CARD ──────────────────────────────────
def draw_brain_pil(draw, cx, cy, size=60):
    """Draw brain+circuit logo on PIL canvas."""
    # Gradient circle background (approximate with ellipses)
    for r in range(size, 0, -2):
        t = r / size
        red   = int(124 * t + 219 * (1 - t))
        green = int(58  * t + 39  * (1 - t))
        blue  = int(237 * t + 119 * (1 - t))
        alpha = int(180 * (1 - r / size) + 40)
        draw.ellipse([cx-r, cy-r, cx+r, cy+r],
                     fill=(red, green, blue, min(alpha, 255)))

    # Brain outline (simplified arcs/lines)
    s = size / 30
    # Left hemisphere arc
    draw.arc([int(cx-14*s), int(cy-13*s), int(cx), int(cy+8*s)],
             start=200, end=360, fill=(255,255,255,220), width=max(2, int(2*s)))
    # Right hemisphere arc
    draw.arc([int(cx), int(cy-13*s), int(cx+14*s), int(cy+8*s)],
             start=180, end=340, fill=(255,255,255,220), width=max(2, int(2*s)))
    # Center vertical line
    draw.line([cx, int(cy-10*s), cx, int(cy+8*s)],
              fill=(255,255,255,180), width=max(1, int(1.5*s)))

    # Circuit dots
    dot_r = max(3, int(2.5*s))
    for dx, dy in [(-7,-4), (7,-4), (-7,4), (7,4), (0,-10), (0,8)]:
        draw.ellipse([int(cx+dx*s-dot_r), int(cy+dy*s-dot_r),
                      int(cx+dx*s+dot_r), int(cy+dy*s+dot_r)],
                     fill=(219, 39, 119, 255))

    # Circuit lines
    draw.line([int(cx-7*s), int(cy-4*s), int(cx-12*s), int(cy-4*s)],
              fill=(219,39,119,180), width=max(1, int(s)))
    draw.line([int(cx+7*s), int(cy-4*s), int(cx+12*s), int(cy-4*s)],
              fill=(219,39,119,180), width=max(1, int(s)))
    draw.line([int(cx-7*s), int(cy+4*s), int(cx-12*s), int(cy+4*s)],
              fill=(219,39,119,180), width=max(1, int(s)))
    draw.line([int(cx+7*s), int(cy+4*s), int(cx+12*s), int(cy+4*s)],
              fill=(219,39,119,180), width=max(1, int(s)))


def generate_png(result, png_path):
    CW, CH = 1080, 540
    img = Image.new('RGBA', (CW, CH), (15, 15, 26, 255))
    draw = ImageDraw.Draw(img, 'RGBA')

    # Background gradient (left purple → right dark)
    for x in range(CW):
        t = x / CW
        r = int(76 * (1-t) + 15 * t)
        g = int(29 * (1-t) + 15 * t)
        b = int(149* (1-t) + 26 * t)
        draw.line([(x, 0), (x, CH)], fill=(r, g, b, 255))

    # Dark overlay on right half
    overlay = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    ov_draw = ImageDraw.Draw(overlay, 'RGBA')
    ov_draw.rectangle([CW//2, 0, CW, CH], fill=(15, 15, 26, 180))
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img, 'RGBA')

    # Header bar
    draw.rectangle([0, 0, CW, 80], fill=(76, 29, 149, 220))

    # Header logo + text
    draw_brain_pil(draw, 50, 40, size=30)
    try:
        font_hdr = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
        font_sub = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)
        font_big = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 72)
        font_mid = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
        font_reg = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
        font_sm  = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
    except:
        font_hdr = font_sub = font_big = font_mid = font_reg = font_sm = ImageFont.load_default()

    draw.text((90, 20), "CAREERMIND AI", font=font_hdr, fill=(248, 250, 252, 255))
    draw.text((90, 50), "Personality Assessment Report", font=font_sub, fill=(203, 213, 225, 200))
    draw.text((CW - 160, 30), "careermind.app", font=font_sub, fill=(203, 213, 225, 150))

    ptype = result.get('personality_type', 'ESTJ')
    pname = result.get('personality_name', 'The Executive')
    careers = result.get('careers', [])
    strengths = result.get('strengths', [])

    # Big personality type text
    draw.text((60, 105), ptype, font=font_big, fill=(248, 250, 252, 255))
    draw.text((60, 185), pname, font=font_mid, fill=(168, 85, 247, 255))

    # Divider line
    draw.line([(60, 230), (480, 230)], fill=(93, 33, 182, 180), width=2)

    # Strengths tags
    y = 250
    x = 60
    for strength in strengths[:4]:
        w_text = draw.textlength(str(strength), font=font_sm)
        draw.rounded_rectangle([x-4, y-4, x+w_text+8, y+20], radius=6,
                               fill=(124, 58, 237, 120), outline=(168, 85, 247, 180))
        draw.text((x+2, y), str(strength), font=font_sm, fill=(248, 250, 252, 220))
        x += w_text + 20
        if x > 440:
            x = 60
            y += 34

    # Career matches (right side)
    draw.text((560, 100), "Top Career Matches", font=font_sub, fill=(148, 163, 184, 255))
    draw.line([(560, 120), (1020, 120)], fill=(93, 33, 182, 120), width=1)

    cy = 135
    for i, career in enumerate(careers[:4], 1):
        title  = career.get('title', str(career)) if isinstance(career, dict) else str(career)
        salary = career.get('salary_range', career.get('salary','')) if isinstance(career, dict) else ''

        draw.ellipse([560, cy+2, 578, cy+20], fill=(124, 58, 237, 200))
        draw.text((565, cy+3), str(i), font=font_sm, fill=(255,255,255,255))
        draw.text((588, cy), title[:32], font=font_reg, fill=(248, 250, 252, 255))
        if salary:
            draw.text((588, cy+22), salary, font=font_sm, fill=(16, 185, 129, 220))
        cy += 66

    # Bottom bar
    draw.rectangle([0, CH-50, CW, CH], fill=(15, 15, 26, 220))
    draw_brain_pil(draw, 40, CH-25, size=18)
    draw.text((65, CH-38), "CareerMind AI", font=font_sub, fill=(168, 85, 247, 220))
    draw.text((65, CH-22), "careermind.app", font=font_sm,  fill=(148, 163, 184, 180))

    # Bottom pink accent line
    draw.rectangle([0, CH-3, CW, CH], fill=(219, 39, 119, 255))

    # Save
    final = img.convert('RGB')
    final.save(png_path, 'PNG', quality=95)
    print(f"PNG generated: {png_path}", file=sys.stderr)


# ─── MAIN ─────────────────────────────────────────────────────
if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("Usage: python generateReport.py <json> <pdf_path> <png_path>")
        sys.exit(1)

    raw    = sys.argv[1]
    pdf_out = sys.argv[2]
    png_out = sys.argv[3]

    result = json.loads(raw)
    generate_pdf(result, pdf_out)
    generate_png(result, png_out)
    print("Done", file=sys.stderr)