# 스프라이트 PNG 용량 줄이기 (256색 팔레트 PNG). 휴대폰이 처음 받을 그림을 1/6 정도로 줄인다.
# 사용법: python tools/shrink_sprites.py            → public/assets/sprites/*.png 전부
#         python tools/shrink_sprites.py a.png b.png → 그 파일만
# 이미 줄인 그림(팔레트 PNG)은 건너뛰므로 여러 번 돌려도 된다. 경로·이름은 그대로라 manifest 는 안 바꿔도 된다.
# 줄였을 때 눈에 띄게 달라지는 그림은 원본 그대로 둔다.
import glob
import io
import os
import sys

from PIL import Image, ImageChops, ImageStat

MAX_CHANGED = 0.005  # 색이 16 넘게 달라진 점이 이 비율보다 많으면 줄이지 않음


def changed_share(a, b):
    bg = Image.new('RGBA', a.size, (128, 160, 200, 255))
    diff = ImageChops.difference(Image.alpha_composite(bg, a).convert('RGB'), Image.alpha_composite(bg, b).convert('RGB'))
    return ImageStat.Stat(diff.convert('L').point(lambda v: 255 if v > 16 else 0)).mean[0] / 255


def shrink(path):
    src = Image.open(path)
    if src.mode == 'P':
        return 'skip', 0, 0
    im = src.convert('RGBA')
    q = im.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    buf = io.BytesIO()
    q.save(buf, 'PNG', optimize=True)
    before, after = os.path.getsize(path), buf.tell()
    if after >= before:
        return 'bigger', before, before
    share = changed_share(im, q.convert('RGBA'))
    if share > MAX_CHANGED:
        return f'kept ({share * 100:.1f}% changed)', before, before
    with open(path, 'wb') as f:
        f.write(buf.getvalue())
    return 'ok', before, after


def main():
    sys.stdout.reconfigure(encoding='utf-8')  # 윈도우 콘솔에서 한글이 깨지지 않게
    files = sys.argv[1:] or sorted(glob.glob('public/assets/sprites/*.png'))
    total0 = total1 = 0
    for path in files:
        state, before, after = shrink(path)
        total0 += before
        total1 += after
        if state != 'skip':
            print(f'{os.path.basename(path):28s} {before // 1024:5d}KB -> {after // 1024:5d}KB  {state}')
    print(f'합계(새로 줄인 것): {total0 / 1e6:.1f}MB -> {total1 / 1e6:.1f}MB')


if __name__ == '__main__':
    main()
