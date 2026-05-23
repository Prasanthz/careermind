"""
CareerMind AI — Report Generator
Usage:
  python generateReport.py <json_string> <output_pdf> <output_png>
"""

import sys, json, os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame,
    Paragraph, Spacer, Table, TableStyle,
    HRFlowable
)
from reportlab.lib.colors import HexColor
from PIL import Image, ImageDraw, ImageFont

# ── COLOURS ────────────────────────────────────────────────────────────────────
C_BLACK      = HexColor("#1A1A1A")
C_DARK_GRAY  = HexColor("#4A4A4A")
C_MID_GRAY   = HexColor("#787878")
C_WHITE      = colors.white
C_PURPLE     = HexColor("#7c3aed")
C_PINK       = HexColor("#db2777")
C_BORDER     = HexColor("#CCCCCC")

PAGE_W, PAGE_H = A4
MARGIN = 20 * mm

# ── PIL colours ────────────────────────────────────────────────────────────────
def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

IMG_PURPLE    = rgb("7c3aed")
IMG_PINK      = rgb("db2777")
IMG_DARK_BG   = rgb("1A1A2E")
IMG_DARK_CARD = rgb("16213E")
IMG_WHITE     = (255, 255, 255)

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

# ── PIL helpers ────────────────────────────────────────────────────────────────
def rect(draw, x, y, w, h, fill, radius=0):
    if radius:
        draw.rounded_rectangle([x, y, x + w, y + h], radius=radius, fill=fill)
    else:
        draw.rectangle([x, y, x + w, y + h], fill=fill)

def text_w(draw, text, font):
    return int(draw.textlength(text, font=font))

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

# ── Brain logo drawn with PIL on RGB image ─────────────────────────────────────
def draw_brain_logo(draw, cx, cy, s=1.0):
    """Draw brain + circuit logo centred at (cx, cy), scale s."""
    purple = IMG_PURPLE
    pink   = IMG_PINK
    lw = max(2, int(2.5 * s))

    # Left hemisphere
    draw.arc([cx - int(40*s), cy - int(30*s), cx - int(2*s),  cy + int(50*s)],
             start=200, end=355, fill=purple, width=lw)
    draw.arc([cx - int(46*s), cy - int(12*s), cx - int(10*s), cy + int(34*s)],
             start=155, end=225, fill=purple, width=lw)
    # Right hemisphere
    draw.arc([cx + int(2*s),  cy - int(30*s), cx + int(40*s), cy + int(50*s)],
             start=185, end=340, fill=pink,   width=lw)
    draw.arc([cx + int(10*s), cy - int(12*s), cx + int(46*s), cy + int(34*s)],
             start=315, end=25,  fill=pink,   width=lw)
    # Top arc
    draw.arc([cx - int(28*s), cy - int(40*s), cx + int(28*s), cy + int(8*s)],
             start=205, end=335, fill=purple, width=lw)
    # Center divider
    slw = max(1, int(1.5 * s))
    draw.line([(cx, cy - int(34*s)), (cx, cy + int(48*s))], fill=(160, 100, 230), width=slw)

    # Left circuits
    clw = max(1, int(1.5 * s))
    dot = max(3, int(3.5 * s))
    lx1, ly1 = cx - int(42*s), cy
    lx2, ly2 = cx - int(58*s), cy
    lx3, ly3 = cx - int(64*s), cy - int(11*s)
    draw.line([(lx1,ly1),(lx2,ly2),(lx3,ly3)], fill=purple, width=clw)
    draw.ellipse([lx3-dot, ly3-dot, lx3+dot, ly3+dot], fill=purple)

    lx1b, ly1b = cx - int(44*s), cy + int(16*s)
    lx2b, ly2b = cx - int(60*s), cy + int(16*s)
    lx3b, ly3b = cx - int(66*s), cy + int(25*s)
    draw.line([(lx1b,ly1b),(lx2b,ly2b),(lx3b,ly3b)], fill=purple, width=clw)
    draw.ellipse([lx3b-dot, ly3b-dot, lx3b+dot, ly3b+dot], fill=purple)

    # Right circuits
    rx1, ry1 = cx + int(42*s), cy
    rx2, ry2 = cx + int(58*s), cy
    rx3, ry3 = cx + int(64*s), cy - int(11*s)
    draw.line([(rx1,ry1),(rx2,ry2),(rx3,ry3)], fill=pink, width=clw)
    draw.ellipse([rx3-dot, ry3-dot, rx3+dot, ry3+dot], fill=pink)

    rx1b, ry1b = cx + int(44*s), cy + int(16*s)
    rx2b, ry2b = cx + int(60*s), cy + int(16*s)
    rx3b, ry3b = cx + int(66*s), cy + int(25*s)
    draw.line([(rx1b,ry1b),(rx2b,ry2b),(rx3b,ry3b)], fill=pink, width=clw)
    draw.ellipse([rx3b-dot, ry3b-dot, rx3b+dot, ry3b+dot], fill=pink)

    # Top circuits
    draw.line([(cx - int(8*s), cy - int(38*s)),
               (cx - int(8*s), cy - int(50*s)),
               (cx - int(16*s), cy - int(56*s))], fill=purple, width=clw)
    draw.ellipse([cx-int(19*s), cy-int(59*s), cx-int(13*s), cy-int(53*s)], fill=purple)

    draw.line([(cx + int(8*s), cy - int(38*s)),
               (cx + int(8*s), cy - int(50*s)),
               (cx + int(16*s), cy - int(56*s))], fill=pink, width=clw)
    draw.ellipse([cx+int(13*s), cy-int(59*s), cx+int(19*s), cy-int(53*s)], fill=pink)

    # Inner nodes
    nd = max(2, int(2.5 * s))
    for nx, ny, col in [
        (cx - int(18*s), cy - int(10*s), purple),
        (cx - int(2*s),  cy - int(14*s), purple),
        (cx + int(2*s),  cy - int(14*s), pink),
        (cx + int(18*s), cy - int(10*s), pink),
    ]:
        draw.ellipse([nx-nd, ny-nd, nx+nd, ny+nd], fill=col)


# ── PDF logo header drawn with ReportLab canvas ───────────────────────────────
def draw_pdf_logo_header(canvas_obj, x, y, width, height):
    canvas_obj.saveState()

    # Gradient bar (purple → pink)
    steps = 60
    for i in range(steps):
        t = i / steps
        r = (0x7c + (0xdb - 0x7c) * t) / 255
        g = (0x3a + (0x27 - 0x3a) * t) / 255
        b = (0xed + (0x77 - 0xed) * t) / 255
        canvas_obj.setFillColorRGB(r, g, b)
        canvas_obj.rect(x + i * (width / steps), y, width / steps + 0.5, height, fill=1, stroke=0)

    # Brain icon — white strokes on gradient bar
    bx = x + 22
    by = y + height / 2
    canvas_obj.setStrokeColorRGB(1, 1, 1)
    canvas_obj.setFillColorRGB(1, 1, 1)
    canvas_obj.setLineWidth(1.4)

    # Left hemisphere
    p = canvas_obj.beginPath()
    p.moveTo(bx, by - 13)
    p.curveTo(bx - 10, by - 13, bx - 16, by - 6, bx - 15, by)
    p.curveTo(bx - 14, by + 7, bx - 9, by + 12, bx, by + 12)
    canvas_obj.drawPath(p, fill=0, stroke=1)

    # Right hemisphere
    p2 = canvas_obj.beginPath()
    p2.moveTo(bx, by - 13)
    p2.curveTo(bx + 10, by - 13, bx + 16, by - 6, bx + 15, by)
    p2.curveTo(bx + 14, by + 7, bx + 9, by + 12, bx, by + 12)
    canvas_obj.drawPath(p2, fill=0, stroke=1)

    # Center divider
    canvas_obj.setLineWidth(0.8)
    canvas_obj.line(bx, by - 13, bx, by + 12)

    # Circuit lines + dots — left
    canvas_obj.setLineWidth(0.9)
    canvas_obj.line(bx - 15, by,     bx - 22, by)
    canvas_obj.line(bx - 15, by + 6, bx - 22, by + 6)
    canvas_obj.line(bx - 22, by,     bx - 26, by - 4)
    canvas_obj.line(bx - 22, by + 6, bx - 26, by + 10)
    canvas_obj.circle(bx - 26, by - 4,  1.8, fill=1, stroke=0)
    canvas_obj.circle(bx - 26, by + 10, 1.8, fill=1, stroke=0)

    # Circuit lines + dots — right
    canvas_obj.line(bx + 15, by,     bx + 22, by)
    canvas_obj.line(bx + 15, by + 6, bx + 22, by + 6)
    canvas_obj.line(bx + 22, by,     bx + 26, by - 4)
    canvas_obj.line(bx + 22, by + 6, bx + 26, by + 10)
    canvas_obj.circle(bx + 26, by - 4,  1.8, fill=1, stroke=0)
    canvas_obj.circle(bx + 26, by + 10, 1.8, fill=1, stroke=0)

    # Top circuits
    canvas_obj.line(bx - 4, by - 13, bx - 4, by - 19)
    canvas_obj.line(bx - 4, by - 19, bx - 8, by - 23)
    canvas_obj.circle(bx - 8, by - 23, 1.8, fill=1, stroke=0)
    canvas_obj.line(bx + 4, by - 13, bx + 4, by - 19)
    canvas_obj.line(bx + 4, by - 19, bx + 8, by - 23)
    canvas_obj.circle(bx + 8, by - 23, 1.8, fill=1, stroke=0)

    # Text: CareerMind AI
    canvas_obj.setFillColorRGB(1, 1, 1)
    canvas_obj.setFont("Helvetica-Bold", 17)
    canvas_obj.drawString(x + 62, y + height / 2 + 4, "CareerMind")
    canvas_obj.setFont("Helvetica-Bold", 10)
    canvas_obj.drawString(x + 62, y + height / 2 - 10, "AI  \u2022  DISCOVER YOUR PATH")

    canvas_obj.restoreState()


# ── PDF builder ────────────────────────────────────────────────────────────────
def make_pdf(result, pdf_path):
    ptype     = result.get("personality_type", "")
    pname     = result.get("personality_name", "")
    summary   = result.get("summary", "")
    strengths = result.get("strengths", [])
    careers   = result.get("careers", [])
    roadmap   = result.get("roadmap", [])
    courses   = result.get("courses", [])

    PURPLE = HexColor("#7c3aed")
    PINK   = HexColor("#db2777")

    doc = BaseDocTemplate(
        pdf_path, pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=MARGIN + 22*mm, bottomMargin=MARGIN,
    )

    def on_page(canvas_obj, doc_obj):
        canvas_obj.saveState()
        draw_pdf_logo_header(canvas_obj, MARGIN, PAGE_H - MARGIN - 44, PAGE_W - 2*MARGIN, 44)
        canvas_obj.setFont("Helvetica", 8)
        canvas_obj.setFillColor(C_MID_GRAY)
        canvas_obj.drawCentredString(PAGE_W / 2, MARGIN / 2,
            f"CareerMind AI \u2014 {ptype} ({pname}) \u2014 Confidential Career Report")
        canvas_obj.drawRightString(PAGE_W - MARGIN, MARGIN / 2, f"Page {doc_obj.page}")
        canvas_obj.restoreState()

    frame = Frame(MARGIN, MARGIN, PAGE_W - 2*MARGIN, PAGE_H - 2*MARGIN - 50,
                  id='normal', showBoundary=0)
    doc.addPageTemplates([PageTemplate(id='main', frames=[frame], onPage=on_page)])

    S = {
        'h1':   ParagraphStyle('h1',   fontName='Helvetica-Bold', fontSize=22,
                               textColor=PURPLE, spaceAfter=4,  alignment=TA_CENTER),
        'h2':   ParagraphStyle('h2',   fontName='Helvetica-Bold', fontSize=14,
                               textColor=PURPLE, spaceBefore=12, spaceAfter=4),
        'body': ParagraphStyle('body', fontName='Helvetica',      fontSize=10,
                               textColor=C_DARK_GRAY, spaceAfter=6, leading=15),
        'sm':   ParagraphStyle('sm',   fontName='Helvetica',      fontSize=9,
                               textColor=C_MID_GRAY,  spaceAfter=3),
    }

    story = []
    story.append(Spacer(1, 6))
    story.append(Paragraph(ptype, S['h1']))
    story.append(Paragraph(f"<font color='#db2777'>{pname}</font>",
                            ParagraphStyle('sub', fontName='Helvetica-Bold', fontSize=14,
                                           textColor=PINK, alignment=TA_CENTER, spaceAfter=8)))
    story.append(HRFlowable(width="100%", thickness=0.5, color=PURPLE, spaceAfter=10))

    story.append(Paragraph("Personality Overview", S['h2']))
    story.append(Paragraph(summary, S['body']))

    if strengths:
        story.append(Spacer(1, 4))
        story.append(Paragraph("Key Strengths", S['h2']))
        for s in strengths[:6]:
            story.append(Paragraph(f"<b>\u2022</b>  {s}", S['body']))

    if careers:
        story.append(Spacer(1, 4))
        story.append(Paragraph("Recommended Career Paths", S['h2']))
        rows = []
        for i in range(0, len(careers), 2):
            rows.append([careers[i], careers[i+1] if i+1 < len(careers) else ""])
        t = Table(rows, colWidths=[(PAGE_W - 2*MARGIN) / 2]*2)
        t.setStyle(TableStyle([
            ('ROWBACKGROUNDS', (0,0), (-1,-1), [HexColor("#EDE9FE"), HexColor("#FCE7F3")]),
            ('TEXTCOLOR',      (0,0), (-1,-1), PURPLE),
            ('FONTNAME',       (0,0), (-1,-1), 'Helvetica-Bold'),
            ('FONTSIZE',       (0,0), (-1,-1), 10),
            ('PADDING',        (0,0), (-1,-1), 8),
            ('GRID',           (0,0), (-1,-1), 0.3, HexColor("#C4B5FD")),
        ]))
        story.append(t)

    if roadmap:
        story.append(Spacer(1, 8))
        story.append(Paragraph("Your Learning Roadmap", S['h2']))
        for phase in roadmap[:4]:
            story.append(Paragraph(
                f"<font color='#db2777'><b>{phase.get('month','')}</b></font>  \u2014  {phase.get('goal','')}",
                S['body']))
            for task in phase.get('tasks', [])[:3]:
                story.append(Paragraph(f"    \u25e6  {task}", S['sm']))

    if courses:
        story.append(Spacer(1, 8))
        story.append(Paragraph("Recommended Courses", S['h2']))
        for c in courses[:5]:
            story.append(Paragraph(f"<b>\u2022</b>  {c}", S['body']))

    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=0.3, color=C_BORDER))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "Generated by <b>CareerMind AI</b> \u2014 careermind-eight.vercel.app",
        ParagraphStyle('ft', fontName='Helvetica', fontSize=8,
                        textColor=C_MID_GRAY, alignment=TA_CENTER)))

    doc.build(story)


# ── PNG card builder ───────────────────────────────────────────────────────────
def make_png(result, png_path):
    ptype     = result.get("personality_type", "INTJ")
    pname     = result.get("personality_name", "The Architect")
    careers   = result.get("careers", [])
    strengths = result.get("strengths", [])

    img  = Image.new("RGB", (CARD_W, CARD_H), IMG_DARK_BG)
    draw = ImageDraw.Draw(img)

    # ── Header gradient bar (purple → pink) ───────────────────────────────────
    for i in range(CARD_W):
        t = i / CARD_W
        r = int(0x7c + (0xdb - 0x7c) * t)
        g = int(0x3a + (0x27 - 0x3a) * t)
        b = int(0xed + (0x77 - 0xed) * t)
        draw.line([(i, 0), (i, 95)], fill=(r, g, b))

    # ── Brain logo in header ──────────────────────────────────────────────────
    # cx=80, cy=48 puts the brain centred in the 95px header bar
    draw_brain_logo(draw, cx=85, cy=48, s=0.72)

    # ── Header text ───────────────────────────────────────────────────────────
    fb  = load_font(30, bold=True)
    fxs = load_font(13, bold=False)
    draw.text((185, 18), "CareerMind AI",    font=fb,  fill=IMG_WHITE)
    draw.text((185, 58), "DISCOVER YOUR PATH", font=fxs, fill=(230, 195, 255))

    # Thin separator under header
    draw.rectangle([0, 95, CARD_W, 97], fill=(70, 25, 120))

    # ── Personality type block ────────────────────────────────────────────────
    rect(draw, 40, 118, CARD_W - 80, 108, IMG_DARK_CARD, radius=16)

    f_type = load_font(54, bold=True)
    f_name = load_font(27, bold=False)
    fs     = load_font(15, bold=False)

    tw = text_w(draw, ptype, f_type)
    draw.text(((CARD_W - tw) // 2, 123), ptype, font=f_type, fill=(205, 165, 255))

    nw = text_w(draw, pname, f_name)
    draw.text(((CARD_W - nw) // 2, 185), pname, font=f_name, fill=(219, 39, 119))

    # ── Career matches ────────────────────────────────────────────────────────
    rect(draw, 40, 248, 560, 210, IMG_DARK_CARD, radius=12)
    draw.text((60, 262), "Career Matches", font=load_font(19, True), fill=(167, 139, 250))
    draw.line([(60, 292), (580, 292)], fill=(80, 40, 140), width=1)
    for idx, career in enumerate(careers[:4]):
        yp = 304 + idx * 38
        draw.ellipse([60, yp+6, 76, yp+22], fill=IMG_PURPLE)
        draw.text((90, yp), career[:40], font=fs, fill=IMG_WHITE)

    # ── Key strengths ─────────────────────────────────────────────────────────
    rect(draw, 625, 248, 535, 210, IMG_DARK_CARD, radius=12)
    draw.text((645, 262), "Key Strengths", font=load_font(19, True), fill=(167, 139, 250))
    draw.line([(645, 292), (1140, 292)], fill=(80, 40, 140), width=1)
    for idx, strength in enumerate(strengths[:4]):
        yp = 304 + idx * 38
        draw.text((645, yp), f"\u2756  {strength[:32]}", font=fs, fill=(225, 205, 255))

    # ── Bottom bar ────────────────────────────────────────────────────────────
    rect(draw, 0, CARD_H - 72, CARD_W, 72, (18, 8, 48))

    # Bottom-left: URL
    url_font = load_font(17, bold=False)
    draw.text((44, CARD_H - 50), "careermind-eight.vercel.app", font=url_font, fill=(155, 115, 215))

    # Bottom-right: small brain logo + text
    draw_brain_logo(draw, cx=CARD_W - 110, cy=CARD_H - 36, s=0.38)
    sm_font = load_font(14, bold=True)
    draw.text((CARD_W - 68, CARD_H - 54), "CareerMind", font=sm_font, fill=IMG_WHITE)
    draw.text((CARD_W - 68, CARD_H - 36), "AI",          font=load_font(12), fill=(210, 170, 255))

    # Bottom gradient stripe
    for i in range(CARD_W):
        t = i / CARD_W
        r = int(0x7c + (0xdb - 0x7c) * t)
        g = int(0x3a + (0x27 - 0x3a) * t)
        b = int(0xed + (0x77 - 0xed) * t)
        draw.line([(i, CARD_H - 4), (i, CARD_H)], fill=(r, g, b))

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