#!/usr/bin/env python3
"""Gera favicon.ico e apple-touch-icon.png a partir da mesma geometria do
public/favicon.svg.

Por que existe: SVG cobre Chrome, Firefox e Edge, mas o Safari ignora o
favicon SVG e cai no .ico, e a tela de inicio do iOS so aceita PNG. Sem estes
dois arquivos, o icone simplesmente nao aparece nesses lugares.

Nao rasteriza o SVG (nao ha conversor instalado na maquina): redesenha a mesma
figura com Pillow, a partir das constantes abaixo. Se mexer no SVG, mexa aqui
tambem e rode de novo:

    python3 scripts/gerar-icones.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
PUBLIC = RAIZ / "public"

# Mesma geometria do public/favicon.svg, num grid de 32 unidades.
GRID = 32
FUNDO = "#0B0F14"          # T.bg
TRACO = "#38BDF8"          # T.accent
RAIO_CANTO = 7
ESPESSURA = 2.6
# Curva de pressao-tempo: PEEP, rampa inspiratoria, plato, queda, PEEP.
PONTOS = [(4, 21), (10, 11), (18, 11), (21, 21), (28, 21)]

# Desenha ampliado e reduz depois: e o que dá borda suave sem antialiasing
# nativo no Pillow.
SUPERAMOSTRAGEM = 8


def desenhar(lado: int) -> Image.Image:
    grande = lado * SUPERAMOSTRAGEM
    escala = grande / GRID

    img = Image.new("RGB", (grande, grande), FUNDO)
    desenho = ImageDraw.Draw(img)
    desenho.rounded_rectangle(
        [0, 0, grande - 1, grande - 1],
        radius=int(RAIO_CANTO * escala),
        fill=FUNDO,
    )

    pontos = [(x * escala, y * escala) for x, y in PONTOS]
    largura = int(ESPESSURA * escala)
    desenho.line(pontos, fill=TRACO, width=largura, joint="curve")

    # Pillow nao tem ponta arredondada em line(): as duas pontas viram circulo.
    raio = largura / 2
    for x, y in (pontos[0], pontos[-1]):
        desenho.ellipse([x - raio, y - raio, x + raio, y + raio], fill=TRACO)

    return img.resize((lado, lado), Image.LANCZOS)


def main() -> None:
    PUBLIC.mkdir(exist_ok=True)

    # Apple exige PNG opaco. O fundo ja e opaco, entao serve como esta.
    apple = desenhar(180)
    apple.save(PUBLIC / "apple-touch-icon.png", "PNG", optimize=True)

    # .ico com varios tamanhos: o navegador escolhe o que precisa.
    desenhar(256).save(
        PUBLIC / "favicon.ico",
        "ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )

    for nome in ("apple-touch-icon.png", "favicon.ico"):
        caminho = PUBLIC / nome
        print(f"gerado: public/{nome} ({caminho.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
