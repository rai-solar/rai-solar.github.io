import numpy as np, random, math
from PIL import Image, ImageDraw, ImageFilter
W,H=1800,1100
rng=random.Random(7)
def hx(h): h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))
# (y_from, y_to, [colors with weights])
BANDS=[
 (0.00,0.10,[('#b06c5a',3),('#c4826c',3),('#9a6a6e',2),('#8e98ac',1),('#7b5146',1)]),
 (0.06,0.24,[('#cf8f74',4),('#dda083',3),('#93a1b8',2),('#7f8ca3',1),('#a8706a',2),('#8a5b47',1)]),
 (0.20,0.36,[('#d99a76',4),('#e3ab88',3),('#c97d60',2),('#9aa4b6',1),('#b9705a',1)]),
 (0.34,0.47,[('#e2a06f',3),('#d88b62',3),('#efb45c',2),('#c47152',2)]),
 (0.45,0.60,[('#f0c24a',5),('#e9b33f',4),('#f6d469',2),('#dba13b',2),('#e59e52',1)]),
 (0.58,0.68,[('#b9783f',3),('#8c5536',3),('#c98e45',2),('#6e4630',2)]),
 (0.66,0.82,[('#4f3e2f',4),('#5e4936',3),('#3e4733',2),('#46525c',1),('#6a5240',2)]),
 (0.80,1.00,[('#2f3a2e',4),('#3b3226',3),('#2c4637',2),('#4a4036',2),('#55606a',1)]),
]
base=Image.new('RGB',(W,H))
# underpainting: smooth vertical gradient from band centers
cols=[]
for i,(a,b,c) in enumerate(BANDS):
    cols.append(((a+b)/2, np.array(hx(c[0][0]),float)))
arr=np.zeros((H,W,3))
ys=np.linspace(0,1,H)
for j,y in enumerate(ys):
    for k in range(len(cols)-1):
        if cols[k][0]<=y<=cols[k+1][0] or (k==0 and y<cols[0][0]) or (k==len(cols)-2 and y>cols[-1][0]):
            t=(y-cols[k][0])/(cols[k+1][0]-cols[k][0]); t=min(1,max(0,t))
            arr[j,:,:]=cols[k][1]*(1-t)+cols[k+1][1]*t; break
base=Image.fromarray(arr.astype('uint8'))
layer=base.convert('RGBA')
cl=Image.new('RGBA',(W,H),(0,0,0,0)); dc=ImageDraw.Draw(cl)
for _ in range(60):
    y=rng.uniform(0.0,0.32)*H; x=rng.uniform(-100,W); w=rng.uniform(120,520); h=rng.uniform(14,46)
    col=hx(rng.choice(['#8e9bb3','#7d8aa3','#a2acc0','#9c7e86']))
    dc.ellipse([x,y,x+w,y+h], fill=col+(int(rng.uniform(0.35,0.7)*255),))
for _ in range(40):
    y=rng.uniform(0.0,0.4)*H; x=rng.uniform(-100,W); w=rng.uniform(150,600); h=rng.uniform(12,40)
    col=hx(rng.choice(['#7a4e3f','#8a5a48','#6f4a40']))
    dc.ellipse([x,y,x+w,y+h], fill=col+(int(rng.uniform(0.25,0.55)*255),))
layer=Image.alpha_composite(layer, cl.filter(ImageFilter.GaussianBlur(8)))
def stroke(d, x, y, L, th, ang, col, a):
    # a dry-brush pastel stroke: several thin offset lines with ragged ends
    n=max(1,int(th/7))
    for k in range(n):
        off=(k-n/2)*6
        x0=x+rng.uniform(0,L*0.12); x1=x+L-rng.uniform(0,L*0.15)
        y0=y+off+math.sin(ang)*0; 
        pts=[]
        segs=6
        for s in range(segs+1):
            xx=x0+(x1-x0)*s/segs
            yy=y0+math.tan(ang)*(xx-x)+rng.uniform(-0.9,0.9)
            pts.append((xx,yy))
        c=tuple(max(0,min(255,v+rng.randint(-10,10))) for v in col)+(int(a*rng.uniform(0.6,1)*255),)
        d.line(pts, fill=c, width=rng.randint(5,11))
for pass_ in range(3):
    over=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(over)
    for _ in range(2600):
        band=rng.choices(BANDS,weights=[1.2,1.6,1.4,1.1,1.4,0.9,1.1,1])[0]
        y=rng.uniform(band[0],band[1])*H
        col=hx(rng.choices([c for c,w in band[2]],weights=[w for c,w in band[2]])[0])
        L=rng.uniform(80,420); th=rng.uniform(8,28)
        x=rng.uniform(-L*0.5,W)
        ang=rng.uniform(-0.035,0.035)
        stroke(d,x,y,L,th,ang,col,rng.uniform(0.35,0.75))
    layer=Image.alpha_composite(layer, over.filter(ImageFilter.GaussianBlur(1.4)))
# a few yellow scribbles in the upper sky, like the painting
d=ImageDraw.Draw(layer)
for _ in range(1):
    x=rng.uniform(W*0.45,W*0.75); y=rng.uniform(H*0.04,H*0.14); pts=[]
    for s in range(14):
        x+=rng.uniform(18,40); y+=rng.uniform(-14,14); pts.append((x,y))
    d.line(pts, fill=(228,188,72,170), width=5, joint='curve')
img=layer.convert('RGB')
# paper grain
g=np.array(img).astype(float)
noise=np.random.default_rng(3).normal(0,7,(H,W,1))
g=np.clip(g+noise,0,255).astype('uint8')
img=Image.fromarray(g)
img.save('/home/claude/repo/sky.jpg', quality=80, optimize=True, progressive=True)
img.resize((600,367)).save('/home/claude/shots/sky_prev.png')
