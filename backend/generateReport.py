"""
CareerMind AI — Report Generator
Usage:
  python generateReport.py <json_string> <output_pdf> <output_png>
"""

import sys, json, textwrap, os, math
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
from reportlab.graphics.shapes import Drawing, Path, Circle, Line, String, Group
from reportlab.graphics import renderPDF
from PIL import Image, ImageDraw, ImageFont

# ── COLOURS ───────────────────────────────────────────────────────────────────
C_BLACK      = HexColor("#1A1A1A")
C_DARK_GRAY  = HexColor("#4A4A4A")
C_MID_GRAY   = HexColor("#787878")
C_LIGHT_GRAY = HexColor("#F2F2F2")
C_WHITE      = colors.white
C_PURPLE     = HexColor("#7c3aed")
C_PINK       = HexColor("#db2777")
C_PURPLE_MID = HexColor("#9333ea")
C_ACCENT     = HexColor("#1A3A5C")
C_ACCENT2    = HexColor("#2E6DA4")
C_BORDER     = HexColor("#CCCCCC")
C_GREEN      = HexColor("#2D6A4F")
C_ORANGE     = HexColor("#C25B00")
C_DARK_BG    = HexColor("#1A1A2E")
C_DARK_CARD  = HexColor("#16213E")

PAGE_W, PAGE_H = A4
MARGIN = 20 * mm


# ── PIL colour helpers ────────────────────────────────────────────────────────
def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

IMG_PURPLE    = rgb("7c3aed")
IMG_PINK      = rgb("db2777")
IMG_PURPLE2   = rgb("9333ea")
IMG_DARK_BG   = rgb("1A1A2E")
IMG_DARK_CARD = rgb("16213E")
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


def gradient_rect(img, x, y, w, h, color1, color2, radius=0):
    """Draw a horizontal gradient rectangle on a PIL image."""
    overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for i in range(w):
        t = i / max(w - 1, 1)
        r = int(color1[0] + (color2[0] - color1[0]) * t)
        g = int(color1[1] + (color2[1] - color1[1]) * t)
        b = int(color1[2] + (color2[2] - color1[2]) * t)
        if radius and (i < radius or i > w - radius):
            draw.line([(x + i, y), (x + i, y + h)], fill=(r, g, b, 255))
        else:
            draw.line([(x + i, y), (x + i, y + h)], fill=(r, g, b, 255))
    if radius:
        mask = Image.new('L', (w, h), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.rounded_rectangle([0, 0, w, h], radius=radius, fill=255)
        cropped = overlay.crop((x, y, x + w, y + h))
        cropped.putalpha(mask)
        img.paste(cropped, (x, y), cropped)
    else:
        img.paste(overlay.crop((x, y, x + w, y + h)), (x, y))


def draw_logo_pil(draw, img, x, y, scale=1.0):
    """Draw CareerMind AI brain+circuit logo using PIL."""
    s = scale
    cx, cy = x + int(52 * s), y + int(52 * s)
    r = int(48 * s)

    # Glow circle
    for i in range(3):
        draw.ellipse(
            [cx - r - i*2, cy - r - i*2, cx + r + i*2, cy + r + i*2],
            outline=(124, 58, 237, 40), width=1
        )

    # Brain curves (simplified using arcs/lines)
    lw = max(2, int(2.2 * s))
    purple = (124, 58, 237)
    pink = (219, 39, 119)

    # Left hemisphere outline
    draw.arc([cx - int(42*s), cy - int(28*s), cx - int(2*s), cy + int(52*s)],
             start=200, end=360, fill=purple, width=lw)
    draw.arc([cx - int(48*s), cy - int(10*s), cx - int(8*s), cy + int(36*s)],
             start=160, end=220, fill=purple, width=lw)

    # Right hemisphere outline
    draw.arc([cx + int(2*s), cy - int(28*s), cx + int(42*s), cy + int(52*s)],
             start=180, end=340, fill=pink, width=lw)
    draw.arc([cx + int(8*s), cy - int(10*s), cx + int(48*s), cy + int(36*s)],
             start=320, end=20, fill=pink, width=lw)

    # Top arc connecting hemispheres
    draw.arc([cx - int(30*s), cy - int(38*s), cx + int(30*s), cy + int(10*s)],
             start=200, end=340, fill=purple, width=lw)

    # Center split line
    for i in range(int(70 * s)):
        t = i / (70 * s)
        r2 = int(124 + (219 - 124) * t)
        g2 = int(58 + (39 - 58) * t)
        b2 = int(237 + (119 - 237) * t)
        py = cy - int(32 * s) + i
        draw.line([(cx, py), (cx, py + 1)], fill=(r2, g2, b2, 180), width=1)

    # Circuit nodes and lines - left
    nodes_l = [
        (cx - int(44*s), cy - int(2*s), cx - int(60*s), cy - int(2*s), cx - int(66*s), cy - int(12*s)),
        (cx - int(46*s), cy + int(14*s), cx - int(62*s), cy + int(14*s), cx - int(68*s), cy + int(22*s)),
    ]
    for nx1, ny1, nx2, ny2, nx3, ny3 in nodes_l:
        draw.line([(nx1, ny1), (nx2, ny2), (nx3, ny3)], fill=purple, width=max(1, int(1.3*s)))
        draw.ellipse([nx3-int(3*s), ny3-int(3*s), nx3+int(3*s), ny3+int(3*s)], fill=purple)

    # Circuit nodes and lines - right
    nodes_r = [
        (cx + int(44*s), cy - int(2*s), cx + int(60*s), cy - int(2*s), cx + int(66*s), cy - int(12*s)),
        (cx + int(46*s), cy + int(14*s), cx + int(62*s), cy + int(14*s), cx + int(68*s), cy + int(22*s)),
    ]
    for nx1, ny1, nx2, ny2, nx3, ny3 in nodes_r:
        draw.line([(nx1, ny1), (nx2, ny2), (nx3, ny3)], fill=pink, width=max(1, int(1.3*s)))
        draw.ellipse([nx3-int(3*s), ny3-int(3*s), nx3+int(3*s), ny3+int(3*s)], fill=pink)

    # Top circuits
    draw.line([(cx - int(8*s), cy - int(36*s)), (cx - int(8*s), cy - int(48*s)),
               (cx - int(16*s), cy - int(54*s))], fill=purple, width=max(1, int(1.3*s)))
    draw.ellipse([cx-int(19*s), cy-int(57*s), cx-int(13*s), cy-int(51*s)], fill=purple)

    draw.line([(cx + int(8*s), cy - int(36*s)), (cx + int(8*s), cy - int(48*s)),
               (cx + int(16*s), cy - int(54*s))], fill=pink, width=max(1, int(1.3*s)))
    draw.ellipse([cx+int(13*s), cy-int(57*s), cx+int(19*s), cy-int(51*s)], fill=pink)

    # Inner nodes
    for nx, ny, col in [
        (cx - int(18*s), cy - int(8*s), purple),
        (cx - int(2*s), cy - int(12*s), purple),
        (cx + int(2*s), cy - int(12*s), pink),
        (cx + int(18*s), cy - int(8*s), pink),
    ]:
        draw.ellipse([nx-int(2*s), ny-int(2*s), nx+int(2*s), ny+int(2*s)], fill=col)


# ── ReportLab logo drawing for PDF ───────────────────────────────────────────
def draw_pdf_logo_header(canvas_obj, x, y, width=180, height=50):
    """Draw the CareerMind AI logo header on a PDF canvas."""
    canvas_obj.saveState()

    # Gradient background bar
    from reportlab.lib.colors import HexColor
    steps = 40
    for i in range(steps):
        t = i / steps
        r = int(0x7c + (0xdb - 0x7c) * t) / 255
        g = int(0x3a + (0x27 - 0x3a) * t) / 255
        b = int(0xed + (0x77 - 0xed) * t) / 255
        canvas_obj.setFillColorRGB(r, g, b)
        canvas_obj.rect(x + i * (width / steps), y, width / steps + 1, height, fill=1, stroke=0)

    # Brain icon (simplified circles + lines)
    bx = x + 18
    by = y + height / 2

    canvas_obj.setStrokeColorRGB(1, 1, 1)
    canvas_obj.setFillColorRGB(1, 1, 1)
    canvas_obj.setLineWidth(1.2)

    # Brain halves (arcs approximated as bezier)
    p = canvas_obj.beginPath()
    # Left half
    p.moveTo(bx, by + 10)
    p.curveTo(bx - 12, by + 10, bx - 15, by + 3, bx - 14, by - 3)
    p.curveTo(bx - 13, by - 9, bx - 8, by - 12, bx, by - 12)
    canvas_obj.drawPath(p, fill=0, stroke=1)

    p2 = canvas_obj.beginPath()
    # Right half
    p2.moveTo(bx, by + 10)
    p2.curveTo(bx + 12, by + 10, bx + 15, by + 3, bx + 14, by - 3)
    p2.curveTo(bx + 13, by - 9, bx + 8, by - 12, bx, by - 12)
    canvas_obj.drawPath(p2, fill=0, stroke=1)

    # Center line
    canvas_obj.setLineWidth(0.8)
    canvas_obj.line(bx, by - 12, bx, by + 10)

    # Circuit dots
    canvas_obj.setFillColorRGB(1, 1, 1)
    for dx, dy in [(-18, 0), (-19, 6), (18, 0), (19, 6)]:
        canvas_obj.circle(bx + dx, by + dy, 1.5, fill=1, stroke=0)

    # Lines to dots
    canvas_obj.setLineWidth(0.8)
    canvas_obj.line(bx - 14, by, bx - 18, by)
    canvas_obj.line(bx - 14, by + 6, bx - 19, by + 6)
    canvas_obj.line(bx + 14, by, bx + 18, by)
    canvas_obj.line(bx + 14, by + 6, bx + 19, by + 6)

    # CareerMind AI text
    canvas_obj.setFillColorRGB(1, 1, 1)
    canvas_obj.setFont("Helvetica-Bold", 16)
    canvas_obj.drawString(x + 44, y + height / 2 + 3, "CareerMind")
    canvas_obj.setFont("Helvetica-Bold", 11)
    canvas_obj.drawString(x + 44, y + height / 2 - 11, "AI  •  DISCOVER YOUR PATH")

    canvas_obj.restoreState()


# ── PDF page template ─────────────────────────────────────────────────────────
def make_pdf(result, pdf_path):
    ptype = result.get("personality_type", "")
    pname = result.get("personality_name", "")
    summary = result.get("summary", "")
    strengths = result.get("strengths", [])
    careers = result.get("careers", [])
    roadmap = result.get("roadmap", [])
    courses = result.get("courses", [])

    PURPLE = HexColor("#7c3aed")
    PINK   = HexColor("#db2777")
    DARK   = HexColor("#1A1A2E")
    CARD   = HexColor("#16213E")

    doc = BaseDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=MARGIN + 20*mm, bottomMargin=MARGIN,
    )

    def header_footer(canvas_obj, doc_obj):
        canvas_obj.saveState()
        # Logo header bar
        draw_pdf_logo_header(canvas_obj, MARGIN, PAGE_H - MARGIN - 40, PAGE_W - 2*MARGIN, 40)
        # Footer
        canvas_obj.setFont("Helvetica", 8)
        canvas_obj.setFillColor(C_MID_GRAY)
        canvas_obj.drawCentredString(PAGE_W / 2, MARGIN / 2,
            f"CareerMind AI — {ptype} ({pname}) — Confidential Career Report")
        canvas_obj.setFillColor(C_MID_GRAY)
        canvas_obj.drawRightString(PAGE_W - MARGIN, MARGIN / 2,
            f"Page {doc_obj.page}")
        canvas_obj.restoreState()

    frame = Frame(MARGIN, MARGIN, PAGE_W - 2*MARGIN, PAGE_H - 2*MARGIN - 45,
                  id='normal', showBoundary=0)
    template = PageTemplate(id='main', frames=[frame], onPage=header_footer)
    doc.addPageTemplates([template])

    styles = {
        'h1': ParagraphStyle('h1', fontName='Helvetica-Bold', fontSize=22,
                              textColor=PURPLE, spaceAfter=4, alignment=TA_CENTER),
        'h2': ParagraphStyle('h2', fontName='Helvetica-Bold', fontSize=14,
                              textColor=PURPLE, spaceBefore=12, spaceAfter=4),
        'body': ParagraphStyle('body', fontName='Helvetica', fontSize=10,
                                textColor=C_DARK_GRAY, spaceAfter=6, leading=15),
        'small': ParagraphStyle('small', fontName='Helvetica', fontSize=9,
                                 textColor=C_MID_GRAY, spaceAfter=3),
        'tag': ParagraphStyle('tag', fontName='Helvetica-Bold', fontSize=10,
                               textColor=PINK, spaceAfter=6),
        'center': ParagraphStyle('center', fontName='Helvetica', fontSize=10,
                                  textColor=C_DARK_GRAY, alignment=TA_CENTER),
    }

    story = []

    # Title block
    story.append(Spacer(1, 6))
    story.append(Paragraph(f"{ptype}", styles['h1']))
    story.append(Paragraph(f"<font color='#db2777'>{pname}</font>", ParagraphStyle(
        'sub', fontName='Helvetica-Bold', fontSize=14, textColor=PINK,
        alignment=TA_CENTER, spaceAfter=8)))
    story.append(HRFlowable(width="100%", thickness=0.5, color=PURPLE, spaceAfter=10))

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
            ('BACKGROUND', (0, 0), (-1, -1), HexColor("#EDE9FE")),
            ('TEXTCOLOR', (0, 0), (-1, -1), PURPLE),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ROWBACKGROUNDS', (0, 0), (-1, -1), [HexColor("#EDE9FE"), HexColor("#FCE7F3")]),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.3, HexColor("#C4B5FD")),
            ('ROUNDEDCORNERS', [4], ),
        ]))
        story.append(t)

    # Roadmap
    if roadmap:
        story.append(Spacer(1, 8))
        story.append(Paragraph("Your Learning Roadmap", styles['h2']))
        for phase in roadmap[:4]:
            story.append(Paragraph(
                f"<font color='#db2777'><b>{phase.get('month','')}</b></font>  —  {phase.get('goal','')}",
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


# ── PNG card ──────────────────────────────────────────────────────────────────
def make_png(result, png_path):
    ptype  = result.get("personality_type", "INTJ")
    pname  = result.get("personality_name", "The Architect")
    careers = result.get("careers", [])
    strengths = result.get("strengths", [])

    img = Image.new("RGB", (CARD_W, CARD_H), IMG_DARK_BG)
    draw = ImageDraw.Draw(img)

    # Header gradient bar
    for i in range(CARD_W):
        t = i / CARD_W
        r = int(0x7c + (0xdb - 0x7c) * t)
        g = int(0x3a + (0x27 - 0x3a) * t)
        b = int(0xed + (0x77 - 0xed) * t)
        draw.line([(i, 0), (i, 90)], fill=(r, g, b))

    # Brain logo in header
    draw_logo_pil(draw, img, 30, 5, scale=0.75)

    # Header text
    fb = load_font(28, bold=True)
    fm = load_font(18, bold=False)
    fs = load_font(14, bold=False)
    fxs = load_font(12, bold=False)

    draw.text((165, 20), "CareerMind AI", font=fb, fill=IMG_WHITE)
    draw.text((165, 54), "DISCOVER YOUR PATH", font=fxs, fill=(220, 180, 255))

    # Separator
    draw.rectangle([0, 90, CARD_W, 92], fill=(60, 20, 100))

    # Personality type block
    rect(draw, 40, 115, CARD_W - 80, 100, IMG_DARK_CARD, radius=16)

    f_type = load_font(52, bold=True)
    f_name = load_font(26, bold=False)

    tw = text_w(draw, ptype, f_type)
    draw.text(((CARD_W - tw) // 2, 120), ptype, font=f_type, fill=(200, 160, 255))

    nw = text_w(draw, pname, f_name)
    draw.text(((CARD_W - nw) // 2, 180), pname, font=f_name, fill=(219, 39, 119))

    # Careers section
    rect(draw, 40, 235, 560, 200, IMG_DARK_CARD, radius=12)
    draw.text((60, 250), "Career Matches", font=load_font(18, True), fill=(167, 139, 250))
    draw.line([(60, 278), (580, 278)], fill=(80, 40, 140), width=1)

    for idx, career in enumerate(careers[:4]):
        cy_pos = 290 + idx * 36
        draw.ellipse([60, cy_pos + 5, 74, cy_pos + 19], fill=IMG_PURPLE)
        draw.text((85, cy_pos), career[:38], font=fs, fill=IMG_WHITE)

    # Strengths section
    rect(draw, 620, 235, 540, 200, IMG_DARK_CARD, radius=12)
    draw.text((640, 250), "Key Strengths", font=load_font(18, True), fill=(167, 139, 250))
    draw.line([(640, 278), (1140, 278)], fill=(80, 40, 140), width=1)

    for idx, strength in enumerate(strengths[:4]):
        sy_pos = 290 + idx * 36
        draw.text((640, sy_pos), f"✦  {strength[:30]}", font=fs, fill=(220, 200, 255))

    # Bottom bar
    rect(draw, 0, CARD_H - 70, CARD_W, 70, (20, 10, 50))
    url_font = load_font(16, bold=False)
    draw.text((40, CARD_H - 48), "careermind-eight.vercel.app", font=url_font, fill=(140, 100, 200))

    # Bottom logo (small)
    draw_logo_pil(draw, img, CARD_W - 200, CARD_H - 70, scale=0.45)

    # Gradient overlay at bottom of card
    for i in range(CARD_W):
        t = i / CARD_W
        r = int(0x7c + (0xdb - 0x7c) * t)
        g = int(0x3a + (0x27 - 0x3a) * t)
        b = int(0xed + (0x77 - 0xed) * t)
        draw.line([(i, CARD_H - 4), (i, CARD_H)], fill=(r, g, b))

    img.save(png_path, "PNG", quality=95)


# ── entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python generateReport.py <json> <pdf_path> <png_path>")
        sys.exit(1)

    result = json.loads(sys.argv[1])
    pdf_path = sys.argv[2]
    png_path = sys.argv[3]

    make_pdf(result, pdf_path)
    make_png(result, png_path)
    print("Done")