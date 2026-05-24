"""
CareerMind AI — Report Generator
Usage:
  python generateReport.py <json_string> <output_pdf> <output_png>
"""

import sys, json, textwrap, os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame,
    Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.colors import HexColor
from PIL import Image, ImageDraw, ImageFont

# ── COLOURS ───────────────────────────────────────────────────────────────────
C_BLACK      = HexColor("#1A1A1A")
C_DARK_GRAY  = HexColor("#4A4A4A")
C_MID_GRAY   = HexColor("#787878")
C_LIGHT_GRAY = HexColor("#F2F2F2")
C_WHITE      = colors.white
C_ACCENT     = HexColor("#1A3A5C")
C_ACCENT2    = HexColor("#2E6DA4")
C_BORDER     = HexColor("#CCCCCC")
C_GREEN      = HexColor("#2D6A4F")
C_ORANGE     = HexColor("#C25B00")

PAGE_W, PAGE_H = A4
MARGIN = 20 * mm


# ── colour helpers ─────────────────────────────────────────────────────────────
def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


# Palette
IMG_NAVY      = rgb("1A3A5C")
IMG_BLUE      = rgb("2E6DA4")
IMG_LIGHT_BLU = rgb("EAF0F8")
IMG_BG        = rgb("FFFFFF")
IMG_GRAY      = rgb("F2F2F2")
IMG_DKGRAY    = rgb("4A4A4A")
IMG_MDGRAY    = rgb("787878")
IMG_BLACK     = rgb("1A1A1A")
IMG_GREEN     = rgb("2D6A4F")
IMG_ORANGE    = rgb("C25B00")
IMG_BORDER    = rgb("CCCCCC")
IMG_PILL_BG   = rgb("1A3A5C")
IMG_ACCENT_G  = rgb("D4EDDA")
IMG_ACCENT_Y  = rgb("FFF3CD")
IMG_WHITE     = (255, 255, 255)
IMG_HEADER_TX = (168, 196, 224)

CARD_W, CARD_H = 1200, 780


# ── font loader ────────────────────────────────────────────────────────────────
def load_font(size, bold=False):
    candidates = (
        ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
         "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
         "/System/Library/Fonts/Helvetica.ttc",
         "C:/Windows/Fonts/arialbd.ttf"]
        if bold else
        ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
         "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
         "/System/Library/Fonts/Helvetica.ttc",
         "C:/Windows/Fonts/arial.ttf"]
    )
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                pass
    return ImageFont.load_default()


# ── drawing helpers ────────────────────────────────────────────────────────────
def rect(draw, x, y, w, h, fill, radius=0):
    if radius:
        draw.rounded_rectangle([x, y, x + w, y + h], radius=radius, fill=fill)
    else:
        draw.rectangle([x, y, x + w, y + h], fill=fill)


def text_w(draw, text, font):
    return int(draw.textlength(text, font=font))


def section_header(draw, x, y, w, label, font, bg=None):
    """Draws a full-width section label bar; returns new y."""
    bg = bg or IMG_BLUE
    rect(draw, x, y, w, 34, bg)
    draw.text((x + 14, y + 7), label, font=font, fill=IMG_WHITE)
    return y + 34


def wrap(draw, text, font, max_w):
    words = text.split()
    lines, line = [], []
    for word in words:
        probe = " ".join(line + [word])
        if draw.textlength(probe, font=font) <= max_w:
            line.append(word)
        else:
            if line:
                lines.append(" ".join(line))
            line = [word]
    if line:
        lines.append(" ".join(line))
    return lines


# ── PDF ────────────────────────────────────────────────────────────────────────
def make_pdf(result, pdf_path):
    ptype    = result.get("personality_type", "")
    pname    = result.get("personality_name", "")
    summary  = result.get("summary", "")
    strengths = result.get("strengths", [])
    careers  = result.get("careers", [])
    roadmap  = result.get("roadmap", [])
    courses  = result.get("courses", [])

    doc = BaseDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=MARGIN, bottomMargin=MARGIN,
    )

    def header_footer(canvas_obj, doc_obj):
        canvas_obj.saveState()
        # Header bar
        canvas_obj.setFillColor(C_ACCENT)
        canvas_obj.rect(0, PAGE_H - 28*mm, PAGE_W, 28*mm, fill=1, stroke=0)
        canvas_obj.setFillColor(C_WHITE)
        canvas_obj.setFont("Helvetica-Bold", 16)
        canvas_obj.drawString(MARGIN, PAGE_H - 16*mm, "CareerMind AI")
        canvas_obj.setFont("Helvetica", 10)
        canvas_obj.drawRightString(PAGE_W - MARGIN, PAGE_H - 16*mm,
                                   f"{ptype} — {pname}")
        canvas_obj.setFillColor(C_ACCENT2)
        canvas_obj.rect(0, PAGE_H - 30*mm, PAGE_W, 2*mm, fill=1, stroke=0)
        # Footer
        canvas_obj.setFont("Helvetica", 8)
        canvas_obj.setFillColor(C_MID_GRAY)
        canvas_obj.drawCentredString(PAGE_W / 2, 10*mm,
            "CareerMind AI — Confidential Career Report")
        canvas_obj.drawRightString(PAGE_W - MARGIN, 10*mm,
            f"Page {doc_obj.page}")
        canvas_obj.restoreState()

    frame = Frame(MARGIN, 14*mm, PAGE_W - 2*MARGIN, PAGE_H - 2*MARGIN - 20*mm,
                  id='normal', showBoundary=0)
    template = PageTemplate(id='main', frames=[frame], onPage=header_footer)
    doc.addPageTemplates([template])

    styles = {
        'h1': ParagraphStyle('h1', fontName='Helvetica-Bold', fontSize=22,
                              textColor=C_ACCENT, spaceAfter=4, alignment=TA_CENTER),
        'h2': ParagraphStyle('h2', fontName='Helvetica-Bold', fontSize=14,
                              textColor=C_ACCENT, spaceBefore=12, spaceAfter=4),
        'body': ParagraphStyle('body', fontName='Helvetica', fontSize=10,
                                textColor=C_DARK_GRAY, spaceAfter=6, leading=15),
        'small': ParagraphStyle('small', fontName='Helvetica', fontSize=9,
                                 textColor=C_MID_GRAY, spaceAfter=3),
        'tag': ParagraphStyle('tag', fontName='Helvetica-Bold', fontSize=10,
                               textColor=C_ACCENT2, spaceAfter=6),
        'center': ParagraphStyle('center', fontName='Helvetica', fontSize=10,
                                  textColor=C_DARK_GRAY, alignment=TA_CENTER),
    }

    story = []

    # Title
    story.append(Spacer(1, 6))
    story.append(Paragraph(f"{ptype}", styles['h1']))
    story.append(Paragraph(f"{pname}", ParagraphStyle(
        'sub', fontName='Helvetica-Bold', fontSize=14, textColor=C_ACCENT2,
        alignment=TA_CENTER, spaceAfter=8)))
    story.append(HRFlowable(width="100%", thickness=0.5, color=C_ACCENT2, spaceAfter=10))

    # Summary
    story.append(Paragraph("Personality Overview", styles['h2']))
    story.append(Paragraph(summary, styles['body']))

    # Strengths
    if strengths:
        story.append(Spacer(1, 4))
        story.append(Paragraph("Key Strengths", styles['h2']))
        for s in strengths[:6]:
            story.append(Paragraph(f"<b>•</b>  {s}", styles['body']))

    # Careers
    if careers:
        story.append(Spacer(1, 4))
        story.append(Paragraph("Recommended Career Paths", styles['h2']))
        career_rows = []
        for i in range(0, len(careers), 2):
            row = [careers[i]]
            if i + 1 < len(careers):
                row.append(careers[i + 1])
            else:
                row.append("")
            career_rows.append(row)
        t = Table(career_rows, colWidths=[(PAGE_W - 2*MARGIN) / 2]*2)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), C_LIGHT_GRAY),
            ('TEXTCOLOR', (0, 0), (-1, -1), C_ACCENT),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ROWBACKGROUNDS', (0, 0), (-1, -1), [C_LIGHT_GRAY, HexColor("#E8EEF5")]),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.3, C_BORDER),
        ]))
        story.append(t)

    # Roadmap
    if roadmap:
        story.append(Spacer(1, 8))
        story.append(Paragraph("Your Learning Roadmap", styles['h2']))
        for phase in roadmap[:4]:
            story.append(Paragraph(
                f"<font color='#2E6DA4'><b>{phase.get('month','')}</b></font>  —  {phase.get('goal','')}",
                styles['body']))
            for task in phase.get('tasks', [])[:3]:
                story.append(Paragraph(f"    ◦  {task}", styles['small']))

    # Courses
    if courses:
        story.append(Spacer(1, 8))
        story.append(Paragraph("Recommended Courses", styles['h2']))
        for c in courses[:5]:
            story.append(Paragraph(f"<b>•</b>  {c}", styles['body']))

    # Footer note
    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=0.3, color=C_BORDER))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "Generated by <b>CareerMind AI</b> — careermind-eight.vercel.app",
        ParagraphStyle('ft', fontName='Helvetica', fontSize=8,
                        textColor=C_MID_GRAY, alignment=TA_CENTER)))

    doc.build(story)


# ── PNG card ───────────────────────────────────────────────────────────────────
def make_png(result, png_path):
    ptype     = result.get("personality_type", "INTJ")
    pname     = result.get("personality_name", "The Architect")
    summary   = result.get("summary", "")
    strengths = result.get("strengths", [])
    careers   = result.get("careers", [])
    courses   = result.get("courses", [])

    img  = Image.new("RGB", (CARD_W, CARD_H), IMG_NAVY)
    draw = ImageDraw.Draw(img)

    # Header bar
    rect(draw, 0, 0, CARD_W, 90, IMG_NAVY)

    # Logo area
    rect(draw, 30, 18, 54, 54, IMG_BLUE, radius=10)
    f_logo = load_font(28, bold=True)
    draw.text((42, 24), "CM", font=f_logo, fill=IMG_WHITE)

    # Title in header
    f_title = load_font(30, bold=True)
    f_sub   = load_font(15)
    draw.text((100, 16), "CareerMind AI", font=f_title, fill=IMG_WHITE)
    draw.text((102, 54), "AI-Powered Career Intelligence Report", font=f_sub, fill=IMG_HEADER_TX)

    # Accent stripe
    rect(draw, 0, 90, CARD_W, 6, IMG_BLUE)

    # Body background
    rect(draw, 0, 96, CARD_W, CARD_H - 96, IMG_BG)

    # Personality badge
    badge_w = 340
    rect(draw, 30, 116, badge_w, 90, IMG_NAVY, radius=12)
    f_type = load_font(44, bold=True)
    f_name = load_font(20)
    tw = text_w(draw, ptype, f_type)
    draw.text((30 + (badge_w - tw) // 2, 120), ptype, font=f_type, fill=IMG_WHITE)
    nw = text_w(draw, pname, f_name)
    draw.text((30 + (badge_w - nw) // 2, 170), pname, font=f_name, fill=IMG_HEADER_TX)

    # Summary block
    f_body = load_font(15)
    f_bold = load_font(15, bold=True)
    f_sm   = load_font(13)
    f_xs   = load_font(12)

    summary_lines = wrap(draw, summary, f_body, CARD_W - 420)
    sy = 116
    for line in summary_lines[:4]:
        draw.text((390, sy), line, font=f_body, fill=IMG_DKGRAY)
        sy += 22

    # Divider
    draw.line([(30, 222), (CARD_W - 30, 222)], fill=IMG_BORDER, width=1)

    # Careers section
    rect(draw, 30, 238, 540, 34, IMG_BLUE)
    draw.text((44, 244), "Recommended Careers", font=f_bold, fill=IMG_WHITE)

    cy_pos = 282
    for career in careers[:4]:
        rect(draw, 30, cy_pos, 540, 28, IMG_LIGHT_BLU, radius=4)
        draw.text((44, cy_pos + 5), career[:45], font=f_sm, fill=IMG_NAVY)
        cy_pos += 36

    # Strengths section
    rect(draw, 590, 238, 580, 34, IMG_NAVY)
    draw.text((604, 244), "Key Strengths", font=f_bold, fill=IMG_WHITE)

    sy_pos = 282
    for strength in strengths[:5]:
        draw.text((604, sy_pos), f"✦  {strength[:40]}", font=f_sm, fill=IMG_DKGRAY)
        sy_pos += 32

    # Courses
    draw.line([(30, 450), (CARD_W - 30, 450)], fill=IMG_BORDER, width=1)
    rect(draw, 30, 462, 300, 28, IMG_NAVY)
    draw.text((44, 467), "Recommended Courses", font=load_font(13, bold=True), fill=IMG_WHITE)

    course_y = 500
    for course in courses[:3]:
        draw.text((30, course_y), f"•  {course[:60]}", font=f_xs, fill=IMG_DKGRAY)
        course_y += 24

    # Footer
    rect(draw, 0, CARD_H - 52, CARD_W, 52, IMG_NAVY)
    draw.text((30, CARD_H - 36), "careermind-eight.vercel.app", font=f_sm, fill=IMG_HEADER_TX)
    draw.text((CARD_W - 280, CARD_H - 36), "Generated by CareerMind AI", font=f_sm, fill=IMG_HEADER_TX)

    img.save(png_path, "PNG", quality=95)


# ── entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python generateReport.py <json> <pdf_path> <png_path>")
        sys.exit(1)

    result   = json.loads(sys.argv[1])
    pdf_path = sys.argv[2]
    png_path = sys.argv[3]

    make_pdf(result, pdf_path)
    make_png(result, png_path)
    print("Done")